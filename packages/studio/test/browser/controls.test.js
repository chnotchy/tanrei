// The Studio's controls are Tanrei's own components: what each one that
// replaced a hand-made control is, what it is called, and that the keyboard still works it.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

const layer = {
  id: 'acme',
  extends: 'tanrei',
  tokens: { 'tanrei.dial.space.unit': { $value: { value: 6, unit: 'px' }, reason: 'Our product is dense.' } },
  rules: [{ match: 'tanrei.comp.*.*.hovered.container.color', $value: '{tanrei.comp.$1.$2.container.color}' }],
};

/** Every native control in the Studio's own tree (not inside a component's shadow root, not in the preview's samples). */
const natives = (page) => page.evaluate(() => [...document.querySelectorAll('button, input, select, textarea')].filter((el) => !el.closest('[data-scope]')).map((el) => `${el.localName}${el.type && el.localName === 'input' ? `[${el.type}]` : ''}${[...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}]`).join('')}`));

/**
 * Everything of the Studio's own that holds code — a text field, or the text input alone where no row
 * of a Field would be drawn — by what tells one from another: on many lines or one, and its own mark.
 */
const codes = (page) => page.evaluate(() => [...document.querySelectorAll('tanrei-text-field[type="code"], tanrei-text-input[type="code"]')].filter((el) => !el.closest('[data-scope]')).map((el) => `${el.multiline ? 'lines' : 'line'}${[...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}]`).join('')}`));

studioTest('no control is hand-made: at every level, with the folds open, the only native control of the Studio’s own is the Source editor, and what holds JSON is a text field that holds code', { layer }, async ({ page, level }) => {
  const seen = {};
  const held = {};
  for (const name of ['essentials', 'groups', 'tokens', 'source']) {
    await level(name);
    await page.waitForSelector(`[data-studio][data-level="${name}"]`);
    // Open what is drawn on opening: «specVersion and attribution», the import, a rule's row is there already.
    for (const selector of ['[data-about-more] > summary', '.ts-import > summary']) for (const fold of await page.locator(selector).all()) await fold.click();
    // (A fold writes what it holds at its `toggle` event, a task after the press.)
    await page.waitForFunction(() => [...document.querySelectorAll('[data-about-more], .ts-import')].every((fold) => !fold.open || fold.children.length > 1));
    if (name === 'tokens') {
      await page.locator('[data-search] input').fill('button.container.height.medium');
      await page.locator('[data-token="tanrei.comp.button.container.height.medium"] > span').click();
      await page.locator('[data-token-pane] [data-tab="json"]').click();
      await page.waitForSelector('[data-token-pane] tanrei-text-field[type="code"][multiline]');
    }
    seen[name] = [...new Set(await natives(page))].sort();
    held[name] = [...new Set(await codes(page))].sort();
  }
  assert.deepEqual(seen.essentials, [], 'Essentials');
  assert.deepEqual(seen.groups, [], 'Groups');
  assert.deepEqual(seen.tokens, [], 'Every token');
  assert.deepEqual(seen.source, ['textarea[data-source]'], 'Source: the layer file, in the Studio’s own editor');
  // What was a native text area inside a Field is a text field that holds code, complete by itself: none stands in a Field.
  assert.deepEqual(held.essentials, [], 'Essentials');
  assert.deepEqual(held.groups, ['lines', 'lines[data-import]'], 'Groups: the attribution’s sources and the import');
  assert.deepEqual(held.tokens, ['line[data-rule-match]', 'lines', 'lines[data-import]'], 'Every token: a rule’s pattern, an operation as JSON and a rule’s operation, the import');
  assert.deepEqual(held.source, ['lines[data-import]'], 'Source: the import');
  // (The Studio's own tree: a text field's own Field is in its shadow root, and is the text field's.)
  assert.equal(await page.evaluate(() => document.querySelectorAll('tanrei-field tanrei-text-field, tanrei-field tanrei-text-input, tanrei-field textarea').length), 0, 'the Studio frames no text field and no text input with a Field of its own');
  // The standalone app's bar: its theme button and its language select are Tanrei's too.
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.app-bar button, .app-bar input, .app-bar select')].length), 0);
  assert.equal(await page.locator('.app-bar #theme').evaluate((el) => el.localName), 'tanrei-button');
});

studioTest('an action is a Tanrei button: its drawn word, its whole name where rows share the word, and Enter and Space press it', { layer }, async ({ page, level, saved }) => {
  // «Reset» in a dial's row: drawn as one word, named with its dial.
  const space = page.locator('[data-dial="tanrei.dial.space.unit"]');
  const reset = space.locator('tanrei-button.ts-link');
  assert.deepEqual(await reset.evaluate((el) => [el.variant, el.size]), ['text', 'small']);
  assert.deepEqual(await reset.evaluate((el) => [el.textContent, el.childElementCount]), ['Reset', 0], 'the drawn word, and nothing else in the button');
  assert.equal(await space.getByRole('button', { name: 'Reset: Spacing', exact: true }).count(), 1, 'the name assistive technology is told');
  assert.deepEqual(await reset.evaluate((el) => [el.label, el.shadowRoot.querySelector('button').getAttribute('aria-label')]), ['Reset: Spacing', 'Reset: Spacing'], 'the name is the button’s label (BTN-16): read and not drawn');
  await reset.focus();
  assert.equal(await reset.evaluate((el) => el.matches(':focus-within') && el.shadowRoot.activeElement?.localName), 'button', 'the button takes the keyboard');
  await page.keyboard.press('Enter');
  await saved((file) => !file.tokens, 'Enter resets the dial');

  // The theme button of the app's bar says what its word is about.
  assert.equal(await page.getByRole('button', { name: 'Theme: Dark', exact: true }).count(), 1);
  await page.locator('#theme').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('html').getAttribute('data-tanrei-theme'), 'dark');
  assert.equal(await page.getByRole('button', { name: 'Theme: Light', exact: true }).count(), 1);

  // The one filled action of the export; the others outlined.
  await level('groups');
  assert.deepEqual(await page.locator('[data-panel="export"] .ts-export-side .ts-actions tanrei-button').evaluateAll((els) => els.map((el) => el.variant)), ['outlined', 'outlined', 'outlined'], 'with a file attached nothing is the main action');
  // A palette is declared by the button, and by Enter in its name: the form is still a form.
  const form = page.locator('[data-add-palette]');
  await form.locator('tanrei-text-field input').first().fill('extra');
  await page.keyboard.press('Enter');
  await saved((file) => file.palettes?.extra, 'Enter in the name declares the palette');
  // «N more» under a long flat list is a button that is out of the page while there is nothing more.
  await level('tokens');
  const more = page.locator('[data-more]');
  assert.equal(await more.evaluate((el) => [el.localName, el.hidden, getComputedStyle(el).display].join()), 'tanrei-button,true,none', 'hidden means not drawn');
  await page.locator('[data-search] input').fill('color');
  await until(async () => !(await more.evaluate((el) => el.hidden)), 'a long list offers more');
  assert.match(await more.textContent(), /\d/);
  const rows = await page.locator('[data-tree] [data-token]').count();
  await more.focus();
  await page.keyboard.press('Enter');
  await until(async () => (await page.locator('[data-tree] [data-token]').count()) > rows, 'Enter brings the next rows');
});

studioTest('a state that is pressed is a small chip with its glyph: the count of findings goes to the panel, the draft goes to Source', { layer }, async ({ page, level }) => {
  await level('groups');
  const count = page.locator('[data-a11y-count]');
  assert.deepEqual(await count.evaluate((el) => [el.localName, el.size, el.label, el.querySelector('[slot="icon"]').textContent, el.dataset.state]), ['tanrei-chip', 'small', 'All checks pass', 'check_circle', 'pass']);
  assert.equal(await page.getByRole('button', { name: 'All checks pass', exact: true }).count(), 1);
  await count.focus();
  await page.keyboard.press('Enter');
  await until(() => page.evaluate(() => { const box = document.querySelector('[data-panel="a11y"]').getBoundingClientRect(); return box.top < innerHeight && box.bottom > 0; }), 'the accessibility panel is brought into view');

  // At Source, what the engine refuses is said with the line it is on: the line is a button that puts the caret there.
  await level('source');
  const text = `${JSON.stringify({ id: 'acme', extends: 'tanrei', tokens: { 'tanrei.sys.space.nope': { scale: 2 } } }, null, 2)}\n`;
  await page.locator('[data-source]').fill(text);
  const line = page.locator('[data-source-problems] tanrei-button').first();
  assert.equal(await line.evaluate((el) => el.variant), 'text');
  await line.focus();
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(() => { const area = document.activeElement; return [area?.matches('[data-source]'), area?.value.slice(area.selectionStart, area.selectionEnd).trim()]; }), [true, '"tanrei.sys.space.nope": {'], 'the line’s button hands the keyboard to the text, with that line selected');

  await page.locator('[data-source]').fill('{ "draft": ');
  await level('essentials');
  const draft = page.locator('[data-draft-badge]');
  assert.deepEqual(await draft.evaluate((el) => [el.localName, el.label, el.querySelector('[slot="icon"]').textContent]), ['tanrei-chip', 'Source has invalid edits', 'warning']);
  await draft.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-studio][data-level="source"]');
  assert.equal(await page.locator('[data-source]').inputValue(), '{ "draft": ');
});

studioTest('the platform switch is a Switch named with the keyword it writes, the «Emphasized» box a Checkbox, the preview’s toggle a real toggle Button', { layer }, async ({ page, level, saved, lightPane }) => {
  await level('groups');
  const brand = page.locator('[data-typeface="brand"]');
  const platform = brand.locator('[data-stack-system]');
  assert.equal(await platform.evaluate((el) => el.localName), 'tanrei-switch');
  const named = await platform.locator('[role="switch"]').getAttribute('aria-label');
  assert.equal(named.replace(/[⁦⁩]/g, ''), 'Use the platform’s own font first system-ui', 'its name: the label, then the keyword');
  assert.ok(named.includes('⁦system-ui⁩'), 'the keyword is a left-to-right run of its own');
  assert.equal(await platform.locator('[role="switch"]').isChecked(), false);
  await platform.focus();
  await page.keyboard.press('Space');
  await saved((file) => file.tokens?.['tanrei.ref.typeface.brand']?.$value[0] === 'system-ui', 'Space switches it on');
  assert.equal(await platform.locator('[role="switch"]').isChecked(), true);
  // A press on its words is a press on the switch.
  await platform.locator('[part="label"]').click();
  await saved((file) => !file.tokens?.['tanrei.ref.typeface.brand'] || file.tokens['tanrei.ref.typeface.brand'].$value[0] !== 'system-ui', 'a press on the label switches it off');

  const emphasized = page.locator('[data-emphasized-toggle]');
  assert.equal(await emphasized.evaluate((el) => el.localName), 'tanrei-checkbox');
  assert.equal(await page.getByRole('checkbox', { name: 'Emphasized', exact: true }).count(), 1);
  await emphasized.focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('[data-scope]').getAttribute('data-emphasized'), '', 'Space checks it, and the samples are drawn emphasized');

  const toggle = lightPane.locator('[data-sample-toggle]').first();
  assert.deepEqual(await toggle.evaluate((el) => [el.localName, el.toggle, el.selected, el.shadowRoot.querySelector('button').getAttribute('aria-pressed'), el.textContent.trim().replace(/^favorite\s*/, '')]), ['tanrei-button', true, false, 'false', 'Unselected']);
  await toggle.click();
  assert.deepEqual(await toggle.evaluate((el) => [el.selected, el.shadowRoot.querySelector('button').getAttribute('aria-pressed'), el.textContent.trim().replace(/^favorite\s*/, '')]), [true, 'true', 'Selected'], 'pressed, it is on and says so');
});

studioTest('a rule’s pattern is a text input in the code face, read from the left; its operation and any JSON are a text field that holds code and says itself what does not parse', { layer }, async ({ page, level, saved }) => {
  await level('tokens');
  const rule = page.locator('[data-rule="0"]');
  const pattern = rule.locator('[data-rule-match]');
  // The box alone: its name is read and not drawn, and no row of a Field stands around it.
  assert.equal(await pattern.evaluate((el) => el.localName), 'tanrei-text-input');
  assert.deepEqual(await pattern.evaluate((el) => [el.label, el.variant, el.shadowRoot.querySelector('[part~="label"]')]), ['match', 'stacked', null], 'named by its own label, which a stacked input does not draw');
  assert.equal(await rule.getByRole('textbox', { name: 'match', exact: true }).count(), 1);
  const drawn = await pattern.locator('input').evaluate((el) => ({ direction: getComputedStyle(el).direction, face: getComputedStyle(el).fontFamily, code: getComputedStyle(document.querySelector('.ts code')).fontFamily }));
  assert.equal(drawn.direction, 'ltr');
  assert.equal(drawn.face, drawn.code, 'the face ids are drawn in everywhere');
  await pattern.locator('input').fill('tanrei.comp.*.*.focused.container.color');
  await saved((file) => file.rules?.[0]?.match === 'tanrei.comp.*.*.focused.container.color', 'the pattern is written as it is typed');

  assert.equal(await pattern.evaluate((el) => el.type), 'code', 'the face is the type’s, not a rule of the Studio’s on the field’s part');
  const operation = rule.locator('tanrei-text-field[type="code"][multiline]');
  const area = operation.locator('textarea');
  assert.equal(await rule.evaluate((el) => el.querySelectorAll('tanrei-field').length), 0, 'no Field of the Studio’s frames it: the text field is complete by itself');
  assert.equal(await rule.getByRole('textbox', { name: 'Operation (JSON): $value, reason, derive', exact: true }).count(), 1, 'the field names its text area, its label undrawn');
  // Its label is undrawn: neither its Field nor its text input (the two it is built from) draws a label.
  assert.deepEqual(await operation.evaluate((el) => [el.labelHidden, ...['tanrei-field', 'tanrei-text-input'].map((member) => { const root = el.shadowRoot.querySelector(member)?.shadowRoot; return root ? [...root.querySelectorAll('[part~="label"]')].filter((label) => label.getBoundingClientRect().width > 0).length : 'missing'; })]), [true, 0, 0]);
  assert.deepEqual(await area.evaluate((el) => [el.dir, el.spellcheck, getComputedStyle(el).direction]), ['ltr', false, 'ltr']);
  assert.equal(await area.evaluate((el) => getComputedStyle(el).fontFamily), drawn.code, 'JSON is in the face ids are drawn in');
  await area.fill('{ "$value": ');
  await until(() => operation.evaluate((el) => el.error && el.errorText.length > 0), 'what does not parse is the field’s error');
  assert.equal(await area.getAttribute('aria-invalid'), 'true');
  await page.waitForTimeout(900); // longer than the autosave delay
  await saved((file) => file.rules?.[0]?.$value === '{tanrei.comp.$1.$2.container.color}', 'and is never written');
  await area.fill('{ "$value": "{tanrei.comp.$1.$2.container.color}", "reason": "Hover is the resting color here." }');
  await until(() => operation.evaluate((el) => !el.error), 'the error goes with the cause');
  await saved((file) => file.rules?.[0]?.reason === 'Hover is the resting color here.', 'JSON that parses is written');
});

studioTest('Arabic: a rule’s pattern and JSON are still read from the left, and a button’s name is the dictionary’s whole sentence', { layer, locale: 'ar' }, async ({ page, level }) => {
  await page.waitForSelector('.ts[dir="rtl"], [dir="rtl"] .ts, html[dir="rtl"]');
  await level('tokens');
  const rule = page.locator('[data-rule="0"]');
  assert.equal(await rule.locator('[data-rule-match] input').evaluate((el) => getComputedStyle(el).direction), 'ltr', 'a token id’s letters are Latin: the field lays it out from the left by itself');
  const json = rule.locator('tanrei-text-field[type="code"][multiline] textarea');
  assert.deepEqual(await json.evaluate((el) => [getComputedStyle(el).direction, getComputedStyle(el).textAlign, getComputedStyle(el.getRootNode().host).direction]), ['ltr', 'left', 'rtl'], 'the code from the left, in a field that stands in a right-to-left pane');
  // Emptied, holding a bracket alone, or beginning with an Arabic string, the field is laid out alike (TXF-53).
  // (In the layer to import, which is written nowhere until it is applied.)
  await page.locator('.ts-import > summary').click();
  const pasted = page.locator('[data-import] textarea');
  for (const text of ['', '{', '["مرحبا", "acme"]']) {
    await pasted.fill(text);
    assert.deepEqual(await pasted.evaluate((el) => [el.dir, getComputedStyle(el).direction, getComputedStyle(el).textAlign, getComputedStyle(el).unicodeBidi === 'plaintext']), ['ltr', 'ltr', 'left', false], JSON.stringify(text));
  }
  await level('essentials');
  const reset = page.locator('[data-dial="tanrei.dial.space.unit"] tanrei-button.ts-link');
  const [word, name] = await reset.evaluate((el) => [el.textContent, el.label]);
  assert.ok(name.startsWith(word) && name.length > word.length, `the name opens with the drawn word: «${word}» in «${name}»`);
});
