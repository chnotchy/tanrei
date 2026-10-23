// The rail's typefaces, icon set, corner smoothing and behaviour — driven with real input events, asserted on
// the FILE the server holds and on the COMPUTED styles of the preview's real components.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

studioTest('Typefaces: add by typing, reorder by keyboard, remove, generic, platform switch → the preview’s computed font-family; "not installed here" is honest', {}, async ({ page, section, saved, onDisk, css, lightPane, installed, choose, pick }) => {
  await section('typeface');
  const brand = page.locator('[data-typeface="brand"]');
  const headline = lightPane.locator('[data-sample="heading-1"]');
  assert.match(await css(headline, 'font-family'), /^Inter/);

  // A family is added by name: a combobox field, which takes a name that is none of its options (Enter commits it).
  assert.equal(await brand.locator('[data-stack-input]').evaluate((el) => el.localName), 'tanrei-combobox-field');
  await brand.locator('[data-stack-input] input').click();
  await page.keyboard.type('Acme Grotesk Nowhere');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens?.['tanrei.ref.typeface.brand']?.$value.includes('Acme Grotesk Nowhere'), 'family added');
  assert.deepEqual(onDisk().tokens['tanrei.ref.typeface.brand'], { $value: ['Inter', 'Noto Sans JP', 'Noto Sans', 'Acme Grotesk Nowhere', 'system-ui', 'sans-serif'], reason: 'Brand typeface.' });

  // Reorder with the keyboard: Space on the new family's handle lifts it, Up Arrow three times carries it to the top,
  // Space drops it. (test/browser/typeface-stack.test.js holds the menu, focus and what is announced.)
  await brand.locator('[data-family="Acme Grotesk Nowhere"]').evaluate((item) => item.focus());
  await page.keyboard.press('Space');
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await saved((layer) => layer.tokens['tanrei.ref.typeface.brand'].$value[0] === 'Acme Grotesk Nowhere', 'moved to the top');
  await until(() => page.evaluate(() => document.activeElement?.closest('[data-family]')?.getAttribute('data-family') === 'Acme Grotesk Nowhere'), 'focus stays on the moved family');
  assert.match(await css(headline, 'font-family'), /^"Acme Grotesk Nowhere", Inter/);

  // Honesty: this browser cannot draw the family; the host bundles Inter.
  assert.equal(await installed('Acme Grotesk Nowhere'), false);
  assert.equal(await installed('Inter'), true, 'the app registers the default system’s families');
  const fontNote = brand.locator('[data-font-note]');
  await until(() => fontNote.isVisible(), 'the font note');
  assert.match(await fontNote.textContent(), /Acme Grotesk Nowhere is not installed here — the preview shows the fallback; your product must load it\./);
  assert.equal(await brand.locator('[data-family="Acme Grotesk Nowhere"] [data-stack-missing]').evaluate((note) => (note.hidden ? '' : note.textContent)), 'not installed here');
  assert.equal(await brand.locator('[data-family="Inter"] [data-stack-missing]').evaluate((note) => (note.hidden ? '' : note.textContent)), '', 'Inter is bundled by the host: no note');

  // Suggestion chip, remove, generic, platform switch.
  await brand.locator('[data-suggest="Roboto"]').click();
  await saved((layer) => layer.tokens['tanrei.ref.typeface.brand'].$value.includes('Roboto'), 'suggestion chip');
  await brand.locator('[data-family="Roboto"] [data-act="remove"]').click();
  await saved((layer) => !layer.tokens['tanrei.ref.typeface.brand'].$value.includes('Roboto'), 'removed');
  await choose(brand.locator('[data-stack-generic]'), 'serif');
  await saved((layer) => layer.tokens['tanrei.ref.typeface.brand'].$value.at(-1) === 'serif', 'generic');
  assert.match(await css(headline, 'font-family'), /serif$/);
  await brand.locator('[data-stack-system]').focus();
  await page.keyboard.press('Space');
  await saved((layer) => layer.tokens['tanrei.ref.typeface.brand'].$value[0] === 'system-ui', 'platform first');
  assert.match(await css(headline, 'font-family'), /^system-ui, "Acme Grotesk Nowhere"/);
  await until(async () => !(await fontNote.isVisible()), 'with the platform font first there is nothing missing to report');

  // A keyword typed as a family is refused with words.
  await brand.locator('[data-stack-input] input').fill('sans-serif');
  await page.keyboard.press('Enter');
  assert.equal(await brand.locator('[data-stack-input]').evaluate((el) => el.error), true, 'the field is in error');
  assert.match(await brand.locator('[data-stack-input]').evaluate((el) => el.errorText), /CSS keyword/);
  assert.equal(await brand.locator('[data-stack-input] input').getAttribute('aria-invalid'), 'true');
  assert.ok(!onDisk().tokens['tanrei.ref.typeface.brand'].$value.slice(0, -1).includes('sans-serif'), 'and nothing was added');
  await brand.locator('[data-stack-input] input').fill('');
  await page.keyboard.press('Tab');
  // An option of the list is a family too: chosen, it is added and the field is empty again.
  await pick(brand.locator('[data-stack-input]'), 'IBM Plex Sans');
  await saved((layer) => layer.tokens['tanrei.ref.typeface.brand'].$value.includes('IBM Plex Sans'), 'a family chosen from the list');
  assert.equal(await brand.locator('[data-stack-input]').evaluate((el) => el.value), '');

  // The group's reason: asked once, reaches the pin; a too-short one is never written.
  const why = page.locator('[data-group-reason=\"typefaces\"] input');
  await why.fill('Licensed for every Acme product.');
  await saved((layer) => layer.tokens['tanrei.ref.typeface.brand'].reason === 'Licensed for every Acme product.', 'reason');
  await why.fill('short');
  assert.equal(await why.getAttribute('aria-invalid'), 'true');
  await page.waitForTimeout(900); // longer than the autosave delay
  assert.equal(onDisk().tokens['tanrei.ref.typeface.brand'].reason, 'Licensed for every Acme product.');
  await why.fill('Licensed for every Acme product.');

  // Mono → the preview's code sample. Reset all → nothing of the group is left in the file.
  const mono = page.locator('[data-typeface="mono"]');
  await mono.locator('summary').click();
  await mono.locator('[data-stack-system]').click();
  await saved((layer) => layer.tokens['tanrei.ref.typeface.mono']?.$value[0] === 'ui-monospace', 'mono platform');
  assert.match(await css(lightPane.locator('[data-sample="code"]'), 'font-family'), /^ui-monospace, "Roboto Mono"/);
  await page.locator('[data-reset-typefaces]').click();
  await saved((layer) => !layer.tokens, 'reset all');
  assert.match(await css(headline, 'font-family'), /^Inter/);
});

studioTest('Icons: weight by keyboard, fill, one variable family ↔ two static ones → computed font-family and font-variation-settings; a missing family is named', {}, async ({ page, section, saved, css, lightPane, installed, choose, pick }) => {
  await section('icons');
  const icons = page.locator('[data-panel="icons"]');
  const unselected = lightPane.locator('[data-icon-row="unselected"] .tanrei-icon').first();
  const selected = lightPane.locator('[data-icon-row="selected"] .tanrei-icon').first();
  assert.match(await css(unselected, 'font-family'), /Material Symbols Rounded/);
  assert.match(await css(unselected, 'font-variation-settings'), /"FILL" 0.*"wght" 300/);
  assert.match(await css(selected, 'font-variation-settings'), /"FILL" 1.*"wght" 300/);
  assert.ok(!(await icons.locator('[data-icon-note="family"]').isVisible()), 'the default icon font is bundled: no note');
  await page.evaluate(() => document.fonts.ready);
  await until(async () => (await unselected.evaluate((el) => el.scrollWidth)) <= 26, 'the default icon font really draws: one glyph wide, not the width of the word');

  await icons.locator('[data-icon-weight] [role="slider"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await saved((layer) => layer.tokens?.['tanrei.sys.icon.weight']?.$value === 500, 'icon weight');
  assert.match(await css(unselected, 'font-variation-settings'), /"wght" 500/);
  // A number is shown as it is typed and written when it is committed (Enter, or leaving the field).
  await icons.locator('[data-icon-fill="fillSelected"] input').fill('0.5');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens['tanrei.sys.icon.fill.selected']?.$value === 0.5, 'fill');
  assert.match(await css(selected, 'font-variation-settings'), /"FILL" 0\.5/);
  await icons.locator('[data-icon-fill="fillSelected"] input').fill('1');
  await page.keyboard.press('Enter');
  await saved((layer) => !layer.tokens['tanrei.sys.icon.fill.selected'], 'fill back to the base: the entry goes');

  // Another family: the note tells the truth, whatever this machine has installed.
  await icons.locator('[data-icon-family="family"] input').fill('Acme Icons Nowhere');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens['tanrei.ref.typeface.icon']?.$value[0] === 'Acme Icons Nowhere', 'icon family');
  assert.match(await css(unselected, 'font-family'), /Acme Icons Nowhere/);
  assert.match(await css(selected, 'font-family'), /Acme Icons Nowhere/);
  await until(() => icons.locator('[data-icon-note="family"]').isVisible(), 'the icon note');
  assert.match(await icons.locator('[data-icon-note="family"]').textContent(), /Acme Icons Nowhere is not installed here — the preview shows the fallback; your product must load it\./);
  await icons.locator('[data-icon-family="family"] input').fill('Material Symbols Rounded');
  await page.keyboard.press('Enter');
  await saved((layer) => !layer.tokens['tanrei.ref.typeface.icon'], 'icon family back');
  await until(async () => !(await icons.locator('[data-icon-note="family"]').isVisible()), 'the icon note goes');

  // Two static families: the same icons draw with the family of their state.
  await choose(icons.locator('[data-icon-mode]'), 'static');
  await saved((layer) => layer.tokens['tanrei.sys.icon.family.unselected'] && layer.tokens['tanrei.sys.icon.family.selected'], 'static mode');
  await pick(icons.locator('[data-icon-family="unselected"]'), 'Material Icons Outlined');
  await icons.locator('[data-icon-family="selected"] input').fill('Material Icons');
  await page.keyboard.press('Enter');
  await saved((layer) => layer.tokens['tanrei.sys.icon.family.selected'].$value[0] === 'Material Icons' && layer.tokens['tanrei.sys.icon.family.unselected'].$value[0] === 'Material Icons Outlined', 'static families');
  assert.equal(await css(unselected, 'font-family'), '"Material Icons Outlined"');
  assert.equal(await css(selected, 'font-family'), '"Material Icons"');
  for (const [key, family] of [['unselected', 'Material Icons Outlined'], ['selected', 'Material Icons']]) {
    const here = await installed(family);
    await until(async () => (await icons.locator(`[data-icon-note="${key}"]`).isVisible()) === !here, `${family}: the note is shown exactly when the family cannot be drawn (installed here: ${here})`);
  }
  await choose(icons.locator('[data-icon-mode]'), 'variable');
  await saved((layer) => !layer.tokens['tanrei.sys.icon.family.unselected'] && !layer.tokens['tanrei.sys.icon.family.selected'], 'variable again removes both pins');
  assert.match(await css(selected, 'font-family'), /Material Symbols Rounded/);
});

studioTest('Behaviour: chosen by name with the arrow keys; the preview’s real button ripples, dims and glows', {}, async ({ page, section, saved, onDisk, css, scope, lightPane, choose }) => {
  await section('behavior');
  const behaviour = page.locator('[data-panel="behavior"]');
  assert.deepEqual(await behaviour.locator('[data-behavior="pressed-feedback"] tanrei-radio-button').evaluateAll((els) => els.map((el) => el.label)), ['overlay', 'ripple', 'dim', 'none'], 'names, never numbers');
  assert.match(await behaviour.locator('[data-behavior-row="pressed-feedback"] .ts-help').textContent(), /^How a press is answered\. overlay:/);
  const filled = lightPane.locator('tanrei-button[variant="filled"]').first();
  const inner = (button) => button.evaluateHandle((el) => el.shadowRoot.querySelector('button'));
  const pressAndLook = async (button) => {
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    await page.mouse.move(box.x + 12, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300); // the state transition
    const seen = await button.evaluate((el) => { const b = el.shadowRoot.querySelector('button'); return { pressed: b.getAttribute('data-pressed'), ripple: Boolean(el.shadowRoot.querySelector('.ripple')), opacity: getComputedStyle(b).opacity }; });
    await page.mouse.up();
    await page.mouse.move(0, 0);
    return seen;
  };
  const overlay = await pressAndLook(filled);
  assert.equal(overlay.ripple, false);

  // A radio group: the arrow keys choose.
  assert.equal(await behaviour.locator('[data-behavior="pressed-feedback"]').evaluate((el) => el.localName), 'tanrei-radio-group');
  await behaviour.locator('[data-behavior="pressed-feedback"] tanrei-radio-button[data-value="overlay"]').focus();
  await page.keyboard.press('ArrowRight');
  await saved((layer) => layer.tokens?.['tanrei.sys.behavior.pressed-feedback']?.$value === 1, 'ripple');
  assert.deepEqual(onDisk().tokens['tanrei.sys.behavior.pressed-feedback'], { $value: 1, reason: 'How this product behaves.' });
  assert.equal((await css(scope, '--tanrei-sys-behavior-pressed-feedback')).trim(), 'ripple');
  assert.equal((await pressAndLook(filled)).ripple, true, 'the real <tanrei-button> grows a ripple');

  await behaviour.locator('[data-behavior="pressed-feedback"]').evaluate((el) => el.focus());
  await page.keyboard.press('ArrowRight');
  await saved((layer) => layer.tokens['tanrei.sys.behavior.pressed-feedback']?.$value === 2, 'dim');
  // Under the default system every pressed opacity is 1. What is said next to the control is the BUILD's warning
  // (checkInvariants), word for word — the same line the accessibility panel lists — with the way to the token.
  const hint = behaviour.locator('[data-behavior-hint="pressed-feedback"]');
  await until(() => hint.isVisible(), 'the hint');
  const warnings = await page.evaluate(() => window.tanreiStudio.getWarnings());
  const warning = warnings.find((line) => line.startsWith('sys.behavior.pressed-feedback '));
  assert.match(warning, /a press would show nothing/);
  assert.equal((await hint.textContent()).replace(/(?<![\w.-])comp\./g, 'tanrei.comp.'), warning, 'the hint IS the warning (token ids shown short, as everywhere)');
  assert.ok(!(await behaviour.locator('[data-behavior-hint="focus-style"]').isVisible()), 'focus-style: nothing to say');
  assert.deepEqual(await behaviour.locator('[data-behavior-row]').evaluateAll((els) => els.map((el) => el.dataset.behaviorRow)), ['pressed-feedback', 'focus-style', 'separation', 'link-underline', 'requirement-mark', 'divider-visibility', 'scroll-edge', 'appearance'], 'every sys.behavior choice has a row (the gap-or-divider choice is the third; a text link’s underline the fourth; what marks a scrolling box’s edge the seventh; how a surface appears the last); corner smoothing is an amount under Shape, not a choice here');
  const flat = await pressAndLook(filled);
  assert.deepEqual([flat.pressed, flat.opacity], ['dim', '1']);
  // The token it names is a link: Every token opens on it; lowering it there silences the hint.
  await hint.locator('tanrei-button', { hasText: 'comp.button.pressed.opacity' }).click();
  await page.waitForSelector('[data-editor="tanrei.comp.button.pressed.opacity"]');
  assert.equal(await page.evaluate(() => window.tanreiStudio.getState().inspect), 'tokens');
  assert.equal(await page.evaluate(() => window.tanreiStudio.applyOperation('tanrei.comp.button.pressed.opacity', { $value: 0.6, reason: 'Dim on press, like our native apps.' })), null);
  await section('behavior');
  assert.ok(!(await hint.isVisible()), 'with a pressed opacity below 1 the build has nothing to warn about');
  const dim = await pressAndLook(filled);
  assert.deepEqual([dim.pressed, Number(dim.opacity)], ['dim', 0.6], 'dim: the whole control takes the pressed opacity');

  // focus-style
  const focusLook = async () => {
    await behaviour.locator('[data-group-reason=\"behavior\"] input').focus();
    await filled.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    return (await inner(filled)).evaluate((b) => ({ focused: b.matches(':focus-visible'), outlineColor: getComputedStyle(b).outlineColor, halo: getComputedStyle(b, '::after').boxShadow }));
  };
  await choose(behaviour.locator('[data-behavior="focus-style"]'), 'glow');
  await saved((layer) => layer.tokens['tanrei.sys.behavior.focus-style']?.$value === 1, 'glow');
  const glow = await focusLook();
  await choose(behaviour.locator('[data-behavior="focus-style"]'), 'ring');
  await saved((layer) => !layer.tokens['tanrei.sys.behavior.focus-style'], 'ring again: the entry goes');
  const ring = await focusLook();
  assert.ok(glow.focused && ring.focused);
  assert.match(glow.outlineColor, /rgba\(0, 0, 0, 0\)|transparent/, 'glow: the hard line is transparent');
  assert.notEqual(glow.halo, 'none', 'glow: a blurred halo is drawn');
  assert.ok(!/rgba\(0, 0, 0, 0\)|transparent/.test(ring.outlineColor) && ring.halo === 'none', `ring: a hard line, no halo — ${JSON.stringify(ring)}`);
});

studioTest('Shape: corner smoothing is a slider, 0–1 with Figma’s meaning; the amount reaches the sheet and the preview’s real button', {}, async ({ page, section, saved, onDisk, css, scope, lightPane }) => {
  await section('smoothing');
  const shape = page.locator('[data-panel="shape"]');
  const slider = shape.locator('[data-corner-smoothing]');
  assert.equal(await slider.evaluate((el) => el.localName), 'tanrei-slider');
  assert.deepEqual(await slider.evaluate((el) => [el.min, el.max, el.step, el.value]), [0, 1, 0.05, 0]);
  assert.match(await shape.locator('[data-shape-hint="corner-smoothing"]').textContent(), /0\.6 is the iOS corner/);
  assert.equal((await css(scope, '--tanrei-sys-shape-corner-smoothing')).trim(), '0');
  assert.ok(!(await shape.locator('[data-reset-shape]').isVisible()), 'inherited: nothing to reset');

  // The keyboard moves it a step at a time; the file holds the amount with the group's reason.
  await slider.locator('[role="slider"]').focus();
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('ArrowRight');
  await saved((layer) => layer.tokens?.['tanrei.sys.shape.corner-smoothing']?.$value === 0.6, 'iOS corner');
  assert.deepEqual(onDisk().tokens['tanrei.sys.shape.corner-smoothing'], { $value: 0.6, reason: 'How this product rounds its corners.' });
  assert.equal((await css(scope, '--tanrei-sys-shape-corner-smoothing')).trim(), '0.6');
  // The real <tanrei-button> reads the amount (BTN-10): where the browser has `corner-shape`, it is no longer a plain round corner.
  const filled = lightPane.locator('tanrei-button[variant="filled"]').first();
  const cornerShape = await filled.evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('button')).getPropertyValue('corner-shape'));
  if (await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(1)'))) assert.match(cornerShape, /superellipse|squircle/, `the button eases its corners (${cornerShape})`);

  // The number field, the reason, reset.
  const number = shape.locator('tanrei-number-field input');
  await number.fill('1');
  await number.press('Enter');
  await saved((layer) => layer.tokens['tanrei.sys.shape.corner-smoothing']?.$value === 1, 'the most eased');
  await shape.locator('[data-group-reason=\"shape\"] input').fill('Our brand rounds like iOS.');
  await saved((layer) => layer.tokens['tanrei.sys.shape.corner-smoothing'].reason === 'Our brand rounds like iOS.', 'reason');
  await number.fill('1.5');
  await number.press('Enter');
  await page.waitForTimeout(300);
  assert.equal(onDisk().tokens['tanrei.sys.shape.corner-smoothing'].$value, 1, 'clamped to 1');
  await shape.locator('[data-reset-shape]').click();
  await saved((layer) => !layer.tokens, 'reset: nothing of the group is left');
  assert.equal(await slider.evaluate((el) => el.value), 0);
});

studioTest('Emphasized: the typography sample draws each role at its weight plus its family’s step, live from the sheet', {}, async ({ page, css, lightPane }) => {
  const heading = lightPane.locator('[data-sample="heading-1"]');
  const label = lightPane.locator('[data-sample="label"]');
  const body = lightPane.locator('[data-sample="body"]');
  assert.deepEqual(await Promise.all([heading, body, label].map((el) => css(el, 'font-weight'))), ['500', '400', '500']);
  const toggle = page.locator('[data-emphasized-toggle]');
  await toggle.click();
  assert.equal(await toggle.locator('input').isChecked(), true);
  assert.deepEqual(await Promise.all([heading, body, label].map((el) => css(el, 'font-weight'))), ['600', '500', '600'], 'the default system adds 100 to every family');
  // The step is a token: edited anywhere, the emphasized sample follows without a redraw.
  assert.equal(await page.evaluate(() => window.tanreiStudio.applyOperation('tanrei.sys.typescale.emphasis.heading', { $value: 300, reason: 'Our headings jump a whole class when stressed.' })), null);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-scope] [data-sample="heading-1"]')).fontWeight === '800');
  assert.equal(await css(label, 'font-weight'), '600', 'the label family keeps its own step');
  await toggle.click();
  assert.equal(await toggle.locator('input').isChecked(), false);
  assert.deepEqual(await Promise.all([heading, body, label].map((el) => css(el, 'font-weight'))), ['500', '400', '500']);
});
