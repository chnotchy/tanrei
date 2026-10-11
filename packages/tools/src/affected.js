// Which web tests a change can affect — what CI's changes job runs on a pull request and on a push to main
// (CONTRIBUTING.md#what-runs-when). A dispatched run and a release run every test; this only narrows the
// others.
//
// A change is traced to **units**: a component (its directory under packages/web/src/components/, its spec, its comp
// tokens, its baselines) or a component drawn by a stylesheet (src/styles/<name>.css and its tests). From there it
// widens to what depends on it — the specs that are built from it or use it (`builtFrom`, `uses`), and every module
// of packages/web/src and packages/web/test that imports it, however indirectly. A test file reached that way runs in
// full. A change whose reach cannot be traced (the Playwright config, a generator, a sys token) selects everything.
//
// Node built-ins only: the changes job runs this before anything is installed.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const WEB = 'packages/web';
const SRC = `${WEB}/src`;

/** What a change to CI's own workflow runs: enough to show the jobs still start, build and report. */
export const CANARY = ['button'];

/**
 * Paths a change to which affects no web test: written by `pnpm generate` from a source that is traced on its own
 * (drift holds the two together), or read by nothing the web tests run.
 */
const NO_WEB_EFFECT = [
  /\/generated\//,
  /(^|\/)custom-elements\.json$/,
  /^docs\//,
  /\.md$/,
];

const posix = (p) => p.split(path.sep).join('/');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|js|mjs|css)$/.test(entry.name)) out.push(p);
  }
  return out;
}

/** Relative specifiers a module imports, re-exports or loads: `from '…'`, `import '…'`, `import('…')`, `new URL('…', import.meta.url)`. */
export function importsOf(text) {
  const out = new Set();
  const patterns = [
    /\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g,
    /\bimport\s*['"](\.{1,2}\/[^'"]+)['"]/g,
    /\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g,
    /new URL\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*,\s*import\.meta\.url/g,
  ];
  for (const re of patterns) for (const m of text.matchAll(re)) out.add(m[1].replace(/\?.*$/, ''));
  return [...out];
}

function resolve(fromFile, spec, root) {
  const base = path.resolve(path.dirname(path.join(root, fromFile)), spec);
  for (const c of [base, `${base}.ts`, `${base}.js`, path.join(base, 'index.ts'), path.join(base, 'index.js')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return posix(path.relative(root, c));
  }
  // A `.js` specifier written for a `.ts` source.
  if (/\.js$/.test(base) && fs.existsSync(base.replace(/\.js$/, '.ts'))) return posix(path.relative(root, base.replace(/\.js$/, '.ts')));
  return undefined;
}

/**
 * Who imports whom, over packages/web/src and packages/web/test and the modules outside them that they import
 * (packages/tools/src, for one): a map from a file to the files that import it.
 */
export function importers(root = REPO) {
  const queue = [...walk(path.join(root, SRC)), ...walk(path.join(root, WEB, 'test'))].map((f) => posix(path.relative(root, f)));
  const seen = new Set(queue);
  const by = new Map();
  while (queue.length) {
    const file = queue.shift();
    if (/\.css$/.test(file)) continue;
    for (const spec of importsOf(fs.readFileSync(path.join(root, file), 'utf8'))) {
      const target = resolve(file, spec, root);
      if (!target) continue;
      if (!by.has(target)) by.set(target, new Set());
      by.get(target).add(file);
      if (!seen.has(target) && !target.includes('node_modules')) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return { by, modules: seen };
}

/** Every spec's name, and the specs built from or using each one. */
function specGraph(root) {
  const names = new Set();
  const dependents = new Map();
  for (const f of fs.readdirSync(path.join(root, 'specs'))) {
    if (!f.endsWith('.spec.json')) continue;
    const spec = JSON.parse(fs.readFileSync(path.join(root, 'specs', f), 'utf8'));
    names.add(spec.name);
    for (const member of [...(spec.builtFrom ?? []), ...(spec.uses ?? [])]) {
      if (!dependents.has(member)) dependents.set(member, new Set());
      dependents.get(member).add(spec.name);
    }
  }
  return { names, dependents };
}

/** The unit a file of packages/web belongs to, if it belongs to one. */
function unitOfWebFile(file, units) {
  let m = file.match(/^packages\/web\/src\/components\/([^/]+)\//);
  if (m) return m[1];
  m = file.match(/^packages\/web\/src\/styles\/([a-z0-9-]+)(?:\.test)?\.(?:css|ts)$/);
  if (m && units.has(m[1])) return m[1];
  m = file.match(/^packages\/web\/src\/([a-z0-9-]+)\.ts$/);
  if (m && units.has(m[1])) return m[1];
  m = file.match(/^packages\/web\/snapshots\/([^/]+)\//);
  if (m) return m[1];
  return undefined;
}

/**
 * What a list of changed paths selects. `all` is true when every test must run; otherwise `units` are the components
 * whose tests run and `files` the other test files that run in full.
 */
export function affected(changed, root = REPO) {
  const componentDirs = new Set(fs.existsSync(path.join(root, SRC, 'components')) ? fs.readdirSync(path.join(root, SRC, 'components')) : []);
  const specs = specGraph(root);
  const units = new Set([...componentDirs, ...specs.names]);
  const graph = importers(root);

  const reasons = [];
  const startUnits = new Set();
  /** Components only whose own tests or baselines changed: nothing imports a test, so nothing beyond them is reached. */
  const ownTestsOnly = new Set();
  const startFiles = new Set();
  let all = false;
  let canary = false;
  const everything = (file, why) => {
    all = true;
    reasons.push(`${file}: ${why}`);
  };

  for (const file of changed) {
    if (NO_WEB_EFFECT.some((re) => re.test(file))) continue;
    if (file === '.github/workflows/ci.yml') {
      canary = true;
      continue;
    }
    if (file.startsWith('packages/react/')) {
      canary = true; // the React bindings' tests run on the first chromium shard, whatever it selects
      continue;
    }
    let m = file.match(/^specs\/([a-z0-9-]+)\.spec\.json$/);
    if (m && units.has(m[1])) {
      startUnits.add(m[1]);
      continue;
    }
    m = file.match(/^tokens\/comp\/([a-z0-9-]+)\.tokens\.json$/);
    if (m && units.has(m[1])) {
      startUnits.add(m[1]);
      continue;
    }
    if (file.startsWith(`${WEB}/`)) {
      const unit = unitOfWebFile(file, units);
      if (unit && /(\.test\.ts|\.png)$/.test(file)) {
        ownTestsOnly.add(unit);
        continue;
      }
      if (unit) startUnits.add(unit);
      if (graph.modules.has(file)) startFiles.add(file);
      else if (!unit) everything(file, 'a file of the web package that no module imports');
      continue;
    }
    if (graph.modules.has(file)) {
      startFiles.add(file); // a module outside the package that the web's code or tests import (packages/tools/src/from.js)
      continue;
    }
    // Inputs of the web whose reach is not traced: tokens below comp, the generators, the schema, the workspace.
    // packages/tools/ beyond what the web imports is the repo tools' own: their suite runs it, the web's does not.
    if (/^(tokens|specs|packages\/(token-engine|tokens-build))\//.test(file) || /^(tanrei\.config\.json|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|turbo\.json|scripts\/|patches\/)/.test(file)) {
      everything(file, 'its reach into the web is not traced');
    }
  }
  if (all) return { all, units: [], files: [], reasons };

  // Widen through imports: every module that imports a changed one, however indirectly.
  const reached = new Set(startFiles);
  for (const unit of startUnits) {
    for (const f of graph.modules) if (unitOfWebFile(f, units) === unit) reached.add(f);
  }
  const queue = [...reached];
  while (queue.length) {
    const f = queue.shift();
    for (const importer of graph.by.get(f) ?? []) {
      if (reached.has(importer)) continue;
      // The package's entry and registry import every element; what imports them is the build, not a test.
      reached.add(importer);
      if (/^packages\/web\/src\/(index|registry)\.ts$/.test(importer)) continue;
      queue.push(importer);
    }
  }
  const selected = new Set(startUnits);
  const files = new Set();
  for (const f of reached) {
    const unit = unitOfWebFile(f, units);
    if (unit) selected.add(unit);
    else if (/\.test\.ts$/.test(f) && f.startsWith(`${SRC}/`)) files.add(f);
  }
  // Widen through the specs: a component built from or using a selected one.
  const specQueue = [...selected];
  while (specQueue.length) {
    for (const d of specs.dependents.get(specQueue.shift()) ?? []) {
      if (!selected.has(d)) {
        selected.add(d);
        specQueue.push(d);
      }
    }
  }
  for (const u of ownTestsOnly) selected.add(u);
  if (canary && !selected.size && !files.size) for (const u of CANARY) selected.add(u);
  return { all: false, units: [...selected].sort(), files: [...files].sort(), reasons };
}

/**
 * The `--grep` that runs a selection: a test whose file is a selected component's, a selected stylesheet's or one of
 * the files, or whose title names a selected component (`<name>: …`, the form the suites that run over every
 * component use). Playwright matches it against the file path and the titles together.
 */
export function grepFor({ units, files }) {
  const parts = [];
  if (units.length) {
    const names = units.join('|');
    parts.push(`components/(${names})/`, `styles/(${names})[.-]`, `(^| )(${names}): `);
  }
  for (const f of files) parts.push(f.replace(/^packages\/web\/src\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return parts.join('|');
}

/** The paths changed between `base` and HEAD. */
export function changedSince(base, root = REPO) {
  return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\n')
    .filter(Boolean);
}

// `node packages/tools/src/affected.js <base>`: prints the selection as JSON (all, units, files, grep, reasons).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const base = process.argv[2];
  if (!base) {
    console.error('usage: node packages/tools/src/affected.js <base ref or sha>');
    process.exit(2);
  }
  const result = affected(changedSince(base));
  console.log(JSON.stringify({ ...result, grep: result.all ? '' : grepFor(result) }));
}
