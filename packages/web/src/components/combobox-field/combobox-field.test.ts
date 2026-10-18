// <tanrei-combobox-field>, driven by specs/combobox-field.spec.json: a composed element — a Field around one
// combobox. What a composed element is, is held once for every such element by src/primitives/composed.test.ts (W13-1
// to W13-8: declarations, passing, parts, events and the value, the form, focus, the twins — each of the sixty fixtures
// the same pixels and the same control as the Field's fixture `combobox-<id>` — and reports). The members' own
// sentences are the members' tests (combobox.test.ts, CMB-1 to CMB-62; field.test.ts, FLD-1 to FLD-28). This file holds
// what the combobox field's own sentences add, CBF-1 to CBF-7, and repeats no test of a member.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { loadSpec, missingWords, mountFixtures, setWords, tab } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('combobox-field');
type P = Page;
const TAG = 'tanrei-combobox-field';
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const one = (page: P, id: string) => page.locator(`#${id}`);
/** The members, in an element's shadow root. */
const field = (element: Locator) => element.locator('tanrei-field');
const combobox = (element: Locator) => element.locator('tanrei-combobox');
/** What takes the typing: the native element that is the combobox. */
const typing = (element: Locator) => combobox(element).locator('.input');
const rows = (element: Locator) => combobox(element).locator('.scroll .row .option-label');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const read = (file: string) => fs.readFileSync(new URL(`../../../dist/${file}`, import.meta.url), 'utf8');
const CITIES = '<tanrei-option value="kyoto">Kyoto</tanrei-option><tanrei-option value="lisbon">Lisbon</tanrei-option><tanrei-option value="tokyo">Tokyo</tanrei-option>';
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
const focus = (element: Locator) => element.evaluate((el: HTMLElement) => el.focus());
const pressAt = async (target: Locator) => {
  const b = await bounds(target);
  await target.page().mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
/** What the element holds now, and what its combobox holds: the two are one (CBF-3). */
const held = (element: Locator) =>
  element.evaluate((el) => {
    const mine = el as HTMLElement & { value: string; inputValue: string; open: boolean };
    const inner = el.shadowRoot!.querySelector('tanrei-combobox') as HTMLElement & { value: string; inputValue: string; open: boolean };
    return { value: mine.value, inputValue: mine.inputValue, open: mine.open, attribute: el.hasAttribute('open'), member: { value: inner.value, inputValue: inner.inputValue, open: inner.open } };
  });
/** Records the four events on the element, in order, with what the element holds when each is heard. */
const listen = (element: Locator) =>
  element.evaluate((el) => {
    const w = window as unknown as { __events: string[] };
    w.__events = [];
    const mine = el as HTMLElement & { value: string; inputValue: string; open: boolean };
    for (const name of ['input', 'change', 'toggle', 'action']) el.addEventListener(name, (event) => w.__events.push(`${name} ${event.target === el ? '' : '(another target) '}value=${mine.value} text=${mine.inputValue} open=${String(mine.open)}`));
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));

test.describe('behavior', () => {
  test('CBF-1: it is a Field that frames one combobox, and nothing else — its shadow root holds the two members’ own elements, each prop is on the member it is from and the combobox’s own label, labelHidden, error and disabled are never set; the label-icon slot is the Field’s and the leading-icon slot the combobox’s, each passed on only while it is filled; it draws no part and writes no custom property of its own', async ({ page }) => {
    await mountHtml(
      page,
      `<${TAG} id="plain" label="City" label-hidden error disabled supporting-text="Help." requirement="required" required-text="Required" variant="outlined" size="large" value="tokyo" placeholder="Type a city" readonly allow-custom-value filter="none" no-chevron clearable clear-label="Clear" status="error" status-text="Failed" empty-text="None" separation="gap">
         ${CITIES}<span slot="label-icon">place</span><span slot="leading-icon">search</span>
       </${TAG}>
       <${TAG} id="bare" label="City">${CITIES}</${TAG}>`,
    );
    const built = await one(page, 'plain').evaluate((el) => {
      const root = el.shadowRoot!;
      // An element, or text that is not white space (the template's own markers are comments).
      const drawn = (node: Node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim());
      const named = (node: Node) => ((node as Element).localName === 'slot' ? `slot ${(node as HTMLSlotElement).name || '(default)'} → ${(node as Element).slot || '(default)'}` : ((node as Element).localName ?? '#text'));
      const [frame] = root.children;
      const inner = [...frame!.children].find((child) => child.localName === 'tanrei-combobox') as HTMLElement & Record<string, unknown>;
      const framing = frame as HTMLElement & Record<string, unknown>;
      return {
        root: [...root.childNodes].filter(drawn).map(named),
        inFrame: [...frame!.childNodes].filter(drawn).map(named),
        inCombobox: [...inner.childNodes].filter(drawn).map(named),
        frame: ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'disabled', 'requirement', 'requiredMark', 'requiredText', 'optionalText'].map((name) => framing[name]),
        control: ['variant', 'size', 'value', 'placeholder', 'readOnly', 'allowCustomValue', 'filter', 'noChevron', 'clearable', 'clearLabel', 'status', 'statusText', 'emptyText', 'separation'].map((name) => inner[name]),
        // The combobox's own props of the same names are never set by the element: they reach it through the Field.
        own: ['label', 'labelHidden', 'error', 'disabled'].map((name) => inner[name]),
        attributes: [...inner.attributes].map((attribute) => attribute.name).filter((name) => ['label', 'label-hidden', 'error', 'disabled'].includes(name)),
        // The name a value is submitted under is the element's: its combobox has none.
        name: inner.name,
        styles: [...root.querySelectorAll<HTMLElement>('*')].flatMap((child) => [...child.style]),
        display: getComputedStyle(el).display,
      };
    });
    expect(built.root).toEqual(['tanrei-field']);
    expect(built.inFrame).toEqual(['slot label-icon → label-icon', 'tanrei-combobox']);
    expect(built.inCombobox).toEqual(['slot (default) → (default)', 'slot leading-icon → leading-icon']);
    expect(built.frame).toEqual(['City', true, 'Help.', '', true, true, 'required', 'auto', 'Required', '']);
    expect(built.control).toEqual(['outlined', 'large', 'tokyo', 'Type a city', true, true, 'none', true, true, 'Clear', 'error', 'Failed', 'None', 'gap']);
    expect(built.own).toEqual(['', false, false, false]);
    expect(built.attributes).toEqual([]);
    expect(built.name).toBe('');
    expect(built.styles, 'no custom property, no style').toEqual([]);
    expect(built.display).toBe('block');
    // A passing slot is there only while the element has a child for it; the unnamed one, the options', always.
    const slots = (id: string) => one(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('slot')].map((slot) => slot.name || '(default)'));
    expect(await slots('bare')).toEqual(['(default)']);
    await one(page, 'bare').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="leading-icon">search</span>'));
    await expect.poll(() => slots('bare')).toEqual(['(default)', 'leading-icon']);
    await one(page, 'bare').evaluate((el) => el.querySelector('[slot="leading-icon"]')!.remove());
    await expect.poll(() => slots('bare')).toEqual(['(default)']);
    // `inline`, the combobox's own test attribute, is given on as a property: a fixture and its twin are staged alike.
    await one(page, 'bare').evaluate(async (el) => ((el as HTMLElement & { inline: boolean }).inline = true, await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
    expect(await combobox(one(page, 'bare')).evaluate((el) => (el as HTMLElement & { inline: boolean }).inline)).toBe(true);
  });

  test('CBF-1: it is as wide as the place it stands in and its combobox fills it — a block with no width of its own, in every look, never the platform’s default width and never the width of its options or its value; and what it shows is what the pair does: the Field’s label row above a stacked box, and in a floating look no label row and the name floated in the box', async ({ page }) => {
    const long = '<tanrei-option value="long">An option whose label is far longer than any text input is wide by default</tanrei-option>';
    await mountHtml(
      page,
      `<div style="inline-size: 520px"><${TAG} id="wide" label="City" supporting-text="Help." value="long">${long}</${TAG}></div>
       <div style="inline-size: 137px"><${TAG} id="narrow" label="City">${long}</${TAG}></div>
       <div style="inline-size: 300px"><${TAG} id="outlined" variant="outlined" label="City" requirement="required" required-mark="asterisk">${CITIES}</${TAG}></div>
       <div style="display: flex; inline-size: 400px"><${TAG} id="in-a-row" label="City" style="flex: 1">${CITIES}</${TAG}><span style="inline-size: 100px; flex: none"></span></div>`,
    );
    for (const [id, width] of [['wide', 520], ['narrow', 137], ['outlined', 300], ['in-a-row', 300]] as const) {
      expect(Math.abs((await bounds(one(page, id))).width - width), `${id}: as wide as its place`).toBeLessThanOrEqual(0.6);
      expect(Math.abs((await bounds(combobox(one(page, id)).locator('.field > .container'))).width - width), `${id}: its box fills it`).toBeLessThanOrEqual(0.6);
    }
    // The pair's two forms: the Field's row above a stacked box; a floating look's name in the box, with its asterisk.
    await expect(field(one(page, 'wide')).locator('.label-row > .label')).toHaveText('City');
    await expect(combobox(one(page, 'wide')).locator('.floating')).toHaveCount(0);
    await expect(field(one(page, 'outlined')).locator('.label-row')).toHaveCount(0);
    await expect(combobox(one(page, 'outlined')).locator('.floating')).toHaveText('City*');
    // The list is the combobox's alone, as wide as its container (CMB-22).
    await focus(one(page, 'wide'));
    await page.keyboard.press('ArrowDown');
    await expect(rows(one(page, 'wide'))).toHaveCount(1);
    // At rest: until its entrance ends the list is still growing toward the container's edge (CMB-45).
    await motionEnded(combobox(one(page, 'wide')).locator('.motion'));
    const [list, container] = [await bounds(combobox(one(page, 'wide')).locator('.list')), await bounds(combobox(one(page, 'wide')).locator('.field > .container'))];
    expect(Math.abs(list.width - container.width)).toBeLessThanOrEqual(0.6);
  });

  test('CBF-2: the options a product gives it are its combobox’s options — the same elements, never copies: they stay its own children, nothing in its shadow root holds one, and adding, removing, reordering or changing one changes the open list as it does for a combobox with the same children; under filter none, replacing every child from an input listener keeps the text being edited and the value', async ({ page }) => {
    const OPTIONS = '<tanrei-option value="kyoto">Kyoto</tanrei-option><tanrei-option-group label="Elsewhere"><tanrei-option value="lisbon" supporting-text="Portugal">Lisbon</tanrei-option></tanrei-option-group>';
    await mountHtml(page, `<${TAG} id="field" label="City" open inline value="kyoto">${OPTIONS}</${TAG}><tanrei-combobox id="alone" label="City" open inline value="kyoto">${OPTIONS}</tanrei-combobox><${TAG} id="remote" label="City" filter="none" value="kyoto">${CITIES}</${TAG}>`);
    const list = (id: string) =>
      page.evaluate((which) => {
        const el = document.getElementById(which)!;
        const root = (el.localName === 'tanrei-combobox' ? el : el.shadowRoot!.querySelector('tanrei-combobox')!).shadowRoot!;
        return [...root.querySelectorAll('.scroll .row, .scroll .group-title')].map((row) => (row.classList.contains('group-title') ? `[${row.textContent}]` : `${row.querySelector('.option-label')!.textContent}${row.querySelector('.option-supporting') ? ` (${row.querySelector('.option-supporting')!.textContent})` : ''}${row.getAttribute('aria-disabled') === 'true' ? ' ×' : ''}${row.getAttribute('aria-selected') === 'true' ? ' ✓' : ''}`));
      }, id);
    expect(await list('field')).toEqual(['Kyoto ✓', '[Elsewhere]', 'Lisbon (Portugal)']);
    expect(await list('field')).toEqual(await list('alone'));
    // Never copies: the options are the element's own children, and neither member holds one.
    expect(await one(page, 'field').evaluate((el) => [[...el.children].map((child) => child.localName), el.shadowRoot!.querySelectorAll('tanrei-option, tanrei-option-group').length, el.shadowRoot!.querySelector('slot:not([name])')!.assignedElements().length])).toEqual([['tanrei-option', 'tanrei-option-group'], 0, 2]);
    // Each change, made to both, changes both lists alike — and at once: in the turn after the change.
    const changes = [
      `owner.insertAdjacentHTML('beforeend', '<tanrei-option value="tokyo">Tokyo</tanrei-option>')`,
      `owner.querySelector('[value="tokyo"]').setAttribute('label', 'Tōkyō')`,
      `owner.querySelector('[value="tokyo"]').toggleAttribute('disabled', true)`,
      `owner.querySelector('[value="lisbon"]').textContent = 'Lisboa'`,
      `owner.prepend(owner.querySelector('[value="tokyo"]'))`,
      `owner.querySelector('tanrei-option-group').setAttribute('label', 'Europe')`,
      `owner.querySelector('[value="kyoto"]').remove()`,
    ];
    const expected = [
      ['Kyoto ✓', '[Elsewhere]', 'Lisbon (Portugal)', 'Tokyo'],
      ['Kyoto ✓', '[Elsewhere]', 'Lisbon (Portugal)', 'Tōkyō'],
      ['Kyoto ✓', '[Elsewhere]', 'Lisbon (Portugal)', 'Tōkyō ×'],
      ['Kyoto ✓', '[Elsewhere]', 'Lisboa (Portugal)', 'Tōkyō ×'],
      ['Tōkyō ×', 'Kyoto ✓', '[Elsewhere]', 'Lisboa (Portugal)'],
      ['Tōkyō ×', 'Kyoto ✓', '[Europe]', 'Lisboa (Portugal)'],
      ['Tōkyō ×', '[Europe]', 'Lisboa (Portugal)'],
    ];
    for (const [index, change] of changes.entries()) {
      await page.evaluate((body) => ['field', 'alone'].forEach((id) => new Function('owner', body)(document.getElementById(id))), change);
      await expect.poll(() => list('field'), { message: change }).toEqual(expected[index]);
      expect(await list('alone'), change).toEqual(expected[index]);
    }
    // filter none: the product filters on `input`, replacing every child. The text being edited and the value stay.
    const remote = one(page, 'remote');
    await remote.evaluate((el) => {
      el.addEventListener('input', () => {
        const typed = (el as HTMLElement & { inputValue: string }).inputValue;
        el.replaceChildren(...['Lima', 'Lisbon', 'Lille'].filter((name) => name.toLowerCase().startsWith(typed.toLowerCase())).map((name) => Object.assign(document.createElement('tanrei-option'), { value: name.toLowerCase(), textContent: name })));
      });
    });
    await focus(remote);
    await typing(remote).evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('li');
    await expect(rows(remote)).toHaveText(['Lima', 'Lisbon', 'Lille']);
    await page.keyboard.type('s');
    await expect(rows(remote)).toHaveText(['Lisbon']);
    expect(await held(remote)).toMatchObject({ value: 'kyoto', inputValue: 'lis', open: true });
  });

  test('CBF-3: it holds no value, no text and no open state of its own — each is its combobox’s at every moment: the new one in every listener of the event that reports it, and where no event does (a text given up on leaving, an open the product set); setting one on the element sets it on the combobox and fires nothing; open is reflected on the element as the combobox opens and closes its list', async ({ page }) => {
    await mountHtml(page, `<${TAG} id="field" label="Country" value="jp"><tanrei-option value="jp">Japan</tanrei-option><tanrei-option value="kr">Korea</tanrei-option><tanrei-option value="ky">Kyrgyzstan</tanrei-option></${TAG}><button id="next">Next</button>`);
    const element = one(page, 'field');
    await listen(element);
    expect(await held(element)).toEqual({ value: 'jp', inputValue: 'Japan', open: false, attribute: false, member: { value: 'jp', inputValue: 'Japan', open: false } });
    // Typing: the text and the open state are the new ones in the listeners; the value has not moved.
    await focus(element);
    await typing(element).evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('k');
    await settle(page);
    // (The combobox opens its list as it takes the text, so `toggle` is heard before the `input` that caused it has
    // reached the element: in both, the text is the typed one and `open` already true.)
    expect(await heard(page)).toEqual(['toggle value=jp text=k open=true', 'input value=jp text=k open=true']);
    expect(await held(element)).toMatchObject({ inputValue: 'k', open: true, attribute: true });
    // A choice: value and text are the new ones in `change`, and `open` in the `toggle` that follows.
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await heard(page)).toEqual(['change value=kr text=Korea open=true', 'toggle value=kr text=Korea open=false']);
    expect(await held(element)).toEqual({ value: 'kr', inputValue: 'Korea', open: false, attribute: false, member: { value: 'kr', inputValue: 'Korea', open: false } });
    // A text that names no option is given up on leaving: no event reports it, and the element's text is the value's again.
    await typing(element).evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('kyo');
    await settle(page);
    expect(await held(element)).toMatchObject({ value: 'kr', inputValue: 'kyo' });
    await heard(page);
    await tab(page);
    await settle(page);
    expect(await heard(page), 'no event reports the text that is written back').toEqual([]);
    expect(await held(element)).toMatchObject({ value: 'kr', inputValue: 'Korea', open: false, attribute: false });
    // The product sets each on the element: it is the combobox's, and nothing is fired.
    const set = (props: Record<string, unknown>) => element.evaluate(async (el, p) => (Object.assign(el, p), await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete), props);
    await set({ value: 'jp' });
    expect(await held(element)).toMatchObject({ value: 'jp', inputValue: 'Japan', member: { value: 'jp', inputValue: 'Japan', open: false } });
    await set({ inputValue: 'ky' });
    expect(await held(element)).toMatchObject({ value: 'jp', inputValue: 'ky', member: { value: 'jp', inputValue: 'ky', open: false } });
    await set({ open: true });
    await settle(page);
    expect(await held(element)).toMatchObject({ open: true, attribute: true, member: { value: 'jp', inputValue: 'ky', open: true } });
    await expect(rows(element)).toHaveText(['Kyrgyzstan']);
    await set({ open: false });
    await settle(page);
    expect(await held(element)).toMatchObject({ open: false, attribute: false });
    expect(await heard(page), 'nothing is fired for what the product set').toEqual([]);
    // What was set is read back at once, before the combobox has been given it.
    expect(await element.evaluate((el) => {
      const mine = el as HTMLElement & { inputValue: string; open: boolean };
      mine.inputValue = 'jap';
      mine.open = true;
      return [mine.inputValue, mine.open];
    })).toEqual(['jap', true]);
  });

  test('CBF-4: in a form it is the one control the form sees — it submits its combobox’s committed value under its name, never the text of an edit; Enter that chooses an option submits nothing, and Enter with no option active asks the element’s own form through its default button; its members take no part in the form', async ({ page }) => {
    await mountHtml(
      page,
      `<form id="form"><${TAG} id="field" name="city" label="City" requirement="required" required-text="Required" value="tokyo">${CITIES}</${TAG}><button id="send" name="via" value="send">Send</button></form>
       <script>window.log = []; const form = document.getElementById('form'); form.addEventListener('submit', (event) => { event.preventDefault(); window.log.push('submit ' + [...new FormData(form, event.submitter).entries()].join('|')); });</script>`,
    );
    const element = one(page, 'field');
    const entries = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([key, value]) => `${key}=${String(value)}`));
    const log = () => page.evaluate(() => (window as unknown as { log: string[] }).log.splice(0));
    expect(await entries()).toEqual(['city=tokyo']);
    expect(await page.evaluate(() => [...document.querySelector('form')!.elements].map((control) => control.localName))).toEqual([TAG, 'button']);
    expect(await element.evaluate((el) => [...el.shadowRoot!.querySelectorAll('tanrei-field, tanrei-combobox')].map((member) => [(member as HTMLElement & { form?: unknown }).form ?? null, member.getAttribute('name') || null]))).toEqual([[null, null], [null, null]]);
    // An edit that was not committed is not submitted.
    await focus(element);
    await typing(element).evaluate((el) => (el as HTMLInputElement).select());
    await page.keyboard.type('lis');
    await settle(page);
    expect(await entries(), 'the text is "lis", the value still tokyo').toEqual(['city=tokyo']);
    // Enter on the active option chooses it, and submits nothing.
    await page.keyboard.press('Enter');
    await settle(page);
    expect([await entries(), await log()]).toEqual([['city=lisbon'], []]);
    // Enter with no option active: the element's own form, through its default button.
    await page.keyboard.press('Enter');
    expect(await log()).toEqual(['submit city,lisbon|via,send']);
    // Emptied and required: what the combobox reports there, on the element, focusing the combobox's input.
    await element.evaluate(async (el) => (((el as HTMLElement & { value: string }).value = ''), await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
    await settle(page);
    await blurAll(page);
    expect(await element.evaluate((el) => [(el as unknown as HTMLInputElement).validity.valueMissing, (el as unknown as HTMLInputElement).reportValidity()])).toEqual([true, false]);
    expect(await focusPath(page)).toEqual([`${TAG}#field`, 'tanrei-combobox', 'input#input.input']);
  });

  test('CBF-5: focus given to it goes to its combobox’s input and it adds no stop — the input, then the clear button while it is shown; while focus is inside it, or its list is open, its Field’s rows are drawn focused; a press on its label row while the list is open is a press outside the combobox — the list closes with the reason outside, choosing nothing, and focus goes to the input', async ({ page }) => {
    await mountHtml(page, `<button id="before">Before</button><${TAG} id="field" label="City" supporting-text="Help." value="tokyo" clearable clear-label="Clear city">${CITIES}</${TAG}><button id="after">After</button>`);
    const element = one(page, 'field');
    const focused = () => field(element).locator('.frame').evaluate((el) => el.hasAttribute('data-focused'));
    await focus(element);
    expect(await focusPath(page)).toEqual([`${TAG}#field`, 'tanrei-combobox', 'input#input.input']);
    expect(await focused()).toBe(true);
    // Its stops are its combobox's, in that order.
    await page.locator('#before').focus();
    await tab(page);
    expect((await focusPath(page)).slice(0, 3)).toEqual([`${TAG}#field`, 'tanrei-combobox', 'input#input.input']);
    await tab(page);
    expect((await focusPath(page)).slice(0, 3)).toEqual([`${TAG}#field`, 'tanrei-combobox', 'tanrei-button.clear']);
    await tab(page);
    expect(await focusPath(page)).toEqual(['button#after']);
    expect(await focused()).toBe(false);
    // Open, with focus elsewhere: the rows are drawn focused because the combobox says so to its Field.
    await element.evaluate(async (el) => (((el as HTMLElement & { open: boolean }).open = true), await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
    await expect.poll(focused).toBe(true);
    expect(await focusPath(page), 'focus has not moved').toEqual(['button#after']);
    await element.evaluate(async (el) => (((el as HTMLElement & { open: boolean }).open = false), await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
    await expect.poll(focused).toBe(false);
    // A press on the label row while the list is open: outside the combobox.
    await focus(element);
    await page.keyboard.press('ArrowDown');
    await expect(rows(element)).toHaveCount(3);
    await page.keyboard.press('ArrowUp');
    await element.evaluate((el) => {
      const w = window as unknown as { __toggles: string[] };
      w.__toggles = [];
      el.addEventListener('toggle', (event) => w.__toggles.push(`${String((event as CustomEvent<{ open: boolean }>).detail.open)} ${(event as CustomEvent<{ reason?: string }>).detail.reason ?? ''}`));
      el.addEventListener('change', () => w.__toggles.push('change'));
    });
    await pressAt(field(element).locator('.label-row > .label'));
    await settle(page);
    expect(await page.evaluate(() => (window as unknown as { __toggles: string[] }).__toggles)).toEqual(['false outside']);
    expect(await held(element)).toMatchObject({ value: 'tokyo', open: false });
    expect(await focusPath(page)).toEqual([`${TAG}#field`, 'tanrei-combobox', 'input#input.input']);
    // A press on the help does nothing: no focus arrives.
    await blurAll(page);
    await pressAt(field(element).locator('.supporting-text'));
    expect(await focusPath(page)).toEqual(['body']);
  });

  test('CBF-6: placed in a Field it is drawn as it is and reported as a field already, with the bare control named — the combobox; in a field group it follows the group’s disabled through its own Field and takes nothing else from the group', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<tanrei-field id="outer" label="Outer" supporting-text="Outer help."><${TAG} id="inner" label="Inner" supporting-text="Inner help.">${CITIES}</${TAG}></tanrei-field>
       <tanrei-field-group id="group" label="Delivery" error error-text="Group error" requirement="required" required-text="Required"><${TAG} id="grouped" name="grouped" label="City" supporting-text="Help." value="tokyo">${CITIES}</${TAG}></tanrei-field-group>`,
    );
    // Both frames are drawn, and the combobox field keeps its own name and description.
    await expect(one(page, 'outer').locator('.frame > .label-row > .label').first()).toHaveText('Outer');
    await expect(field(one(page, 'inner')).locator('.label-row > .label')).toHaveText('Inner');
    await expect(one(page, 'inner').getByRole('combobox', { name: 'Inner', exact: true })).toHaveAccessibleDescription('Inner help.');
    await expect.poll(() => seen.filter((w) => w.includes('FLD-15')).length).toBe(1);
    const report = seen.find((w) => w.includes('FLD-15'))!;
    expect(report).toContain(`<${TAG}> is already a field`);
    expect(report).toContain('the bare control, <tanrei-combobox>');
    // In a group: nothing of the group's error, name or requirement reaches it…
    const grouped = one(page, 'grouped');
    await expect(grouped.getByRole('combobox', { name: 'City', exact: true })).toHaveAccessibleDescription('Help.');
    await expect(typing(grouped)).not.toHaveAttribute('aria-invalid', /.*/);
    await expect(typing(grouped)).not.toHaveAttribute('aria-required', /.*/);
    await expect(typing(grouped)).toBeEnabled();
    // …but its disabled, through its own Field: the label follows, and the input is disabled.
    await one(page, 'group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect(typing(grouped)).toBeDisabled();
    await expect(field(grouped).locator('.frame')).toHaveAttribute('data-disabled', '');
    expect(await grouped.evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled), 'its own property does not change').toBe(false);
    await one(page, 'group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect(typing(grouped)).toBeEnabled();
  });

  test('CBF-7: it has no words of its own and reads none — the required and the optional text are read by its Field, the empty text and the clear button’s name by its combobox, each from the instance’s prop and then from the product’s words', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<${TAG} id="wordless" label="City" requirement="required" clearable value="tokyo">${CITIES}</${TAG}>
       <${TAG} id="optional" label="City" requirement="optional">${CITIES}</${TAG}>
       <${TAG} id="own" label="City" requirement="required" required-text="Needed" clearable clear-label="Clear city" empty-text="Nothing here" value="tokyo">${CITIES}</${TAG}>`,
    );
    const tag = (id: string) => field(one(page, id)).locator('.requirement-tag .label');
    const clear = (id: string) => combobox(one(page, id)).locator('.clear').evaluate((el) => (el as HTMLElement & { label: string }).label);
    // No words: the Field draws the asterisk in the tag's place and no optional tag; the clear button has no name.
    await expect(tag('wordless')).toHaveCount(0);
    await expect(field(one(page, 'wordless')).locator('.label-row .asterisk')).toHaveCount(1);
    await expect(tag('optional')).toHaveCount(0);
    expect(await clear('wordless')).toBe('');
    await expect(tag('own')).toHaveText('Needed');
    expect(await clear('own')).toBe('Clear city');
    // Each is reported by the member that reads it, never by the element.
    await expect.poll(() => [seen.some((w) => w.includes('FLD-24') && w.includes('<tanrei-field>')), seen.some((w) => w.includes('CMB-20') && w.includes('<tanrei-combobox>'))]).toEqual([true, true]);
    expect(seen.filter((w) => w.includes(`<${TAG}>`))).toEqual([]);
    expect(await missingWords(page)).toEqual(['clearLabel', 'optionalText', 'requiredText']);
    // The product's words, set once: the members take them; an instance's own prop wins.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional', clearLabel: 'Clear', emptyText: 'No matches' });
    await settle(page);
    await expect(tag('wordless')).toHaveText('Required');
    await expect(tag('optional')).toHaveText('Optional');
    await expect(tag('own')).toHaveText('Needed');
    await expect.poll(() => clear('wordless')).toBe('Clear');
    expect(await clear('own')).toBe('Clear city');
    // The empty text: the product's words in one, the instance's own in the other.
    for (const [id, words] of [['wordless', 'No matches'], ['own', 'Nothing here']] as const) {
      await focus(one(page, id));
      await typing(one(page, id)).evaluate((el) => (el as HTMLInputElement).select());
      await page.keyboard.type('zz');
      await expect(combobox(one(page, id)).locator('.status [role="status"]'), id).toHaveText(words);
      await page.keyboard.press('Escape');
    }
  });

  test('CBF-1, CBF-5: with text enlarged to 200% in a window 320 wide nothing is cut, lies over another part or scrolls sideways — the label row, the box and the supporting row stand in order, the options wrap — and in a right-to-left layout the rows and the box start at the right', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mountHtml(
      page,
      `<${TAG} id="field" label="The city we deliver to" requirement="required" required-text="Required" supporting-text="Where the order is sent, once it is paid." value="tokyo" open inline status-text="3 cities shown. Keep typing to narrow.">${CITIES}</${TAG}>
       <div dir="rtl" style="margin-block-start: 480px"><${TAG} id="rtl" label="المدينة" supporting-text="إلى أين يُرسل الطلب." value="tokyo" clearable clear-label="مسح">${CITIES}</${TAG}></div>`,
    );
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await settle(page);
    const element = one(page, 'field');
    const fits = (locator: Locator) => locator.first().evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis');
    for (const part of [field(element).locator('.label-row > .label'), field(element).locator('.supporting-text'), combobox(element).locator('.option-label'), combobox(element).locator('.status .said')]) expect(await fits(part)).toBe(true);
    const [label, container, help] = [await bounds(field(element).locator('.label-row')), await bounds(combobox(element).locator('.field > .container')), await bounds(field(element).locator('.supporting'))];
    expect(label.y + label.height).toBeLessThanOrEqual(container.y + 0.6);
    expect(container.y + container.height).toBeLessThanOrEqual(help.y + 0.6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no sideways scrolling').toBe(true);
    // Right to left: the label, the text and the help start at the right; the chevron is nearest the left edge.
    const rtl = one(page, 'rtl');
    const [whole, name, text, chevron, helpRtl] = [await bounds(rtl), await bounds(field(rtl).locator('.label-row > .label')), await bounds(typing(rtl)), await bounds(combobox(rtl).locator('.chevron-glyph')), await bounds(field(rtl).locator('.supporting-text'))];
    expect(Math.abs(name.x + name.width - (whole.x + whole.width))).toBeLessThanOrEqual(0.6);
    expect(chevron.x).toBeLessThan(text.x);
    expect(Math.abs(helpRtl.x + helpRtl.width - (text.x + text.width)), 'the help starts where the text starts').toBeLessThanOrEqual(0.6);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    // (Sixty fixtures, twice.)
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`).join('\n')}`).toEqual([]);
    }
  });

  test('every fixture is one editable combobox named by its label, with a list of the same name where it is open, and the element itself has no role and no name of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      await expect(host(page, f.id).getByRole('combobox', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
      // (A list that shows no option — the empty text alone — is a list box nothing is in, which no engine lists.)
      if (f.props.open && !f.props.disabled && (await rows(host(page, f.id)).count())) await expect(host(page, f.id).getByRole('listbox', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
      expect(await host(page, f.id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('tabindex')]), f.id).toEqual([null, null, null]);
    }
  });

  test('forced colors: the Field’s rows are drawn in the text color and the combobox’s box with an edge in the control text color; an error is said by the invalid state and by the words, not by a color', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium');
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => ['stacked-supporting', 'stacked-required-error'].includes(f.id)) });
    const system = (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement('div');
        probe.style.color = n;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
    for (const id of ['stacked-supporting', 'stacked-required-error']) {
      expect(await css(field(host(page, id)).locator('.label-row > .label'), 'color'), id).toBe(await system('CanvasText'));
      // (The help, or — in the fixture in error, which has none — the error text.)
      expect(await css(field(host(page, id)).locator('.supporting-text, .error-text'), 'color'), id).toBe(await system('CanvasText'));
      expect(await css(combobox(host(page, id)).locator('.field > .container'), 'border-top-color'), id).toBe(await system('ButtonText'));
    }
    await expect(typing(host(page, 'stacked-required-error'))).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('every fixture is mounted, each names its twin among the Field’s fixtures, and an open one draws its list in its stage', async ({ page }) => {
    expect(spec.fixtures).toHaveLength(60);
    await expect(page.locator(`[data-fixture] > ${TAG}`)).toHaveCount(spec.fixtures.length);
    const twins = new Set(loadSpec('field').fixtures.map((f) => `field.${f.id}`));
    for (const f of spec.fixtures) {
      expect(f.twin, f.id).toBe(`field.combobox-${f.id}`);
      expect(twins.has(f.twin!), `${f.id}: its twin is a fixture of the Field`).toBe(true);
      expect(Math.abs((await bounds(host(page, f.id))).width - 280), `${f.id}: as wide as its column`).toBeLessThanOrEqual(0.6);
      if (f.props.open && !f.props.disabled) {
        const [stage, list] = [await bounds(page.locator(`[data-fixture="${f.id}"]`)), await bounds(combobox(host(page, f.id)).locator('.list'))];
        expect(list.y + list.height, `${f.id}: the list is inside its stage`).toBeLessThanOrEqual(stage.y + stage.height);
      }
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
