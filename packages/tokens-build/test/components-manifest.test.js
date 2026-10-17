// A system's components manifest lists what the system ships and nothing else: a component another layer holds, or
// one the system leaves out, is under `omitted` with where it lives or what to use instead, never under `components`.
// It is worked out from the system's layers and the component catalog, so a product built on a system keeps what that
// system left out, and a product that includes a component from another layer has it listed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DEFAULT_SYSTEM, heldComponents, layerChain, listSystems, shippedSystems } from '../src/bundle.js';
import { componentCatalog } from '../src/components-catalog.js';
import { CATALOG_FILE, componentsManifest, manifestFile, readComponentCatalog } from '../src/components-manifest.js';
import { CONFIG } from '../src/config.js';
import { REPO_ROOT } from '../src/model.js';
import { readSystemChain, validateSystem } from '../src/resolve.js';
import { loadSystem } from '../src/scheme.js';

const read = (id) => loadSystem(REPO_ROOT, id);
const held = heldComponents(listSystems(REPO_ROOT), read);
const shipped = shippedSystems(REPO_ROOT);
const WEB = `${CONFIG.packages.npmScope}/web`;
const catalog = readComponentCatalog(REPO_ROOT);
const committed = (id) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, manifestFile(id)), 'utf8'));
const names = (manifest) => manifest.components.map((component) => component.name);
const find = (manifest, name) => manifest.components.find((component) => component.name === name);
const omitted = (manifest, name) => manifest.omitted.find((entry) => entry.name === name);
/** The manifest of a product's layers in memory, after the checks `tanrei build` runs first. */
function productManifest(...layers) {
  assert.deepEqual(validateSystem({ layers }), [], 'the product layer is valid');
  return componentsManifest(readSystemChain({ layers }).chain, catalog, held, shipped);
}

test('every shipped system has its manifest, and it is what its layers and the catalog give', () => {
  const { $comment, ...fresh } = componentCatalog(REPO_ROOT);
  assert.ok($comment);
  assert.deepEqual(catalog.components, fresh.components, `${CATALOG_FILE} is what the specs and the platforms give`);
  for (const id of shippedSystems(REPO_ROOT)) {
    const { $comment: note, ...manifest } = committed(id);
    assert.match(note, /^GENERATED /);
    assert.deepEqual(manifest, componentsManifest(layerChain(id, read), catalog, held, shipped), id);
  }
});

test('the default system lists neither the FAB menu nor the segmented button, and says why and what to use', () => {
  const tanrei = committed(DEFAULT_SYSTEM);
  assert.equal(tanrei.system, DEFAULT_SYSTEM);
  assert.deepEqual(tanrei.chain, ['core', DEFAULT_SYSTEM]);
  assert.ok(names(tanrei).includes('button') && names(tanrei).includes('main-action-button'), 'the premise: the core’s components are listed');
  assert.equal(find(tanrei, 'fab-menu'), undefined);
  assert.equal(find(tanrei, 'segmented-button'), undefined);
  for (const component of tanrei.components) if (component.web.tag) assert.equal(component.web.import, WEB, `${component.name}: the main entry registers the default system’s components`);
  // The FAB menu is not left out: it lives in m3-like, which the default system does not descend from.
  assert.deepEqual(omitted(tanrei, 'fab-menu'), { name: 'fab-menu', title: 'FAB menu', providedBy: 'm3-like' });
  const segmented = omitted(tanrei, 'segmented-button');
  assert.equal(segmented.omittedBy, DEFAULT_SYSTEM);
  assert.ok(segmented.reason);
  assert.deepEqual(segmented.insteadUse, read(DEFAULT_SYSTEM).components.omit['segmented-button'].insteadUse);
  for (const instead of segmented.insteadUse) assert.ok(find(tanrei, instead), `${instead}, named instead, is listed`);
  // Variant values left out are gone from the component and from every component that takes its variant from it.
  assert.deepEqual(find(tanrei, 'text-input').variants, ['stacked']);
  assert.deepEqual(find(tanrei, 'text-field').variants, ['stacked'], 'the text field’s variant is its text input’s');
  assert.deepEqual(tanrei.omittedVariants['text-input'], ['filled', 'outlined']);
  assert.deepEqual(tanrei.omittedVariants['text-field'], ['filled', 'outlined']);
});

test('m3-like and m3-expressive-like list both; cupertino lists the segmented button and not the FAB menu', () => {
  for (const id of ['m3-like', 'm3-expressive-like']) {
    const manifest = committed(id);
    assert.ok(find(manifest, 'segmented-button'), id);
    const fab = find(manifest, 'fab-menu');
    assert.ok(fab, id);
    assert.equal(fab.layer, 'm3-like');
    assert.deepEqual(fab.web, { tag: `${CONFIG.web.tagPrefix}-fab-menu`, import: `${WEB}/${id}`, module: `${WEB}/components/fab-menu` }, 'registered by the system’s entry, not the main one');
    assert.equal(find(manifest, 'segmented-button').web.import, `${WEB}/${id}`, 'and so is the segmented button, which the main entry does not register');
    assert.equal(find(manifest, 'button').web.import, `${WEB}/${id}`, 'a system’s entry registers every component it ships');
    assert.equal(omitted(manifest, 'fab-menu'), undefined);
    assert.deepEqual(find(manifest, 'text-field').variants, ['stacked', 'filled', 'outlined'], 'the preset does not inherit the default system’s choices');
    assert.deepEqual(find(manifest, 'navigation-bar').variants, ['tonal']);
  }
  const cupertino = committed('cupertino');
  assert.equal(find(cupertino, 'segmented-button').web.import, `${WEB}/cupertino`);
  assert.equal(find(cupertino, 'fab-menu'), undefined);
  assert.deepEqual(omitted(cupertino, 'fab-menu'), { name: 'fab-menu', title: 'FAB menu', providedBy: 'm3-like' });
});

test('each name comes from tanrei.config.json and from what the platforms generate', () => {
  const tag = new RegExp(`^${CONFIG.web.tagPrefix}-[a-z0-9-]+$`);
  for (const id of shippedSystems(REPO_ROOT)) {
    for (const component of committed(id).components) {
      assert.ok(component.web, `${component.name} has a web name`);
      assert.match(component.web.tag ?? component.web.class, tag);
      assert.ok(component.web.import.startsWith(`${CONFIG.packages.npmScope}/web`), component.web.import);
      // React: the system's own entry (the main one for the default system), and the building blocks' in every system.
      const entry = component.listing === 'advanced' ? 'advanced' : id === DEFAULT_SYSTEM ? null : id;
      if (component.react) assert.equal(component.react.import, `${CONFIG.packages.npmScope}/react${entry ? `/${entry}` : ''}`, `${id}: ${component.name}`);
    }
  }
  const tanrei = committed(DEFAULT_SYSTEM);
  // An element has its own module and a React wrapper; a class is a stylesheet of the package, with no wrapper.
  assert.deepEqual(find(tanrei, 'text-field').react, { name: 'TextField', import: `${CONFIG.packages.npmScope}/react` });
  assert.deepEqual(find(tanrei, 'text-input').react, { name: 'TextInput', import: `${CONFIG.packages.npmScope}/react/advanced` }, 'a building block');
  assert.deepEqual(find(committed('m3-like'), 'fab-menu').react, { name: 'FabMenu', import: `${CONFIG.packages.npmScope}/react/m3-like` });
  assert.deepEqual(find(tanrei, 'link').web, { class: `${CONFIG.web.tagPrefix}-link`, import: `${CONFIG.packages.npmScope}/web/link.css` });
  assert.equal(find(tanrei, 'link').react, undefined);
});

test('a product keeps what the system it extends leaves out, and adds its own choices to it', () => {
  const acme = productManifest({ id: 'acme', name: 'Acme', extends: DEFAULT_SYSTEM, components: { omit: { carousel: { reason: 'Acme shows one thing at a time.', insteadUse: ['list'] } }, variants: { tabs: { omit: ['tonal'] } } } });
  assert.deepEqual(acme.chain, ['core', DEFAULT_SYSTEM, 'acme']);
  assert.equal(acme.extends, DEFAULT_SYSTEM);
  assert.equal(find(acme, 'segmented-button'), undefined, 'the default system’s omission stays');
  assert.equal(omitted(acme, 'segmented-button').omittedBy, DEFAULT_SYSTEM);
  assert.equal(find(acme, 'fab-menu'), undefined);
  assert.deepEqual(find(acme, 'text-input').variants, ['stacked'], 'and so do its variant choices');
  assert.equal(find(acme, 'carousel'), undefined);
  assert.deepEqual(omitted(acme, 'carousel'), { name: 'carousel', title: 'Carousel', omittedBy: 'acme', reason: 'Acme shows one thing at a time.', insteadUse: ['list'] });
  assert.deepEqual(acme.omittedVariants.tabs, ['tonal']);
  assert.equal(acme.components.length, committed(DEFAULT_SYSTEM).components.length - 1);
  // An ancestor's choice is undone only by name.
  const again = productManifest({ id: 'acme', name: 'Acme', extends: DEFAULT_SYSTEM, components: { include: ['segmented-button'], variants: { 'text-input': { include: ['outlined'] } } } });
  // No system it is built on ships it, so no entry registers it: its own module does, drawn with the product's tokens.
  assert.deepEqual(find(again, 'segmented-button').web, { tag: `${CONFIG.web.tagPrefix}-segmented-button`, import: `${WEB}/components/segmented-button`, module: `${WEB}/components/segmented-button` });
  assert.equal(find(again, 'button').web.import, WEB, 'what the default system ships, the main entry registers');
  assert.equal(omitted(again, 'segmented-button'), undefined);
  assert.deepEqual(find(again, 'text-input').variants, ['stacked', 'outlined']);
  assert.deepEqual(find(again, 'text-field').variants, ['stacked', 'outlined']);
});

test('a product on the default system that includes the FAB menu from m3-like lists it, registered by its own module', () => {
  const acme = productManifest({ id: 'acme', name: 'Acme', extends: DEFAULT_SYSTEM, components: { include: [{ name: 'fab-menu', from: 'm3-like' }] } });
  const fab = find(acme, 'fab-menu');
  assert.ok(fab);
  assert.equal(fab.layer, 'm3-like');
  // A product's system has no entry of its own in React: its wrappers are imported from the entry of every wrapper.
  assert.equal(fab.react.import, `${CONFIG.packages.npmScope}/react/all`);
  assert.equal(find(acme, 'button').react.import, `${CONFIG.packages.npmScope}/react/all`);
  assert.equal(find(acme, 'text-input').react.import, `${CONFIG.packages.npmScope}/react/advanced`);
  assert.equal(fab.web.import, `${WEB}/components/fab-menu`, 'not m3-like’s entry: that registers what m3-like ships, which the product does not');
  assert.equal(omitted(acme, 'fab-menu'), undefined);
  assert.equal(find(acme, 'segmented-button'), undefined, 'what the default system leaves out stays out');
  assert.deepEqual(names(acme), [...names(committed(DEFAULT_SYSTEM)), 'fab-menu'].sort());
});

test('a variant value a layer adds to an axis is listed for every component that takes that axis', () => {
  const { axis } = catalog.components.find((component) => component.name === 'text-input').variant;
  assert.ok(axis, 'the premise: the text input’s variant is a token axis');
  const chain = [...layerChain(DEFAULT_SYSTEM, read), { id: 'acme', extends: DEFAULT_SYSTEM, vocabulary: { [`${axis}.glass`]: { from: 'stacked', rationale: 'Acme draws its fields on glass.' } } }];
  const acme = componentsManifest(chain, catalog, held, shipped);
  assert.deepEqual(find(acme, 'text-input').variants, ['stacked', 'glass']);
  assert.deepEqual(find(acme, 'text-field').variants, ['stacked', 'glass']);
});

test('a product on a preset takes the preset’s entry for what the preset ships, and the manifest needs the shipped systems', () => {
  const acme = productManifest({ id: 'acme', name: 'Acme', extends: 'm3-like', components: { omit: { carousel: { reason: 'Acme shows one thing at a time.' } } } });
  assert.equal(find(acme, 'segmented-button').web.import, `${WEB}/m3-like`);
  assert.equal(find(acme, 'fab-menu').web.import, `${WEB}/m3-like`);
  assert.equal(find(acme, 'button').web.import, `${WEB}/m3-like`);
  assert.throws(() => componentsManifest(layerChain(DEFAULT_SYSTEM, read), catalog, held), /name the shipped systems/);
});
