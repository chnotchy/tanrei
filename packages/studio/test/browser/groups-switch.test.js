// Groups holds some three thousand elements, and a window of it a few hundred. Drawn whole, the switch to it was one
// task of several hundred milliseconds under the press. The Studio draws, before the first paint, the panels the window
// shows; then each panel the person scrolls near; and the rest one at a time while the page is idle. A fold writes what
// it holds when it first opens.
//
// What is counted is what the Studio draws, never how long the browser takes: the elements of the level (in the light
// DOM and in the components' shadow roots) and the panels drawn at the frame the switch paints.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

const PANELS = ['base', 'dials', 'color', 'typefaces', 'icons', 'shape', 'behavior', 'components', 'add', 'about'];

/**
 * In the page: what the level holds — the controls, and the accessibility and export panels under them — and, at the
 * frame that follows the switch, what was drawn and where. Installed after the Studio's own listener of the levels' tabs,
 * so the frame it asks for is the one the switch paints.
 */
const watchSwitch = (page) =>
  page.evaluate(() => {
    const all = (root) => [...root.querySelectorAll('*')].reduce((n, el) => n + 1 + (el.shadowRoot ? all(el.shadowRoot) : 0), 0);
    const studio = document.querySelector('[data-studio]');
    const parts = () => [...studio.querySelector('[data-inspector]').children];
    const w = (window.__switch = { elements: () => parts().reduce((n, part) => n + all(part), 0) });
    document.querySelector('[data-levels]').addEventListener('change', () => requestAnimationFrame(() => {
      const drawn = [...document.querySelectorAll('[data-panel]')].map((el) => ({ panel: el.dataset.panel, top: el.getBoundingClientRect().top }));
      const pending = [...document.querySelectorAll('[data-panel-pending]')].map((el) => el.getBoundingClientRect().top);
      w.frame = { elements: w.elements(), drawn, pending, window: innerHeight };
    }), { once: true });
  });
const drawnWhole = (page) => page.waitForSelector('[data-studio]:not([data-drawing])', { state: 'attached' });
const panelsShown = (page) => page.locator('[data-controls] > [data-panel]').evaluateAll((els) => els.map((el) => el.dataset.panel));

for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) studioTest(`switching to Groups draws what the window shows before the first paint, and the rest of the level soon after (${viewport.width} × ${viewport.height})`, { viewport }, async ({ page, choose }) => {
  await watchSwitch(page);
  await choose(page.locator('[data-levels]'), 'groups');
  await drawnWhole(page);
  const { frame, whole } = await page.evaluate(() => ({ frame: window.__switch.frame, whole: window.__switch.elements() }));
  assert.ok(frame, 'the frame after the switch was seen');
  assert.ok(frame.drawn.length >= 1 && frame.drawn.filter((each) => PANELS.includes(each.panel)).every((each) => each.top < frame.window), `the panels drawn at the switch are the ones that start in the window: ${JSON.stringify(frame.drawn)}`);
  assert.ok(frame.pending.length > 0 && Math.min(...frame.pending) >= frame.window, `and no holder is shown in the window: ${JSON.stringify(frame)}`);
  assert.ok(frame.elements * 4 < whole, `the switch draws a part of the level, not all of it: ${frame.elements} elements at its frame, ${whole} once all is drawn`);
  console.log(`# the switch to Groups at ${viewport.width} × ${viewport.height}: ${frame.elements} elements of the level at its frame (${frame.drawn.map((each) => each.panel).join(', ')}), ${whole} once all is drawn`);

  // Once all is drawn, it is the level drawn whole: the same panels, in the same order, with the same elements.
  assert.deepEqual(await panelsShown(page), PANELS);
  assert.equal(await page.locator('[data-panel-pending]').count(), 0, 'no holder is left');
  assert.equal((await page.locator('[data-panel="a11y"]').count()) + (await page.locator('[data-panel="export"]').count()), 2, 'the checks and the file are drawn too');
  // Drawn again where the person is (the contrast chosen again draws the controls again), Groups is drawn whole at once.
  await page.evaluate(() => window.tanreiStudio.setContrast('standard'));
  assert.equal(await page.locator('[data-panel-pending]').count(), 0, 'drawn again in the level, nothing waits');
  assert.equal(await page.evaluate(() => window.__switch.elements()), whole, 'the level drawn whole at once holds what it held, drawn panel by panel');
});

studioTest('a panel the person scrolls to is drawn as it comes near; what the person looks at stays where it is when the level is drawn again', {}, async ({ page, choose }) => {
  // The idle callbacks are held, so that only the window and the scrolling draw: what they draw is then known.
  await page.evaluate(() => {
    const held = (window.__idle = []);
    window.requestIdleCallback = (callback) => held.push(callback);
  });
  await watchSwitch(page);
  await choose(page.locator('[data-levels]'), 'groups');
  await page.waitForFunction(() => window.__switch.frame);
  assert.equal(await page.evaluate(() => document.querySelector('[data-studio]').hasAttribute('data-drawing')), true, 'the root says the level is still being drawn');
  // The last holder — the file's panel, at the bottom — brought into view: it is drawn, and holders far above it are not.
  await page.locator('[data-panel-pending]').last().evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForSelector('[data-panel="export"]', { state: 'attached' });
  assert.ok((await page.locator('[data-panel-pending]').count()) > 0, 'the panels between the window and the scrolled-to one wait for the page to be idle');
  // The page is idle: the rest is drawn, one panel a callback.
  for (let calls = 0; (await page.locator('[data-panel-pending]').count()) && calls < 20; calls += 1) await page.evaluate(() => window.__idle.shift()?.({ didTimeout: false, timeRemaining: () => 50 }));
  await drawnWhole(page);
  assert.deepEqual(await panelsShown(page), PANELS);

  // The person is at Color; the level is drawn again (another contrast): Color is where it was, and so is the page.
  const at = await page.evaluate(() => {
    document.querySelector('[data-panel="color"]').scrollIntoView({ block: 'start', behavior: 'instant' });
    return { scroll: scrollY, top: document.querySelector('[data-panel="color"]').getBoundingClientRect().top };
  });
  await page.evaluate(() => window.tanreiStudio.setContrast('high'));
  assert.equal(await page.locator('[data-panel-pending]').count(), 0);
  assert.deepEqual(await page.evaluate(() => ({ scroll: scrollY, top: document.querySelector('[data-panel="color"]').getBoundingClientRect().top })), at);
});

studioTest('a fold writes what it holds when it first opens: a declaration of the layer’s own, the build’s warnings, the import', { layer: { id: 'acme', extends: 'tanrei', vocabulary: { 'tanrei.comp.button.size.3x': { from: 'large', scale: 1.5, rationale: 'A hero call to action, larger than large.' } } } }, async ({ page, level }) => {
  await level('groups');
  const folds = { extension: '[data-extension="tanrei.comp.button.size.3x"]', warnings: '[data-warnings-wrap]', import: '.ts-import' };
  const held = () => page.evaluate((all) => Object.fromEntries(Object.entries(all).map(([name, selector]) => [name, document.querySelector(selector).querySelectorAll(':scope > :not(summary)').length])), folds);
  assert.deepEqual(await held(), { extension: 0, warnings: 0, import: 0 }, 'closed, a fold holds its summary alone');
  for (const selector of Object.values(folds)) await page.locator(`${selector} > summary`).click();
  // (A fold says it opened with a `toggle` event, a task after the press.)
  await until(async () => Object.values(await held()).every((count) => count > 0), 'opened, each fold holds what it says');
  assert.equal(await page.locator(`${folds.extension} [data-extension-rationale]`).evaluate((el) => el.value), 'A hero call to action, larger than large.');
  assert.ok((await page.locator('[data-warnings] li').count()) > 0, 'the warnings, or the words that there are none');
  assert.equal(await page.locator('[data-import] textarea').count(), 1);
});
