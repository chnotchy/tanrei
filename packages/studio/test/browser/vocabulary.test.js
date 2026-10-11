// Add…: a size, a variant, a step of a series, a token of the layer's own — each shown before it is
// written, none written without a rationale, all of them drawn by the preview's REAL components afterwards.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

const WHY = 'Our checkout needs it; nothing in core fits.';

studioTest('Add…: a size "3x", a variant, a step and an own token — previewed, written with a rationale, drawn, removable', {}, async ({ page, level, saved, onDisk, lightPane, choose, pick }) => {
  await level('groups');
  const add = page.locator('[data-panel="add"]');
  const flow = (name) => choose(add.locator('[data-add-flow]'), name);
  const rationale = add.locator('[data-add-body] [data-reason] input').last();
  const submit = add.locator('[data-add-submit]').locator('button');
  assert.equal(await page.locator('[data-panel="extensions"]').count(), 0, 'nothing added yet: no "yours" panel');

  // ── a size ──
  await flow('axis');
  await pick(add.locator('[data-add-axis]'), 'button · size');
  await add.locator('[data-add-name] input').fill('3x');
  assert.match(await add.locator('.ts-writes').first().textContent(), /tanrei\.comp\.button\.size\.3x/);
  await until(async () => (await add.locator('[data-add-result] [data-member]').count()) > 3, 'what it would resolve to is shown BEFORE it is written');
  assert.ok(await submit.isDisabled(), 'no rationale, no write');
  await rationale.fill(WHY);
  await until(async () => !(await submit.isDisabled()), 'a rationale enables Add');
  const from = await add.locator('[data-add-from]').evaluate((el) => el.value);
  await submit.click();
  await saved((layer) => layer.vocabulary?.['tanrei.comp.button.size.3x'], 'the size');
  assert.deepEqual(onDisk().vocabulary['tanrei.comp.button.size.3x'], { from, scale: 1.5, rationale: WHY });
  const heights = await lightPane.locator('[data-sample="sizes"] tanrei-button').evaluateAll((els) => Object.fromEntries(els.filter((el) => el.getAttribute('size')).map((el) => [el.getAttribute('size'), el.shadowRoot.querySelector('button').getBoundingClientRect().height])));
  assert.ok(heights['3x'] > heights[from] * 1.4, `the preview draws a real <tanrei-button size="3x">, 1.5 × ${from}: ${JSON.stringify(heights)}`);
  await page.waitForSelector('[data-extension="tanrei.comp.button.size.3x"]');

  // A name that is not a key is refused before anything is tried; a name that is taken, with the engine's words.
  await add.locator('[data-add-name] input').fill('Not A Key');
  assert.match(await add.locator('.ts-writes').first().textContent(), /…/);
  assert.ok(await submit.isDisabled());
  await add.locator('[data-add-name] input').fill('3x');
  await until(async () => (await add.locator('[data-add-problem]').textContent()).length > 0, 'the engine says why "3x" cannot be added twice');
  assert.ok(await submit.isDisabled());

  // ── a variant ──
  await pick(add.locator('[data-add-axis]'), 'button · variant');
  await add.locator('[data-add-name] input').fill('brand');
  await pick(add.locator('[data-add-from]'), 'filled');
  await rationale.fill(WHY);
  await until(async () => !(await submit.isDisabled()), 'the variant can be added');
  await submit.click();
  await saved((layer) => layer.vocabulary?.['tanrei.comp.button.variant.brand'], 'the variant');
  assert.deepEqual(onDisk().vocabulary['tanrei.comp.button.variant.brand'], { from: 'filled', rationale: WHY });
  await until(async () => (await lightPane.locator('[data-sample="variants"] tanrei-button[variant="brand"]').count()) === 1, 'the preview draws the new variant');
  const paint = (variant) => lightPane.locator(`[data-sample="variants"] tanrei-button[variant="${variant}"]`).evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('button')).backgroundColor);
  assert.equal(await paint('brand'), await paint('filled'), 'it starts as a copy of "filled"');

  // ── a step of a series ──
  await flow('step');
  await pick(add.locator('[data-add-series]'), 'sys.space');
  await add.locator('[data-add-name] input').fill('space1200');
  await until(async () => /\d/.test(await add.locator('[data-add-result]').textContent()), 'the step’s resolved value is shown');
  await rationale.fill(WHY);
  await until(async () => !(await submit.isDisabled()), 'the step can be added');
  await submit.click();
  await saved((layer) => layer.vocabulary?.['tanrei.sys.space.space1200'], 'the step');
  await until(async () => (await lightPane.locator('[data-step="tanrei.sys.space.space1200"]').count()) === 1, 'the preview draws the new step');

  // ── a token of the layer's own ──
  await flow('own');
  await add.locator('[data-add-component] input').fill('rating');
  await add.locator('[data-add-name] input').fill('star.size');
  await pick(add.locator('[data-add-type]'), 'dimension');
  await choose(add.locator('[data-add-definition]'), 'alias');
  await rationale.fill(WHY);
  assert.match(await add.locator('.ts-writes').first().textContent(), /acme\.comp\.rating\.star\.size/, 'in the layer’s own namespace');
  await until(async () => !(await submit.isDisabled()), 'the own token can be added');
  await submit.click();
  await saved((layer) => layer.vocabulary?.['acme.comp.rating.star.size'], 'the own token');
  assert.match(onDisk().vocabulary['acme.comp.rating.star.size'].$value, /^\{tanrei\./);
  await page.waitForSelector('[data-own-token="acme.comp.rating.star.size"]');

  // "Yours": every declaration, with its rationale editable and a way out.
  assert.deepEqual(await page.locator('[data-panel="extensions"] [data-extension]').evaluateAll((els) => els.map((el) => el.dataset.extension)), Object.keys(onDisk().vocabulary));
  const size = page.locator('[data-extension="tanrei.comp.button.size.3x"]');
  await size.locator('summary').first().click();
  await size.locator('tanrei-button', { hasText: 'Remove' }).click();
  await saved((layer) => !layer.vocabulary['tanrei.comp.button.size.3x'], 'the size removed');
  await until(async () => (await lightPane.locator('tanrei-button[size="3x"]').count()) === 0, 'and gone from the preview');
});

studioTest('Every token: a choice of kind is a name picker, the operations are an ARIA tablist, a font stack gets the stack editor — and Groups shows the same entries', {}, async ({ page, level, saved, choose }) => {
  await page.evaluate(() => window.tanreiStudio.applyOperation('tanrei.sys.behavior.pressed-feedback', { $value: 1, reason: 'How this product behaves.' }));
  await level('tokens');
  assert.deepEqual(await page.locator('[data-controls] [data-panel]').evaluateAll((els) => els.map((el) => el.dataset.panel)), ['tree', 'add', 'rules']);
  await page.locator('[data-search] input').fill('pressed-feedback');
  await page.locator('[data-token="tanrei.sys.behavior.pressed-feedback"]').click();
  const editor = page.locator('[data-editor="tanrei.sys.behavior.pressed-feedback"]');
  assert.match(await page.locator('[data-token="tanrei.sys.behavior.pressed-feedback"] .ts-value').textContent(), /ripple/, 'read as its NAME');
  // The operations are Tanrei's tabs: the row is a tablist (in the element's own tree), each tab and each panel an element here.
  assert.equal(await editor.locator('tanrei-tabs [role="tablist"]').getAttribute('aria-label'), 'Operations a layer may write');
  const tabs = editor.locator('tanrei-tabs > [role="tab"]');
  const shownPanel = editor.locator('tanrei-tabs > [role="tabpanel"]:not([hidden])');
  assert.ok((await tabs.count()) >= 2);
  assert.equal(await editor.locator('tanrei-tabs > [role="tabpanel"]').count(), await tabs.count(), 'a panel for every tab');
  assert.equal(await shownPanel.getAttribute('aria-labelledby'), await editor.locator('[role="tab"][aria-selected="true"]').getAttribute('id'));
  assert.equal(await editor.locator('[role="tab"][aria-selected="true"]').getAttribute('aria-controls'), await shownPanel.getAttribute('id'), 'and the tab says which panel is its own');
  assert.equal(await editor.locator('tanrei-tabs > [role="tabpanel"][hidden]').evaluateAll((panels) => panels.every((panel) => !panel.childElementCount)), true, 'only the chosen operation’s form is drawn');
  assert.deepEqual(await tabs.evaluateAll((els) => els.map((el) => el.tabIndex)), await tabs.evaluateAll((els) => els.map((el) => (el.getAttribute('aria-selected') === 'true' ? 0 : -1))), 'roving tabindex');
  assert.equal(await editor.locator('[data-choice] tanrei-radio-button').count(), 4, 'a name picker: a radio group');
  assert.equal(await shownPanel.locator('tanrei-number-field').count(), 0, 'not a number field');
  await editor.locator('[data-choice] tanrei-radio-button[data-value="none"]').click();
  await saved((layer) => layer.tokens['tanrei.sys.behavior.pressed-feedback'].$value === 3, 'picked by name');

  // Tablist keys: arrows move AND select (automatic activation), wrap; Home and End jump; one tab stop.
  const names = await tabs.evaluateAll((els) => els.map((el) => el.label));
  const active = () => page.evaluate(() => ({ text: document.activeElement?.label, selected: document.activeElement?.getAttribute('aria-selected'), role: document.activeElement?.getAttribute('role') }));
  await editor.locator('[role="tab"][aria-selected="true"]').focus();
  await page.keyboard.press('Home');
  assert.deepEqual(await active(), { text: names[0], selected: 'true', role: 'tab' });
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await active(), { text: names[1], selected: 'true', role: 'tab' });
  await page.keyboard.press('End');
  assert.equal((await active()).text, names.at(-1));
  await page.keyboard.press('ArrowRight');
  assert.equal((await active()).text, names[0], 'wraps forward');
  await page.keyboard.press('ArrowLeft');
  assert.equal((await active()).text, names.at(-1), 'wraps back');
  assert.equal(await editor.locator('[role="tab"][tabindex="0"]').count(), 1);
  assert.equal(await shownPanel.getAttribute('aria-labelledby'), await editor.locator('[role="tab"][aria-selected="true"]').getAttribute('id'), 'the panel follows the selected tab');
  assert.equal(await shownPanel.locator('.ts-writes').count(), 1, 'and holds the form of the operation the keyboard chose');

  await page.locator('[data-search] input').fill('typeface.plain');
  await page.locator('[data-token="tanrei.ref.typeface.plain"]').click();
  const plain = page.locator('[data-editor="tanrei.ref.typeface.plain"]');
  assert.equal(await plain.locator('[data-stack]').count(), 1, 'a fontFamily token gets the stack editor');
  await plain.locator('[data-suggest="Roboto"]').click();
  await plain.locator('[data-reason] input').fill('Plain text follows the brand guidelines.');
  await page.keyboard.press('Tab');
  await saved((layer) => layer.tokens['tanrei.ref.typeface.plain']?.$value.includes('Roboto'), 'the stack editor at Every token');
  await level('groups');
  assert.match(await page.locator('[data-typeface="plain"] .ts-fold-value').textContent(), /Roboto/);
  assert.equal(await page.locator('[data-behavior="pressed-feedback"]').evaluate((el) => el.value), 'none');
});

studioTest('Source: text that does not parse is kept word for word — across levels, an autosave and a reload — shown as a badge, and never saved', {}, async ({ page, level, saved, onDisk, file }) => {
  const fs = await import('node:fs');
  await level('source');
  assert.deepEqual(await page.locator('[data-controls] [data-panel]').evaluateAll((els) => els.map((el) => el.dataset.panel)), ['source']);
  const area = page.locator('[data-source]');
  assert.deepEqual(JSON.parse(await area.inputValue()), onDisk(), 'Source IS the layer');
  await area.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type('\n\t{ "unfinished": [1, 2,');
  const typed = await area.inputValue();
  assert.ok(await page.locator('[data-draft-note]').isVisible());
  await level('groups');
  assert.equal(await page.locator('[data-draft-badge]').evaluate((chip) => chip.label), 'Source has invalid edits');
  // The levels are tabs, and a tab holds its name alone: the badge beside them says it, in words, at every level.
  assert.equal(await page.locator('[data-levels]').evaluate((el) => [el.localName, el.value].join()), 'tanrei-tabs,groups');
  // An edit elsewhere is autosaved: what is saved is a valid layer, never the draft.
  await page.locator('[data-dial="tanrei.dial.space.unit"] tanrei-number-field input').fill('9');
  await page.keyboard.press('Tab');
  await saved((layer) => layer.tokens?.['tanrei.dial.space.unit']?.$value.value === 9, 'an edit elsewhere');
  assert.ok(!fs.readFileSync(file, 'utf8').includes('unfinished'));
  assert.equal(await page.evaluate(() => window.tanreiStudio.getState().draft), typed);
  await page.locator('[data-draft-badge]').click();
  assert.equal(await page.locator('[data-source]').inputValue(), typed, 'exactly the text that was typed');
  await page.reload();
  await page.waitForSelector('[data-source]');
  assert.equal(await page.locator('[data-source]').inputValue(), typed, 'also after a reload');
  assert.ok(await page.locator('[data-draft-badge]').isVisible());
  // It parses: the draft ends and the text IS the layer.
  const fixed = { ...onDisk(), name: 'From the draft' };
  await page.locator('[data-source]').fill(`${JSON.stringify(fixed, null, 2)}\n`);
  await saved((layer) => layer.name === 'From the draft', 'the draft parsed');
  assert.equal(await page.locator('[data-draft-badge]').count(), 0);
  // JSON that parses but is not a layer the engine accepts: said in words, not saved.
  await page.locator('[data-source]').fill(`${JSON.stringify({ ...fixed, tokens: { 'tanrei.sys.space.nope': { scale: 2 } } }, null, 2)}\n`);
  await until(async () => /unknown token/.test(await page.locator('[data-source-problems]').textContent()), 'the engine’s words at Source');
  await page.waitForTimeout(900);
  assert.deepEqual(onDisk(), fixed, 'a layer the engine refuses is never sent');
  assert.equal(await page.locator('[data-save-state]').getAttribute('data-save-state'), 'invalid');
  await page.locator('[data-source]').fill(`${JSON.stringify(fixed, null, 2)}\n`);
  await page.waitForSelector('[data-save-state="saved"]');
  // Discard.
  await page.locator('[data-source]').fill('{ nope');
  await page.locator('[data-draft-discard]').click();
  assert.deepEqual(JSON.parse(await page.locator('[data-source]').inputValue()), fixed);
  assert.equal(await page.locator('[data-draft-badge]').count(), 0);
});
