// Export: the side sheet the bar opens. Its line of checks, the file as the Studio would save it — a layer on an example
// of the theme gallery either depending on it or with every value written out — what the stylesheet changes, and the
// next steps; each file downloads under the name the CLI gives it. The sheet passes axe, keeps every target at 24 by
// 24 and fits a phone, in every language.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { studioTest } from './harness.js';

const sheet = (page) => page.locator('[data-export-sheet]');
const open = async (page) => {
  await page.locator('[data-export-open]').click();
  await page.waitForFunction(() => document.querySelector('[data-export-sheet]')?.open === true);
};
const tab = async (page, name) => {
  await page.locator(`[data-export-tabs] > tanrei-tab[data-tab="${name}"]`).click();
  await page.waitForFunction((key) => document.querySelector('[data-export-tabs]').value === key, name);
};
const shownJson = (page) => page.locator('[data-export-json]').evaluate((el) => JSON.parse(el.code));
/** What a button hands the person to save: its name and its text. */
const download = async (page, locator) => {
  const [file] = await Promise.all([page.waitForEvent('download'), locator.click()]);
  return { name: file.suggestedFilename(), text: fs.readFileSync(await file.path(), 'utf8') };
};

studioTest('Export opens from the bar over the Studio: the checks, the file as it is saved, its download, what next; it closes back to its button', {}, async ({ page, onDisk, axe, targets }) => {
  await open(page);
  assert.equal(await page.locator('[data-export-status]').getAttribute('data-state'), 'success');
  assert.match(await page.locator('[data-export-status]').textContent(), /Valid: the schema, the token engine and the build’s checks accept this file\./);
  assert.equal(await page.locator('[data-export-values]').isHidden(), true, 'a layer on the default system depends on nothing it could hold itself');
  assert.deepEqual(await shownJson(page), onDisk(), 'the file as the Studio saves it');
  assert.equal(await page.locator('[data-export-json]').getAttribute('headline'), 'acme.system.json');
  const file = await download(page, page.locator('[data-export-download]'));
  assert.deepEqual([file.name, JSON.parse(file.text)], ['acme.system.json', onDisk()]);
  await axe('[data-export-sheet]', 'Export, at the file');
  await tab(page, 'next');
  // The Studio edits a file here: it is saved as it changes, and built with the command.
  assert.match(await page.locator('[data-export-next]').textContent(), /saves every change to acme\.system\.json/);
  assert.deepEqual(await page.locator('[data-export-command]').evaluateAll((els) => els.map((el) => el.code)), ['npx tanrei build']);
  await axe('[data-export-sheet]', 'Export, at what next');
  await targets('Export', '[data-export-sheet]');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('[data-export-sheet]').open === false);
  await page.waitForFunction(() => document.activeElement?.matches('[data-export-open]'));
  assert.equal(await page.evaluate(() => window.tanreiStudio.getState().export.open), false);
});

studioTest('a layer on an example of the gallery depends on it, or holds every value: the file written out is one the Studio and the engine accept', { layer: { id: 'acme', extends: 'm3-like', palettes: { primary: { source: { seed: '#0b6e4f' } } } } }, async ({ page, choose, onDisk }) => {
  await open(page);
  const values = page.locator('[data-export-values]');
  assert.equal(await values.isVisible(), true);
  const group = page.locator('[data-export-every]');
  assert.equal(await group.evaluate((el) => el.value), 'depend', 'depending on the example is the default');
  assert.deepEqual(await group.locator('tanrei-radio-button').evaluateAll((els) => els.map((el) => el.getAttribute('label'))), ['Depend on \u2068M3-like (Material 3-inspired)\u2069', 'Write every value']);
  assert.equal((await shownJson(page)).extends, 'm3-like');
  assert.deepEqual(await shownJson(page), onDisk());
  await choose(group, 'every');
  await page.waitForFunction(() => document.querySelector('[data-export-json]').code.includes('"extends": "core"'));
  const written = await shownJson(page);
  assert.equal(written.extends, 'core', 'on the root, as the example is');
  assert.equal(written.palettes.primary.source.seed, '#0b6e4f', 'the layer’s own value wins');
  assert.ok(Object.keys(written.tokens).length > 100, 'and every value of the example is written');
  assert.deepEqual(written.components.include, [{ name: 'fab-menu', from: 'm3-like' }], 'the component that lives in the example is taken from it');
  assert.match(await page.locator('[data-export-values-help]').textContent(), /fab-menu lives in M3-like/);
  assert.equal(await page.locator('[data-export-status]').getAttribute('data-state'), 'success', 'the written-out file passes the checks');
  const file = await download(page, page.locator('[data-export-download]'));
  assert.deepEqual(JSON.parse(file.text), written);
  // Nothing in the Studio changed: the choice is the export's.
  assert.equal((await page.evaluate(() => window.tanreiStudio.getLayer())).extends, 'm3-like');
  // The file imports back, and the Studio computes it with no problem.
  await page.evaluate(() => window.tanreiStudio.closeExport());
  await page.evaluate((layer) => window.tanreiStudio.importLayer(layer), written);
  assert.deepEqual(await page.evaluate(() => window.tanreiStudio.getProblems()), []);
});

studioTest('CSS: what the stylesheet changes, as the build writes it, and the whole stylesheet to download', { layer: { id: 'acme', extends: 'tanrei', tokens: { 'tanrei.dial.shape.unit': { $value: { value: 6, unit: 'px' }, reason: 'Rounder, like the logo.' } } } }, async ({ page, axe }) => {
  await open(page);
  await tab(page, 'css');
  const css = await page.locator('[data-export-css]').evaluate((el) => el.code);
  assert.match(css, /^@layer tanrei\.tokens \{/);
  assert.match(css, /--tanrei-dial-shape-unit: 6px;/);
  assert.doesNotMatch(css, /--tanrei-sys-shape-corner-small:/, 'a corner follows the dial in the sheet: it is not among the changes');
  const whole = await download(page, page.locator('[data-export-download-css]'));
  assert.equal(whole.name, 'acme.css');
  assert.ok(whole.text.length > 100_000 && whole.text.includes('[data-tanrei-system="acme"]'), 'the whole sheet, scoped to the system');
  for (const line of css.split('\n').filter((each) => each.includes(': '))) assert.ok(whole.text.includes(line.trim()), `${line.trim()} is the build’s own declaration`);
  await axe('[data-export-sheet]', 'Export, at the CSS');
});

studioTest('a file that would not build: the line says so and nothing downloads', {}, async ({ page }) => {
  await page.evaluate(() => window.tanreiStudio.setLayer({ id: 'acme', extends: 'tanrei', tokens: { 'tanrei.sys.color.primary': { $value: '{tanrei.sys.color.nothing}' } } }));
  await open(page);
  assert.equal(await page.locator('[data-export-status]').getAttribute('data-state'), 'error');
  assert.match(await page.locator('[data-export-status]').textContent(), /Not valid/);
  assert.equal(await page.locator('[data-export-download]').evaluate((el) => el.disabled), true);
});

for (const locale of ['en-US', 'ja', 'zh-CN', 'hi', 'es', 'ar']) {
  studioTest(`${locale}: Export passes axe in each tab, its targets are 24 by 24, and at 390px it fits the window`, { layer: { id: 'acme', extends: 'cupertino' }, locale, viewport: { width: 390, height: 844 } }, async ({ page, axe, targets, fits }) => {
    await page.locator('[data-export-open]').scrollIntoViewIfNeeded();
    await open(page);
    for (const name of ['file', 'css', 'next']) {
      await tab(page, name);
      await axe('[data-export-sheet]', `Export, ${name} (${locale})`);
      await fits('[data-export-sheet]', `Export, ${name} (${locale})`);
    }
    await targets(`Export (${locale})`, '[data-export-sheet]');
    assert.deepEqual(await page.evaluate(() => window.tanreiStudio.missingWords()), [], 'every word a component needs is given');
  });
}
