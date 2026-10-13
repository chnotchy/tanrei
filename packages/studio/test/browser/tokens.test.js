// "Every token" is two panes: the tree only
// chooses — a `<tanrei-tree-view>` of the tokens, one stop in the focus order — and the chosen token's editor is a
// region beside it, under it where the panel is narrow. The editor's controls are Tanrei's fields.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

const COLOR = 'tanrei.comp.button.filled.container.color';
const SHAPE = 'tanrei.comp.button.container.shape';
const HEIGHT = 'tanrei.comp.button.container.height.medium';
const WHY = 'The checkout button is the only thing on its screen.';
const row = (page, id) => page.locator(`[data-token="${id}"] > span`);
const editor = (page, id) => page.locator(`[data-token-pane] [data-editor="${id}"]`);
/** Where the keyboard is: the token row, the pane, or what the focused element says of itself. */
const focused = (page) => page.evaluate(() => {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  const host = document.activeElement;
  return { token: host?.closest('[data-token]')?.dataset.token ?? null, inPane: Boolean(host?.closest('[data-token-pane]')), name: host?.hasAttribute('data-token-name') ?? false, suggest: host?.dataset?.suggest ?? null, tag: el?.tagName.toLowerCase() ?? null };
});
const find = async (page, id) => {
  await page.locator('[data-search] input').fill(id.split('.').slice(2).join('.'));
  await page.waitForSelector(`[data-token="${id}"]`);
};

studioTest('the tree only chooses: one tab stop, the arrow keys move, Enter chooses, and the editor is a region named by the token and tied to its row', {}, async ({ page, level }) => {
  await level('tokens');
  const tree = page.locator('[data-tree]');
  const pane = page.locator('[data-token-pane]');
  assert.equal(await tree.evaluate((el) => el.localName), 'tanrei-tree-view');
  assert.equal(await tree.getAttribute('role'), 'tree');
  // Nothing is chosen: the pane says so, and is no landmark yet.
  assert.match(await page.locator('[data-pane-empty]').getAttribute('headline'), /No token chosen/);
  assert.equal(await pane.getAttribute('aria-labelledby'), null);
  // The tree costs what it shows: a closed group has no rows, and thousands of tokens are one stop of the Tab key.
  assert.equal(await tree.locator('[data-group] [data-token]').count(), 0, 'a group’s tokens are not written until it opens');
  assert.equal(await tree.evaluate((el) => [...el.querySelectorAll('*')].filter((node) => node.tabIndex === 0).length), 1, 'one tab stop');

  // Keyboard: Down, Down from the first tier is the first token row; Enter chooses it; focus stays in the tree.
  await tree.locator('[role="treeitem"][tabindex="0"]').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const first = (await focused(page)).token;
  assert.match(first, /^tanrei\.dial\./, 'a token row has the focus');
  assert.equal(await pane.getAttribute('aria-labelledby'), null, 'selection does not follow focus');
  await page.keyboard.press('Enter');
  await page.waitForSelector(`[data-token-pane] [data-editor="${first}"]`);
  assert.equal((await focused(page)).token, first, 'beside the tree the focus stays on the row: the arrow keys go on');
  assert.equal(await row(page, first).getAttribute('aria-selected'), 'true');
  assert.equal(await row(page, first).getAttribute('aria-controls'), await pane.getAttribute('id'), 'the chosen row says which pane it controls');
  const heading = page.locator(`#${await pane.getAttribute('aria-labelledby')}`);
  assert.equal(await heading.textContent(), first.replace('tanrei.', ''), 'the pane is a region named by the token');
  assert.equal(await pane.evaluate((el) => el.localName), 'section');
  // The next row: nothing but the focus moves.
  await page.keyboard.press('ArrowDown');
  assert.notEqual((await focused(page)).token, first);
  assert.equal(await row(page, first).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('[data-token-pane] [data-editor]').getAttribute('data-editor'), first);
  // Space chooses too, and one row at most says it controls the pane.
  const second = (await focused(page)).token;
  await page.keyboard.press('Space');
  await page.waitForSelector(`[data-token-pane] [data-editor="${second}"]`);
  assert.equal(await tree.locator('[aria-controls]').count(), 1);
  assert.equal(await tree.locator('[aria-selected="true"]').count(), 1);
  // Focus order: the tree, then the editor.
  await page.keyboard.press('Tab');
  assert.ok((await focused(page)).inPane, 'Tab leaves the tree for the editor');

  // A group is filled when it opens, and what was left open is still open after the controls are drawn again.
  await tree.locator('li[data-tier="comp"] > span').click();
  await tree.locator('li[data-group="button"] > span').click();
  assert.ok((await tree.locator('[data-group="button"] [data-token]').count()) > 100);
  assert.equal(await tree.locator('[data-group="card"] [data-token]').count(), 0);
  await page.evaluate(() => window.tanreiStudio.setLayer({ ...window.tanreiStudio.getLayer(), name: 'Acme' }));
  assert.ok((await page.locator('[data-tree] [data-group="button"] [data-token]').count()) > 100, 'the tree is as it was left');
});

studioTest('the editor’s fields are Tanrei’s: a number is pinned, an alias re-pointed, a follower followed, and the token reverted', {}, async ({ page, level, saved, pick, onDisk }) => {
  await level('tokens');
  // ── a dimension, pinned with a number field ──
  await find(page, HEIGHT);
  await row(page, HEIGHT).click();
  const height = editor(page, HEIGHT);
  await height.locator('[data-tab="pin $value"]').click();
  assert.equal(await height.locator('tanrei-number-field').getAttribute('suffix-text'), 'px', 'the unit is the field’s suffix');
  // The words are the Studio's, given once (setWords, for the Studio's own language tag): no instance carries them.
  assert.equal(await height.locator('[data-reason]').getAttribute('required-text'), null);
  // (A text field is a Field around a text input: the word is the label of the tag its Field draws.)
  const required = height.locator('[data-reason] tanrei-tag[part~="requirement-label"]');
  assert.match(await required.evaluate((el) => el.label), /Required/);
  assert.equal(await required.isVisible(), true, 'and the tag is drawn');
  assert.match(await page.locator('[data-studio]').getAttribute('lang'), /^en-x-studio$/);
  // (Asked while the fields stand: a field taken out of the page before its update has run looks for its words where
  // it no longer is, and records them as missing.)
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => window.tanreiStudio.missingWords()), [], 'no component of the page lacked a word');
  await height.locator('tanrei-number-field input').fill('44');
  await height.locator('[data-reason] input').fill(WHY);
  await page.keyboard.press('Tab');
  await saved((layer) => layer.tokens?.[HEIGHT]?.$value?.value === 44, 'the pin');
  assert.deepEqual(onDisk().tokens[HEIGHT], { $value: { value: 44, unit: 'px' }, reason: WHY });
  assert.match(await page.locator(`[data-token="${HEIGHT}"] .ts-value`).textContent(), /44px/, 'the tree’s row shows the new value');
  assert.equal(await page.locator(`[data-token="${HEIGHT}"] [data-changed]`).textContent(), 'changed', 'and says the token is changed, in words');
  // ── reset to the system's value ──
  await page.locator('[data-token-pane] tanrei-button', { hasText: 'Revert to inherited' }).click();
  await saved((layer) => !layer.tokens, 'reverted');
  assert.equal(await page.locator(`[data-token="${HEIGHT}"] [data-changed]`).count(), 0);

  // ── an alias, re-pointed with a combobox whose options show what each token resolves to ──
  await find(page, SHAPE);
  await row(page, SHAPE).click();
  const shape = editor(page, SHAPE);
  assert.match(await page.locator('[data-token-pane] [data-facts]').textContent(), /sys\.shape\.corner\.full/, 'where it points');
  const target = shape.locator('[data-token-select]');
  assert.equal(await target.evaluate((el) => el.localName), 'tanrei-combobox-field');
  assert.equal(await target.evaluate((el) => el.value), 'tanrei.sys.shape.corner.full');
  await pick(target, 'sys.shape.corner.small');
  await saved((layer) => layer.tokens?.[SHAPE]?.$value === '{tanrei.sys.shape.corner.small}', 're-pointed');
  await until(async () => /sys\.shape\.corner\.small/.test(await page.locator('[data-token-pane] [data-facts]').textContent()), 'the facts follow');
  // ── what aliases it: a tag group of chips; one of them is followed, the tree shows it, focus is on its name ──
  const followers = page.locator('[data-token-pane] [data-about] tanrei-tag-group[spacing="chips"]');
  const follower = await followers.locator('tanrei-chip').first().getAttribute('data-follower');
  await followers.locator('tanrei-chip').first().click();
  await page.waitForSelector(`[data-token-pane] [data-editor="${follower}"]`);
  assert.ok((await focused(page)).name, 'focus is on the name of the token that was followed');
  assert.equal(await row(page, follower).getAttribute('aria-selected'), 'true', 'the tree left the search and shows the row');
  assert.equal(await page.locator('[data-search]').evaluate((el) => el.value), '');
});

studioTest('a color is shown as it is typed and saved when it is committed; a half-typed color is never reported invalid', {}, async ({ page, level, saved, onDisk }) => {
  await level('tokens');
  await find(page, COLOR);
  await row(page, COLOR).click();
  const color = editor(page, COLOR);
  await color.locator('[data-tab="pin $value"]').click();
  const field = color.locator('tanrei-color-field');
  assert.equal(await field.getAttribute('picker-label'), 'Choose color: Value');
  await color.locator('[data-reason] input').fill(WHY);
  const input = field.locator('input[type="text"]').first();
  await input.fill('#0f7');
  assert.notEqual(await input.getAttribute('aria-invalid'), 'true', 'three digits on the way to six are not an error');
  await input.fill('#0f766e');
  await until(async () => (await page.evaluate((id) => window.tanreiStudio.getLayer().tokens?.[id]?.$value?.hex, COLOR)) === '#0f766e', 'the layer of the page has it: the preview shows it');
  await page.waitForTimeout(900);
  assert.notEqual(onDisk().tokens?.[COLOR]?.$value?.hex, '#0f766e', 'not saved while it is typed');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens?.[COLOR]?.$value?.hex === '#0f766e', 'saved at the commit');
  assert.match(await page.locator(`[data-token="${COLOR}"] tanrei-swatch`).evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('.sample')).backgroundImage), /rgb\(15, 118, 110\)/, 'the swatch of the row shows the color');
});

studioTest('390 wide: the panes stack, choosing moves focus to the editor’s name, and there is a way back to the row', { viewport: { width: 390, height: 844 } }, async ({ page, level, fits }) => {
  await level('tokens');
  await find(page, SHAPE);
  await row(page, SHAPE).click();
  await page.waitForSelector(`[data-token-pane] [data-editor="${SHAPE}"]`);
  const boxes = await page.evaluate(() => ({ tree: document.querySelector('[data-tree]').getBoundingClientRect().bottom, pane: document.querySelector('[data-token-pane]').getBoundingClientRect().top }));
  assert.ok(boxes.pane >= boxes.tree, `the editor follows the tree: ${JSON.stringify(boxes)}`);
  assert.ok((await focused(page)).name, 'focus moved to the editor’s name');
  const back = page.locator('[data-back]');
  assert.ok(await back.isVisible());
  await fits('body', 'the two panes, stacked');
  await back.click();
  assert.equal((await focused(page)).token, SHAPE, 'back on the chosen row');
});

studioTest('a suggestion that is taken leaves the row of chips, and focus goes to the next one', {}, async ({ page, level }) => {
  await level('tokens');
  await find(page, 'tanrei.ref.typeface.plain');
  await row(page, 'tanrei.ref.typeface.plain').click();
  const stack = editor(page, 'tanrei.ref.typeface.plain');
  const chips = stack.locator('[data-stack-suggestions]');
  assert.equal(await chips.evaluate((el) => el.localName), 'tanrei-tag-group');
  const names = await chips.locator('tanrei-chip').evaluateAll((els) => els.map((el) => el.dataset.suggest));
  assert.ok(names.length >= 3, `suggestions: ${names}`);
  await chips.locator(`[data-suggest="${names[0]}"]`).focus();
  await page.keyboard.press('Enter');
  await until(async () => (await chips.locator(`[data-suggest="${names[0]}"]`).count()) === 0, 'the chip that was taken is gone');
  await until(async () => (await focused(page)).suggest === names[1], 'focus is on the chip that followed it');
  assert.equal(await stack.locator(`[data-family="${names[0]}"]`).count(), 1, 'and the family is in the stack');
});

for (const scheme of ['light', 'dark']) {
  studioTest(`axe: the two panes with a color, a number and an alias being edited, left to right and right to left — ${scheme}`, { colorScheme: scheme }, async ({ page, level, axe }) => {
    await level('tokens');
    for (const dir of ['ltr', 'rtl']) {
      // The docs host the Studio in a right-to-left page for Arabic (its own strings are English and Japanese).
      await page.evaluate((value) => { document.documentElement.dir = value; document.documentElement.lang = value === 'rtl' ? 'ar' : 'en'; }, dir);
      for (const [id, tab] of [[COLOR, 'pin $value'], [HEIGHT, 'pin $value'], [SHAPE, 're-point alias']]) {
        await find(page, id);
        await row(page, id).click();
        await editor(page, id).locator(`[data-tab="${tab}"]`).click();
        await axe('body', `${id} (${scheme}, ${dir})`);
      }
    }
  });
}
