// `add`: a step a number of units from another value, `max(min, of + by × times)`. A ladder written with it from one
// height keeps its distances whatever that height is.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVE, VOCABULARY, checkSources, evaluateNumeric, mergeLayers, resolveNumericTokens, ruleDependencies, unscaledLookup, walkTokens } from '../src/index.js';

const px = (value) => ({ value, unit: 'px' });
const dim = { type: 'dimension' };
const at = (values) => (id) => {
  if (!(id in values)) throw new Error(`unknown {${id}}`);
  return typeof values[id] === 'number' ? px(values[id]) : values[id];
};
const step = (times, extra = {}) => ({ fn: 'add', of: '{height}', by: '{unit}', times, ...extra });

test('add: of + by × times, in the unit of of', () => {
  const lookup = at({ height: 40, unit: 4, minimum: 36 });
  assert.deepEqual(evaluateNumeric(step(-4), lookup, dim), px(24));
  assert.deepEqual(evaluateNumeric(step(-2), lookup, dim), px(32));
  assert.deepEqual(evaluateNumeric(step(0), lookup, dim), px(40));
  assert.deepEqual(evaluateNumeric(step(4), lookup, dim), px(56));
  assert.deepEqual(evaluateNumeric(step(8), lookup, dim), px(72));
  assert.deepEqual(evaluateNumeric({ fn: 'add', of: '{height}', by: '{unit}' }, lookup, dim), px(44), 'times absent is 1');
});

test('add: a height off the grid gives steps equally off it; a fraction of a unit lands on the 0.25px grid', () => {
  assert.deepEqual(evaluateNumeric(step(-2), at({ height: 34, unit: 4 }), dim), px(26));
  assert.deepEqual(evaluateNumeric(step(0.3), at({ height: 40, unit: 4.5 }), dim), px(41.25), '41.35 on the 0.25 grid');
  assert.deepEqual(evaluateNumeric(step(1), at({ height: 40.5, unit: 0.25 }), dim), px(40.75));
});

test('add: min is a floor applied to the sum, and dropped where nothing is scaled (unscaledLookup)', () => {
  const lookup = at({ height: 32, unit: 4, minimum: 28 });
  assert.deepEqual(evaluateNumeric(step(-2, { min: '{minimum}' }), lookup, dim), px(28), '24 held at 28');
  assert.deepEqual(evaluateNumeric(step(2, { min: '{minimum}' }), lookup, dim), px(40), 'a sum above the floor is the sum');
  assert.deepEqual(evaluateNumeric(step(-2, { min: '{minimum}' }), lookup, { ...dim, unscaling: true }), px(24));
  const unscaled = unscaledLookup((id) => ({ small: { rule: step(-2, { min: '{minimum}' }), type: 'dimension' } })[id] ?? { value: lookup(id) });
  assert.deepEqual(unscaled('small'), px(24));
});

test('add: a duration and a number add the same way', () => {
  assert.deepEqual(evaluateNumeric({ fn: 'add', of: '{a}', by: '{b}', times: 3 }, at({ a: { value: 100, unit: 'ms' }, b: { value: 50, unit: 'ms' } }), { type: 'duration' }), { value: 250, unit: 'ms' });
  assert.deepEqual(evaluateNumeric({ fn: 'add', of: '{a}', by: '{b}', times: -1 }, at({ a: { value: 1 }, b: { value: 0.25 } }), { type: 'number' }), { value: 0.75, unit: undefined });
});

test('add refuses what it cannot add', () => {
  const lookup = at({ height: 40, unit: 4, ms: { value: 50, unit: 'ms' } });
  assert.throws(() => evaluateNumeric({ fn: 'add', of: '{height}', by: 4 }, lookup, dim), /"add" needs "of" and "by", each a token/);
  assert.throws(() => evaluateNumeric({ fn: 'add', of: 40, by: '{unit}' }, lookup, dim), /"add" needs "of" and "by"/);
  assert.throws(() => evaluateNumeric(step('{unit}'), lookup, dim), /"add" times must be a number/);
  assert.throws(() => evaluateNumeric(step(1, { min: 36 }), lookup, dim), /"add" min must be a token/);
  assert.throws(() => evaluateNumeric({ fn: 'add', of: '{height}', by: '{ms}' }, lookup, dim), /"add" by \{ms\} \(ms\) is not in the unit of \{height\} \(px\)/);
  assert.throws(() => evaluateNumeric(step(1, { min: '{ms}' }), lookup, dim), /"add" min \{ms\} \(ms\) is not in the unit of \{height\} \(px\)/);
});

test('ruleDependencies: of, by and min, never the number times', () => {
  assert.deepEqual(ruleDependencies(step(-2, { min: '{minimum}' })), ['height', 'unit', 'minimum']);
});

const voc = { [VOCABULARY]: { rationale: 'One product sets how tall its controls are.' } };
const sources = {
  'dial/dial.tokens.json': { tanrei: { dial: { $extensions: voc, size: { unit: { $type: 'dimension', $value: px(4) } }, height: { $type: 'dimension', $value: px(40) } } } },
  'sys/control.tokens.json': {
    tanrei: { sys: { control: { $type: 'dimension', $extensions: voc, height: {
      small: { $value: px(32), $extensions: { [DERIVE]: { fn: 'add', of: '{tanrei.dial.height}', by: '{tanrei.dial.size.unit}', times: -2 } } },
      medium: { $value: px(40), $extensions: { [DERIVE]: { fn: 'add', of: '{tanrei.dial.height}', by: '{tanrei.dial.size.unit}', times: 0 } } },
      large: { $value: px(56), $extensions: { [DERIVE]: { fn: 'add', of: '{tanrei.dial.height}', by: '{tanrei.dial.size.unit}', times: 4 } } },
    } } } },
  },
};
const values = (docs) => Object.fromEntries(Object.values(docs).flatMap((doc) => [...walkTokens(doc)]).map(({ id, token }) => [id, token.$value.value]));

test('checkSources holds an add rule to the literal next to it', () => {
  assert.deepEqual(checkSources(Object.values(sources)), []);
  const wrong = structuredClone(sources);
  wrong['sys/control.tokens.json'].tanrei.sys.control.height.large.$value = px(52);
  assert.deepEqual(checkSources(Object.values(wrong)), ['tanrei.sys.control.height.large: rule gives 56, $value says 52']);
});

test('a ladder written with add follows its height through a layer, its distances kept', () => {
  for (const [height, expected] of [[40, [32, 40, 56]], [36, [28, 36, 52]], [32, [24, 32, 48]]]) {
    const system = mergeLayers([{ id: 'acme', tokens: { 'tanrei.dial.height': { $value: px(height), reason: 'The height under test.' } } }]);
    const got = values(resolveNumericTokens(sources, system));
    assert.deepEqual(['small', 'medium', 'large'].map((s) => got[`tanrei.sys.control.height.${s}`]), expected, `at ${height}`);
  }
});
