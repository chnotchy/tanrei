#!/usr/bin/env node
// Translation coverage and freshness of the docs (i18n/README.md).
//
// English is the source: every page under `src/content/docs/` outside a language's folder. A translation is the page
// at the same path under `src/content/docs/<dir>/`, and its frontmatter records what it translates:
//
//   translationOf: foundations/color.mdx                    the English page, as a path under src/content/docs/
//   sourceHash: 3b18e512dba79e4c8300dd08aeb37f8e728b8dad    that page's git blob id when the translation was made
//
// The id is the one git gives the file (`git hash-object`), computed here from the bytes on disk, so it needs no git
// and no commit — and once the English page is committed, `git diff <sourceHash> <today's id>` shows a translator
// exactly what changed since.
//
//   node scripts/i18n-check.mjs                    report; exit 1 if a required page is missing or a page is misplaced
//   node scripts/i18n-check.mjs --stamp <glob…>    write today's id into the translations that match (paths under
//                                                  src/content/docs/, e.g. `ja/foundations/**`): say "this translation
//                                                  is of the English page as it is now". Only after it really is.
//   node scripts/i18n-check.mjs --json             the report as JSON on stdout
//
// The rule: a MISSING translation of a page a language requires (i18n/locales.mjs) fails; so
// does a translation with no English page, or one whose `translationOf` names another path. A STALE translation (the
// English page changed since) and an UNVERIFIED one (no `sourceHash`: nobody recorded what it was made from) are
// reported and written to `i18n/status.generated.md`, and do not fail — a change to an English page must not wait for
// three translations, but nobody may lose sight of it either.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations } from '../i18n/locales.mjs';

const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const docs = path.join(app, 'src/content/docs');
const reportFile = path.join(app, 'i18n/status.generated.md');
const dirs = new Set(translations.map((t) => t.dir));

/** The id git gives a file with these bytes. */
export const blobId = (bytes) => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

const walk = (dir, base = dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full, base);
        return /\.mdx?$/.test(entry.name) ? [path.relative(base, full).split(path.sep).join('/')] : [];
      })
    : [];

/** `**` any depth, `*` within one segment; matched against a path without its extension. */
const globToRegExp = (glob) => new RegExp(`^${glob.split('**').map((part) => part.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*')}$`);
const matches = (globs, file) => globs.some((glob) => globToRegExp(glob).test(file) || globToRegExp(glob).test(file.replace(/\.mdx?$/, '')));

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const field = (text, name) => text.match(FRONTMATTER)?.[1].match(new RegExp(`^${name}:\\s*['"]?([^'"\\n]+?)['"]?\\s*$`, 'm'))?.[1];

/** Sets `translationOf` and `sourceHash` in a page's frontmatter, after `description` (or `title`), replacing old ones. */
function stamp(file, sourcePath, id) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(FRONTMATTER);
  if (!match) throw new Error(`${file}: no frontmatter`);
  const lines = match[1].split(/\r?\n/).filter((line) => !/^(translationOf|sourceHash):/.test(line));
  // After the last top-level scalar of the title block, so that the two lines sit together near the top.
  let at = lines.findIndex((line) => /^description:/.test(line));
  if (at < 0) at = lines.findIndex((line) => /^title:/.test(line));
  // A folded or multi-line value continues on indented lines.
  while (at + 1 < lines.length && /^\s+\S/.test(lines[at + 1])) at += 1;
  lines.splice(at + 1, 0, `translationOf: ${sourcePath}`, `sourceHash: ${id}`);
  fs.writeFileSync(file, text.replace(FRONTMATTER, `---\n${lines.join('\n')}\n---`));
}

export function survey() {
  const all = walk(docs);
  const sources = all.filter((file) => !dirs.has(file.split('/')[0]));
  const ids = Object.fromEntries(sources.map((file) => [file, blobId(fs.readFileSync(path.join(docs, file)))]));
  const locales = translations.map(({ dir, lang, label, required }) => {
    const pages = sources.map((file) => {
      const translated = path.join(docs, dir, file);
      if (!fs.existsSync(translated)) return { file, state: matches(required, file) ? 'missing' : 'fallback' };
      const text = fs.readFileSync(translated, 'utf8');
      const of = field(text, 'translationOf');
      const hash = field(text, 'sourceHash');
      if (of && of !== file) return { file, state: 'misplaced', detail: `translationOf names ${of}` };
      if (!hash) return { file, state: 'unverified' };
      return hash === ids[file] ? { file, state: 'fresh' } : { file, state: 'stale', from: hash, to: ids[file] };
    });
    const orphans = all.filter((file) => file.startsWith(`${dir}/`) && !sources.includes(file.slice(dir.length + 1))).map((file) => ({ file: file.slice(dir.length + 1), state: 'orphan' }));
    return { dir, lang, label, pages: [...pages, ...orphans] };
  });
  return { sources, ids, locales };
}

const STATES = ['fresh', 'stale', 'unverified', 'fallback', 'missing', 'misplaced', 'orphan'];
const MEANING = {
  fresh: 'translated from the English page as it is today',
  stale: 'the English page changed since the translation was made',
  unverified: 'translated, but no `sourceHash` records from what',
  fallback: 'not translated and not required: the English page is shown with a notice',
  missing: 'not translated although the language requires it',
  misplaced: '`translationOf` names another page than the one at this path',
  orphan: 'no English page at this path',
};
const FAILING = ['missing', 'misplaced', 'orphan'];
const count = (pages, state) => pages.filter((page) => page.state === state).length;

function markdown({ sources, locales }) {
  const lines = [
    '<!-- GENERATED by apps/docs/scripts/i18n-check.mjs — do not edit, do not commit (it changes with every English page). -->',
    '# Translation status',
    '',
    `${sources.length} English pages. ${STATES.map((state) => `**${state}**: ${MEANING[state]}`).join('; ')}.`,
    '',
    `| Language | ${STATES.join(' | ')} |`,
    `| --- | ${STATES.map(() => '---:').join(' | ')} |`,
    ...locales.map(({ label, lang, pages }) => `| ${label} (\`${lang}\`) | ${STATES.map((state) => count(pages, state)).join(' | ')} |`),
    '',
  ];
  for (const { dir, label, pages } of locales) {
    const open = pages.filter((page) => page.state !== 'fresh');
    if (!open.length) continue;
    lines.push(`## ${label}`, '');
    for (const state of STATES.filter((s) => s !== 'fresh')) {
      const of = open.filter((page) => page.state === state);
      if (!of.length) continue;
      lines.push(`### ${state} (${of.length})`, '');
      for (const page of of) lines.push(`- \`${dir}/${page.file}\`${page.from ? ` — \`git diff ${page.from.slice(0, 12)} ${page.to.slice(0, 12)}\`` : ''}${page.detail ? ` — ${page.detail}` : ''}`);
      lines.push('');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--stamp') {
    const globs = args.slice(1);
    if (!globs.length) {
      console.error('✖ --stamp needs the translated pages to stamp, e.g. `--stamp "ja/foundations/**"` (under src/content/docs/)');
      process.exit(2);
    }
    const { sources, ids } = survey();
    let stamped = 0;
    for (const { dir } of translations) {
      for (const file of sources) {
        const translated = `${dir}/${file}`;
        if (!matches(globs, translated) || !fs.existsSync(path.join(docs, translated))) continue;
        stamp(path.join(docs, translated), file, ids[file]);
        stamped += 1;
      }
    }
    console.log(`stamped ${stamped} translation${stamped === 1 ? '' : 's'} with the id of today's English page`);
    process.exit(stamped ? 0 : 1);
  }

  const result = survey();
  if (args.includes('--json')) {
    console.log(JSON.stringify({ sources: result.sources.length, locales: result.locales }, null, 2));
  } else {
    fs.writeFileSync(reportFile, markdown(result));
    console.log(`Translations of ${result.sources.length} English pages (${path.relative(process.cwd(), reportFile)})\n`);
    const width = Math.max(...result.locales.map((l) => l.lang.length));
    for (const { lang, pages } of result.locales) console.log(`  ${lang.padEnd(width)}  ${STATES.map((state) => `${state} ${String(count(pages, state)).padStart(2)}`).join('   ')}`);
    console.log('');
    for (const { dir, pages } of result.locales) {
      for (const page of pages.filter((p) => p.state === 'stale')) console.log(`  stale       ${dir}/${page.file}   git diff ${page.from.slice(0, 12)} ${page.to.slice(0, 12)}`);
      for (const page of pages.filter((p) => FAILING.includes(p.state))) console.error(`✖ ${page.state.padEnd(10)}${dir}/${page.file}${page.detail ? ` — ${page.detail}` : ''}`);
    }
  }
  const failed = result.locales.some(({ pages }) => pages.some((page) => FAILING.includes(page.state)));
  if (failed) console.error('\n✖ a required translation is missing, or a translated page has no English page at its path (apps/docs/i18n/README.md)');
  process.exit(failed ? 1 : 0);
}
