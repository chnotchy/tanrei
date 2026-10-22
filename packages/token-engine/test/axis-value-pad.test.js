// A size a layer adds to a component (an axis value cloned `from` another, maybe scaled) whose block padding follows
// its box's height (`pad`): the clone measures the height cloned beside it, and a scale multiplies the padding (pad's
// `by`) while it still follows its box. (A member is scaled by the `$type` of its own group, as in the component
// documents.) And `pad`'s `by` on its own: evaluated, refused when it is not a number, and what a layer's `scale` of a
// pad token multiplies.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVE, evaluateNumeric, mergeLayers, resolveNumericTokens, walkTokens } from '../src/index.js';

const px = (value) => ({ value, unit: 'px' });
const voc = { 'dev.tanrei.vocabulary': { rationale: 'A test token.' } };
const sources = () => ({
  'dial/dial.tokens.json': { tanrei: { dial: { $extensions: voc, size: { unit: { $type: 'dimension', $value: px(4) } }, density: { $type: 'number', $value: 1 } } } },
  'sys/measure.tokens.json': {
    tanrei: {
      sys: {
        $extensions: voc,
        $type: 'dimension',
        target: { minimum: { $value: px(32), $extensions: { [DERIVE]: { fixed: 'The developer’s value.' } } } },
        space: { space75: { $value: px(6), $extensions: { [DERIVE]: { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 1.5 } } } },
      },
    },
  },
  'comp/button.tokens.json': {
    tanrei: {
      comp: {
        button: {
          $type: 'dimension',
          $extensions: { ...voc, 'dev.tanrei.axes': { size: { default: 'large', values: ['large'], members: ['container.height', 'container.padding-block'] } } },
          container: {
            height: { $type: 'dimension', large: { $value: px(56), $extensions: { [DERIVE]: { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 14, times: '{tanrei.dial.density}', round: '{tanrei.dial.size.unit}', min: '{tanrei.sys.target.minimum}' } } } },
            'padding-block': { $type: 'dimension', large: { $value: px(6), $extensions: { [DERIVE]: { fn: 'pad', of: '{tanrei.sys.space.space75}', height: '{tanrei.comp.button.container.height.large}' } } } },
          },
        },
      },
    },
  },
});
const system = ({ scale, tokens = {} } = {}) =>
  mergeLayers([{ id: 'acme', vocabulary: { 'tanrei.comp.button.size.huge': { from: 'large', ...(scale ? { scale } : {}), rationale: 'A hero call to action.' } }, tokens }]);
const tokenOf = (docs, id) => Object.values(docs).flatMap((doc) => [...walkTokens(doc)]).find((entry) => entry.id === id).token;
const DENSE = { 'tanrei.dial.density': { $value: 0.75, reason: 'A dense tool, for the test.' } };

test('a cloned pad measures the height cloned beside it, not the one it was cloned from', () => {
  const docs = resolveNumericTokens(sources(), system({ tokens: DENSE }));
  assert.equal(tokenOf(docs, 'tanrei.comp.button.container.padding-block.huge').$extensions[DERIVE].height, '{tanrei.comp.button.container.height.huge}');
  // 56 × 0.75 = 42 → 44 on the grid: 12 less than 56, so 6 less above and below, never below zero.
  assert.deepEqual(tokenOf(docs, 'tanrei.comp.button.container.height.huge').$value, px(44));
  assert.deepEqual(tokenOf(docs, 'tanrei.comp.button.container.padding-block.huge').$value, px(0));
});

test('a scaled size: its height and its padding scale, and the padding still follows its box', () => {
  const at = (tokens) => {
    const docs = resolveNumericTokens(sources(), system({ scale: 1.5, tokens }));
    return [tokenOf(docs, 'tanrei.comp.button.container.height.huge').$value.value, tokenOf(docs, 'tanrei.comp.button.container.padding-block.huge').$value.value];
  };
  assert.deepEqual(tokenOf(resolveNumericTokens(sources(), system({ scale: 1.5 })), 'tanrei.comp.button.container.padding-block.huge').$extensions[DERIVE], { fn: 'pad', of: '{tanrei.sys.space.space75}', height: '{tanrei.comp.button.container.height.huge}', by: 1.5 });
  assert.deepEqual(at({}), [84, 9], '56 × 1.5 and 6 × 1.5, as a scaled alias gave');
  // 84 × 1.25 = 105 → 104 on the grid: 20 more, so 10 more above and below.
  assert.deepEqual(at({ 'tanrei.dial.density': { $value: 1.25, reason: 'A product used by touch, for the test.' } }), [104, 19]);
  assert.deepEqual(at(DENSE), [64, 0], '84 × 0.75 = 63 → 64: 10 less on each side of 9, never below zero');
});

test('a scaled size whose pad member the layer values: the layer’s value', () => {
  const tokens = { 'tanrei.comp.button.container.padding-block.huge': { $value: '{tanrei.sys.space.space75}' } };
  const docs = resolveNumericTokens(sources(), system({ scale: 1.5, tokens }));
  assert.equal(tokenOf(docs, 'tanrei.comp.button.container.padding-block.huge').$value, '{tanrei.sys.space.space75}', 'the alias the layer wrote');
});

test('pad: by multiplies of on the 0.25px step, before what the box gave up or took', () => {
  const lookup = (id) => ({ padding: { value: 6, unit: 'px' }, height: { value: 40, unit: 'px' } })[id];
  const unscaled = () => ({ value: 32, unit: 'px' });
  const pad = (by) => evaluateNumeric({ fn: 'pad', of: '{padding}', height: '{height}', ...(by === undefined ? {} : { by }) }, lookup, { type: 'dimension', unscaled });
  assert.deepEqual(pad(), px(10), 'absent: 1 — 6 + 8 / 2');
  assert.deepEqual(pad(1.5), px(13), '9 + 4');
  assert.deepEqual(pad(1.1), px(10.5), '6.6 → 6.5 on the step, + 4');
  assert.deepEqual(pad(0), px(4));
  assert.deepEqual(evaluateNumeric({ fn: 'pad', of: '{padding}', height: '{height}', by: 1.5 }, lookup, { type: 'dimension', unscaling: true }), px(9), 'unscaled: of × by');
  assert.throws(() => pad(-1), /"pad" by must be a number of zero or more; it is -1/);
  assert.throws(() => pad('{x}'), /"pad" by must be a number of zero or more/);
});

test('a layer that scales a pad token multiplies its by', () => {
  const tokens = { 'tanrei.comp.button.container.padding-block.large': { scale: 2 } };
  const docs = resolveNumericTokens(sources(), mergeLayers([{ id: 'acme', tokens }]));
  assert.deepEqual(tokenOf(docs, 'tanrei.comp.button.container.padding-block.large').$value, px(12), '6 × 2, where the box has not moved');
  assert.equal(tokenOf(docs, 'tanrei.comp.button.container.padding-block.large').$extensions[DERIVE].by, 2);
});
