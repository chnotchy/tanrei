// A component lives in the layer every system that ships it descends from. The FAB menu is shipped by the Material
// line only, so it lives in `m3-like`: that layer declares the component's whole vocabulary (its document is kept next
// to it, tokens/systems/m3-like/comp/), the systems that descend from it have the component, and no other system has
// its tokens — the default system and cupertino do not leave it out, they do not have it. A product that wants it on
// another line includes it from the layer that holds it, and its tokens are then valued with the product's own.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { SystemError, collectVocabulary, mergeLayers, resolveNumericTokens, rootLayerProblems } from '@tanrei/token-engine';
import { DEFAULT_SYSTEM, heldComponents, layerChain, listSystems, outsideComponents } from '../src/bundle.js';
import { emitCss } from '../src/emit/css.js';
import { componentChoiceProblems, nativeChain } from '../src/layers.js';
import { REPO_ROOT } from '../src/model.js';
import { readSystemChain, resolveChain, validateSystem } from '../src/resolve.js';
import { heldDocuments, loadSystem, sourceFiles } from '../src/scheme.js';

const read = (id) => loadSystem(REPO_ROOT, id);
const sheet = (name) => fs.readFileSync(path.join(REPO_ROOT, 'packages/web/src/generated', name), 'utf8');
const declarations = (css) => css.split('\n').filter((line) => line.trim().startsWith('--'));
const fabMenu = (css) => declarations(css).filter((line) => line.trim().startsWith('--tanrei-comp-fab-menu-'));
const held = () => heldComponents(listSystems(REPO_ROOT), read);
const DOCUMENT = 'systems/m3-like/comp/fab-menu.tokens.json';

test('the FAB menu lives in m3-like: its tokens are in the sheets of the systems that descend from it, and nowhere else', () => {
  assert.deepEqual([...held()], [['fab-menu', 'm3-like']]);
  assert.equal(sourceFiles(REPO_ROOT)['comp/fab-menu.tokens.json'], undefined, 'the core vocabulary does not have it');
  assert.equal(fabMenu(sheet('tokens.css')).length, 0);
  assert.equal(fabMenu(sheet('systems/m3-like.css')).length, 282);
  assert.equal(fabMenu(sheet('systems/cupertino.css')).length, 0);
  // Each sheet says where what it does not have lives, apart from what it leaves out.
  assert.match(sheet('tokens.css'), /--tanrei-unavailable-layer: "fab-menu=m3-like";/);
  assert.match(sheet('systems/cupertino.css'), /--tanrei-unavailable-layer: "fab-menu=m3-like";/);
  assert.match(sheet('systems/m3-like.css'), /--tanrei-unavailable-layer: "";/);
  assert.doesNotMatch(sheet('tokens.css'), /--tanrei-unavailable: "[^"]*fab-menu/);
  // The lock keeps its ids, as the layer's: moved, not removed.
  const lock = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tokens/vocabulary.lock.json'), 'utf8'));
  assert.equal(Object.keys(lock.tokens).filter((id) => id.startsWith('tanrei.comp.fab-menu.')).length, 0);
  assert.equal(Object.keys(lock.layers['m3-like']).length, 226);
  assert.ok(Object.keys(lock.layers['m3-like']).every((id) => id.startsWith('tanrei.comp.fab-menu.')));
});

test('a product on the default system includes the FAB menu from m3-like and draws it with the default system’s tokens', async () => {
  const product = { id: 'acme', name: 'Acme', extends: DEFAULT_SYSTEM, components: { include: [{ name: 'fab-menu', from: 'm3-like' }] } };
  assert.deepEqual(validateSystem({ layers: [product] }), []);
  const { chain } = readSystemChain({ layers: [product] });
  const css = emitCss(await (await resolveChain(chain)).model());
  // All 282 declarations, and around them exactly the default system's sheet: the product sets no value of its own.
  assert.equal(fabMenu(css).length, 282);
  const rest = (text) => declarations(text).filter((line) => !line.trim().startsWith('--tanrei-comp-fab-menu-') && !line.includes('--tanrei-unavailable'));
  assert.deepEqual(rest(css), rest(sheet('tokens.css')));
  // The document's own aliases, resolved against the default system's tokens — not m3-like's values for it.
  const line = (text, name) => declarations(text).find((each) => each.trim().startsWith(`${name}:`))?.trim();
  assert.equal(line(css, '--tanrei-comp-fab-menu-tonal-container-color'), '--tanrei-comp-fab-menu-tonal-container-color: var(--tanrei-sys-color-secondary-container);');
  assert.equal(line(sheet('systems/m3-like.css'), '--tanrei-comp-fab-menu-tonal-container-color'), '--tanrei-comp-fab-menu-tonal-container-color: var(--tanrei-sys-color-primary-container);', 'm3-like values it its own way');
  assert.equal(line(css, '--tanrei-comp-fab-menu-item-label-typescale-font'), '--tanrei-comp-fab-menu-item-label-typescale-font: var(--tanrei-sys-typescale-label-font);');
  // The rules that value its own states come with it: the toggle still rises further under a pointer.
  assert.equal(line(css, '--tanrei-comp-fab-menu-filled-hovered-container-elevation'), '--tanrei-comp-fab-menu-filled-hovered-container-elevation: var(--tanrei-sys-elevation-level4);');
  // Every alias it writes leads to a declaration of the same sheet.
  const declared = new Set(declarations(css).map((each) => each.trim().split(':')[0]));
  for (const each of fabMenu(css)) for (const [, name] of each.matchAll(/var\((--[a-z0-9-]+)\)/g)) assert.ok(declared.has(name), `${each.trim()}: ${name} is declared`);
});

test('the native outputs keep every component, valued with the system’s own tokens where the component lives outside it', () => {
  const tanrei = layerChain(DEFAULT_SYSTEM, read);
  assert.deepEqual(outsideComponents(tanrei, held()), { 'fab-menu': 'm3-like' });
  assert.deepEqual(nativeChain(tanrei, held()).at(-1).components.include, [{ name: 'fab-menu', from: 'm3-like' }]);
  const m3 = layerChain('m3-like', read);
  assert.equal(nativeChain(m3, held()), m3, 'nothing to add where the component lives');
});

test('a component that lives in a layer: what its declaration and an include must say', () => {
  const core = { id: 'core' };
  const holder = { id: 'holder', extends: 'core', vocabulary: { 'tanrei.comp.fab-menu': { document: 'comp/fab-menu.tokens.json', rationale: 'Only this line ships it.' } } };
  const lend = (id) => ({ holder })[id];
  const refuse = (layers, pattern) => assert.throws(() => collectVocabulary(layers, { lend }), (error) => error instanceof SystemError && pattern.test(error.message));
  refuse([core, { id: 'x', extends: 'core', vocabulary: { 'tanrei.comp.fab-menu': { document: 'comp/other.tokens.json', rationale: 'A wrong file name.' } } }], /"document" is "comp\/fab-menu\.tokens\.json"/);
  refuse([core, { id: 'x', extends: 'core', vocabulary: { 'x.comp.fab-menu': { document: 'comp/fab-menu.tokens.json', rationale: 'Not in the core namespace.' } } }], /in the core namespace/);
  refuse([core, { id: 'x', extends: 'core', vocabulary: { 'tanrei.comp.fab-menu': { document: 'comp/fab-menu.tokens.json', rationale: 'A rule for another component.', rules: [{ match: 'tanrei.comp.chip.*.hovered.container.color', $value: '{tanrei.sys.color.primary}' }] } } }], /its rules value the component's own states/);
  refuse([core, { id: 'x', extends: 'core', components: { include: [{ name: 'chip', from: 'holder' }] } }], /"chip" does not live in "holder"/);
  refuse([core, holder, { id: 'x', extends: 'holder', components: { include: [{ name: 'fab-menu', from: 'holder' }] } }], /already in this system/);
  assert.throws(() => collectVocabulary([core, { id: 'x', extends: 'core', components: { include: [{ name: 'fab-menu', from: 'holder' }] } }]), /needs that layer — pass "lend"/);
  // Included, the declaration is the holder's, brought by the layer that includes it.
  const vocabulary = collectVocabulary([core, { id: 'x', extends: 'core', components: { include: [{ name: 'fab-menu', from: 'holder' }] } }], { lend });
  assert.equal(vocabulary['tanrei.comp.fab-menu'].declaredBy, 'holder');
  assert.equal(vocabulary['tanrei.comp.fab-menu'].includedBy, 'x');
});

test('a system reads the document of a component it has, and no other', () => {
  const sources = sourceFiles(REPO_ROOT);
  const documents = heldDocuments(REPO_ROOT);
  assert.deepEqual(Object.keys(documents), [DOCUMENT]);
  // A system that does not have the component drops the document, whatever it is handed.
  const plain = resolveNumericTokens({ ...sources, ...documents }, mergeLayers(layerChain(DEFAULT_SYSTEM, read)));
  assert.equal(plain['comp/fab-menu.tokens.json'], undefined);
  assert.ok(Object.keys(plain).every((name) => !name.startsWith('systems/')));
  // One that has it reads it as one of its component documents; without the document it is refused, not left out.
  const m3 = mergeLayers(layerChain('m3-like', read));
  assert.ok(resolveNumericTokens({ ...sources, ...documents }, m3)['comp/fab-menu.tokens.json'].tanrei.comp['fab-menu']);
  assert.throws(() => resolveNumericTokens(sources, mergeLayers(layerChain('m3-like', read))), /tokens\/systems\/m3-like\/comp\/fab-menu\.tokens\.json\) is not among the sources/);
});

test('the default system’s layers cannot include a component from another layer: its vocabulary is tokens/ as written', () => {
  const tanrei = { ...read(DEFAULT_SYSTEM), components: { include: [{ name: 'fab-menu', from: 'm3-like' }] } };
  assert.match(rootLayerProblems(sourceFiles(REPO_ROOT), tanrei, { role: 'the default system\'s own layer' }).join('\n'), /cannot include "fab-menu" from "m3-like"/);
});

test('what a layer says of a component that lives in another layer is checked', () => {
  const inventory = new Set(['fab-menu', 'chip', 'main-action-button']);
  const catalog = { inventory, variantsOf: () => undefined, held: held() };
  const problems = (components) => componentChoiceProblems([...layerChain(DEFAULT_SYSTEM, read), { id: 'acme', extends: DEFAULT_SYSTEM, components }], catalog).join('\n');
  assert.equal(problems({ include: [{ name: 'fab-menu', from: 'm3-like' }] }), '');
  assert.match(problems({ include: ['fab-menu'] }), /"fab-menu" lives in the layer "m3-like", which this system does not extend — include it from there: \{ "name": "fab-menu", "from": "m3-like" \}/);
  assert.match(problems({ include: [{ name: 'fab-menu', from: 'cupertino' }] }), /"fab-menu" lives in the layer "m3-like", not in "cupertino"/);
  assert.match(problems({ include: [{ name: 'chip', from: 'm3-like' }] }), /"chip" lives in the root layer, not in "m3-like"/);
  assert.match(problems({ omit: { 'fab-menu': { reason: 'Nothing to leave out here.' } } }), /"fab-menu" lives in the layer "m3-like", which this system does not extend — it has nothing to leave out/);
  assert.match(problems({ omit: { chip: { reason: 'Filters are menus here.', insteadUse: ['fab-menu'] } } }), /insteadUse: "fab-menu" is not a component this system ships/);
  // Under m3-like it is one of the system's own: included again it is refused, left out it is fine.
  const under = (components) => componentChoiceProblems([...layerChain('m3-like', read), { id: 'acme', extends: 'm3-like', components }], catalog).join('\n');
  assert.match(under({ include: [{ name: 'fab-menu', from: 'm3-like' }] }), /"fab-menu" is already in this system — it extends "m3-like"/);
  assert.equal(under({ omit: { 'fab-menu': { reason: 'This product has one main action.', insteadUse: ['main-action-button'] } } }), '');
  // A product file that names it alone is told how to include it.
  assert.match(validateSystem({ layers: [{ id: 'acme', extends: DEFAULT_SYSTEM, components: { include: ['fab-menu'] } }] }).join('\n'), /include it from there: \{ "name": "fab-menu", "from": "m3-like" \}/);
});
