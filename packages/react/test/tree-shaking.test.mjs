// A product that imports one wrapper bundles that wrapper and its element, not the whole of @tanrei/web
// (scripts/generate.js: one module per wrapper, package.json `sideEffects: false`, every call at load marked pure), from
// whichever entry of the package it imports it (scripts/entries.js: one entry per system, `/advanced` and `/all`), and an
// entry holds what the components manifests say of it (tokens/generated/<id>/components.json).
//
// esbuild is the bundler here, as a product would use it: each entry imports from the package by its name, minified
// for the browser. Every wrapper is held, from every entry that exports it, to the element's own module bundled alone
// (`import '@tanrei/web/components/…'`): the same definitions, and no more bytes than React and `@lit/react` add. Then
// bundles are run, under Node with Lit's DOM shim, to see what each entry exports and which elements they define.
// Reads both packages' builds (`pnpm --filter @tanrei/web build`, then this package's).
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
const readJson = (url) => JSON.parse(fs.readFileSync(url, 'utf8'));
const { web, packages } = readJson(new URL('../../../tanrei.config.json', import.meta.url));
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

// The package's entries, as its `exports` name them, and the components manifest of every shipped system.
const REACT = `${packages.npmScope}/react`;
const entries = Object.keys(readJson(new URL('../package.json', import.meta.url)).exports).map((subpath) => (subpath === '.' ? REACT : `${REACT}${subpath.slice(1)}`));
const ALL = `${REACT}/all`;
const generated = new URL('../../../tokens/generated/', import.meta.url);
const systems = fs
  .readdirSync(generated)
  .filter((id) => fs.existsSync(new URL(`${id}/components.json`, generated)))
  .map((id) => readJson(new URL(`${id}/components.json`, generated)));
const catalog = new Map(readJson(new URL('../../tokens-build/generated/component-catalog.json', import.meta.url)).components.map((component) => [component.name, component]));

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

/** What `value` is once `source` has run, as JSON: bundled for Node, where Lit brings its own `customElements` (none without Lit). */
async function run(source, value) {
  const [text] = await bundle([`${source}\nconsole.log(JSON.stringify(${value}));`], { platform: 'node' });
  const child = spawnSync(process.execPath, ['--input-type=module'], { input: text, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout.trim().split('\n').at(-1));
}
const DEFINED = `${JSON.stringify(tags)}.filter((tag) => globalThis.customElements?.get(tag))`;
/** The tags defined once `source` has run. */
const definedBy = (source) => run(source, DEFINED);
/** What entry `specifier` exports, and the tags importing the whole of it defines. */
const entryOf = (specifier) => run(`import * as entry from '${specifier}';\nglobalThis.used = entry;`, `{ names: Object.keys(entry).sort(), defined: ${DEFINED} }`);
const contents = new Map(await Promise.all(entries.map(async (specifier) => [specifier, await entryOf(specifier)])));
const wrapperNames = new Set(wrappers.map(({ name }) => name));

test('the wrappers are found, each with a built element module', () => {
  // A floor, not a count.
  assert.ok(wrappers.length > 100, `found ${wrappers.length}`);
  assert.ok(wrappers.some(({ name }) => name === 'Calendar'));
  const missing = wrappers.filter(({ element }) => !fs.existsSync(fileURLToPath(import.meta.resolve(element))));
  assert.deepEqual(missing, [], 'build the web package first (pnpm --filter @tanrei/web build)');
});

test('each entry holds what the components manifests say: a system’s entry its components, and nothing it leaves out', () => {
  assert.ok(systems.length >= 4, `found ${systems.length} manifests`);
  assert.deepEqual(contents.get(ALL).names.filter((name) => wrapperNames.has(name)), [...wrapperNames].sort(), `${ALL} exports every wrapper`);
  const named = new Set();
  for (const system of systems) {
    const own = new Set();
    for (const component of system.components.filter((each) => each.react)) {
      assert.ok(entries.includes(component.react.import), `${system.system}: ${component.name} is imported from ${component.react.import}, which package.json does not export`);
      assert.ok(contents.get(component.react.import).names.includes(component.react.name), `${component.react.import} exports ${component.react.name} (${system.system})`);
      if (component.listing !== 'advanced') own.add(component.react.import);
    }
    // The system's own entry: every component of the default listing is imported from one entry, which leaves out
    // what the system does not have.
    assert.equal(own.size, 1, `${system.system}: ${[...own].join(', ')}`);
    const [entry] = own;
    named.add(entry);
    for (const { name } of system.omitted) {
      const wrapper = catalog.get(name)?.react?.name;
      if (wrapper) assert.ok(!contents.get(entry).names.includes(wrapper), `${entry} leaves out ${wrapper}: "${system.system}" does not have ${name}`);
    }
  }
  assert.ok(named.has(REACT), `the main entry is a shipped system's: ${[...named].join(', ')}`);
  // Every wrapper is in a system's entry or among the building blocks, besides /all.
  const placed = new Set([...contents].filter(([specifier]) => specifier !== ALL).flatMap(([, { names }]) => names));
  assert.deepEqual([...wrapperNames].filter((name) => !placed.has(name)), []);
});

test('each wrapper bundles as its element does alone, from every entry that exports it: the same definitions, and only React and @lit/react besides', async () => {
  const modules = [...new Set(wrappers.map((wrapper) => wrapper.element))];
  const imports = entries.flatMap((specifier) => wrappers.filter(({ name }) => contents.get(specifier).names.includes(name)).map((wrapper) => ({ ...wrapper, specifier })));
  const texts = await bundle(
    [
      ...imports.map(({ name, specifier }) => `import { ${name} } from '${specifier}';\nglobalThis.used = ${name};`),
      ...modules.map((module) => `import '${module}';`),
      `import * as all from '${ALL}';\nglobalThis.used = all;`,
    ],
    { platform: 'browser', minify: true },
  );
  const alone = new Map(modules.map((module, index) => [module, texts[imports.length + index]]));
  const whole = texts.at(-1);
  // The control: the whole package keeps every definition, so a count of them can tell a wrapper's bundle from it.
  assert.ok(definitions(whole) >= tags.length, 'the whole package defines every element');
  // The premise of the narrowed wrappers: the main entry's text field takes the default system's variants only.
  assert.ok(imports.some(({ name, specifier }) => name === 'TextField' && specifier === REACT));
  const kept = imports
    .map(({ name, element, specifier }, index) => ({ name, element, specifier, text: texts[index], own: alone.get(element) }))
    .filter(({ text, own }) => definitions(text) !== definitions(own) || bytes(text) > bytes(own) + OVERHEAD)
    .map(({ name, element, specifier, text, own }) => `${name} from ${specifier}: ${bytes(text)} B and ${definitions(text)} definitions; ${element} alone: ${bytes(own)} B and ${definitions(own)}`);
  assert.deepEqual(kept, [], `the whole package is ${bytes(whole)} B`);
  const calendar = texts[imports.findIndex(({ name, specifier }) => name === 'Calendar' && specifier === REACT)];
  assert.ok(bytes(calendar) * 10 < bytes(whole), `Calendar: ${bytes(calendar)} B of ${bytes(whole)} B`);
});

test('importing Calendar defines the calendar and the buttons it draws, and no other element', async () => {
  assert.deepEqual(await definedBy(`import { Calendar } from '${REACT}';\nglobalThis.used = Calendar;`), [`${web.tagPrefix}-button`, `${web.tagPrefix}-calendar`]);
});

test('importing Button defines the button alone; importing only setWords defines nothing; every entry exports the words', async () => {
  assert.deepEqual(await definedBy(`import { Button } from '${REACT}';\nglobalThis.used = Button;`), [`${web.tagPrefix}-button`]);
  assert.deepEqual(await definedBy(`import { setWords } from '${REACT}';\nglobalThis.used = setWords;`), []);
  for (const specifier of entries) assert.ok(['missingWords', 'setWords'].every((name) => contents.get(specifier).names.includes(name)), `${specifier} exports the words`);
});

test('a whole entry defines the elements of its components and of nothing its system leaves out; /all defines every element', () => {
  assert.deepEqual(contents.get(ALL).defined, tags);
  for (const system of systems) {
    const entry = system.components.find((component) => component.react && component.listing !== 'advanced').react.import;
    const { defined } = contents.get(entry);
    const listed = system.components.filter((component) => component.react?.import === entry).map((component) => component.web.tag);
    assert.deepEqual(listed.filter((tag) => !defined.includes(tag)), [], `${entry} defines its components`);
    const left = system.omitted.map(({ name }) => catalog.get(name)?.web?.tag).filter(Boolean);
    if (entry === REACT) assert.ok(left.length, 'the premise: the default system leaves something out');
    assert.deepEqual(left.filter((tag) => defined.includes(tag)), [], `${entry} defines nothing "${system.system}" leaves out`);
  }
});
