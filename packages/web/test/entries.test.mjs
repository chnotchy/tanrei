// Which entry registers which component. `@tanrei/web` registers the default system's components and no other, so a
// product on it reaches only what its system ships; `@tanrei/web/<id>` registers what system <id> ships;
// `@tanrei/web/all` every component; a component's own module, `@tanrei/web/components/<name>`, the component alone.
// The default system ships neither the FAB menu (it lives in the m3-like layer) nor the segmented button (it leaves it
// out), so the main entry registers neither. esbuild is the judge: each entry is bundled as a product would import it,
// and the bundle holds the modules it reaches and no other — an element is registered by the module that declares it
// (custom-elements.json), when it is evaluated. Run after the build (`dist/`), by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(root, '../../tanrei.config.json'), 'utf8'));
const DEFAULT_SYSTEM = config.namespace;
const tag = (name) => `${config.web.tagPrefix}-${name}`;

/** The file an export of the package names (`./all`, `./components/button`, `./m3-like`), or undefined. */
function exported(entry) {
  const pick = (value, star) => {
    const file = typeof value === 'string' ? value : value?.default;
    return file && file.replaceAll('*', star);
  };
  if (entry in pkg.exports) return pick(pkg.exports[entry], '');
  // The longest pattern that matches, as Node picks one.
  const matches = Object.entries(pkg.exports)
    .map(([key, value]) => {
      const [before, after, ...more] = key.split('*');
      if (after === undefined || more.length || !entry.startsWith(before) || !entry.endsWith(after) || entry.length <= before.length + after.length) return null;
      return { before, value, star: entry.slice(before.length, entry.length - after.length) };
    })
    .filter(Boolean)
    .sort((a, b) => b.before.length - a.before.length);
  return matches[0] && pick(matches[0].value, matches[0].star);
}

/** The export of this package a module specifier names: `@tanrei/web/m3-like` → `./m3-like`. */
const exportOf = (specifier) => `.${specifier.slice(pkg.name.length)}`;

/** A bundle of an entry, imported alone as a product imports it. */
const bundled = (entry) =>
  build({
    stdin: { contents: `import ${JSON.stringify(path.join(root, exported(entry)))};`, resolveDir: root },
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'browser',
    external: ['lit', 'lit/*', '@lit/*'],
    logLevel: 'silent',
  });
const cache = new Map();
/** The files of the package an entry is made from, and the tags the modules among them declare. */
async function reach(entry) {
  if (!cache.has(entry)) {
    const result = await bundled(entry);
    const modules = new Set(Object.keys(result.metafile.inputs).map((input) => path.relative(root, path.resolve(root, input))));
    const tags = new Set([...declaredIn].filter(([, at]) => modules.has(path.join('dist', at.replace(/^src\//, '').replace(/\.ts$/, '.js')))).map(([name]) => name));
    cache.set(entry, { tags, modules });
  }
  return cache.get(entry);
}

const generated = path.join(root, '../../tokens/generated');
const systems = fs.readdirSync(generated).filter((id) => fs.existsSync(path.join(generated, id, 'components.json')));
const manifestOf = (id) => JSON.parse(fs.readFileSync(path.join(generated, id, 'components.json'), 'utf8'));
const elements = JSON.parse(fs.readFileSync(path.join(root, 'custom-elements.json'), 'utf8'));
/** Every tag a module of the package declares (a component's own tag and the elements it is drawn with: a FAB menu's items). */
const declaredIn = new Map(elements.modules.flatMap((module) => (module.declarations ?? []).filter((each) => each.tagName).map((each) => [each.tagName, module.path])));
const tagsOfModule = (modulePath) => [...declaredIn].filter(([, at]) => at === modulePath).map(([name]) => name);
const catalog = JSON.parse(fs.readFileSync(path.join(root, '../tokens-build/generated/component-catalog.json'), 'utf8'));
/**
 * The tags a system ships: every element of the package but those of the modules of the components it does not have
 * (a FAB menu's items go with it; an option, which no component is listed for, stays with the selects that use it).
 */
const shippedTags = (manifest) => {
  const omitted = new Set(manifest.omitted.map((entry) => entry.name));
  const gone = new Set(catalog.components.filter((component) => omitted.has(component.name) && component.web?.tag).flatMap((component) => tagsOfModule(declaredIn.get(component.web.tag))));
  for (const component of manifest.components) if (component.web?.tag) assert.ok(!gone.has(component.web.tag), `${manifest.system}: <${component.web.tag}> is listed, and its module is one of a component it does not have`);
  return new Set([...declaredIn.keys()].filter((name) => !gone.has(name)));
};

test('the premise: the default system ships neither the FAB menu nor the segmented button, and m3-like ships both', () => {
  assert.ok(systems.includes(DEFAULT_SYSTEM) && systems.includes('m3-like'), systems.join(', '));
  const names = (id) => manifestOf(id).components.map((component) => component.name);
  assert.ok(!names(DEFAULT_SYSTEM).includes('fab-menu') && !names(DEFAULT_SYSTEM).includes('segmented-button'));
  assert.ok(names('m3-like').includes('fab-menu') && names('m3-like').includes('segmented-button'));
});

test('`@tanrei/web` registers exactly the default system’s components: neither the FAB menu nor the segmented button', async () => {
  const { tags } = await reach('.');
  assert.deepEqual([...tags].sort(), [...shippedTags(manifestOf(DEFAULT_SYSTEM))].sort());
  for (const name of ['fab-menu', 'fab-menu-item', 'segmented-button', 'segment']) assert.equal(tags.has(tag(name)), false, `<${tag(name)}>`);
  assert.ok(tags.has(tag('button')) && tags.has(tag('main-action-button')), 'the premise: it defines the default system’s components');
});

test('`@tanrei/web/<id>` registers exactly what system <id> ships, for every shipped system but the default, whose entry is `@tanrei/web`', async () => {
  assert.equal(pkg.exports[`./${DEFAULT_SYSTEM}`], undefined, 'the default system’s entry is the main one');
  for (const id of systems.filter((each) => each !== DEFAULT_SYSTEM)) {
    const entry = `./${id}`;
    const file = exported(entry);
    assert.equal(file, `./dist/${id}.js`, `${entry} is an export of the package`);
    assert.equal(pkg.exports[entry].types, `./dist/${id}.d.ts`);
    assert.ok(fs.existsSync(path.join(root, file)) && fs.existsSync(path.join(root, `dist/${id}.d.ts`)), `the build writes ${file} and its declarations`);
    assert.ok(pkg.sideEffects.includes(`./dist/${id}.js`), `${file} is in sideEffects, so a bundler keeps what it registers`);
    const { tags } = await reach(entry);
    assert.deepEqual([...tags].sort(), [...shippedTags(manifestOf(id))].sort(), id);
  }
  const m3 = (await reach('./m3-like')).tags;
  assert.ok(m3.has(tag('fab-menu')) && m3.has(tag('fab-menu-item')) && m3.has(tag('segmented-button')) && m3.has(tag('segment')));
  const cupertino = (await reach('./cupertino')).tags;
  assert.ok(cupertino.has(tag('segmented-button')) && !cupertino.has(tag('fab-menu')));
});

test('`@tanrei/web/all` registers every element of the package, and a component’s own module the component alone', async () => {
  const { tags } = await reach('./all');
  assert.deepEqual([...tags].sort(), [...declaredIn.keys()].sort());
  const segmented = (await reach('./components/segmented-button')).tags;
  assert.ok(segmented.has(tag('segmented-button')) && segmented.has(tag('segment')));
  assert.ok(!segmented.has(tag('fab-menu')));
  const fab = (await reach('./components/fab-menu')).tags;
  assert.ok(fab.has(tag('fab-menu')) && fab.has(tag('fab-menu-item')));
});

// What the manifest names is what a product can import: the module it names for an element is the one
// custom-elements.json says declares it (and defines it when it is evaluated), and the entry it names reaches that module.
test('each system’s components manifest is in dist/systems/, and the entries and modules it names register what it lists', async () => {
  for (const id of systems) {
    const file = path.join(root, 'dist/systems', `${id}.components.json`);
    assert.ok(fs.existsSync(file), `the build copies ${id}'s manifest to dist/systems/`);
    assert.equal(exported(`./systems/${id}.components.json`), `./dist/systems/${id}.components.json`, 'and the package exports it');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const { name, web } of manifest.components) {
      // A component the web has not built yet (its spec's web status is planned) names no web entry or module.
      if (!web) continue;
      const entry = exportOf(web.import);
      const built = exported(entry);
      assert.ok(built && fs.existsSync(path.join(root, built)), `${id}: ${name}'s ${web.import} is an export of the package, built`);
      if (!web.tag) continue; // a class: its stylesheet is the export
      assert.equal(web.import, id === DEFAULT_SYSTEM ? pkg.name : `${pkg.name}/${id}`, `${id}: ${name} is registered by the system’s entry`);
      const own = path.normalize(exported(exportOf(web.module)));
      assert.equal(own, path.join('dist', declaredIn.get(web.tag).replace(/^src\//, '').replace(/\.ts$/, '.js')), `${id}: ${web.module} is the module that declares <${web.tag}>`);
      assert.ok((await reach(entry)).modules.has(own), `${id}: ${web.import} reaches ${own}, which defines <${web.tag}>`);
    }
  }
});

test('a system’s components have one entry, `@tanrei/web/<id>`, and `all` is in sideEffects', () => {
  assert.ok(!Object.keys(pkg.exports).some((key) => /^\.\/systems\/.*\.js$/.test(key)), 'no other entry registers a system’s components');
  assert.ok(pkg.sideEffects.includes('./dist/all.js'));
});
