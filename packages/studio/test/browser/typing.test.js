// What is typed into a name, a reason or a description is no value: the Studio shows it at once — the file's JSON, the
// fields, the checks — and does not compute the layer for it (core.valueKey). Computing the layer is the whole build;
// done for every key, typing a name of ten letters took ten long tasks of the page, one under each key.
//
// What is counted is what the Studio does, never how long the browser takes: the computations (each one a
// `performance.measure` of the page) and the writes of the preview's sheet.
import assert from 'node:assert/strict';
import { studioTest } from './harness.js';

/** In the page: each time the layer is computed, each write of the preview's sheet, and the time of each key. */
const watch = (page) =>
  page.evaluate(() => {
    const w = (window.__typing = { writes: 0, at: [], keys: [] });
    w.sheet = new MutationObserver((records) => (w.writes += records.length));
    w.sheet.observe(document.querySelector('[data-sheet]'), { childList: true, characterData: true, subtree: true });
    const computes = (entries) => w.at.push(...entries.filter((e) => e.name.endsWith('studio: compute')).map((e) => e.startTime));
    w.measures = new PerformanceObserver((list) => computes(list.getEntries()));
    w.measures.observe({ type: 'measure' });
    document.addEventListener('keydown', () => w.keys.push(performance.now()), true);
    w.take = () => {
      w.writes += w.sheet.takeRecords().length;
      computes(w.measures.takeRecords());
      return { writes: w.writes, at: w.at, keys: w.keys };
    };
  });
const take = (page) => page.evaluate(() => window.__typing.take());
const settled = (page) => page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
/** The file's JSON as Export shows it. */
const shownJson = (page) => page.locator('[data-json]').evaluate((el) => JSON.parse(el.textContent));
/**
 * The computations that did not wait for the typing to rest: each one started less than the Studio's rest (150 ms)
 * after the key before it. A key that comes later than that — a page held up by something else — lets the Studio
 * catch up at rest, as it should, and that computation is not the key's.
 */
const REST = 150;
const beforeRest = ({ at, keys }) => at.filter((time) => {
  const last = keys.filter((key) => key <= time).at(-1);
  return last !== undefined && time - last < REST;
});

studioTest('typing the layer’s name computes nothing: the file’s JSON follows every key, and the name is saved', {}, async ({ page, level, saved }) => {
  await level('groups');
  const field = page.locator('[data-name] input');
  await field.click();
  await settled(page);
  await watch(page);
  const name = 'Acme brand';
  for (let i = 1; i <= name.length; i += 1) {
    await page.keyboard.type(name[i - 1]);
    assert.equal((await shownJson(page)).name, name.slice(0, i), `the JSON follows the key: "${name.slice(0, i)}"`);
  }
  // Saved once the typing has rested (600 ms), which is after any catch-up the Studio would make (150 ms).
  await saved((layer) => layer.name === name, 'the name');
  const seen = await take(page);
  assert.equal(seen.keys.length, name.length);
  assert.deepEqual(seen.at, [], `the layer is not computed for a name: ${seen.at.length} times for ${name.length} keys`);
  assert.equal(seen.writes, 0, 'nor is the preview’s sheet written');
});

studioTest('typing a dial’s reason computes nothing while it is typed; the model’s words catch up once it rests, and the sheet is not written again', { layer: { id: 'acme', extends: 'tanrei', tokens: { 'tanrei.dial.shape.unit': { $value: { value: 3, unit: 'px' }, reason: 'Chosen in Theme Studio.' } } } }, async ({ page, level, saved }) => {
  const dial = 'tanrei.dial.shape.unit';
  await level('groups');
  const field = page.locator(`[data-dial="${dial}"] [data-dial-reason] input`);
  await field.click();
  await settled(page);
  await watch(page);
  const reason = 'Rounder, like the logo.';
  await page.keyboard.type(reason);
  assert.equal((await shownJson(page)).tokens[dial].reason, reason, 'the JSON holds the reason as typed');
  await saved((layer) => layer.tokens?.[dial]?.reason === reason, 'the reason');
  const seen = await take(page);
  assert.equal(seen.keys.length, reason.length);
  assert.deepEqual(beforeRest(seen), [], `the layer is not computed while the reason is typed: ${seen.at.length} times for ${reason.length} keys`);
  assert.ok(seen.at.length >= 1, 'the model’s words catch up once the typing rests');
  assert.equal(await page.evaluate((id) => window.tanreiStudio.describe(id).token.derive.fixed, dial), reason, 'Every token says the reason typed');
  assert.equal(seen.writes, 0, 'and the sheet, the same, is not written again');
});
