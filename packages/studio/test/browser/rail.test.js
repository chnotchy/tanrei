// The rail: the nine rows of the look — each with what it holds now and a sample drawn in the layer, and a lock — and
// the rest of what a layer holds. A row shows its controls in the panel; the shuffle gives every row that is not locked
// another value, in one step to undo; Inspect opens over the panel with the token tree and the file.
import assert from 'node:assert/strict';
import { studioTest } from './harness.js';

const ROWS = ['color', 'neutral', 'typeface', 'size', 'radius', 'smoothing', 'icons', 'press', 'focus'];
const MORE = ['base', 'dials', 'palettes', 'components', 'behavior', 'vocabulary', 'about', 'a11y'];
/** What the panel holds for each section, panel by panel; Export stands at the foot of every one. */
const PANELS = { color: ['brand'], neutral: ['neutral'], typeface: ['typefaces'], size: ['size'], radius: ['radius'], smoothing: ['shape'], icons: ['icons'], press: ['press'], focus: ['focus'], base: ['base'], dials: ['dials'], palettes: ['color'], components: ['components'], behavior: ['behavior'], vocabulary: ['add'], about: ['about'], a11y: ['a11y'] };
const panels = (page) => page.locator('[data-inspector] [data-panel]').evaluateAll((els) => els.map((el) => el.dataset.panel));
const current = (page) => page.locator('[data-rail] [data-row][aria-current="true"]').evaluateAll((els) => els.map((el) => el.dataset.row));
const value = (page, row) => page.locator(`[data-rail] [data-row="${row}"] .ts-rail-value`).textContent();

studioTest('the rail lists the nine rows, then the rest; each shows its panel, and the row the panel shows is the current one', {}, async ({ page, section, axe, targets }) => {
  assert.deepEqual(await page.locator('[data-rail-rows] [data-row]').evaluateAll((els) => els.map((el) => el.dataset.row)), ROWS);
  assert.deepEqual(await page.locator('[data-rail-more] [data-row]').evaluateAll((els) => els.map((el) => el.dataset.row)), MORE);
  assert.equal(await page.locator('[data-rail]').evaluate((el) => el.localName), 'nav', 'a navigation region');
  assert.deepEqual(await current(page), ['color'], 'the brand color first');
  assert.deepEqual(await panels(page), ['brand', 'export']);
  // Every row says what it holds, and draws a sample.
  assert.deepEqual(await Promise.all(ROWS.map((row) => value(page, row))), ['none (monochrome)', 'hue 0 · chroma 0', 'Inter', 'density 1 · 4px', '2px', '0', 'Material Symbols Rounded · 300', 'overlay', 'ring']);
  assert.equal(await page.locator('[data-rail] .ts-sample').count(), ROWS.length);
  for (const name of [...ROWS, ...MORE]) {
    await section(name);
    assert.deepEqual(await current(page), [name], `${name} is current`);
    assert.deepEqual(await panels(page), [...PANELS[name], 'export'], `${name}: its panels`);
  }
  await section('color');
  await axe('[data-studio]', 'the rail and the panel');
  await targets('the rail');
});

studioTest('a row says what the layer holds, its sample is drawn in the layer, and an edit elsewhere is shown on it', {}, async ({ page, section, inspect, saved, scope }) => {
  await page.locator('[data-panel="brand"] tanrei-color-field input[type="text"]').first().fill('#0f766e');
  await page.locator('[data-panel="brand"] tanrei-color-field input[type="text"]').first().press('Enter');
  await saved((file) => file.palettes?.primary?.source?.seed === '#0f766e', 'the seed');
  assert.equal(await value(page, 'color'), '#0F766E');
  assert.equal(await page.locator('[data-row="color"]').evaluate((el) => el.hasAttribute('data-changed')), true, 'marked as changed');
  // The sample's color is the preview's primary, whatever the Studio's own chrome is drawn in.
  const sample = await page.locator('[data-sample-of="color"] i').evaluate((el) => getComputedStyle(el).backgroundColor);
  const primary = await scope.locator('.ts-pane').first().evaluate((el) => getComputedStyle(el).getPropertyValue('--tanrei-sys-color-primary') && getComputedStyle(el.querySelector('.ts-intent span')).backgroundColor);
  assert.equal(sample, primary, 'the sample draws the layer’s primary');
  // A dial moved in Dials is the Corners row's value.
  await section('dials');
  const shape = page.locator('[data-dial="tanrei.dial.shape.unit"] tanrei-number-field input');
  await shape.fill('4');
  await shape.press('Enter');
  await saved((file) => file.tokens?.['tanrei.dial.shape.unit']?.$value?.value === 4, 'the shape unit');
  assert.equal(await value(page, 'radius'), '4px');
  // A behaviour chosen in its row's panel.
  await section('press');
  await page.locator('[data-panel="press"] [data-behavior="pressed-feedback"] tanrei-radio-button[data-value="ripple"]').click();
  await saved((file) => file.tokens?.['tanrei.sys.behavior.pressed-feedback'], 'the press feedback');
  assert.equal(await value(page, 'press'), 'ripple');
  assert.equal(await page.locator('[data-sample-of="press"]').textContent(), 'water_drop', 'and its glyph');
  await inspect('tokens');
  assert.deepEqual(await current(page), ['press'], 'Inspect leaves the row current: closing it goes back there');
});

studioTest('the shuffle gives every row that is not locked another value, in one step to undo; the locks are kept for the next visit', {}, async ({ page, saved, onDisk }) => {
  await page.locator('[data-lock="color"]').click();
  await page.locator('[data-lock="typeface"]').click();
  assert.deepEqual(await page.locator('[data-lock]').evaluateAll((els) => els.filter((el) => el.selected).map((el) => el.dataset.lock)), ['color', 'typeface']);
  const before = await Promise.all(ROWS.map((row) => value(page, row)));
  await page.locator('[data-shuffle]').click();
  await saved((file) => Object.keys(file.tokens ?? {}).length > 0, 'the shuffled layer');
  const after = await Promise.all(ROWS.map((row) => value(page, row)));
  ROWS.forEach((row, i) => (['color', 'typeface'].includes(row) ? assert.equal(after[i], before[i], `${row} is locked`) : assert.notEqual(after[i], before[i], `${row} changed`)));
  const file = onDisk();
  assert.equal(file.palettes?.primary, undefined, 'nothing written for the locked brand color');
  assert.equal(file.tokens['tanrei.ref.typeface.brand'], undefined, 'nor the locked typeface');
  assert.match(await page.locator('[data-status]').textContent(), /2 locked rows kept/);
  await page.locator('[data-undo]').click();
  await saved((layer) => !layer.tokens && !layer.palettes, 'one undo takes the whole shuffle back');
  await page.reload();
  await page.waitForSelector('[data-save-state="saved"]');
  assert.deepEqual(await page.locator('[data-lock]').evaluateAll((els) => els.filter((el) => el.selected).map((el) => el.dataset.lock)), ['color', 'typeface'], 'the locks are kept');
});

studioTest('Inspect opens over the panel at the token tree or Source, says it is open, and closes back to the row', {}, async ({ page, section, axe }) => {
  const button = page.locator('[data-inspect]');
  await section('icons');
  assert.equal(await page.locator('[data-inspect-head]').isHidden(), true);
  await button.click();
  assert.equal(await button.evaluate((el) => el.selected), true, 'the toggle says Inspect is open');
  assert.equal(await page.locator('[data-studio]').getAttribute('data-pane'), 'tokens');
  assert.deepEqual(await panels(page), ['tree', 'rules', 'export']);
  assert.equal(await page.locator('[data-inspector]').getAttribute('aria-label'), 'Inspect');
  await page.locator('[data-inspect-tabs] tanrei-tab[data-value="source"]').click();
  assert.deepEqual(await panels(page), ['source', 'export']);
  await axe('[data-studio]', 'Inspect at Source');
  await page.locator('[data-inspect-close]').click();
  assert.equal(await page.locator('[data-studio]').getAttribute('data-pane'), 'edit');
  assert.deepEqual(await panels(page), ['icons', 'export'], 'back to the row it was opened from');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-inspect]') !== null), true, 'the focus goes back to Inspect’s button');
  // It opens at the tab it was last at.
  await button.click();
  assert.equal(await page.locator('[data-studio]').getAttribute('data-pane'), 'source');
  await button.click();
  assert.equal(await page.locator('[data-studio]').getAttribute('data-pane'), 'edit', 'and the button closes it');
});

studioTest('a link to a token opens Inspect at it; the warnings count opens Accessibility', {}, async ({ page, section }) => {
  await section('components');
  const button = page.locator('[data-component="button"]');
  await button.locator('summary').first().click();
  await button.locator('tanrei-button.ts-link').filter({ hasText: 'Every token of it' }).click();
  assert.equal(await page.locator('[data-studio]').getAttribute('data-pane'), 'tokens');
  await page.waitForSelector('[data-detail="tanrei.comp.button.container.shape"]');
  assert.equal(await page.locator('[data-token-name]').textContent(), 'comp.button.container.shape', 'the token is chosen');
  await page.locator('[data-a11y-count]').click();
  assert.deepEqual(await current(page), ['a11y']);
  assert.equal(await page.locator('[data-studio]').getAttribute('data-pane'), 'edit');
  assert.equal(await page.locator('[data-panel="a11y"]').count(), 1);
});
