// <tanrei-color-field>, driven by specs/color-field.spec.json: a composed element — a Field around one color
// input. What a composed element is, is held once for every such element by src/primitives/composed.test.ts (W13-1 to
// W13-8: declarations, passing, parts, events and the value, the form, focus, the twins — each of the thirty-nine
// fixtures the same pixels and the same control as the Field's fixture `color-<id>` — and reports). The members' own
// sentences are the members' tests (color-input.test.ts, CLI-1 to CLI-44; field.test.ts, FLD-1 to FLD-28). This file
// holds what the color field's own sentences add, CLF-43 to CLF-47, and repeats no test of a member.
// CLF-48: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { loadSpec, missingWords, mountFixtures, setWords, tab } from '../../../test/harness.js';

const spec = loadSpec('color-field');
type P = Page;
const TAG = 'tanrei-color-field';
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const one = (page: P, id: string) => page.locator(`#${id}`);
/** The members, in an element's shadow root. */
const field = (element: Locator) => element.locator('tanrei-field');
const box = (element: Locator) => element.locator('tanrei-color-input');
/** What takes the typing: the native text element. */
const typing = (element: Locator) => box(element).locator('.input');
const pickerButton = (element: Locator) => box(element).locator('.picker-button');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const read = (file: string) => fs.readFileSync(new URL(`../../../dist/${file}`, import.meta.url), 'utf8');
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** A page of the product's own markup, with the default system and every element; every element has updated. */
async function mountHtml(page: P, body: string) {
  const sheets = `${read('tokens.css')}${read('icons.css')}`;
  await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8" /><style>${sheets} body { margin: 16px; }</style></head><body>${body}<script type="module">${read('tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
  await settle(page);
}
const settle = (page: P) =>
  page.evaluate(async () => {
    const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
  });
/** The focused element at each level: the document's, then each shadow root's inside it. */
const focusPath = (page: P) =>
  page.evaluate(() => {
    const path: string[] = [];
    for (let at: Element | null = document.activeElement; at; at = at.shadowRoot?.activeElement ?? null) path.push(at.localName + (at.id ? `#${at.id}` : '') + (at.classList.length ? `.${at.classList[0]}` : ''));
    return path;
  });
const blurAll = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement as HTMLElement | null;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement as HTMLElement;
    active?.blur();
  });
const pressAt = async (target: Locator, at: 'centre' | 'start' = 'centre') => {
  const b = await bounds(target);
  await target.page().mouse.click(at === 'centre' ? b.x + b.width / 2 : b.x + 2, b.y + b.height / 2);
};
/** Records the four events on an element, in order, with the element's value when each is heard and the event's target. */
const listen = (element: Locator) =>
  element.evaluate((el) => {
    const w = window as unknown as { __events: string[] };
    w.__events = [];
    for (const type of ['input', 'change', 'pickerrequest', 'entryerror']) {
      el.addEventListener(type, (event) => {
        const detail = (event as CustomEvent<{ text?: string; message?: string; value?: string } | null>).detail;
        const said = type === 'entryerror' ? ` ${detail!.text}|${detail!.message}` : type === 'pickerrequest' ? ` ${detail!.value}` : '';
        w.__events.push(`${type} ${(el as HTMLElement & { value: string }).value}${said}${event.target === el ? '' : ' (another target)'}`);
      });
    }
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
/** The browser's own picker is not opened by a test: what it was asked to show is recorded in its place. */
const stubPicker = (page: P) =>
  page.evaluate(() => {
    const w = window as unknown as { __shown: string[] };
    w.__shown = [];
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', { configurable: true, writable: true, value(this: HTMLInputElement) { w.__shown.push(`${this.type} ${this.value}`); } });
  });
const shown = (page: P) => page.evaluate(() => (window as unknown as { __shown: string[] }).__shown.splice(0));

test.describe('behavior', () => {
  test('CLF-43: it is a Field that frames one color input, and nothing else — its shadow root holds the two members’ own elements, each prop is on the member it is from and the input’s own label, labelHidden, error and disabled are never set; the label-icon slot is held for its Field; it draws no part, holds no state and writes no custom property of its own', async ({ page }) => {
    await mountHtml(
      page,
      `<${TAG} id="plain" label="Brand color" label-hidden error disabled supporting-text="Help." error-text="Too light." required required-mark="tag" required-text="Required" optional-text="Optional" variant="outlined" size="large" value="#0f766e" invalid-text="Not a color." picker picker-label="Choose color">
         <span slot="label-icon">format_paint</span>
       </${TAG}>
       <${TAG} id="bare" label="Brand color"></${TAG}>`,
    );
    const built = await one(page, 'plain').evaluate((el) => {
      const root = el.shadowRoot!;
      // An element, or text that is not white space (the template's own markers are comments).
      const drawn = (node: Node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim());
      const [frame] = root.children;
      const control = [...frame!.children].filter((child) => child.localName !== 'slot');
      const input = control[0] as HTMLElement & Record<string, unknown>;
      const framing = frame as HTMLElement & Record<string, unknown>;
      return {
        root: [...root.childNodes].filter(drawn).map((node) => (node as Element).localName ?? '#text'),
        inFrame: [...frame!.childNodes].filter(drawn).map((node) => ((node as Element).localName === 'slot' ? `slot ${(node as HTMLSlotElement).name} → ${(node as Element).slot}` : ((node as Element).localName ?? '#text'))),
        inInput: input.childNodes.length,
        parts: [frame!.getAttribute('part'), input.getAttribute('part')],
        onField: ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'disabled', 'required', 'optional', 'requiredMark', 'requiredText', 'optionalText'].map((name) => framing[name]),
        onInput: ['variant', 'size', 'value', 'invalidText', 'picker', 'pickerLabel'].map((name) => input[name]),
        neverSet: [input.label, input.labelHidden, input.error, input.disabled, input.hasAttribute('label'), input.hasAttribute('disabled'), input.name],
        written: [...(el as HTMLElement).style].concat([...framing.style], [...input.style]).filter((name) => name.startsWith('--')),
        role: [el.getAttribute('role'), el.getAttribute('tabindex'), root.delegatesFocus],
      };
    });
    expect(built).toEqual({
      root: ['tanrei-field'],
      inFrame: ['slot label-icon → label-icon', 'tanrei-color-input'],
      inInput: 0,
      parts: ['field', 'color-input'],
      onField: ['Brand color', true, 'Help.', 'Too light.', true, true, true, false, 'tag', 'Required', 'Optional'],
      onInput: ['outlined', 'large', '#0f766e', 'Not a color.', true, 'Choose color'],
      neverSet: ['', false, false, false, false, false, ''],
      written: [],
      role: [null, null, false],
    });
    // The slot is passed on only while the element has a child for it: a Field with no glyph draws no room for one.
    expect(await one(page, 'bare').evaluate((el) => el.shadowRoot!.querySelectorAll('slot').length)).toBe(0);
    // It has no state and no prop of its own: seventeen properties, each a member's (and the form's `name`).
    expect(await one(page, 'bare').evaluate((el) => [...(el.constructor as unknown as { elementProperties: Map<string, unknown> }).elementProperties.keys()].sort())).toEqual(
      ['disabled', 'error', 'errorText', 'formDisabled', 'invalidText', 'label', 'labelHidden', 'name', 'optional', 'optionalText', 'picker', 'pickerLabel', 'required', 'requiredMark', 'requiredText', 'size', 'supportingText', 'value', 'variant'],
    );
  });

  test('CLF-43: it is as wide as the place it stands in and its color input fills it — a block with no width of its own, in every look; and it is as tall as its rows and its box together', async ({ page }) => {
    await mountHtml(
      page,
      `<div style="inline-size: 420px"><${TAG} id="wide" label="Brand color"></${TAG}></div>
       <div style="inline-size: 137px"><${TAG} id="narrow" label="Brand color" variant="outlined" value="#0f766e" picker picker-label="Choose color" supporting-text="Help that is longer than the place it stands in."></${TAG}></div>
       <div style="display: flex; gap: 8px; inline-size: 500px"><${TAG} id="a" label="First" style="flex: 1"></${TAG}><${TAG} id="b" label="Second" style="flex: 1"></${TAG}></div>
       <p id="prose">Before <${TAG} id="inline" label="In a line of text"></${TAG}> after</p>`,
    );
    for (const [id, width] of [['wide', 420], ['narrow', 137], ['a', 246], ['b', 246]] as const) {
      expect(await css(one(page, id), 'display'), id).toBe('block');
      expect((await bounds(one(page, id))).width, `${id}: as wide as its place`).toBeCloseTo(width, 1);
      expect((await bounds(field(one(page, id)))).width, `${id}: the Field`).toBeCloseTo(width, 1);
      expect((await bounds(box(one(page, id)))).width, `${id}: the input fills it`).toBeCloseTo(width, 1);
      expect((await bounds(box(one(page, id)).locator('.field > .container'))).width, `${id}: the box`).toBeCloseTo(width, 1);
    }
    // In a line of text it is still a block: it takes the paragraph's width.
    const [prose, inline] = [await bounds(page.locator('#prose')), await bounds(one(page, 'inline'))];
    expect(inline.width).toBeCloseTo(prose.width, 1);
    // As tall as its rows and its box together, and no more.
    const narrow = one(page, 'narrow');
    const rows = await bounds(field(narrow).locator('.supporting'));
    const whole = await bounds(narrow);
    expect(whole.y + whole.height).toBeCloseTo(rows.y + rows.height, 1);
  });

  test('CLF-43: what it shows is what the pair does — the Field’s label row and requirement mark above a stacked box; in a floating look no label row, the name floated in the box with the Field’s asterisk; the supporting row from the value’s text, after the swatch; an error on the box and in the row; and the entry error of a text that is not a color shown with the input’s words in the Field’s row, the event carrying those words alone', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => ['stacked-required', 'outlined-required', 'stacked-supporting', 'stacked-error', 'stacked-label-hidden', 'stacked-label-icon'].includes(f.id)) });
    // Stacked: the label and the tag are the Field's (FLD-2, FLD-5); the input draws none.
    const stacked = host(page, 'stacked-required');
    await expect(field(stacked).locator('.label-row > .label')).toHaveText(/^Brand color\*?$/);
    await expect(field(stacked).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Required');
    await expect(box(stacked).locator('.floating')).toHaveCount(0);
    await expect(typing(stacked)).toHaveAttribute('aria-required', 'true');
    // Floating: the Field leaves its row out, and the input floats the name with the asterisk the Field gives (FLD-25, CLI-15, CLI-7).
    const floating = host(page, 'outlined-required');
    await expect(field(floating).locator('.label-row')).toHaveCount(0);
    await expect(box(floating).locator('.floating')).toHaveText('Brand color*');
    await expect(typing(floating)).toHaveAttribute('aria-required', 'true');
    // A hidden label: neither draws one, and the name stays.
    const hidden = host(page, 'stacked-label-hidden');
    await expect(field(hidden).locator('.label-row')).toHaveCount(0);
    await expect(hidden.getByRole('textbox', { name: 'Brand color', exact: true })).toHaveCount(1);
    // The glyph of the label is drawn by the Field.
    await expect(field(host(page, 'stacked-label-icon')).locator('.label-row > .label-icon')).toBeVisible();
    // The error: the box is marked and the words are the Field's row and the input's description (FLD-7, FLD-8, CLI-9).
    const wrong = host(page, 'stacked-error');
    await expect(box(wrong).locator('.field')).toHaveAttribute('data-error', '');
    await expect(field(wrong).locator('.error-text')).toHaveText('Too light for white text. Choose a darker color.');
    await expect(wrong.getByRole('textbox')).toHaveAccessibleDescription('Too light for white text. Choose a darker color.');
    // The supporting row starts where the value's text starts — past the swatch (FLD-26, CLI-43).
    const helped = host(page, 'stacked-supporting');
    expect((await bounds(field(helped).locator('.supporting-text'))).x).toBeCloseTo((await bounds(typing(helped))).x, 1);
    expect((await bounds(field(helped).locator('.supporting-text'))).x).toBeGreaterThan((await bounds(box(helped).locator('.swatch'))).x + (await bounds(box(helped).locator('.swatch'))).width);
    // A text that is not a color, committed: the input's words in the Field's row, in its error condition (FLD-28,
    // CLI-20) — the event carries invalidText, not the shown text — until the next edit.
    await mountHtml(
      page,
      `<${TAG} id="brand" style="inline-size: 280px" label="Brand color" supporting-text="Six hexadecimal digits." error-text="Check this color." invalid-text="Enter six hexadecimal digits."></${TAG}>
       <${TAG} id="fallback" style="inline-size: 280px" label="Accent color" supporting-text="Six hexadecimal digits." error-text="Check this color."></${TAG}>`,
    );
    for (const [id, words, carried] of [['brand', 'Enter six hexadecimal digits.', 'Enter six hexadecimal digits.'], ['fallback', 'Check this color.', '']] as const) {
      const element = one(page, id);
      await listen(element);
      await typing(element).focus();
      await page.keyboard.type('#0f76e');
      await blurAll(page);
      await expect(field(element).locator('.error-text')).toHaveText(words);
      await expect(field(element).locator('.supporting-text'), 'the error text stands in the help’s place (FLD-7)').toHaveCount(0);
      await expect(field(element).locator('.frame')).toHaveAttribute('data-error', '');
      await expect(typing(element)).toHaveAttribute('aria-invalid', 'true');
      expect(await heard(page), id).toEqual([`entryerror  #0f76e|${carried}`]);
      expect(await element.evaluate((el) => [(el as HTMLElement & { error: boolean }).error, (el as HTMLElement & { value: string }).value]), 'error stays the product’s').toEqual([false, '']);
      await typing(element).focus();
      await page.keyboard.press('End');
      await page.keyboard.type('6');
      await expect(field(element).locator('.error-text')).toHaveCount(0);
      await expect(field(element).locator('.supporting-text')).toHaveText('Six hexadecimal digits.');
      await expect(field(element).locator('.frame')).not.toHaveAttribute('data-error', /.*/);
      // Left empty, so that leaving it for the next one commits nothing.
      await typing(element).fill('');
      await blurAll(page);
    }
  });

  test('CLF-43: its value is at every moment the value its color input holds — a color set in capitals or without its number sign is read back in the value’s own form and a text that is not a color as empty, with no event; its color input’s four events are its own, each once, with the element as their target and the value already new; pickerrequest stays cancelable from outside', async ({ page }) => {
    await mountHtml(page, `<div id="around"><${TAG} id="brand" name="brand" label="Brand color" value="0F766E" picker picker-label="Choose color" invalid-text="Not a color."></${TAG}></div>`);
    await stubPicker(page);
    const brand = one(page, 'brand');
    const value = () => brand.evaluate((el) => (el as HTMLElement & { value: string }).value);
    // The attribute's value, in the value's own form.
    expect(await value()).toBe('#0f766e');
    await listen(brand);
    // Set by the product: read back changed, and nothing is said.
    for (const [given, kept] of [['ABCDEF', '#abcdef'], [' #FDE047 ', '#fde047'], ['teal', ''], ['#123456', '#123456'], ['', '']] as const) {
      const atOnce = await brand.evaluate((el, v) => (((el as HTMLElement & { value: string }).value = v), (el as HTMLElement & { value: string }).value), given);
      expect(atOnce, `"${given}" until its input has taken it`).toBe(given);
      await settle(page);
      expect(await value(), `"${given}" as its input holds it`).toBe(kept);
      expect(await typing(brand).inputValue(), `"${given}": the text`).toBe(kept);
    }
    expect(await heard(page), 'no event for a value the product set').toEqual([]);
    // The input's events are its own: once each, from the element, with the value already new — in a capturing listener of an ancestor too.
    await page.evaluate(() => {
      const w = window as unknown as { __captured: string[] };
      w.__captured = [];
      for (const type of ['input', 'change']) document.querySelector('#around')!.addEventListener(type, (event) => w.__captured.push(`${type} ${(event.target as HTMLElement & { value: string }).value}`), true);
    });
    // (One edit that changes the value: a paste. An edit that leaves the value as it was is heard by no listener on
    // the element — color-input.test.ts, CLI-17.)
    await typing(brand).focus();
    await page.keyboard.insertText('0f766e');
    await blurAll(page);
    expect(await heard(page)).toEqual(['input #0f766e', 'change #0f766e']);
    expect(await page.evaluate(() => (window as unknown as { __captured: string[] }).__captured)).toEqual(['input #0f766e', 'change #0f766e']);
    await typing(brand).focus();
    await page.keyboard.type('x');
    await blurAll(page);
    expect(await heard(page)).toEqual(['input ', 'entryerror  #0f766ex|Not a color.', 'change ']);
    // The picker button asks once, through the element; uncancelled, the input presents the browser's picker itself.
    await brand.evaluate((el) => ((el as HTMLElement & { value: string }).value = '#0f766e'));
    await settle(page);
    await pickerButton(brand).click();
    expect([await heard(page), await shown(page)]).toEqual([['pickerrequest #0f766e #0f766e'], ['color #0f766e']]);
    // Cancelled from outside: no picker, and focus stays on the picker button, inside the color field.
    await brand.evaluate((el) => el.addEventListener('pickerrequest', (event) => event.preventDefault()));
    await pickerButton(brand).locator('button').focus();
    await page.keyboard.press('Enter');
    expect([await heard(page), await shown(page)]).toEqual([['pickerrequest #0f766e #0f766e'], []]);
    expect((await focusPath(page)).slice(0, 3)).toEqual(['tanrei-color-field#brand', 'tanrei-color-input', 'tanrei-button.picker-button']);
    // A pick the browser's picker reports is the input's edit, and the color field's value at once.
    await box(brand).locator('.native-picker').evaluate((el) => {
      (el as HTMLInputElement).value = '#ff0000';
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    expect([await value(), await heard(page)]).toEqual(['#ff0000', ['input #ff0000']]);
  });

  test('CLF-44: in a form it is the one control the form sees — its name, its color input’s value in the value’s own form, reset to the value it was first given and restored, left out while disabled or in a disabled fieldset — and it reports exactly what its color input reports: a missing value while required and empty, a bad input while a committed text is not a color; the action key asks the color field’s own form; its members take no part in the form', async ({ page }) => {
    await mountHtml(
      page,
      `<form id="form">
         <${TAG} id="brand" name="brand" label="Brand color" required value="0F766E" invalid-text="Sechs Hexadezimalziffern."></${TAG}>
         <fieldset id="set"><${TAG} id="accent" name="accent" label="Accent color" value="#fde047"></${TAG}></fieldset>
         <${TAG} id="off" name="off" label="Off" value="#000000" disabled></${TAG}>
         <${TAG} id="none" name="none" label="None"></${TAG}>
         <button id="send" name="via" value="button">Send</button>
       </form>
       <script>window.submitted = []; document.getElementById('form').addEventListener('submit', (event) => { event.preventDefault(); window.submitted.push([...new FormData(event.target, event.submitter).entries()].map(([k, v]) => k + '=' + v).join('&')); });</script>`,
    );
    const form = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([key, value]) => `${key}=${String(value)}`));
    const brand = one(page, 'brand');
    const validity = (element: Locator) =>
      element.evaluate((el) => {
        const control = el as HTMLElement & { validity: ValidityState; validationMessage: string };
        return { valid: control.validity.valid, missing: control.validity.valueMissing, bad: control.validity.badInput, message: control.validationMessage };
      });
    // One entry under each name, the color in the value's own form; a disabled one none; an empty one an empty string.
    expect(await form()).toEqual(['brand=#0f766e', 'accent=#fde047', 'none=']);
    expect(await page.evaluate(() => [...(document.querySelector('form') as HTMLFormElement).elements].map((el) => el.id))).toEqual(['brand', 'set', 'accent', 'off', 'none', 'send']);
    expect(await brand.evaluate((el) => [...el.shadowRoot!.querySelectorAll('tanrei-field, tanrei-color-input')].map((member) => [(member as HTMLElement & { form?: unknown }).form ?? null, (member as HTMLElement & { name?: string }).name || null]))).toEqual([[null, null], [null, null]]);
    expect(await brand.evaluate((el) => [(el.constructor as unknown as { formAssociated: boolean }).formAssociated, (el as HTMLElement & { form: HTMLFormElement | null }).form?.id, (el as HTMLElement & { willValidate: boolean }).willValidate])).toEqual([true, 'form', true]);
    // An edit is the form's at once; then reset: back to the value attribute, in the value's own form.
    await typing(brand).fill('ABCDEF');
    expect((await form())[0]).toBe('brand=#abcdef');
    await page.evaluate(() => document.querySelector('form')!.reset());
    await settle(page);
    expect([(await form())[0], await typing(brand).inputValue()]).toEqual(['brand=#0f766e', '#0f766e']);
    // A reset to the value it holds already still returns the text: what was typed and its entry error go.
    const none = one(page, 'none');
    await typing(none).fill('teal');
    await blurAll(page);
    await expect(typing(none)).toHaveAttribute('aria-invalid', 'true');
    await page.evaluate(() => document.querySelector('form')!.reset());
    await settle(page);
    expect([await typing(none).inputValue(), await typing(none).getAttribute('aria-invalid'), await none.evaluate((el) => (el as HTMLElement & { value: string }).value), await typing(brand).inputValue()]).toEqual(['', null, '', '#0f766e']);
    // Restored on navigation: passed on to the input, whose value is then the color field's.
    await brand.evaluate((el) => (el as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('#123456', 'restore'));
    await settle(page);
    expect([await brand.evaluate((el) => (el as HTMLElement & { value: string }).value), await typing(brand).inputValue(), (await form())[0]]).toEqual(['#123456', '#123456', 'brand=#123456']);
    expect(await validity(brand)).toMatchObject({ valid: true });
    // A committed text that is not a color: badInput — and, required with no value, valueMissing — with the input's words.
    await typing(brand).fill('gelb');
    await blurAll(page);
    await settle(page);
    expect(await validity(brand)).toEqual({ valid: false, missing: true, bad: true, message: 'Sechs Hexadezimalziffern.' });
    expect((await form())[0]).toBe('brand=');
    // Required and empty: a missing value, reported on the color field, and the report focuses its input — never the picker button.
    await typing(brand).fill('');
    await blurAll(page);
    await settle(page);
    const missing = await validity(brand);
    expect([missing.valid, missing.missing, missing.bad, missing.message !== '']).toEqual([false, true, false, true]);
    expect(await brand.evaluate((el) => (el as HTMLElement & { reportValidity(): boolean }).reportValidity())).toBe(false);
    expect((await focusPath(page)).slice(0, 3)).toEqual(['tanrei-color-field#brand', 'tanrei-color-input', 'input#input.input']);
    await page.locator('#send').click();
    expect(await page.evaluate(() => (window as unknown as { submitted: string[] }).submitted)).toEqual([]);
    expect(await brand.evaluate((el) => (el as HTMLElement & { error: boolean }).error), 'it never sets error').toBe(false);
    // The action key in the input asks the color field's own form, through its default button (CLI-19, BTN-30).
    await typing(brand).fill('0f766e');
    await typing(brand).press('Enter');
    expect(await page.evaluate(() => (window as unknown as { submitted: string[] }).submitted)).toEqual(['brand=#0f766e&accent=#fde047&none=&via=button']);
    // A disabled fieldset: the color field is left out and its Field drawn disabled, the label with it; then back.
    const accent = one(page, 'accent');
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = true));
    await settle(page);
    await expect(typing(accent)).toBeDisabled();
    await expect(field(accent).locator('.frame')).toHaveAttribute('data-disabled', '');
    expect([await form(), await accent.evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled)]).toEqual([['brand=#0f766e', 'none='], false]);
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = false));
    await settle(page);
    await expect(typing(accent)).toBeEnabled();
    // Its own disabled, unset by the property: enabled again, and submitted.
    await one(page, 'off').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await settle(page);
    await expect(typing(one(page, 'off'))).toBeEnabled();
    expect(await form()).toEqual(['brand=#0f766e', 'accent=#fde047', 'off=#000000', 'none=']);
  });

  test('CLF-45: focus given to it goes to the input of its color input, never to the picker button — by the product, by a press on the label row, on the box, on the swatch or on a floating label, and by a page’s own label; a press on the help or on the gap between a row and the box does nothing; it adds no stop: the stops inside it are its input’s, the input and then the picker button; while focus is anywhere inside it, the picker button included, its Field draws its focused tokens, and the box takes its own only while its input has focus; when a picker the input presented closes, focus is on the picker button, inside it', async ({ page }) => {
    await mountHtml(
      page,
      `<button id="before">Before</button>
       <label id="outside" for="plain">A label of the page</label>
       <${TAG} id="plain" style="inline-size: 320px" label="Brand color" supporting-text="Six hexadecimal digits." value="#0f766e" required required-text="Required" picker picker-label="Choose color"><span slot="label-icon">format_paint</span></${TAG}>
       <${TAG} id="floating" style="inline-size: 320px; margin-block-start: 24px" variant="outlined" label="Accent color" error error-text="Too light."></${TAG}>
       <button id="after">After</button>`,
    );
    await stubPicker(page);
    const plain = one(page, 'plain');
    const focused = async () => (await focusPath(page)).join(' > ');
    const inInput = 'tanrei-color-field#plain > tanrei-color-input > input#input.input';
    const onButton = 'tanrei-color-field#plain > tanrei-color-input > tanrei-button.picker-button > button.has-icon';
    // By the product: the input, never the picker button.
    await plain.evaluate((el: HTMLElement) => el.focus());
    expect(await focused()).toBe(inInput);
    expect(await plain.evaluate((el) => [el.matches(':focus-within'), el.tabIndex, el.shadowRoot!.delegatesFocus])).toEqual([true, -1, false]);
    await plain.evaluate((el: HTMLElement) => el.blur());
    expect(await focused()).toBe('body');
    // A press on the label row — the label, its glyph, the requirement mark — is the Field's (FLD-12); a page's own label too.
    for (const selector of ['.label-row > .label', '.label-row > .label-icon', '.label-row tanrei-tag']) {
      await blurAll(page);
      await pressAt(field(plain).locator(selector));
      expect(await focused(), selector).toBe(inInput);
    }
    await blurAll(page);
    await page.locator('#outside').click();
    expect(await focused(), 'a <label for> of the page').toBe(inInput);
    // A press on the box, and on a label that floats in it, is the input's (CLI-24).
    await blurAll(page);
    await pressAt(box(plain).locator('.field > .container'), 'start');
    expect(await focused(), 'the box').toBe(inInput);
    // With the picker button shown a press on the swatch is the button's: the picker, and no focus in the input (CLI-25).
    await blurAll(page);
    await shown(page);
    await pressAt(box(plain).locator('.swatch'), 'centre');
    expect(await shown(page), 'the swatch opens the picker').toEqual(['color #0f766e']);
    expect(await focused(), 'the swatch').not.toBe(inInput);
    await blurAll(page);
    await pressAt(box(one(page, 'floating')).locator('.floating'));
    expect(await focused()).toBe('tanrei-color-field#floating > tanrei-color-input > input#input.input');
    // A press on the help or the error text, and on the gap between a row and the box, does nothing: no focus arrives.
    for (const [element, selector] of [[plain, '.supporting-text'], [one(page, 'floating'), '.error-text']] as const) {
      await blurAll(page);
      await pressAt(field(element).locator(selector));
      expect(await focused(), `a press on ${selector}`).toBe('body');
    }
    const [container, row, label] = [await bounds(box(plain).locator('.field > .container')), await bounds(field(plain).locator('.supporting')), await bounds(field(plain).locator('.label-row'))];
    // The box's hit area reaches the minimum target beyond its drawn edges (TXI-8): a box shorter than the target (a
    // stacked box as tall as a Button) takes a press in that reach. A press in the gap beyond it does nothing.
    const reach = await box(plain).locator('.field > .container').evaluate((el) => Math.max(0, (Number.parseFloat(getComputedStyle(el, '::before').height) - el.getBoundingClientRect().height) / 2));
    const [bottom, top] = [container.y + container.height + reach, container.y - reach];
    expect(row.y - bottom, 'there is a gap below the box, beyond its hit area').toBeGreaterThan(1);
    await page.mouse.click(container.x + 20, (bottom + row.y) / 2);
    expect(await focused(), 'the gap between the box and the supporting row').toBe('body');
    expect(top - (label.y + label.height), 'there is a gap above the box, beyond its hit area').toBeGreaterThan(1);
    await page.mouse.click(container.x + 20, (label.y + label.height + top) / 2);
    expect(await focused(), 'the gap between the label row and the box').toBe('body');
    if (reach > 1) {
      await page.mouse.click(container.x + 20, container.y + container.height + reach / 2);
      expect(await focused(), 'a press in the hit area below the drawn box is the input\'s').toBe('tanrei-color-field#plain > tanrei-color-input > input#input.input');
      await blurAll(page);
    }
    // No stop of its own: Tab visits the input's stops in the input's order, and nothing else.
    await page.locator('#before').focus();
    const visited: string[] = [];
    for (let stop = 0; stop < 8; stop++) {
      await tab(page);
      const at = await focusPath(page);
      visited.push(at.slice(0, 1).concat(at.slice(-1)).join(' '));
      if (at[0] === 'button#after') break;
    }
    expect(visited).toEqual(['tanrei-color-field#plain input#input.input', 'tanrei-color-field#plain button.has-icon', 'tanrei-color-field#floating input#input.input', 'button#after button#after']);
    // Focused for its Field while either stop has focus (FLD-13). The default system's focused label has the color of
    // the resting one, so the test gives the Field's focused label a color of its own, on the color field itself (W3).
    await plain.evaluate((el: HTMLElement) => el.style.setProperty('--tanrei-comp-field-standard-focused-label-color', 'rgb(1, 2, 3)'));
    const frame = field(plain).locator('.frame');
    const labelColor = () => css(field(plain).locator('.label-row > .label'), 'color');
    await blurAll(page);
    await expect(frame).not.toHaveAttribute('data-focused', /.*/);
    const rest = await labelColor();
    await typing(plain).focus();
    await expect(frame).toHaveAttribute('data-focused', '');
    await expect(box(plain).locator('.field')).toHaveAttribute('data-focused', '');
    await expect.poll(labelColor).toBe('rgb(1, 2, 3)');
    const focusedColor = await labelColor();
    await tab(page);
    expect(await focused()).toBe(onButton);
    await expect(frame, 'the rows stay focused while the picker button has focus').toHaveAttribute('data-focused', '');
    expect(await labelColor()).toBe(focusedColor);
    await expect(box(plain).locator('.field'), 'the box takes its focused look only while its input has focus (CLI-22)').not.toHaveAttribute('data-focused', /.*/);
    await tab(page);
    await expect(frame).not.toHaveAttribute('data-focused', /.*/);
    await expect.poll(labelColor).toBe(rest);
    // A picker the input presented closes: focus is on the picker button, inside the color field (CLI-29).
    await blurAll(page);
    await pickerButton(plain).click();
    await blurAll(page);
    await box(plain).locator('.native-picker').evaluate((el) => {
      (el as HTMLInputElement).value = '#ff0000';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(await focused()).toBe(onButton);
    expect(await plain.evaluate((el) => [el.matches(':focus-within'), (el as HTMLElement & { value: string }).value])).toEqual([true, '#ff0000']);
  });

  test('CLF-46: placed in a Field it is drawn as it is and reported as a field already, with the bare control named — the color input; in a field group it follows the group’s disabled through its own Field and takes nothing else from the group', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<tanrei-field id="outer" label="Outer" supporting-text="Outer help."><${TAG} id="inner" label="Inner" supporting-text="Inner help."></${TAG}></tanrei-field>
       <tanrei-field-group id="group" label="Palette" error error-text="Group error" required required-text="Required"><${TAG} id="grouped" name="grouped" label="Primary" supporting-text="Help." value="#0f766e" picker picker-label="Choose color"></${TAG}></tanrei-field-group>`,
    );
    // Both frames are drawn, and the color field keeps its own name and description.
    await expect(one(page, 'outer').locator('.frame > .label-row > .label').first()).toHaveText('Outer');
    await expect(field(one(page, 'inner')).locator('.label-row > .label')).toHaveText('Inner');
    await expect(one(page, 'inner').getByRole('textbox', { name: 'Inner', exact: true })).toHaveAccessibleDescription('Inner help.');
    await expect.poll(() => seen.filter((w) => w.includes('FLD-15')).length).toBe(1);
    const report = seen.find((w) => w.includes('FLD-15'))!;
    expect(report).toContain('<tanrei-color-field> is already a field');
    expect(report).toContain('the bare control, <tanrei-color-input>');
    // In a group: nothing of the group's error, name or requirement reaches it…
    const grouped = one(page, 'grouped');
    await expect(grouped.getByRole('textbox', { name: 'Primary', exact: true })).toHaveAccessibleDescription('Help.');
    await expect(typing(grouped)).not.toHaveAttribute('aria-invalid', /.*/);
    await expect(typing(grouped)).not.toHaveAttribute('aria-required', /.*/);
    await expect(typing(grouped)).toBeEnabled();
    // …but its disabled, through its own Field: the label follows, and the input and its picker button are disabled.
    await one(page, 'group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect(typing(grouped)).toBeDisabled();
    await expect(pickerButton(grouped).locator('button')).toBeDisabled();
    await expect(field(grouped).locator('.frame')).toHaveAttribute('data-disabled', '');
    expect(await grouped.evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled), 'its own property does not change').toBe(false);
    await one(page, 'group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect(typing(grouped)).toBeEnabled();
  });

  test('CLF-47: it has no words of its own and reads none — the required and the optional text are read by its Field, each from the instance’s prop and then from the product’s words; invalidText and pickerLabel are the instance’s alone, given to its color input as they are, and nothing stands in the place of an empty one', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<${TAG} id="required" label="Brand color" required picker></${TAG}>
       <${TAG} id="optional" label="Accent color" optional></${TAG}>
       <${TAG} id="own" label="Brand color" required required-text="Needed" picker picker-label="Choose" invalid-text="Not a color."></${TAG}>`,
    );
    // With no words: the asterisk stands in the tag's place, no optional tag, a picker button without a name.
    await expect(field(one(page, 'required')).locator('.label-row tanrei-tag')).toHaveCount(0);
    await expect(field(one(page, 'required')).locator('.label-row .asterisk')).toBeVisible();
    await expect(field(one(page, 'optional')).locator('.label-row tanrei-tag')).toHaveCount(0);
    await expect(pickerButton(one(page, 'required')).locator('button')).not.toHaveAttribute('aria-label', /.+/);
    await expect(field(one(page, 'own')).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Needed');
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText']);
    // The reports name the member that reads each word — the Field's two, and the input's unnamed picker button — never the color field.
    await expect.poll(() => seen.filter((w) => /FLD-24|CLI-27/.test(w)).length).toBe(3);
    expect(seen.filter((w) => w.includes(`<${TAG}>`))).toEqual([]);
    // The color field's own tree holds no text at all.
    expect(await one(page, 'required').evaluate((el) => [...el.shadowRoot!.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()).length)).toBe(0);
    // The product's words, set once: the Field draws its own. The input reads none: its button stays unnamed, and an
    // entry error without invalidText shows no word of anyone's.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    await expect(field(one(page, 'required')).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Required');
    await expect(field(one(page, 'optional')).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Optional');
    await expect(field(one(page, 'own')).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Needed');
    expect(await missingWords(page)).toEqual([]);
    await expect(pickerButton(one(page, 'required')).locator('button')).not.toHaveAttribute('aria-label', /.+/);
    await typing(one(page, 'required')).fill('teal');
    await blurAll(page);
    await expect(typing(one(page, 'required'))).toHaveAttribute('aria-invalid', 'true');
    await expect(field(one(page, 'required')).locator('.supporting-text, .error-text')).toHaveCount(0);
    await expect.poll(() => seen.some((w) => w.includes('FLD-28'))).toBe(true);
    // The instance's own words reach the input as they are.
    await expect(pickerButton(one(page, 'own')).locator('button')).toHaveAttribute('aria-label', 'Choose');
    await typing(one(page, 'own')).fill('teal');
    await blurAll(page);
    await expect(field(one(page, 'own')).locator('.error-text')).toHaveText('Not a color.');
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`).join('\n')}`).toEqual([]);
    }
  });

  test('every fixture is one text box named by its label — and, while picker is true, one button named by pickerLabel — and the element itself has no role and no name of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      await expect(host(page, f.id).getByRole('textbox', { name: String(f.props.label), exact: true, disabled: !!f.props.disabled }), f.id).toHaveCount(1);
      await expect(host(page, f.id).getByRole('button', { disabled: !!f.props.disabled }), f.id).toHaveCount(f.props.picker ? 1 : 0);
      if (f.props.picker) await expect(host(page, f.id).getByRole('button', { name: String(f.props.pickerLabel), exact: true, disabled: !!f.props.disabled }), f.id).toHaveCount(1);
      expect(await host(page, f.id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('tabindex')]), f.id).toEqual([null, null, null]);
    }
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('every fixture is mounted, with the value as text and as the swatch’s color, and the rows the spec gives it drawn by its Field', async ({ page }) => {
    expect(spec.fixtures).toHaveLength(39);
    await expect(page.locator(`[data-fixture] > ${TAG}`)).toHaveCount(spec.fixtures.length);
    for (const f of spec.fixtures) {
      const element = host(page, f.id);
      await expect(typing(element), f.id).toHaveValue(String(f.props.value ?? ''));
      expect(await box(element).locator('.swatch').evaluate((el) => el.hasAttribute('data-filled')), `${f.id}: the swatch`).toBe(!!f.props.value);
      // The help, and below it the error text while the field is in error (FLD-7, FLD-31).
      const [text, wrong] = [f.props.supportingText, f.props.error && f.props.errorText ? f.props.errorText : ''];
      await expect(field(element).locator('.supporting-text'), `${f.id}: the help`).toHaveCount(text ? 1 : 0);
      if (text) await expect(field(element).locator('.supporting-text'), f.id).toHaveText(String(text));
      await expect(field(element).locator('.error-text'), `${f.id}: the error text`).toHaveCount(wrong ? 1 : 0);
      if (wrong) await expect(field(element).locator('.error-text'), f.id).toHaveText(String(wrong));
      const stacked = (f.props.variant ?? 'stacked') === 'stacked';
      await expect(field(element).locator('.label-row > .label'), `${f.id}: the Field’s label row`).toHaveCount(stacked && !f.props.labelHidden ? 1 : 0);
      await expect(box(element).locator('.floating'), `${f.id}: the floating label`).toHaveCount(stacked || f.props.labelHidden ? 0 : 1);
      expect((await bounds(element)).width, `${f.id}: as wide as its column`).toBeCloseTo(280, 1);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
