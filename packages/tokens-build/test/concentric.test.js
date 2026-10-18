// A corner inside another at an inset — a row inside a menu's sheet, an option inside a list — is the outer corner
// less the inset, never below zero. A layer writes it with the `sub` rule, which every platform receives as its value
// and the web as the same subtraction over the two custom properties, so that it follows an outer corner a product
// sets at runtime. An inner corner annotated `dev.tanrei.concentric` is held to it in the default system.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emitCss } from '../src/emit/css.js';
import { checkInvariants } from '../src/invariants.js';
import { buildModel } from '../src/model.js';
import { resolveSystem } from '../src/resolve.js';

const OUTER = 'tanrei.comp.menu.surface.shape';
const INSET = 'tanrei.comp.menu.surface.padding-inline';
const INNER = 'tanrei.comp.menu.container.shape';
const cssVar = (id) => `--${id.split('.').join('-')}`;
const layer = (id, tokens) => ({ id, name: id, extends: 'tanrei', description: `A fixture layer: ${id}.`, tokens });
const sub = (by = `{${INSET}}`) => ({ derive: { fn: 'sub', of: `{${OUTER}}`, by } });

test('a layer derives an inner corner with sub: the value, and on the web the same subtraction, held at zero', async () => {
  const resolved = await resolveSystem({ layers: [layer('concentric', { [INNER]: sub() })] });
  const model = await resolved.model();
  assert.deepEqual(model.tokens[OUTER].value, { value: 8, unit: 'px' }, 'the premise: the default sheet is 8');
  assert.deepEqual(model.tokens[INSET].value, { value: 4, unit: 'px' }, 'and its rows stand 4 inside it');
  assert.deepEqual(model.tokens[INNER].value, { value: 4, unit: 'px' });
  const css = emitCss(model, { scope: 'concentric' });
  assert.ok(css.includes(`${cssVar(INNER)}: max(0px, calc(var(${cssVar(OUTER)}) - var(${cssVar(INSET)})));`), css.split('\n').find((line) => line.includes(cssVar(INNER))));
});

test('an inset wider than the outer corner leaves a square inner corner, not a negative one', async () => {
  const resolved = await resolveSystem({ layers: [layer('square', { [INNER]: sub('{tanrei.sys.space.space300}') })] });
  assert.deepEqual((await resolved.model()).tokens[INNER].value, { value: 0, unit: 'px' });
});

test('an annotated inner corner that is not its outer corner less the inset is refused in the default system, and says how to derive it', async () => {
  const model = await buildModel();
  const annotated = (value) => ({ ...model, tokens: { ...model.tokens, [INNER]: { ...model.tokens[INNER], value: { value, unit: 'px' }, concentric: { outer: `{${OUTER}}`, inset: `{${INSET}}` } } } });
  const about = (failures) => failures.filter((f) => f.includes('an inner corner is its outer corner less the inset'));
  const failures = about(checkInvariants(annotated(6)));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0], /^comp\.menu\.container\.shape: 6px, but .* max\(0, comp\.menu\.surface\.shape 8px − comp\.menu\.surface\.padding-inline 4px\) = 4px; derive it with \{ "fn": "sub", "of": "\{tanrei\.comp\.menu\.surface\.shape\}", "by": "\{tanrei\.comp\.menu\.surface\.padding-inline\}" \}$/);
  assert.deepEqual(about(checkInvariants(annotated(4))), []);
  // A preset keeps its original's corners.
  assert.deepEqual(about(checkInvariants({ ...annotated(6), system: 'm3-like' })), []);
  // An annotation that names no pair of dimensions says what it must be.
  const broken = { ...model, tokens: { ...model.tokens, [INNER]: { ...model.tokens[INNER], concentric: { outer: `{${OUTER}}` } } } };
  assert.deepEqual(checkInvariants(broken).filter((f) => f.includes('dev.tanrei.concentric names')).length, 1);
});
