// The preview draws with REAL fonts: the app registers the families
// the shipped systems name — from its own origin, never a font host — so choosing a preset shows that preset's
// faces, and "not installed here" is said only about families nobody registered and this device does not have.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

studioTest('on m3-like the preview draws Roboto and Material Symbols Outlined for real, from this origin — and nothing is called missing', { layer: { id: 'acme', extends: 'm3-like' } }, async ({ page, section, css, lightPane, requests, server }) => {
  await section('typeface');
  const headline = lightPane.locator('[data-sample="heading-1"]');
  assert.match(await css(headline, 'font-family'), /^Roboto\b/);
  const icon = lightPane.locator('[data-icon-row="unselected"] .tanrei-icon').first();
  assert.match(await css(icon, 'font-family'), /^"Material Symbols Outlined"/);

  // Registered by the page itself (so it does not matter what this machine has installed), and loaded.
  const faces = await page.evaluate(async () => {
    await Promise.all(['16px "Roboto"', '24px "Material Symbols Outlined"'].map((font) => document.fonts.load(font, 'BESbswy home')));
    return Object.fromEntries(['Roboto', 'Material Symbols Outlined'].map((family) => [family, [...document.fonts].filter((face) => face.family.replace(/["']/g, '') === family).map((face) => face.status)]));
  });
  for (const [family, statuses] of Object.entries(faces)) assert.ok(statuses.includes('loaded'), `${family}: a registered face is loaded (${statuses.join(', ') || 'none registered'})`);
  const origin = new URL(server.url).origin;
  for (const file of [/\/assets\/roboto-latin-wght-normal-[\w-]+\.woff2$/, /\/assets\/material-symbols-outlined-[\w-]+\.woff2$/]) assert.ok(requests.some((url) => url.startsWith(origin) && file.test(url)), `${file} came from this origin`);

  // Drawn: the ligature "home" is one glyph wide, not the width of the word; Roboto's metrics are not the fallback's.
  await until(async () => (await icon.evaluate((el) => el.scrollWidth)) <= 26, 'the icon is a glyph, not the word "home"');
  assert.ok(await page.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); const w = (font) => ((c.font = font), c.measureText('BESbswy mmwwll 0123').width); return w('72px Roboto, monospace') !== w('72px monospace'); }));

  // The Studio's own note agrees: nothing to report for the families this base asks for.
  await page.waitForTimeout(300);
  assert.equal(await page.locator('[data-typeface="brand"] [data-font-note]').isVisible(), false);
  assert.deepEqual(await page.locator('[data-typeface="brand"] [data-stack-list] > tanrei-list-item [data-stack-missing]').evaluateAll((notes) => notes.filter((note) => !note.hidden).map((note) => note.textContent)), []);
  for (const key of ['family', 'unselected', 'selected']) assert.equal(await page.locator(`[data-icon-note="${key}"]`).isVisible(), false, `icons: ${key}`);
});
