// Groups "Typefaces", "Icons", "Shape", "Behaviour", the palette tone table and local parent layers.
// Same bar as studio.test.js: what these editors write is built with the real product pipeline and must equal what
// the Studio previewed — every declaration of the sheet, every document, every warning — and what they write is
// ordinary layer JSON that Every token and Source read and write back unchanged.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fontStack } from '@tanrei/tokens-build/ir';
import { GROUP_REASONS, MIN_REASON, stringifyLayer } from '../src/core.js';
import { composeStack, cssFontFamily, familyName, inferredGeneric, parseStack } from '../src/fonts.js';
import { assertPreviewIsTheBuild } from './helpers.js';
import { json, shipped, studio } from './studio-node.js';
import { leavesNothingBehind } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after); // helpers.build() removes its directory; the file fails if one stays

const NS = studio.namespace;
const acme = json('packages/tokens-build/test/fixtures/acme.system.json');
const blank = (extendsId = studio.rootId, id = 'studio-groups') => ({ ...studio.blank(extendsId), id });
const FACE = (key) => `${NS}.ref.typeface.${key}`;
const BEHAVIOR = (key) => `${NS}.sys.behavior.${key}`;
const SMOOTHING = `${NS}.sys.shape.corner-smoothing`;
const ICON = { family: FACE('icon'), unselected: `${NS}.sys.icon.family.unselected`, selected: `${NS}.sys.icon.family.selected`, weight: `${NS}.sys.icon.weight`, fillUnselected: `${NS}.sys.icon.fill.unselected`, fillSelected: `${NS}.sys.icon.fill.selected` };

/** Every fontFamily value that ships: the vocabulary's, every preset's, the fixture's. */
const shippedStacks = () => {
  const stacks = [];
  for (const { id } of studio.systems) for (const token of Object.values(studio.base(id).model.tokens)) if (token.type === 'fontFamily') stacks.push(token.value);
  for (const op of Object.values(acme.tokens)) if (Array.isArray(op.$value) && op.$value.every((name) => typeof name === 'string')) stacks.push(op.$value);
  return stacks;
};

// ── font stacks ────────────────────────────────────────────────────────────────────────────────
test('a font stack is read as the build reads it, and written back exactly as it was', () => {
  const stacks = shippedStacks();
  assert.ok(stacks.length >= 12);
  for (const stack of stacks) {
    const parsed = parseStack(stack);
    const ir = fontStack(stack);
    assert.deepEqual([parsed.families, inferredGeneric(parsed), parsed.system], [ir.families, ir.generic, ir.system], stack.join(', '));
    assert.deepEqual(composeStack(parsed), stack, 'nothing is lost, nothing is reordered');
  }
  // The platform switch: the platform's font moves to the front (and back), named families keep their order.
  const inter = parseStack(['Inter', 'Noto Sans JP', 'system-ui', 'sans-serif']);
  assert.deepEqual(composeStack({ ...inter, system: true }), ['system-ui', 'Inter', 'Noto Sans JP', 'sans-serif']);
  assert.deepEqual(composeStack({ families: ['Roboto Mono'], system: true, generic: 'monospace' }), ['ui-monospace', 'Roboto Mono', 'monospace'], 'the keyword follows the generic family');
  assert.deepEqual(composeStack({ families: [], keywords: [], system: true, generic: 'sans-serif' }), ['system-ui', 'sans-serif'], 'no named family at all');
  assert.deepEqual(composeStack({ ...parseStack(['-apple-system', 'BlinkMacSystemFont', 'Inter', 'sans-serif']), system: false }), ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']);
  assert.equal(cssFontFamily(['Noto Sans JP', 'system-ui', 'sans-serif']), '"Noto Sans JP", system-ui, sans-serif', 'as the CSS emitter writes it');
});

test('a family name is free text, but not a keyword, a list or a duplicate', () => {
  assert.deepEqual(familyName('  "IBM Plex  Sans" '), { name: 'IBM Plex Sans' });
  assert.deepEqual(familyName(''), { problem: 'empty' });
  assert.deepEqual(familyName('Inter, Roboto'), { problem: 'characters' });
  assert.deepEqual(familyName('system-ui'), { problem: 'keyword' });
  assert.deepEqual(familyName('Sans-Serif'), { problem: 'keyword' });
  assert.deepEqual(familyName('inter', ['Inter']), { problem: 'duplicate' });
});

// ── the four groups write ordinary operations, and the build agrees ─────────────────────────────
/** What a visitor does in the four groups, on any base. */
function systemGroupsLayer(extendsId) {
  let layer = blank(extendsId, `studio-system-${extendsId}`);
  layer = studio.setTypeface(layer, 'brand', { families: ['IBM Plex Sans', 'Noto Sans JP'], keywords: ['system-ui'], system: false, generic: 'sans-serif' }, 'Our brand typeface since 2021.');
  layer = studio.setTypeface(layer, 'plain', { families: ['Source Sans 3'], keywords: [], system: true, generic: 'sans-serif' });
  layer = studio.setTypeface(layer, 'mono', ['ui-monospace', 'IBM Plex Mono', 'monospace']);
  layer = studio.setIconSet(layer, { mode: 'static' });
  layer = studio.setIconSet(layer, { unselected: ['Material Icons Outlined'], selected: ['Material Icons'], weight: 500, fillUnselected: 0.25 });
  layer = studio.setCornerSmoothing(layer, 0.8);
  for (const choice of studio.behaviors(layer)) layer = studio.setBehavior(layer, choice.id, choice.values.at(-1));
  return layer;
}

for (const { id: extendsId } of studio.systems) {
  test(`Typefaces, Icons, Shape and Behaviour on "${extendsId}": the exported layer builds to exactly what the Studio previewed`, async () => {
    const layer = systemGroupsLayer(extendsId);
    // Ordinary operations, nothing else: `tokens: { id: { $value, reason } }`.
    assert.deepEqual(Object.keys(layer), ['id', 'extends', 'tokens']);
    for (const [id, op] of Object.entries(layer.tokens)) {
      assert.deepEqual(Object.keys(op), ['$value', 'reason'], id);
      assert.ok(op.reason.length >= MIN_REASON, id);
    }
    assert.deepEqual(layer.tokens[FACE('brand')], { $value: ['IBM Plex Sans', 'Noto Sans JP', 'system-ui', 'sans-serif'], reason: 'Our brand typeface since 2021.' });
    assert.deepEqual(layer.tokens[FACE('plain')].$value, ['system-ui', 'Source Sans 3', 'sans-serif']);
    assert.deepEqual(layer.tokens[ICON.selected], { $value: ['Material Icons'], reason: GROUP_REASONS.icons });
    assert.deepEqual(layer.tokens[BEHAVIOR('pressed-feedback')], { $value: 3, reason: GROUP_REASONS.behavior }, 'the layer stores the index');
    assert.deepEqual(layer.tokens[SMOOTHING], { $value: 0.8, reason: GROUP_REASONS.shape }, 'corner smoothing is an amount');

    const { view, result } = await assertPreviewIsTheBuild(layer);
    const sheet = result.files.web[`${layer.id}.css`];
    assert.match(sheet, /--tanrei-ref-typeface-brand: "IBM Plex Sans", "Noto Sans JP", system-ui, sans-serif;/);
    assert.match(sheet, /--tanrei-ref-typeface-mono: ui-monospace, "IBM Plex Mono", monospace;/);
    assert.match(sheet, /--tanrei-sys-icon-family-unselected: "Material Icons Outlined";/);
    assert.match(sheet, /--tanrei-sys-icon-family-selected: "Material Icons";/);
    assert.match(sheet, /--tanrei-sys-icon-weight: 500;/);
    // CSS gets the NAME (the web components read it); the layer and the token bundle keep the index.
    assert.match(sheet, /--tanrei-sys-behavior-pressed-feedback: none;/);
    assert.match(sheet, /--tanrei-sys-behavior-focus-style: glow;/);
    assert.match(sheet, /--tanrei-sys-shape-corner-smoothing: 0\.8;/);
    assert.equal(result.files.tokens['sys/behavior.tokens.json'][NS].sys.behavior['pressed-feedback'].$value, 3);
    assert.equal(result.files.tokens['sys/shape.tokens.json'][NS].sys.shape['corner-smoothing'].$value, 0.8);
    // The typescale follows its typeface: a text style's font-family is the variable of the stack it reads.
    assert.deepEqual(view.valueOf(`${NS}.sys.typescale.body`).fontFamily, ['system-ui', 'Source Sans 3', 'sans-serif']);

    // What the groups read back is what they wrote…
    assert.deepEqual(studio.typefaces(layer).map((face) => [face.key, face.families, face.system, face.generic, face.changed]), [
      ['brand', ['IBM Plex Sans', 'Noto Sans JP'], false, 'sans-serif', true],
      ['plain', ['Source Sans 3'], true, 'sans-serif', true],
      ['mono', ['IBM Plex Mono'], true, 'monospace', true],
    ]);
    const icons = studio.iconSet(layer);
    assert.deepEqual([icons.mode, icons.unselected, icons.selected, icons.weight, icons.fillUnselected], ['static', ['Material Icons Outlined'], ['Material Icons'], 500, 0.25]);
    assert.deepEqual(studio.behaviors(layer).map((choice) => [choice.key, choice.value]), [['pressed-feedback', 'none'], ['focus-style', 'glow'], ['separation', 'gap'], ['link-underline', 'never'], ['requirement-mark', 'none'], ['divider-visibility', 'scroll'], ['scroll-edge', 'blur'], ['appearance', 'unfold']]);
    assert.deepEqual([studio.cornerSmoothing(layer).value, studio.cornerSmoothing(layer).changed], [0.8, true]);

    // …Every token shows the same entries and may write them back unchanged (the editor's own path)…
    let again = layer;
    for (const [id, op] of Object.entries(layer.tokens)) {
      const described = studio.describe(view, id);
      assert.deepEqual(described.written, op, id);
      // The engine names a literal by what it is: a choice of kind is chosen, a typeface is set, anything else is pinned.
      const literal = described.token.enum ? 'choose' : described.token.type === 'fontFamily' ? 'set the font stack' : 'pin $value';
      assert.ok(described.operations.some((o) => o.op === literal), `${id}: "${literal}" is a legal operation`);
      again = studio.applyOperation(again, id, op).layer;
    }
    assert.deepEqual(again, layer);
    // …and so does Source: the file's text, parsed, imported, re-written through the three groups — the same layer.
    let round = studio.fromLayer(JSON.parse(stringifyLayer(layer)));
    for (const face of studio.typefaces(round)) round = studio.setTypeface(round, face.key, face);
    const now = studio.iconSet(round);
    round = studio.setIconSet(round, { mode: now.mode, family: now.family, unselected: now.unselected, selected: now.selected, weight: now.weight, fillUnselected: now.fillUnselected, fillSelected: now.fillSelected });
    round = studio.setCornerSmoothing(round, studio.cornerSmoothing(round).value);
    for (const choice of studio.behaviors(round)) round = studio.setBehavior(round, choice.id, choice.value);
    assert.deepEqual(round, layer);

    // Back to what the base says: nothing is left behind.
    const reset = ['typefaces', 'icons', 'shape', 'behavior'].reduce((l, group) => studio.resetGroup(l, group), layer);
    assert.deepEqual(reset, blank(extendsId, layer.id));
  });
}

test('a variable icon family: one pin on ref.typeface.icon, and both state families follow it', async () => {
  let layer = studio.setIconSet(blank(), { family: ['Material Symbols Sharp'], weight: 400, fillSelected: 0.8 });
  assert.deepEqual(Object.keys(layer.tokens), [ICON.family, ICON.weight, ICON.fillSelected]);
  assert.equal(studio.iconSet(layer).mode, 'variable');
  const { view } = await assertPreviewIsTheBuild(layer);
  for (const state of ['unselected', 'selected']) {
    assert.deepEqual(view.valueOf(ICON[state]), ['Material Symbols Sharp']);
    assert.equal(view.model.tokens[ICON[state]].alias, ICON.family, `${state} is still an alias of the one family`);
  }
  // Two static families, then one again: the two pins go and the aliases are the base's again — nothing is written for them.
  const staticSet = studio.setIconSet(layer, { mode: 'static' });
  assert.deepEqual(staticSet.tokens[ICON.unselected], { $value: ['Material Symbols Sharp'], reason: GROUP_REASONS.icons }, 'starts from what both states show now');
  assert.equal(studio.iconSet(staticSet).mode, 'static');
  assert.deepEqual(studio.setIconSet(staticSet, { mode: 'variable' }), layer);
  // A family per state is only written in the static mode.
  assert.deepEqual(studio.setIconSet(layer, { selected: ['Material Icons'] }), layer);
});

test('under a base that draws a static icon set, "one variable family" re-points both families', async () => {
  // A product's own base layer with a static set (the acme fixture's choice), and a layer on top of it.
  const base = { id: 'house', extends: studio.rootId, tokens: { [ICON.unselected]: acme.tokens[ICON.unselected], [ICON.selected]: acme.tokens[ICON.selected] } };
  assert.ok(base.tokens[ICON.unselected] && base.tokens[ICON.selected], 'the fixture values a family per state');
  studio.setParents([{ id: 'house', layer: base }]);
  try {
    let layer = { id: 'house-app', extends: 'house' };
    assert.equal(studio.iconSet(layer).mode, 'static');
    layer = studio.setIconSet(layer, { mode: 'variable' });
    assert.deepEqual(layer.tokens, { [ICON.unselected]: { $value: `{${ICON.family}}` }, [ICON.selected]: { $value: `{${ICON.family}}` } });
    assert.equal(studio.iconSet(layer).mode, 'variable');
    await assertPreviewIsTheBuild(layer, { parents: [base] });
  } finally {
    studio.setParents([]);
  }
});

test('one reason per group: prefilled, editable, never shorter than the schema allows', () => {
  let layer = studio.setBehavior(blank(), BEHAVIOR('pressed-feedback'), 'ripple');
  assert.equal(studio.groupReason(layer, 'behavior'), GROUP_REASONS.behavior);
  // The person's wording reaches every pin the group wrote…
  layer = studio.setBehavior(layer, BEHAVIOR('focus-style'), 'glow');
  layer = studio.setGroupReason(layer, 'behavior', 'Matches our native apps.');
  assert.deepEqual(Object.values(layer.tokens).map((op) => op.reason), ['Matches our native apps.', 'Matches our native apps.']);
  assert.equal(studio.groupReason(layer, 'behavior'), 'Matches our native apps.');
  // …and the next pin of the group takes it, without being told.
  layer = studio.setBehavior(studio.applyOperation(layer, BEHAVIOR('focus-style'), null).layer, BEHAVIOR('focus-style'), 'glow');
  assert.equal(layer.tokens[BEHAVIOR('focus-style')].reason, 'Matches our native apps.');
  // Too short: nothing changes (the schema would refuse the file).
  assert.deepEqual(studio.setGroupReason(layer, 'behavior', 'short'), layer);
  // A pin that was given its own reason elsewhere (Every token, Source) keeps it.
  const own = studio.applyOperation(layer, BEHAVIOR('focus-style'), { $value: 1, reason: 'The halo is part of our brand.' }).layer;
  const reworded = studio.setGroupReason(own, 'behavior', 'Platform conventions.');
  assert.equal(reworded.tokens[BEHAVIOR('focus-style')].reason, 'The halo is part of our brand.');
  assert.equal(reworded.tokens[BEHAVIOR('pressed-feedback')].reason, 'Platform conventions.');
  // Changing the value keeps the reason the pin already has.
  assert.equal(studio.setBehavior(own, BEHAVIOR('focus-style'), 'ring').tokens?.[BEHAVIOR('focus-style')], undefined, 'back to the base value: the entry goes');
  assert.equal(studio.setTypeface(studio.setTypeface(blank(), 'brand', ['Roboto', 'sans-serif'], 'Licensed for this product.'), 'brand', ['Roboto', 'serif']).tokens[FACE('brand')].reason, 'Licensed for this product.');
});

test('a choice of kind is picked by name; an index outside its names is a problem the Studio reports', () => {
  const layer = blank();
  assert.deepEqual(studio.behaviors(layer).map((choice) => [choice.key, choice.values, choice.value, choice.changed]), [
    ['pressed-feedback', ['overlay', 'ripple', 'dim', 'none'], 'overlay', false],
    ['focus-style', ['ring', 'glow'], 'ring', false],
    // The third choice of kind: the group lists every choice under sys.behavior, so it shows without a change to the Studio.
    ['separation', ['divider', 'gap'], 'divider', false],
    // The fourth, when a text link draws its underline: it arrived with the link and showed here the same way.
    ['link-underline', ['always', 'hover', 'never'], 'always', false],
    // The fifth, how a required control is marked beside its label: the one choice every form follows.
    ['requirement-mark', ['tag', 'asterisk', 'none'], 'tag', false],
    // The sixth, when the edge of a region that stays in place is drawn: at rest, or only once content scrolls past it.
    ['divider-visibility', ['always', 'scroll'], 'always', false],
    // The seventh, what marks the edge of a box that scrolls while content lies beyond it.
    ['scroll-edge', ['shadow', 'fade', 'line', 'blur'], 'shadow', false],
    // The eighth, how a surface appears: it sets where every surface that appears starts from.
    ['appearance', ['fade-scale', 'fade', 'fade-slide', 'blur-slide', 'unfold'], 'fade-scale', false],
  ]);
  for (const choice of studio.behaviors(layer)) assert.ok(choice.description.length > 40, `${choice.key} explains its names`);
  assert.deepEqual(studio.behaviors(blank('cupertino')).map((choice) => choice.value), ['dim', 'ring', 'divider', 'always', 'none', 'scroll', 'blur', 'fade-scale'],'a preset’s choices are what a layer on it inherits');
  assert.deepEqual(studio.behaviors(blank('m3-like')).map((choice) => choice.value), ['ripple', 'ring', 'gap', 'always', 'asterisk', 'scroll', 'line', 'unfold'],'and a preset that parts its joined pieces with space says so');
  assert.deepEqual(studio.setBehavior(layer, BEHAVIOR('pressed-feedback'), 'sparkle'), layer, 'a layer chooses among the names; it does not add one');
  // Every token: the token carries its names, so the editor can offer a name picker instead of a number field.
  const view = studio.preview(studio.setBehavior(layer, BEHAVIOR('pressed-feedback'), 'dim'));
  const described = studio.describe(view, BEHAVIOR('pressed-feedback'));
  assert.deepEqual([described.token.enum.values[described.token.value], described.token.type], ['dim', 'number']);
  assert.deepEqual(described.operations.map((o) => [o.op, o.choices, o.current]), [['choose', ['overlay', 'ripple', 'dim', 'none'], 'dim'], ['revert to inherited', undefined, undefined]]);
  // The engine also takes the NAME as `$value` (typed in Source): the group reads it, and re-choosing it rewrites nothing.
  const byName = { ...layer, tokens: { [BEHAVIOR('focus-style')]: { $value: 'glow', reason: 'Typed by name in Source.' } } };
  assert.deepEqual(studio.preview(byName).problems, []);
  assert.equal(studio.behaviors(byName).find((choice) => choice.key === 'focus-style').value, 'glow');
  assert.deepEqual(studio.setBehavior(byName, BEHAVIOR('focus-style'), 'glow'), byName);
  assert.deepEqual(studio.setBehavior(byName, BEHAVIOR('focus-style'), 'ring'), layer);
  // Source can write any number; the engine refuses an index without a name, and the Studio shows its words.
  const broken = studio.preview({ ...layer, tokens: { [BEHAVIOR('focus-style')]: { $value: 7, reason: 'Typed by hand in Source.' } } });
  assert.equal(broken.ok, false);
  assert.match(broken.problems.join('\n'), /tanrei\.sys\.behavior\.focus-style: 7 is not one of its choices .*"ring" \(0\), "glow" \(1\)/);
});

test('corner smoothing is an amount: 0–1 with Figma’s meaning, cupertino at 0.6, the base’s own amount writes nothing', async () => {
  const layer = blank();
  assert.deepEqual([studio.cornerSmoothing(layer).value, studio.cornerSmoothing(layer).base, studio.cornerSmoothing(layer).changed], [0, 0, false]);
  assert.match(studio.cornerSmoothing(layer).description, /0\.6 is the iOS continuous corner/, 'the token explains its numbers');
  assert.equal(studio.cornerSmoothing(blank('cupertino')).value, 0.6, 'a preset’s amount is what a layer on it inherits');
  const ios = studio.setCornerSmoothing(layer, 0.6, 'Matches our native apps.');
  assert.deepEqual(ios.tokens, { [SMOOTHING]: { $value: 0.6, reason: 'Matches our native apps.' } });
  assert.deepEqual([studio.cornerSmoothing(ios).value, studio.cornerSmoothing(ios).changed, studio.cornerSmoothing(ios).reason], [0.6, true, 'Matches our native apps.']);
  const { view, result } = await assertPreviewIsTheBuild({ ...ios, id: 'studio-smoothing' });
  assert.equal(view.valueOf(SMOOTHING), 0.6);
  assert.match(result.files.web['studio-smoothing.css'], /--tanrei-sys-shape-corner-smoothing: 0\.6;/);
  // Back to the base's amount: the entry goes. Outside 0–1, or not a number: nothing is written.
  assert.deepEqual(studio.setCornerSmoothing(ios, 0), layer);
  assert.deepEqual(studio.setCornerSmoothing(blank('cupertino'), 0.6), blank('cupertino'));
  for (const bad of [-0.1, 1.5, Number.NaN, '0.6', undefined]) assert.deepEqual(studio.setCornerSmoothing(layer, bad), layer);
  // Every token shows the same entry, and pinning it there is the same operation.
  assert.deepEqual(studio.describe(studio.preview(ios), SMOOTHING).written, ios.tokens[SMOOTHING]);
  assert.deepEqual(studio.applyOperation(layer, SMOOTHING, { $value: 0.6, reason: 'Matches our native apps.' }).layer, ios);
  // No amount is a choice of kind: Behaviour never lists it.
  assert.ok(!studio.behaviors(layer).some((choice) => choice.id === SMOOTHING));
});

test('emphasis is a weight step per family: the four numbers a layer resolves, and which family a role takes', async () => {
  const { emphasisFamily } = await import('../src/core.js');
  assert.deepEqual(studio.typeEmphasis(blank()), { display: 100, heading: 100, body: 100, label: 100 });
  assert.deepEqual(studio.typeEmphasis(blank('m3-like')), { display: 100, heading: 100, body: 100, label: 200 }, 'Material adds 200 to labels');
  assert.deepEqual(studio.typeEmphasis(blank('cupertino')), { display: 100, heading: 200, body: 200, label: 200 });
  const heavier = studio.applyOperation(blank(), `${NS}.sys.typescale.emphasis.heading`, { $value: 300, reason: 'Our headings jump a whole class when stressed.' }).layer;
  assert.equal(studio.typeEmphasis(heavier).heading, 300);
  assert.deepEqual(['display', 'heading-1', 'heading-6', 'body-large', 'body', 'body-small', 'label', 'label-small', 'caption', 'code', 'code-small', 'eyebrow', 'body-callout'].map(emphasisFamily), ['display', 'heading', 'heading', 'body', 'body', 'body', 'label', 'label', 'label', 'label', 'label', 'label', 'body']);
});

test('a choice that draws nothing: the hint next to the control is the BUILD’s warning, not a second opinion', () => {
  // src/ui/system.ts shows, under a behaviour's control, the warnings that start with the choice's id (without the
  // namespace) and turns the token ids they name into links. This pins both halves of that contract.
  const about = (view, key) => view.warnings.filter((warning) => warning.startsWith(`sys.behavior.${key} `));
  const opacity = `${NS}.comp.button.pressed.opacity`;
  const dim = studio.setBehavior(blank(), BEHAVIOR('pressed-feedback'), 'dim');
  const said = about(studio.preview(dim), 'pressed-feedback');
  assert.equal(said.length, 1, 'the default system draws every pressed control at opacity 1');
  assert.match(said[0], /a press would show nothing/);
  assert.ok(said[0].match(new RegExp(`${NS}\\.[a-z0-9.-]*[a-z0-9]`, 'g')).includes(opacity), 'the warning names the token to change, by its full id');
  assert.ok(opacity in studio.preview(dim).model.tokens);
  assert.deepEqual(about(studio.preview(blank()), 'pressed-feedback'), [], 'overlay: nothing to say');
  assert.deepEqual(about(studio.preview(studio.applyOperation(dim, opacity, { $value: 0.6, reason: 'Dim on press, like our native apps.' }).layer), 'pressed-feedback'), [], 'a pressed opacity below 1: nothing to say');
  assert.deepEqual(about(studio.preview(blank('cupertino')), 'pressed-feedback'), [], 'cupertino chooses dim AND a pressed opacity');
});

test('the four groups, untouched, write nothing — on every base', () => {
  for (const { id } of studio.systems) {
    let layer = studio.blank(id);
    for (const face of studio.typefaces(layer)) layer = studio.setTypeface(layer, face.key, face);
    const icons = studio.iconSet(layer);
    layer = studio.setIconSet(layer, { mode: icons.mode, family: icons.family, weight: icons.weight, fillUnselected: icons.fillUnselected, fillSelected: icons.fillSelected });
    layer = studio.setCornerSmoothing(layer, studio.cornerSmoothing(layer).value);
    for (const choice of studio.behaviors(layer)) layer = studio.setBehavior(layer, choice.id, choice.value);
    for (const group of ['typefaces', 'icons', 'shape', 'behavior']) layer = studio.setGroupReason(layer, group, 'A reason nobody needs yet.');
    assert.deepEqual(layer, { id: 'acme', extends: id });
  }
});

for (const [name, source] of Object.entries({ ...Object.fromEntries(Object.entries(shipped).filter(([, layer]) => layer.extends).map(([id, layer]) => [`tokens/systems/${id}.system.json`, layer])), 'the acme fixture': acme })) {
  test(`round trip: ${name} through Typefaces, Icons, Shape and Behaviour: the same layer`, () => {
    let layer = studio.fromLayer(source);
    for (const face of studio.typefaces(layer)) layer = studio.setTypeface(layer, face.key, face);
    const icons = studio.iconSet(layer);
    layer = studio.setIconSet(layer, { mode: icons.mode, family: icons.family, unselected: icons.unselected, selected: icons.selected, weight: icons.weight, fillUnselected: icons.fillUnselected, fillSelected: icons.fillSelected });
    layer = studio.setCornerSmoothing(layer, studio.cornerSmoothing(layer).value);
    for (const choice of studio.behaviors(layer)) layer = studio.setBehavior(layer, choice.id, choice.value);
    assert.deepEqual(layer, source);
  });
}

// ── fixed tones ────────────────────────────────────────────────────────────────────────────────
test('the tone table: add, edit and remove a fixed tone — the build agrees, and Source shows the same table', async () => {
  let layer = studio.setPalette(blank(studio.rootId, 'studio-tone-table'), 'primary', { source: { seed: '#e60012' } });
  assert.deepEqual(studio.paletteTones(layer, 'primary'), []);
  const generated = studio.generatedTone(layer, 'primary', 40);
  assert.match(generated, /^#[0-9a-f]{6}$/);
  // A new row starts as the generated color: nothing moves.
  const before = studio.preview(layer).model.colors.light.primary.value.hex;
  layer = studio.setPaletteTones(layer, 'primary', { 40: generated });
  assert.equal(studio.preview(layer).model.colors.light.primary.value.hex, before);
  // Edit it, add another; rows come back ascending whatever the order they were typed in.
  layer = studio.setPaletteTones(layer, 'primary', { 80: '#ffb4a8', 40: '#e60012' });
  assert.deepEqual(layer.palettes.primary.source, { seed: '#e60012', tones: { 40: '#e60012', 80: '#ffb4a8' } });
  assert.deepEqual(studio.paletteTones(layer, 'primary'), [{ tone: 40, hex: '#e60012' }, { tone: 80, hex: '#ffb4a8' }]);
  assert.equal(studio.paletteRows(layer).find((row) => row.name === 'primary').tones, 2);
  const { view } = await assertPreviewIsTheBuild(layer);
  assert.equal(view.valueOf(`${NS}.ref.palette.primary.40`).hex, '#e60012', 'the fixed tone IS the tone');
  // Source round trip: the same table, read from the file's text.
  assert.deepEqual(studio.paletteTones(studio.fromLayer(JSON.parse(stringifyLayer(layer))), 'primary'), studio.paletteTones(layer, 'primary'));
  // What is not a tone → hex is refused whole.
  for (const bad of [{ 101: '#ffffff' }, { 4.5: '#ffffff' }, { 40: 'red' }, { '-1': '#ffffff' }]) assert.deepEqual(studio.setPaletteTones(layer, 'primary', bad), layer);
  // Removing rows one by one; the last removal removes `tones` itself (the schema wants at least one entry).
  layer = studio.setPaletteTones(layer, 'primary', { 80: '#ffb4a8' });
  layer = studio.setPaletteTones(layer, 'primary', {});
  assert.deepEqual(layer.palettes.primary, { source: { seed: '#e60012' } });
  assert.deepEqual(studio.preview(layer).problems, []);
});

test('the tone table of an inherited palette: m3-like’s published tones are rows; editing one re-declares the palette whole', async () => {
  const layer = blank('m3-like', 'studio-m3-tones');
  const inherited = shipped['m3-like'].palettes.primary.source;
  const rows = studio.paletteTones(layer, 'primary');
  assert.deepEqual(Object.fromEntries(rows.map((row) => [row.tone, row.hex])), inherited.tones);
  // Writing back what was read writes nothing.
  assert.deepEqual(studio.setPaletteTones(layer, 'primary', inherited.tones), layer);
  const edited = studio.setPaletteTones(layer, 'primary', { ...inherited.tones, 40: '#5b3fa8' });
  assert.deepEqual(edited.palettes.primary.source, { ...inherited, tones: { ...inherited.tones, 40: '#5b3fa8' } });
  await assertPreviewIsTheBuild(edited);
  // Removing every published tone is a change too (the base has them), and it is written as the bare color.
  const bare = studio.setPaletteTones(layer, 'primary', {});
  assert.deepEqual(bare.palettes.primary.source, { seed: inherited.seed });
  await assertPreviewIsTheBuild(bare);
  // A hue + chroma palette has a tone table as well.
  const neutral = studio.setPaletteTones(blank(), 'neutral', { 98: '#fbf9f4' });
  assert.deepEqual(neutral.palettes.neutral.source.tones, { 98: '#fbf9f4' });
  assert.ok('hue' in neutral.palettes.neutral.source);
  await assertPreviewIsTheBuild({ ...neutral, id: 'studio-neutral-tones' });
});

// ── local parent layers ────────────────────────────────────────────────────────────────────────
test('a layer that extends another LOCAL layer: the Studio resolves the chain the host handed over, and the build agrees', async () => {
  const house = { id: 'house', name: 'House style', extends: 'm3-like', tokens: { [`${NS}.dial.shape.unit`]: { $value: { value: 2, unit: 'px' }, reason: 'Sharper corners across every product.' }, [BEHAVIOR('focus-style')]: { $value: 1, reason: 'The halo is part of our brand.' } }, vocabulary: { [`${NS}.sys.space.space1200`]: { $type: 'dimension', rationale: 'Hero sections need a 96px rhythm step.', derive: { fn: 'mul', of: `{${NS}.dial.space.unit}`, by: 12 } } } };
  const app = { id: 'house-app', extends: 'house', tokens: { [`${NS}.comp.button.container.gap.medium`]: { $value: `{${NS}.sys.space.space1200}` } } };

  // Without the parent the Studio cannot know it — and says so, as before.
  assert.throws(() => studio.fromLayer(app), /"extends": "house" is not a shipped system/);
  assert.equal(studio.preview(app).ok, false);

  studio.setParents([{ id: 'house', layer: house }]);
  try {
    assert.deepEqual(studio.systems.filter((system) => system.local), [{ id: 'house', name: 'House style', description: '', local: true }]);
    assert.deepEqual(studio.fromLayer(app), app);
    const { view } = await assertPreviewIsTheBuild(app, { parents: [house] });
    assert.deepEqual(view.chain.map((layer) => layer.id), [studio.rootId, 'm3-like', 'house', 'house-app']);
    assert.equal(view.valueOf(`${NS}.dial.shape.unit`).value, 2, 'the local parent’s dial');
    assert.equal(view.valueOf(`${NS}.comp.button.container.gap.medium`).value, 96, 'a step the local parent added to the vocabulary');
    assert.equal(studio.describe(view, `${NS}.dial.shape.unit`).setBy.layer, 'house');
    // The groups read what the local parent says, and an edit on top of it is an ordinary operation.
    assert.deepEqual(studio.behaviors(app).map((choice) => choice.value), ['ripple', 'glow', 'gap', 'always', 'asterisk', 'scroll', 'line', 'unfold'], 'the press, the separation, the requirement mark, the divider visibility, the scroll edge and the appearance are m3-like’s, the focus style is the local parent’s, the underline the default system’s');
    assert.equal(studio.setBehavior(app, BEHAVIOR('focus-style'), 'glow').tokens[BEHAVIOR('focus-style')], undefined, 'what the local base already says writes nothing');
    const edited = studio.setDial(studio.setBehavior(app, BEHAVIOR('focus-style'), 'ring'), `${NS}.dial.type.base`, 17);
    await assertPreviewIsTheBuild(edited, { parents: [house] });
    // The parent is read-only and its id is taken.
    assert.match(studio.preview({ ...app, id: 'house' }).problems.join('\n'), /one of the layers next to this file/);
  } finally {
    studio.setParents([]);
  }
  assert.deepEqual(studio.systems.filter((system) => system.local), []);
  assert.equal(studio.preview(app).ok, false, 'parents are replaced, not accumulated');

  // A local file cannot stand in for a shipped system, and a broken parent does not take the Studio down.
  studio.setParents([{ id: 'm3-like', layer: { id: 'm3-like', extends: studio.rootId } }, { id: 'broken', layer: { id: 'broken', extends: 'nowhere' } }, { id: 'Not An Id', layer: { id: 'Not An Id' } }]);
  try {
    assert.deepEqual(studio.systems.filter((system) => system.local).map((system) => system.id), ['broken']);
    assert.deepEqual(studio.base('m3-like').chain.map((layer) => layer.id), [studio.rootId, 'm3-like']);
    assert.ok(Object.keys(studio.base('m3-like').system.tokens).length > 10, 'the shipped m3-like, not the local impostor');
    const orphan = studio.preview({ id: 'orphan', extends: 'broken' });
    assert.equal(orphan.ok, false);
    assert.match(orphan.problems.join('\n'), /"extends": "nowhere" is not a shipped system/);
    assert.ok(studio.dials({ id: 'orphan', extends: 'broken' }).length > 0, 'the controls still draw, from the root');
  } finally {
    studio.setParents([]);
  }
});
