// While a palette's color is dragged, the preview is patched with the custom properties `liveProperties` works out
// by the palette engine alone, and the layer is computed once the drag ends. The two must draw the same thing: the
// sheet of the view the drag started from, with those properties written into it, is the sheet of the new layer —
// for every palette of every shipped system, whatever its source becomes. Where that cannot be promised, the answer is
// null and the layer is computed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shipped, studio } from './studio-node.js';

const NS = studio.namespace;
const SCOPE = 'live';

/** The sheet of `view` with `properties` written in: each is declared once, in the base block, and replaced there. */
function patched(css, properties) {
  let out = css;
  for (const [name, value] of Object.entries(properties)) {
    const declaration = new RegExp(`(\\n\\s*${name.replace(/[-]/g, '\\-')}: )[^;]+;`, 'g');
    assert.equal(out.match(declaration)?.length, 1, `${name} is declared once in the sheet`);
    out = out.replace(declaration, `$1${value};`);
  }
  return out;
}

function sameSheet(from, to, what) {
  const properties = studio.liveProperties(from, to.layer);
  assert.ok(properties, `${what}: the drag is drawn from the palette alone`);
  assert.ok(Object.keys(properties).length > 0, `${what}: some tone changed`);
  assert.equal(patched(from.css(SCOPE), properties), to.css(SCOPE), `${what}: the patched sheet is the computed one`);
}

for (const id of Object.keys(shipped)) {
  test(`${id}: a palette's new source, drawn from the palette alone, is the sheet the layer computes`, () => {
    const start = { ...studio.blank(id), id: `live-${id}` };
    const from = studio.preview(start);
    assert.ok(from.ok, from.problems?.join('\n'));
    let drawn = 0;
    for (const name of Object.keys(studio.baseOf(start).system.palettes)) {
      const to = studio.preview(studio.setPalette(start, name, { source: { seed: '#e60012' } }));
      assert.ok(to.ok, to.problems?.join('\n'));
      const properties = studio.liveProperties(from, to.layer);
      if (!properties) {
        // Null only where a color of that palette reaches the sheet as a literal: a `tone` rule reads it.
        const toned = Object.values(from.model.perScheme).some((tokens) => Object.values(tokens).some((token) => token.derive?.fn === 'tone' && token.derive.palette === name));
        assert.ok(toned, `${id}/${name}: no rule reads the palette, so the drag must not compute the layer`);
        continue;
      }
      sameSheet(from, to, `${id}/${name}`);
      drawn += 1;
    }
    assert.ok(drawn > 0, `${id}: some palette is drawn from the palette alone`);
  });
}

test('the brand color: a seed, then another, a hue and chroma, a fixed tone — each the computed sheet', () => {
  const start = { ...studio.blank('tanrei'), id: 'live-brand' };
  const seeded = studio.setPalette(start, 'primary', { source: { seed: '#0f766e' } });
  const from = studio.preview(seeded);
  // The default system has no primary palette: the first move declares one, and the roles it values with it.
  assert.equal(studio.liveProperties(studio.preview(start), seeded), null, 'the first move is computed');
  sameSheet(from, studio.preview(studio.setPalette(seeded, 'primary', { source: { seed: '#e60012' } })), 'a second move');
  sameSheet(from, studio.preview(studio.setPalette(seeded, 'primary', { source: { seed: '#7c3aed' } })), 'another seed');
  sameSheet(from, studio.preview(studio.setPalette(seeded, 'primary', { source: { hue: 200, chroma: 48 } })), 'hue and chroma');
  sameSheet(from, studio.preview(studio.setPaletteTones(seeded, 'primary', { 40: '#123456' })), 'a fixed tone');
  // Back where the drag started: what the view already has.
  assert.deepEqual(studio.liveProperties(from, seeded), {});
});

test('anything but a palette source (or a dial, test/live-dials.test.js) is computed', () => {
  const start = { ...studio.blank('tanrei'), id: 'live-other' };
  const from = studio.preview(start);
  assert.equal(studio.liveProperties(from, studio.setMeta(start, { name: 'Another name' }).layer), null, "the layer's name");
  assert.equal(studio.liveProperties(from, studio.setPalette(start, 'accent', { description: 'Our brand accent.' })), null, "a palette's description");
  assert.equal(studio.liveProperties(from, { ...start, extends: 'm3-like' }), null, 'another base');
  assert.equal(studio.liveProperties(from, studio.dropPalette(start, 'accent')), null, 'a palette dropped');
});

test('a contrast-pick anywhere: every palette change is computed', () => {
  const start = studio.setPalette({ ...studio.blank('tanrei'), id: 'live-pick' }, 'primary', { source: { seed: '#0f766e' } });
  const role = `${NS}.sys.color.on-primary`;
  const result = studio.applyOperation(start, role, { derive: { fn: 'contrast-pick', on: `{${NS}.sys.color.primary}`, from: [`{${NS}.sys.color.surface}`, `{${NS}.sys.color.on-surface}`] } });
  assert.equal(result.problem, undefined);
  const from = studio.preview(result.layer);
  assert.ok(from.ok, from.problems?.join('\n'));
  assert.equal(studio.liveProperties(from, studio.setPalette(result.layer, 'primary', { source: { seed: '#e60012' } })), null);
});
