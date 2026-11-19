// The rule forms a height is written in: `mul` with `round` (the step its result lands on) and `min` (a floor applied
// after rounding), and `pad`, the block padding of such a box, which gives up half of what its box lost and takes half
// of what it gained. These tests hold the arithmetic on its own, and through the documents.
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
const at = ({ unit = 4, minimum = 36 } = {}) => values({ unit: px(unit), minimum: px(minimum), grid: px(unit), space25: px(2) });
const height = (by, fields) => ({ fn: 'mul', of: '{unit}', by, ...fields });
const full = (by) => height(by, { round: '{grid}', min: '{minimum}' });

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
  // 4.75 × 8 = 38, half way between 36 and 40 on a grid of 4.
  assert.deepEqual(evaluateNumeric({ fn: 'mul', of: '{unit}', by: 8, round: '{space25}' }, values({ unit: px(4.75), space25: px(4) }), dim), px(40));
  // 0.15 / 0.1 is 1.4999999999999998 in binary: the noise does not decide the tie.
  assert.equal(roundToStep(0.15, 0.1), 0.2);
  assert.equal(roundToStep(0.1 * 3, 0.1), 0.3, 'a step that is not exact in binary gives a clean multiple');
  assert.equal(roundToStep(-6, 4), -4, 'ties go toward +∞, as CSS round(nearest) does');
});

test('mul: the floor applies after rounding, so a floor off the grid gives exactly the floor', () => {
  assert.deepEqual(evaluateNumeric(full(6), at({ minimum: 30 }), dim), px(30), '24 on the grid, held at 30');
  assert.deepEqual(evaluateNumeric(full(8), at({ minimum: 30 }), dim), px(32), '32 above the floor: 32');
  assert.deepEqual(evaluateNumeric(height(7.5, { round: '{grid}', min: '{minimum}' }), at({ minimum: 29 }), dim), px(32), '30 rounds to 32, above the floor: not 30');
  for (const minimum of [24, 32, 48]) assert.deepEqual(evaluateNumeric(full(8), at({ minimum }), dim), px(Math.max(minimum, 32)), `minimum ${minimum}`);
});

test('mul: the terms are tokens, in the units they must have, and it has no times', () => {
  const lookup = values({ unit: px(4), number: { value: 1 }, ms: { value: 4, unit: 'ms' }, zero: px(0) });
  assert.throws(() => evaluateNumeric(height(8, { min: 36 }), lookup, dim), /min must be a token/);
  assert.throws(() => evaluateNumeric(height(8, { round: '{ms}' }), lookup, dim), /round \{ms\} \(ms\) is not in the unit of \{unit\} \(px\)/);
  assert.throws(() => evaluateNumeric(height(8, { min: '{number}' }), lookup, dim), /min \{number\} \(no unit\) is not in the unit/);
  assert.throws(() => evaluateNumeric(height(8, { round: '{zero}' }), lookup, dim), /must be above zero/);
  assert.throws(() => evaluateNumeric(height(8, { times: '{number}' }), lookup, dim), /"mul" has no "times"/);
});

test('mul: the terms are dependencies', () => {
  assert.deepEqual(ruleDependencies(full(8)), ['unit', 'grid', 'minimum']);
});

// The same through the documents: a source checked against its literal, and a layer that sets the size unit or the floor.
const voc = { [VOCABULARY]: { rationale: 'One product sets how much room its controls take.' } };
const fixedReason = { [DERIVE]: { fixed: 'The developer’s value; no dial scales it.' } };
const RULE = { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 8, round: '{tanrei.dial.size.unit}', min: '{tanrei.sys.target.minimum}' };
const sources = (literal = 36) => ({
  'dial/dial.tokens.json': { tanrei: { dial: { $extensions: voc, size: { unit: { $type: 'dimension', $value: px(4) } } } } },
  'sys/target.tokens.json': { tanrei: { sys: { target: { $type: 'dimension', $extensions: voc, minimum: { $value: px(36), $extensions: fixedReason } } } } },
  'comp/button.tokens.json': { tanrei: { comp: { button: { $type: 'dimension', $extensions: voc, height: { $value: px(literal), $extensions: { [DERIVE]: RULE } } } } } },
});
const valueOf = (docs, id) => Object.values(docs).flatMap((doc) => [...walkTokens(doc)]).find((entry) => entry.id === id).token.$value;
const layer = (tokens) => mergeLayers([{ id: 'acme', tokens }]);
const UNIT_6 = { 'tanrei.dial.size.unit': { $value: px(6), reason: 'A product used mostly by touch.' } };
const UNIT_3 = { 'tanrei.dial.size.unit': { $value: px(3), reason: 'A dense tool.' } };
const MINIMUM_24 = { 'tanrei.sys.target.minimum': { $value: px(24), reason: 'A dense tool for a fine pointer.' } };

test('checkSources holds a mul with round and min to the literal beside it', () => {
  assert.deepEqual(checkSources(Object.values(sources(36))), []);
  assert.deepEqual(checkSources(Object.values(sources(32))), ['tanrei.comp.button.height: rule gives 36, $value says 32']);
});

test('resolveNumericTokens: a layer that sets the size unit or the minimum moves the height', () => {
  const resolved = (tokens) => valueOf(resolveNumericTokens(sources(), layer(tokens)), 'tanrei.comp.button.height');
  assert.deepEqual(resolved({}), px(36));
  assert.deepEqual(resolved(UNIT_6), px(48));
  assert.deepEqual(resolved(MINIMUM_24), px(32));
  assert.deepEqual(resolved({ ...UNIT_3, ...MINIMUM_24 }), px(24));
  assert.deepEqual(resolved({ 'tanrei.comp.button.height': { scale: 0.5 } }), px(36), 'a scale keeps the floor: 16 is held at 36');
});

// `pad`: the block padding of a box whose height moves gives up half of what the height lost, and takes half of what
// it gained from the size unit or from the floor, so the box stays 2 × padding + one line.
const tableOf = ({ unit = 4, minimum = 36, padding = 6 } = {}) => ({
  unit: { rule: { fn: 'mul', of: '{dial}', by: 1 }, type: 'dimension' },
  dial: { value: px(unit) },
  minimum: { value: px(minimum) },
  padding: { value: px(padding) },
  // The ladder step; the pressable height aliases it, floored.
  step: { rule: { fn: 'mul', of: '{unit}', by: 8, round: '{unit}' }, type: 'dimension' },
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

test('pad: the height₁ it measures from drops every min, through aliases and of', () => {
  const { lookup, unscaled } = graph(tableOf({ minimum: 36 }));
  assert.deepEqual(lookup('height'), px(36), 'held at the floor');
  assert.deepEqual(unscaled('height'), px(32), 'without the floor');
  assert.deepEqual(unscaled('alias'), px(32));
});

test('pad: a box the floor grows takes half of what it gained', () => {
  assert.deepEqual(graph(tableOf({ minimum: 36 })).pad(), px(8), 'a small Button held at 36: 6 + 2');
  assert.deepEqual(graph(tableOf({ minimum: 48 })).pad(), px(14), '48 from 32: 6 + 8');
  assert.deepEqual(graph(tableOf({ minimum: 24 })).pad(), px(6), 'nothing moved: the padding as it was');
});

test('pad: a size unit moves the height and its height₁ together: nothing given up', () => {
  for (const unit of [3, 4, 5, 6]) assert.deepEqual(graph(tableOf({ unit, minimum: 0 })).pad(), px(6), `size unit ${unit}`);
});

test('pad: a box that shrinks gives up half of what it lost, never below zero', () => {
  const lookup = values({ padding: px(6), height: px(28), short: px(16) });
  const unscaled = () => px(32);
  assert.deepEqual(evaluateNumeric({ fn: 'pad', of: '{padding}', height: '{height}' }, lookup, { ...dim, unscaled }), px(4), '28 from 32: 2 less above and below');
  assert.deepEqual(evaluateNumeric({ fn: 'pad', of: '{padding}', height: '{short}' }, lookup, { ...dim, unscaled }), px(0), '16 from 32 would take 8 from 6');
});

test('pad: the box stays 2 × padding + one line wherever the padding is above zero', () => {
  for (const minimum of [24, 32, 36, 48]) {
    const { lookup, pad } = graph(tableOf({ minimum }));
    assert.equal(lookup('height').value - 2 * pad().value, 32 - 2 * 6, `minimum ${minimum}`);
  }
});

test('pad: rounds to 0.25px', () => {
  // 32 held at 33.5: 6 + 0.75 → 6.75.
  assert.deepEqual(graph(tableOf({ minimum: 33.5 })).pad(), px(6.75));
});

test('pad: a height with no rule (a pinned value) has moved nothing', () => {
  const table = { ...tableOf({ minimum: 48 }), pinned: { value: px(40) } };
  assert.deepEqual(graph(table).pad('pinned'), px(6));
});

test('pad: unscaled, a padding is its of; it needs the unscaled lookup, two tokens and one unit', () => {
  const { unscaled } = graph({ ...tableOf({ minimum: 48 }), padded: { rule: { fn: 'pad', of: '{padding}', height: '{height}' }, type: 'dimension' } });
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

test('resolveNumericTokens: the padding follows the floor its height follows', () => {
  const resolved = (tokens) => {
    const docs = resolveNumericTokens(padSources(), layer(tokens));
    return [valueOf(docs, 'tanrei.comp.button.height').value, valueOf(docs, 'tanrei.comp.button.padding-block').value];
  };
  assert.deepEqual(resolved({}), [36, 8]);
  assert.deepEqual(resolved(UNIT_6), [48, 9], 'the size unit moves the padding’s own space and the height together');
  assert.deepEqual(resolved(MINIMUM_24), [32, 6]);
  assert.deepEqual(resolved({ ...UNIT_3, ...MINIMUM_24 }), [24, 4.5]);
  assert.deepEqual(resolved({ 'tanrei.comp.button.height': { $value: px(44), reason: 'A product pins its Button.' } }), [44, 6], 'a pinned height has moved nothing');
});
