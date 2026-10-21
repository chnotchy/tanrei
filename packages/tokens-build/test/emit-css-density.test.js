// The CSS emitter writes `mul` with `times`, `round` and `min`, and `pad`, as live arithmetic over custom properties,
// so a density, a floor or a size unit set at runtime moves a height and its padding together. The expressions are
// held as written, and evaluated here — by a small reader of the CSS functions they use — against the engine's values
// for the same dials. No token of the default system uses these forms yet.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVE, VOCABULARY, mergeLayers, resolveNumericTokens, walkTokens } from '@tanrei/token-engine';
import { declarations, idToVar } from '../src/emit/css.js';

const px = (value) => ({ value, unit: 'px' });
const voc = { [VOCABULARY]: { rationale: 'One product sets how much room its controls take.' } };
const derive = (rule) => ({ [DERIVE]: rule });
const UNIT = '{tanrei.dial.size.unit}';
const DENSITY = '{tanrei.dial.density}';
const MINIMUM = '{tanrei.sys.target.minimum}';
const sources = {
  'dial/dial.tokens.json': { tanrei: { dial: { $extensions: voc, size: { unit: { $type: 'dimension', $value: px(4) } }, density: { $type: 'number', $value: 1 } } } },
  'sys/target.tokens.json': { tanrei: { sys: { target: { $type: 'dimension', $extensions: voc, minimum: { $value: px(36), $extensions: derive({ fixed: 'The developer’s value; no dial scales it.' }) } } } } },
  'sys/space.tokens.json': { tanrei: { sys: { space: { $type: 'dimension', $extensions: voc, space75: { $value: px(6), $extensions: derive({ fn: 'mul', of: UNIT, by: 1.5 }) }, space25: { $value: px(2), $extensions: derive({ fn: 'mul', of: UNIT, by: 0.5 }) } } } } },
  'sys/control.tokens.json': { tanrei: { sys: { control: { $type: 'dimension', $extensions: voc, height: { small: { $value: px(32), $extensions: derive({ fn: 'mul', of: UNIT, by: 8, times: DENSITY, round: UNIT }) } } } } } },
  'comp/button.tokens.json': {
    tanrei: { comp: { button: { $type: 'dimension', $extensions: voc,
      height: { $value: px(36), $extensions: derive({ fn: 'mul', of: '{tanrei.sys.control.height.small}', by: 1, min: MINIMUM }) },
      'large-height': { $value: px(56), $extensions: derive({ fn: 'mul', of: UNIT, by: 14, times: DENSITY, round: UNIT, min: MINIMUM }) },
      'row-height': { $value: '{tanrei.comp.button.height}' },
      'padding-block': { $value: px(8), $extensions: derive({ fn: 'pad', of: '{tanrei.sys.space.space75}', height: '{tanrei.comp.button.row-height}' }) },
      gap: { $value: px(6), $extensions: derive({ fn: 'mul', of: '{tanrei.sys.space.space75}', by: 1, times: DENSITY, round: '{tanrei.sys.space.space25}' }) },
      'fixed-padding': { $value: px(6), $extensions: derive({ fn: 'pad', of: '{tanrei.sys.space.space75}', height: '{tanrei.sys.target.minimum}' }) },
    } } },
  },
};

/** The emitter's view of each token (the IR's `alias` and `derive`), by id. */
function modelTokens(docs) {
  const tokens = {};
  for (const doc of Object.values(docs)) {
    for (const { id, token, type } of walkTokens(doc)) {
      const alias = typeof token.$value === 'string' ? token.$value.slice(1, -1) : undefined;
      tokens[id] = { id, type, path: id.split('.').slice(1), alias, derive: token.$extensions?.[DERIVE], value: token.$value };
    }
  }
  return tokens;
}
const tokens = modelTokens(sources);
const written = (id) => declarations(tokens[id], tokens)[0][1];

test('mul: times, round and min are written in the engine’s order — rounded to the step, then floored', () => {
  assert.equal(written('tanrei.comp.button.large-height'), 'max(var(--tanrei-sys-target-minimum), round(nearest, calc(var(--tanrei-dial-size-unit) * 14 * var(--tanrei-dial-density)), var(--tanrei-dial-size-unit)))');
  assert.equal(written('tanrei.sys.control.height.small'), 'round(nearest, calc(var(--tanrei-dial-size-unit) * 8 * var(--tanrei-dial-density)), var(--tanrei-dial-size-unit))', 'times and round, no floor');
  assert.equal(written('tanrei.comp.button.height'), 'max(var(--tanrei-sys-target-minimum), var(--tanrei-sys-control-height-small))', 'a floored alias of a step');
  assert.equal(written('tanrei.comp.button.gap'), 'round(nearest, calc(var(--tanrei-sys-space-space75) * var(--tanrei-dial-density)), var(--tanrei-sys-space-space25))', 'a coefficient of 1 is left out');
});

test('mul without the new terms is written as before', () => {
  assert.equal(written('tanrei.sys.space.space75'), 'round(nearest, calc(var(--tanrei-dial-size-unit) * 1.5), 0.25px)');
  const only = (rule, type = 'dimension') => declarations({ id: 'tanrei.comp.x.y', type, path: ['comp', 'x', 'y'], derive: rule }, tokens)[0][1];
  assert.equal(only({ fn: 'mul', of: UNIT, by: 1 }), 'var(--tanrei-dial-size-unit)');
  assert.equal(only({ fn: 'mul', of: '{tanrei.dial.density}', by: 2 }, 'number'), 'calc(var(--tanrei-dial-density) * 2)');
  assert.equal(only({ fn: 'mul', of: UNIT, by: 1, min: MINIMUM }), 'max(var(--tanrei-sys-target-minimum), var(--tanrei-dial-size-unit))', 'min alone');
  assert.equal(only({ fn: 'mul', of: UNIT, by: 11, round: UNIT }), 'round(nearest, calc(var(--tanrei-dial-size-unit) * 11), var(--tanrei-dial-size-unit))', 'round alone');
  assert.equal(only({ fn: 'mul', of: UNIT, by: 8, times: DENSITY }), 'round(nearest, calc(var(--tanrei-dial-size-unit) * 8 * var(--tanrei-dial-density)), 0.25px)', 'times alone');
});

test('pad: written over the height and the height’s own expression unscaled, through its alias', () => {
  assert.equal(
    written('tanrei.comp.button.padding-block'),
    'max(0px, round(nearest, calc(var(--tanrei-sys-space-space75) + (var(--tanrei-comp-button-row-height) - round(nearest, calc(var(--tanrei-dial-size-unit) * 8), var(--tanrei-dial-size-unit))) / 2), 0.25px))',
  );
  assert.equal(written('tanrei.comp.button.fixed-padding'), 'max(0px, round(nearest, calc(var(--tanrei-sys-space-space75) + (var(--tanrei-sys-target-minimum) - var(--tanrei-sys-target-minimum)) / 2), 0.25px))', 'a height nothing scales is its own height₁');
  assert.throws(() => declarations(tokens['tanrei.comp.button.padding-block'])[0][1], /no tokens were given/);
});

/**
 * The value of a custom property, reading every other property through `read` (px as plain numbers), the way a
 * browser reads the functions the emitter uses: calc, max, round(nearest, …) — ties toward +∞ — and pow.
 */
function evaluateCss(expression, read) {
  const js = expression
    .replace(/var\((--[a-z0-9-]+)\)/g, (_, name) => `(${read(name)})`)
    .replace(/round\(nearest, /g, 'R(')
    .replace(/calc\(/g, '(')
    .replace(/max\(/g, 'Math.max(')
    .replace(/pow\(/g, 'Math.pow(')
    .replace(/(\d+(?:\.\d+)?)px/g, '$1');
  // eslint-disable-next-line no-new-func
  return new Function('R', `return ${js};`)((x, step) => Math.floor(x / step + 0.5 + 1e-9) * step);
}

test('the written CSS gives the engine’s values, across densities, floors and size units', () => {
  const byVar = Object.fromEntries(Object.keys(tokens).map((id) => [idToVar(id), id]));
  let compared = 0;
  for (const density of [0.75, 0.9, 0.95, 1, 1.25, 1.5]) {
    for (const minimum of [24, 30, 36, 48]) {
      for (const unit of [4, 5]) {
        const layer = mergeLayers([{ id: 'acme', tokens: {
          'tanrei.dial.density': { $value: density, reason: 'The density under test.' },
          'tanrei.dial.size.unit': { $value: px(unit), reason: 'The size unit under test.' },
          'tanrei.sys.target.minimum': { $value: px(minimum), reason: 'The floor under test.' },
        } }]);
        const engine = Object.fromEntries(Object.values(resolveNumericTokens(sources, layer)).flatMap((doc) => [...walkTokens(doc)]).map(({ id, token }) => [id, token.$value]));
        // What the page sets: the three properties a product writes; every other one is the emitter's expression.
        const values = { '--tanrei-dial-density': density, '--tanrei-dial-size-unit': unit, '--tanrei-sys-target-minimum': minimum };
        const read = (name) => (values[name] ??= evaluateCss(written(byVar[name]), read));
        for (const [name, id] of Object.entries(byVar)) {
          if (name in values || typeof engine[id] === 'string') continue; // a dial, the floor, an alias
          assert.equal(Number(read(name).toFixed(6)), engine[id].value, `${id} at density ${density}, minimum ${minimum}, size unit ${unit}`);
          compared += 1;
        }
      }
    }
  }
  assert.equal(compared, 6 * 4 * 2 * 8, 'eight derived tokens in each of 48 settings');
});
