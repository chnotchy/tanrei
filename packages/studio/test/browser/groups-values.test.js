// The value sections of the rail: the base, the brand color, the size, dials, palettes and the tone table.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

studioTest('the brand color and the size reach the file and the preview; another base starts from that base', {}, async ({ page, section, saved, onDisk, css, scope, choose }) => {
  assert.equal(await page.locator('[data-studio]').getAttribute('data-section'), 'color');
  assert.deepEqual(await page.locator('[data-controls] [data-panel]').evaluateAll((els) => els.map((el) => el.dataset.panel)), ['brand']);
  assert.equal(await page.locator('[data-panel="a11y"]').count(), 0, 'the panel holds the row alone');

  const before = (await css(scope, '--tanrei-ref-palette-primary-40')).trim();
  // A color is shown as it is typed and written when it is committed (Enter, or leaving the field).
  await page.locator('[data-panel="brand"] tanrei-color-field input[type="text"]').first().fill('#0f766e');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.palettes?.primary?.source?.seed === '#0f766e', 'the brand color');
  await until(async () => (await css(scope, '--tanrei-ref-palette-primary-40')).trim() !== before, 'the preview’s primary palette follows');

  // The size: the control height, by keyboard on its slider; the row says the new value.
  await section('size');
  assert.deepEqual(await page.locator('[data-controls] [data-panel]').evaluateAll((els) => els.map((el) => el.dataset.panel)), ['size']);
  assert.deepEqual(await page.locator('[data-panel="size"] [data-dial]').evaluateAll((els) => els.map((el) => el.dataset.dial)), ['tanrei.dial.control.height', 'tanrei.dial.size.unit', 'tanrei.sys.target.minimum']);
  // Each number is named by what it does: the token ids are Inspect's and Export's, not the row's panel's.
  assert.deepEqual(await page.locator('[data-panel="size"] .ts-row-title').evaluateAll((els) => els.filter((el) => el.querySelector('code') || /dial\.|sys\./.test(el.textContent)).map((el) => el.textContent)), []);
  const height = page.locator('[data-dial="tanrei.dial.control.height"]');
  const heightBefore = (await css(scope, '--tanrei-dial-control-height')).trim();
  // Under it, a Button, a field, a menu row and a tab of the preview's system.
  const sample = page.locator('[data-panel="size"] [data-size-sample]');
  assert.deepEqual(await sample.locator('[data-sample]').evaluateAll((els) => els.map((el) => el.dataset.sample)), ['button', 'field', 'menu-row', 'tabs']);
  const buttonHeight = async () => (await sample.locator('[data-sample="button"]').boundingBox())?.height;
  await until(async () => (await buttonHeight()) === 40, 'the sample Button is drawn at the control height');
  await height.locator('tanrei-slider [role="slider"]').focus();
  await page.keyboard.press('ArrowRight');
  await saved((layer) => layer.tokens?.['tanrei.dial.control.height']?.$value?.value === 41, 'the control height');
  await until(async () => (await css(scope, '--tanrei-dial-control-height')).trim() !== heightBefore, 'the preview’s control height follows');
  assert.equal(await page.locator('[data-rail] [data-row="size"] .ts-rail-value').textContent(), '41px · minimum 36px');
  await until(async () => (await buttonHeight()) === 41, 'the sample Button follows the control height');
  // Under the control height, the heights it gives: the ladder's small, medium and large, read through the minimum target.
  const heights = page.locator('[data-panel="size"] [data-heights]');
  await until(async () => (await heights.textContent()) === 'Heights at this control height: small 36px (33px, raised to the minimum target) · medium 41px · large 57px', 'the heights at 41');
  await height.locator('tanrei-button', { hasText: 'Reset' }).click();
  // The brand color writes a palette alone: with the height reset, the layer may hold no token at all.
  await saved((layer) => !layer.tokens?.['tanrei.dial.control.height'], 'reset');
  await until(async () => (await heights.textContent()) === 'Heights at this control height: small 36px (32px, raised to the minimum target) · medium 40px · large 56px', 'the heights at 40');
  const unit = page.locator('[data-dial="tanrei.dial.size.unit"]');

  // The minimum target: a value of its own, a whole pixel from 24 to the control height, by keyboard on its slider or typed.
  const minimum = page.locator('[data-dial="tanrei.sys.target.minimum"]');
  const targetBefore = (await css(scope, '--tanrei-sys-target-minimum')).trim();
  await minimum.locator('tanrei-slider [role="slider"]').focus();
  await page.keyboard.press('ArrowRight');
  await saved((layer) => layer.tokens?.['tanrei.sys.target.minimum']?.$value?.value === 37, 'the minimum target');
  await until(async () => (await css(scope, '--tanrei-sys-target-minimum')).trim() !== targetBefore, 'the preview’s minimum target follows');
  assert.equal(await page.locator('[data-rail] [data-row="size"] .ts-rail-value').textContent(), '40px · minimum 37px');
  await until(async () => (await heights.textContent()) === 'Heights at this control height: small 37px (32px, raised to the minimum target) · medium 40px · large 56px', 'the heights follow the minimum');
  // A number past the control's ends is brought within them: the file never holds a minimum the build refuses.
  for (const [typed, written] of [['60', 40], ['12', 24]]) {
    await minimum.locator('tanrei-number-field input').fill(typed);
    await page.keyboard.press('Enter');
    await saved((layer) => layer.tokens?.['tanrei.sys.target.minimum']?.$value?.value === written, `${typed} is written as ${written}`);
  }
  // The size unit no longer takes the targets with it.
  const targets = async () => Promise.all(['minimum', 'touch', 'pointer'].map(async (kind) => (await css(scope, `--tanrei-sys-target-${kind}`)).trim()));
  const held = await targets();
  await unit.locator('tanrei-slider [role="slider"]').focus();
  await page.keyboard.press('ArrowRight');
  await saved((layer) => layer.tokens?.['tanrei.dial.size.unit']?.$value?.value === 4.25, 'the size unit');
  await until(async () => (await css(scope, '--tanrei-dial-size-unit')).trim() !== '4px', 'the preview’s size unit follows');
  assert.deepEqual(await targets(), held);
  // The row's reset takes back both.
  await page.locator('[data-reset-dials="size"]').click();
  await saved((layer) => !layer.tokens?.['tanrei.sys.target.minimum'] && !layer.tokens?.['tanrei.dial.size.unit'], 'reset all');
  // The default system's primary is monochrome: the brand color is a palette alone in the file, and the engine draws
  // the preview's primary from it — not the default system's near-black the page's own root holds.
  assert.deepEqual(onDisk(), { id: 'acme', extends: 'tanrei', palettes: { primary: { source: { seed: '#0f766e' } } } });
  const primary = (await css(scope, '--tanrei-sys-color-primary')).trim();
  assert.notEqual(primary, (await css(page.locator('html'), '--tanrei-sys-color-primary')).trim(), 'the preview’s primary is the brand’s');

  // Another base: operations are relative to what they inherit, so the layer starts from that base's defaults — one
  // step, said with the way to undo it, as a new start from the bar is.
  await section('base');
  assert.match(await page.locator('[data-base-description]').textContent(), /\w/);
  await choose(page.locator('[data-base]'), 'm3-like');
  await saved((layer) => layer.extends === 'm3-like', 'the base');
  assert.deepEqual(Object.keys(onDisk()), ['id', 'extends'], 'it starts from that base’s defaults');
  // m3-like fixes single tones of its primary: the brand color shows the table for a palette that HAS them.
  await section('color');
  await page.waitForSelector('[data-panel="brand"] [data-tones="primary"]');
});

studioTest('a layer with every value written out extends the root: the Base system panel shows it chosen, with its description', { layer: { id: 'acme', extends: 'core', palettes: { primary: { source: { seed: '#0b6e4f' } } } } }, async ({ page, section, choose, saved }) => {
  await section('base');
  const base = page.locator('[data-base]');
  assert.equal(await base.evaluate((el) => el.value), 'core');
  assert.deepEqual(await base.locator('tanrei-radio-button').evaluateAll((els) => els.filter((el) => el.checked).map((el) => el.value)), ['core'], 'one choice is checked: the base the layer has');
  assert.match(await page.locator('[data-base-description]').textContent(), /root layer/);
  // Another base is chosen as from any other.
  await choose(base, 'm3-like');
  await saved((layer) => layer.extends === 'm3-like', 'the base');
});

studioTest('Dials and Palettes: a dial keeps its reason; palettes are added, recolored and removed; the tone table fixes single tones', {}, async ({ page, section, saved, onDisk, css, scope, lightPane }) => {
  await section('dials');
  assert.equal(await page.locator('[data-dials="dials"] [data-dial]').count(), 8, 'all eight dials');

  // A dial: typed, with a reason of its own; reset removes the entry.
  const shape = page.locator('[data-dial="tanrei.dial.shape.unit"]');
  const shapeBefore = (await css(scope, '--tanrei-dial-shape-unit')).trim();
  await shape.locator('tanrei-number-field input').fill('6');
  await page.keyboard.press('Tab');
  await saved((layer) => layer.tokens?.['tanrei.dial.shape.unit']?.$value.value === 6, 'the dial');
  assert.notEqual((await css(scope, '--tanrei-dial-shape-unit')).trim(), shapeBefore);
  await shape.locator('tanrei-number-field input').fill('99');
  await page.keyboard.press('Tab');
  await saved((layer) => layer.tokens['tanrei.dial.shape.unit'].$value.value === 8, 'a value beyond the slider is held at its end');
  assert.ok(await shape.getAttribute('data-changed') !== null);
  await shape.locator('[data-dial-reason] input').fill('Rounder, like the logo.');
  await saved((layer) => layer.tokens['tanrei.dial.shape.unit'].reason === 'Rounder, like the logo.', 'the dial’s reason');
  await shape.locator('tanrei-button', { hasText: 'Reset' }).click();
  await saved((layer) => !layer.tokens, 'the dial reset');

  // Fixed tones: add (starts as the generated color), edit → the preview's palette variable, remove → nothing left.
  await section('palettes');
  const accent = page.locator('[data-palette="accent"]');
  await accent.locator('[data-tones] summary').click();
  await accent.locator('[data-tone-new] input').fill('40');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.palettes?.accent?.source?.tones?.['40'], 'tone added');
  const generated = onDisk().palettes.accent.source.tones['40'];
  assert.match(generated, /^#[0-9a-f]{6}$/i);
  assert.equal((await css(scope, '--tanrei-ref-palette-accent-40')).trim().toLowerCase(), generated.toLowerCase(), 'a new row changes no pixel');
  await accent.locator('[data-tone-row="40"] tanrei-color-field input[type="text"]').first().fill('#ff0080');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.palettes.accent.source.tones['40'] === '#ff0080', 'tone edited');
  assert.equal((await css(scope, '--tanrei-ref-palette-accent-40')).trim(), '#ff0080');
  await accent.locator('[data-tone-new] input').fill('40');
  await page.keyboard.press('Enter');
  // What is wrong is the field's own error: drawn under it, and what the field is described by.
  assert.equal(await accent.locator('[data-tone-new]').evaluate((el) => el.error), true);
  assert.match(await accent.locator('[data-tone-new]').evaluate((el) => el.errorText), /40/, 'a tone is fixed once');
  assert.equal(await accent.locator('[data-tone-new] input').getAttribute('aria-invalid'), 'true');
  await accent.locator('[data-tone-row="40"] .ts-link').click();
  await saved((layer) => !layer.palettes?.accent, 'tone removed: the palette is the inherited one again');

  // A palette of the layer's own: refused with words when the name is taken, drawn in the preview when added.
  const form = page.locator('[data-add-palette]');
  await form.locator('[name="name"] input').fill('primary');
  await form.locator('[data-add-palette-submit]').click();
  assert.match(await form.locator('[name="name"]').evaluate((el) => (el.error ? el.errorText : '')), /\w/, 'the name field says what is wrong');
  assert.equal(await form.locator('[name="name"] input').getAttribute('aria-invalid'), 'true');
  await form.locator('[name="name"] input').fill('correct');
  await form.locator('[name="description"] input').fill('A right answer in a quiz.');
  await form.locator('[data-add-palette-submit]').click();
  await saved((layer) => layer.palettes?.correct?.source?.seed, 'palette added');
  assert.equal(onDisk().palettes.correct.description, 'A right answer in a quiz.');
  await until(async () => (await lightPane.locator('[data-intents]').textContent()).includes('correct'), 'the new intent is drawn in the preview');
  const correct = page.locator('[data-palette="correct"]');
  await correct.locator('tanrei-color-field input[type="text"]').first().fill('#2e7d32');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.palettes.correct.source.seed === '#2e7d32', 'recolored');
  await correct.locator('tanrei-button', { hasText: 'Remove' }).click();
  await saved((layer) => !layer.palettes, 'palette removed');
  assert.equal(await page.locator('[data-palette="correct"]').count(), 0);
});

studioTest('Components: one accordion whose items are drawn when they open; sizes and variants are tags, the size of the common edits a radio group, an edit a fold of its own', {}, async ({ page, section, saved, choose }) => {
  await section('components');
  const list = page.locator('[data-components]');
  assert.equal(await list.evaluate((el) => el.localName), 'tanrei-accordion');
  assert.ok((await list.locator('> details').count()) > 30, 'every component is an item');
  assert.equal(await list.locator('tanrei-tag, tanrei-radio-group, [data-common]').count(), 0, 'and nothing of a closed item is drawn');
  const button = list.locator('[data-component="button"]');
  await button.locator('> summary').click();
  // An item is drawn when its `toggle` arrives, a task after the press: the read waits for it (it raced it, and lost on a quiet machine).
  await until(async () => (await button.locator('[data-sizes] tanrei-tag').count()) > 0, 'the item is drawn once it is open');
  assert.deepEqual(await button.locator('[data-sizes] tanrei-tag').evaluateAll((tags) => tags.map((tag) => tag.label.split(' ')[0])), ['small', 'medium', 'large']);
  assert.ok((await button.locator('[data-variants] tanrei-tag').count()) >= 4);
  assert.equal(await button.locator('[data-variants] tanrei-tag [slot="icon"]').first().evaluate((dot) => getComputedStyle(dot).backgroundColor !== 'rgba(0, 0, 0, 0)'), true, 'a variant’s tag shows its color');
  // The size the common edits apply to: a radio group, and the edits under it follow.
  const picker = button.locator('[data-common-size]');
  assert.deepEqual(await picker.evaluate((el) => [el.localName, el.value]), ['tanrei-radio-group', 'medium']);
  assert.equal(await button.locator('[data-common="tanrei.comp.button.container.height.medium"]').count(), 1);
  await choose(picker, 'large');
  await button.locator('[data-common="tanrei.comp.button.container.height.large"] > summary').click();
  // A common edit is the token's own editor: its scale is a slider beside a number field, written when a step ends.
  const editor = button.locator('[data-editor="tanrei.comp.button.container.height.large"]');
  await editor.locator('[data-tab="scale"]').click();
  assert.equal(await editor.locator('tanrei-slider').count(), 1);
  await editor.locator('tanrei-slider [role="slider"]').focus();
  await page.keyboard.press('ArrowRight');
  await saved((layer) => layer.tokens?.['tanrei.comp.button.container.height.large']?.scale > 1, 'the scale');
  assert.equal(await editor.locator('tanrei-number-field input').inputValue(), '1.05', 'and the number beside the slider follows it');
  // Drawn again (another section and back), the item the person left open is open.
  await section('color');
  await section('components');
  assert.equal(await page.locator('[data-component="button"]').evaluate((el) => el.open), true);
});

studioTest('Components: the input box is an item of its own — its sizes, looks and common edits — and each control drawn on it opens it above its own controls', {}, async ({ page, section }) => {
  await section('components');
  const list = page.locator('[data-components]');
  // The set is no component: it is listed by default, with no level, under its group's name.
  const box = list.locator('> [data-component="input-box"]');
  assert.equal(await box.count(), 1);
  await box.locator('> summary').click();
  await until(async () => (await box.locator('[data-sizes] tanrei-tag').count()) > 0, 'the item is drawn once it is open');
  assert.deepEqual(await box.locator('[data-sizes] tanrei-tag').evaluateAll((tags) => tags.map((tag) => tag.label.split(' ')[0])), ['small', 'medium', 'large']);
  assert.deepEqual(await box.locator('[data-variants] tanrei-tag').evaluateAll((tags) => tags.map((tag) => tag.label)), ['stacked', 'filled', 'outlined']);
  assert.equal(await box.locator('[data-common="tanrei.comp.input-box.container.height.medium"]').count(), 1);
  assert.equal(await box.locator('[data-common="tanrei.comp.input-box.container.shape"]').count(), 1);
  // A control drawn on the box (the select is listed by default): the box's item inside it, then its own looks, whose
  // samples are drawn from the box's colors — the select has no container color of its own any more.
  const select = list.locator('> [data-component="select"]');
  assert.equal(await select.getAttribute('data-reads'), 'input-box');
  await select.locator('> summary').click();
  const inside = select.locator('[data-member="input-box"]');
  await until(async () => (await inside.count()) > 0 && (await select.locator('[data-variants] tanrei-tag').count()) > 0, 'the select’s item is drawn once it is open');
  assert.equal(await inside.count(), 1);
  assert.equal(await select.locator('> :not(summary) [data-sizes] tanrei-tag').count(), 0, 'the select has no size of its own: a size is a measure of the box');
  assert.equal(await select.locator('> :not(summary) [data-axis-row="sizes"]').count(), 0, 'a row with nothing in it is not drawn: no empty "Sizes:"');
  assert.equal(await select.locator('> :not(summary) [data-axis-row="variants"]').count(), 1, 'the row that has tags is drawn');
  assert.equal(await select.locator('[data-variants] tanrei-tag [slot="icon"]').first().evaluate((dot) => getComputedStyle(dot).backgroundColor !== 'rgba(0, 0, 0, 0)'), true, 'a look’s sample is the box’s color');
  await inside.locator('> summary').click();
  await until(async () => (await inside.locator('[data-common]').count()) > 0, 'the box’s item inside the select’s is drawn once it is open');
  assert.equal(await inside.locator('[data-common="tanrei.comp.input-box.container.height.medium"]').count(), 1);
  // A field around such a control opens the box's panel beside its members'.
  assert.equal(await list.locator('> [data-component="select-field"]').getAttribute('data-members'), 'field input-box select');
  // With everything shown, the controls that declare no axis any more are still items.
  await page.locator('[data-components-everything]').evaluate((el) => el.shadowRoot.querySelector('button, input, [role="switch"]').click());
  for (const name of ['text-input', 'combobox', 'number-input', 'color-input']) assert.equal(await page.locator(`[data-components] > [data-component="${name}"]`).getAttribute('data-reads'), 'input-box', name);
});
