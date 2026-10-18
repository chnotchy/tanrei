// <tanrei-text-field>, driven by specs/text-field.spec.json: a composed element — a Field around one text
// input. What a composed element is, is held once for every such element by src/primitives/composed.test.ts (W13-1 to
// W13-8: declarations, passing, parts, events and the value, the form, focus, the twins — each of the ninety fixtures
// the same pixels and the same control as the Field's fixture `text-<id>` — and reports). The members' own sentences
// are the members' tests (text-input.test.ts, TXI-1 to TXI-63; field.test.ts, FLD-1 to FLD-28). This file holds what
// the text field's own sentences add, TXF-62 to TXF-67, and repeats no test of a member.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { loadSpec, missingWords, mountFixtures, resolveToken, setWords, tab } from '../../../test/harness.js';

const spec = loadSpec('text-field');
type P = Page;
const TAG = 'tanrei-text-field';
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const one = (page: P, id: string) => page.locator(`#${id}`);
/** The members, in an element's shadow root. */
const field = (element: Locator) => element.locator('tanrei-field');
const box = (element: Locator) => element.locator('tanrei-text-input');
/** What takes the typing: the native element, or the segments of a date or a time. */
const typing = (element: Locator) => box(element).locator('.input');
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
  await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8" /><style>${read('tokens.css')} body { margin: 16px; }</style></head><body>${body}<script type="module">${read('tanrei.bundle.js')}</script></body></html>`);
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

test.describe('behavior', () => {
  test('TXF-62: it is a Field that frames one text input, and nothing else — its shadow root holds the two members’ own elements, each prop is on the member it is from and the input’s own label, labelHidden, error and disabled are never set; the label-icon slot is the Field’s and the two icon slots the input’s; it draws no part, has no token and writes no custom property', async ({ page }) => {
    await mountHtml(
      page,
      `<${TAG} id="plain" label="Email" label-hidden error disabled supporting-text="Help." required required-text="Required" variant="outlined" size="large" type="email" value="ada@example.com" placeholder="you@example.com" maxlength="40" counter prefix-text="@" readonly>
         <span slot="label-icon">mail</span><span slot="leading-icon">search</span><span slot="trailing-icon">close</span>
       </${TAG}>`,
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
        inInput: [...input.children].map((node) => `slot ${(node as HTMLSlotElement).name} → ${node.slot}`),
        frame: ['label', 'labelHidden', 'error', 'disabled', 'supportingText', 'required', 'requiredText'].map((name) => framing[name]),
        input: ['variant', 'size', 'type', 'value', 'placeholder', 'maxLength', 'counter', 'prefixText', 'readOnly'].map((name) => input[name]),
        // The four props both members have are the Field's: the input's own are never set by the element.
        own: ['label', 'labelHidden', 'error', 'disabled'].map((name) => input[name]),
        inputHasName: !!input.name,
        delegates: root.delegatesFocus,
        custom: [...root.querySelectorAll<HTMLElement>('*')].flatMap((child) => [...child.style]).filter((name) => name.startsWith('--')),
        sheet: [...root.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((text) => text.includes('--')),
      };
    });
    expect(built.root, 'one member in the shadow root, and no text').toEqual(['tanrei-field']);
    expect(built.inFrame, 'the Field holds the passing slot of its glyph and its one control').toEqual(['slot label-icon → label-icon', 'tanrei-text-input']);
    expect(built.inInput, 'the input holds the passing slots of its two icons').toEqual(['slot leading-icon → leading-icon', 'slot trailing-icon → trailing-icon']);
    expect(built.frame).toEqual(['Email', true, true, true, 'Help.', true, 'Required']);
    expect(built.input).toEqual(['outlined', 'large', 'email', 'ada@example.com', 'you@example.com', 40, true, '@', true]);
    expect(built.own, 'the input’s own label, labelHidden, error and disabled').toEqual(['', false, false, false]);
    expect(built.inputHasName).toBe(false);
    expect(built.delegates).toBe(false);
    expect({ custom: built.custom, sheet: built.sheet }, 'no custom property is written and none is read').toEqual({ custom: [], sheet: [] });
    // What the Field says reaches the input through the Field's own connection: named, invalid, disabled and read-only.
    await expect(typing(one(page, 'plain'))).toHaveAttribute('aria-label', 'Email');
    await expect(typing(one(page, 'plain'))).toHaveAttribute('aria-invalid', 'true');
    await expect(typing(one(page, 'plain'))).toBeDisabled();
    // A slot is passed on only while the element has a child for it.
    await one(page, 'plain').evaluate((el) => el.querySelector('[slot="leading-icon"]')!.remove());
    await expect(box(one(page, 'plain')).locator('slot[name="leading-icon"][slot]')).toHaveCount(0);
    await expect(box(one(page, 'plain')).locator('.field')).not.toHaveAttribute('data-leading', /.*/);
  });

  test('TXF-62: it is as wide as the place it stands in and its text input fills it — a block with no width of its own, in every look, never an inline box as wide as the platform’s text input', async ({ page }) => {
    await mountHtml(
      page,
      `<div style="inline-size: 420px"><${TAG} id="wide" label="Email"></${TAG}></div>
       <div style="inline-size: 137px"><${TAG} id="narrow" label="Email" variant="outlined" value="a value wider than its place" supporting-text="Help that is longer than the place it stands in."></${TAG}></div>
       <div style="display: flex; gap: 8px; inline-size: 500px"><${TAG} id="a" label="First" style="flex: 1"></${TAG}><${TAG} id="b" label="Last" style="flex: 1"></${TAG}></div>
       <p id="prose">Before <${TAG} id="inline" label="In a line of text"></${TAG}> after</p>`,
    );
    for (const [id, width] of [['wide', 420], ['narrow', 137], ['a', 246], ['b', 246]] as const) {
      expect(await css(one(page, id), 'display'), id).toBe('block');
      expect((await bounds(one(page, id))).width, `${id}: as wide as its place`).toBeCloseTo(width, 1);
      expect((await bounds(field(one(page, id)))).width, `${id}: the Field`).toBeCloseTo(width, 1);
      expect((await bounds(box(one(page, id)))).width, `${id}: the input fills it`).toBeCloseTo(width, 1);
      expect((await bounds(box(one(page, id)).locator('.container'))).width, `${id}: the box`).toBeCloseTo(width, 1);
    }
    // In a line of text it is still a block: it takes the paragraph's width, and the text stands above and below it.
    const [prose, inline] = [await bounds(page.locator('#prose')), await bounds(one(page, 'inline'))];
    expect(inline.width).toBeCloseTo(prose.width, 1);
    // As tall as its rows and its box together, and no more.
    const narrow = one(page, 'narrow');
    const rows = await bounds(field(narrow).locator('.supporting'));
    const whole = await bounds(narrow);
    expect(whole.y + whole.height).toBeCloseTo(rows.y + rows.height, 1);
  });

  test('TXF-62: what it shows is what the pair does — the Field’s label row and requirement mark above a stacked box; in a floating look no label row, the name floated in the box with the Field’s asterisk; the supporting row from where the text starts; an error on the box and in the row; and a date’s entry error shown with the input’s words in the Field’s row', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => ['stacked-required', 'outlined-required', 'stacked-icons', 'stacked-error', 'outlined-label-hidden', 'stacked-label-icon'].includes(f.id)) });
    // Stacked: the label and the tag are the Field's (FLD-2, FLD-5); the input draws none.
    const stacked = host(page, 'stacked-required');
    await expect(field(stacked).locator('.label-row > .label')).toHaveText(/^Email\*?$/);
    await expect(field(stacked).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Required');
    await expect(box(stacked).locator('label')).toHaveCount(0);
    // Floating: the Field leaves its row out, and the input floats the name with the asterisk the Field gives (FLD-25, TXI-13, TXI-50).
    const floating = host(page, 'outlined-required');
    await expect(field(floating).locator('.label-row')).toHaveCount(0);
    await expect(box(floating).locator('label.label')).toHaveText('Email*');
    await expect(typing(floating)).toHaveJSProperty('required', true);
    // A hidden label: neither draws one, and the name stays.
    const hidden = host(page, 'outlined-label-hidden');
    await expect(field(hidden).locator('.label-row')).toHaveCount(0);
    await expect(box(hidden).locator('label')).toHaveCount(0);
    await expect(hidden.getByRole('searchbox', { name: 'Search', exact: true })).toHaveCount(1);
    // The glyph of the label is drawn by the Field, the two icons by the input.
    await expect(field(host(page, 'stacked-label-icon')).locator('.label-row > .label-icon')).toBeVisible();
    await expect(box(host(page, 'stacked-icons')).locator('.leading')).toBeVisible();
    await expect(box(host(page, 'stacked-icons')).locator('.trailing')).toBeVisible();
    // The error: the box is marked and the words are the Field's row and the input's description (FLD-7, FLD-8, TXI-11).
    const wrong = host(page, 'stacked-error');
    await expect(box(wrong).locator('.field')).toHaveAttribute('data-error', '');
    await expect(field(wrong).locator('.error-text')).toHaveText('Enter a complete address.');
    await expect(wrong.getByRole('textbox')).toHaveAccessibleDescription('Enter a complete address.');
    // The supporting row starts where the input's text starts — past a leading icon (FLD-26, TXI-62).
    await host(page, 'stacked-icons').evaluate((el) => ((el as HTMLElement & { supportingText: string }).supportingText = 'Help.'));
    await expect(field(host(page, 'stacked-icons')).locator('.supporting-text')).toHaveText('Help.');
    expect((await bounds(field(host(page, 'stacked-icons')).locator('.supporting-text'))).x).toBeCloseTo((await bounds(typing(host(page, 'stacked-icons')))).x, 1);
    // A date committed half-filled: the input's words in the Field's row, in its error condition (FLD-28, TXI-30) —
    // until the next edit of a segment.
    await mountHtml(page, `<${TAG} id="due" style="inline-size: 280px" type="date" locale="en-US" label="Due" supporting-text="By the end of the year." invalid-text="Finish the date." segment-empty-text="Empty"></${TAG}>`);
    const due = one(page, 'due');
    await box(due).locator('.segment[data-unit="month"]').click();
    await page.keyboard.type('0927');
    await blurAll(page);
    await expect(field(due).locator('.error-text')).toHaveText('Finish the date.');
    await expect(field(due).locator('.supporting-text'), 'the error text stands in the help’s place (FLD-7)').toHaveCount(0);
    await expect(field(due).locator('.frame')).toHaveAttribute('data-error', '');
    expect(await due.evaluate((el) => [(el as HTMLElement & { error: boolean }).error, (el as HTMLElement & { value: string }).value]), 'error stays the product’s').toEqual([false, '']);
    await box(due).locator('.segment[data-unit="year"]').click();
    await page.keyboard.type('2');
    await expect(field(due).locator('.error-text')).toHaveCount(0);
    await expect(field(due).locator('.supporting-text')).toHaveText('By the end of the year.');
    await expect(field(due).locator('.frame')).not.toHaveAttribute('data-error', /.*/);
  });

  test('TXF-63: in a form it is the one control the form sees — its name, its input’s value, reset to the value it was first given and restored, left out while disabled — and it reports what its input reports: a missing value while required, and a date’s entry error; a value its input does not keep is read back as the input holds it; its members take no part in the form', async ({ page }) => {
    await mountHtml(
      page,
      `<form id="form">
         <${TAG} id="email" name="email" label="Email" required value="ada@example.com"></${TAG}>
         <${TAG} id="due" name="due" label="Due" type="date" locale="en-US" max="2026-12-31" unavailable-text="Too late." segment-empty-text="Empty" value="not a date"></${TAG}>
         <${TAG} id="off" name="off" label="Off" value="x" disabled></${TAG}>
         <button id="send">Send</button>
       </form>
       <script>window.submitted = 0; document.getElementById('form').addEventListener('submit', (event) => { event.preventDefault(); window.submitted++; });</script>`,
    );
    const form = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([key, value]) => `${key}=${String(value)}`));
    // One entry under each name; a disabled one none; a value that is no ISO date is kept by the input as none (TXI-31).
    expect(await form()).toEqual(['email=ada@example.com', 'due=']);
    expect(await one(page, 'due').evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('');
    expect(await page.evaluate(() => [...(document.querySelector('form') as HTMLFormElement).elements].map((el) => el.id))).toEqual(['email', 'due', 'off', 'send']);
    expect(await one(page, 'email').evaluate((el) => [...el.shadowRoot!.querySelectorAll('tanrei-field, tanrei-text-input')].map((member) => [(member as HTMLElement & { form?: unknown }).form ?? null, (member as HTMLElement & { name?: string }).name || null]))).toEqual([[null, null], [null, null]]);
    // A value typed, then reset: back to the value attribute.
    await typing(one(page, 'email')).fill('grace@example.com');
    expect(await form()).toEqual(['email=grace@example.com', 'due=']);
    await page.evaluate(() => document.querySelector('form')!.reset());
    await settle(page);
    expect(await form()).toEqual(['email=ada@example.com', 'due=']);
    // Required and empty: a missing value, reported on the text field, and the report focuses its input.
    await one(page, 'email').evaluate((el) => ((el as HTMLElement & { value: string }).value = ''));
    await settle(page);
    const missing = await one(page, 'email').evaluate((el) => {
      const control = el as HTMLElement & { validity: ValidityState; validationMessage: string; reportValidity(): boolean };
      return { missing: control.validity.valueMissing, message: control.validationMessage !== '', reported: control.reportValidity() };
    });
    expect(missing).toEqual({ missing: true, message: true, reported: false });
    expect((await focusPath(page)).slice(0, 3)).toEqual(['tanrei-text-field#email', 'tanrei-text-input', 'input#input.input']);
    await page.locator('#send').click();
    expect(await page.evaluate(() => (window as unknown as { submitted: number }).submitted)).toBe(0);
    await one(page, 'email').evaluate((el) => ((el as HTMLElement & { value: string }).value = 'ada@example.com'));
    // A date after max, committed: the input's entry error is the text field's validity, with the input's words.
    await box(one(page, 'due')).locator('.segment[data-unit="month"]').click();
    await page.keyboard.type('01052027');
    await blurAll(page);
    expect(await one(page, 'due').evaluate((el) => {
      const control = el as HTMLElement & { validity: ValidityState; validationMessage: string; value: string };
      return [control.value, control.validity.rangeOverflow, control.validationMessage];
    })).toEqual(['', true, 'Too late.']);
    // The action key in the input presses the default button of the text field's own form (TXI-3, BTN-30).
    await box(one(page, 'due')).locator('.segment[data-unit="year"]').click();
    await page.keyboard.press('ArrowDown');
    await typing(one(page, 'email')).focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { submitted: number }).submitted)).toBe(1);
  });

  test('TXF-64: focus given to it goes to its input — in a date field to the segment TXI-43 names — by the product, by a press on the label row, on the box or on a floating label, and by a form’s report; a press on the help, the error text, the count or the gap between a row and the box does nothing; it adds no stop: the stops inside it are its input’s, in order; and while focus is inside it its Field draws its focused tokens', async ({ page }) => {
    await mountHtml(
      page,
      `<button id="before">Before</button>
       <${TAG} id="plain" style="inline-size: 320px" label="Notes" supporting-text="A few words about the change." counter maxlength="40" value="a" required required-text="Required"><span slot="label-icon">notes</span></${TAG}>
       <${TAG} id="floating" style="inline-size: 320px; margin-block-start: 24px" variant="outlined" label="Email" error error-text="Enter a complete address."></${TAG}>
       <${TAG} id="date" style="inline-size: 320px; margin-block-start: 24px" label="Due" type="date" locale="en-US" picker picker-label="Choose date" segment-empty-text="Empty"></${TAG}>
       <${TAG} id="stops" style="inline-size: 320px; margin-block-start: 24px" label="Message" multiline resize="manual" resize-label="Resize" value="One"><tanrei-button slot="trailing-icon" variant="text" label="Clear"><span slot="icon">close</span></tanrei-button></${TAG}>
       <button id="after">After</button>`,
    );
    const plain = one(page, 'plain');
    const focused = async () => (await focusPath(page)).join(' > ');
    const inInput = 'tanrei-text-field#plain > tanrei-text-input > input#input.input';
    // By the product.
    await plain.evaluate((el: HTMLElement) => el.focus());
    expect(await focused()).toBe(inInput);
    expect(await plain.evaluate((el) => [el.matches(':focus-within'), el.tabIndex, el.shadowRoot!.delegatesFocus])).toEqual([true, -1, false]);
    // While focus is inside it, its Field draws its focused tokens (FLD-13).
    await expect(field(plain).locator('.frame')).toHaveAttribute('data-focused', '');
    await plain.evaluate((el: HTMLElement) => el.blur());
    expect(await focused()).toBe('body');
    await expect(field(plain).locator('.frame')).not.toHaveAttribute('data-focused', /.*/);
    // A press on the label row — the label, its glyph, the requirement mark — is the Field's (FLD-12): it calls
    // focus() on its control.
    for (const selector of ['.label-row > .label', '.label-row > .label-icon', '.label-row tanrei-tag']) {
      await blurAll(page);
      await pressAt(field(plain).locator(selector));
      expect(await focused(), selector).toBe(inInput);
    }
    // A press on the box, and on a label that floats in it, is the input's (TXI-8).
    await blurAll(page);
    await pressAt(box(plain).locator('.container'), 'start');
    expect(await focused()).toBe(inInput);
    await blurAll(page);
    await pressAt(box(one(page, 'floating')).locator('label.label'));
    expect(await focused()).toBe('tanrei-text-field#floating > tanrei-text-input > input#input.input');
    // A press on the help, the error text or the count, and on the gap between a row and the box, does nothing: no
    // focus arrives (were focus delegated, each of these would focus the input).
    for (const [element, selector] of [[plain, '.supporting-text'], [plain, '.counter'], [one(page, 'floating'), '.error-text']] as const) {
      await blurAll(page);
      await pressAt(field(element).locator(selector));
      expect(await focused(), `a press on ${selector}`).toBe('body');
    }
    const [container, row, label] = [await bounds(box(plain).locator('.container')), await bounds(field(plain).locator('.supporting')), await bounds(field(plain).locator('.label-row'))];
    expect(row.y - (container.y + container.height), 'there is a gap below the box').toBeGreaterThan(1);
    await page.mouse.click(container.x + 20, (container.y + container.height + row.y) / 2);
    expect(await focused(), 'the gap between the box and the supporting row').toBe('body');
    await page.mouse.click(container.x + 20, (label.y + label.height + container.y) / 2);
    expect(await focused(), 'the gap between the label row and the box').toBe('body');
    // (Focus that is in the input leaves it for such a press, as for a press on any text of the page: the platform's.)
    // A date field: the first empty segment, by the product and by a press on the label.
    await blurAll(page);
    await one(page, 'date').evaluate((el: HTMLElement) => el.focus());
    expect(await box(one(page, 'date')).evaluate((el) => (el.shadowRoot!.activeElement as HTMLElement | null)?.dataset.unit)).toBe('month');
    await blurAll(page);
    await pressAt(field(one(page, 'date')).locator('.label-row > .label'));
    expect(await box(one(page, 'date')).evaluate((el) => (el.shadowRoot!.activeElement as HTMLElement | null)?.dataset.unit)).toBe('month');
    // No stop of its own: Tab visits the input's stops in the input's order — the text, a control in the trailing slot,
    // the resize grip; a date's segments and its picker button — and nothing else.
    await page.locator('#before').focus();
    const visited: string[] = [];
    for (let stop = 0; stop < 12; stop++) {
      await tab(page);
      const at = await focusPath(page);
      visited.push(at.slice(0, 1).concat(at.slice(-1)).join(' '));
      if (at[0] === 'button#after') break;
    }
    expect(visited).toEqual([
      'tanrei-text-field#plain input#input.input',
      'tanrei-text-field#floating input#input.input',
      'tanrei-text-field#date span.segment',
      'tanrei-text-field#date span.segment',
      'tanrei-text-field#date span.segment',
      'tanrei-text-field#date button.has-icon',
      'tanrei-text-field#stops textarea#input.input',
      // The product's own Button in the trailing slot: its child, and a stop of its own.
      'tanrei-button button.has-icon',
      'tanrei-text-field#stops div.grip',
      'button#after button#after',
    ]);
  });

  test('TXF-65: placed in a Field it is drawn as it is and reported as a field already, with the bare control named — the text input; in a field group it follows the group’s disabled through its own Field and takes nothing else from the group', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<tanrei-field id="outer" label="Outer" supporting-text="Outer help."><${TAG} id="inner" label="Inner" supporting-text="Inner help."></${TAG}></tanrei-field>
       <tanrei-field-group id="group" label="Sign in" error error-text="Group error" required required-text="Required"><${TAG} id="grouped" name="grouped" label="Email" supporting-text="Help." value="ada@example.com"></${TAG}></tanrei-field-group>`,
    );
    // Both frames are drawn, and the text field keeps its own name and description.
    await expect(one(page, 'outer').locator('.frame > .label-row > .label').first()).toHaveText('Outer');
    await expect(field(one(page, 'inner')).locator('.label-row > .label')).toHaveText('Inner');
    await expect(one(page, 'inner').getByRole('textbox', { name: 'Inner', exact: true })).toHaveAccessibleDescription('Inner help.');
    await expect.poll(() => seen.filter((w) => w.includes('FLD-15')).length).toBe(1);
    const report = seen.find((w) => w.includes('FLD-15'))!;
    expect(report).toContain('<tanrei-text-field> is already a field');
    expect(report).toContain('the bare control, <tanrei-text-input>');
    // In a group: nothing of the group's error, name or requirement reaches it…
    const grouped = one(page, 'grouped');
    await expect(grouped.getByRole('textbox', { name: 'Email', exact: true })).toHaveAccessibleDescription('Help.');
    await expect(typing(grouped)).not.toHaveAttribute('aria-invalid', /.*/);
    await expect(typing(grouped)).toHaveJSProperty('required', false);
    await expect(typing(grouped)).toBeEnabled();
    // …but its disabled, through its own Field: the label follows, and the input is disabled.
    await one(page, 'group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect(typing(grouped)).toBeDisabled();
    await expect(field(grouped).locator('.frame')).toHaveAttribute('data-disabled', '');
    expect(await grouped.evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled), 'its own property does not change').toBe(false);
    await one(page, 'group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect(typing(grouped)).toBeEnabled();
  });

  test('TXF-66: it has no words of its own and reads none — the required and the optional text are read by its Field, the grip’s name and an empty segment’s value text by its input, each from the instance’s prop and then from the product’s words', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<${TAG} id="required" label="Email" required></${TAG}>
       <${TAG} id="optional" label="Company" optional></${TAG}>
       <${TAG} id="grip" label="Message" multiline resize="manual"></${TAG}>
       <${TAG} id="date" label="Due" type="date" locale="en-US"></${TAG}>
       <${TAG} id="own" label="Email" required required-text="Needed"></${TAG}>`,
    );
    // With no words: the asterisk stands in the tag's place, no optional tag, a grip without a name, a segment without a value text.
    await expect(field(one(page, 'required')).locator('.label-row tanrei-tag')).toHaveCount(0);
    await expect(field(one(page, 'required')).locator('.label-row .asterisk')).toBeVisible();
    await expect(field(one(page, 'optional')).locator('.label-row tanrei-tag')).toHaveCount(0);
    await expect(box(one(page, 'grip')).locator('.grip')).not.toHaveAttribute('aria-label', /.*/);
    await expect(box(one(page, 'date')).locator('.segment').first()).not.toHaveAttribute('aria-valuetext', /.*/);
    await expect(field(one(page, 'own')).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Needed');
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText', 'resizeLabel', 'segmentEmptyText']);
    // The reports name the member that reads each word, never the text field.
    await expect.poll(() => seen.filter((w) => /FLD-24|TXI-41|TXI-52/.test(w)).length).toBe(4);
    expect(seen.filter((w) => w.includes(`<${TAG}>`))).toEqual([]);
    // The text field's own tree holds no text at all.
    expect(await one(page, 'required').evaluate((el) => [...el.shadowRoot!.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()).length)).toBe(0);
    // The product's words, set once: each member draws its own.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional', resizeLabel: 'Resize', segmentEmptyText: 'Empty' });
    await expect(field(one(page, 'required')).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Required');
    await expect(field(one(page, 'optional')).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Optional');
    await expect(box(one(page, 'grip')).locator('.grip')).toHaveAttribute('aria-label', 'Resize');
    await expect(box(one(page, 'date')).locator('.segment').first()).toHaveAttribute('aria-valuetext', 'Empty');
    await expect(field(one(page, 'own')).locator('.label-row tanrei-tag')).toHaveAttribute('label', 'Needed');
    expect(await missingWords(page)).toEqual([]);
  });

  test('TXF-67: while counter is set it gives its Field the count its text input keeps, as the input writes it, and the new one in the frame in which the value changes — by typing, by a paste, because the product set value or maxLength — with no announcement of its own; without counter it gives none; it counts, formats and writes nothing itself', async ({ page }) => {
    await mountHtml(page, `<${TAG} id="name" style="inline-size: 320px" label="Display name" value="Ada Lovelace" maxlength="40" counter></${TAG}><${TAG} id="none" style="inline-size: 320px" label="Plain" value="abc" maxlength="40" supporting-text="Help."></${TAG}>`);
    const name = one(page, 'name');
    const counter = (element: Locator) => field(element).locator('.supporting > .counter');
    const given = (element: Locator) => element.evaluate((el) => [(el.shadowRoot!.querySelector('tanrei-field') as HTMLElement & { countText: string }).countText, (el.shadowRoot!.querySelector('tanrei-text-input') as HTMLElement & { countText: string }).countText]);
    // As the input writes it, drawn by the Field at the end of its row — and at the first frame.
    expect(await given(name)).toEqual(['12/40', '12/40']);
    await expect(counter(name)).toHaveText('12/40');
    await expect(counter(name)).toHaveAttribute('aria-hidden', 'true');
    // Typing: the new count is drawn in the next frame, and each `input` already reads the new count from the input.
    await name.evaluate((el) => {
      (window as unknown as { seen: string[] }).seen = [];
      el.addEventListener('input', () => {
        const input = el.shadowRoot!.querySelector('tanrei-text-input') as HTMLElement & { countText: string };
        requestAnimationFrame(() => (window as unknown as { seen: string[] }).seen.push(`${input.countText} drawn ${el.shadowRoot!.querySelector('tanrei-field')!.shadowRoot!.querySelector('.counter')!.textContent}`));
      });
    });
    await typing(name).focus();
    await page.keyboard.press('End');
    await page.keyboard.type('!');
    await expect(counter(name)).toHaveText('13/40');
    await expect.poll(() => page.evaluate(() => (window as unknown as { seen: string[] }).seen)).toEqual(['13/40 drawn 13/40']);
    // A paste (what does not fit under maxLength is cut by the input, and the count is the input's).
    await typing(name).evaluate((el: HTMLInputElement) => {
      el.setRangeText(' and a paste that is far too long to fit', el.value.length, el.value.length, 'end');
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertFromPaste' }));
    });
    await expect(counter(name)).toHaveText('40/40');
    // A value and a maxLength the product sets.
    await name.evaluate((el) => ((el as HTMLElement & { value: string }).value = 'Ada'));
    await expect(counter(name)).toHaveText('3/40');
    await name.evaluate((el) => ((el as HTMLElement & { maxLength: number }).maxLength = 10));
    await expect(counter(name)).toHaveText('3/10');
    await name.evaluate((el) => ((el as HTMLElement & { maxLength: number }).maxLength = 0));
    await expect(counter(name)).toHaveText('3');
    // No announcement of its own: the text field has no live region, and the Field's says nothing of a count.
    expect(await name.evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role="status"]').length)).toBe(0);
    expect(await field(name).evaluate((el) => el.shadowRoot!.querySelector('.announcer')!.textContent)).toBe('');
    // The input describes the count itself; the drawn one is kept from assistive technology.
    await expect(name.getByRole('textbox')).toHaveAccessibleDescription('3');
    // Without counter: no count text, and no part.
    expect(await given(one(page, 'none'))).toEqual(['', '']);
    await expect(counter(one(page, 'none'))).toHaveCount(0);
    await name.evaluate((el) => ((el as HTMLElement & { counter: boolean }).counter = false));
    await expect(counter(name)).toHaveCount(0);
    await expect(field(name).locator('.supporting'), 'no row is kept for a count that is gone').toHaveCount(0);
    expect(await given(name)).toEqual(['', '']);
    // It counts nothing itself: it has no count of its own to read.
    expect(await name.evaluate((el) => 'countText' in el)).toBe(false);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    // (Ninety fixtures, twice.)
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`).join('\n')}`).toEqual([]);
    }
  });

  test('every fixture is one named text box (a search box for search) — a date or time field one group named by its label, holding its segments — and the element itself has no role and no name of its own', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const f of spec.fixtures) {
      if (['date', 'time', 'date-time'].includes(String(f.props.type))) {
        const group = host(page, f.id).getByRole('group', { name: String(f.props.label), exact: true });
        await expect(group, f.id).toHaveCount(1);
        await expect(host(page, f.id).getByRole('textbox'), f.id).toHaveCount(0);
        expect(await group.getByRole('spinbutton').count(), f.id).toBeGreaterThanOrEqual(2);
        continue;
      }
      const role = f.props.type === 'search' ? 'searchbox' : 'textbox';
      await expect(host(page, f.id).getByRole(role, { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
      expect(await host(page, f.id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('tabindex')]), f.id).toEqual([null, null, null]);
    }
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('every fixture is mounted, and the icon faces are loaded, so the icons fixture draws glyphs, not ligature text', async ({ page }) => {
    await expect(page.locator(`[data-fixture] > ${TAG}`)).toHaveCount(spec.fixtures.length);
    const width = (await bounds(box(host(page, 'outlined-icons')).locator('.leading'))).width;
    // A glyph is one em wide, within the unit of the engine's layout — WebKit on Linux reports an advance of 24.00009
    // for an em of 24 and rounds the box up to a 64th of a pixel; the glyph's name set as text is several ems.
    expect(Math.abs(width - (await resolveToken(page, '--tanrei-comp-input-box-icon-size-medium'))), `${width} wide`).toBeLessThanOrEqual(1 / 64);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
