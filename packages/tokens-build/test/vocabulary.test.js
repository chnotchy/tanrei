// Extensible vocabulary: what a layer may add, what it may not, and that an extension is an
// ordinary token by the time anything downstream looks at it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildBundle, layerChain, validateLayerFile } from '../src/bundle.js';
import { emitCss } from '../src/emit/css.js';
import { checkInvariants } from '../src/invariants.js';
import { REPO_ROOT, buildModel } from '../src/model.js';
import { loadSystem } from '../src/scheme.js';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after); // whatever tempDir() made is removed, and the file fails if something stays

const here = path.dirname(fileURLToPath(import.meta.url));
const acme = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/acme.system.json'), 'utf8'));
const chainOf = (...layers) => layerChain(layers.at(-1).id, (id) => (id === 'tanrei' ? loadSystem(REPO_ROOT) : layers.find((l) => l.id === id)));
const build = (...layers) => buildBundle(REPO_ROOT, chainOf(...layers));
const layer = (extra) => ({ id: 'acme', name: 'Acme', extends: 'tanrei', ...extra });

async function modelOf(...layers) {
  const { files, system } = build(...layers);
  const dir = tempDir('vocabulary');
  try {
    for (const [name, doc] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), JSON.stringify(doc));
    }
    return { model: await buildModel(dir, system.id), files, system };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('the fixture is a valid layer', () => {
  assert.deepEqual(validateLayerFile(REPO_ROOT, acme, 'acme'), []);
});

test('all three kinds of extension become ordinary tokens, read back through a standard DTCG resolver', async () => {
  const { model, files } = await modelOf(acme);
  const value = (id) => model.tokens[id]?.value;

  // 1. a step in a series — dial-driven like its neighbours
  assert.deepEqual(value('tanrei.sys.space.space1200'), { value: 96, unit: 'px' });
  assert.equal(model.tokens['tanrei.sys.space.space1200'].derive.fn, 'mul');
  // …and a single color role, valued per scheme by the palette engine
  assert.ok(model.colors.light['brand-glow'] && model.colors['dark-high']['brand-glow']);
  assert.notEqual(model.colors.light['brand-glow'].value.hex, model.colors.dark['brand-glow'].value.hex);

  // 2a. a size: one line values every member of the axis, from `large` × 1.5, still following the dials
  //    (large is 56 high with 24 padding: 56 × 1.5 = 84, 24 × 1.5 = 36)
  assert.deepEqual(value('tanrei.comp.button.container.height.3x'), { value: 84, unit: 'px' });
  assert.deepEqual(value('tanrei.comp.button.container.padding-inline-start.3x'), { value: 36, unit: 'px' });
  assert.equal(model.tokens['tanrei.comp.button.container.padding-inline-start.3x'].derive.of, '{tanrei.sys.space.space300}');
  assert.deepEqual(value('tanrei.comp.button.container.padding-block.3x'), { value: 16, unit: 'px' }, 'a single member overridden under "tokens"');
  // 2b. a variant: two resting colors given; the system's pattern rules value every state
  assert.equal(model.tokens['tanrei.comp.button.danger.container.color'].alias, 'tanrei.sys.color.error');
  for (const state of ['hovered', 'focused', 'pressed', 'disabled']) assert.ok(model.tokens[`tanrei.comp.button.danger.${state}.container.color`], state);
  assert.notDeepEqual(value('tanrei.comp.button.danger.hovered.container.color'), value('tanrei.comp.button.danger.container.color'));
  assert.deepEqual(value('tanrei.comp.button.danger.container.elevation'), value('tanrei.comp.button.filled.container.elevation'), 'what was not overridden is cloned');

  // 3. the layer's own tokens, in its own namespace, following Tanrei's dials and roles
  assert.deepEqual(value('acme.comp.rating.star.size'), { value: 20, unit: 'px' });
  assert.equal(model.tokens['acme.comp.rating.star.color'].alias, 'tanrei.sys.color.warning');
  assert.ok(files['ext/acme.tokens.json'], 'own tokens travel in their own document');
  assert.deepEqual(files['acme.resolver.json'].sets.ext.sources, [{ $ref: 'ext/acme.tokens.json' }]);

  // The bundle says what was added, by whom and why.
  const { extensions } = files['dial/dial.tokens.json'].$extensions['dev.tanrei.system'];
  assert.deepEqual(extensions.map((e) => e.id).sort(), Object.keys(acme.vocabulary).sort());
  assert.ok(extensions.every((e) => e.declaredBy === 'acme' && e.rationale.length >= 8));

  // Nothing else moved, the invariants hold, and the web output carries the new names with live dials.
  assert.deepEqual(value('tanrei.comp.button.container.height.large'), { value: 56, unit: 'px' });
  assert.deepEqual(checkInvariants(model), []);
  const css = emitCss(model, { scope: 'acme' });
  assert.match(css, /--tanrei-comp-button-container-height-3x: round\(nearest, calc\(var\(--tanrei-dial-size-unit\) \* 21\), 0\.25px\);/);
  assert.match(css, /--tanrei-comp-button-danger-hovered-container-color: color-mix\(/);
  assert.match(css, /--acme-comp-rating-star-size: round\(nearest, calc\(var\(--tanrei-dial-size-unit\) \* 5\), 0\.25px\);/);
});

test('extensions are inherited, and a child layer changes them like any token', async () => {
  const kids = { id: 'acme-kids', name: 'Acme Kids', extends: 'acme', tokens: {
    'tanrei.sys.space.space1200': { scale: 0.5 },
    'tanrei.comp.button.container.height.3x': { $value: { value: 72, unit: 'px' }, reason: 'Larger tap targets for small hands.' },
    'acme.comp.rating.gap': { $value: '{tanrei.sys.space.space100}' },
  } };
  const { model } = await modelOf(acme, kids);
  assert.deepEqual(model.tokens['tanrei.sys.space.space1200'].value, { value: 48, unit: 'px' });
  assert.deepEqual(model.tokens['tanrei.comp.button.container.height.3x'].value, { value: 72, unit: 'px' });
  assert.equal(model.tokens['acme.comp.rating.gap'].alias, 'tanrei.sys.space.space100');
});

test('what a layer may not do', () => {
  const rationale = 'A reason long enough to pass.';
  const cases = [
    [layer({ tokens: { 'tanrei.sys.space.space950': { scale: 2 } } }), /unknown token.*declare it under "vocabulary"/s, 'a value for something that does not exist'],
    [layer({ vocabulary: { 'tanrei.sys.space.space950': { $type: 'dimension', rationale: 'x' } } }), /needs a "rationale"/, 'an extension without a reason'],
    [layer({ vocabulary: { 'tanrei.sys.space.space100': { $type: 'number', rationale } } }), /core now has this id as "dimension"/, 'retyping core'],
    [layer({ vocabulary: { 'other.comp.thing.size': { $type: 'dimension', rationale, $value: '{tanrei.sys.space.space100}' } } }), /its own namespace — "acme\.…"/, 'someone else’s namespace'],
    [layer({ vocabulary: { 'tanrei.comp.button.size.huge': { from: 'gigantic', rationale } } }), /"from" must be an existing size/, 'cloning from nothing'],
    [layer({ vocabulary: { 'tanrei.comp.button.variant.hovered': { from: 'filled', rationale } } }), /interaction state; states are not extensible/, 'a state is not a variant'],
    [layer({ vocabulary: { 'tanrei.comp.button.density.compact': { from: 'medium', rationale } } }), /has no axis "density"/, 'an axis the component does not declare'],
    [layer({ vocabulary: { 'tanrei.widgets.knob': { $type: 'number', rationale, $value: 1 } } }), /is not a group of the vocabulary/, 'a new tier'],
    [layer({ vocabulary: { 'tanrei.sys.rhythm.beat': { $type: 'number', rationale, $value: 1 } } }), /"tanrei\.sys\.rhythm" is not a group of the vocabulary[\s\S]*own namespace/, 'a new group inside Tanrei’s tree'],
    [layer({ vocabulary: { 'acme.comp.rating.size': { $type: 'dimension', rationale, $value: '{tanrei.sys.space.space100}' } }, tokens: { 'tanrei.comp.button.container.gap.medium': { $value: '{acme.comp.rating.size}' } } }), /cannot reference \{acme\.comp\.rating\.size\}/, 'core depending on a layer’s own token'],
    [layer({ vocabulary: { 'tanrei.sys.space.space1200': { $type: 'dimension', rationale } } }), /./, 'a declared token with no value'],
  ];
  for (const [candidate, expected, why] of cases) assert.throws(() => build(candidate), expected, why);
  const child = { id: 'acme-kids', extends: 'acme', vocabulary: { 'tanrei.sys.space.space1200': { $type: 'dimension', rationale, derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 9 } } } };
  assert.throws(() => build(acme, child), /already declared by layer "acme".*under "tokens"/s, 're-declaring an ancestor’s extension');
});

test('the schema asks for a rationale and tells the two shapes apart', () => {
  const problems = (vocabulary) => validateLayerFile(REPO_ROOT, layer({ vocabulary }), 'acme').join('\n');
  assert.match(problems({ 'tanrei.sys.space.space1200': { $type: 'dimension' } }), /rationale/);
  assert.match(problems({ 'tanrei.comp.button.size.3x': { from: 'large', $type: 'dimension', rationale: 'Both shapes at once.' } }), /must match exactly one schema|additional properties/);
  assert.match(problems({ 'Tanrei.sys.Space': { $type: 'dimension', rationale: 'Bad name for a token.' } }), /property name must be valid/);
});

test('a system without extensions is untouched: no ext set, no extension list', () => {
  const { files } = build(layer({ tokens: { 'tanrei.dial.shape.unit': { $value: { value: 4, unit: 'px' }, reason: 'Rounder everywhere.' } } }));
  assert.equal(files['acme.resolver.json'].sets.ext, undefined);
  assert.equal(files['dial/dial.tokens.json'].$extensions['dev.tanrei.system'].extensions, undefined);
  assert.ok(!Object.keys(files).some((name) => name.startsWith('ext/')));
});

test('a declared color role with `onRole` is contrast-checked like any core pair', async () => {
  const pale = layer({ vocabulary: {
    'tanrei.sys.color.whisper': { $type: 'color', rationale: 'A barely visible tint, to prove the check.', derive: { fn: 'tone', palette: 'neutral', tone: { light: [96], dark: [10] } }, onRole: 'tanrei.sys.color.on-whisper' },
    'tanrei.sys.color.on-whisper': { $type: 'color', rationale: 'Content on the whisper role — too faint on purpose.', derive: { fn: 'tone', palette: 'neutral', tone: { light: [90], dark: [16] } } },
  } });
  const { model } = await modelOf(pale);
  const problems = checkInvariants(model).filter((p) => p.includes('whisper'));
  assert.ok(problems.length >= 2, 'light and dark');
  assert.match(problems[0], /on-whisper on whisper: [\d.]+:1 < 4\.5:1 \(content on the declared role "whisper"\)/);
  // The fixture's own declared role passes.
  assert.deepEqual(checkInvariants((await modelOf(acme)).model), []);
});
