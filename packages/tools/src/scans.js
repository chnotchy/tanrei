// Scans of the hand-written sources: names the project retired (docs/governance/retired-terms.json), and work markers
// that point somewhere instead of saying what is missing.
//
// A scan reads what the repository publishes: the files git lists — tracked, or untracked and not ignored — less those
// marked `export-ignore` (in .gitattributes or a checkout's own .git/info/attributes), which `git archive` leaves out
// too. A path the repository ignores (a nested checkout, an agent's worktree, local notes) is never read.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, STAGED, read as readSource, stagedFiles } from './conventions.js';

const RETIRED = 'docs/governance/retired-terms.json';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-app', 'build', '.build', '.turbo', '.swiftpm', '.gradle', '.dart_tool', '.astro', '.idea', 'Pods', 'DerivedData', 'coverage', 'test-results', 'playwright-report']);
const BINARY = /\.(png|jpe?g|gif|webp|ico|icns|woff2?|ttf|otf|jar|zip|gz|pdf|keystore|lock)$/i;
const CODE = /\.(m?js|cjs|tsx?|swift|kts?|dart|css|astro|sh|py|rb|gradle)$/;

const git = (args) => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
const lines0 = (text) => text.split('\0').filter(Boolean);
const readable = (rel) => !rel.split('/').some((part) => SKIP_DIRS.has(part)) && !BINARY.test(rel) && !rel.endsWith('pnpm-lock.yaml');

/** The files among `files` whose `export-ignore` attribute is set: not part of what the repository publishes. */
function exportIgnored(files) {
  if (!files.length) return new Set();
  const out = execFileSync('git', ['check-attr', '--stdin', '-z', 'export-ignore'], { cwd: REPO_ROOT, input: files.join('\0'), encoding: 'utf8', maxBuffer: 1 << 28 });
  const parts = lines0(out);
  const set = new Set();
  for (let i = 0; i + 2 < parts.length + 1; i += 3) if (parts[i + 2] === 'set') set.add(parts[i]);
  return set;
}

/** The files of the repository's working tree, from git; null when this is not a git checkout. */
function repositoryFiles() {
  try {
    const listed = lines0(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])).filter(readable);
    const skip = exportIgnored(listed);
    return listed
      .filter((rel) => !skip.has(rel))
      .filter((rel) => {
        try {
          return fs.statSync(path.join(REPO_ROOT, rel)).isFile();
        } catch {
          return false; // deleted in the working tree, not yet in the index
        }
      });
  } catch {
    return null;
  }
}

function* walk(root, rel = '') {
  for (const item of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const next = rel ? `${rel}/${item.name}` : item.name;
    if (item.isDirectory()) {
      if (!SKIP_DIRS.has(item.name)) yield* walk(root, next);
    } else if (item.isFile() && readable(next)) yield next;
  }
}

/**
 * The files a source scan reads, and how. In the working tree by default; with TANREI_CHECK_STAGED=1 (the pre-commit
 * hook) the files in the git index, read from the index, so another agent's unstaged work neither blocks nor passes
 * a commit it is not part of. A root other than this repository's (a test's sandbox) is walked as it is.
 */
function sources(root, needles) {
  if (root !== REPO_ROOT) return { files: [...walk(root)], text: (rel) => fs.readFileSync(path.join(root, rel), 'utf8') };
  if (STAGED) {
    // Only files that contain one of the needles (case-insensitive, a superset of the real matches) are read.
    let hits;
    try {
      hits = new Set(lines0(git(['grep', '--cached', '-l', '-I', '-i', '-F', '-z', ...needles.flatMap((n) => ['-e', n])])));
    } catch (e) {
      if (e.status === 1) hits = new Set(); // git grep: no match
      else throw e;
    }
    const candidates = [...stagedFiles()].filter((rel) => hits.has(rel) && readable(rel));
    const skip = exportIgnored(candidates);
    const files = candidates.filter((rel) => !skip.has(rel));
    return { files, text: (rel) => readSource(rel) };
  }
  return { files: repositoryFiles() ?? [...walk(root)], text: (rel) => fs.readFileSync(path.join(root, rel), 'utf8') };
}

const MARKER = /\b(TODO|FIXME|HACK)\(([a-z0-9][a-z0-9-]*)\)/g;
/** The files that implement and test this very rule. */
const MARKER_EXEMPT = new Set(['packages/tools/src/scans.js', 'packages/tools/test/scans.test.js']);

/**
 * A work marker in source says in words what is missing: `TODO: …`. A tag in its place (`TODO(<tag>)`) points a reader
 * at something they may not be able to open, and says nothing on its own, so it is refused.
 */
export function checkWorkMarkers(root = REPO_ROOT) {
  const problems = [];
  const src = sources(root, ['TODO(', 'FIXME(', 'HACK(']);
  for (const rel of src.files) {
    if (!CODE.test(rel) || MARKER_EXEMPT.has(rel)) continue;
    src.text(rel).split('\n').forEach((line, i) => {
      for (const [, word, tag] of line.matchAll(MARKER)) problems.push(`${rel}:${i + 1}: ${word}(${tag}) — write what is missing instead of a tag`);
    });
  }
  return problems;
}

/** A name the project stopped using must not survive in hand-written files (a NOTICE, a README, a comment). */
export function checkRetiredTerms(root = REPO_ROOT) {
  if (!fs.existsSync(path.join(root, RETIRED))) return [];
  const { terms } = JSON.parse(fs.readFileSync(path.join(root, RETIRED), 'utf8'));
  const problems = [];
  // `notFollowedBy` (a regular expression) spares a longer name that a retired one is a prefix of: `-` is a word break,
  // so retiring `tanrei-fab` would otherwise also flag `tanrei-fab-menu`. `notPrecededBy` does the same for a name that
  // ends with the retired one (such as `list-absorbs-icon-button`).
  const compiled = terms.map((t) => ({ ...t, pattern: new RegExp(`${t.notPrecededBy ? `(?<!${t.notPrecededBy})` : ''}\\b${t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b${t.notFollowedBy ? `(?!${t.notFollowedBy})` : ''}`, t.caseSensitive === false ? 'i' : '') }));
  const src = sources(root, terms.map((t) => t.term));
  for (const rel of src.files) {
    if (rel === RETIRED) continue;
    const active = compiled.filter((t) => !(t.allow ?? []).some((a) => rel === a || rel.startsWith(a) || rel.endsWith(`/${a}`)));
    if (!active.length) continue;
    const text = src.text(rel);
    for (const t of active) {
      if (!t.pattern.test(text)) continue;
      const line = text.split('\n').findIndex((l) => t.pattern.test(l)) + 1;
      problems.push(`${rel}:${line}: "${t.term}" was retired on ${t.since} (${t.reason}) — now: ${t.replacedBy}`);
    }
  }
  return problems;
}
