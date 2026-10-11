// The file behind the Studio (the adapter): saved, refused, changed by someone else, and layered on local parents.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { studioTest, until } from './harness.js';

const dial = (value, reason = 'Tighter than the default.') => ({ 'tanrei.dial.space.unit': { $value: { value, unit: 'px' }, reason } });
const state = (page) => page.locator('[data-save-state]').getAttribute('data-save-state');
const typeSpacing = async (page, value) => {
  await page.locator('[data-dial="tanrei.dial.space.unit"] tanrei-number-field input').fill(String(value));
  await page.keyboard.press('Tab');
};

studioTest('the token leaves the address bar, the event stream opens with a ticket, a reload still reaches the file; an edit is saved and said to be', {}, async ({ page, server, requests, saved, onDisk }) => {
  await until(async () => (await page.locator('#session').textContent())?.includes('acme.system.json'), 'the session line');
  assert.equal(await page.evaluate(() => location.hash), '', 'location.hash is cleared');
  assert.ok(!(await page.evaluate(() => location.href)).includes(server.token));
  await until(() => requests.some((url) => url.includes('/api/events?ticket=')), 'the event stream');
  await page.reload();
  await page.waitForSelector('[data-save-state="saved"]');
  assert.match(await page.locator('[data-file]').textContent(), /Saved.*acme\.system\.json/);
  assert.equal(await page.locator('[data-id] input').isDisabled(), true, 'the id is the file name: locked');
  assert.match(await page.title(), /^acme — /);

  await typeSpacing(page, 9);
  await until(async () => ['unsaved', 'saving', 'saved'].includes(await state(page)), 'the state follows the edit');
  await saved((layer) => layer.tokens?.['tanrei.dial.space.unit']?.$value.value === 9, 'autosave');
  await page.waitForSelector('[data-save-state="saved"]');
  assert.deepEqual(Object.keys(onDisk()), ['id', 'extends', 'tokens'], 'the file is the layer, nothing else');
});

studioTest('a save the server refuses (422) is said in the server’s words, and the next good edit is saved', (t) => ({ server: { validate: (layer) => (layer.name === 'No' ? ['the server says: not this name'] : []) } }), async ({ page, level, expected, saved, onDisk }) => {
  expected.push(/422/);
  await level('groups');
  await page.locator('[data-name] input').fill('No');
  await page.waitForSelector('[data-save-state="error"]');
  assert.match(await page.locator('[data-file] .ts-error').textContent(), /the server says: not this name/);
  assert.equal(onDisk().name, undefined);
  await page.locator('[data-name] input').fill('Acme');
  await saved((layer) => layer.name === 'Acme', 'the next edit');
  await page.waitForSelector('[data-save-state="saved"]');
});

studioTest('409: the file changed underneath an unsaved edit — nothing is overwritten until the person chooses; "Keep mine" and "Reload from disk" both do what they say', { server: { announce: false } }, async ({ page, file, write, expected, onDisk, css, scope }) => {
  expected.push(/409/);
  // Someone edits the file in their editor (this mock says nothing over the event stream, so the SAVE finds out).
  write(file, { id: 'acme', extends: 'tanrei', name: 'Edited by hand' });
  await typeSpacing(page, 9);
  await page.waitForSelector('[data-save-state="conflict"]');
  const banner = page.locator('[data-banner]');
  assert.match(await banner.textContent(), /The file changed on disk\..*You have edits here that are not in it\. Nothing is overwritten until you choose\./);
  assert.equal(await banner.getAttribute('role'), 'alert');
  assert.equal(onDisk().name, 'Edited by hand', 'the hand edit is still there');
  // More edits while the question is open are not sent either.
  await typeSpacing(page, 10);
  await page.waitForTimeout(900);
  assert.deepEqual(onDisk(), { id: 'acme', extends: 'tanrei', name: 'Edited by hand' });
  await banner.locator('[data-keep-mine]').click();
  await until(() => onDisk().tokens?.['tanrei.dial.space.unit']?.$value.value === 10, 'mine is written, knowingly');
  await page.waitForSelector('[data-save-state="saved"]');
  assert.ok(await banner.isHidden());
  assert.equal(onDisk().name, undefined);

  // Again, and this time theirs is taken: the controls and the preview show the file.
  write(file, { id: 'acme', extends: 'tanrei', tokens: dial(6, 'Edited by hand, again.') });
  await typeSpacing(page, 12);
  await page.waitForSelector('[data-save-state="conflict"]');
  await banner.locator('[data-reload]').click();
  await page.waitForSelector('[data-save-state="saved"]');
  assert.equal(await page.locator('[data-dial="tanrei.dial.space.unit"] tanrei-number-field input').inputValue(), '6');
  assert.equal(onDisk().tokens['tanrei.dial.space.unit'].reason, 'Edited by hand, again.');
  assert.deepEqual(await page.evaluate(() => window.tanreiStudio.getLayer().tokens['tanrei.dial.space.unit'].$value), { value: 6, unit: 'px' });
  assert.ok((await css(scope, '--tanrei-dial-space-unit')).trim().length > 0);
});

studioTest('an edit made elsewhere is announced: with nothing unsaved here the Studio offers to reload; the same content is no news', {}, async ({ page, file, write, onDisk, saved }) => {
  const banner = page.locator('[data-banner]');
  write(file, { id: 'acme', extends: 'tanrei', tokens: dial(7) });
  await page.waitForSelector('[data-save-state="conflict"]');
  assert.match(await banner.textContent(), /The file changed on disk\..*Reload to see it here\./);
  assert.match(await banner.locator('[data-keep-mine]').textContent(), /Keep what is open/);
  await banner.locator('[data-reload]').click();
  await page.waitForSelector('[data-save-state="saved"]');
  assert.equal(await page.locator('[data-dial="tanrei.dial.space.unit"] tanrei-number-field input').inputValue(), '7');
  // The same layer written again with other whitespace (a formatter): another etag, the same content — not a conflict.
  fs.writeFileSync(file, JSON.stringify(onDisk()));
  await page.waitForTimeout(1200);
  assert.equal(await state(page), 'saved');
  assert.ok(await banner.isHidden());
  // …and the next save from here goes through.
  await typeSpacing(page, 9);
  await saved((layer) => layer.tokens['tanrei.dial.space.unit'].$value.value === 9, 'saved after the formatter');
});

const house = { id: 'house', name: 'House style', extends: 'm3-like', tokens: { 'tanrei.dial.shape.unit': { $value: { value: 2, unit: 'px' }, reason: 'Sharper corners across every product.' }, 'tanrei.sys.behavior.focus-style': { $value: 1, reason: 'The halo is part of our brand.' } } };
studioTest('a layer on a LOCAL layer: offered as a base, previewed with the parent’s values, saved — and recomputed when the parent changes on disk', { layer: { id: 'acme', extends: 'house' }, parents: [house] }, async ({ page, level, dir, write, saved, onDisk, css, scope, choose }) => {
  await level('groups');
  assert.equal(await page.locator('[data-base]').evaluate((el) => el.value), 'house');
  assert.equal(await page.locator('[data-behavior="focus-style"]').evaluate((el) => el.value), 'glow', 'the local parent’s choice is what this layer inherits');
  const unit = async () => (await css(scope, '--tanrei-dial-shape-unit')).trim();
  const before = await unit();
  await choose(page.locator('[data-behavior="pressed-feedback"]'), 'none');
  await saved((layer) => layer.tokens?.['tanrei.sys.behavior.pressed-feedback']?.$value === 3, 'saved on a local parent');
  assert.equal(onDisk().extends, 'house');
  write(path.join(dir, 'house.system.json'), { ...house, tokens: { ...house.tokens, 'tanrei.dial.shape.unit': { $value: { value: 6, unit: 'px' }, reason: 'Rounder now.' } } });
  await until(async () => (await unit()) !== before, 'the parent’s change reaches the preview');
  assert.equal(await state(page), 'saved', 'a parent changing is not a conflict');
});

studioTest('Build: runs the host’s build and lists what it wrote, with its warnings', { server: { build: async () => ({ id: 'acme', chain: ['tanrei', 'acme'], tokens: 1, warnings: ['[dark] outline on surface: 2.90:1 < 3:1 (boundaries)'], files: { web: { 'acme.css': '' }, tokens: { 'acme.resolver.json': '' } } }) } }, async ({ page }) => {
  await page.locator('[data-build]').click();
  const result = page.locator('[data-build-result]');
  await until(async () => /Built/.test(await result.textContent()), 'the build result');
  assert.match(await result.textContent(), /Built · 1 /);
  assert.deepEqual(await result.locator('.ts-checks code').allTextContents(), ['web/acme.css', 'tokens/acme.resolver.json']);
  assert.match(await result.locator('.ts-warnings').textContent(), /outline on surface/);
});
