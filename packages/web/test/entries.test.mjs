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

/** The tags an entry of the package defines, imported alone as a product imports it. */
async function definedBy(entry) {
  const target = path.join(root, pkg.exports[entry].default);
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
