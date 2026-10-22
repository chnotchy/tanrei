// A number field and a slider step their value with the keys — Up and Down Arrow, Page Up and Page Down, every repeat
// of a held key — and each commits every step (a `change` under each `keydown`). Committing computes the layer, the
// whole build: twenty presses of Up Arrow on a palette's chroma were twenty long tasks, one under each key. The Studio
// takes the steps made with keys on one control as one adjustment, as it takes a drag: each step is shown as it is
// made (a palette's color and a dial drawn without computing the layer), and the adjustment is written when the keys
// rest (300 ms after the last key is released), at Enter, or when focus leaves the control.
//
// What is counted is what the Studio does, never how long the browser takes: the computations (each one a
// `performance.measure` of the page), the writes of the preview's sheet, and the commits (each one says the file is
// "unsaved"). A key that comes later than the Studio's rest — a page held up by something else — lets the Studio catch
// up at rest, as it should; that computation, or that commit, is not the key's.
import assert from 'node:assert/strict';
import { studioTest } from './harness.js';

/** The Studio's rest before it computes what is shown (a dragged value, a stepped one). */
const REST = 150;
/** The rest after the last key that stepped a control, before the steps are committed (src/ui/widgets.ts, KEY_STEPS_REST). */
const KEYS_REST = 300;

/** In the page: each computation, each write of the preview's sheet, each commit, each key pressed and released. */
const watch = (page) =>
  page.evaluate(() => {
    const w = (window.__keys = { writes: 0, at: [], commits: [], keys: [], ups: [] });
    w.sheet = new MutationObserver((records) => (w.writes += records.length));
    w.sheet.observe(document.querySelector('[data-sheet]'), { childList: true, characterData: true, subtree: true });
    // A commit says the file is unsaved: the file's state is drawn again, saying so.
    const drawn = () => document.querySelector('[data-save-state="unsaved"]') && w.commits.push(performance.now());
    w.file = new MutationObserver(drawn);
    w.file.observe(document.querySelector('[data-save-state]').parentElement, { childList: true });
    const computes = (entries) => w.at.push(...entries.filter((e) => e.name.endsWith('studio: compute')).map((e) => e.startTime));
    w.measures = new PerformanceObserver((list) => computes(list.getEntries()));
    w.measures.observe({ type: 'measure' });
    document.addEventListener('keydown', () => w.keys.push(performance.now()), true);
    document.addEventListener('keyup', () => w.ups.push(performance.now()), true);
    w.take = () => {
      w.writes += w.sheet.takeRecords().length;
      if (w.file.takeRecords().length) drawn();
      computes(w.measures.takeRecords());
      return { writes: w.writes, at: w.at, commits: w.commits, keys: w.keys, ups: w.ups };
    };
  });
const take = (page) => page.evaluate(() => window.__keys.take());

/** The times in `times` that came less than `rest` after a key: what the keys did, not a rest after them. */
const underKeys = (times, keys, rest) => times.filter((time) => {
  const last = keys.filter((key) => key <= time).at(-1);
  return last !== undefined && time - last < rest;
});
/** The rests among the keys: how many times the keys paused for `rest` or longer, and the rest after the last one. */
const rests = (keys, rest) => keys.filter((key, i) => i > 0 && key - keys[i - 1] >= rest).length + 1;

/** What a run of steps made: nothing under a key, and no more than one computation and one commit for each rest. */
function oneAdjustment(seen, what) {
  assert.deepEqual(underKeys(seen.at, seen.keys, REST), [], `${what}: no computation under a key (${seen.at.length} for ${seen.keys.length} keys)`);
  assert.ok(seen.at.length <= rests(seen.keys, REST), `${what}: the layer is computed once the keys rest, at most once a rest: ${seen.at.length} computations, ${rests(seen.keys, REST)} rests`);
  assert.ok(seen.writes <= rests(seen.keys, REST), `${what}: the preview's sheet is written at most once a rest: ${seen.writes}`);
  assert.ok(seen.commits.length >= 1, `${what}: the steps are committed`);
  assert.ok(seen.commits.length <= rests(seen.keys, KEYS_REST), `${what}: committed once the keys rest, not at each step: ${seen.commits.length} commits for ${seen.keys.length} keys`);
}

const NEUTRAL = '[data-palette="neutral"] [data-chroma]';

studioTest('twenty presses of Up Arrow on a palette’s chroma are shown as they are made, and computed and written once the keys rest', {}, async ({ page, level, saved }) => {
  await level('groups');
  await page.locator(`${NEUTRAL} input`).click();
  await watch(page);
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator(NEUTRAL).evaluate((field) => field.value), 20, 'every press stepped the chroma');
  await saved((layer) => layer.palettes?.neutral?.source?.chroma === 20, 'the chroma the keys reached');
  const seen = await take(page);
  assert.equal(seen.keys.length, 20);
  oneAdjustment(seen, 'twenty presses');
});

studioTest('a held Up Arrow is shown at every repeat and written when it is released', {}, async ({ page, level, saved, onDisk }) => {
  await level('groups');
  await page.locator(`${NEUTRAL} input`).click();
  await watch(page);
  // The first press, then its repeats: one key held down.
  for (let i = 0; i < 12; i += 1) await page.keyboard.down('ArrowUp');
  assert.equal(await page.locator(NEUTRAL).evaluate((field) => field.value), 12, 'every repeat stepped the chroma');
  const held = await take(page);
  assert.deepEqual(held.commits, [], 'nothing is committed while the key is held');
  await page.keyboard.up('ArrowUp');
  await saved((layer) => layer.palettes?.neutral?.source?.chroma === 12, 'the chroma, once the key is released');
  const seen = await take(page);
  assert.ok(seen.commits.every((time) => time > seen.ups.at(-1)), 'committed after the key was released');
  oneAdjustment(seen, 'a held key');
  assert.equal(onDisk().palettes.neutral.source.hue, 0);
});

studioTest('Enter, or focus leaving the field, writes the steps at once', {}, async ({ page, level, saved }) => {
  await level('groups');
  const field = page.locator(`${NEUTRAL} input`);
  await field.click();
  await watch(page);
  // Held, so that no rest after a release can commit them: only Enter can.
  for (let i = 0; i < 3; i += 1) await page.keyboard.down('ArrowUp');
  assert.deepEqual((await take(page)).commits, [], 'nothing committed while the key is held');
  await page.keyboard.press('Enter');
  assert.equal((await take(page)).commits.length, 1, 'Enter commits the steps');
  await page.keyboard.up('ArrowUp');
  await saved((layer) => layer.palettes?.neutral?.source?.chroma === 3, 'the steps, at Enter');

  for (let i = 0; i < 2; i += 1) await page.keyboard.down('ArrowUp');
  assert.equal((await take(page)).commits.length, 1, 'the new steps are not committed while the key is held');
  // Focus leaves the field (a press elsewhere, a Tab): the steps are written.
  await field.evaluate((input) => input.blur());
  assert.equal((await take(page)).commits.length, 2, 'focus leaving the field commits the steps');
  await page.keyboard.up('ArrowUp');
  await saved((layer) => layer.palettes?.neutral?.source?.chroma === 5, 'the steps, when focus left');
});

studioTest('the arrow keys on a dial’s slider are drawn without computing the layer, and written once they rest', {}, async ({ page, saved }) => {
  const slider = page.locator('[data-dial="tanrei.dial.shape.unit"] tanrei-slider');
  const from = await slider.evaluate((el) => el.value);
  await slider.locator('[role="slider"]').focus();
  await watch(page);
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight');
  const to = from + 6 * 0.5;
  assert.equal(await slider.evaluate((el) => el.value), to, 'every press stepped the dial');
  await saved((layer) => layer.tokens?.['tanrei.dial.shape.unit']?.$value.value === to, 'the dial the keys reached');
  oneAdjustment(await take(page), 'six presses on a slider');
});
