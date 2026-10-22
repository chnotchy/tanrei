// The press, tested once over the controls that take it (`PressController`, src/primitives/press.ts) and the rules that
// keep their text from selection: a press is never a selection of the control's text nor the start of a drag of it.
//
// WebKit reads `-webkit-user-select` and not `user-select`, and takes a press held on a selection of the page that
// reaches across a control for a drag of the selected text: the page then gets no pointerup, no pointercancel and no
// mouseup, and the control stays pressed. The menu's and the main action button's own tests (MNU-15, MAB-8) hold the
// same for them; what the browser offers to drag by itself — a link's address — is held by the links' tests (MNU-53,
// BRC-22). `test/user-select.test.mjs` holds that every rule in the sources writes both names.
import { expect, test } from '@playwright/test';
import { loadSpec, mountFixtures, rootTokens } from '../../test/harness.js';
import { expectKeyPressOutlastsPointer } from '../../test/key-press-pointer-leaves.js';

/** A component, the fixture that draws it, the element in it that is pressed and kept from selection, and the behaviour id of its pressed state. */
const SUBJECTS: readonly (readonly [component: string, fixture: string, pressed: string, id: string])[] = [
  ['button', 'filled-medium', 'button', 'BTN-8'],
  ['chip', 'action-outlined', '.container', 'CHP-8'],
  ['segmented-button', 'single', '.container', 'SEG-9'],
  ['stepper', 'pressable-visited', 'button.container', 'SPR-14'],
  ['button-with-menu', 'filled-medium', 'button', 'SPB-9'],
  ['fab-menu', 'filled-closed', '.toggle', 'FBM-8'],
  ['snackbar', 'action', '.control', 'SNK-5'],
  ['file-item', 'row-interactive', '.body.pressable', 'FIT-15'],
  ['file-item', 'row', '.action', 'FIT-15'],
  ['search', 'trigger', '.trigger', 'SRC-19'],
  ['navigation-bar', 'four-destinations', '.cell', 'NVB-8'],
  ['navigation-drawer', 'standard', '.cell', 'NVD-8'],
  ['list', 'interactive', '.row.p', 'LST-12'],
  ['checkbox', 'unselected', '.root', 'CHK-9'],
  ['radio-button', 'unselected', '.root', 'RAD-11'],
  ['switch', 'unselected', '.root', 'SWT-7'],
  ['tabs', 'primary', '.tab', 'TAB-8'],
  ['card', 'outlined-interactive', '.container', 'CRD-8'],
];

/** Longer than an engine waits before it takes a held press for a drag of the selected text. */
const HELD = 400;

for (const [component, fixture, pressed, id] of SUBJECTS) {
  test(`${id}: a press on ${component}'s ${pressed} is never a selection of its text nor the start of a drag — kept from selection under both names, and a press held on it inside a selection of the page that reaches across it ends with the pointer`, async ({ page }) => {
    const spec = loadSpec(component);
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === fixture) });
    const stage = page.locator(`[data-fixture="${fixture}"]`);
    const target = stage.locator(pressed).first();
    await stage.evaluate((el) => {
      el.insertAdjacentHTML('beforebegin', '<p id="before">Text before the control</p>');
      el.insertAdjacentHTML('afterend', '<p id="after">Text after the control</p>');
      const seen: string[] = ((window as any).seen = []);
      for (const type of ['pointerdown', 'pointerup', 'pointercancel']) window.addEventListener(type, () => seen.push(type), true);
      // The drag an engine would begin, had the control not refused it.
      window.addEventListener('dragstart', (event) => seen.push(event.defaultPrevented ? 'dragstart:refused' : 'dragstart'));
    });
    // Safari reads the prefixed name only; the other engines the standard one.
    expect(await target.evaluate((el) => ((style) => [(style as any).webkitUserSelect ?? 'none', style.userSelect ?? 'none'])(getComputedStyle(el)))).toEqual(['none', 'none']);
    // A selection of the page that reaches across the control, from the text before it to the text after it.
    await page.evaluate(() => {
      const range = document.createRange();
      range.setStart(document.getElementById('before')!.firstChild!, 0);
      range.setEnd(document.getElementById('after')!.firstChild!, 4);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
    });
    await page.locator('#after').scrollIntoViewIfNeeded();
    // A press held on the control inside that selection, then moved off it, is a press: it ends where the pointer ends it.
    await target.hover();
    await page.mouse.down();
    await expect(stage.locator('[data-pressed]')).toHaveCount(1);
    await page.waitForTimeout(HELD);
    await page.mouse.move(0, 0, { steps: 4 });
    await page.mouse.up();
    await expect(stage.locator('[data-pressed]')).toHaveCount(0);
    // The pointer's own end reached the page: its pointerup — or, where the engine began a drag at a part of the control
    // that is not the pressed element (a selection control's label, in Chromium and Firefox), the pointercancel it sends
    // with the drag. WebKit sent neither after a drag began, and the control stayed pressed.
    expect((await page.evaluate(() => (window as any).seen.join(' '))).replace(' dragstart:refused', '')).toMatch(/^pointerdown (pointerup|dragstart pointercancel)$/);
  });
}

// A press by a key is the key's: a pointer that rests over the control and leaves it — the mouse moved, or the control
// moved out from under it — ends no press it did not make. The key's press lasts until its keyup, as the platform's
// own button keeps `:active` under Space held wherever the pointer goes (test/key-press-pointer-leaves.ts).
for (const [component, fixture, pressed, id] of SUBJECTS) {
  test(`${id}: a press of ${component}'s ${pressed} by Space is kept while the key is down, though the pointer resting over it leaves`, async ({ page }) => {
    const spec = loadSpec(component);
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === fixture) });
    await expectKeyPressOutlastsPointer(page, { control: page.locator(`[data-fixture="${fixture}"]`).locator(pressed).first() });
  });
}

// And the other way round: a key that goes down and up while the pointer holds the control down ends no press of the
// pointer's, which ends where the pointer ends it.
test('BTN-8: a press held by the pointer is kept while Space goes down and up on the control, and ends with the pointer', async ({ page }) => {
  const spec = loadSpec('button');
  await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'filled-medium') });
  await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '0ms' });
  const button = page.locator('[data-fixture="filled-medium"] button').first();
  await button.focus();
  await button.hover();
  await page.mouse.down();
  await expect(button).toHaveAttribute('data-pressed');
  await page.keyboard.down(' ');
  await page.keyboard.up(' ');
  expect(await button.getAttribute('data-pressed'), 'the key that came up ended no press of the pointer, which is still down').not.toBeNull();
  await page.mouse.up();
  await expect(button).not.toHaveAttribute('data-pressed');
});
