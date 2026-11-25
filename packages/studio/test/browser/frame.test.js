// The frame: the Studio's bar (the app's items in it, undo and redo, the shuffle, Inspect), and under it the rail, the
// preview and the panel — side by side in a wide window, each scrolling by itself, one column in a narrow one — and the
// handle that resizes the panel; Inspect is a side sheet over all of it. Undo and redo step through what was
// committed, and the file follows.
import assert from 'node:assert/strict';
import { studioTest } from './harness.js';

const box = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) }; });

studioTest('1440 wide: the bar holds the app’s items, the start point, undo and redo, the shuffle and Inspect; the rail, the preview and the panel stand side by side under it, and the page does not scroll', {}, async ({ page, axe }) => {
  const bar = page.locator('[data-bar]');
  assert.deepEqual(await bar.evaluate((el) => [...el.children].map((child) => child.className)), ['ts-bar-host', 'ts-bar-tools ts-bar-start', 'ts-bar-history', 'ts-bar-tools', 'ts-bar-tools ts-bar-inspect', 'ts-file', 'ts-bar-tools ts-bar-out', 'ts-bar-host ts-bar-end']);
  assert.equal(await bar.locator('.app-brand').count(), 1, 'the app’s brand is in the Studio’s bar');
  assert.equal(await page.locator('.app-bar').count(), 0, 'and the holder it came in is gone');
  const [rail, preview, panel] = await Promise.all(['[data-rail]', '.ts-preview', '[data-inspector]'].map((selector) => box(page, selector)));
  assert.ok(rail.right <= preview.left && preview.right <= panel.left, JSON.stringify({ rail, preview, panel }));
  assert.equal(panel.bottom, 1100, 'down to the window’s foot');
  assert.deepEqual(await page.evaluate(() => [document.scrollingElement.scrollWidth, document.scrollingElement.scrollHeight]), [1440, 1100]);
  assert.equal(await page.locator('[data-frame]').evaluate((el) => el.localName), 'main', 'the frame is the main region');
  await axe('[data-studio]', 'the frame');
});

studioTest('the handle: a drag and the keys resize the panel, and the width is kept for the next visit', {}, async ({ page }) => {
  const handle = page.locator('[data-panel-handle]');
  const width = async () => (await box(page, '[data-inspector]')).width;
  const before = await width();
  // A drag toward the start edge widens the panel by the distance dragged.
  const at = await handle.boundingBox();
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
  await page.mouse.down();
  await page.mouse.move(at.x + at.width / 2 - 60, at.y + at.height / 2, { steps: 6 });
  await page.mouse.up();
  assert.equal(await width(), before + 60);
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await width(), before + 44, 'a step of the arrow key toward the end edge narrows it');
  await page.keyboard.press('Enter');
  assert.equal(await width(), 320, 'Enter: the least');
  await page.keyboard.press('Enter');
  assert.equal(await width(), before + 44, 'and back');
  await page.reload();
  await page.waitForSelector('[data-save-state="saved"]');
  assert.equal(await width(), before + 44, 'kept across a reload');
});

studioTest('Inspect is a side sheet over the frame, wide enough for the tree and the editor side by side; the panel keeps the width given to it under the sheet and after it', {}, async ({ page, inspect, section }) => {
  const handle = page.locator('[data-panel-handle]');
  const width = async () => (await box(page, '[data-inspector]')).width;
  await section('color');
  await handle.focus();
  await page.keyboard.press('End');
  const given = await width();
  assert.ok(given > 320, `a width given to the panel: ${given}`);
  await inspect('tokens');
  assert.equal(await width(), given, 'the sheet stands over the frame: the panel is as it was under it');
  const sheet = (await box(page, '[data-inspect-controls]')).width;
  assert.ok(sheet >= 640, `what the sheet holds is wide enough for the tree and the editor side by side: ${sheet}`);
  const panes = await page.evaluate(() => [document.querySelector('[data-tree]').getBoundingClientRect(), document.querySelector('[data-token-pane]').getBoundingClientRect()].map((r) => [Math.round(r.left), Math.round(r.top)]));
  assert.ok(panes[1][0] > panes[0][0], `the editor beside the tree: ${JSON.stringify(panes)}`);
  await section('dials');
  assert.equal(await width(), given, 'after it too');
  await page.reload();
  await page.waitForSelector('[data-save-state="saved"]');
  assert.equal(await width(), given, 'and across a reload');
});

studioTest('undo and redo step through what was committed, and the file follows; ⌘Z and ⇧⌘Z do the same', { layer: { id: 'acme', extends: 'tanrei' } }, async ({ page, saved, section }) => {
  const undo = page.locator('[data-undo]');
  const redo = page.locator('[data-redo]');
  assert.equal(await undo.evaluate((el) => el.disabled), true);
  await section('base');
  await page.locator('[data-panel="base"] tanrei-radio-button[data-value="cupertino"]').click();
  await saved((file) => file.extends === 'cupertino', 'the base');
  await undo.click();
  await saved((file) => file.extends === 'tanrei', 'undone');
  await redo.click();
  await saved((file) => file.extends === 'cupertino', 'redone');
  await page.locator('[data-rail] [data-row="color"]').focus();
  await page.keyboard.press('ControlOrMeta+z');
  await saved((file) => file.extends === 'tanrei', '⌘Z');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await saved((file) => file.extends === 'cupertino', '⇧⌘Z');
  assert.equal(await page.locator('[data-status]').textContent(), 'Redone.');
});
