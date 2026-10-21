// Every system descends from the root layer `core`. The default system `tanrei` extends it, and so do the presets
// `m3-like` and `cupertino`; a product extends one of them. What a system
// ships is worked out down that chain.
//
// The root was cut out of the default system's layer: `core` holds the values the default system's layer held, and
// `tanrei` keeps only its choice of components. The presets then moved from `tanrei` to `core`. So no resolved value
// may have moved — in the default system, in a preset or in a product — and the first tests below hold exactly that,
// for every system that ships and for the example products, in every scheme.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SYSTEM, ROOT_SYSTEM, availabilityOf, layerChain, listSystems, shippedSystems, validateLayerFile } from '../src/bundle.js';
import { componentChoiceProblems, componentChoices } from '../src/layers.js';
import { REPO_ROOT } from '../src/model.js';
import { readSystemChain, resolveChain } from '../src/resolve.js';
import { SCHEMES, loadSystem } from '../src/scheme.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(here, 'fixtures', `${name}.system.json`), 'utf8'));
const read = (id) => loadSystem(REPO_ROOT, id);

/** Keys of a layer that value nothing: who it is, what it says of itself, and which components it ships. */
const NOT_VALUES = new Set(['$schema', 'id', 'name', 'description', 'extends', 'attribution', 'components']);
const setsNoValue = (layer) => Object.keys(layer).every((key) => NOT_VALUES.has(key));

/** Every token's type and value in every scheme: what a system resolves to, without where it came from. */
async function valuesOf(chain) {
  const resolved = await resolveChain(chain, { model: false });
  return Object.fromEntries(SCHEMES.map((scheme) => [scheme, Object.fromEntries(Object.entries(resolved.tokens(scheme)).map(([id, token]) => [id, JSON.stringify([token.$type, token.$value])]))]));
}

/** The same chain with the layers that set no value taken out: each child extends what its parent extended. */
const withoutValuelessLayers = (chain) => chain.filter((layer, i) => i === 0 || i === chain.length - 1 || !setsNoValue(layer));

function assertSameValues(actual, expected, what) {
  for (const scheme of SCHEMES) {
    assert.deepEqual(Object.keys(actual[scheme]).sort(), Object.keys(expected[scheme]).sort(), `${what}: the same tokens in ${scheme}`);
    const moved = Object.keys(expected[scheme]).filter((id) => actual[scheme][id] !== expected[scheme][id]);
    assert.deepEqual(moved, [], `${what}: no value moved in ${scheme}`);
  }
}

test('core is the root and ships nothing of its own; the default system extends it and ships', () => {
  assert.equal(ROOT_SYSTEM, 'core');
  assert.equal(read(ROOT_SYSTEM).extends, undefined);
  assert.equal(read(DEFAULT_SYSTEM).extends, ROOT_SYSTEM);
  assert.ok(listSystems(REPO_ROOT).includes(ROOT_SYSTEM), 'a chain finds the root among the layers');
  assert.deepEqual(shippedSystems(REPO_ROOT), listSystems(REPO_ROOT).filter((id) => id !== ROOT_SYSTEM));
  assert.ok(shippedSystems(REPO_ROOT).includes(DEFAULT_SYSTEM));
  for (const id of shippedSystems(REPO_ROOT)) assert.equal(layerChain(id, read)[0].id, ROOT_SYSTEM, `${id} descends from the root`);
  // The default system's own layer chooses components and values nothing: the root holds every value it had.
  assert.ok(setsNoValue(read(DEFAULT_SYSTEM)), Object.keys(read(DEFAULT_SYSTEM)).join(', '));
});

test('the default system resolves to exactly the root’s values, in every scheme', async () => {
  // What `diff_systems tanrei core` answers: no token differs.
  assertSameValues(await valuesOf(layerChain(DEFAULT_SYSTEM, read)), await valuesOf(layerChain(ROOT_SYSTEM, read)), `${DEFAULT_SYSTEM} against ${ROOT_SYSTEM}`);
});

const PRESETS = shippedSystems(REPO_ROOT).filter((system) => system !== DEFAULT_SYSTEM);

test('the presets extend the root, not the default system', () => {
  assert.deepEqual(Object.fromEntries(PRESETS.map((id) => [id, layerChain(id, read).map((layer) => layer.id)])), {
    cupertino: [ROOT_SYSTEM, 'cupertino'],
    'm3-like': [ROOT_SYSTEM, 'm3-like'],
  });
});

// Before, the default system's own layer stood between the root and each preset. It sets no value, so a preset must
// resolve to the values it had with that layer put back in its chain.
const withDefaultBetween = (chain) => [chain[0], read(DEFAULT_SYSTEM), ...chain.slice(1)];

for (const id of PRESETS) {
  test(`${id}: resolves to the values it had when it extended the default system, in every scheme`, async () => {
    const chain = layerChain(id, read);
    assert.ok(!chain.some((layer) => layer.id === DEFAULT_SYSTEM), 'the default system is not in its chain');
    assertSameValues(await valuesOf(chain), await valuesOf(withDefaultBetween(chain)), id);
  });
}

for (const name of ['acme', 'tone-per-state']) {
  test(`the example product "${name}": resolves to the values it has without the layers that set none, in every scheme`, async () => {
    const { chain } = readSystemChain({ layers: [fixture(name)] });
    assert.deepEqual(chain.map((layer) => layer.id).slice(0, 2), [ROOT_SYSTEM, DEFAULT_SYSTEM]);
    assertSameValues(await valuesOf(chain), await valuesOf(withoutValuelessLayers(chain)), name);
  });
}

test('what each shipped system leaves out is what it left out before the root was cut out, the FAB menu aside', () => {
  // The lists each system's stylesheet carries in --tanrei-unavailable. The FAB menu lives in m3-like now: the systems
  // that do not descend from it do not leave it out, they do not have it (the next test).
  const inputs = ['text-input', 'select', 'combobox', 'number-input', 'color-input'];
  assert.deepEqual(availabilityOf(layerChain(DEFAULT_SYSTEM, read)), {
    components: ['segmented-button'],
    variants: Object.fromEntries(inputs.map((name) => [name, ['filled', 'outlined']])),
  });
  assert.deepEqual(availabilityOf(layerChain(ROOT_SYSTEM, read)), { components: [], variants: {} }, 'the root leaves nothing out');
  // The presets extend the root: each leaves out only what it says itself.
  assert.deepEqual(availabilityOf(layerChain('m3-like', read)), { components: [], variants: { 'navigation-bar': ['filled'], tabs: ['tonal'] } });
  assert.deepEqual(availabilityOf(layerChain('cupertino', read)), { components: [], variants: { 'navigation-bar': ['filled'] } });
});

// ── what a system ships, down the chain ─────────────────────────────────────────────────────────────────────────

const root = { id: 'root' };
const base = {
  id: 'base',
  extends: 'root',
  components: {
    omit: { 'segmented-button': { reason: 'Tabs and radio buttons say what a choice changes.', insteadUse: ['tabs'] } },
    variants: { 'text-input': { omit: ['filled', 'outlined'] } },
  },
};

test('a layer adds to what its parent leaves out: the parent’s choices stay', () => {
  const acme = { id: 'acme', extends: 'base', components: { omit: { chip: { reason: 'This product filters with menus.' } }, variants: { 'navigation-bar': { omit: ['filled'] } } } };
  assert.deepEqual(availabilityOf([root, base, acme]), {
    components: ['segmented-button', 'chip'],
    variants: { 'text-input': ['filled', 'outlined'], 'navigation-bar': ['filled'] },
  });
  // A layer that says nothing of its components ships what its parent ships.
  assert.deepEqual(availabilityOf([root, base, { id: 'quiet', extends: 'base' }]), availabilityOf([root, base]));
  // Why, and what instead, travel with the component, with the layer that decided it.
  assert.deepEqual(componentChoices([root, base, acme]).components.get('segmented-button'), { layer: 'base', reason: 'Tabs and radio buttons say what a choice changes.', insteadUse: ['tabs'] });
});

test('`include` brings back what an ancestor left out, a component or a variant', () => {
  const acme = { id: 'acme', extends: 'base', components: { include: ['segmented-button'], variants: { 'text-input': { include: ['outlined'] } } } };
  assert.deepEqual(availabilityOf([root, base, acme]), { components: [], variants: { 'text-input': ['filled'] } });
  const all = { id: 'all', extends: 'base', components: { include: ['segmented-button'], variants: { 'text-input': { include: ['filled', 'outlined'] } } } };
  assert.deepEqual(availabilityOf([root, base, all]), { components: [], variants: {} }, 'a component with nothing left out has no line');
  // …and a layer below may leave it out again.
  const again = { id: 'again', extends: 'acme', components: { omit: { 'segmented-button': { reason: 'Left out again further down.' } } } };
  assert.deepEqual(availabilityOf([root, base, acme, again]).components, ['segmented-button']);
});

test('what a layer says of its components is checked against what its parent ships', () => {
  const inventory = new Set(['segmented-button', 'tabs', 'chip', 'text-input', 'button-group']);
  const variantsOf = (name) => (name === 'text-input' ? { values: ['stacked', 'filled', 'outlined'], default: 'stacked' } : undefined);
  const problems = (layer) => componentChoiceProblems([root, base, layer], { inventory, variantsOf });
  assert.deepEqual(problems({ id: 'ok', extends: 'base', components: { omit: { chip: { reason: 'Filters are menus here.', insteadUse: ['button-group'] } }, include: ['segmented-button'], variants: { 'text-input': { include: ['outlined'] } } } }), []);
  const say = (layer, pattern) => assert.match(problems({ id: 'acme', extends: 'base', ...layer }).join('\n'), pattern);
  say({ components: { omit: { nope: { reason: 'Not a component at all.' } } } }, /"nope" is not in specs\/inventory\.json/);
  say({ components: { omit: { 'segmented-button': { reason: 'Already out, said twice.' } } } }, /"segmented-button" is already left out by "base"/);
  say({ components: { omit: { chip: { reason: 'Filters are menus here.', insteadUse: ['segmented-button'] } } } }, /insteadUse: "segmented-button" is not a component this system ships/);
  say({ components: { include: ['chip'] } }, /"chip" is not left out by any layer this one extends — there is nothing to bring back/);
  say({ components: { variants: { 'text-input': { omit: ['stacked'] } } } }, /the default variant "stacked" cannot be left out/);
  say({ components: { variants: { 'text-input': { omit: ['filled'] } } } }, /"filled" is already left out by "base"/);
  say({ components: { variants: { 'text-input': { omit: ['tall'] } } } }, /"tall" is not a variant of text-input/);
  say({ components: { variants: { chip: { omit: ['filled'] } } } }, /"chip" has no spec with a variant prop/);
  assert.match(componentChoiceProblems([{ id: 'root', components: { omit: { chip: { reason: 'Not in the root, ever.' } } } }], { inventory, variantsOf }).join('\n'), /the root layer leaves no component out/);
  // The list that replaced its parent's is gone: a layer says what it changes, never the whole list again.
  assert.match(validateLayerFile(REPO_ROOT, { id: 'x', extends: 'tanrei', unavailable: { components: ['chip'] } }, 'x').join('\n'), /must NOT have additional properties/);
  assert.match(validateLayerFile(REPO_ROOT, { id: 'x', extends: 'tanrei', components: { omit: { chip: {} } } }, 'x').join('\n'), /must have required property 'reason'/);
});

test('a product on the default system may bring back a component the default leaves out, and draws it with the default’s tokens', () => {
  // The default system leaves the segmented button out; its tokens are in the vocabulary every system values, so a
  // product that includes it draws it in the default system's look.
  const product = { id: 'acme', name: 'Acme', extends: DEFAULT_SYSTEM, components: { include: ['segmented-button'] } };
  const chain = layerChain('acme', (id) => (id === 'acme' ? product : read(id)));
  assert.deepEqual(availabilityOf(chain).components, []);
  const inventory = new Set(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'specs/inventory.json'), 'utf8')).components.map((c) => c.name));
  assert.deepEqual(componentChoiceProblems(chain, { inventory, variantsOf: () => undefined }), []);
  assert.ok(fs.readFileSync(path.join(REPO_ROOT, 'packages/web/src/generated/tokens.css'), 'utf8').includes('--tanrei-comp-segmented-button-'), 'the default stylesheet values its tokens');
});
