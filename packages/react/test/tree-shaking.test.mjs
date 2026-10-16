// A product that imports one wrapper bundles that wrapper and its element, not the whole of @tanrei/web
// (scripts/generate.js: one module per wrapper, package.json `sideEffects: false`, every call at load marked pure).
//
// esbuild is the bundler here, as a product would use it: each entry imports from the package by its name, minified
// for the browser. Every wrapper is held to the element's own module bundled alone (`import '@tanrei/web/components/…'`):
// the same definitions, and no more bytes than React and `@lit/react` add. Then a few bundles are run, under Node with
// Lit's DOM shim, to see which elements they define. Reads both packages' builds (`pnpm --filter @tanrei/web build`,
// then this package's).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const DEFINE = /customElements\.define\(/g;
const bytes = (text) => Buffer.byteLength(text);
const definitions = (text) => (text.match(DEFINE) ?? []).length;
// What a wrapper may add to its element's bundle: React, `@lit/react`, the wrapper and its marks — about 11 kB minified
// today, against about 2.4 MB for the whole package. Another element kept with it would change the count of
// definitions; the bound catches anything else its module drew in.
const OVERHEAD = 16 * 1024;

// The wrappers, read from what the generator reads: each element of the manifest is exported as its tag without the
// prefix (`tanrei-list-item` → `ListItem`), and imports the module its element is declared in.
const { web } = JSON.parse(fs.readFileSync(new URL('../../../tanrei.config.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(new URL(import.meta.resolve('@tanrei/web/custom-elements.json')), 'utf8'));
const pascal = (text) => text.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('');
const wrappers = manifest.modules
  .flatMap((module) => (module.declarations ?? []).filter((declaration) => declaration.customElement && declaration.tagName).map(({ tagName }) => ({ tagName, path: module.path })))
  .map(({ tagName, path }) => ({
    name: pascal(tagName.slice(`${web.tagPrefix}-`.length)),
    element: `@tanrei/web/components/${path.replace(/^src\/components\//, '').replace(/\/[^/]+\.ts$/, '')}`,
  }));
const tags = manifest.modules
  .flatMap((module) => module.declarations ?? [])
  .map((declaration) => declaration.tagName)
  .filter(Boolean)
  .sort();

/** Bundles each entry's source (resolved from this package, so `@tanrei/react` is the package itself); the texts, in order. */
async function bundle(sources, options) {
  const result = await build({
    entryPoints: sources.map((_, index) => ({ in: `entry:${index}`, out: `entry-${index}` })),
    bundle: true,
    write: false,
    format: 'esm',
    outdir: '/tree-shaking-out',
    logLevel: 'silent',
    ...options,
    plugins: [
      {
        name: 'entries',
        setup(bundler) {
          bundler.onResolve({ filter: /^entry:/ }, (args) => ({ path: args.path, namespace: 'entries' }));
          bundler.onLoad({ filter: /.*/, namespace: 'entries' }, (args) => ({ contents: sources[Number(args.path.slice('entry:'.length))], resolveDir: root, loader: 'js' }));
        },
      },
    ],
  });
  const output = new Map(result.outputFiles.map((file) => [file.path.replace(/^.*\/entry-(\d+)\.js$/, '$1'), file.text]));
  return sources.map((_, index) => output.get(String(index)));
}

/** The tags defined once `source` has run: bundled for Node, where Lit brings its own `customElements` (none without Lit). */
async function definedBy(source) {
  const [text] = await bundle([`${source}\nconsole.log(JSON.stringify(${JSON.stringify(tags)}.filter((tag) => globalThis.customElements?.get(tag))));`], { platform: 'node' });
  const run = spawnSync(process.execPath, ['--input-type=module'], { input: text, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout.trim().split('\n').at(-1));
}

test('the wrappers are found, each with a built element module', () => {
  // A floor, not a count.
  assert.ok(wrappers.length > 100, `found ${wrappers.length}`);
  assert.ok(wrappers.some(({ name }) => name === 'Calendar'));
  const missing = wrappers.filter(({ element }) => !fs.existsSync(fileURLToPath(import.meta.resolve(element))));
  assert.deepEqual(missing, [], 'build the web package first (pnpm --filter @tanrei/web build)');
});

test('each wrapper bundles as its element does alone: the same definitions, and only React and @lit/react besides', async () => {
  const modules = [...new Set(wrappers.map((wrapper) => wrapper.element))];
  const texts = await bundle(
    [
      ...wrappers.map(({ name }) => `import { ${name} } from '@tanrei/react';\nglobalThis.used = ${name};`),
      ...modules.map((module) => `import '${module}';`),
      "import * as all from '@tanrei/react';\nglobalThis.used = all;",
    ],
    { platform: 'browser', minify: true },
  );
  const alone = new Map(modules.map((module, index) => [module, texts[wrappers.length + index]]));
  const whole = texts.at(-1);
  // The control: the whole package keeps every definition, so a count of them can tell a wrapper's bundle from it.
  assert.ok(definitions(whole) >= tags.length, 'the whole package defines every element');
  const kept = wrappers
    .map(({ name, element }, index) => ({ name, element, text: texts[index], own: alone.get(element) }))
    .filter(({ text, own }) => definitions(text) !== definitions(own) || bytes(text) > bytes(own) + OVERHEAD)
    .map(({ name, element, text, own }) => `${name}: ${bytes(text)} B and ${definitions(text)} definitions; ${element} alone: ${bytes(own)} B and ${definitions(own)}`);
  assert.deepEqual(kept, [], `the whole package is ${bytes(whole)} B`);
  const calendar = texts[wrappers.findIndex(({ name }) => name === 'Calendar')];
  assert.ok(bytes(calendar) * 10 < bytes(whole), `Calendar: ${bytes(calendar)} B of ${bytes(whole)} B`);
});

test('importing Calendar defines the calendar and the buttons it draws, and no other element', async () => {
  assert.deepEqual(await definedBy("import { Calendar } from '@tanrei/react';\nglobalThis.used = Calendar;"), ['tanrei-button', 'tanrei-calendar']);
});

test('importing Button defines the button alone; importing only setWords defines nothing; the whole package defines every element', async () => {
  assert.deepEqual(await definedBy("import { Button } from '@tanrei/react';\nglobalThis.used = Button;"), ['tanrei-button']);
  assert.deepEqual(await definedBy("import { setWords } from '@tanrei/react';\nglobalThis.used = setWords;"), []);
  assert.deepEqual(await definedBy("import * as all from '@tanrei/react';\nglobalThis.used = all;"), tags);
});
