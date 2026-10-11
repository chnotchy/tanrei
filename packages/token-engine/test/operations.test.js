import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CANNOT, dependencyIndex, extensionRecipes, legalOperations, tokenKind } from '../src/index.js';

const corner = { id: 'tanrei.sys.shape.corner.small', type: 'dimension', value: { value: 6, unit: 'px' }, alias: null, rule: { fn: 'mul', of: '{tanrei.dial.shape.unit}', by: 3 }, state: false };
const gap = { id: 'tanrei.comp.button.container.gap.medium', type: 'dimension', value: { value: 8, unit: 'px' }, alias: 'tanrei.sys.space.space100', rule: null, state: false };
const full = { id: 'tanrei.sys.shape.corner.full', type: 'dimension', value: { value: 9999, unit: 'px' }, alias: null, rule: { fixed: 'A pill is a pill at any scale.' }, state: false };
const hovered = { id: 'tanrei.comp.button.filled.hovered.container.color', type: 'color', value: null, alias: null, rule: { fn: 'mix' }, state: 'hovered' };

test('the kind of a token decides what a layer may write', () => {
  assert.equal(tokenKind(corner), 'derived');
  assert.equal(tokenKind(gap), 'alias');
  assert.equal(tokenKind(full), 'fixed');
  assert.equal(tokenKind({ id: 'tanrei.dial.type.base', alias: null, rule: null }), 'dial');
  assert.deepEqual(legalOperations(corner).map((o) => o.op), ['scale', 're-point alias', 'derive', 'pin $value']);
  assert.deepEqual(legalOperations(corner)[0].write, { tokens: { 'tanrei.sys.shape.corner.small': { scale: 1.5 } } });
  assert.deepEqual(legalOperations(gap).slice(0, 2).map((o) => o.op), ['re-point alias', 'scale']);
  assert.ok(!legalOperations(full).some((o) => o.op === 'scale'), 'a fixed value cannot be scaled');
  assert.deepEqual(legalOperations({ id: 'tanrei.dial.type.base', type: 'dimension', value: { value: 16, unit: 'px' }, alias: null, rule: null }).map((o) => o.op), ['set the dial']);
  assert.equal(legalOperations(hovered).at(-1).write.rules[0].match, 'tanrei.comp.*.*.hovered.container.color');
  assert.ok(legalOperations({ id: 'tanrei.sys.color.primary', type: 'color', alias: null, rule: { palette: 'neutral' } }).some((o) => o.op === 'declare a single role'));
});

test('every token also says how vocabulary is ADDED next to it', () => {
  const step = extensionRecipes(corner, 'acme');
  assert.deepEqual(step.map((r) => r.op), ['add a step to this series', 'add your own token']);
  assert.ok('tanrei.sys.shape.corner.<new-step>' in step[0].write.vocabulary);
  assert.ok('acme.comp.<your-component>.<part>' in step[1].write.vocabulary);
  const size = extensionRecipes({ ...gap, id: 'tanrei.comp.button.container.height.large', axis: { id: 'tanrei.comp.button.size', key: 'large', values: ['small', 'medium', 'large'] } }, 'acme');
  assert.deepEqual(size[0].write.vocabulary['tanrei.comp.button.size.<new-value>'].from, 'large');
  assert.ok(CANNOT.some((c) => /additive only/.test(c)) && CANNOT.some((c) => /interaction state/.test(c)));
});

test('the dependency index answers "what follows this?"', () => {
  const docs = { a: { tanrei: { dial: { space: { unit: { $type: 'dimension', $value: { value: 8, unit: 'px' } } } }, sys: { space: { $type: 'dimension', space100: { $value: { value: 8, unit: 'px' }, $extensions: { 'dev.tanrei.derive': { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 1 } } } } }, comp: { button: { gap: { $type: 'dimension', $value: '{tanrei.sys.space.space100}' } } } } } };
  const { dependents, followers } = dependencyIndex(docs);
  assert.deepEqual([...dependents.get('tanrei.dial.space.unit')], ['tanrei.sys.space.space100']);
  assert.deepEqual([...followers('tanrei.dial.space.unit')].sort(), ['tanrei.comp.button.gap', 'tanrei.sys.space.space100']);
});
