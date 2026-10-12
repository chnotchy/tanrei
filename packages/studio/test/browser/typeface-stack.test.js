// A font stack is a reorderable List (LST-36 to LST-52): the list draws the two
// move buttons, asks for a move, keeps the keyboard's place and says where the family now stands; the Studio answers
// with its data — the stack — and gives the three words in its own language. Asserted on the FILE, on where focus
// is, and on what the list's live region holds.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

const BRAND = 'tanrei.ref.typeface.brand';
/** The control of the stack the keyboard is on: which family's row, and which of its three controls. */
const held = (page) => page.evaluate(() => {
  const active = document.activeElement;
  const item = active?.closest('tanrei-list-item');
  if (!item) return active?.closest('[data-stack-input]') ? { field: true } : null;
  const inner = active === item ? item.shadowRoot.activeElement : active;
  return { family: item.dataset.family, control: inner?.dataset.act ?? ['up', 'down'].find((which) => inner?.classList.contains(which)) ?? null };
});
/** Everything the list's live region is given from now on, in order: `window.__said`. */
const listen = (list) => list.evaluate((el) => {
  const region = el.shadowRoot.querySelector('[role="status"]');
  window.__said = [];
  new MutationObserver(() => region.textContent.trim() && window.__said.push(region.textContent.trim())).observe(region, { childList: true, characterData: true, subtree: true });
});
const said = (page) => page.evaluate(() => window.__said);
const families = (list) => list.locator('> tanrei-list-item').evaluateAll((items) => items.map((item) => item.headline));
/** The three controls of every row, with the box a pointer lands on. */
const controls = (list) => list.evaluate((el) => [...el.children].flatMap((item) => [...item.shadowRoot.querySelectorAll('.move'), item.querySelector('[data-act="remove"]')].map((control) => { const box = control.getBoundingClientRect(); return { family: item.dataset.family, name: (control.shadowRoot.querySelector('button') ?? control).getAttribute('aria-label'), size: [box.width, box.height] }; })));

studioTest('a font stack is a reorderable list: moved, and removed, by the keyboard — the file follows, focus stays on the same button of the moved family, and each move is announced once', {}, async ({ page, level, saved, onDisk, axe, css }) => {
  await level('groups');
  const brand = page.locator('[data-typeface="brand"]');
  const list = brand.locator('[data-stack-list]');
  assert.deepEqual(await list.evaluate((el) => [el.localName, el.getAttribute('reorder')]), ['tanrei-list', 'buttons']);
  assert.equal(await list.evaluate((el) => el.shadowRoot.querySelector('[role="list"]').getAttribute('aria-label')), 'Brand — families, in order');
  await brand.locator('[data-stack-input] input').click();
  await page.keyboard.type('Acme Grotesk Nowhere');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens?.[BRAND]?.$value.includes('Acme Grotesk Nowhere'), 'family added');
  assert.deepEqual(await families(list), ['Inter', 'Noto Sans JP', 'Noto Sans', 'Acme Grotesk Nowhere']);
  // A family's name is drawn in that family; one this browser cannot draw says so under its name.
  assert.match(await css(list.locator('[data-family="Noto Sans JP"] .headline'), 'font-family'), /^"Noto Sans JP", sans-serif/);
  await until(async () => (await list.locator('[data-family="Acme Grotesk Nowhere"]').evaluate((item) => item.supportingText)) === 'not installed here', 'the family that is not installed says so');
  assert.equal(await list.locator('[data-family="Inter"]').evaluate((item) => item.supportingText), '');
  // The words are the Studio's: every button has a name, and each names its family.
  const drawn = await controls(list);
  assert.deepEqual(drawn.filter((control) => control.family === 'Inter').map((control) => control.name), ['Move Inter up', 'Move Inter down', 'Remove: Inter']);
  assert.deepEqual(drawn.filter((control) => !(control.size[0] >= 24 && control.size[1] >= 24)), [], 'every control of a row is 24 by 24 at least');
  assert.equal(await list.locator('[data-family="Inter"] .move.up').evaluate((button) => button.getAttribute('aria-description')), null, 'the family is in the name, and not said again');

  // Move up, by the keyboard, three times: to the top. The row is the same element all the way.
  await listen(list);
  const status = (await page.locator('[data-status]').textContent()) ?? '';
  await list.locator('[data-family="Acme Grotesk Nowhere"]').evaluate((item) => (item.__same = true));
  await list.locator('[data-family="Acme Grotesk Nowhere"] .move.up').focus();
  for (const [place, control] of [[3, 'up'], [2, 'up'], [1, 'down']]) {
    await page.keyboard.press('Enter');
    await saved((layer) => layer.tokens[BRAND].$value.indexOf('Acme Grotesk Nowhere') === place - 1, `moved to place ${place}`);
    // At the top "up" cannot be pressed: focus goes to the next control of the same row.
    await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Acme Grotesk Nowhere', control }), `focus on "${control}" of the moved family at place ${place} (${JSON.stringify(await held(page))})`);
    assert.equal((await said(page)).at(-1), `Acme Grotesk Nowhere: ${place} of 4`);
  }
  assert.deepEqual(await said(page), ['Acme Grotesk Nowhere: 3 of 4', 'Acme Grotesk Nowhere: 2 of 4', 'Acme Grotesk Nowhere: 1 of 4'], 'each move is said once, by the list');
  assert.equal(await page.locator('[data-status]').textContent(), status, 'and the Studio does not say it a second time');
  assert.ok(await list.locator('[data-family="Acme Grotesk Nowhere"]').evaluate((item) => item.__same), 'the moved row is the element it was');
  assert.deepEqual(onDisk().tokens[BRAND].$value, ['Acme Grotesk Nowhere', 'Inter', 'Noto Sans JP', 'Noto Sans', 'system-ui', 'sans-serif']);
  assert.equal(await list.locator('[data-family="Acme Grotesk Nowhere"] .move.up').evaluate((button) => button.disabled), true);
  assert.equal(await list.locator('[data-family="Noto Sans"] .move.down').evaluate((button) => button.disabled), true);

  // Down again with Space; then Tab is the row's remove button, and Enter removes the family.
  await page.keyboard.press('Space');
  await saved((layer) => layer.tokens[BRAND].$value[1] === 'Acme Grotesk Nowhere', 'moved down');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Acme Grotesk Nowhere', control: 'down' }), 'focus on "down" of the moved family');
  assert.equal((await said(page)).at(-1), 'Acme Grotesk Nowhere: 2 of 4');
  await page.keyboard.press('Tab');
  assert.deepEqual(await held(page), { family: 'Acme Grotesk Nowhere', control: 'remove' });
  await page.keyboard.press('Enter');
  await saved((layer) => !layer.tokens?.[BRAND]?.$value.includes('Acme Grotesk Nowhere'), 'removed');
  // The row that took its place: the same control of it.
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Noto Sans JP', control: 'remove' }), `focus on "remove" of the row that took the place (${JSON.stringify(await held(page))})`);
  assert.equal((await said(page)).length, 4, 'a removal is not a move: nothing more is announced by the list');

  await axe('[data-typeface="brand"]', 'the brand stack');
  assert.deepEqual(await page.evaluate(() => window.tanreiStudio.missingWords()), [], 'no component of the page lacked a word');

  // The last family removed: the list is gone, a line says what is used, and focus is on the field that adds one.
  for (const family of ['Noto Sans JP', 'Noto Sans', 'Inter']) {
    await list.locator(`[data-family="${family}"] [data-act="remove"]`).focus();
    await page.keyboard.press('Enter');
    await saved((layer) => layer.tokens?.[BRAND] && !layer.tokens[BRAND].$value.includes(family), `${family} removed`);
  }
  assert.equal(await list.isVisible(), false);
  assert.equal(await brand.locator('[data-stack-empty]').textContent(), 'No named family: the generic fallback is used.');
  await until(async () => (await held(page))?.field === true, 'focus on the field that adds a family');
  assert.deepEqual(onDisk().tokens[BRAND].$value, ['system-ui', 'sans-serif']);
});

studioTest('ar, 390px: a family is moved and removed with a pointer — the list says it in Arabic, focus stays, nothing scrolls sideways, axe passes', { locale: 'ar', viewport: { width: 390, height: 844 } }, async ({ page, level, saved, fits, axe }) => {
  assert.deepEqual(await page.locator('html').evaluate((html) => [html.lang, html.dir]), ['ar', 'rtl']);
  await level('groups');
  const brand = page.locator('[data-typeface="brand"]');
  const list = brand.locator('[data-stack-list]');
  await list.scrollIntoViewIfNeeded();
  const drawn = await controls(list);
  assert.deepEqual(drawn.filter((control) => control.family === 'Inter').map((control) => control.name), ['تحريك لأعلى', 'تحريك لأسفل', 'إزالة: Inter']);
  assert.deepEqual(drawn.filter((control) => !(control.size[0] >= 24 && control.size[1] >= 24)), [], 'every control of a row is 24 by 24 at least');
  await listen(list);
  await list.locator('[data-family="Inter"] .move.down').click();
  await saved((layer) => layer.tokens?.[BRAND]?.$value[1] === 'Inter', 'Inter moved down');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Inter', control: 'down' }), `focus on "down" of Inter (${JSON.stringify(await held(page))})`);
  // The numbers are written as the list's language writes them (LST-42).
  const sentences = await said(page);
  assert.equal(sentences.length, 1, 'the move is said once');
  assert.match(sentences[0], /^تم نقل Inter إلى الموضع [2٢] من [3٣]$/);
  await list.locator('[data-family="Noto Sans"] [data-act="remove"]').click();
  await saved((layer) => !layer.tokens[BRAND].$value.includes('Noto Sans'), 'Noto Sans removed');
  // It was the last row: the same control of the row before it.
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Inter', control: 'remove' }), `focus on "remove" of the row before (${JSON.stringify(await held(page))})`);
  assert.equal((await said(page)).length, 1);
  await fits('body', 'groups, with the stack (ar)');
  await axe('[data-typeface="brand"]', 'the brand stack (ar)');
  assert.deepEqual(await page.evaluate(() => window.tanreiStudio.missingWords()), [], 'no component of the page lacked a word');
});

studioTest('en, 390px: the stack’s rows fit the panel, and a move by pointer is said in English', { viewport: { width: 390, height: 844 } }, async ({ page, level, saved, fits }) => {
  await level('groups');
  const list = page.locator('[data-typeface="brand"] [data-stack-list]');
  await list.scrollIntoViewIfNeeded();
  await listen(list);
  await list.locator('[data-family="Noto Sans"] .move.up').click();
  await saved((layer) => layer.tokens?.[BRAND]?.$value[1] === 'Noto Sans', 'Noto Sans moved up');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Noto Sans', control: 'up' }), 'focus on "up" of Noto Sans');
  assert.deepEqual(await said(page), ['Noto Sans: 2 of 3']);
  await fits('body', 'groups, with the stack');
});

studioTest('the stack in a token’s editor: a move by the keyboard keeps its place while the editor waits to redraw', {}, async ({ page, level, saved }) => {
  const PLAIN = 'tanrei.ref.typeface.plain';
  await level('tokens');
  await page.locator('[data-search] input').fill('typeface.plain');
  await page.locator(`[data-token="${PLAIN}"] > span`).click();
  const list = page.locator(`[data-token-pane] [data-editor="${PLAIN}"] [data-stack-list]`);
  await list.waitFor();
  assert.equal(await list.evaluate((el) => el.localName), 'tanrei-list');
  await listen(list);
  // In the editor a stack is a pinned value: it is written once its reason is given.
  await page.locator(`[data-token-pane] [data-editor="${PLAIN}"] [data-reason] input`).fill('The plain face follows the brand.');
  await list.locator('[data-family="Inter"] .move.down').focus();
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens?.[PLAIN]?.$value[1] === 'Inter', 'Inter moved down');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Inter', control: 'down' }), `focus on "down" of Inter (${JSON.stringify(await held(page))})`);
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens[PLAIN].$value[2] === 'Inter', 'Inter moved down again');
  // At the end "down" cannot be pressed: the first control of the row that can take focus.
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Inter', control: 'up' }), `focus on "up" of Inter at the end (${JSON.stringify(await held(page))})`);
  assert.deepEqual(await said(page), ['Inter: 2 of 3', 'Inter: 3 of 3']);
});
