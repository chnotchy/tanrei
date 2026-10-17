// Every element a module draws is defined by what that module imports. A product may import one component alone
// (`@tanrei/web/components/<name>`) instead of the package's entry, and then gets only that module's import graph: a
// `<tanrei-…>` its template writes whose definition the graph does not reach stays an unknown element — no shadow root,
// no `updateComplete`, nothing drawn — and code that waits for it throws. The package's entry defines everything, so
// a page that loads it never shows the gap.
//
// For each entry point a product can import — every `dist/components/<name>/<name>.js` (`./components/*`) and every
// other module the package's `exports` name — esbuild bundles it alone, as a product's bundler would (honouring the
// package's `sideEffects`), and its metafile gives the modules the bundle keeps. Each kept module's source is read
// with TypeScript's parser for the tags it writes: in a tagged template (`html\`<tanrei-button …>\``), by
// `createElement('tanrei-…')`, or as a static tag (`literal\`tanrei-…\``, `unsafeStatic('tanrei-…')`). Comments and
// plain strings are not markup and are not read. The manifest (custom-elements.json) says which module defines each
// tag; every tag written must be defined by a kept module. A gap is listed in ALLOWED with its reason; the list only
// shrinks. Run after the build (`dist/`), by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const relative = (file) => path.relative(root, file).split(path.sep).join('/');

// The package has no TypeScript with a compiler API of its own (its `typescript` is the native compiler); the
// manifest's analyzer, which `pnpm generate` runs, brings one, and this reads the sources with the same parser.
const ts = createRequire(createRequire(path.join(root, 'package.json')).resolve('@custom-elements-manifest/analyzer/package.json'))('typescript');

/** Tags written that the importing graph does not define, by `<entry>: <tag>`, with the reason. Only shrinks. */
export const ALLOWED = {};

const TAG = /<(tanrei-[a-z0-9]+(?:-[a-z0-9]+)*)/g;
const STATIC_TAG = /^tanrei-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The tags a source module writes, each with the line it is written on. */
function written(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = [];
  const lineOf = (position) => source.getLineAndCharacterOfPosition(position).line + 1;
  const at = (node, tag, line = lineOf(node.getStart(source))) => found.push({ tag, line });
  // Each literal piece of a template with its text: the head and the text after each substitution.
  const pieces = (template) => (ts.isNoSubstitutionTemplateLiteral(template) ? [template] : [template.head, ...template.templateSpans.map((span) => span.literal)]);
  const visit = (node) => {
    if (ts.isTaggedTemplateExpression(node)) {
      const parts = pieces(node.template);
      for (const piece of parts) {
        for (const match of piece.text.matchAll(TAG)) at(node, match[1], lineOf(piece.getStart(source)) + (piece.text.slice(0, match.index).match(/\n/g)?.length ?? 0));
      }
      const name = ts.isIdentifier(node.tag) ? node.tag.text : '';
      if (name === 'literal' && parts.length === 1 && STATIC_TAG.test(parts[0].text.trim())) at(node, parts[0].text.trim());
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : ts.isIdentifier(node.expression) ? node.expression.text : '';
      if ((callee === 'createElement' || callee === 'unsafeStatic') && STATIC_TAG.test(node.arguments[0].text)) at(node, node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'custom-elements.json'), 'utf8'));
/**
 * Each tag with the modules that define it, by the manifest: `src/…/<module>.ts`. A module may define, guarded by
 * `customElements.get`, a tag whose class it imports from another (navigation-drawer.ts defines `tanrei-badge`).
 */
const definitions = manifest.modules.flatMap((module) => (module.exports ?? []).filter((each) => each.kind === 'custom-element-definition').map((each) => ({ tag: each.name, module: module.path })));
const definedIn = new Map();
for (const { tag, module } of definitions) definedIn.set(tag, [...(definedIn.get(tag) ?? []), module]);

/** The modules a product can import: `./components/*` and every other JavaScript module the exports name. */
function entries() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const targets = Object.entries(pkg.exports).flatMap(([key, value]) => {
    if (key.includes('*')) return [];
    const target = typeof value === 'string' ? value : value.default;
    return typeof target === 'string' && target.endsWith('.js') ? [path.join(root, target)] : [];
  });
  const components = fs
    .readdirSync(path.join(root, 'dist/components'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, 'dist/components', entry.name, `${entry.name}.js`))
    .filter((file) => fs.existsSync(file));
  return [...targets, ...components].sort();
}

const source = (built) => path.join(root, 'src', path.relative(path.join(root, 'dist'), built).replace(/\.js$/, '.ts'));

test('the manifest names a defining module for every `customElements.define` in the sources', () => {
  // The check below reads the definitions from the manifest; this keeps it honest about the sources.
  const count = new Map();
  for (const { module } of definitions) count.set(module, (count.get(module) ?? 0) + 1);
  const sources = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) return sources(file);
      return /\.ts$/.test(entry.name) && !/\.(?:test|d)\.ts$/.test(entry.name) ? [file] : [];
    });
  const disagree = sources(path.join(root, 'src'))
    .map((file) => ({ file: relative(file), calls: fs.readFileSync(file, 'utf8').match(/customElements\.define\(/g)?.length ?? 0 }))
    .filter(({ file, calls }) => calls !== (count.get(file) ?? 0))
    .map(({ file, calls }) => `${file}: ${calls} define calls, ${count.get(file) ?? 0} in the manifest`);
  assert.deepEqual(disagree, [], 'regenerate the manifest (pnpm generate)');
});

test('every tag a module writes is defined by the import graph of each entry point that keeps it', async () => {
  const points = entries();
  assert.ok(points.length > 80, `found ${points.length} entry points`);
  const missing = points.filter((file) => !fs.existsSync(file));
  assert.deepEqual(missing.map(relative), [], 'build the package first (pnpm --filter @tanrei/web build)');

  const result = await build({
    absWorkingDir: root,
    entryPoints: points.map((file, index) => ({ in: file, out: `entry-${index}` })),
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'browser',
    outdir: path.join(root, 'own-imports-out'),
    external: ['lit', 'lit/*', '@lit/*'],
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'silent',
  });

  const writes = new Map();
  const writesOf = (file) => {
    if (!writes.has(file)) writes.set(file, fs.existsSync(file) ? written(file) : []);
    return writes.get(file);
  };
  const gaps = [];
  let seen = 0;
  for (const output of Object.values(result.metafile.outputs)) {
    if (!output.entryPoint) continue;
    const entry = relative(path.resolve(root, output.entryPoint));
    const kept = Object.entries(output.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      .map(([file]) => path.resolve(root, file))
      .filter((file) => file.startsWith(path.join(root, 'dist', path.sep)))
      .map((file) => relative(source(file)));
    const defined = new Set(definitions.filter(({ module }) => kept.includes(module)).map(({ tag }) => tag));
    for (const module of kept) {
      for (const { tag, line } of writesOf(path.join(root, module))) {
        seen++;
        if (!definedIn.has(tag)) gaps.push(`${entry}: ${tag} (written at ${module}:${line}, and no module defines it)`);
        else if (!defined.has(tag)) gaps.push(`${entry}: ${tag} (written at ${module}:${line}; defined only in ${definedIn.get(tag).join(', ')}, outside the modules ${entry} imports)`);
      }
    }
  }
  // A floor, not a count: the scan reads templates at all.
  assert.ok(seen > 100, `read ${seen} written tags`);
  assert.ok(writesOf(path.join(root, 'src/components/text-input/text-input.ts')).some(({ tag }) => tag === 'tanrei-button'), 'the scan sees the picker button the text input writes');

  const found = [...new Set(gaps)].sort();
  const key = (gap) => gap.slice(0, gap.indexOf(' ('));
  const unexpected = found.filter((gap) => !(key(gap) in ALLOWED));
  assert.deepEqual(unexpected, [], 'import the module that defines the tag from the module that writes it (`import \'../<name>/<name>.js\';`)');
  const stale = Object.keys(ALLOWED).filter((allowed) => !found.some((gap) => key(gap) === allowed));
  assert.deepEqual(stale, [], 'the gap is gone: take it out of ALLOWED');
});
