// The rule forms a height that follows a density is written in: `mul` with `times` (a number token, the density),
// `round` (the step its result lands on) and `min` (a floor applied after rounding). No token of the default system
// uses them yet; these tests hold the arithmetic on its own.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVE, VOCABULARY, checkSources, evaluateNumeric, mergeLayers, resolveNumericTokens, roundToStep, ruleDependencies, walkTokens } from '../src/index.js';

const px = (value) => ({ value, unit: 'px' });
const dim = { type: 'dimension' };
/** A lookup over a table of resolved values. */
const values = (table) => (id) => {
  if (!(id in table)) throw new Error(`unknown {${id}}`);
  return table[id];
};
const at = ({ unit = 4, density = 1, minimum = 36 } = {}) => values({ unit: px(unit), density: { value: density }, minimum: px(minimum), grid: px(unit), space25: px(2) });
const height = (by, fields) => ({ fn: 'mul', of: '{unit}', by, ...fields });
const full = (by) => height(by, { times: '{density}', round: '{grid}', min: '{minimum}' });

test('mul: times alone multiplies, then rounds to 0.25px as before', () => {
  assert.deepEqual(evaluateNumeric(height(10, { times: '{density}' }), at({ density: 1.25 }), dim), px(50));
  assert.deepEqual(evaluateNumeric(height(8, { times: '{density}' }), at({ density: 0.9 }), dim), px(28.75), '28.8 on the 0.25 grid');
  assert.deepEqual(evaluateNumeric(height(8, { times: '{density}' }), at({ density: 1 }), dim), evaluateNumeric(height(8), at(), dim), 'at 1 it is the rule without it');
});

test('mul: round alone lands on the step, ties upward', () => {
  assert.deepEqual(evaluateNumeric(height(11, { round: '{space25}' }), at(), dim), px(44));
  assert.deepEqual(evaluateNumeric(height(1.625, { round: '{grid}' }), at(), dim), px(8), '6.5 → 8: half a step goes up');
  assert.deepEqual(evaluateNumeric(height(1.375, { round: '{grid}' }), at(), dim), px(4), '5.5 → 4');
  assert.deepEqual(evaluateNumeric(height(11, { round: '{grid}' }), at({ unit: 8 }), dim), px(88), 'on the grid already: unchanged');
});

test('mul: min alone is a floor, and changes nothing above it', () => {
  assert.deepEqual(evaluateNumeric(height(8, { min: '{minimum}' }), at(), dim), px(36));
  assert.deepEqual(evaluateNumeric(height(10, { min: '{minimum}' }), at(), dim), px(40));
  assert.deepEqual(evaluateNumeric(height(9, { min: '{minimum}' }), at(), dim), px(36), 'equal to the floor');
});

test('mul: ties on the grid round upward, clean of binary noise', () => {
  // 4 × 10 × 0.95 is 38 in binary arithmetic too, half way between 36 and 40.
  assert.deepEqual(evaluateNumeric(height(10, { times: '{density}', round: '{grid}' }), at({ density: 0.95 }), dim), px(40));
  // 4 × 10 × 0.75 = 30, half way between 28 and 32.
  assert.deepEqual(evaluateNumeric(height(10, { times: '{density}', round: '{grid}' }), at({ density: 0.75 }), dim), px(32));
  // 4 × 14 × 1.25 = 70, half way between 68 and 72.
  assert.deepEqual(evaluateNumeric(height(14, { times: '{density}', round: '{grid}' }), at({ density: 1.25 }), dim), px(72));
  // 0.15 / 0.1 is 1.4999999999999998 in binary: the noise does not decide the tie.
  assert.equal(roundToStep(0.15, 0.1), 0.2);
  assert.equal(roundToStep(0.1 * 3, 0.1), 0.3, 'a step that is not exact in binary gives a clean multiple');
  assert.equal(roundToStep(-6, 4), -4, 'ties go toward +∞, as CSS round(nearest) does');
});

test('mul: the floor applies after rounding, so a floor off the grid gives exactly the floor', () => {
  assert.deepEqual(evaluateNumeric(full(6), at({ minimum: 30 }), dim), px(30), '24 on the grid, held at 30');
  assert.deepEqual(evaluateNumeric(full(8), at({ density: 0.95, minimum: 30 }), dim), px(32), '30.4 rounds to 32, above the floor: not 30.4');
  assert.deepEqual(evaluateNumeric(full(8), at({ density: 0.9, minimum: 30 }), dim), px(30), '28.8 rounds to 28, under the floor: 30');
});

test('mul: times, round and min together give the heights of the density table', () => {
  // density → [×8, ×10, ×14, ×12] at size unit 4 and minimum 36
  const table = {
    0.75: [36, 36, 44, 36],
    0.9: [36, 36, 52, 44],
    1: [36, 40, 56, 48],
    1.25: [40, 52, 72, 60],
    1.5: [48, 60, 84, 72],
  };
  for (const [density, want] of Object.entries(table)) {
    const got = [8, 10, 14, 12].map((by) => evaluateNumeric(full(by), at({ density: Number(density) }), dim).value);
    assert.deepEqual(got, want, `density ${density}`);
  }
  for (const minimum of [24, 32, 48]) assert.deepEqual(evaluateNumeric(full(8), at({ minimum }), dim), px(Math.max(minimum, 32)), `minimum ${minimum}`);
});

test('mul: the terms are tokens, in the units they must have', () => {
  const lookup = values({ unit: px(4), density: { value: 1 }, ms: { value: 4, unit: 'ms' }, zero: px(0) });
  assert.throws(() => evaluateNumeric(height(8, { times: 1.1 }), lookup, dim), /times must be a token/);
  assert.throws(() => evaluateNumeric(height(8, { min: 36 }), lookup, dim), /min must be a token/);
  assert.throws(() => evaluateNumeric(height(8, { times: '{unit}' }), lookup, dim), /must be a number token; it is in px/);
  assert.throws(() => evaluateNumeric(height(8, { round: '{ms}' }), lookup, dim), /round \{ms\} \(ms\) is not in the unit of \{unit\} \(px\)/);
  assert.throws(() => evaluateNumeric(height(8, { min: '{density}' }), lookup, dim), /min \{density\} \(no unit\) is not in the unit/);
  assert.throws(() => evaluateNumeric(height(8, { round: '{zero}' }), lookup, dim), /must be above zero/);
});

test('mul: the terms are dependencies', () => {
  assert.deepEqual(ruleDependencies(full(8)), ['unit', 'density', 'grid', 'minimum']);
});

// The same through the documents: a source checked against its literal, and a layer that sets the density.
const voc = { [VOCABULARY]: { rationale: 'One product sets how much room its controls take.' } };
const fixedReason = { [DERIVE]: { fixed: 'The developer’s value; no dial scales it.' } };
const RULE = { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 8, times: '{tanrei.dial.density}', round: '{tanrei.dial.size.unit}', min: '{tanrei.sys.target.minimum}' };
const sources = (literal = 36) => ({
  'dial/dial.tokens.json': { tanrei: { dial: { $extensions: voc, size: { unit: { $type: 'dimension', $value: px(4) } }, density: { $type: 'number', $value: 1 } } } },
  'sys/target.tokens.json': { tanrei: { sys: { target: { $type: 'dimension', $extensions: voc, minimum: { $value: px(36), $extensions: fixedReason } } } } },
  'comp/button.tokens.json': { tanrei: { comp: { button: { $type: 'dimension', $extensions: voc, height: { $value: px(literal), $extensions: { [DERIVE]: RULE } } } } } },
});
const valueOf = (docs, id) => Object.values(docs).flatMap((doc) => [...walkTokens(doc)]).find((entry) => entry.id === id).token.$value;
const layer = (tokens) => mergeLayers([{ id: 'acme', tokens }]);

test('checkSources holds a mul with times, round and min to the literal beside it', () => {
  assert.deepEqual(checkSources(Object.values(sources(36))), []);
  assert.deepEqual(checkSources(Object.values(sources(32))), ['tanrei.comp.button.height: rule gives 36, $value says 32']);
});

test('resolveNumericTokens: a layer that sets the density or the minimum moves the height', () => {
  const resolved = (tokens) => valueOf(resolveNumericTokens(sources(), layer(tokens)), 'tanrei.comp.button.height');
  assert.deepEqual(resolved({}), px(36));
  assert.deepEqual(resolved({ 'tanrei.dial.density': { $value: 1.5, reason: 'A product used mostly by touch.' } }), px(48));
  assert.deepEqual(resolved({ 'tanrei.sys.target.minimum': { $value: px(24), reason: 'A dense tool for a fine pointer.' } }), px(32));
  assert.deepEqual(resolved({ 'tanrei.dial.density': { $value: 0.75, reason: 'A dense tool.' }, 'tanrei.sys.target.minimum': { $value: px(24), reason: 'A dense tool for a fine pointer.' } }), px(24));
  assert.deepEqual(resolved({ 'tanrei.comp.button.height': { scale: 0.5 } }), px(36), 'a scale keeps the floor: 16 is held at 36');
});
