// The frame: the Studio's bar (the app's items in it, undo and redo, the shuffle, Inspect), and under it the rail, the
// preview and the panel — side by side in a wide window, each scrolling by itself, one column in a narrow one — and the
// handle that resizes the panel. Undo and redo step through what was committed, and the file follows.
import assert from 'node:assert/strict';
import { studioTest } from './harness.js';

const box = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) }; });

studioTest('1440 wide: the bar holds the app’s items, the start point, undo and redo, the shuffle and Inspect; the rail, the preview and the panel stand side by side under it, and the page does not scroll', {}, async ({ page, axe }) => {
  const bar = page.locator('[data-bar]');
  assert.deepEqual(await bar.evaluate((el) => [...el.children].map((child) => child.className)), ['ts-bar-host', 'ts-bar-tools ts-bar-start', 'ts-bar-history', 'ts-bar-tools', 'ts-file', 'ts-bar-tools ts-bar-inspect', 'ts-bar-host ts-bar-end']);
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

studioTest('the width is kept for what the panel holds: Inspect’s tokens and Source start wider than a width given to a section, and each keeps the one given to it', {}, async ({ page, inspect, section }) => {
  const handle = page.locator('[data-panel-handle]');
  const width = async () => (await box(page, '[data-inspector]')).width;
  const edit = await width();
  await inspect('tokens');
  const tokens = await width();
  assert.ok(tokens > edit, `Inspect’s tokens start wider: ${tokens} > ${edit}`);
  await inspect('source');
  const source = await width();
  assert.ok(source > edit, `Source starts wider: ${source} > ${edit}`);
  await section('color');
  await handle.focus();
  await page.keyboard.press('Home');
  assert.equal(await width(), 320, 'a section at its least');
  await section('dials');
  assert.equal(await width(), 320, 'every section shares it');
  await inspect('tokens');
  assert.equal(await width(), tokens, 'Inspect’s tokens keep their own start');
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await width(), tokens - 16, 'and a width given to them');
  await section('color');
  assert.equal(await width(), 320, 'the sections keep the one given to them');
  await page.reload();
  await page.waitForSelector('[data-save-state="saved"]');
  assert.equal(await width(), 320, 'kept across a reload');
  await inspect('tokens');
  assert.equal(await width(), tokens - 16);
  assert.equal(await handle.evaluate((el) => el.value), tokens - 16, 'the handle says the width of what is shown');
});

studioTest('undo and redo step through what was committed, and the file follows; ⌘Z and ⇧⌘Z do the same', { layer: { id: 'acme', extends: 'tanrei' } }, async ({ page, saved, section }) => {
  const undo = page.locator('[data-undo]');
  const redo = page.locator('[data-redo]');
  assert.equal(await undo.evaluate((el) => el.disabled), true);
  page.on('dialog', (dialog) => dialog.accept());
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
