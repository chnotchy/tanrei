// <tanrei-number-field>, driven by specs/number-field.spec.json: a composed element — a Field around one
// number input. What a composed element is, is held once for every such element by src/primitives/composed.test.ts
// (W13-1 to W13-8: declarations, passing, parts, events and the value, the form, focus, the twins — each of the
// forty-six fixtures the same pixels and the same control as the Field's fixture `number-<id>` — and reports). The
// members' own sentences are the members' tests (number-input.test.ts, NMI-1 to NMI-46; field.test.ts, FLD-1 to
// FLD-28). This file holds what the number field's own sentences add, NUM-47 to NUM-51, and repeats no test of a member.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { loadSpec, missingWords, mountFixtures, resolveToken, setWords, tab } from '../../../test/harness.js';

const spec = loadSpec('number-field');
type P = Page;
const TAG = 'tanrei-number-field';
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const one = (page: P, id: string) => page.locator(`#${id}`);
/** The members, in an element's shadow root. */
const field = (element: Locator) => element.locator('tanrei-field');
const box = (element: Locator) => element.locator('tanrei-number-input');
/** The native element: the spin button. */
const typing = (element: Locator) => box(element).locator('.input');
const stepper = (element: Locator, which: 'down' | 'up') => box(element).locator(`.stepper.${which}`);
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
async function mountHtml(page: P, body: string, system = '') {
  const sheet = system ? read(`systems/${system}.css`) : '';
  await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"${system ? ` data-tanrei-system="${system}"` : ''}><head><meta charset="utf-8" /><style>${read('tokens.css')}${sheet} body { margin: 16px; }</style></head><body>${body}<script type="module">${read('tanrei.bundle.js')}</script></body></html>`);
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
const STEPPERS = 'increment-label="Increase" decrement-label="Decrease"';

test.describe('behavior', () => {
  test('NUM-47: it is a Field that frames one number input, and nothing else — its shadow root holds the two members’ own elements, each prop is on the member it is from and the input’s own label, labelHidden, error and disabled are never set; the label-icon slot is the Field’s; it emits its input’s events as its own, each once; it draws no part, holds no state, has no token and writes no custom property', async ({ page }) => {
    await mountHtml(
      page,
      `<${TAG} id="plain" label="Width" label-hidden error disabled supporting-text="Help." error-text="Wrong." requirement="required" required-mark="asterisk" required-text="Required" optional-text="Optional" variant="outlined" size="large" value="12.5" placeholder="0" readonly min="1" max="99" step="0.5" no-steppers increment-label="More" decrement-label="Less" prefix-text="~" suffix-text="px" value-text="twelve and a half pixels" align="end" min-fraction-digits="1" max-fraction-digits="2" locale="de-DE" invalid-text="Not a number.">
         <span slot="label-icon">timer</span>
       </${TAG}>
       <${TAG} id="events" label="Quantity" ${STEPPERS}></${TAG}>`,
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
        inInput: [...input.childNodes].filter(drawn).length,
        frame: ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'disabled', 'requirement', 'requiredMark', 'requiredText', 'optionalText'].map((name) => framing[name]),
        input: ['variant', 'size', 'value', 'placeholder', 'readOnly', 'min', 'max', 'step', 'noSteppers', 'incrementLabel', 'decrementLabel', 'prefixText', 'suffixText', 'valueText', 'align', 'minFractionDigits', 'maxFractionDigits', 'locale', 'invalidText'].map((name) => input[name]),
        // The four props both members have are the Field's: the input's own are never set by the element.
        own: ['label', 'labelHidden', 'error', 'disabled'].map((name) => input[name]),
        inputHasName: !!input.name,
        delegates: root.delegatesFocus,
        custom: [...root.querySelectorAll<HTMLElement>('*')].flatMap((child) => [...child.style]).filter((name) => name.startsWith('--')),
        sheet: [...root.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((text) => text.includes('--')),
        // No state of its own: every reactive property is a prop of the spec, the platform's name, or the fieldset's disabled it joins for its Field.
        properties: [...(el.constructor as unknown as { elementProperties: Map<string, { state?: boolean }> }).elementProperties].filter(([, options]) => options.state).map(([name]) => name),
      };
    });
    expect(built.root, 'one member in the shadow root, and no text').toEqual(['tanrei-field']);
    expect(built.inFrame, 'the Field holds the passing slot of its glyph and its one control').toEqual(['slot label-icon → label-icon', 'tanrei-number-input']);
    expect(built.inInput, 'the input holds nothing: it has no slot').toBe(0);
    expect(built.frame, 'ten props to the Field').toEqual(['Width', true, 'Help.', 'Wrong.', true, true, 'required', 'asterisk', 'Required', 'Optional']);
    expect(built.input, 'nineteen to the number input').toEqual(['outlined', 'large', 12.5, '0', true, 1, 99, 0.5, true, 'More', 'Less', '~', 'px', 'twelve and a half pixels', 'end', 1, 2, 'de-DE', 'Not a number.']);
    expect(built.own, 'the input’s own label, labelHidden, error and disabled').toEqual(['', false, false, false]);
    expect(built.inputHasName).toBe(false);
    expect(built.delegates).toBe(false);
    expect({ custom: built.custom, sheet: built.sheet }, 'no custom property is written and none is read').toEqual({ custom: [], sheet: [] });
    expect(built.properties, 'no state but the disabled fieldset’s').toEqual(['formDisabled']);
    // What the Field says reaches the input through the Field's own connection: named, invalid, required, disabled.
    await expect(typing(one(page, 'plain'))).toHaveAttribute('aria-label', 'Width');
    await expect(typing(one(page, 'plain'))).toHaveAttribute('aria-invalid', 'true');
    await expect(typing(one(page, 'plain'))).toHaveAttribute('aria-required', 'true');
    await expect(typing(one(page, 'plain'))).toBeDisabled();
    await expect(typing(one(page, 'plain'))).toHaveValue('12,5');
    // A slot is passed on only while the element has a child for it.
    await one(page, 'plain').evaluate((el) => el.querySelector('[slot="label-icon"]')!.remove());
    await expect(field(one(page, 'plain')).locator(':scope > slot')).toHaveCount(0);
    // Its input's four events are its own, each once for one act, with the element as their target.
    const events = one(page, 'events');
    await events.evaluate((el) => {
      const w = window as unknown as { heard: string[] };
      w.heard = [];
      for (const name of ['input', 'change', 'action', 'entryerror']) el.addEventListener(name, (event) => w.heard.push(`${event.type} ${event.target === el ? 'the element' : 'a member'} ${String((el as unknown as { value: unknown }).value)}`));
    });
    const heard = () => page.evaluate(() => (window as unknown as { heard: string[] }).heard.splice(0));
    await pressAt(stepper(events, 'up'));
    expect(await heard(), 'a stepper').toEqual(['input the element 0', 'change the element 0']);
    await events.evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    expect(await heard(), 'Enter').toEqual(['action the element 0']);
    await page.keyboard.type('x');
    await blurAll(page);
    await settle(page);
    expect(await heard(), 'a text that is not a number').toEqual(['input the element 0', 'entryerror the element null', 'change the element null']);
  });

  test('NUM-47: it is as wide as the place it stands in and its number input fills it — a block with no width of its own, in every look, never an inline box as wide as the platform’s text input; a long label in a place that gives no width widens it to the row', async ({ page }) => {
    await mountHtml(
      page,
      `<div style="inline-size: 420px"><${TAG} id="wide" label="Quantity" ${STEPPERS}></${TAG}></div>
       <div style="inline-size: 137px"><${TAG} id="narrow" label="Quantity" variant="outlined" value="1234567890123" no-steppers supporting-text="Help that is longer than the place it stands in."></${TAG}></div>
       <div style="display: flex; gap: 8px; inline-size: 500px"><${TAG} id="a" label="Width" style="flex: 1" ${STEPPERS}></${TAG}><${TAG} id="b" label="Height" style="flex: 1" ${STEPPERS}></${TAG}></div>
       <p id="prose">Before <${TAG} id="inline" label="In a line of text" ${STEPPERS}></${TAG}> after</p>
       <div style="display: flex"><${TAG} id="unsized" label="A label that is a good deal wider than the box it names" no-steppers></${TAG}></div>`,
    );
    for (const [id, width] of [['wide', 420], ['narrow', 137], ['a', 246], ['b', 246]] as const) {
      expect(await css(one(page, id), 'display'), id).toBe('block');
      expect((await bounds(one(page, id))).width, `${id}: as wide as its place`).toBeCloseTo(width, 1);
      expect((await bounds(field(one(page, id)))).width, `${id}: the Field`).toBeCloseTo(width, 1);
      expect((await bounds(box(one(page, id)))).width, `${id}: the input fills it`).toBeCloseTo(width, 1);
      expect((await bounds(box(one(page, id)).locator('.field > .container'))).width, `${id}: the box`).toBeCloseTo(width, 1);
    }
    // In a line of text it is still a block: it takes the paragraph's width, and the text stands above and below it.
    const [prose, inline] = [await bounds(page.locator('#prose')), await bounds(one(page, 'inline'))];
    expect(inline.width).toBeCloseTo(prose.width, 1);
    // As tall as its rows and its box together, and no more.
    const narrow = one(page, 'narrow');
    const rows = await bounds(field(narrow).locator('.supporting'));
    const whole = await bounds(narrow);
    expect(whole.y + whole.height).toBeCloseTo(rows.y + rows.height, 1);
    // Where the layout gives no width, the Field is as wide as its widest row, and the box fills that.
    const unsized = one(page, 'unsized');
    const label = await bounds(field(unsized).locator('.label-row > .label'));
    expect((await bounds(unsized)).width, 'as wide as the label’s row').toBeGreaterThanOrEqual(label.width - 0.6);
    expect((await bounds(box(unsized).locator('.field > .container'))).width, 'and the box fills it').toBeCloseTo((await bounds(unsized)).width, 1);
  });

  test('NUM-47: what it shows is what the pair does — the Field’s label row and requirement mark above a stacked box; in a floating look no label row, the name floated in the box with the Field’s asterisk; the supporting row from the box’s inline padding, with steppers too; an error on the box and in the row, and the steppers not in error; a text that is not a number shown with the input’s words in the Field’s row', async ({ page }) => {
    await mountHtml(
      page,
      `<${TAG} id="stacked" style="inline-size: 280px" label="Quantity" requirement="required" required-mark="tag" required-text="Required" supporting-text="Up to 99 per order." value="12" ${STEPPERS}></${TAG}>
       <${TAG} id="floating" style="inline-size: 280px" variant="filled" label="Quantity" requirement="required" required-text="Required" supporting-text="Up to 99 per order." ${STEPPERS}></${TAG}>
       <${TAG} id="wrong" style="inline-size: 280px" label="Quantity" error error-text="Order at least 1." value="0" ${STEPPERS}></${TAG}>
       <${TAG} id="entry" style="inline-size: 280px" label="Quantity" supporting-text="Up to 99 per order." error-text="Order at least 1." invalid-text="Enter a number." ${STEPPERS}></${TAG}>`,
      'm3-like',
    );
    const padding = await resolveToken(page, '--tanrei-comp-input-box-container-padding-inline-medium');
    // Stacked: the Field's row and its tag; the input draws no label.
    const stacked = one(page, 'stacked');
    await expect(field(stacked).locator('.label-row > .label')).toHaveText('Quantity');
    await expect(field(stacked).locator('.label-row tanrei-tag')).toHaveCount(1);
    await expect(box(stacked).locator('.floating')).toHaveCount(0);
    // The help starts and ends at the box's inline padding, while the steppers stand closer to the end edge.
    const [container, help] = [await bounds(box(stacked).locator('.field > .container')), field(stacked).locator('.supporting-text')];
    const text = await bounds(help);
    expect(text.x + Number.parseFloat(await css(help, 'padding-left')) - container.x, 'the help starts at the inline padding').toBeCloseTo(padding, 1);
    expect(container.x + container.width - (text.x + text.width - Number.parseFloat(await css(help, 'padding-right'))), 'and ends at it').toBeCloseTo(padding, 1);
    const up = await bounds(stepper(stacked, 'up'));
    expect(container.x + container.width - (up.x + up.width), 'the steppers stand closer to the edge').toBeLessThan(padding);
    // Floating: no label row and no tag; the input floats the Field's name, with the asterisk the Field gives.
    const floating = one(page, 'floating');
    await expect(field(floating).locator('.label-row')).toHaveCount(0);
    await expect(field(floating).locator('tanrei-tag')).toHaveCount(0);
    await expect(box(floating).locator('.floating')).toHaveText('Quantity*');
    await expect(typing(floating)).toHaveAttribute('aria-label', 'Quantity');
    // In error: the box's edge and the Field's row; the steppers are drawn as those of a field at rest.
    const wrong = one(page, 'wrong');
    await expect(field(wrong).locator('.error-text')).toHaveText('Order at least 1.');
    await expect(typing(wrong)).toHaveAttribute('aria-invalid', 'true');
    expect(await box(wrong).locator('.field').getAttribute('data-error')).not.toBeNull();
    for (const property of ['color', 'background-color']) expect(await css(stepper(wrong, 'up').locator('[part="container"]'), property), property).toBe(await css(stepper(stacked, 'up').locator('[part="container"]'), property));
    // A text that is not a number: the input's words in the Field's row, and its description; gone when it is put right.
    const entry = one(page, 'entry');
    await entry.evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.type('many');
    await blurAll(page);
    await expect(field(entry).locator('.error-text')).toHaveText('Enter a number.');
    await expect(field(entry).locator('.supporting-text'), 'the help stays above the error text (FLD-7)').toHaveText('Up to 99 per order.');
    await expect(entry.getByRole('spinbutton', { name: 'Quantity', exact: true })).toHaveAccessibleDescription('Up to 99 per order. Enter a number.');
    await expect(typing(entry)).toHaveAttribute('aria-invalid', 'true');
    expect(await entry.evaluate((el) => [(el as unknown as { error: boolean }).error, (el as unknown as { value: unknown }).value]), 'its own error is not set, and the value is empty').toEqual([false, null]);
    await entry.evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('ArrowUp');
    await expect(field(entry).locator('.error-text')).toHaveCount(0);
    await expect(field(entry).locator('.supporting-text')).toHaveText('Up to 99 per order.');
    await expect(typing(entry)).not.toHaveAttribute('aria-invalid', /.*/);
  });

  test('NUM-48: in a form it is the one control the form sees — its name, its input’s value as a plain decimal number whatever the locale shows and an empty string while it holds none, reset to the value it was first given with the text and an entry error dropped, restored, left out while disabled — and it reports what its input reports: a missing value while required, and a bad input while an entry error lasts', async ({ page }) => {
    await mountHtml(
      page,
      `<form id="form"><fieldset id="set">
         <${TAG} id="n" name="weight" label="Weight" value="1.5" locale="de-DE" requirement="required" required-text="Required" invalid-text="Zahl eingeben." ${STEPPERS}></${TAG}>
         <${TAG} id="none" name="none" label="None" ${STEPPERS}></${TAG}>
         <${TAG} id="off" name="off" label="Off" value="3" disabled ${STEPPERS}></${TAG}>
         <${TAG} id="ro" name="fixed" label="Fixed" value="7" readonly></${TAG}>
       </fieldset></form>`,
    );
    const n = one(page, 'n');
    const data = () => page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#form')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
    const validity = async () => {
      await settle(page);
      return n.evaluate((el) => {
        const v = (el as unknown as HTMLInputElement).validity;
        return { valid: v.valid, missing: v.valueMissing, bad: v.badInput, message: (el as unknown as HTMLInputElement).validationMessage };
      });
    };
    expect(await n.evaluate((el) => [(el.constructor as unknown as { formAssociated: boolean }).formAssociated, (el as unknown as HTMLInputElement).form?.id, (el as unknown as HTMLInputElement).willValidate])).toEqual([true, 'form', true]);
    expect(await page.evaluate(() => [...document.querySelector<HTMLFormElement>('#form')!.elements].map((el) => el.id)), 'the form lists the elements, and no member').toEqual(['set', 'n', 'none', 'off', 'ro']);
    expect(await n.evaluate((el) => [...el.shadowRoot!.querySelectorAll('*')].map((member) => (member as unknown as { form?: unknown }).form ?? null)), 'the members are in no form').toEqual([null, null]);
    await expect(typing(n), 'shown in German').toHaveValue('1,5');
    expect(await data(), 'submitted plain; disabled left out; empty and read-only submitted').toEqual(['weight=1.5', 'none=', 'fixed=7']);
    // An edit that was not committed is not submitted; committed, it is.
    await n.evaluate((el: HTMLElement) => el.focus());
    await typing(n).evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('-2,25');
    await settle(page);
    expect((await data())[0]).toBe('weight=1.5');
    await blurAll(page);
    await settle(page);
    expect([(await data())[0], await n.evaluate((el) => (el as unknown as { value: number }).value)]).toEqual(['weight=-2.25', -2.25]);
    // A bad input while an entry error lasts — with the input's words — and a missing value with it.
    await n.evaluate((el: HTMLElement) => el.focus());
    await typing(n).evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('viel');
    await blurAll(page);
    expect(await validity()).toMatchObject({ valid: false, bad: true, missing: true, message: 'Zahl eingeben.' });
    expect([(await data())[0], await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.checkValidity())]).toEqual(['weight=', false]);
    // Reset: back to the value attribute — the text the person left and the entry error go with it.
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.reset());
    await settle(page);
    expect([await n.evaluate((el) => (el as unknown as { value: number }).value), (await data())[0]]).toEqual([1.5, 'weight=1.5']);
    await expect(typing(n)).toHaveValue('1,5');
    expect(await validity()).toMatchObject({ valid: true, bad: false, missing: false });
    await expect(field(n).locator('.supporting-text, .error-text')).toHaveCount(0);
    // Reset from an entry error whose value is already the first one (none): the same value is still a new one.
    const none = one(page, 'none');
    await none.evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.type('x');
    await blurAll(page);
    await settle(page);
    await expect(typing(none)).toHaveAttribute('aria-invalid', 'true');
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.reset());
    await settle(page);
    await expect(typing(none)).toHaveValue('');
    await expect(typing(none)).not.toHaveAttribute('aria-invalid', /.*/);
    // Restored on navigation: the browser hands the saved value back, and the input shows it.
    await n.evaluate((el) => (el as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('42.125', 'restore'));
    await settle(page);
    expect(await n.evaluate((el) => (el as unknown as { value: number }).value)).toBe(42.125);
    await expect(typing(n)).toHaveValue('42,125');
    // Required and empty: a missing value, in the browser's own words.
    await n.evaluate((el) => ((el as unknown as { value: null }).value = null));
    const empty = await validity();
    expect(empty).toMatchObject({ valid: false, bad: false, missing: true });
    expect(empty.message).not.toBe('');
    expect(await n.evaluate((el) => (el as unknown as { error: boolean }).error), 'it never sets error').toBe(false);
    // A disabled group of the form: left out, not validated, and its Field follows.
    await n.evaluate((el) => ((el as unknown as { value: number }).value = 5));
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = true));
    await settle(page);
    expect(await data()).toEqual([]);
    await expect(typing(n)).toBeDisabled();
    expect(await stepper(n, 'up').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled), 'both steppers, by the one exchange').toBe(true);
    await expect(field(n).locator('.frame')).toHaveAttribute('data-disabled', '');
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.checkValidity())).toBe(true);
  });

  test('NUM-47, NMI-31: a value the product sets on the element that is the value its input holds already still reaches the input — it ends an entry error, whose value is empty, and replaces a text being typed', async ({ page }) => {
    await mountHtml(page, `<${TAG} id="n" label="Weight" value="5" invalid-text="A number." ${STEPPERS}></${TAG}>`);
    const n = one(page, 'n');
    const set = (value: number | null) =>
      n.evaluate((el, v) => {
        (el as unknown as { value: number | null }).value = v;
      }, value);
    const now = async () => {
      await settle(page);
      return n.evaluate((el) => {
        const field = el.shadowRoot!.querySelector('tanrei-number-input')!.shadowRoot!.querySelector<HTMLInputElement>('.input')!;
        return [(el as unknown as { value: number | null }).value, field.value, field.getAttribute('aria-invalid') === 'true'];
      });
    };
    await typing(n).fill('abc');
    await blurAll(page);
    expect(await now()).toEqual([null, 'abc', true]);
    await set(null);
    expect(await now(), 'cleared: the text and the error are gone').toEqual([null, '', false]);
    await set(5);
    await typing(n).fill('77');
    await set(5);
    expect(await now()).toEqual([5, '5', false]);
  });
  test('NUM-48: where the browser has no words for a missing value, the message is the Field’s required text — the instance’s or the product’s — else the name, and never a sentence of Tanrei’s', async ({ page }) => {
    await page.addInitScript(() => {
      for (const native of [HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement]) Object.defineProperty(native.prototype, 'validationMessage', { get: () => '', configurable: true });
    });
    await page.goto('about:blank');
    await mountHtml(page, `<${TAG} id="own" label="Quantity" requirement="required" required-text="Needed" no-steppers></${TAG}><${TAG} id="named" label="Quantity" requirement="required" no-steppers></${TAG}>`);
    const message = (id: string) => one(page, id).evaluate((el) => [(el as unknown as HTMLInputElement).validity.valueMissing, (el as unknown as HTMLInputElement).validationMessage]);
    expect(await message('own')).toEqual([true, 'Needed']);
    expect(await message('named')).toEqual([true, 'Quantity']);
    await setWords(page, { requiredText: 'Required' });
    await expect.poll(() => message('named')).toEqual([true, 'Required']);
    expect(await message('own')).toEqual([true, 'Needed']);
  });

  test('NUM-49: focus given to it goes to its number input — by the product, by a press on the label row, on the box or on a floating label, and by a form’s report; a press on the help or the error text does nothing; it adds no stop: the field is one stop and the steppers are none; a press on a stepper steps and moves no focus; while focus is inside it its Field counts as focused', async ({ page }) => {
    await mountHtml(
      page,
      `<button id="before">Before</button>
       <form id="form"><${TAG} id="n" name="n" style="inline-size: 280px" label="Quantity" supporting-text="Up to 99 per order." requirement="required" required-text="Required" value="5" ${STEPPERS}></${TAG}></form>
       <${TAG} id="floating" style="inline-size: 280px" variant="outlined" label="Quantity" ${STEPPERS}></${TAG}>
       <button id="after">After</button>`,
      'm3-like',
    );
    const n = one(page, 'n');
    const inInput = async (id: string) => (await focusPath(page)).slice(0, 3).join(' > ') === `${TAG}#${id} > tanrei-number-input > input#input.input`;
    // By the product.
    await n.evaluate((el: HTMLElement) => el.focus());
    expect(await inInput('n'), 'focus()').toBe(true);
    await expect(field(n).locator('.frame'), 'its Field counts as focused').toHaveAttribute('data-focused', '');
    await blurAll(page);
    await expect(field(n).locator('.frame')).not.toHaveAttribute('data-focused', /.*/);
    // By a press on the Field's label row, on the box's padding, and on a floating label.
    await pressAt(field(n).locator('.label-row > .label'));
    expect(await inInput('n'), 'the label row').toBe(true);
    await blurAll(page);
    await pressAt(box(n).locator('.field > .container'), 'start');
    expect(await inInput('n'), 'the box').toBe(true);
    await blurAll(page);
    await pressAt(box(one(page, 'floating')).locator('.floating'));
    expect(await inInput('floating'), 'a floating label').toBe(true);
    await blurAll(page);
    // A press on the help does nothing.
    await pressAt(field(n).locator('.supporting-text'), 'start');
    expect(await focusPath(page), 'the help').toEqual(['body']);
    // A stepper steps and moves no focus: not from elsewhere, and not from the input.
    await page.locator('#before').focus();
    await pressAt(stepper(n, 'up'));
    await settle(page);
    expect([await n.evaluate((el) => (el as unknown as { value: number }).value), await focusPath(page)], 'focus was elsewhere and stays there').toEqual([6, ['button#before']]);
    await n.evaluate((el: HTMLElement) => el.focus());
    await pressAt(stepper(n, 'down'));
    await settle(page);
    expect([await n.evaluate((el) => (el as unknown as { value: number }).value), await inInput('n')], 'a focused input keeps its focus').toEqual([5, true]);
    // One stop, and no stepper among the stops.
    await page.locator('#before').focus();
    await tab(page);
    expect(await inInput('n')).toBe(true);
    await tab(page);
    expect(await inInput('floating'), 'the next field: no stepper was a stop').toBe(true);
    await tab(page);
    expect(await focusPath(page)).toEqual(['button#after']);
    await tab(page, { back: true });
    await tab(page, { back: true });
    expect(await inInput('n')).toBe(true);
    // By a form that reports its validity: the empty, required field takes focus in its input.
    await blurAll(page);
    await n.evaluate((el) => ((el as unknown as { value: null }).value = null));
    await settle(page);
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.reportValidity())).toBe(false);
    expect(await inInput('n'), 'the form’s report').toBe(true);
  });

  test('NUM-50: placed in a Field it is drawn as it is and reported as a field already, with the bare control named — the number input; in a field group it follows the group’s disabled through its own Field and takes nothing else from the group', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<tanrei-field id="outer" label="Outer" supporting-text="Outer help."><${TAG} id="inner" label="Inner" supporting-text="Inner help." ${STEPPERS}></${TAG}></tanrei-field>
       <tanrei-field-group id="group" label="Size" error error-text="Group error" requirement="required" required-text="Required"><${TAG} id="grouped" name="grouped" label="Width" supporting-text="Help." value="12" ${STEPPERS}></${TAG}></tanrei-field-group>`,
    );
    // Both frames are drawn, and the number field keeps its own name and description.
    await expect(one(page, 'outer').locator('.frame > .label-row > .label').first()).toHaveText('Outer');
    await expect(field(one(page, 'inner')).locator('.label-row > .label')).toHaveText('Inner');
    await expect(one(page, 'inner').getByRole('spinbutton', { name: 'Inner', exact: true })).toHaveAccessibleDescription('Inner help.');
    await expect.poll(() => seen.filter((w) => w.includes('FLD-15')).length).toBe(1);
    const report = seen.find((w) => w.includes('FLD-15'))!;
    expect(report).toContain('<tanrei-number-field> is already a field');
    expect(report).toContain('the bare control, <tanrei-number-input>');
    // In a group: nothing of the group's error, name or requirement reaches it…
    const grouped = one(page, 'grouped');
    await expect(grouped.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveAccessibleDescription('Help.');
    await expect(typing(grouped)).not.toHaveAttribute('aria-invalid', /.*/);
    await expect(typing(grouped)).not.toHaveAttribute('aria-required', /.*/);
    await expect(typing(grouped)).toBeEnabled();
    // …but its disabled, through its own Field: the label follows, and the input and both steppers are disabled.
    await one(page, 'group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect(typing(grouped)).toBeDisabled();
    await expect(field(grouped).locator('.frame')).toHaveAttribute('data-disabled', '');
    expect(await stepper(grouped, 'down').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled)).toBe(true);
    expect(await grouped.evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled), 'its own property does not change').toBe(false);
    await one(page, 'group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect(typing(grouped)).toBeEnabled();
  });

  test('NUM-51: it has no words of its own and reads none — the required and the optional text are read by its Field, the steppers’ names by its number input, each from the instance’s prop and then from the product’s words', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<${TAG} id="wordless" label="Quantity" requirement="required" value="1"></${TAG}>
       <${TAG} id="optional" label="Quantity" requirement="optional" no-steppers></${TAG}>
       <${TAG} id="own" label="Quantity" requirement="required" required-text="Needed" increment-label="More" decrement-label="Fewer" value="1"></${TAG}>`,
    );
    const names = (id: string) => one(page, id).evaluate((el) => [...el.shadowRoot!.querySelector('tanrei-number-input')!.shadowRoot!.querySelectorAll('tanrei-button')].map((button) => button.shadowRoot!.querySelector('button')!.getAttribute('aria-label')));
    const tag = (id: string) => field(one(page, id)).locator('tanrei-tag');
    // No words anywhere: no tag is drawn, the steppers are unnamed — and each member says so itself, by its own sentence.
    await expect(tag('wordless')).toHaveCount(0);
    await expect(tag('optional')).toHaveCount(0);
    expect(await names('wordless')).toEqual([null, null]);
    await expect.poll(async () => (await missingWords(page)).sort()).toEqual(['decrementLabel', 'incrementLabel', 'optionalText', 'requiredText']);
    expect(seen.filter((w) => w.includes('NUM-')), 'the number field reports no missing word itself').toEqual([]);
    expect(seen.some((w) => w.includes('FLD-24')) && seen.some((w) => w.includes('NMI-44')), 'the Field and the number input each report their own').toBe(true);
    // An instance's own props reach the member that reads them.
    await expect(tag('own')).toHaveAttribute('label', 'Needed');
    expect(await names('own')).toEqual(['Fewer', 'More']);
    // The product's words, set once: the Field reads its two, the number input its two; the instance's win.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional', incrementLabel: 'Increase', decrementLabel: 'Decrease' });
    await expect(tag('wordless')).toHaveAttribute('label', 'Required');
    await expect(tag('optional')).toHaveAttribute('label', 'Optional');
    await expect.poll(() => names('wordless')).toEqual(['Decrease', 'Increase']);
    await expect(tag('own')).toHaveAttribute('label', 'Needed');
    expect(await names('own')).toEqual(['Fewer', 'More']);
    expect(await missingWords(page)).toEqual([]);
    // The element holds no word and no reader of words: its source names none of the four keys but as props it forwards.
    expect(await one(page, 'wordless').evaluate((el) => ['requiredText', 'optionalText', 'incrementLabel', 'decrementLabel'].map((name) => (el as unknown as Record<string, unknown>)[name]))).toEqual(['', '', '', '']);
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

  test('every fixture is one spin button named by its label, and the element itself has no role and no name of its own', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id).getByRole('spinbutton', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
      expect(await host(page, f.id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('tabindex')]), f.id).toEqual([null, null, null]);
    }
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('every fixture is mounted 280 wide with its box filling it, and the steppers’ glyphs are drawn', async ({ page }) => {
    expect(spec.fixtures).toHaveLength(50);
    await expect(page.locator(`[data-fixture] > ${TAG}`)).toHaveCount(spec.fixtures.length);
    for (const f of spec.fixtures) {
      expect((await bounds(host(page, f.id))).width, `${f.id}: as wide as its column`).toBeCloseTo(280, 1);
      expect((await bounds(box(host(page, f.id)).locator('.field > .container'))).width, `${f.id}: the box fills it`).toBeCloseTo(280, 1);
      if (f.props.steppers !== false && !f.props.readOnly) await expect.poll(() => stepper(host(page, f.id), 'up').locator('.stepper-glyph').evaluate((el) => el.hasAttribute('data-drawn')), { message: `${f.id}: the glyph is drawn` }).toBe(true);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
