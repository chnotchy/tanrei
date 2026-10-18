// Which entry registers which component. A component lives in the layer every system that ships it descends from:
// `@tanrei/web` registers the components of the core, and a layer's own entry those that live in it — the FAB menu
// lives in m3-like, so `@tanrei/web/m3-like` registers it and `@tanrei/web` does not. esbuild is the judge: each entry
// is bundled as a product would import it, and the bundle holds the definitions it reaches and no other. Run after
// the build (`dist/`), by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const DEFINED = /customElements\.define\(\s*["']([a-z0-9-]+)["']/g;

/** The file an export of the package names (`./m3-like`, `./components/button`, `./link.css`), or undefined. */
function exported(entry) {
  const pick = (value, star) => {
    const file = typeof value === 'string' ? value : value?.default;
    return file && file.replaceAll('*', star);
  };
  if (entry in pkg.exports) return pick(pkg.exports[entry], '');
  for (const [key, value] of Object.entries(pkg.exports)) {
    const [before, after, ...more] = key.split('*');
    if (after === undefined || more.length || !entry.startsWith(before) || !entry.endsWith(after) || entry.length <= before.length + after.length) continue;
    return pick(value, entry.slice(before.length, entry.length - after.length));
  }
  return undefined;
}

/** The tags an entry of the package defines, imported alone as a product imports it. */
async function definedBy(entry) {
  const target = path.join(root, exported(entry));
  const result = await build({
    stdin: { contents: `import ${JSON.stringify(target)};`, resolveDir: root },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    external: ['lit', 'lit/*', '@lit/*'],
    logLevel: 'silent',
  });
  return new Set([...result.outputFiles[0].text.matchAll(DEFINED)].map((match) => match[1]));
}

test('`@tanrei/web` registers the core’s components and not the FAB menu, which lives in m3-like', async () => {
  const main = await definedBy('.');
  assert.ok(main.has('tanrei-button') && main.has('tanrei-main-action-button'), 'the premise: the main entry defines the core’s components');
  assert.equal(main.has('tanrei-fab-menu'), false);
  assert.equal(main.has('tanrei-fab-menu-item'), false);
});

/** The files of the package a bundle of an entry, imported alone as a product imports it, is made from. */
async function modulesOf(entry) {
  const result = await build({
    stdin: { contents: `import ${JSON.stringify(path.join(root, exported(entry)))};`, resolveDir: root },
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'browser',
    external: ['lit', 'lit/*', '@lit/*'],
    logLevel: 'silent',
  });
  return new Set(Object.keys(result.metafile.inputs).map((input) => path.relative(root, path.resolve(root, input))));
}

// What the manifest names is what a product can import: the module it names for an element is the one
// custom-elements.json says declares it (and defines it when it is evaluated), and the entry it names reaches that module.
test('each system’s components manifest is in dist/systems/, and the modules it names register what it lists', async () => {
  const generated = path.join(root, '../../tokens/generated');
  const systems = fs.readdirSync(generated).filter((id) => fs.existsSync(path.join(generated, id, 'components.json')));
  assert.ok(systems.includes('tanrei') && systems.includes('m3-like'), systems.join(', '));
  const elements = JSON.parse(fs.readFileSync(path.join(root, 'custom-elements.json'), 'utf8'));
  const declaredIn = new Map(elements.modules.flatMap((module) => (module.declarations ?? []).filter((each) => each.tagName).map((each) => [each.tagName, module.path])));
  const reached = new Map();
  /** The export of this package a module specifier names: `@tanrei/web/m3-like` → `./m3-like`. */
  const exportOf = (specifier) => `.${specifier.slice(pkg.name.length)}`;
  for (const id of systems) {
    const file = path.join(root, 'dist/systems', `${id}.components.json`);
    assert.ok(fs.existsSync(file), `the build copies ${id}'s manifest to dist/systems/`);
    assert.equal(exported(`./systems/${id}.components.json`), `./dist/systems/${id}.components.json`, 'and the package exports it');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const { name, web } of manifest.components) {
      const entry = exportOf(web.import);
      const built = exported(entry);
      assert.ok(built && fs.existsSync(path.join(root, built)), `${id}: ${name}'s ${web.import} is an export of the package, built`);
      if (!web.tag) continue; // a class: its stylesheet is the export
      const own = path.normalize(exported(exportOf(web.module)));
      assert.equal(own, path.join('dist', declaredIn.get(web.tag).replace(/^src\//, '').replace(/\.ts$/, '.js')), `${id}: ${web.module} is the module that declares <${web.tag}>`);
      if (!reached.has(entry)) reached.set(entry, await modulesOf(entry));
      assert.ok(reached.get(entry).has(own), `${id}: ${web.import} reaches ${own}, which defines <${web.tag}>`);
    }
  }
  assert.ok(!reached.get('.').has(path.join('dist', 'components/fab-menu/fab-menu.js')), 'the premise holds: the main entry does not reach the FAB menu');
});

test('`@tanrei/web/m3-like` registers the FAB menu, and the manifest lists it under that module', async () => {
  const layer = await definedBy('./m3-like');
  assert.ok(layer.has('tanrei-fab-menu') && layer.has('tanrei-fab-menu-item'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'custom-elements.json'), 'utf8'));
  const module = manifest.modules.find((each) => each.path === 'src/m3-like.ts');
  assert.ok(module, 'custom-elements.json has the module src/m3-like.ts');
  const exported = module.exports.map((each) => each.name);
  assert.ok(exported.includes('TanreiFabMenu') && exported.includes('TanreiFabMenuItem'), exported.join(', '));
  assert.ok(module.exports.every((each) => each.declaration.module === './components/fab-menu/fab-menu.js'), 'it exports the FAB menu’s module and nothing else');
});
