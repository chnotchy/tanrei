// Source parses every key, and a text that parses is the layer. Computing the layer is the whole build: done for
// every key, typing four letters into a family's name took four long tasks, one under each key. So a text that parses
// is held, and committed — computed, saved — once the typing has rested 400 ms or the text loses focus; a word (a
// name, a reason) is committed at once, since it computes nothing (core.valueKey).
//
// What is counted is what the Studio does, never how long the browser takes: the computations (each one a
// `performance.measure` of the page) and the commits (each one says the file is "unsaved").
import assert from 'node:assert/strict';
import { studioTest } from './harness.js';

/** How long the typing rests before Source commits (src/ui/source.ts, COMMIT_REST). */
const COMMIT_REST = 400;
const BRAND = 'tanrei.ref.typeface.brand';
const layer = { id: 'acme', extends: 'tanrei', tokens: { [BRAND]: { $value: ['Inter', 'system-ui', 'sans-serif'], reason: 'Brand typeface.' } } };

/** In the page: each computation, each commit, each key. */
const watch = (page) =>
  page.evaluate(() => {
    const w = (window.__source = { at: [], commits: [], keys: [] });
    const drawn = () => document.querySelector('[data-save-state="unsaved"]') && w.commits.push(performance.now());
    w.file = new MutationObserver(drawn);
    w.file.observe(document.querySelector('[data-save-state]').parentElement, { childList: true });
    const computes = (entries) => w.at.push(...entries.filter((e) => e.name.endsWith('studio: compute')).map((e) => e.startTime));
    w.measures = new PerformanceObserver((list) => computes(list.getEntries()));
    w.measures.observe({ type: 'measure' });
    document.addEventListener('keydown', () => w.keys.push(performance.now()), true);
    w.take = () => {
      if (w.file.takeRecords().length) drawn();
      computes(w.measures.takeRecords());
      return { at: w.at, commits: w.commits, keys: w.keys };
    };
  });
const take = (page) => page.evaluate(() => window.__source.take());
/** The times in `times` that came less than `rest` after a key. */
const underKeys = (times, keys, rest) => times.filter((time) => {
  const last = keys.filter((key) => key <= time).at(-1);
  return last !== undefined && time - last < rest;
});
/** How many times the keys paused for `rest` or longer, and the rest after the last one. */
const rests = (keys, rest) => keys.filter((key, i) => i > 0 && key - keys[i - 1] >= rest).length + 1;

/** Source, with the caret right after the first `after` in its text. */
async function caretAfter(page, inspect, after) {
  await inspect('source');
  const area = page.locator('[data-source]');
  await area.click();
  await area.evaluate((el, text) => {
    const at = el.value.indexOf(text) + text.length;
    el.setSelectionRange(at, at);
  }, after);
  return area;
}

studioTest('typing a value at Source computes the layer once the typing rests, and commits it once', { layer }, async ({ page, inspect, saved, css, scope }) => {
  await caretAfter(page, inspect, '"Inter');
  await watch(page);
  await page.keyboard.type(' Display');
  await saved((file) => file.tokens?.[BRAND]?.$value[0] === 'Inter Display', 'the family typed');
  const seen = await take(page);
  assert.equal(seen.keys.length, 8);
  assert.deepEqual(underKeys(seen.at, seen.keys, COMMIT_REST), [], `no computation before the typing rests: ${seen.at.length} for ${seen.keys.length} keys`);
  assert.deepEqual(underKeys(seen.commits, seen.keys, COMMIT_REST), [], 'nor a commit');
  assert.ok(seen.at.length <= rests(seen.keys, COMMIT_REST), `computed at most once a rest: ${seen.at.length}`);
  assert.ok(seen.commits.length >= 1 && seen.commits.length <= rests(seen.keys, COMMIT_REST), `committed once a rest: ${seen.commits.length}`);
  assert.match(await css(scope.first(), '--tanrei-ref-typeface-brand'), /^\s*"Inter Display"/, 'the preview draws the family typed');
});

studioTest('a text that parses is committed at once when it loses focus; until then the schema is said, the engine is not asked', { layer }, async ({ page, inspect, saved }) => {
  const area = await caretAfter(page, inspect, '"Inter');
  await watch(page);
  // In one task, so that no rest can come between: a key's text, then focus leaving the text.
  const states = await area.evaluate((el) => {
    const state = () => document.querySelector('[data-save-state]').dataset.saveState;
    el.setRangeText('Z', el.selectionStart, el.selectionEnd, 'end');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Z' }));
    const typed = state();
    el.blur();
    return { typed, left: state() };
  });
  assert.deepEqual(states, { typed: 'saved', left: 'unsaved' }, 'held while it is typed; committed when the text loses focus');
  const seen = await take(page);
  assert.equal(seen.at.length, 1, 'and computed then, once');
  await saved((file) => file.tokens?.[BRAND]?.$value[0] === 'InterZ', 'the text, when it lost focus');
});

studioTest('a name typed at Source is committed at every key, and computes nothing', { layer }, async ({ page, inspect, saved }) => {
  await caretAfter(page, inspect, '"acme",');
  await watch(page);
  await page.keyboard.type('\n  "name": "Acme",');
  await saved((file) => file.name === 'Acme', 'the name');
  const seen = await take(page);
  assert.deepEqual(seen.at, [], `a name computes nothing: ${seen.at.length} computations`);
  // And in one task, so that no rest can come between: the key's text is the layer, and is committed, at the key.
  const area = page.locator('[data-source]');
  const at = await area.evaluate((el) => {
    const end = el.value.indexOf('"Acme"') + '"Acme'.length;
    el.setRangeText(' Corp', end, end, 'end');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' Corp' }));
    return { name: window.tanreiStudio.getState().layer.name, state: document.querySelector('[data-save-state]').dataset.saveState };
  });
  assert.deepEqual(at, { name: 'Acme Corp', state: 'unsaved' }, 'a name is committed at the key');
  await saved((file) => file.name === 'Acme Corp', 'the name, at the key');
  assert.deepEqual((await take(page)).at, [], 'and computes nothing');
});
