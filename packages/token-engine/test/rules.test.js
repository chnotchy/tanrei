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

test('sub: the outer corner less the inset, never below zero, in the outer corner\'s unit', () => {
  const lookup = (values) => (id) => values[id];
  const sub = { fn: 'sub', of: '{outer}', by: '{inset}' };
  assert.deepEqual(evaluateNumeric(sub, lookup({ outer: px(8), inset: px(4) }), { type: 'dimension' }), px(4));
  assert.deepEqual(evaluateNumeric(sub, lookup({ outer: px(12), inset: px(24) }), { type: 'dimension' }), px(0), 'an inset wider than the corner leaves a square corner');
  assert.deepEqual(evaluateNumeric(sub, lookup({ outer: px(8), inset: px(8) }), { type: 'dimension' }), px(0));
  assert.deepEqual(evaluateNumeric(sub, lookup({ outer: px(9.5), inset: px(1.25) }), { type: 'dimension' }), px(8.25));
  assert.throws(() => evaluateNumeric(sub, lookup({ outer: px(8), inset: { value: 4, unit: 'ms' } }), { type: 'dimension' }), /both need one unit/);
  assert.throws(() => evaluateNumeric({ fn: 'sub', of: '{outer}', by: 4 }, lookup({ outer: px(8) }), { type: 'dimension' }), /each a token/);
});

test('checkSources holds a sub rule to the literal beside it', () => {
  const shapes = (inner) => ({ tanrei: { sys: { shape: { $type: 'dimension', $extensions: voc, outer: { $value: px(8), $extensions: { [DERIVE]: { fixed: 'The outer corner of this check.' } } }, inset: { $value: px(4), $extensions: { [DERIVE]: { fixed: 'The inset of this check.' } } }, inner: { $value: px(inner), $extensions: { [DERIVE]: { fn: 'sub', of: '{tanrei.sys.shape.outer}', by: '{tanrei.sys.shape.inset}' } } } } } } });
  assert.deepEqual(checkSources([dials, shapes(4)]), []);
  assert.deepEqual(checkSources([dials, shapes(6)]), ['tanrei.sys.shape.inner: rule gives 4, $value says 6']);
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

// `pick`: a value set by a choice of kind. One value per name; the chain's choice names the one in force.
const ENUM_KEY = 'dev.tanrei.enum';
const choiceDoc = (index, values = ['near', 'far']) => ({ tanrei: { sys: { behavior: { $type: 'number', $extensions: voc, reach: { $value: index, $extensions: { [ENUM_KEY]: { values }, [DERIVE]: { fixed: 'A choice of kind; no dial scales it.' } } } } } } });
const pickDoc = (value, values) => ({ tanrei: { sys: { travel: { $type: 'dimension', $extensions: voc, distance: { $value: px(value), $extensions: { [DERIVE]: { fn: 'pick', by: '{tanrei.sys.behavior.reach}', values } } } } } } });

test('pick takes the value the choice names, a literal or an alias', () => {
  const lookup = (id) => (id === 'choice' ? { value: 1, names: ['near', 'far'] } : px(24));
  assert.deepEqual(evaluateNumeric({ fn: 'pick', by: '{choice}', values: { near: px(0), far: px(8) } }, lookup, { type: 'dimension' }), px(8));
  assert.deepEqual(evaluateNumeric({ fn: 'pick', by: '{choice}', values: { near: px(0), far: '{space300}' } }, lookup, { type: 'dimension' }), px(24));
  assert.deepEqual(evaluateNumeric({ fn: 'pick', by: '{choice}', values: { near: 1, far: 0.96 } }, lookup, { type: 'number' }), { value: 0.96 });
});

test('pick gives one value for each name of its choice, and follows only a choice of kind', () => {
  const lookup = (id) => (id === 'choice' ? { value: 0, names: ['near', 'far'] } : { value: 3 });
  assert.throws(() => evaluateNumeric({ fn: 'pick', by: '{choice}', values: { near: 1 } }, lookup, { type: 'number' }), /gives none for far/);
  assert.throws(() => evaluateNumeric({ fn: 'pick', by: '{choice}', values: { near: 1, far: 2, wide: 3 } }, lookup, { type: 'number' }), /wide is not one of them/);
  assert.throws(() => evaluateNumeric({ fn: 'pick', by: '{amount}', values: { near: 1 } }, lookup, { type: 'number' }), /not a choice of kind/);
  assert.throws(() => evaluateNumeric({ fn: 'pick', by: 'choice', values: { near: 1 } }, lookup, { type: 'number' }), /needs "by"/);
});

test('checkSources holds a picked literal to the value the default choice names', () => {
  assert.deepEqual(checkSources([dials, choiceDoc(0), pickDoc(0, { near: px(0), far: px(8) })]), []);
  assert.deepEqual(checkSources([dials, choiceDoc(1), pickDoc(8, { near: px(0), far: px(8) })]), []);
  assert.match(checkSources([dials, choiceDoc(1), pickDoc(0, { near: px(0), far: px(8) })]).join('\n'), /rule gives 8, \$value says 0/);
});
