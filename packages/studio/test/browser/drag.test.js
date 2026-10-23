// A drag across the browser's colour picker, or along a slider, reports a value for every move of the pointer —
// several in a frame. The Studio shows the latest one at the next frame and computes the layer when the value is
// committed: a palette's color and a dial are drawn without computing the layer, set on the preview's scope, and
// anything else is computed once a frame at most. Computing the layer is the whole build (the token engine, the emitter, the checks):
// done for every move, a drag of one second took the page tens of seconds to follow.
//
// What is counted is what the Studio does, never how long the browser takes to do it: the computations (each one a
// `performance.measure` of the page), the writes of the preview's sheet, and the frames of the drag.
import assert from 'node:assert/strict';
import { studioTest } from './harness.js';

/** In the page: what is written into the preview's sheet, and each time the layer is computed. */
const watch = (page) =>
  page.evaluate(() => {
    const w = (window.__drag = { writes: 0, computes: 0, at: [] });
    w.sheet = new MutationObserver((records) => (w.writes += records.length));
    w.sheet.observe(document.querySelector('[data-sheet]'), { childList: true, characterData: true, subtree: true });
    const computes = (entries) => {
      const found = entries.filter((e) => e.name.endsWith('studio: compute'));
      w.computes += found.length;
      w.at.push(...found.map((e) => e.startTime));
    };
    w.measures = new PerformanceObserver((list) => computes(list.getEntries()));
    w.measures.observe({ type: 'measure' });
    w.take = () => {
      w.writes += w.sheet.takeRecords().length;
      computes(w.measures.takeRecords());
      const seen = { writes: w.writes, computes: w.computes, at: w.at };
      Object.assign(w, { writes: 0, computes: 0, at: [] });
      return seen;
    };
  });
const take = (page) => page.evaluate(() => window.__drag.take());

/**
 * A drag: `values.length / perFrame` frames, `perFrame` moves in each, as the browser reports them — for a colour
 * field, a pick in its picker (the well's value, and its `input`), with focus on the button that opened it; for a
 * slider, its value and `input`. Then a frame more, for what the Studio shows at the next frame. Resolves with the
 * number of frames, the page's time of each frame's moves (`moved`), and — read in that last frame — the custom
 * property `property` as the preview's scope sets it on itself (`set`: what a value drawn without computing the layer
 * sets) and as it is computed there (`drawn`); for each of `also`, the same pair under its name.
 */
const drag = (page, { field, slider, values, perFrame, property = '--none', also = [] }) =>
  page.evaluate(
    ({ field, slider, values, perFrame, property, also }) =>
      new Promise((resolve) => {
        const input = field && document.querySelector(field).shadowRoot.querySelector('tanrei-color-input').shadowRoot;
        const target = field ? input.querySelector('.native-picker') : document.querySelector(slider);
        if (field) input.querySelector('.picker-button').focus();
        const left = [...values];
        const moved = [];
        let frames = 0;
        const frame = () => {
          frames += 1;
          if (!left.length) {
            const scope = document.querySelector('[data-scope]');
            const read = (name) => ({ set: scope.style.getPropertyValue(name), drawn: getComputedStyle(scope).getPropertyValue(name).trim() });
            return resolve({ frames, moved, ...read(property), also: Object.fromEntries(also.map((name) => [name, read(name)])) });
          }
          moved.push(performance.now());
          for (const value of left.splice(0, perFrame)) {
            target.value = value;
            target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    { field, slider, values, perFrame, property, also },
  );
/** The pointer lifted: the picker closes, or the slider's press ends, with its `change`. */
const release = (page, { field, slider }) =>
  page.evaluate(({ field, slider }) => {
    const target = field ? document.querySelector(field).shadowRoot.querySelector('tanrei-color-input').shadowRoot.querySelector('.native-picker') : document.querySelector(slider);
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }, { field, slider });

/** Colors along a path across the picker: each one another. Another `from` is another path, ending at another color. */
const path = (n, from = 0) => Array.from({ length: n }, (_, i) => `#${[40 + i * 7 + from * 23, 200 - i * 5, 90 + i * 11].map((c) => (((c % 256) + 256) % 256).toString(16).padStart(2, '0')).join('')}`);
const settled = (page) => page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))));

/**
 * A drag across a palette's picker by a pointer that never rests (`drag`, 3 moves a frame), after `watch`. The Studio
 * computes the layer once the pointer has rested 150 ms; a busy runner can bring a frame that late, and the Studio then
 * computes the layer during the drag, as it should for a pointer that rested — and the frame after it is drawn by that
 * layer, with nothing set on the scope. Such a drag is not the one this file is about: it is released, and the pointer
 * drags again along another path, three times at most. Resolves with `drag`'s result, the tone drawn before it
 * (`before`), what was counted during it (`during`), its values and how many drags it took.
 */
async function dragWithoutRest(page, { field, property, moves, saved, last }) {
  for (let attempt = 1; ; attempt += 1) {
    const before = await page.evaluate((name) => getComputedStyle(document.querySelector('[data-scope]')).getPropertyValue(name).trim(), property);
    await take(page); // what came before this drag is not counted
    const values = path(moves, attempt - 1);
    const result = await drag(page, { field, values, perFrame: 3, property });
    const during = await take(page);
    if (!during.computes || attempt === 3) return { ...result, before, during, values, attempts: attempt };
    await release(page, { field });
    await saved((layer) => last(layer) === values.at(-1), `the drag a late frame made a rest (${attempt}), written when the picker closes`);
    await settled(page);
  }
}
/**
 * The computations of a drag that did not wait for the pointer to rest: each one started less than the Studio's rest
 * (150 ms) after the frame of moves before it. A frame that comes later than that — a page held up by something else
 * — lets the Studio catch up at rest, as it should, and that computation is not the drag's.
 */
const REST = 150;
const beforeRest = ({ at }, { moved }) => at.filter((time) => {
  const last = moved.filter((move) => move <= time).at(-1);
  return last === undefined || time - last < REST;
});
/**
 * When the press ends or the picker closes the layer is computed, once — unless the Studio caught up while the pointer
 * rested (a page held up between the last frame and the release), and the release has nothing left to compute.
 */
function computedOnRelease(during, after) {
  assert.ok(after.computes <= 1, `the layer is computed once at most when the value is committed: ${after.computes} times`);
  if (!during.computes) assert.equal(after.computes, 1, 'the layer is computed when the value is committed');
  assert.equal(after.writes, after.computes, 'and its sheet written once, whole');
}
/** What the preview's scope has set on itself: what a drag draws without computing the layer. */
const setOnScope = (scope, name) => scope.evaluate((el, property) => el.style.getPropertyValue(property), name);

studioTest('a drag across the brand color’s picker is drawn at every frame from the palette alone, and the layer is computed when the picker closes', {}, async ({ page, saved, css, scope }) => {
  const field = 'tanrei-color-field[data-seed="primary"]';
  const tone = '--tanrei-ref-palette-primary-40';
  // The default system has no primary palette: the first pick declares one, and is computed, as a person's first is.
  await drag(page, { field, values: ['#0f766e'], perFrame: 1 });
  await release(page, { field });
  await saved((layer) => layer.palettes?.primary?.source?.seed === '#0f766e', 'the first color');
  await settled(page);
  await watch(page);

  const last = (layer) => layer.palettes.primary.source.seed;
  const { frames, set, drawn: live, before, during, values, attempts } = await dragWithoutRest(page, { field, property: tone, moves: 60, saved, last });
  assert.equal(during.computes, 0, `a drag that never rests is drawn from the palette alone, the layer not computed: ${during.computes} times in ${frames} frames, for ${values.length} moves (${attempts} drags, each with a frame 150 ms late)`);
  assert.equal(during.writes, 0, `and the sheet is not written: ${during.writes} times in ${frames} frames`);
  assert.notEqual(live, before, 'the preview follows the color while it moves');
  assert.equal(set, live, 'drawn from the palette alone: the tone is set on the scope');

  await release(page, { field });
  await saved((layer) => last(layer) === values.at(-1), 'the last color, written when the picker closes');
  const after = await take(page);
  assert.equal(after.computes, 1, 'the layer is computed once');
  assert.equal(after.writes, 1, 'and its sheet written once, whole');
  assert.equal(await setOnScope(scope, tone), '', 'nothing is left on the scope');
  assert.equal((await css(scope, tone)).trim(), live, 'what the drag drew is what the layer computes');
});

studioTest('a drag across a fixed tone’s picker is drawn from the palette alone too, and written when the picker closes', {}, async ({ page, section, saved, css, scope }) => {
  const tone = '--tanrei-ref-palette-accent-40';
  await section('palettes');
  const accent = page.locator('[data-palette="accent"]');
  await accent.locator('[data-tones] summary').click();
  await accent.locator('[data-tone-new] input').fill('40');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.palettes?.accent?.source?.tones?.['40'], 'the tone added');
  await settled(page);
  await watch(page);

  const field = '[data-palette="accent"] [data-tone-row="40"] tanrei-color-field';
  const last = (layer) => layer.palettes.accent.source.tones['40'];
  const { frames, set, drawn, during, values, attempts } = await dragWithoutRest(page, { field, property: tone, moves: 45, saved, last });
  assert.equal(during.computes, 0, `a drag that never rests is drawn from the palette alone, the layer not computed: ${during.computes} times in ${frames} frames, for ${values.length} moves (${attempts} drags, each with a frame 150 ms late)`);
  assert.equal(during.writes, 0, `and the sheet is not written: ${during.writes} times in ${frames} frames`);
  assert.equal(drawn, values.at(-1), 'the fixed tone is drawn as it moves');
  assert.equal(set, values.at(-1), 'drawn from the palette alone');

  await release(page, { field });
  await saved((layer) => last(layer) === values.at(-1), 'the last color, written when the picker closes');
  assert.equal((await take(page)).computes, 1, 'the layer is computed once');
  assert.equal(await setOnScope(scope, tone), '');
  assert.equal((await css(scope, tone)).trim(), values.at(-1));
});

studioTest('a drag along a dial’s slider is drawn at every frame without computing the layer, and the layer is computed when the press ends', {}, async ({ page, section, saved, css, scope }) => {
  await section('radius');
  const slider = '[data-dial="tanrei.dial.shape.unit"] tanrei-slider';
  const property = '--tanrei-dial-shape-unit';
  await settled(page);
  await watch(page);
  // Back and forth across the slider's steps (0–8 by 0.5): every move another value.
  const steps = Array.from({ length: 17 }, (_, i) => i / 2);
  const values = [...steps.slice(1), ...steps.slice(0, -1).reverse(), ...steps.slice(1, 8)];
  const moves = await drag(page, { slider, values, perFrame: 3, property });
  const during = await take(page);
  assert.deepEqual(beforeRest(during, moves), [], `the layer is not computed while the slider moves: ${during.computes} times in ${moves.frames} frames, for ${values.length} moves`);
  assert.ok(during.writes <= during.computes, `the sheet is written only with a computed layer: ${during.writes} writes, ${during.computes} computations`);
  assert.equal(moves.drawn, `${values.at(-1)}px`, 'the preview shows the last value at the next frame');
  assert.equal(moves.set, moves.drawn, 'drawn without computing the layer: the dial is set on the scope');

  await release(page, { slider });
  await saved((layer) => layer.tokens?.['tanrei.dial.shape.unit']?.$value.value === values.at(-1), 'the last value, written when the press ends');
  computedOnRelease(during, await take(page));
  assert.equal(await setOnScope(scope, property), '', 'nothing is left on the scope');
  assert.equal((await css(scope, property)).trim(), moves.drawn, 'what the drag drew is what the layer computes');
});
