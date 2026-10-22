// The rule forms a height that follows a density is written in: `mul` with `times` (a number token, the density),
// `round` (the step its result lands on) and `min` (a floor applied after rounding), and `pad`, the block padding of
// such a box. No token of the default system uses them yet; these tests hold the arithmetic on its own.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVE, VOCABULARY, checkSources, evaluateNumeric, mergeLayers, resolveNumericTokens, roundToStep, ruleDependencies, unscaledLookup, walkTokens } from '../src/index.js';

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

// `pad`: the block padding of a box whose height follows a density gives up half of what the height lost, and takes
// half of what it gained from the density or from the floor, so the box stays 2 × padding + one line.
const tableOf = ({ density = 1, minimum = 36, padding = 6 } = {}) => ({
  unit: { rule: { fn: 'mul', of: '{dial}', by: 1 }, type: 'dimension' },
  dial: { value: px(4) },
  density: { value: { value: density } },
  minimum: { value: px(minimum) },
  padding: { value: px(padding) },
  // The ladder step follows the density; the pressable height aliases it, floored.
  step: { rule: { fn: 'mul', of: '{unit}', by: 8, times: '{density}', round: '{unit}' }, type: 'dimension' },
  height: { rule: { fn: 'mul', of: '{step}', by: 1, min: '{minimum}' }, type: 'dimension' },
  alias: { alias: 'height' },
});
/** A lookup and its unscaled companion over a table of described tokens, as the engine builds them. */
function graph(table) {
  const describe = (id) => {
    if (!(id in table)) throw new Error(`unknown {${id}}`);
    return table[id];
  };
  const unscaled = unscaledLookup(describe);
  const lookup = (id) => {
    const { alias, rule, type, value } = describe(id);
    return alias ? lookup(alias) : rule ? evaluateNumeric(rule, lookup, { type, unscaled }) : value;
  };
  return { lookup, unscaled, pad: (heightId = 'height') => evaluateNumeric({ fn: 'pad', of: '{padding}', height: `{${heightId}}` }, lookup, { type: 'dimension', unscaled }) };
}

test('pad: the height₁ it measures from reads every times as 1 and drops every min, through aliases and of', () => {
  const { lookup, unscaled } = graph(tableOf({ density: 1.5, minimum: 36 }));
  assert.deepEqual(lookup('height'), px(48));
  assert.deepEqual(unscaled('height'), px(32));
  assert.deepEqual(unscaled('alias'), px(32));
  assert.deepEqual(graph(tableOf({ density: 1 })).lookup('height'), px(36), 'held at the floor');
  assert.deepEqual(graph(tableOf({ density: 1 })).unscaled('height'), px(32), 'without the floor');
});

test('pad: a box that shrinks gives up half of what it lost', () => {
  // density 0.9 with no floor in reach: 28.8 → 28, from 32: 2 px less above and below.
  assert.deepEqual(graph(tableOf({ density: 0.9, minimum: 24 })).pad(), px(4));
});

test('pad: a box the floor or the density grows takes half of what it gained', () => {
  assert.deepEqual(graph(tableOf({ density: 1, minimum: 36 })).pad(), px(8), 'a small Button held at 36: 6 + 2');
  assert.deepEqual(graph(tableOf({ density: 1.5, minimum: 36 })).pad(), px(14), '48 from 32: 6 + 8');
  assert.deepEqual(graph(tableOf({ density: 1, minimum: 24 })).pad(), px(6), 'nothing moved: the padding as it was');
});

test('pad: never below zero', () => {
  assert.deepEqual(graph(tableOf({ density: 0.5, minimum: 0, padding: 2 })).pad(), px(0), '16 from 32 would take 8 from 2');
});

test('pad: the box stays 2 × padding + one line wherever the padding is above zero', () => {
  for (const density of [0.75, 0.9, 1, 1.25, 1.5]) {
    for (const minimum of [24, 32, 36, 48]) {
      const { lookup, pad } = graph(tableOf({ density, minimum }));
      assert.equal(lookup('height').value - 2 * pad().value, 32 - 2 * 6, `density ${density}, minimum ${minimum}`);
    }
  }
});

test('pad: rounds to 0.25px', () => {
  // 4 × 7 × 1.1 = 30.8 → 30.75 on the 0.25 grid, from 28: 6 + 1.375 → 7.5.
  const table = { ...tableOf({ density: 1.1 }), step: { rule: { fn: 'mul', of: '{unit}', by: 7, times: '{density}' }, type: 'dimension' }, height: { alias: 'step' } };
  assert.deepEqual(graph(table).pad(), px(7.5));
});

test('pad: a height with no rule (a pinned value) has moved nothing', () => {
  const table = { ...tableOf({ density: 1.5 }), pinned: { value: px(40) } };
  assert.deepEqual(graph(table).pad('pinned'), px(6));
});

test('pad: unscaled, a padding is its of; it needs the unscaled lookup, two tokens and one unit', () => {
  const { unscaled } = graph({ ...tableOf({ density: 1.5 }), padded: { rule: { fn: 'pad', of: '{padding}', height: '{height}' }, type: 'dimension' } });
  assert.deepEqual(unscaled('padded'), px(6));
  const lookup = values({ padding: px(6), height: px(36), ms: { value: 36, unit: 'ms' } });
  assert.throws(() => evaluateNumeric({ fn: 'pad', of: '{padding}', height: '{height}' }, lookup, dim), /ctx\.unscaled/);
  assert.throws(() => evaluateNumeric({ fn: 'pad', of: '{padding}', height: 36 }, lookup, { ...dim, unscaled: lookup }), /each a token/);
  assert.throws(() => evaluateNumeric({ fn: 'pad', of: '{padding}', height: '{ms}' }, lookup, { ...dim, unscaled: lookup }), /height \{ms\} \(ms\) is not in the unit of \{padding\} \(px\)/);
  assert.deepEqual(ruleDependencies({ fn: 'pad', of: '{padding}', height: '{height}' }), ['padding', 'height']);
});

test('unscaledLookup refuses a cycle', () => {
  const unscaled = unscaledLookup((id) => ({ a: { alias: 'b' }, b: { alias: 'a' } })[id]);
  assert.throws(() => unscaled('a'), /cycle/);
});

// Through the documents: a padding beside a floored height.
const padSources = (literal = 8) => {
  const docs = sources();
  docs['sys/space.tokens.json'] = { tanrei: { sys: { space: { $type: 'dimension', $extensions: voc, space75: { $value: px(6), $extensions: { [DERIVE]: { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 1.5 } } } } } } };
  docs['comp/button.tokens.json'].tanrei.comp.button['padding-block'] = { $value: px(literal), $extensions: { [DERIVE]: { fn: 'pad', of: '{tanrei.sys.space.space75}', height: '{tanrei.comp.button.height}' } } };
  return docs;
};

test('checkSources holds a pad rule to the literal beside it', () => {
  assert.deepEqual(checkSources(Object.values(padSources(8))), []);
  assert.deepEqual(checkSources(Object.values(padSources(6))), ['tanrei.comp.button.padding-block: rule gives 8, $value says 6']);
});

test('resolveNumericTokens: the padding follows the density and the floor its height follows', () => {
  const resolved = (tokens) => {
    const docs = resolveNumericTokens(padSources(), layer(tokens));
    return [valueOf(docs, 'tanrei.comp.button.height').value, valueOf(docs, 'tanrei.comp.button.padding-block').value];
  };
  assert.deepEqual(resolved({}), [36, 8]);
  assert.deepEqual(resolved({ 'tanrei.dial.density': { $value: 1.5, reason: 'A product used mostly by touch.' } }), [48, 14]);
  assert.deepEqual(resolved({ 'tanrei.sys.target.minimum': { $value: px(24), reason: 'A dense tool for a fine pointer.' } }), [32, 6]);
  assert.deepEqual(resolved({ 'tanrei.dial.density': { $value: 0.75, reason: 'A dense tool.' }, 'tanrei.sys.target.minimum': { $value: px(24), reason: 'A dense tool for a fine pointer.' } }), [24, 2]);
  assert.deepEqual(resolved({ 'tanrei.comp.button.height': { $value: px(44), reason: 'A product pins its Button.' } }), [44, 6], 'a pinned height has moved nothing');
});
