// Layers on the real vocabulary: the customizations the design philosophy promises must work,
// and the ones it forbids must fail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { SystemError, mergeLayers, resolveNumericTokens, walkTokens } from '@tanrei/token-engine';
import { REPO_ROOT, TOKENS_DIR } from '../src/model.js';
import { generateSchemeFiles, loadSystem, sourceFiles } from '../src/scheme.js';

const sources = sourceFiles(REPO_ROOT);
const root = loadSystem(REPO_ROOT, 'core');
const values = (docs) => {
  const out = new Map();
  for (const doc of Object.values(docs)) for (const { id, token } of walkTokens(doc)) out.set(id, token.$value);
  return out;
};
const resolve = (...layers) => values(resolveNumericTokens(sources, mergeLayers([root, ...layers])));
const base = resolve();
const px = (id, from = base) => { const v = from.get(id); return v.fontSize ? v.fontSize.value : v.value; };
const follow = (id, from) => { let v = from.get(id); while (typeof v === 'string') v = from.get(v.slice(1, -1)); return v; };

test('with no layers, evaluating every rule reproduces the authored values exactly', () => {
  const authored = new Map();
  for (const doc of Object.values(sources)) for (const { id, token } of walkTokens(doc)) authored.set(id, token.$value);
  for (const [id, value] of authored) assert.deepEqual(base.get(id), value, id);
});

test('one dial moves every text size; a pinned token stays put', () => {
  const big = resolve({ id: 'big', tokens: {
    'tanrei.dial.type.base': { $value: { value: 18, unit: 'px' }, reason: 'Audience reads at arm’s length.' },
    'tanrei.sys.typescale.caption': { $value: { fontSize: { value: 11, unit: 'px' } }, reason: 'Legal footnote size is contractual.' },
  } });
  assert.equal(px('tanrei.sys.typescale.body-large', big), 18);
  assert.equal(px('tanrei.sys.typescale.display', big), 54);
  assert.equal(px('tanrei.sys.typescale.caption', big), 11, 'pinned');
  const moved = [...base.keys()].filter((id) => id.includes('.typescale.') && !id.includes('.emphasis.') && px(id, big) !== px(id));
  assert.equal(moved.length, 15, 'all 16 text styles follow except the pinned one');
  assert.equal(big.get('tanrei.sys.typescale.display').letterSpacing.value, -2.16, 'tracking follows its own size (54 × −0.04)');
  assert.equal(px('tanrei.sys.space.space200', big), 16, 'spacing is a different dial');
});

test('the spacing dial reaches a component through its alias', () => {
  const padding = 'tanrei.comp.button.container.padding-inline-start.medium', height = 'tanrei.comp.button.container.height.medium';
  // Where the padding sits on the space scale (unit × step), read from the default rather than restated.
  const step = follow(padding, base).value / px('tanrei.dial.space.unit');
  const dense = resolve({ id: 'dense', tokens: { 'tanrei.dial.space.unit': { $value: { value: 6, unit: 'px' }, reason: 'A dense data tool.' } } });
  assert.equal(follow(padding, dense).value, 6 * step);
  assert.equal(px(height, dense), px(height), 'heights follow size.unit, not space.unit');
});

test('"button padding is 2× the default" — without restating the rule, and still dial-driven', () => {
  const id = 'tanrei.comp.button.container.padding-inline-start.medium';
  const step = follow(id, base).value / px('tanrei.dial.space.unit');
  const op = { [id]: { scale: 2 } };
  assert.equal(px(id, resolve({ id: 'a', tokens: op })), 2 * follow(id, base).value);
  const both = resolve({ id: 'a', tokens: { ...op, 'tanrei.dial.space.unit': { $value: { value: 10, unit: 'px' }, reason: 'Airy marketing pages.' } } });
  assert.equal(px(id, both), 2 * (10 * step), '2 × (10 × the padding’s space step)');
});

test('scale composes down an extends chain', () => {
  const id = 'tanrei.sys.space.space100';
  const out = resolve({ id: 'preset', tokens: { [id]: { scale: 1.5 } } }, { id: 'product', tokens: { [id]: { scale: 2 } } });
  assert.equal(px(id, out), 24);
});

test('re-pointing which token a component token references', () => {
  const out = resolve({ id: 'a', tokens: { 'tanrei.comp.button.container.gap.medium': { $value: '{tanrei.sys.space.space50}' } } });
  assert.equal(out.get('tanrei.comp.button.container.gap.medium'), '{tanrei.sys.space.space50}');
});

test('type.contrast spreads the ramp around the base size', () => {
  const out = resolve({ id: 'a', tokens: { 'tanrei.dial.type.contrast': { $value: 1.15, reason: 'Editorial product with strong hierarchy.' } } });
  assert.ok(px('tanrei.sys.typescale.display', out) > 48);
  assert.equal(px('tanrei.sys.typescale.body-large', out), 16);
  assert.ok(px('tanrei.sys.typescale.caption', out) < 11);
});

// ── What a layer must NOT be able to do ──
test('a value for a token nobody declared is refused — and the message says how to declare it', () => {
  const step = { $value: { value: 76, unit: 'px' }, reason: 'We want one more step.' };
  assert.throws(() => resolve({ id: 'a', tokens: { 'tanrei.sys.space.space950': step } }), /unknown token.*declare it under "vocabulary" with a rationale/s);
  // Declared, the same layer is fine. test/vocabulary.test.js covers extensions in full.
  const resolved = resolve({ id: 'a', vocabulary: { 'tanrei.sys.space.space950': { $type: 'dimension', rationale: 'One more step for wide layouts.', ...step } } });
  assert.deepEqual(resolved.get('tanrei.sys.space.space950'), { value: 76, unit: 'px' });
});
test('a layer cannot change a token’s type, pin without a reason, scale a fixed value, or alias nothing', () => {
  assert.throws(() => resolve({ id: 'a', tokens: { 'tanrei.sys.space.space100': { $type: 'number', scale: 2 } } }), /cannot change \$type/);
  assert.throws(() => resolve({ id: 'a', tokens: { 'tanrei.sys.space.space100': { $value: { value: 9, unit: 'px' } } } }), /needs a "reason"/);
  assert.throws(() => resolve({ id: 'a', tokens: { 'tanrei.sys.shape.corner.full': { scale: 2 } } }), /cannot scale a fixed value/);
  assert.throws(() => resolve({ id: 'a', tokens: { 'tanrei.comp.button.container.gap.medium': { $value: '{tanrei.sys.space.nope}' } } }), /does not exist/);
});
test('a rule cycle is reported with its path', () => {
  const a = 'tanrei.sys.space.space100', b = 'tanrei.sys.space.space200';
  assert.throws(() => resolve({ id: 'a', tokens: { [a]: { derive: { fn: 'mul', of: `{${b}}`, by: 1 } }, [b]: { derive: { fn: 'mul', of: `{${a}}`, by: 1 } } } }), (e) => e instanceof SystemError && /cycle: .*space100.*space200/.test(e.message));
});

test('typography: pin some fields and rule the others in one operation', () => {
  const id = 'tanrei.sys.typescale.body-large';
  const layer = (base) => ({ id: 'a', tokens: {
    ...(base ? { 'tanrei.dial.type.base': { $value: { value: base, unit: 'px' }, reason: 'Dial test.' } } : {}),
    [id]: { $value: { lineHeight: 1.5, fontWeight: 500 }, reason: 'This system sets body on a 24px line.', derive: { fontSize: { fn: 'mul', of: '{tanrei.dial.type.base}', by: 1.125 }, letterSpacing: { fn: 'em', by: 0.03 } } },
  } });
  const at16 = resolve(layer()).get(id), at20 = resolve(layer(20)).get(id);
  assert.deepEqual([at16.fontSize.value, at16.lineHeight, at16.fontWeight, at16.letterSpacing.value], [18, 1.5, 500, 0.54]);
  assert.deepEqual([at20.fontSize.value, at20.lineHeight, at20.fontWeight], [22.5, 1.5, 500], 'size follows the dial; the pinned fields do not move');
});

test('a layer can drop an inherited palette — and must then re-point what used it', () => {
  const merged = mergeLayers([root, { id: 'a', extends: 'tanrei', palettes: { accent: null } }]);
  assert.ok(!('accent' in merged.palettes));
  assert.throws(() => generateSchemeFiles(merged, REPO_ROOT, resolveNumericTokens(sources, merged)), /unknown palette "accent"/);
});

test('a color role cannot hold a literal', async () => {
  const { buildBundle, layerChain } = await import('../src/bundle.js');
  const { REPO_ROOT } = await import('../src/model.js');
  const { loadSystem } = await import('../src/scheme.js');
  const layers = { core: loadSystem(REPO_ROOT, 'core'), tanrei: loadSystem(REPO_ROOT, 'tanrei'), acme: { id: 'acme', extends: 'tanrei', tokens: { 'tanrei.sys.color.primary': { $value: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 }, reason: 'Brand red, straight from the guideline.' } } } };
  assert.throws(() => buildBundle(REPO_ROOT, layerChain('acme', (id) => layers[id])), /a color role cannot hold a literal/);
});

test('a palette can fix single tones to exact colors; every other tone is still generated', async () => {
  const { buildBundle, layerChain } = await import('../src/bundle.js');
  const { REPO_ROOT } = await import('../src/model.js');
  const { loadSystem } = await import('../src/scheme.js');
  const tones = { 45: '#123456' };
  const layers = { core: loadSystem(REPO_ROOT, 'core'), tanrei: loadSystem(REPO_ROOT, 'tanrei'), acme: { id: 'acme', extends: 'tanrei', palettes: { accent: { description: 'Brand blue, fixed by the guideline.', source: { seed: '#30a3f0', tones }, roles: 'intent' } } } };
  const plain = { ...layers, acme: { ...layers.acme, palettes: { accent: { ...layers.acme.palettes.accent, source: { seed: '#30a3f0' } } } } };
  const paletteOf = (set) => buildBundle(REPO_ROOT, layerChain('acme', (id) => set[id])).files['generated/ref.palette.tokens.json'].tanrei.ref.palette.accent;
  assert.equal(paletteOf(layers)['45'].$value.hex.toLowerCase(), '#123456');
  assert.deepEqual(paletteOf(layers)['72'], paletteOf(plain)['72'], 'an unfixed tone is generated as before');
});

test('scaling a text style by field composes down the chain instead of turning into NaN', () => {
  const parent = { id: 'a', tokens: { 'tanrei.sys.typescale.body-large': { scale: { fontSize: 1.125 } } } };
  const child = { id: 'b', tokens: { 'tanrei.sys.typescale.body-large': { scale: 2 } } };
  assert.equal(resolve(parent).get('tanrei.sys.typescale.body-large').fontSize.value, 18);
  assert.equal(resolve(parent, child).get('tanrei.sys.typescale.body-large').fontSize.value, 36);
});

test('a rule given to a token that was an alias replaces the alias', () => {
  const layer = { id: 'a', tokens: { 'tanrei.comp.button.container.gap.medium': { derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 1.5 } } } };
  assert.deepEqual(resolve(layer).get('tanrei.comp.button.container.gap.medium'), { value: 12, unit: 'px' });
});

test('scaling an alias of a text style is refused with the way out, and is never offered', async () => {
  const { legalOperations } = await import('@tanrei/token-engine');
  assert.throws(() => resolve({ id: 'a', tokens: { 'tanrei.comp.button.label.typescale.medium': { scale: 1.3 } } }), /does not apply to an alias of a text style[\s\S]*scale \{tanrei\.sys\.typescale\.label\} itself/);
  const offered = legalOperations({ id: 'tanrei.comp.button.label.typescale.medium', type: 'typography', value: {}, alias: 'tanrei.sys.typescale.label', rule: null, state: false });
  assert.deepEqual(offered.map((o) => o.op), ['re-point alias']);
});
