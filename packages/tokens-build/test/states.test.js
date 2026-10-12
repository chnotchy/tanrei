// Per-state tokens: one vocabulary, and the style of interaction feedback is a system's VALUE choice.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expandStateVocabulary, mergeLayers, mixColors, operationFor, resolveNumericTokens } from '@tanrei/token-engine';
import { REPO_ROOT } from '../src/model.js';
import { generateSchemeFiles, loadSystem, sourceFiles } from '../src/scheme.js';

const sources = sourceFiles(REPO_ROOT);
const root = loadSystem(REPO_ROOT);
const build = (...layers) => {
  const system = mergeLayers([root, ...layers]);
  const files = generateSchemeFiles(system, REPO_ROOT, resolveNumericTokens(sources, system));
  return (scheme) => files[`comp.states.${scheme}.tokens.json`].tanrei.comp.button;
};
const hex = (token) => token.$value.hex + (token.$value.alpha !== undefined ? `@${token.$value.alpha}` : '');

test('Button declares 6 variants × 4 states × 6 parts (the state-layer color), the five colors again for each toggle condition, plus an opacity and a shape per state', () => {
  const ids = expandStateVocabulary([sources['comp/button.tokens.json']]).map((v) => v.id);
  assert.equal(ids.length, 6 * 4 * 6 + 2 * 6 * 4 * 5 + 4 * 2);
  assert.ok(ids.includes('tanrei.comp.button.inline.hovered.container.color'));
  assert.ok(ids.includes('tanrei.comp.button.text.pressed.selected.icon.color'));
  assert.ok(ids.includes('tanrei.comp.button.filled.hovered.state-layer.color'));
  assert.ok(ids.includes('tanrei.comp.button.pressed.container.shape'));
  assert.ok(ids.includes('tanrei.comp.button.outlined.pressed.outline.color'));
  assert.ok(ids.includes('tanrei.comp.button.disabled.opacity'));
});

test('mixColors is premultiplied interpolation — the same math as CSS color-mix(in srgb)', () => {
  const black = { r: 0, g: 0, b: 0, a: 1 }, white = { r: 1, g: 1, b: 1, a: 1 }, none = { r: 0, g: 0, b: 0, a: 0 };
  assert.deepEqual(mixColors(black, white, 0.08), { r: 0.08, g: 0.08, b: 0.08, a: 1 });
  assert.deepEqual(mixColors(none, white, 0.08), { r: 1, g: 1, b: 1, a: 0.08 }, 'over nothing, a mix is the color at that alpha');
});

test('Tanrei shows state as a state layer — expressed purely as values', () => {
  const light = build()('light'), dark = build()('dark');
  assert.equal(hex(light.filled.hovered.container.color), '#2d2d2d', '#1b1b1b with 8% of white');
  assert.equal(hex(dark.filled.hovered.container.color), '#dadada', 'the same rule follows the scheme');
  assert.equal(hex(light.text.hovered.container.color), '#1b1b1b@0.08', 'no fill: the label color at the state opacity');
  assert.equal(hex(light.tonal.disabled.container.color), '#1b1b1b@0.12');
  assert.equal(light.outlined.disabled.container.color.$value, '{tanrei.comp.button.outlined.container.color}', 'an explicit token beats the pattern — and stays an alias (no fill, enabled or not)');
  assert.equal(light.filled.pressed.label.color.$value, '{tanrei.comp.button.filled.label.color}', 'unchanged parts stay aliases');
  assert.equal(light.elevated.disabled.container.elevation.$value, '{tanrei.sys.elevation.level0}');
  assert.equal(light.hovered.opacity.$value, 1);
});

test('another design system expresses a different feedback style with the same tokens', () => {
  // "No hover; pressed dims the whole control" — the Apple-like model — is only values.
  const dimming = { id: 'dimming', extends: 'tanrei', rules: [
    { match: 'tanrei.comp.*.*.hovered.container.color', $value: '{tanrei.comp.$1.$2.container.color}' },
    { match: 'tanrei.comp.*.*.pressed.container.color', $value: '{tanrei.comp.$1.$2.container.color}' },
    { match: 'tanrei.comp.*.pressed.opacity', $value: 0.4, reason: 'Pressed is shown by dimming.' },
  ] };
  const b = build(dimming)('light');
  assert.equal(b.filled.hovered.container.color.$value, '{tanrei.comp.button.filled.container.color}', 'hover is a no-op');
  assert.equal(b.pressed.opacity.$value, 0.4);
  assert.equal(b.hovered.opacity.$value, 1, 'a more specific pattern wins over the inherited one only where it matches');
  assert.equal(hex(b.filled.focused.container.color), '#2d2d2d'.replace('2d2d2d', '323232'), 'untouched states keep the inherited rule (10%)');
});

test('explicit per-state colors (the Fluent/Primer model) are just as expressible', () => {
  const explicit = { id: 'explicit', extends: 'tanrei', tokens: {
    'tanrei.comp.button.filled.hovered.container.color': { $value: '{tanrei.sys.color.secondary}' },
  } };
  assert.equal(build(explicit)('light').filled.hovered.container.color.$value, '{tanrei.sys.color.secondary}');
});

test('precedence: explicit token > fewer wildcards > later layer', () => {
  const system = mergeLayers([root, { id: 'a', extends: 'tanrei', rules: [
    { match: 'tanrei.comp.button.*.hovered.container.color', $value: '{tanrei.sys.color.surface}' },
  ] }]);
  assert.equal(operationFor('tanrei.comp.button.tonal.hovered.container.color', system).$value, '{tanrei.sys.color.surface}', 'one wildcard beats the root’s two');
  assert.equal(operationFor('tanrei.comp.button.outlined.disabled.container.color', system).$value, '{tanrei.comp.button.outlined.container.color}', 'explicit token');
});

test('a system that leaves a declared state unvalued is rejected, with the rule to add', () => {
  // Every rule that could value a hovered container color goes: the container's own and the fallback for other parts.
  const bare = mergeLayers([{ ...root, rules: root.rules.filter((r) => !r.match.endsWith('hovered.container.color') && r.match !== 'tanrei.comp.*.*.hovered.*.color') }]);
  assert.throws(() => generateSchemeFiles(bare, REPO_ROOT, resolveNumericTokens(sources, bare)), /gives this state no value.*"match": "tanrei\.comp\.\*\.\*\.hovered\.container\.color"/s);
});

test('a part other than the container keeps its resting value under a state, and the container rule still wins', () => {
  const system = mergeLayers([root]);
  assert.equal(operationFor('tanrei.comp.example.selected.hovered.mark.color', system).$value, '{tanrei.comp.example.selected.mark.color}');
  assert.equal(operationFor('tanrei.comp.button.filled.pressed.selected.icon.color', system).$value, '{tanrei.comp.button.filled.selected.icon.color}');
  assert.equal(operationFor('tanrei.comp.example.selected.disabled.mark.color', system).derive.of, '{tanrei.sys.color.on-surface}');
  assert.equal(operationFor('tanrei.comp.button.filled.hovered.container.color', system).derive.fn, 'mix', 'the container rule (fewer wildcards) beats the fallback');
});

// Through the real pipeline: the resolver reads the scheme's documents after the components', so a
// resting component color a layer values by a color rule is the value in force, in every scheme.
test('a layer values a resting component color by a color rule: in force per scheme, mixed by its states, replaced by a child\'s $value', async () => {
  const { resolveSystem } = await import('../src/resolve.js');
  const { emitCss } = await import('../src/emit/css.js');
  const id = 'tanrei.comp.button.tonal.container.color', hovered = 'tanrei.comp.button.tonal.hovered.container.color';
  const layered = { id: 'layered', name: 'Layered', extends: 'tanrei', tokens: { [id]: { derive: { fn: 'alpha', of: '{tanrei.comp.button.tonal.label.color}', amount: 0.16 }, reason: 'The tonal fill is a layer of its own label color.' } } };
  const paint = (token) => `${token.value.hex}@${token.value.alpha}`;

  // 1. It builds (the numeric pass refused it before: unknown rule function "alpha"), and follows the scheme.
  const model = await (await resolveSystem({ layers: [layered] })).model();
  const base = await (await resolveSystem({ system: 'tanrei' })).model();
  for (const scheme of model.schemes) {
    const label = model.componentColors[scheme]['tanrei.comp.button.tonal.label.color'].value.hex;
    assert.equal(paint(model.componentColors[scheme][id]), `${label}@0.16`, `${scheme}: the label color of that scheme at 16%`);
    assert.equal(base.componentColors[scheme][id].value.alpha, 1, `${scheme}: the default system's own value is untouched`);
  }
  assert.notEqual(model.componentColors.light[id].value.hex, model.componentColors.dark[id].value.hex);
  assert.deepEqual(model.tokens[id].derive, layered.tokens[id].derive, 'the model carries the rule');

  // 2. The generic hovered rule mixes the layered value: 16% and the hover layer of the same color.
  const amount = model.tokens['tanrei.sys.state.hover-state-layer-opacity'].value;
  const hover = model.componentColors.dark[hovered].value;
  assert.equal(hover.hex, model.componentColors.dark[id].value.hex);
  assert.ok(Math.abs(hover.alpha - (1 - (1 - 0.16) * (1 - amount))) < 0.002, `16% then ${amount}: ${hover.alpha}`);
  assert.notEqual(paint(model.componentColors.dark[hovered]), paint(base.componentColors.dark[hovered]));

  // The emitters draw it as they draw a state color with the same rule.
  const emitted = emitCss(model);
  const css = typeof emitted === 'string' ? emitted : Object.values(emitted).join('\n');
  assert.match(css, /--tanrei-comp-button-tonal-container-color: color-mix\(in srgb, var\(--tanrei-comp-button-tonal-label-color\) 16%, transparent\);/);

  // 3. A child layer's `$value` replaces the rule: the role is in force again, and the states mix it.
  const pinned = { id: 'pinned', name: 'Pinned', extends: 'layered', tokens: { [id]: { $value: '{tanrei.sys.color.secondary-container}', reason: 'This system draws the tonal fill as a tone.' } } };
  const back = await (await resolveSystem({ layers: [layered, pinned] })).model();
  for (const scheme of back.schemes) {
    assert.equal(paint(back.componentColors[scheme][id]), paint(base.componentColors[scheme][id]), `${scheme}: the role's color`);
    assert.equal(paint(back.componentColors[scheme][hovered]), paint(base.componentColors[scheme][hovered]), `${scheme}: hovered as the default system's`);
  }
  assert.equal(back.tokens[id].alias, 'tanrei.sys.color.secondary-container');

  // 4. A component that declares no states cannot carry a per-scheme value: refused, by name.
  const stateless = Object.entries(sources).find(([name, doc]) => name.startsWith('comp/') && !Object.values(doc.tanrei.comp)[0].$extensions?.['dev.tanrei.states'] && JSON.stringify(doc).includes('"$type":"color"'));
  if (stateless) {
    const colorOf = (node, trail) => { for (const [k, v] of Object.entries(node)) { if (k.startsWith('$')) continue; if (v?.$type === 'color') return [...trail, k].join('.'); const found = v && typeof v === 'object' ? colorOf(v, [...trail, k]) : null; if (found) return found; } return null; };
    const target = colorOf(stateless[1], []);
    await assert.rejects(async () => (await resolveSystem({ layers: [{ id: 'refused', name: 'Refused', extends: 'tanrei', tokens: { [target]: { derive: { fn: 'alpha', of: '{tanrei.sys.color.on-surface}', amount: 0.16 }, reason: 'A layer where no state document exists.' } } }] })).model(), /a resting color takes a color rule only in a component that declares states/);
  }
});
