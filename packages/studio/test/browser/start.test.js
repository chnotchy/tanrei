// The start point, first in the bar: a menu of what the layer starts from — the default system, the root (listed, not
// offered until it is a blank start, with the reason), the examples of the theme gallery — and a file to load in the
// layer's place. A layer that holds changes asks first; a new start and a loaded file are each one step to undo. A file
// the schema refuses is not loaded, and the panel says why; one it accepts is loaded, with what the engine says of it.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

const menu = (page) => page.locator('[data-start-menu]');
const openMenu = async (page) => {
  await page.locator('[data-start-open]').click();
  await page.waitForFunction(() => document.querySelector('[data-start-menu]')?.open === true);
  // Grown in: a surface still fading in is no color to measure.
  await page.waitForFunction(() => document.querySelector('[data-start-menu]').shadowRoot.getAnimations({ subtree: true }).every((animation) => animation.playState !== 'running'));
};
const label = (page) => page.locator('[data-start-label]').textContent();
/** The dialogs the page opened, each answered as `answer` says (Playwright would dismiss one nobody listens for). */
const dialogs = (page, answer = 'accept') => {
  const seen = [];
  page.on('dialog', (dialog) => (seen.push(dialog.message()), answer === 'accept' ? dialog.accept() : dialog.dismiss()));
  return seen;
};
/** Load a file through the menu's item and the browser's own picker. */
const loadFile = async (page, name, text) => {
  await openMenu(page);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), menu(page).locator('[data-start-file]').click()]);
  await chooser.setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
};
const report = (page) => page.locator('[data-import-report]');

studioTest('the bar’s start point: the default system, the root listed and not offered with its reason, the examples of the gallery, and a file', {}, async ({ page, axe, targets }) => {
  assert.equal(await label(page), 'Start: Tanrei');
  // The button says it opens a menu, and whether it is open (on the native button its shadow root holds).
  const aria = (name) => page.locator('[data-start-open]').evaluate((el, attribute) => el.shadowRoot.querySelector('button').getAttribute(attribute), name);
  assert.equal(await aria('aria-haspopup'), 'menu');
  assert.equal(await aria('aria-expanded'), 'false');
  await openMenu(page);
  assert.equal(await aria('aria-expanded'), 'true');
  const rows = await menu(page).locator('tanrei-menu-group').evaluateAll((groups) => groups.map((group) => [group.getAttribute('label'), group.value, [...group.querySelectorAll('tanrei-menu-radio-item')].map((item) => [item.value, item.label, item.supportingText, item.disabled])]));
  assert.deepEqual(rows[0], ['Start from', 'tanrei', [
    ['tanrei', 'Tanrei', 'The default system', false],
    ['core', 'Core', 'Not yet: Tanrei’s root layer still holds the default system’s values. It becomes a blank start once its values are neutral.', true],
  ]]);
  assert.equal(rows[1][0], 'Theme gallery examples');
  assert.equal(rows[1][1], null, 'no example is the start');
  assert.deepEqual(rows[1][2].map(([id]) => id).sort(), ['cupertino', 'm3-expressive-like', 'm3-like']);
  for (const [id, , note, disabled] of rows[1][2]) assert.ok(note.endsWith('An example, not an official design.') && !disabled, id);
  assert.equal(await menu(page).locator('[data-start-file]').getAttribute('label'), 'Import a file…');
  // The root is reachable from the keyboard, says it is disabled — its reason is its description — and pressing it does nothing.
  const core = menu(page).locator('[data-start="core"]');
  assert.equal(await core.getAttribute('aria-disabled'), 'true');
  assert.match(await core.getAttribute('aria-description'), /^Not yet: /);
  const focused = () => core.evaluate((el) => el === document.activeElement);
  for (let step = 0; step < 6 && !(await focused()); step += 1) await page.keyboard.press('ArrowDown');
  assert.equal(await focused(), true, 'the arrow keys reach the root');
  await page.keyboard.press('Enter');
  assert.equal(await menu(page).evaluate((el) => el.open), true, 'the menu stays open');
  assert.equal(await label(page), 'Start: Tanrei');
  assert.equal(await page.evaluate(() => (window.tanreiStudio.startFrom('core'), window.tanreiStudio.getLayer().extends)), 'tanrei', 'nor does the page’s API start from it');
  await axe('[data-start-menu]', 'the start point’s menu');
  await targets('the start point’s menu', '[data-start-point]');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('[data-start-menu]').open === false);
  await page.waitForFunction(() => document.activeElement?.matches('[data-start-open]'), null, { timeout: 5000 });
});

studioTest('another start: an untouched layer starts from it without asking; one with changes asks, may stay, and Undo brings the changes back', {}, async ({ page, saved, section }) => {
  const asked = dialogs(page);
  await openMenu(page);
  await menu(page).locator('[data-start="m3-like"]').click();
  await saved((layer) => layer.extends === 'm3-like', 'the start');
  assert.deepEqual(asked, [], 'nothing to replace: no question');
  assert.equal(await label(page), 'Start: m3-like');
  assert.match(await page.locator('[data-status]').textContent(), /Started from m3-like\. Undo takes it back\./);
  await openMenu(page);
  assert.deepEqual(await menu(page).locator('tanrei-menu-group').evaluateAll((groups) => groups.map((group) => group.value)), [null, 'm3-like']);
  await page.keyboard.press('Escape');

  // A change, then another start: asked, declined — the layer stays as it is.
  await page.evaluate(() => window.tanreiStudio.setLayer({ id: 'acme', extends: 'm3-like', palettes: { primary: { source: { seed: '#0b6e4f' } } } }));
  await saved((layer) => layer.palettes?.primary, 'the change');
  page.removeAllListeners('dialog');
  const declined = dialogs(page, 'dismiss');
  await openMenu(page);
  await menu(page).locator('[data-start="cupertino"]').click();
  await until(async () => declined.length === 1, 'asked');
  assert.equal(declined[0], 'Start from cupertino? Your changes to this layer are replaced; Undo brings them back.');
  await until(async () => (await label(page)) === 'Start: m3-like', 'the start stays');
  assert.equal((await page.evaluate(() => window.tanreiStudio.getLayer())).extends, 'm3-like');
  await openMenu(page);
  assert.deepEqual(await menu(page).locator('tanrei-menu-group').evaluateAll((groups) => groups.map((group) => group.value)), [null, 'm3-like'], 'the menu says the start the layer still has');
  await page.keyboard.press('Escape');

  // Accepted: a fresh layer on cupertino; Undo brings the change back, on m3-like.
  page.removeAllListeners('dialog');
  dialogs(page);
  await openMenu(page);
  await menu(page).locator('[data-start="cupertino"]').click();
  await saved((layer) => layer.extends === 'cupertino' && !layer.palettes, 'the new start');
  await page.locator('[data-undo]').click();
  await saved((layer) => layer.extends === 'm3-like' && layer.palettes?.primary?.source?.seed === '#0b6e4f', 'undone');
  assert.equal(await label(page), 'Start: m3-like');
  // The Base system panel says the same base.
  await section('base');
  assert.equal(await page.locator('[data-base]').evaluate((el) => el.value), 'm3-like');
});

studioTest('a layer with every value written out starts from the root: the bar names Core, checked and not offered', { layer: { id: 'acme', extends: 'core' } }, async ({ page }) => {
  assert.equal(await label(page), 'Start: Core');
  await openMenu(page);
  assert.equal(await menu(page).locator('[data-start-group="start"]').evaluate((group) => group.value), 'core');
  assert.equal(await menu(page).locator('[data-start="core"]').evaluate((item) => item.disabled), true);
  await page.keyboard.press('Escape');
});

studioTest('a file: a layer the schema accepts is loaded, one step to undo; what the engine finds is said in the panel; what the schema refuses is not loaded, and the panel says why', {}, async ({ page, saved, onDisk, axe }) => {
  dialogs(page);
  // A good layer: loaded, saved, nothing to report.
  await loadFile(page, 'acme.system.json', JSON.stringify({ id: 'acme', extends: 'cupertino', palettes: { primary: { source: { seed: '#0b6e4f' } } } }));
  await saved((layer) => layer.extends === 'cupertino' && layer.palettes?.primary, 'the file’s layer');
  assert.equal(await label(page), 'Start: cupertino');
  assert.equal(await report(page).evaluate((el) => el.open), false);
  assert.match(await page.locator('[data-status]').textContent(), /Loaded acme\.system\.json\./);
  await page.locator('[data-undo]').click();
  await saved((layer) => layer.extends === 'tanrei' && !layer.palettes, 'undone');

  // Not JSON: refused, said in the panel; the layer is as it was.
  await loadFile(page, 'broken.json', '{ "id": "acme", ');
  await until(() => report(page).evaluate((el) => el.open), 'the report');
  assert.equal(await report(page).getAttribute('status'), 'error');
  assert.match(await report(page).textContent(), /broken\.json was not loaded/);
  assert.match(await report(page).locator('[data-import-problems]').textContent(), /That is not valid JSON/);
  assert.deepEqual(onDisk(), { id: 'acme', extends: 'tanrei' });
  await axe('[data-inspector]', 'the panel, with a file refused');

  // What the schema refuses: each of its problems.
  await loadFile(page, 'colours.json', JSON.stringify({ id: 'acme', extends: 'tanrei', colours: {} }));
  await until(async () => /colours\.json was not loaded/.test(await report(page).textContent()), 'the report');
  assert.match(await report(page).locator('[data-import-problems]').textContent(), /additional properties/);
  // A system the Studio does not have.
  await loadFile(page, 'elsewhere.json', JSON.stringify({ id: 'acme', extends: 'nope' }));
  await until(async () => /elsewhere\.json was not loaded/.test(await report(page).textContent()), 'the report');
  assert.match(await report(page).locator('[data-import-problems]').textContent(), /"extends": "nope" is not a shipped system/);
  assert.deepEqual(onDisk(), { id: 'acme', extends: 'tanrei' });

  // The schema accepts it, the engine does not: loaded, and its problems said, in the engine's words.
  await loadFile(page, 'acme.system.json', JSON.stringify({ id: 'acme', extends: 'tanrei', tokens: { 'tanrei.sys.space.nope': { scale: 2 } } }));
  await until(async () => (await report(page).getAttribute('status')) === 'warning', 'the report');
  assert.match(await report(page).textContent(), /Loaded acme\.system\.json, with 1 problem/);
  assert.match(await report(page).locator('[data-import-problems]').textContent(), /tanrei\.sys\.space\.nope: unknown token/);
  assert.deepEqual((await page.evaluate(() => window.tanreiStudio.getLayer())).tokens, { 'tanrei.sys.space.nope': { scale: 2 } });
  await page.waitForSelector('[data-save-state="invalid"]');
  await axe('[data-inspector]', 'the panel, with a file loaded with a problem');
  // Closed; Undo goes back to the layer before it.
  await report(page).locator('tanrei-button').last().click();
  await until(async () => !(await report(page).evaluate((el) => el.open)), 'closed');
  await page.locator('[data-undo]').click();
  await saved((layer) => !layer.tokens, 'undone');
});

studioTest('a file over a layer with changes asks first', { layer: { id: 'acme', extends: 'tanrei', palettes: { primary: { source: { seed: '#0b6e4f' } } } } }, async ({ page, saved }) => {
  const asked = dialogs(page, 'dismiss');
  await loadFile(page, 'acme.system.json', JSON.stringify({ id: 'acme', extends: 'm3-like' }));
  await until(async () => asked.length === 1, 'asked');
  assert.equal(asked[0], 'Load acme.system.json? Your changes to this layer are replaced; Undo brings them back.');
  assert.equal((await page.evaluate(() => window.tanreiStudio.getLayer())).extends, 'tanrei');
  page.removeAllListeners('dialog');
  dialogs(page);
  await loadFile(page, 'acme.system.json', JSON.stringify({ id: 'acme', extends: 'm3-like' }));
  await saved((layer) => layer.extends === 'm3-like' && !layer.palettes, 'loaded');
});

studioTest('390 wide, in Japanese: the start point fits the bar, and its menu speaks the language', { viewport: { width: 390, height: 844 }, locale: 'ja' }, async ({ page, fits, axe }) => {
  assert.equal(await label(page), '開始点: Tanrei');
  await fits('[data-bar]', 'the bar, with the start point');
  await openMenu(page);
  assert.deepEqual(await menu(page).locator('tanrei-menu-group').evaluateAll((groups) => groups.map((group) => group.getAttribute('label'))), ['ここから始める', 'テーマギャラリーの例']);
  assert.equal(await menu(page).locator('[data-start-file]').getAttribute('label'), 'ファイルを読み込む…');
  await axe('[data-start-menu]', 'the start point’s menu, narrow, in Japanese');
});
