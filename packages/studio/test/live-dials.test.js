// While a dial's slider is dragged, the preview is patched with the custom properties `liveProperties` works out
// without computing the layer — the dial's own, and the declarations the emitter writes as values that move with it (a
// text style's tracking) — and the layer is computed once the drag ends. The two must draw the same thing: the sheet
// of the view the drag started from, with those properties written into it, is the sheet of the new layer — for every
// dial of every shipped system, at either end of its slider and at a value typed between its steps. Where that cannot
// be promised, the answer is null and the layer is computed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { patchedSheet } from './helpers.js';
import { shipped, studio } from './studio-node.js';

const NS = studio.namespace;
const DIAL = `${NS}.dial.`;
const SCOPE = 'live';

function sameSheet(from, layer, what) {
  const to = studio.preview(layer);
  assert.ok(to.ok, `${what}: ${to.problems?.join('\n')}`);
  const properties = studio.liveProperties(from, layer);
  assert.ok(properties, `${what}: the drag is drawn without computing the layer`);
  assert.ok(Object.keys(properties).length > 0, `${what}: something moved`);
  const [patched, computed] = [patchedSheet(from.css(SCOPE), properties).split('\n'), to.css(SCOPE).split('\n')];
  assert.equal(patched.length, computed.length, `${what}: as many lines`);
  const differ = patched.flatMap((line, i) => (line === computed[i] ? [] : [`${line.trim()}  (computed: ${computed[i].trim()})`]));
  assert.deepEqual(differ, [], `${what}: the patched sheet is the computed one`);
  return properties;
}

for (const id of Object.keys(shipped)) {
  test(`${id}: every dial, moved, drawn without computing the layer, is the sheet the layer computes`, () => {
    const start = { ...studio.blank(id), id: `live-${id}` };
    const from = studio.preview(start);
    assert.ok(from.ok, from.problems?.join('\n'));
    const dials = studio.dials(start);
    assert.equal(dials.length, 8, 'the eight dials');
    for (const dial of dials) {
      // Either end of the slider, and a value typed between its steps (the number field takes four decimals).
      const between = Math.round((dial.value + dial.step * 1.37) * 1e4) / 1e4;
      for (const value of [dial.min, dial.max, between]) {
        if (value === dial.value) continue;
        const properties = sameSheet(from, studio.setDial(start, dial.id, value), `${id}/${dial.key} = ${value}`);
        assert.ok(studio.cssVar(dial.id) in properties, `${id}/${dial.key}: the dial's own property`);
      }
    }
  });
}

test('a text style whose tracking the emitter writes as a number follows the type dials', () => {
  // m3-like pins its letter spacing in px: the emitter writes it over the size, in em, so it moves with type.base.
  const start = { ...studio.blank('m3-like'), id: 'live-tracking' };
  const properties = sameSheet(studio.preview(start), studio.setDial(start, `${DIAL}type.base`, 19), 'm3-like/type.base');
  assert.ok(Object.keys(properties).some((name) => name.endsWith('-letter-spacing')), 'a letter spacing is among what moves');
});

test('Essentials: spacing moves the size unit with it — both are drawn', () => {
  const start = { ...studio.blank('tanrei'), id: 'live-spacing' };
  const from = studio.preview(start);
  const moved = studio.setEssential(start, 'space.unit', 10);
  assert.ok(moved.tokens?.[`${DIAL}size.unit`], 'the size unit moved with it');
  const properties = sameSheet(from, moved, 'space.unit, linked');
  assert.deepEqual(Object.keys(properties).sort(), [studio.cssVar(`${DIAL}size.unit`), studio.cssVar(`${DIAL}space.unit`)].sort());
});

test('from a layer that pins a dial: moved again, back to the base, and back to where the drag started', () => {
  const start = studio.setDial({ ...studio.blank('tanrei'), id: 'live-pinned' }, `${DIAL}shape.unit`, 4, 'Rounder, for this product.');
  const from = studio.preview(start);
  sameSheet(from, studio.setDial(start, `${DIAL}shape.unit`, 7), 'moved again');
  // At the base's value the pin, and its reason, are dropped: still only the dial's value moved.
  const atBase = studio.setDial(start, `${DIAL}shape.unit`, studio.baseOf(start).dials.find((d) => d.key === 'shape.unit').value);
  assert.equal(atBase.tokens, undefined, 'the pin is dropped');
  sameSheet(from, atBase, 'back to the base');
  assert.deepEqual(studio.liveProperties(from, start), {}, 'where the drag started: nothing to draw');
});

test('a dial and a palette dragged before the layer was computed: both drawn', () => {
  const start = studio.setPalette({ ...studio.blank('tanrei'), id: 'live-both' }, 'primary', { source: { seed: '#0f766e' } });
  const from = studio.preview(start);
  const both = studio.setDial(studio.setPalette(start, 'primary', { source: { seed: '#e60012' } }), `${DIAL}stroke.unit`, 2);
  const properties = sameSheet(from, both, 'a seed and a dial');
  assert.ok(studio.cssVar(`${DIAL}stroke.unit`) in properties && `${studio.cssVar(`${NS}.ref.palette.primary`)}-40` in properties);
});

test('a dial that reaches the sheet as a value, or anything else that changed, is computed', () => {
  const start = { ...studio.blank('tanrei'), id: 'live-computed' };
  const from = studio.preview(start);
  const moved = studio.setDial(start, `${DIAL}space.unit`, 10);
  assert.equal(studio.liveProperties(from, studio.setMeta(moved, { name: 'Another name' }).layer), null, 'and the name');
  const pinned = studio.applyOperation(moved, `${NS}.sys.space.space100`, { $value: { value: 9, unit: 'px' }, reason: 'A step of our own.' });
  assert.equal(pinned.problem, undefined);
  assert.equal(studio.liveProperties(from, pinned.layer), null, 'and a token pinned');
  const aliased = studio.applyOperation(start, `${DIAL}space.unit`, { $value: `{${DIAL}size.unit}` });
  assert.equal(aliased.problem, undefined);
  assert.equal(studio.liveProperties(from, aliased.layer), null, 'a dial pointed at another');

  // A token that follows the dial by a rule CSS cannot do: the emitter writes its value, so the layer is computed.
  const clamped = studio.applyOperation(start, `${NS}.sys.space.space100`, { derive: { fn: 'clamp', of: `{${DIAL}space.unit}`, min: 6, max: 12 } });
  assert.equal(clamped.problem, undefined);
  const view = studio.preview(clamped.layer);
  assert.ok(view.ok, view.problems?.join('\n'));
  assert.equal(studio.liveProperties(view, studio.setDial(clamped.layer, `${DIAL}space.unit`, 10)), null, 'a clamp on the dial');
  assert.ok(studio.liveProperties(view, studio.setDial(clamped.layer, `${DIAL}shape.unit`, 4)), 'another dial is still drawn');
});
