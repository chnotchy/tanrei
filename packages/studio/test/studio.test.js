// Studio export ≡ CLI build, for everything the Studio can write.
// A layer produced by the Studio's edit functions is built with the real product pipeline (`buildProductSystem`,
// what `tanrei build` runs). Everything the Studio previewed — the whole scoped sheet, every document of the token
// bundle with the colors of all six schemes, and the accessibility warnings — must equal what the build emitted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { assertPreviewIsTheBuild, build } from './helpers.js';
import { json, repoRoot, shipped, studio } from './studio-node.js';
import { leavesNothingBehind } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after); // helpers.build() removes its directory; the file fails if one stays

const NS = studio.namespace;
const op = (layer, id, operation) => {
  const result = studio.applyOperation(layer, id, operation);
  assert.equal(result.problem, undefined, id);
  return result.layer;
};
const extend = (layer, fragment) => {
  const result = studio.addExtension(layer, fragment);
  assert.equal(result.problem, undefined);
  return result.layer;
};

/** What a visitor does with the dials and a palette, on any base. */
function groupsLayer(extendsId) {
  let layer = { ...studio.blank(extendsId), id: `studio-${extendsId}`, name: 'Studio export' };
  layer = studio.setDial(layer, `${NS}.dial.type.base`, 17, 'Our audience reads at arm’s length.');
  layer = studio.setDial(layer, `${NS}.dial.type.contrast`, 1.15);
  layer = studio.setDial(layer, `${NS}.dial.space.unit`, 9);
  layer = studio.setDial(layer, `${NS}.dial.shape.unit`, 3);
  layer = studio.setDial(layer, `${NS}.dial.motion.unit`, 40);
  layer = studio.setPalette(layer, 'primary', { source: { seed: '#e60012' } });
  layer = studio.setPalette(layer, 'correct', { source: { seed: '#0f766e' }, description: 'A quiz marks right answers — neither success nor primary.' });
  layer = studio.setPalette(layer, 'incorrect', { source: { hue: 25, chroma: 60 } });
  return layer;
}

for (const { id: extendsId } of studio.systems) {
  test(`a Studio layer on "${extendsId}" builds to exactly what the Studio previewed`, async () => {
    let layer = groupsLayer(extendsId);
    if (extendsId === studio.defaultId) layer = studio.dropPalette(layer, 'accent');
    layer = op(layer, `${NS}.comp.button.container.padding-inline-start.medium`, { scale: 2 });
    layer = op(layer, `${NS}.comp.button.container.gap.medium`, { $value: `{${NS}.sys.space.space50}` });
    layer = op(layer, `${NS}.sys.typescale.label-small`, { $value: { fontSize: { value: 11, unit: 'px' } }, reason: 'Legal footnote size is contractual.' });
    layer = op(layer, `${NS}.comp.button.container.height.medium`, { $value: { value: 44, unit: 'px' }, reason: 'Every medium button is a 44px touch target.' });

    const { view, result } = await assertPreviewIsTheBuild(layer);
    for (const intent of ['primary', 'correct', 'incorrect']) assert.ok(view.intents.includes(intent), `${intent} is an intent with its four roles`);
    if (extendsId === studio.defaultId) assert.ok(!('accent' in view.model.colors.light), 'a dropped palette leaves no roles');
    const sheet = result.files.web[`${layer.id}.css`];
    assert.match(sheet, /--tanrei-dial-type-base: 1\.0625rem;/);
    assert.match(sheet, /--tanrei-comp-button-container-gap-medium: var\(--tanrei-sys-space-space50\);/);
    assert.match(sheet, /--tanrei-sys-typescale-label-small-font-size: 0\.6875rem;/);
    assert.equal(view.valueOf(`${NS}.sys.typescale.label-small`).fontSize.value, 11, 'the pin holds whatever type.base is');
    if (extendsId === studio.defaultId) assert.equal(view.valueOf(`${NS}.sys.typescale.body-large`).fontSize.value, 17, 'body-large is type.base × 1');
    assert.equal(view.valueOf(`${NS}.comp.button.container.height.medium`).value, 44);
  });
}

test('a vivid seed is reported, never blocked, and the report matches the build', async () => {
  let layer = { ...studio.blank(), id: 'studio-yellow' };
  layer = studio.setPalette(layer, 'primary', { source: { seed: '#ffe600' } });
  layer = studio.setDial(layer, `${NS}.dial.type.base`, 20);
  await assertPreviewIsTheBuild(layer, { warnings: (warnings) => assert.ok(warnings.some((w) => /cannot hold its content/.test(w)), 'a 20px base no longer fits the small button: a warning, not an error') });
});

test('an untouched Studio exports an empty layer', () => {
  for (const { id } of studio.systems) {
    let layer = studio.blank(id);
    // Setting every control to the value the base already has writes nothing.
    for (const dial of studio.dials(layer)) layer = studio.setDial(layer, dial.id, dial.value);
    for (const dial of studio.essentials(layer).dials) layer = studio.setEssential(layer, dial.key, dial.value);
    for (const row of studio.paletteRows(layer)) if (row.source) layer = studio.setPalette(layer, row.name, { source: row.source });
    // Saying what the base already says writes nothing: the same alias where the base has an alias, the same rule where it has a rule.
    const gap = studio.base(id).model.tokens[`${NS}.comp.button.container.gap.medium`];
    assert.ok(gap.alias || gap.derive, `${id}: the gap is an alias or a rule`);
    layer = op(layer, gap.id, gap.alias ? { $value: `{${gap.alias}}` } : { derive: gap.derive });
    layer = op(layer, `${NS}.comp.button.container.height.medium`, { scale: 1 });
    assert.deepEqual(layer, { id: 'acme', extends: id });
  }
});

test('Essentials: four controls and a color write the minimal layer', async () => {
  let layer = { ...studio.blank(), id: 'quick' };
  assert.deepEqual(studio.essentials(layer).dials.map((d) => d.key), ['type.base', 'space.unit', 'shape.unit', 'type.contrast']);
  layer = studio.setPalette(layer, 'primary', { source: { seed: '#0b57d0' } });
  layer = studio.setEssential(layer, 'type.base', 17);
  layer = studio.setEssential(layer, 'space.unit', 10);
  layer = studio.setEssential(layer, 'shape.unit', 4);
  layer = studio.setEssential(layer, 'type.contrast', 1.2);
  const reason = 'Chosen in Theme Studio.';
  // The default system's primary is monochrome (valued from neutral): a brand color declares the palette and points
  // the five primary roles at it. That, the four dials, and the size unit that spacing takes with it — nothing else.
  assert.deepEqual(layer.palettes, { primary: { source: { seed: '#0b57d0' } } });
  const roles = Object.keys(layer.tokens).filter((id) => id.startsWith('tanrei.sys.color.'));
  assert.deepEqual(roles.sort(), ['inverse-primary', 'on-primary', 'on-primary-container', 'primary', 'primary-container'].map((role) => `tanrei.sys.color.${role}`));
  assert.deepEqual(Object.fromEntries(Object.entries(layer.tokens).filter(([id]) => !roles.includes(id))), {
    'tanrei.dial.type.base': { $value: { value: 17, unit: 'px' }, reason },
    'tanrei.dial.space.unit': { $value: { value: 10, unit: 'px' }, reason },
    // Spacing takes the size unit with it (8 → 10 is 4 → 5): a control's height must hold its padding.
    'tanrei.dial.size.unit': { $value: { value: 5, unit: 'px' }, reason },
    'tanrei.dial.shape.unit': { $value: { value: 4, unit: 'px' }, reason },
    'tanrei.dial.type.contrast': { $value: 1.2, reason },
  });
  assert.deepEqual(Object.keys(layer), ['id', 'extends', 'palettes', 'tokens']);
  assert.deepEqual(studio.setPalette(layer, 'primary', undefined).palettes, undefined, 'resetting the color takes its role operations away too');
  assert.ok(!Object.keys(studio.setPalette(layer, 'primary', undefined).tokens).some((id) => id.startsWith('tanrei.sys.color.')));
  await assertPreviewIsTheBuild(layer, { warnings: (warnings) => assert.ok(!warnings.some((w) => /cannot hold its content/.test(w)), 'proportional sizes keep every button tall enough') });

  // Once someone sets the size unit on its own (Groups), Essentials leaves it alone.
  const separated = studio.setDial(layer, 'tanrei.dial.size.unit', 4.5);
  assert.equal(studio.essentials(separated).linked, false);
  assert.equal(studio.setEssential(separated, 'space.unit', 12).tokens['tanrei.dial.size.unit'].$value.value, 4.5);
  // …and moving spacing back to the default takes the linked size back too: nothing is left behind.
  assert.deepEqual(studio.setEssential(studio.setEssential(studio.blank(), 'space.unit', 12), 'space.unit', 8), studio.blank());
});

test('fixed tones (`source.tones`) belong to a color: kept while the color stays, dropped when it changes', async () => {
  const blank = { ...studio.blank('m3-like'), id: 'studio-tones' };
  const inherited = shipped['m3-like'].palettes;
  const row = (layer, name) => studio.paletteRows(layer).find((r) => r.name === name);
  assert.equal(row(blank, 'primary').tones, Object.keys(inherited.primary.source.tones).length, 'the row says how many tones are fixed');
  assert.equal(row(blank, 'success').tones, 0);

  // The same color, however it is typed, is the inherited palette: nothing is written.
  assert.deepEqual(studio.setPalette(blank, 'primary', { source: { seed: inherited.primary.source.seed.toLowerCase() } }), blank);
  // A description keeps the source whole.
  const described = studio.setPalette(blank, 'tertiary', { description: 'Our third accent, for illustrations.' });
  assert.deepEqual(described.palettes.tertiary.source, inherited.tertiary.source);
  // Another color: the published tones of the old one must not survive it…
  const red = studio.setPalette(blank, 'primary', { source: { seed: '#e60012' } });
  assert.deepEqual(red.palettes.primary, { source: { seed: '#e60012' } });
  const { view } = await assertPreviewIsTheBuild(red);
  assert.notEqual(view.model.colors.light.primary.value.hex, studio.base('m3-like').model.colors.light.primary.value.hex, 'the brand color reaches the role');
  // …and going back to the inherited color is going back to the inherited palette, tones included.
  assert.deepEqual(studio.setPalette(red, 'primary', { source: { seed: inherited.primary.source.seed } }), blank);

  // A layer's own palette with fixed tones round-trips through the color controls and the description field.
  const own = { ...studio.blank(), id: 'studio-tones', palettes: { brand: { description: 'The logo red is contractual.', source: { seed: '#e60012', tones: { 40: '#e60012' } }, roles: 'intent' } } };
  assert.deepEqual(studio.setPalette(own, 'brand', { source: { seed: '#E60012' } }).palettes.brand.source, { seed: '#E60012', tones: { 40: '#e60012' } });
  assert.deepEqual(studio.setPalette(own, 'brand', { description: 'The logo red is contractual.' }), own);
  assert.equal(row(own, 'brand').tones, 1);
  await assertPreviewIsTheBuild(own);
});

test('a pin without a reason is not written', () => {
  const layer = studio.blank();
  for (const reason of [undefined, '', 'short', '   padded   ']) {
    const result = studio.applyOperation(layer, `${NS}.sys.typescale.label-small`, { $value: { fontSize: { value: 11, unit: 'px' } }, reason });
    assert.equal(result.problem, 'reason');
    assert.deepEqual(result.layer, layer);
  }
});

test('an extension without a rationale is not written', () => {
  const layer = studio.blank();
  for (const rationale of [undefined, '', 'because']) {
    const result = studio.addExtension(layer, { vocabulary: { [`${NS}.comp.button.size.3x`]: { from: 'large', scale: 1.5, rationale } } });
    assert.match(result.problem, /rationale/);
    assert.deepEqual(result.layer, layer);
  }
  // …and neither is one the engine refuses: an interaction state is not an axis value.
  const state = studio.addExtension(layer, { vocabulary: { [`${NS}.comp.button.variant.hovered`]: { from: 'filled', rationale: 'We want a hover variant.' } } });
  assert.match(state.problem, /interaction state/);
  assert.deepEqual(state.layer, layer);
});

// ── every operation kind ───────────────────────────────────────────────────────────────────────
const OPERATIONS = {
  'set the dial': (layer) => op(layer, `${NS}.dial.stroke.unit`, { $value: { value: 1.5, unit: 'px' }, reason: 'Borders read better on our displays.' }),
  scale: (layer) => op(layer, `${NS}.sys.shape.corner.small`, { scale: 1.5 }),
  'scale (alias)': (layer) => op(layer, `${NS}.comp.button.container.gap.medium`, { scale: 2 }),
  'scale (typography)': (layer) => op(layer, `${NS}.sys.typescale.heading-5`, { scale: 1.125 }),
  're-point alias': (layer) => op(layer, `${NS}.comp.button.container.shape`, { $value: `{${NS}.sys.shape.corner.large}` }),
  're-point alias (color role)': (layer) => op(layer, `${NS}.sys.color.link`, { $value: `{${NS}.sys.color.accent}` }),
  'pin $value': (layer) => op(layer, `${NS}.sys.space.space200`, { $value: { value: 18, unit: 'px' }, reason: 'The card grid is drawn on an 18px rhythm.' }),
  'pin $value (with a $type assertion)': (layer) => op(layer, `${NS}.sys.motion.duration.medium2`, { $type: 'duration', $value: { value: 280, unit: 'ms' }, reason: 'Matches the native sheet animation.' }),
  'derive (mul)': (layer) => op(layer, `${NS}.comp.button.container.height.small`, { derive: { fn: 'mul', of: `{${NS}.dial.size.unit}`, by: 7 } }),
  'derive (typography field)': (layer) => op(layer, `${NS}.sys.typescale.display`, { derive: { fontSize: { fn: 'mul', of: `{${NS}.dial.type.base}`, by: 3.5 } } }),
  'derive (tone)': (layer) => op(layer, `${NS}.sys.color.accent`, { derive: { fn: 'tone', palette: 'accent', tone: { light: [35, 30, 20], dark: [85, 90, 95] } } }),
  'derive (mix, a state token)': (layer) => op(layer, `${NS}.comp.button.filled.hovered.container.color`, { derive: { fn: 'mix', base: `{${NS}.comp.button.filled.container.color}`, with: `{${NS}.comp.button.filled.label.color}`, amount: 0.2 } }),
  'derive (alpha, a state token)': (layer) => op(layer, `${NS}.comp.button.tonal.disabled.label.color`, { derive: { fn: 'alpha', of: `{${NS}.sys.color.on-surface}`, amount: 0.5 } }),
  're-point alias (a state token)': (layer) => op(layer, `${NS}.comp.button.text.hovered.container.color`, { $value: `{${NS}.comp.button.text.container.color}` }),
  'pattern rule': (layer) => studio.setRules(layer, [{ match: `${NS}.comp.*.*.pressed.container.color`, $value: `{${NS}.comp.$1.$2.container.color}` }, { match: `${NS}.comp.*.pressed.opacity`, $value: 0.6, reason: 'This product dims on press.' }]),
};
for (const [kind, write] of Object.entries(OPERATIONS)) {
  test(`operation "${kind}": the exported layer builds to exactly what the Studio previewed`, async () => {
    const layer = write({ ...studio.blank(), id: 'studio-operation' });
    assert.ok(layer.tokens || layer.rules, 'the operation is written');
    const { view } = await assertPreviewIsTheBuild(layer);
    // revert-to-inherited: the editor's last operation takes the layer back to nothing.
    const reverted = Object.keys(layer.tokens ?? {}).reduce((l, id) => studio.applyOperation(l, id, null).layer, studio.setRules(layer, []));
    assert.deepEqual(reverted, { id: 'studio-operation', extends: studio.defaultId });
    // The editor offers only what the engine calls legal for this token.
    for (const id of Object.keys(layer.tokens ?? {})) assert.ok(studio.describe(view, id).operations.some((o) => o.op === 'revert to inherited'));
  });
}

test('"Every token" offers only legal operations, with what follows a token and who set it', () => {
  const view = studio.preview(groupsLayer('m3-like'));
  const ops = (id) => studio.describe(view, id).operations.map((o) => o.op);
  assert.deepEqual(ops(`${NS}.dial.type.base`), ['set the dial', 'revert to inherited']);
  assert.ok(!ops(`${NS}.sys.shape.corner.full`).includes('scale'), 'a fixed value cannot be scaled');
  assert.ok(ops(`${NS}.comp.button.filled.hovered.container.color`).includes('pattern rule'));
  assert.ok(ops(`${NS}.sys.color.primary`).includes('change the palette'));

  const base = studio.describe(view, `${NS}.dial.type.base`);
  assert.equal(base.setBy.layer, 'studio-m3-like');
  assert.ok(base.followers.includes(`${NS}.sys.typescale.body-large`) && base.followers.length > 20);
  const hovered = studio.describe(view, `${NS}.comp.button.filled.hovered.container.color`);
  assert.deepEqual([hovered.setBy.how, typeof hovered.setBy.match], ['rules', 'string']);
  assert.equal(Object.keys(hovered.schemes).length, 6);
  assert.notEqual(hovered.schemes.light.hex, hovered.schemes.dark.hex);
  assert.match(hovered.token.llm.usage, /Button/);
  assert.equal(studio.describe(view, `${NS}.comp.button.container.height.large`).descriptor.axis.id, `${NS}.comp.button.size`);
  assert.equal(studio.describe(view, `${NS}.sys.shape.corner.small`).setBy.layer, 'm3-like');

  const targets = studio.aliasTargets(view, `${NS}.comp.button.container.gap.medium`);
  assert.ok(targets.includes(`${NS}.sys.space.space50`) && !targets.includes(`${NS}.comp.button.container.gap.medium`) && targets.every((id) => view.model.tokens[id].type === 'dimension'));
  assert.equal(studio.rows(view).length, Object.keys(view.model.tokens).length);
});

// ── every extension kind ────────────────────────────────────────────────────────────
const EXTENSIONS = {
  'a step in a series (a coefficient on the dial)': { vocabulary: { [`${NS}.sys.space.space1200`]: { $type: 'dimension', rationale: 'Hero sections need a 96px rhythm step.', derive: { fn: 'mul', of: `{${NS}.dial.space.unit}`, by: 12 } } } },
  'a step in a series (an alias)': { vocabulary: { [`${NS}.sys.shape.corner.card`]: { $type: 'dimension', rationale: 'Cards have their own corner name.', $value: `{${NS}.sys.shape.corner.large}` } } },
  'a step in a series (a literal with a reason)': { vocabulary: { [`${NS}.sys.motion.duration.toast`]: { $type: 'duration', rationale: 'Toasts stay for a contractual time.', $value: { value: 4000, unit: 'ms' }, reason: 'Four seconds, by the accessibility review.' } } },
  'a color role with its onRole': { vocabulary: { [`${NS}.sys.color.brand-glow`]: { $type: 'color', rationale: 'The glow behind the hero artwork.', derive: { fn: 'tone', palette: 'accent', tone: { light: [80], dark: [30] } }, onRole: `${NS}.sys.color.on-surface` } } },
  'a size, with one member overridden': { vocabulary: { [`${NS}.comp.button.size.3x`]: { from: 'large', scale: 1.5, rationale: 'A hero call-to-action on the landing screen.' } }, tokens: { [`${NS}.comp.button.container.padding-block.3x`]: { $value: `{${NS}.sys.space.space200}` } } },
  'a variant, with its resting colors': { vocabulary: { [`${NS}.comp.button.variant.danger`]: { from: 'filled', rationale: 'Destructive confirmation is a distinct emphasis.' } }, tokens: { [`${NS}.comp.button.danger.container.color`]: { $value: `{${NS}.sys.color.error}` }, [`${NS}.comp.button.danger.label.color`]: { $value: `{${NS}.sys.color.on-error}` } } },
  'own tokens in the layer’s namespace': { vocabulary: { 'studio-extension.comp.rating.star.size': { $type: 'dimension', rationale: 'The rating component’s star.', derive: { fn: 'mul', of: `{${NS}.dial.size.unit}`, by: 5 } }, 'studio-extension.comp.rating.star.color': { $type: 'color', rationale: 'The filled star.', $value: `{${NS}.sys.color.warning}` } } },
};
for (const [kind, fragment] of Object.entries(EXTENSIONS)) {
  test(`extension "${kind}": the exported layer builds to exactly what the Studio previewed`, async () => {
    const layer = extend({ ...studio.blank(), id: 'studio-extension' }, fragment);
    const { view } = await assertPreviewIsTheBuild(layer);
    for (const id of Object.keys(fragment.vocabulary)) {
      if (!('from' in fragment.vocabulary[id])) assert.ok(view.model.tokens[id], `${id} is a token of the system`);
      assert.deepEqual(studio.removeExtension(layer, id).vocabulary?.[id], undefined);
    }
    // Removing every declaration also removes the operations that only made sense with it.
    assert.deepEqual(Object.keys(fragment.vocabulary).reduce((l, id) => studio.removeExtension(l, id), layer), { id: 'studio-extension', extends: studio.defaultId });
  });
}

test('an added size is 84px tall, follows the dial, and shows up on its axis; an added variant is valued by the pattern rules', () => {
  let layer = extend({ ...studio.blank(), id: 'hero' }, EXTENSIONS['a size, with one member overridden']);
  layer = extend(layer, EXTENSIONS['a variant, with its resting colors']);
  const view = studio.preview(layer);
  assert.equal(view.valueOf(`${NS}.comp.button.container.height.3x`).value, 84, 'large (56 = 14 × the size unit) × 1.5');
  assert.deepEqual(view.model.components.button.axes.size.values, ['small', 'medium', 'large', '3x']);
  assert.ok(view.model.components.button.states.variants.includes('danger'));
  assert.equal(studio.preview(studio.setDial(layer, `${NS}.dial.size.unit`, 5)).valueOf(`${NS}.comp.button.container.height.3x`).value, 105, '14 × 5 × 1.5: the added size follows the dial its source follows');
  const hovered = studio.describe(view, `${NS}.comp.button.danger.hovered.container.color`);
  assert.equal(hovered.setBy.how, 'rules');
  assert.equal(hovered.token.alias ?? hovered.token.derive?.fn, 'mix');
  // The height invariant speaks up, live, when the default scale is wrong for the padding.
  // 84 holds a 20px line with 32 above and below exactly (space400), so that is not a warning; one step more is.
  const height3x = (w) => w.startsWith(`${NS}.comp.button.container.height.3x`);
  const exact = studio.preview(op(layer, `${NS}.comp.button.container.padding-block.3x`, { $value: `{${NS}.sys.space.space400}` }));
  assert.equal(exact.warnings.some(height3x), false, '2 × 32 + 20 = 84: the height holds its content');
  const tight = studio.preview(op(layer, `${NS}.comp.button.container.padding-block.3x`, { $value: `{${NS}.sys.space.space450}` }));
  assert.match(tight.warnings.find(height3x) ?? '', /84px cannot hold its content — 2 × padding-block \(36px\) \+ one label line = 92px/);
});

test('renaming the layer renames its own namespace with it, references included', async () => {
  let layer = extend({ ...studio.blank(), id: 'studio-extension' }, EXTENSIONS['own tokens in the layer’s namespace']);
  layer = extend(layer, { vocabulary: { 'studio-extension.comp.rating.gap': { $type: 'dimension', rationale: 'Distance between stars.', $value: '{studio-extension.comp.rating.star.size}' } } });
  layer = op(layer, 'studio-extension.comp.rating.star.size', { scale: 2 });
  const renamed = studio.setMeta(layer, { id: 'renamed' });
  assert.equal(renamed.problem, undefined);
  assert.deepEqual(Object.keys(renamed.layer.vocabulary), ['renamed.comp.rating.star.size', 'renamed.comp.rating.star.color', 'renamed.comp.rating.gap']);
  assert.equal(renamed.layer.vocabulary['renamed.comp.rating.gap'].$value, '{renamed.comp.rating.star.size}');
  assert.deepEqual(Object.keys(renamed.layer.tokens), ['renamed.comp.rating.star.size']);
  const { view } = await assertPreviewIsTheBuild(renamed.layer);
  assert.equal(view.valueOf('renamed.comp.rating.gap').value, 40);
  // A name that cannot be a namespace is refused while the layer owns tokens; without them any id may be typed.
  assert.equal(studio.setMeta(layer, { id: 'Not An Id' }).problem, 'own-namespace');
  assert.equal(studio.setMeta(layer, { id: NS }).problem, 'own-namespace');
  assert.equal(studio.setMeta(studio.blank(), { id: 'Not An Id' }).layer.id, 'Not An Id');
});

// ── nothing is kept on the side ────────────────────────────────────────────────────────────────
const docsExample = {
  id: 'acme',
  extends: 'tanrei',
  palettes: {
    brand: { description: 'Acme red is fixed by brand guidelines.', source: { seed: '#e60012' }, roles: 'intent' },
    correct: { description: 'A quiz marks right answers — neither success nor primary.', source: { seed: '#0f766e' }, roles: 'intent' },
  },
  tokens: {
    'tanrei.dial.type.base': { $value: { value: 17, unit: 'px' }, reason: "Our audience reads at arm's length." },
    'tanrei.comp.button.container.padding-inline-start.medium': { scale: 2 },
    'tanrei.comp.button.container.gap.medium': { $value: '{tanrei.sys.space.space50}' },
    'tanrei.sys.typescale.label-small': { $value: { fontSize: { value: 11, unit: 'px' } }, reason: 'Legal footnote size is contractual.' },
  },
};
const ROUND_TRIPS = { ...Object.fromEntries(Object.entries(shipped).map(([id, layer]) => [`tokens/systems/${id}.system.json`, layer])), 'the acme fixture': json('packages/tokens-build/test/fixtures/acme.system.json'), 'the design-systems page example': docsExample };
for (const [name, source] of Object.entries(ROUND_TRIPS)) {
  test(`round trip: ${name} — imported, re-written through every editor, exported: the same layer`, () => {
    let layer = studio.fromLayer(source);
    assert.deepEqual(layer, source);
    assert.notEqual(layer, source, 'the Studio edits a copy');
    const view = studio.preview(layer);
    assert.ok(view.model, `previewable: ${view.problems.join('; ')}`);

    // Every section the schema allows is something an editor reads and writes; writing back what it read changes nothing.
    layer = studio.setMeta(layer, { id: layer.id, name: layer.name, description: layer.description, specVersion: layer.specVersion, attribution: layer.attribution }).layer;
    if (layer.extends) {
      for (const dial of studio.dials(layer)) if (dial.changed) layer = studio.setDial(layer, dial.id, dial.value, dial.reason || undefined);
      for (const row of studio.paletteRows(layer)) if (row.changed && !row.dropped && row.source) layer = studio.setPalette(layer, row.name, { source: row.source, description: row.description });
      for (const row of studio.paletteRows(layer)) if (row.dropped) layer = studio.dropPalette(layer, row.name);
    }
    for (const [id, operation] of Object.entries(source.tokens ?? {})) layer = op(layer, id, operation);
    for (const [id, declaration] of Object.entries(source.vocabulary ?? {})) layer = studio.setDeclaration(layer, id, declaration).layer;
    if (source.rules) layer = studio.setRules(layer, studio.preview(layer).layer.rules);
    assert.deepEqual(layer, source);
    // …and every token the layer touches is a row of "Every token" with a description of how it may be edited.
    const rows = new Set(studio.rows(view).map((row) => row.id));
    for (const id of Object.keys(source.tokens ?? {})) assert.ok(rows.has(id) && studio.describe(view, id).written, id);
  });
}

test('import refuses what is not a layer on a shipped system', () => {
  assert.throws(() => studio.fromLayer({ id: 'x', extends: 'nope' }), /not a shipped system/);
  assert.throws(() => studio.fromLayer({ id: 'x' }), /extend a shipped system/);
  assert.throws(() => studio.fromLayer({ id: 'x', extends: 'tanrei', colours: {} }), /additional properties/);
  assert.throws(() => studio.fromLayer([]), /JSON object/);
});

test('a broken layer is reported with the engine’s own words, and never throws', () => {
  const view = studio.preview({ id: 'broken', extends: 'tanrei', tokens: { 'tanrei.sys.space.nope': { scale: 2 } } });
  assert.equal(view.ok, false);
  assert.match(view.problems.join('\n'), /tanrei\.sys\.space\.nope: unknown token .* declare it under "vocabulary"/);
  assert.match(studio.preview({ id: 'tanrei', extends: 'tanrei' }).problems.join('\n'), /shipped system/);
});

test('a contrast-pick on a role may choose a palette tone: the states that read the role read the tone it chose', async () => {
  // A role aliases its pick's winner. When the candidates are ref.palette tones, the per-state component colors
  // (the button's filled label, on on-primary) must follow that alias into the palette, not look for a role by its name.
  const start = studio.setPalette({ ...studio.blank('tanrei'), id: 'pick-tone' }, 'primary', { source: { seed: '#0f766e' } });
  const from = ['{tanrei.ref.palette.primary.10}', '{tanrei.ref.palette.primary.99}'];
  const result = studio.applyOperation(start, 'tanrei.sys.color.on-primary', { derive: { fn: 'contrast-pick', on: '{tanrei.sys.color.primary}', from } });
  assert.equal(result.problem, undefined);
  const view = studio.preview(result.layer);
  assert.deepEqual(view.problems, []);
  for (const tokens of Object.values(view.model.perScheme)) assert.ok(from.includes(`{${tokens['tanrei.sys.color.on-primary'].alias}}`), 'the role aliases one of the tones');
  await assertPreviewIsTheBuild(result.layer);
});

test('the sources the page bundles are the ones the resolver names', () => {
  const resolver = json('tokens/tanrei.resolver.json');
  const refs = Object.values(resolver.sets).flatMap((set) => set.sources.map((s) => s.$ref)).filter((ref) => !ref.startsWith('generated/'));
  // data.ts globs tokens/{dial,ref,sys,comp}/*.tokens.json; a source outside those folders would be missed.
  for (const ref of refs) assert.match(ref, /^(dial|ref|sys|comp)\/[^/]+\.tokens\.json$/);
  const onDisk = ['dial', 'ref', 'sys', 'comp'].flatMap((dir) => fs.readdirSync(path.join(repoRoot, 'tokens', dir)).filter((f) => f.endsWith('.tokens.json')).map((f) => `${dir}/${f}`));
  assert.deepEqual(onDisk.sort(), [...refs].sort());
});

test('the build is reachable from the helpers (guards the comparison itself)', async () => {
  const result = await build({ id: 'guard', extends: 'tanrei' });
  assert.ok(result.files.web['guard.css'].length > 10000 && result.files.tokens['sys/space.tokens.json']);
});
