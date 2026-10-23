// The start points of the bar: the default system, the root — listed, and not offered until it is a blank start — and
// the examples of the theme gallery; starting from one is a fresh layer on it, and whether a layer holds anything a
// new start would replace.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shipped, studio } from './studio-node.js';

test('the start points: the default system, the root (not offered yet, and why), then every example of the gallery', () => {
  const points = studio.startPoints();
  assert.deepEqual(points.map(({ id, kind }) => [id, kind]), [[studio.defaultId, 'default'], [studio.rootId, 'root'], ...studio.systems.filter(({ id, local }) => !local && id !== studio.defaultId).map(({ id }) => [id, 'example'])]);
  assert.deepEqual(points.filter(({ offered }) => !offered).map(({ id, reason }) => [id, reason]), [[studio.rootId, 'not-neutral']], 'only the root is listed and not offered');
  for (const point of points) assert.equal(point.name, shipped[point.id].name ?? point.id, `${point.id}: its own name`);
  const examples = points.filter(({ kind }) => kind === 'example').map(({ id }) => id);
  for (const id of ['m3-like', 'cupertino', 'm3-expressive-like']) assert.ok(examples.includes(id), id);
});

test('starting from a point: the layer keeps its id, name and description, on that system’s defaults; a fresh layer holds nothing to replace', () => {
  const layer = { id: 'acme', name: 'Acme', extends: studio.defaultId, description: 'Our look.', palettes: { primary: { source: { seed: '#0b6e4f' } } } };
  assert.equal(studio.holdsChanges(layer), true, 'a palette');
  const started = studio.setBase(layer, 'cupertino');
  assert.deepEqual(started, { id: 'acme', name: 'Acme', extends: 'cupertino', description: 'Our look.' });
  assert.equal(studio.holdsChanges(started), false, 'a fresh start: its name and description are no changes');
  assert.equal(studio.holdsChanges(studio.blank()), false);
  assert.equal(studio.holdsChanges({ id: 'acme', extends: studio.defaultId, components: { include: ['segmented-button'] } }), true, 'a choice of components is a change');
  assert.deepEqual(studio.check(started).problems, [], 'the engine computes it');
});
