// The CSS emitter writes `add` as live arithmetic over custom properties, so a height set at runtime moves every step
// written from it, and a padding measured from such a step follows it. The expressions are held as written, and
// evaluated here — by a small reader of the CSS functions they use — against the engine's values for the same dials.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVE, VOCABULARY, mergeLayers, resolveNumericTokens, walkTokens } from '@tanrei/token-engine';
import { declarations, idToVar } from '../src/emit/css.js';

const px = (value) => ({ value, unit: 'px' });
const voc = { [VOCABULARY]: { rationale: 'One product sets how tall its controls are.' } };
const derive = (rule) => ({ [DERIVE]: rule });
const UNIT = '{tanrei.dial.size.unit}';
const HEIGHT = '{tanrei.dial.height}';
const MINIMUM = '{tanrei.sys.target.minimum}';
const add = (times, extra = {}) => derive({ fn: 'add', of: HEIGHT, by: UNIT, times, ...extra });
const sources = {
  'dial/dial.tokens.json': { tanrei: { dial: { $extensions: voc, size: { unit: { $type: 'dimension', $value: px(4) } }, height: { $type: 'dimension', $value: px(40) } } } },
  'sys/target.tokens.json': { tanrei: { sys: { target: { $type: 'dimension', $extensions: voc, minimum: { $value: px(24), $extensions: derive({ fixed: 'The developer’s value; no dial scales it.' }) } } } } },
  'sys/space.tokens.json': { tanrei: { sys: { space: { $type: 'dimension', $extensions: voc, space75: { $value: px(6), $extensions: derive({ fn: 'mul', of: UNIT, by: 1.5 }) } } } } },
  'sys/control.tokens.json': {
    tanrei: { sys: { control: { $type: 'dimension', $extensions: voc, height: {
      'extra-small': { $value: px(24), $extensions: add(-4) },
      small: { $value: px(32), $extensions: add(-2) },
      medium: { $value: px(40), $extensions: add(0) },
      large: { $value: px(56), $extensions: add(4) },
      half: { $value: px(42), $extensions: add(0.5) },
      next: { $value: px(44), $extensions: derive({ fn: 'add', of: HEIGHT, by: UNIT }) },
    } } } },
  },
  'comp/button.tokens.json': {
    tanrei: { comp: { button: { $type: 'dimension', $extensions: voc,
      small: { $value: px(32), $extensions: add(-2, { min: MINIMUM }) },
      'padding-block': { $value: px(6), $extensions: derive({ fn: 'pad', of: '{tanrei.sys.space.space75}', height: '{tanrei.comp.button.small}' }) },
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

test('add: of + by × times, a whole number of units unrounded, a fraction on the 0.25px step, then floored', () => {
  assert.equal(written('tanrei.sys.control.height.small'), 'calc(var(--tanrei-dial-height) + var(--tanrei-dial-size-unit) * -2)');
  assert.equal(written('tanrei.sys.control.height.medium'), 'calc(var(--tanrei-dial-height) + var(--tanrei-dial-size-unit) * 0)');
  assert.equal(written('tanrei.sys.control.height.next'), 'calc(var(--tanrei-dial-height) + var(--tanrei-dial-size-unit))', 'times absent is 1');
  assert.equal(written('tanrei.sys.control.height.half'), 'round(nearest, calc(var(--tanrei-dial-height) + var(--tanrei-dial-size-unit) * 0.5), 0.25px)');
  assert.equal(written('tanrei.comp.button.small'), 'max(var(--tanrei-sys-target-minimum), calc(var(--tanrei-dial-height) + var(--tanrei-dial-size-unit) * -2))');
});

test('pad over an add with a floor measures from the sum without it', () => {
  assert.equal(
    written('tanrei.comp.button.padding-block'),
    'max(0px, round(nearest, calc(var(--tanrei-sys-space-space75) + (var(--tanrei-comp-button-small) - calc(var(--tanrei-dial-height) + var(--tanrei-dial-size-unit) * -2)) / 2), 0.25px))',
  );
});

/**
 * The value of a custom property, reading every other property through `read` (px as plain numbers), the way a
 * browser reads the functions the emitter uses: calc, max and round(nearest, …), ties toward +∞.
 */
function evaluateCss(expression, read) {
  const js = expression
    .replace(/var\((--[a-z0-9-]+)\)/g, (_, name) => `(${read(name)})`)
    .replace(/round\(nearest, /g, 'R(')
    .replace(/calc\(/g, '(')
    .replace(/max\(/g, 'Math.max(')
    .replace(/(\d+(?:\.\d+)?)px/g, '$1');
  // eslint-disable-next-line no-new-func
  return new Function('R', `return ${js};`)((x, step) => Math.floor(x / step + 0.5 + 1e-9) * step);
}

test('the written CSS gives the engine’s values, across heights, floors and size units', () => {
  const byVar = Object.fromEntries(Object.keys(tokens).map((id) => [idToVar(id), id]));
  let compared = 0;
  for (const height of [24, 32, 34, 36, 40, 48, 56]) {
    for (const minimum of [24, 30, 36]) {
      for (const unit of [4, 4.5, 5]) {
        const layer = mergeLayers([{ id: 'acme', tokens: {
          'tanrei.dial.height': { $value: px(height), reason: 'The height under test.' },
          'tanrei.dial.size.unit': { $value: px(unit), reason: 'The size unit under test.' },
          'tanrei.sys.target.minimum': { $value: px(minimum), reason: 'The floor under test.' },
        } }]);
        const engine = Object.fromEntries(Object.values(resolveNumericTokens(sources, layer)).flatMap((doc) => [...walkTokens(doc)]).map(({ id, token }) => [id, token.$value]));
        const values = { '--tanrei-dial-height': height, '--tanrei-dial-size-unit': unit, '--tanrei-sys-target-minimum': minimum };
        const read = (name) => (values[name] ??= evaluateCss(written(byVar[name]), read));
        for (const [name, id] of Object.entries(byVar)) {
          if (name in values) continue;
          assert.equal(Number(read(name).toFixed(6)), engine[id].value, `${id} at height ${height}, minimum ${minimum}, size unit ${unit}`);
          compared += 1;
        }
      }
    }
  }
  assert.equal(compared, 7 * 3 * 3 * 9, 'nine derived tokens in each of 63 settings');
});
