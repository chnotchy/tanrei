// End to end for a non-default system: layers → bundle on disk → standard DTCG resolver → emitters.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { availabilityOf, buildBundle, layerChain, listSystems, validateLayerFile } from '../src/bundle.js';
import { emitCss } from '../src/emit/css.js';
import { checkInvariants } from '../src/invariants.js';
import { REPO_ROOT, buildModel } from '../src/model.js';
import { loadSystem } from '../src/scheme.js';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after); // whatever tempDir() made is removed, and the file fails if something stays

const preset = { id: 'roomy', name: 'Roomy', extends: 'tanrei', tokens: {
  'tanrei.dial.space.unit': { $value: { value: 10, unit: 'px' }, reason: 'A preset with more air.' },
  'tanrei.dial.shape.unit': { $value: { value: 4, unit: 'px' }, reason: 'Rounder everywhere.' },
  // More air inside a control needs a taller control: the height invariant reports a system that forgets this.
  'tanrei.dial.size.unit': { $value: { value: 5, unit: 'px' }, reason: 'Controls grow with the spacing.' },
} };
const product = { id: 'acme', name: 'Acme', extends: 'roomy',
  palettes: { accent: { description: 'Acme is green.', source: { seed: '#1a7f37' }, roles: 'intent' }, correct: { description: 'A quiz product marks right answers, which is neither success nor primary.', source: { seed: '#0f766e' }, roles: 'intent' } },
  tokens: {
    'tanrei.comp.button.container.padding-inline-start.medium': { scale: 2 },
    'tanrei.sys.color.outline-variant': { derive: { fn: 'alpha', of: { light: 'black', dark: 'white' }, amount: { light: [12], dark: [20] } } },
  } };
const layers = { core: loadSystem(REPO_ROOT, 'core'), tanrei: loadSystem(REPO_ROOT, 'tanrei'), roomy: preset, acme: product };

test('every committed layer file is schema-valid', () => {
  for (const id of listSystems(REPO_ROOT)) assert.deepEqual(validateLayerFile(REPO_ROOT, loadSystem(REPO_ROOT, id), id), []);
});

test('the schema rejects what the philosophy forbids', () => {
  assert.match(validateLayerFile(REPO_ROOT, { id: 'x', extends: 'tanrei', tokens: { 'Acme.sys.Space': { scale: 2 } } }, 'x').join('\n'), /property name must be valid/);
  assert.match(validateLayerFile(REPO_ROOT, { id: 'x', extends: 'tanrei', thresholds: {} }, 'x').join('\n'), /additional properties/);
  // Extending the vocabulary is allowed — with a reason.
  assert.match(validateLayerFile(REPO_ROOT, { id: 'x', extends: 'tanrei', vocabulary: { 'tanrei.sys.space.space950': { $type: 'dimension' } } }, 'x').join('\n'), /rationale/);
  // A component that lives in a layer says what a system without it uses: a reason, and at least one component.
  const holding = (outside) => validateLayerFile(REPO_ROOT, { id: 'x', extends: 'core', vocabulary: { 'tanrei.comp.fab-menu': { document: 'comp/fab-menu.tokens.json', rationale: 'Only this line ships it.', outside } } }, 'x').join('\n');
  assert.equal(holding({ reason: 'A main action button opens a sheet.', insteadUse: ['main-action-button'] }), '');
  assert.match(holding({ reason: 'A main action button opens a sheet.', insteadUse: [] }), /fewer than 1 items/);
  assert.match(holding({ insteadUse: ['main-action-button'] }), /reason/);
  assert.match(validateLayerFile(REPO_ROOT, { id: 'x' }, 'x').join('\n'), /only the root layer/);
  assert.match(validateLayerFile(REPO_ROOT, { id: 'y', extends: 'tanrei' }, 'x').join('\n'), /must equal the file name/);
});

test('a product on a preset on the root: bundle → DTCG resolver → CSS', async () => {
  const root = await buildModel();
  const rootFocus = root.colors.light['focus-ring'].value.hex;
  // Button's medium padding aliases a step of the space scale; read which one from the default, not restated here.
  const padding = 'tanrei.comp.button.container.padding-inline-start.medium';
  const paddingStep = root.tokens[padding].alias;
  const steps = root.tokens[padding].value.value / root.tokens['tanrei.dial.space.unit'].value.value;
  const chain = layerChain('acme', (id) => layers[id]);
  assert.deepEqual(chain.map((l) => l.id), ['core', 'tanrei', 'roomy', 'acme']);
  const { files } = buildBundle(REPO_ROOT, chain);

  const dir = tempDir('bundle');
  for (const [name, doc] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), JSON.stringify(doc, null, 2));
  }
  // The bundle is plain DTCG 2025.10: a standard resolver reads it with no Tanrei code involved.
  const model = await buildModel(dir, 'acme');
  const value = (id) => model.tokens[id].value;

  assert.equal(value('tanrei.sys.space.space200').value, 20, 'preset dial: 10 × 2');
  assert.equal(value('tanrei.sys.shape.corner.small').value, 12, 'preset dial: 4 × 3');
  assert.equal(value(padding).value, 2 * (10 * steps), 'product: 2 × (preset dial 10 × the padding’s space step)');
  assert.equal(value('tanrei.sys.typescale.body-large').fontSize.value, 16, 'untouched dial → untouched value');
  assert.notEqual(model.colors.light['focus-ring'].value.hex, rootFocus, 'the product’s accent palette replaced the root’s');
  assert.ok(model.colors.light.correct && model.colors.dark['on-correct-container'], 'a declared palette yields the four roles of an intent');
  assert.ok(!('tertiary' in model.colors.light), 'tertiary is not vocabulary');
  assert.equal(model.colors.dark['outline-variant'].value.alpha, 0.2);

  // The recipe travels inside the bundle.
  const recipe = files['dial/dial.tokens.json'].$extensions['dev.tanrei.system'];
  assert.deepEqual(recipe.chain, ['core', 'tanrei', 'roomy', 'acme']);
  assert.equal(recipe.layers[3].tokens['tanrei.comp.button.container.padding-inline-start.medium'].scale, 2);

  assert.deepEqual(checkInvariants(model), [], 'this product stays accessible');
  assert.equal(value('tanrei.comp.button.container.height.small').value, 40, 'size dial: 5 × 8');
  const css = emitCss(model, { scope: 'acme' });
  assert.match(css, /\[data-tanrei-system="acme"\] \{\n\s+color-scheme: light dark;/);
  // The system's dial is a plain value; tokens derived from it stay expressions, so they remain live.
  assert.match(css, /--tanrei-dial-space-unit: 0\.625rem;/);
  assert.match(css, /--tanrei-sys-space-space200: round\(nearest, calc\(var\(--tanrei-dial-space-unit\) \* 2\), 0\.25px\);/);
  assert.ok(css.includes(`--tanrei-comp-button-container-padding-inline-start-medium: round(nearest, calc(var(--${paddingStep.replaceAll('.', '-')}) * 2), 0.25px);`), 'a scaled alias is emitted as an expression too');
  assert.ok(!css.includes(':root'), 'a scoped sheet never touches :root');
  fs.rmSync(dir, { recursive: true });
});

test('an extends cycle and a chain that misses the root are reported', () => {
  assert.throws(() => layerChain('a', (id) => ({ a: { id: 'a', extends: 'b' }, b: { id: 'b', extends: 'a' } })[id]), /"extends" cycle/);
  assert.throws(() => layerChain('a', () => ({ id: 'a' })), /does not extend "core"/);
});

test('a layer that invents a color role is told to declare a palette', () => {
  const bad = { id: 'bad', extends: 'tanrei', tokens: { 'tanrei.sys.color.quaternary': { derive: { fn: 'tone', palette: 'accent', tone: [40] } } } };
  assert.throws(() => buildBundle(REPO_ROOT, [layers.core, layers.tanrei, bad]), /not a color role.*declare a palette/s);
});

test('what a system does not ship is worked out down its chain, and every system stylesheet carries it', () => {
  const read = (id) => loadSystem(REPO_ROOT, id);
  assert.ok(availabilityOf(layerChain('tanrei', read)).components.includes('segmented-button'));
  // m3-expressive-like says nothing of its components, so it ships what m3-like ships (Material's bar has no filled
  // form; its tabs have no tonal kind).
  assert.deepEqual(availabilityOf(layerChain('m3-expressive-like', read)), availabilityOf(layerChain('m3-like', read)));
  assert.deepEqual(availabilityOf(layerChain('m3-expressive-like', read)), { components: [], variants: { 'navigation-bar': ['filled'], tabs: ['tonal'] } });
  assert.deepEqual(availabilityOf([{ id: 'a', components: { omit: { x: { reason: 'Not drawn here.' } } } }, { id: 'b' }]), { components: ['x'], variants: {} });
  const css = (unavailable) => emitCss({ partial: true, tokens: {}, colors: { light: {}, 'light-medium': {}, 'light-high': {}, dark: {}, 'dark-medium': {}, 'dark-high': {} }, schemes: [] }, { scope: 'b', unavailable });
  assert.match(css({ components: ['fab-menu'], variants: { 'text-field': ['filled'] } }), /--tanrei-unavailable: "fab-menu text-field:filled";/);
  assert.match(css({ components: [], variants: {} }), /--tanrei-unavailable: "";/);
  // What lives in a layer the system does not extend is said apart, with that layer.
  const sheet = emitCss({ partial: true, tokens: {}, colors: { light: {}, 'light-medium': {}, 'light-high': {}, dark: {}, 'dark-medium': {}, 'dark-high': {} }, schemes: [] }, { unavailable: { components: [], variants: {} }, outside: { 'fab-menu': 'm3-like' } });
  assert.match(sheet, /--tanrei-unavailable-layer: "fab-menu=m3-like";/);
});
