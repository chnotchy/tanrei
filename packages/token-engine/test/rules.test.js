import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVE, VOCABULARY, checkSources, evaluateNumeric, inContext, roundTo } from '../src/index.js';

const px = (value) => ({ value, unit: 'px' });
const voc = { [VOCABULARY]: { rationale: 'One product needs several distances at once.' } };
const dials = { tanrei: { dial: { $extensions: voc, space: { unit: { $type: 'dimension', $value: px(8) } }, type: { base: { $type: 'dimension', $value: px(16) }, contrast: { $type: 'number', $value: 1 } } } } };
const space = (value, extensions) => ({ tanrei: { sys: { space: { $type: 'dimension', $extensions: voc, space175: { $value: px(value), $extensions: extensions } } } } });
const mul = (by) => ({ [DERIVE]: { fn: 'mul', of: '{tanrei.dial.space.unit}', by } });

test('mul is exact at the defaults for the coefficients Tanrei uses', () => {
  const lookup = () => px(16);
  for (const [by, want] of [[4, 64], [0.8125, 13], [0.6875, 11], [1.125, 18]]) {
    assert.equal(evaluateNumeric({ fn: 'mul', of: '{x}', by, exp: 1 }, lookup, { type: 'dimension' }).value, want);
  }
});

test('type.contrast is an exponent on the coefficient: 1 changes nothing, >1 spreads the ramp', () => {
  const at = (contrast) => (by) => evaluateNumeric({ fn: 'mul', of: '{base}', by, exp: '{contrast}' }, (id) => (id === 'base' ? px(16) : { value: contrast }), { type: 'dimension' }).value;
  assert.equal(at(1)(4), 64);
  assert.ok(at(1.2)(4) > 64, 'headings grow');
  assert.ok(at(1.2)(0.75) < 12, 'small text shrinks');
  assert.equal(at(1.2)(1), 16, 'the base size is the fixed point');
});

test('rounding: dimensions snap to 0.25, durations to whole ms', () => {
  assert.equal(roundTo(13.13, 0.25), 13.25);
  assert.equal(evaluateNumeric({ fn: 'mul', of: '{u}', by: 3.3 }, () => ({ value: 50, unit: 'ms' }), { type: 'duration' }).value, 165);
});

test('em derives tracking from the token’s own size', () => {
  assert.equal(evaluateNumeric({ fn: 'em', by: -0.045 }, () => px(0), { type: 'dimension', fontSize: 64 }).value, -2.88);
  assert.throws(() => evaluateNumeric({ fn: 'em', by: 1 }, () => px(0), { type: 'dimension' }), /only valid for typography/);
});

test('context maps: bare value, contrast array, per-theme map', () => {
  assert.equal(inContext(10, 'dark-high'), 10);
  assert.equal(inContext([10, 6, 0], 'light-medium'), 6);
  assert.equal(inContext([10, 6], 'light-high'), 6, 'the last value repeats');
  assert.equal(inContext({ light: [10, 6, 0], dark: [93] }, 'dark-high'), 93);
  assert.throws(() => inContext({ light: 1 }, 'dark'), /no "dark" entry/);
});

// ── The philosophy as tests: each of these must FAIL the build when violated ──
test('a consistent source passes', () => {
  assert.deepEqual(checkSources([dials, space(14, mul(1.75))]), []);
});

test('a literal that disagrees with its rule is rejected (the literal is a drift check)', () => {
  const problems = checkSources([dials, space(15, mul(1.75))]);
  assert.match(problems.join('\n'), /space175: rule gives 14, \$value says 15/);
});

test('a literal with neither a rule nor a stated reason is rejected', () => {
  assert.match(checkSources([dials, space(14, undefined)]).join('\n'), /needs a rule or \{ "fixed"/);
  assert.match(checkSources([dials, space(14, { [DERIVE]: { fixed: 'x' } })]).join('\n'), /needs a real reason/);
  assert.deepEqual(checkSources([dials, space(14, { [DERIVE]: { fixed: 'Contractually fixed legal footnote size.' } })]), []);
});

test('a token with no one-product rationale is rejected', () => {
  const doc = { tanrei: { sys: { space: { $type: 'dimension', space175: { $value: px(14), $extensions: mul(1.75) } } } } };
  assert.match(checkSources([dials, doc]).join('\n'), /no vocabulary rationale/);
});

test('an alias is accepted as-is: it is re-pointable, not computed', () => {
  const doc = { tanrei: { comp: { x: { $type: 'dimension', $extensions: voc, gap: { $value: '{tanrei.dial.space.unit}' } } } } };
  assert.deepEqual(checkSources([dials, doc]), []);
});
