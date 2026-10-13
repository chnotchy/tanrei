// A font stack is a reorderable List (LST-31 to LST-47): the list draws a handle in every family's item, opens its menu
// of moves, lets the keyboard lift and carry a family, lets a pointer drag it, asks for a move, keeps the keyboard's
// place and says where the family now stands; the Studio answers with its data — the stack — and gives the words in
// its own language. Asserted on the FILE, on where focus is, and on what the list's live region holds.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

const BRAND = 'tanrei.ref.typeface.brand';
/** The control of the stack the keyboard is on: which family's item, and which control — its handle, a move of its menu, or its remove button. */
const held = (page) => page.evaluate(() => {
  let active = document.activeElement;
  const path = [active];
  while (active?.shadowRoot?.activeElement) path.push((active = active.shadowRoot.activeElement));
  const item = path.map((node) => node?.closest?.('tanrei-list-item') ?? (node?.getRootNode?.() instanceof ShadowRoot ? node.getRootNode().host.closest?.('tanrei-list-item') : null)).find(Boolean);
  if (!item) return path[0]?.closest('[data-stack-input]') ? { field: true } : null;
  const control = path.some((node) => node?.classList?.contains('handle')) ? 'handle' : path.find((node) => node?.dataset?.move)?.dataset.move ?? path.find((node) => node?.dataset?.act)?.dataset.act ?? null;
  return { family: item.dataset.family, control };
});
/** Everything the list's live region is given from now on, in order: `window.__said`. */
const listen = (list) => list.evaluate((el) => {
  const region = el.shadowRoot.querySelector('[role="status"]');
  window.__said = [];
  new MutationObserver(() => region.textContent.trim() && window.__said.push(region.textContent.trim())).observe(region, { childList: true, characterData: true, subtree: true });
});
const said = (page) => page.evaluate(() => window.__said);
const families = (list) => list.locator('> tanrei-list-item').evaluateAll((items) => items.map((item) => item.label));
/** The two controls of every item — its handle and its remove button — with their names and the box a pointer lands on. */
const controls = (list) => list.evaluate((el) => [...el.children].flatMap((item) => [item.shadowRoot.querySelector('.handle'), item.querySelector('[data-act="remove"]')].map((control) => { const box = control.getBoundingClientRect(); return { family: item.dataset.family, name: control.shadowRoot.querySelector('button').getAttribute('aria-label'), size: [box.width, box.height] }; })));
const handle = (list, family) => list.locator(`[data-family="${family}"] .handle`);
const move = (list, family, which) => list.locator(`[data-family="${family}"] tanrei-menu-item[data-move="${which}"]`);

studioTest('a font stack is a reorderable list: lifted and carried by the keyboard, moved by the handle’s menu, removed — the file follows, focus stays on the moved family’s handle, and each step is announced', {}, async ({ page, level, saved, onDisk, axe, css }) => {
  await level('groups');
  const brand = page.locator('[data-typeface="brand"]');
  const list = brand.locator('[data-stack-list]');
  assert.deepEqual(await list.evaluate((el) => [el.localName, el.reorderable]), ['tanrei-list', true]);
  assert.equal(await list.evaluate((el) => el.shadowRoot.querySelector('[role="list"]').getAttribute('aria-label')), 'Brand — families, in order');
  await brand.locator('[data-stack-input] input').click();
  await page.keyboard.type('Acme Grotesk Nowhere');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens?.[BRAND]?.$value.includes('Acme Grotesk Nowhere'), 'family added');
  assert.deepEqual(await families(list), ['Inter', 'Noto Sans JP', 'Noto Sans', 'Acme Grotesk Nowhere']);
  // A family's name is drawn in that family; one this browser cannot draw says so under its name.
  assert.match(await css(list.locator('[data-family="Noto Sans JP"] .ts-stack-family'), 'font-family'), /^"Noto Sans JP", sans-serif/);
  await until(async () => (await list.locator('[data-family="Acme Grotesk Nowhere"] [data-stack-missing]').isVisible()), 'the family that is not installed says so');
  assert.equal(await list.locator('[data-family="Acme Grotesk Nowhere"] [data-stack-missing]').textContent(), 'not installed here');
  assert.equal(await list.locator('[data-family="Inter"] [data-stack-missing]').isVisible(), false);
  // The words are the Studio's: every control has a name, and each names its family.
  const drawn = await controls(list);
  assert.deepEqual(drawn.filter((control) => control.family === 'Inter').map((control) => control.name), ['Reorder Inter', 'Remove: Inter']);
  assert.deepEqual(drawn.filter((control) => !(control.size[0] >= 24 && control.size[1] >= 24)), [], 'every control of an item is 24 by 24 at least');

  // Lift with Space, carry up three places with the arrow keys, drop with Space: to the top. The item is the same element.
  await listen(list);
  const status = (await page.locator('[data-status]').textContent()) ?? '';
  await list.locator('[data-family="Acme Grotesk Nowhere"]').evaluate((item) => (item.__same = true));
  await handle(list, 'Acme Grotesk Nowhere').focus();
  await page.keyboard.press('Space');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await saved((layer) => layer.tokens[BRAND].$value.indexOf('Acme Grotesk Nowhere') === 0, 'carried to the top');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Acme Grotesk Nowhere', control: 'handle' }), `focus on the handle of the moved family (${JSON.stringify(await held(page))})`);
  assert.deepEqual(await said(page), ['Acme Grotesk Nowhere lifted: 4 of 4', 'Acme Grotesk Nowhere: 3 of 4', 'Acme Grotesk Nowhere: 2 of 4', 'Acme Grotesk Nowhere: 1 of 4', 'Acme Grotesk Nowhere: 1 of 4'], 'the lift, each step and the move that took effect are said by the list');
  assert.equal(await page.locator('[data-status]').textContent(), status, 'and the Studio does not say it a second time');
  assert.ok(await list.locator('[data-family="Acme Grotesk Nowhere"]').evaluate((item) => item.__same), 'the moved item is the element it was');
  assert.deepEqual(onDisk().tokens[BRAND].$value, ['Acme Grotesk Nowhere', 'Inter', 'Noto Sans JP', 'Noto Sans', 'system-ui', 'sans-serif']);

  // Escape puts a lifted family back: nothing is written.
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await until(async () => (await said(page)).at(-1) === 'Acme Grotesk Nowhere returned to 1 of 4', 'the cancelled move is said');
  assert.deepEqual(onDisk().tokens[BRAND].$value[0], 'Acme Grotesk Nowhere');

  // Enter opens the handle's menu: at the top, the two moves toward the start are disabled, and focus is on the first that is not.
  await page.keyboard.press('Enter');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Acme Grotesk Nowhere', control: 'after' }), `focus on "Move down" (${JSON.stringify(await held(page))})`);
  assert.deepEqual(await list.locator('[data-family="Acme Grotesk Nowhere"] tanrei-menu-item').evaluateAll((items) => items.map((item) => [item.label, item.disabled])), [['Move to top', true], ['Move up', true], ['Move down', false], ['Move to bottom', false]]);
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens[BRAND].$value[1] === 'Acme Grotesk Nowhere', 'moved down');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Acme Grotesk Nowhere', control: 'handle' }), `focus back on the handle (${JSON.stringify(await held(page))})`);
  assert.equal((await said(page)).at(-1), 'Acme Grotesk Nowhere: 2 of 4');

  // Tab is the item's remove button, and Enter removes the family; focus goes to the handle of the item that took its place.
  await page.keyboard.press('Tab');
  assert.deepEqual(await held(page), { family: 'Acme Grotesk Nowhere', control: 'remove' });
  const count = (await said(page)).length;
  await page.keyboard.press('Enter');
  await saved((layer) => !layer.tokens?.[BRAND]?.$value.includes('Acme Grotesk Nowhere'), 'removed');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Noto Sans JP', control: 'handle' }), `focus on the handle of the item that took the place (${JSON.stringify(await held(page))})`);
  assert.equal((await said(page)).length, count, 'a removal is not a move: nothing more is announced by the list');

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

studioTest('ar, 390px: a family is moved by the handle’s menu with a pointer and removed — the list says it in Arabic, focus stays, nothing scrolls sideways, axe passes', { locale: 'ar', viewport: { width: 390, height: 844 } }, async ({ page, level, saved, fits, axe }) => {
  assert.deepEqual(await page.locator('html').evaluate((html) => [html.lang, html.dir]), ['ar', 'rtl']);
  await level('groups');
  const brand = page.locator('[data-typeface="brand"]');
  const list = brand.locator('[data-stack-list]');
  await list.scrollIntoViewIfNeeded();
  const drawn = await controls(list);
  assert.deepEqual(drawn.filter((control) => control.family === 'Inter').map((control) => control.name), ['إعادة ترتيب Inter', 'إزالة: Inter']);
  assert.deepEqual(drawn.filter((control) => !(control.size[0] >= 24 && control.size[1] >= 24)), [], 'every control of an item is 24 by 24 at least');
  await listen(list);
  await handle(list, 'Inter').click();
  await move(list, 'Inter', 'after').click();
  await saved((layer) => layer.tokens?.[BRAND]?.$value[1] === 'Inter', 'Inter moved down');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Inter', control: 'handle' }), `focus on the handle of Inter (${JSON.stringify(await held(page))})`);
  // The numbers are written as the list's language writes them (LST-44).
  const sentences = await said(page);
  assert.equal(sentences.length, 1, 'the move is said once');
  assert.match(sentences[0], /^تم نقل Inter إلى الموضع [2٢] من [3٣]$/);
  await list.locator('[data-family="Noto Sans"] [data-act="remove"]').click();
  await saved((layer) => !layer.tokens[BRAND].$value.includes('Noto Sans'), 'Noto Sans removed');
  assert.equal((await said(page)).length, 1);
  await fits('body', 'groups, with the stack (ar)');
  await axe('[data-typeface="brand"]', 'the brand stack (ar)');
  assert.deepEqual(await page.evaluate(() => window.tanreiStudio.missingWords()), [], 'no component of the page lacked a word');
});

studioTest('en, 390px: the stack’s items fit the panel, and a family dragged by a pointer is moved and said in English', { viewport: { width: 390, height: 844 } }, async ({ page, level, saved, fits }) => {
  await level('groups');
  const list = page.locator('[data-typeface="brand"] [data-stack-list]');
  await list.scrollIntoViewIfNeeded();
  await listen(list);
  // The whole item can be dragged: from its name, above the family before it.
  const from = await list.locator('[data-family="Noto Sans"] .ts-stack-family').boundingBox();
  const over = await list.locator('[data-family="Noto Sans JP"]').boundingBox();
  await page.mouse.move(from.x + 4, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 4, from.y + from.height / 2 - 12, { steps: 3 });
  await page.mouse.move(from.x + 4, over.y + 2, { steps: 8 });
  await page.mouse.up();
  await saved((layer) => layer.tokens?.[BRAND]?.$value[1] === 'Noto Sans', 'Noto Sans dragged up');
  await until(async () => (await said(page)).length === 1, 'the move is said once');
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
  await handle(list, 'Inter').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens?.[PLAIN]?.$value[1] === 'Inter', 'Inter moved down');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Inter', control: 'handle' }), `focus on the handle of Inter (${JSON.stringify(await held(page))})`);
  await page.keyboard.press('Space');
  await page.keyboard.press('End');
  await page.keyboard.press('Space');
  await saved((layer) => layer.tokens[PLAIN].$value[2] === 'Inter', 'Inter moved to the end');
  await until(async () => JSON.stringify(await held(page)) === JSON.stringify({ family: 'Inter', control: 'handle' }), `focus on the handle of Inter at the end (${JSON.stringify(await held(page))})`);
  assert.deepEqual((await said(page)).filter((sentence) => !sentence.includes('lifted')).filter((sentence, i, all) => all.indexOf(sentence) === i), ['Inter: 2 of 3', 'Inter: 3 of 3']);
});
