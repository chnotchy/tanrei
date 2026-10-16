// <tanrei-chip-field>, driven by specs/chip-field.spec.json: a composed element — a Field around one Text
// input, with a Chip for each entry in the Text input's entries place. What a composed element is, is held once for
// every such element by src/primitives/composed.test.ts (W13-1 to W13-8: declarations, passing, parts, events, the
// twins — each of the twenty-seven fixtures the same pixels and the same control as the Field's fixture
// `entries-<id>` — and reports). The members' own sentences are the members' tests (field.test.ts, text-input.test.ts
// with TXI-64 to TXI-66, chip.test.ts with CHP-38). This file holds the chip field's own sentences, CHF-1 to CHF-30 —
// among them what the shared test does not define for an element whose value is its own: the value, the form, focus.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { loadSpec, missingWords, mountFixtures, resolveToken, setWords, tab } from '../../../test/harness.js';

const spec = loadSpec('chip-field');
type P = Page;
const TAG = 'tanrei-chip-field';
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const read = (file: string) => fs.readFileSync(new URL(`../../../dist/${file}`, import.meta.url), 'utf8');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;

/** The words a product gives a chip field, as this test's product does. */
const WORDS =
  'remove-label="Remove {entry}" added-text="{entry} added" added-count-text="{count} added" removed-text="{entry} removed" invalid-text="Enter a full address." duplicate-text="That one is already in the list." limit-text="No more can be added."';
/** A product's check for an address, in one line. */
const ADDRESS = '^\\S+@\\S+\\.\\S+$';

interface Heard {
  name: string;
  detail: Record<string, unknown> | null;
  value: string[];
  text: string;
  data?: [string, string][];
}

function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const settle = (page: P) =>
  page.evaluate(async () => {
    const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
  });

/** A page of the product's own markup, with the default system and every element; every element has updated. */
async function mountHtml(page: P, body: string, head = '') {
  await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8" /><style>${read('tokens.css')} body { margin: 16px; }</style>${head}</head><body>${body}<script type="module">${read('tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
  await settle(page);
}

/**
 * One chip field `#f` in a form, between two buttons, with the product's words; every event of its spec is written
 * down as it is heard on the element (`window.log`), with the element's value and typed text at that moment; the
 * product's check refuses what `window.grammar` does not match, with `window.reason` as its words; the form's
 * submission is written down and stopped.
 */
async function mountField(page: P, attributes = '', { words = WORDS, dir = '', width = 320 }: { words?: string; dir?: string; width?: number } = {}) {
  await mountHtml(
    page,
    `<div id="place" style="inline-size: ${width}px"${dir ? ` dir="${dir}"` : ''}><button id="before">Before</button>
       <form id="form"><${TAG} id="f" name="to" label="Recipients" ${words} ${attributes}></${TAG}><button id="after">After</button></form></div>
     <script>
       window.log = [];
       const f = document.getElementById('f');
       for (const name of ['change', 'check', 'reject', 'input', 'action']) f.addEventListener(name, (e) => window.log.push({ name, detail: e.detail == null ? null : JSON.parse(JSON.stringify(e.detail)), value: [...f.value], text: f.inputValue }));
       f.addEventListener('check', (e) => { if (window.grammar && !new RegExp(window.grammar).test(e.detail.text)) { e.preventDefault(); if (window.reason) e.detail.reason = window.reason; } });
       document.getElementById('form').addEventListener('submit', (e) => { e.preventDefault(); window.log.push({ name: 'submit', detail: null, value: [...f.value], text: f.inputValue, data: [...new FormData(e.target).entries()] }); });
     </script>`,
  );
}
const grammar = (page: P, pattern = ADDRESS, reason = '') => page.evaluate(([p, r]) => Object.assign(window, { grammar: p, reason: r }), [pattern, reason]);
const heard = (page: P, ...names: string[]) => page.evaluate((only) => (window as unknown as { log: Heard[] }).log.filter((entry) => only.length === 0 || only.includes(entry.name)), names);
const forget = (page: P) => page.evaluate(() => void ((window as unknown as { log: Heard[] }).log.length = 0));
const names = async (page: P) => (await heard(page)).map((entry) => entry.name);

const f = (page: P) => page.locator('#f');
/** The typing part: the Text input's native element. */
const typing = (page: P) => page.locator('#f tanrei-text-input input.input');
/** The Text input's box, and the Field's drawn supporting row (its help, or its error). */
const inputBox = (page: P) => page.locator('#f tanrei-text-input div.container');
const row = (page: P) => page.locator('#f tanrei-field [part~="supporting-text"]');
/** The Field's error text, below the help, which stays (FLD-7, FLD-31; CHF-6). */
const errorRow = (page: P) => page.locator('#f tanrei-field [part~="error-text"]');
const requirementTag = (page: P) => page.locator('#f tanrei-field tanrei-tag.requirement-tag');
const chips = (page: P) => page.locator('#f tanrei-chip');
const chip = (page: P, index: number) => chips(page).nth(index);
const removeOf = (page: P, index: number) => chip(page, index).locator('.remove');
/** Puts the caret of the typing part at a place of its text (Home and End are not the caret's keys on every platform). */
const caretTo = (page: P, at: number | 'end') => typing(page).evaluate((el: HTMLInputElement, to) => el.setSelectionRange(to === 'end' ? el.value.length : to, to === 'end' ? el.value.length : to), at);
const focusTyping = (page: P) => f(page).evaluate((el: HTMLElement) => el.focus());
const set = (page: P, props: Record<string, unknown>) =>
  f(page).evaluate(async (el, given) => {
    Object.assign(el, given);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  }, props);

/** What the chip field holds, shows and says, and where focus is. */
async function look(page: P) {
  await settle(page);
  return page.evaluate(() => {
    const el = document.getElementById('f') as HTMLElement & { value: string[]; inputValue: string; error: boolean; errorText: string };
    const root = el.shadowRoot!;
    const field = root.querySelector('tanrei-field') as HTMLElement & { error: boolean; errorText: string };
    const native = root.querySelector('tanrei-text-input')!.shadowRoot!.querySelector<HTMLInputElement>('input.input')!;
    const active = root.activeElement as (HTMLElement & { label?: string }) | null;
    const focus = !active
      ? `outside:${document.activeElement?.id || document.activeElement?.localName || 'nothing'}`
      : active.localName === 'tanrei-chip'
        ? `${active.shadowRoot!.activeElement?.classList.contains('remove') ? 'remove' : 'entry'}:${active.label}`
        : 'typing';
    return {
      value: [...el.value],
      text: el.inputValue,
      drawn: native.value,
      chips: [...root.querySelectorAll<HTMLElement & { label: string }>('tanrei-chip')].map((one) => one.label),
      focus,
      caret: [native.selectionStart, native.selectionEnd],
      // The Field as the chip field gives it, and the product's own two props.
      error: field.error,
      errorText: field.errorText,
      own: { error: el.error, errorText: el.errorText },
      invalid: native.getAttribute('aria-invalid'),
      said: root.querySelector('.announcer')!.textContent,
    };
  });
}
const pasteInto = (page: P, data: string, how: 'data' | 'transfer' = 'data', inputType = 'insertFromPaste') =>
  typing(page).evaluate(
    (el, [text, carried, type]) => {
      const init: InputEventInit = { inputType: type, bubbles: true, composed: true, cancelable: true };
      if (carried === 'data') init.data = text;
      else {
        init.dataTransfer = new DataTransfer();
        init.dataTransfer.setData('text/plain', text!);
      }
      const event = new InputEvent('beforeinput', init);
      // An engine whose script cannot give an input event a data transfer: nothing to try (a real paste is its own test).
      if (carried === 'transfer' && !event.dataTransfer) return null;
      // Whether the browser would still insert it: false where the chip field took it.
      return el.dispatchEvent(event);
    },
    [data, how, inputType] as const,
  );

test.describe('behavior', () => {
  test('CHF-1: it is a Field that frames one Text input, with every entry a Chip in the Text input’s entries place — its shadow root holds the members’ own elements, a list and a live region that are drawn nowhere, and no token; it is a block as wide as its place, and its Text input fills it', async ({ page }) => {
    await mountField(page, `value='["ada@example.com","grace.hopper@example.org"]' supporting-text="Help." variant="outlined" size="large" type="email"`, { width: 420 });
    const built = await f(page).evaluate((el) => {
      const root = el.shadowRoot!;
      const drawn = (node: Node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim());
      const [frame, region] = root.children;
      const input = frame!.querySelector('tanrei-text-input') as HTMLElement & Record<string, unknown>;
      const list = input.firstElementChild as HTMLElement;
      return {
        root: [...root.childNodes].filter(drawn).map((node) => (node as Element).localName),
        inFrame: [...frame!.childNodes].filter(drawn).map((node) => (node as Element).localName ?? '#text'),
        inInput: [...input.childNodes].filter(drawn).map((node) => `${(node as Element).localName}[slot=${(node as Element).slot}][role=${(node as Element).getAttribute('role')}]`),
        items: [...list.children].map((item) => `${item.getAttribute('role')} > ${[...item.children].map((child) => child.localName).join(',')}`),
        boxes: [list, ...list.children].map((one) => getComputedStyle(one).display),
        region: { live: region!.getAttribute('aria-live'), role: region!.getAttribute('role'), text: region!.textContent, width: region!.getBoundingClientRect().width },
        input: ['variant', 'size', 'type'].map((name) => input[name]),
        own: ['label', 'error', 'disabled', 'name'].map((name) => input[name]),
        delegates: root.delegatesFocus,
        custom: [...root.querySelectorAll<HTMLElement>('*')].flatMap((child) => [...child.style]).filter((name) => name.startsWith('--')),
        sheet: [...root.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((text) => text.includes('--') || /color|background|border-(?!0)|font/.test(text.replace('border: 0px', ''))),
        display: getComputedStyle(el).display,
      };
    });
    expect(built.root, 'the Field and the live region, and no text').toEqual(['tanrei-field', 'span']);
    expect(built.inFrame, 'the Field holds its one control').toEqual(['tanrei-text-input']);
    expect(built.inInput, 'the Text input holds the list of entries, in its entries slot').toEqual(['div[slot=entries][role=list]']);
    expect(built.items).toEqual(['listitem > tanrei-chip', 'listitem > tanrei-chip']);
    expect(built.boxes, 'the list and its items have no box: the chips stand in the Text input’s own lines').toEqual(['contents', 'contents', 'contents']);
    expect(built.region).toEqual({ live: 'polite', role: null, text: '', width: 1 });
    expect(built.input).toEqual(['outlined', 'large', 'email']);
    expect(built.own, 'the Text input’s own label, error, disabled and name are never set').toEqual(['', false, false, '']);
    expect(built.delegates).toBe(false);
    expect({ custom: built.custom, sheet: built.sheet }, 'no custom property, no color, no type: it draws nothing of its own').toEqual({ custom: [], sheet: [] });
    expect(built.display).toBe('block');
    // As wide as its place, and its box fills it.
    expect((await bounds(f(page))).width).toBeCloseTo(420, 1);
    expect((await bounds(inputBox(page))).width).toBeCloseTo(420, 1);
    await page.locator('#place').evaluate((el: HTMLElement) => (el.style.inlineSize = '200px'));
    expect((await bounds(inputBox(page))).width).toBeCloseTo(200, 1);
    // Every chip stands inside the Text input's container, before the typing part.
    const container = await bounds(inputBox(page));
    for (const index of [0, 1]) {
      const box = await bounds(chip(page, index));
      expect(box.x >= container.x && box.x + box.width <= container.x + container.width && box.y >= container.y && box.y + box.height <= container.y + container.height, `entry ${index} is inside the box`).toBe(true);
    }
    const [last, typed] = [await bounds(chip(page, 1)), await bounds(typing(page))];
    expect(typed.y > last.y || typed.x >= last.x + last.width, 'the typing part follows the last entry').toBe(true);
  });

  test('CHF-2: each entry is an input Chip, small, in the Chip’s default variant, whose label is the entry’s text and whose remove action is named by removeLabel with {entry} filled, in the order of value; it has no icon and no avatar', async ({ page }) => {
    await mountField(page, `value='["ada@example.com","grace.hopper@example.org","alan@example.net"]'`);
    const drawn = await chips(page).evaluateAll((all) =>
      all.map((one) => {
        const el = one as HTMLElement & Record<string, unknown>;
        return { kind: el.kind, size: el.size, variant: el.variant, label: el.label, removeLabel: el.removeLabel, children: el.children.length, name: el.shadowRoot!.querySelector('.remove')!.getAttribute('aria-label'), text: el.shadowRoot!.querySelector('.label')!.textContent };
      }),
    );
    expect(drawn).toEqual(
      ['ada@example.com', 'grace.hopper@example.org', 'alan@example.net'].map((entry) => ({ kind: 'input', size: 'small', variant: 'outlined', label: entry, removeLabel: `Remove ${entry}`, children: 0, name: `Remove ${entry}`, text: entry })),
    );
    // In order, the first at the start of the first line.
    const [first, second] = [await bounds(chip(page, 0)), await bounds(chip(page, 1))];
    expect(first.y < second.y || first.x < second.x).toBe(true);
    expect(first.height).toBe(await resolveToken(page, '--tanrei-comp-chip-container-height-small'));
  });

  test('CHF-3: a value the product sets is shown exactly — not checked, not limited, the same text twice kept — with no change, check or reject and nothing announced, and it ends an entry error; an empty entry is left out and reported; inputValue is shown in the typing part and makes no entry; focus on an entry that left goes to the typing part', async ({ page }) => {
    const seen = warnings(page);
    await mountField(page, 'max-entries="2"');
    await grammar(page);
    // An entry error first.
    await focusTyping(page);
    await page.keyboard.type('not an address');
    await page.keyboard.press('Enter');
    expect((await look(page)).error).toBe(true);
    await forget(page);
    await set(page, { value: ['no grammar', 'b@example.com', 'b@example.com', 'c@example.com'] });
    const shown = await look(page);
    expect(shown.chips).toEqual(['no grammar', 'b@example.com', 'b@example.com', 'c@example.com']);
    expect(shown.value).toEqual(shown.chips);
    expect({ error: shown.error, said: shown.said }).toEqual({ error: false, said: '' });
    expect(await names(page)).toEqual([]);
    // Empty and white space are left out, and said in a debug build.
    await set(page, { value: ['a', '', '   ', 'b'] });
    expect((await look(page)).chips).toEqual(['a', 'b']);
    expect(seen.filter((text) => text.includes('CHF-3'))).toHaveLength(1);
    // inputValue: text in the typing part, and no entry of it.
    await set(page, { inputValue: 'c, d' });
    const typed = await look(page);
    expect({ text: typed.text, drawn: typed.drawn, chips: typed.chips }).toEqual({ text: 'c, d', drawn: 'c, d', chips: ['a', 'b'] });
    expect(await names(page)).toEqual([]);
    // Focus on an entry the product takes away goes to the typing part.
    await chip(page, 1).evaluate((el: HTMLElement) => el.focus());
    expect((await look(page)).focus).toBe('entry:b');
    await set(page, { value: ['a'] });
    expect((await look(page)).focus).toBe('typing');
    // …and stays on an entry that is still there.
    await chip(page, 0).evaluate((el: HTMLElement) => el.focus());
    await set(page, { value: ['a', 'z'] });
    expect((await look(page)).focus).toBe('entry:a');
  });

  test('CHF-4: typed text, without the white space at its ends, is offered on Enter — which then emits no action and submits no form — and when focus leaves the chip field for another control; not when focus moves between the typing part and an entry, and not when the window loses focus; an empty candidate empties the typing part and is refused to no one', async ({ page }) => {
    await mountField(page);
    await focusTyping(page);
    await page.keyboard.type('  ada@example.com ');
    await page.keyboard.press('Enter');
    let now = await look(page);
    expect({ value: now.value, text: now.text, drawn: now.drawn, focus: now.focus }).toEqual({ value: ['ada@example.com'], text: '', drawn: '', focus: 'typing' });
    expect((await names(page)).filter((name) => name !== 'input')).toEqual(['check', 'change']);
    // Focus leaves for another part of the product.
    await forget(page);
    await page.keyboard.type('grace@example.org');
    await page.locator('#after').focus();
    now = await look(page);
    expect({ value: now.value, text: now.text, focus: now.focus }).toEqual({ value: ['ada@example.com', 'grace@example.org'], text: '', focus: 'outside:after' });
    expect((await names(page)).filter((name) => name !== 'input')).toEqual(['check', 'change']);
    // Between the typing part and an entry is not leaving.
    await forget(page);
    await focusTyping(page);
    await page.keyboard.type('alan@example.net');
    await chip(page, 0).evaluate((el: HTMLElement) => el.focus());
    now = await look(page);
    expect({ value: now.value, text: now.text, focus: now.focus }).toEqual({ value: ['ada@example.com', 'grace@example.org'], text: 'alan@example.net', focus: 'entry:ada@example.com' });
    await focusTyping(page);
    expect((await names(page)).filter((name) => name !== 'input')).toEqual([]);
    // The window itself loses focus: the text stays typed text.
    await page.evaluate(() => {
      document.hasFocus = () => false;
      let active = document.activeElement as HTMLElement | null;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement as HTMLElement;
      active?.blur();
    });
    now = await look(page);
    expect({ value: now.value, text: now.text }).toEqual({ value: ['ada@example.com', 'grace@example.org'], text: 'alan@example.net' });
    expect((await names(page)).filter((name) => name !== 'input')).toEqual([]);
    await page.evaluate(() => delete (document as unknown as { hasFocus?: unknown }).hasFocus);
    // Only white space: nothing is made, nobody is told, and the typing part is emptied.
    await set(page, { inputValue: '' });
    await focusTyping(page);
    await page.keyboard.type('   ');
    await forget(page);
    await page.keyboard.press('Enter');
    now = await look(page);
    expect({ value: now.value.length, text: now.text, error: now.error }).toEqual({ value: 2, text: '', error: false });
    expect(await names(page)).toEqual([]);
  });

  test('CHF-5: a candidate is decided in order — the same text first (duplicate), then a full list (limit), then the product’s check (invalid), which carries the candidate and the entries so far and accepts when nobody answers; an answer given later is not read; an accepted candidate is added at the end, the typing part emptied, focus kept, change emitted once and the entry announced', async ({ page }) => {
    await mountField(page, `value='["a@example.com","b@example.com"]' max-entries="2"`);
    await grammar(page);
    await focusTyping(page);
    // The same text and a full list: duplicate, and the check is not asked.
    await page.keyboard.type('a@example.com');
    await page.keyboard.press('Enter');
    expect((await heard(page, 'check', 'reject', 'change')).map((entry) => [entry.name, entry.detail?.reason])).toEqual([['reject', 'duplicate']]);
    // A full list and a text the check would refuse: limit, and the check is not asked.
    await forget(page);
    await set(page, { inputValue: '' });
    await page.keyboard.type('no');
    await page.keyboard.press('Enter');
    expect((await heard(page, 'check', 'reject', 'change')).map((entry) => [entry.name, entry.detail?.reason])).toEqual([['reject', 'limit']]);
    // Room in the list: the check is asked, with the candidate and the entries so far.
    await forget(page);
    await set(page, { maxEntries: 0, inputValue: '' });
    await page.keyboard.type('no');
    await page.keyboard.press('Enter');
    let log = await heard(page, 'check', 'reject', 'change');
    expect(log.map((entry) => entry.name)).toEqual(['check', 'reject']);
    expect(log[0]!.detail).toEqual({ text: 'no', values: ['a@example.com', 'b@example.com'] });
    expect(log[1]!.detail).toMatchObject({ text: 'no', reason: 'invalid' });
    // Accepted: at the end of the list, with one change and one announcement, and focus where it was.
    await forget(page);
    await set(page, { inputValue: '' });
    await page.keyboard.type('c@example.com');
    await page.keyboard.press('Enter');
    log = await heard(page, 'check', 'reject', 'change');
    expect(log.map((entry) => entry.name)).toEqual(['check', 'change']);
    expect(log[1]).toMatchObject({ detail: { value: ['a@example.com', 'b@example.com', 'c@example.com'], added: ['c@example.com'], removed: [] }, value: ['a@example.com', 'b@example.com', 'c@example.com'], text: '' });
    const now = await look(page);
    expect({ chips: now.chips, text: now.text, focus: now.focus, said: now.said, error: now.error }).toEqual({ chips: ['a@example.com', 'b@example.com', 'c@example.com'], text: '', focus: 'typing', said: 'c@example.com added', error: false });
    // A check nobody answers accepts; an answer that comes later is not read.
    await page.evaluate(() => {
      Object.assign(window, { grammar: '' });
      document.getElementById('f')!.addEventListener('check', (event) => setTimeout(() => event.preventDefault()));
    });
    await page.keyboard.type('anything at all');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    expect((await look(page)).value).toEqual(['a@example.com', 'b@example.com', 'c@example.com', 'anything at all']);
  });

  test('CHF-6: a refused candidate stays text in the typing part with the caret at its end and is not added; while the entry error lasts the Field is in error whatever error is, showing the first of the check’s own words, the reason’s text and errorText; reject is emitted once and nothing more is announced; the error ends when the text is changed, not because focus leaves, and error itself never changes', async ({ page }) => {
    const seen = warnings(page);
    await mountField(page, `value='["a@example.com"]' error-text="Check the addresses."`);
    await grammar(page);
    await focusTyping(page);
    await page.keyboard.type('alan@');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    let now = await look(page);
    expect({ value: now.value, text: now.text, drawn: now.drawn, focus: now.focus, caret: now.caret }).toEqual({ value: ['a@example.com'], text: 'alan@', drawn: 'alan@', focus: 'typing', caret: [5, 5] });
    expect({ error: now.error, errorText: now.errorText, invalid: now.invalid, own: now.own, said: now.said }).toEqual({ error: true, errorText: 'Enter a full address.', invalid: 'true', own: { error: false, errorText: 'Check the addresses.' }, said: '' });
    expect((await heard(page, 'reject')).map((entry) => entry.detail)).toEqual([{ text: 'alan@', reason: 'invalid', message: 'Enter a full address.' }]);
    // The Field shows the words and ties them to the typing part.
    await expect(errorRow(page)).toHaveText('Enter a full address.');
    await expect(errorRow(page)).toBeVisible();
    // It does not end because focus leaves — the refused text is offered again there, and refused again — and focus is not brought back.
    await page.locator('#after').focus();
    now = await look(page);
    expect({ error: now.error, text: now.text, focus: now.focus }).toEqual({ error: true, text: 'alan@', focus: 'outside:after' });
    // It ends when the person changes the text.
    await focusTyping(page);
    await page.keyboard.type('x');
    now = await look(page);
    expect({ error: now.error, errorText: now.errorText, invalid: now.invalid }).toEqual({ error: false, errorText: 'Check the addresses.', invalid: null });
    // The check's own words come first; then the reason's; then errorText.
    await grammar(page, ADDRESS, 'That address has no domain.');
    await page.keyboard.press('Enter');
    expect((await look(page)).errorText).toBe('That address has no domain.');
    await grammar(page);
    await set(page, { invalidText: '', inputValue: 'alan@' });
    await page.keyboard.press('Enter');
    expect((await look(page)).errorText).toBe('Check the addresses.');
    await set(page, { inputValue: 'a@example.com' });
    await page.keyboard.press('Enter');
    expect((await look(page)).errorText).toBe('That one is already in the list.');
    // The product's own error is joined, never written.
    await set(page, { error: true, inputValue: '' });
    now = await look(page);
    expect({ error: now.error, errorText: now.errorText, own: now.own }).toEqual({ error: true, errorText: 'Check the addresses.', own: { error: true, errorText: 'Check the addresses.' } });
    // With no words at all the typing part is still invalid, and a debug build says so.
    await set(page, { error: false, errorText: '', inputValue: 'alan@' });
    await page.keyboard.press('Enter');
    now = await look(page);
    expect({ error: now.error, errorText: now.errorText, invalid: now.invalid }).toEqual({ error: true, errorText: '', invalid: 'true' });
    expect(seen.filter((text) => text.includes('CHF-6'))).toHaveLength(1);
    // It ends when an entry is removed, and when the product sets value.
    await chip(page, 0).evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Delete');
    expect((await look(page)).error).toBe(false);
    await page.keyboard.press('Enter');
    expect((await look(page)).error).toBe(true);
    await set(page, { value: ['z@example.com'] });
    expect((await look(page)).error).toBe(false);
  });

  test('CHF-7: while an input method is composing, nothing is made — the action key commits the composition and nothing else, and a separator in text that is still being composed is left to the input method; when the composition is committed its text is read for separators', async ({ page }) => {
    await mountField(page, `separators='["、"]'`);
    await focusTyping(page);
    await typing(page).evaluate((el: HTMLInputElement) => {
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));
      el.value = 'でざいん、';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, isComposing: true, inputType: 'insertCompositionText', data: 'でざいん、' }));
      // The key that commits the composition.
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true, isComposing: true }));
    });
    let now = await look(page);
    expect({ value: now.value, drawn: now.drawn }).toEqual({ value: [], drawn: 'でざいん、' });
    expect((await names(page)).filter((name) => name !== 'input')).toEqual([]);
    // Committed: the text is read, and the separator ends the entry.
    await typing(page).evaluate((el: HTMLInputElement) => {
      el.value = 'デザイン、';
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true, data: 'デザイン、' }));
    });
    await expect.poll(async () => (await look(page)).value).toEqual(['デザイン']);
    now = await look(page);
    expect({ text: now.text, drawn: now.drawn }).toEqual({ text: '', drawn: '' });
  });

  test('CHF-8: pasted text that holds a line break or a separator is read with the text already there as a row of candidates, each offered in order — the accepted become entries with one change and one announcement, the refused stay in the typing part joined by the first separator and a space, under the entry error of the first, with a reject each; pasted text that holds neither is the Text input’s own; a piece typed after the last separator stays typed', async ({ page }) => {
    await mountField(page, `separators='[",",";"]'`);
    await grammar(page);
    await focusTyping(page);
    await page.keyboard.type('ada@');
    // Text with neither a line break nor a separator: left to the browser.
    expect(await pasteInto(page, 'example.com'), 'not taken').toBe(true);
    expect((await look(page)).value).toEqual([]);
    // A list from elsewhere, with the text already there, an empty piece, and two that the check refuses.
    expect(await pasteInto(page, 'example.com, grace@example.org\nnot one;; alan@example.net \r\nnor this'), 'taken').toBe(false);
    let now = await look(page);
    expect(now.value).toEqual(['ada@example.com', 'grace@example.org', 'alan@example.net']);
    expect({ text: now.text, drawn: now.drawn, error: now.error, errorText: now.errorText, said: now.said }).toEqual({ text: 'not one, nor this', drawn: 'not one, nor this', error: true, errorText: 'Enter a full address.', said: '3 added' });
    const log = await heard(page, 'check', 'change', 'reject');
    expect(log.map((entry) => entry.name)).toEqual(['check', 'check', 'check', 'check', 'check', 'change', 'reject', 'reject']);
    expect(log.filter((entry) => entry.name === 'check').map((entry) => (entry.detail!.values as string[]).length), 'each is asked with the entries so far').toEqual([0, 1, 2, 2, 3]);
    expect(log.find((entry) => entry.name === 'change')!.detail).toEqual({ value: ['ada@example.com', 'grace@example.org', 'alan@example.net'], added: ['ada@example.com', 'grace@example.org', 'alan@example.net'], removed: [] });
    expect(log.filter((entry) => entry.name === 'reject').map((entry) => entry.detail!.text)).toEqual(['not one', 'nor this']);
    // Carried as a data transfer (an engine that gives a paste no data), and dropped: the same.
    await set(page, { value: [], inputValue: '' });
    const carried = await pasteInto(page, 'a@example.com\nb@example.com', 'transfer');
    if (carried === null) await pasteInto(page, 'a@example.com\nb@example.com');
    else expect(carried).toBe(false);
    expect(await pasteInto(page, 'c@example.com,d@example.com', 'data', 'insertFromDrop')).toBe(false);
    now = await look(page);
    expect({ value: now.value, text: now.text }).toEqual({ value: ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com'], text: '' });
    // With no separators listed the refused are joined by one space, and a line break still cuts.
    await set(page, { value: [], inputValue: '', separators: [] });
    expect(await pasteInto(page, 'one\ntwo\ne@example.com')).toBe(false);
    now = await look(page);
    expect({ value: now.value, text: now.text }).toEqual({ value: ['e@example.com'], text: 'one two' });
    // Filled in by the platform — an edit that is no typing: the piece after the last separator is offered with the others.
    await set(page, { value: [], inputValue: '', separators: [','] });
    await typing(page).evaluate((el: HTMLInputElement) => {
      el.value = 'f@example.com,g@example.com';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' }));
    });
    now = await look(page);
    expect({ value: now.value, text: now.text }).toEqual({ value: ['f@example.com', 'g@example.com'], text: '' });
    // Typed: the piece after the separator stays typed text.
    await set(page, { value: [], inputValue: '' });
    await focusTyping(page);
    await page.keyboard.type('h@example.com,i@exam');
    now = await look(page);
    expect({ value: now.value, text: now.text }).toEqual({ value: ['h@example.com'], text: 'i@exam' });
  });

  test('CHF-8: a real paste — copied from a text of several lines and pasted with the keyboard — makes an entry of each line', async ({ page }) => {
    await mountField(page);
    await page.evaluate(() => document.getElementById('place')!.insertAdjacentHTML('afterbegin', '<textarea id="source">ada@example.com\ngrace@example.org\nalan@example.net</textarea>'));
    await page.locator('#source').focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+c');
    await focusTyping(page);
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(async () => (await look(page)).value).toEqual(['ada@example.com', 'grace@example.org', 'alan@example.net']);
    const now = await look(page);
    expect({ text: now.text, said: now.said, focus: now.focus }).toEqual({ text: '', said: '3 added', focus: 'typing' });
  });

  test('CHF-9: a separator the product lists ends an entry wherever it comes to stand in the typing part — found in the text, not by the key: the text before it is offered, the separator is kept nowhere and the text after it stays typed; after nothing but white space it is dropped; an empty separator is ignored and reported; white space is a separator only where it is listed', async ({ page }) => {
    const seen = warnings(page);
    await mountField(page, `separators='[",", "", "::"]'`);
    expect(seen.filter((text) => text.includes('CHF-9'))).toHaveLength(1);
    await focusTyping(page);
    // Text that arrives with no key at all (a touch keyboard, dictation).
    await page.keyboard.insertText('design tokens,');
    let now = await look(page);
    expect({ value: now.value, text: now.text, drawn: now.drawn }).toEqual({ value: ['design tokens'], text: '', drawn: '' });
    // A space is no separator here: an entry may hold one. A separator of two characters ends one.
    await page.keyboard.type('right to left::');
    expect((await look(page)).value).toEqual(['design tokens', 'right to left']);
    // In the middle of typed text: what stands before is offered, what stands after stays.
    await page.keyboard.type('colormotion');
    for (let step = 0; step < 6; step++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.type(',');
    now = await look(page);
    expect({ value: now.value, text: now.text }).toEqual({ value: ['design tokens', 'right to left', 'color'], text: 'motion' });
    // After nothing but white space: dropped, and nothing is made.
    await set(page, { inputValue: '' });
    await forget(page);
    await page.keyboard.type('  ,');
    now = await look(page);
    expect({ value: now.value.length, text: now.text.trim() }).toEqual({ value: 3, text: '' });
    expect(await heard(page, 'check', 'change', 'reject')).toEqual([]);
    // White space where the product lists it.
    await set(page, { separators: [' '], inputValue: '', value: [] });
    await page.keyboard.type('ada@example.com grace@');
    now = await look(page);
    expect({ value: now.value, text: now.text }).toEqual({ value: ['ada@example.com'], text: 'grace@' });
  });

  test('CHF-9: a refused text that holds a separator is not offered again by every keystroke: only what an edit adds is read for separators, and Enter or leaving reads the whole text as a row again', async ({ page }) => {
    await mountField(page, `separators='[","]'`);
    await grammar(page);
    await focusTyping(page);
    expect(await pasteInto(page, 'ada@, grace@')).toBe(false);
    expect((await look(page)).text).toBe('ada@, grace@');
    await forget(page);
    // Mending the second: nothing is asked while it is typed.
    await page.keyboard.type('example.org');
    expect(await heard(page, 'check', 'reject', 'change')).toEqual([]);
    expect((await look(page)).error).toBe(false);
    // Enter reads the row: the first is refused again and stays, the second becomes an entry.
    await page.keyboard.press('Enter');
    const now = await look(page);
    expect({ value: now.value, text: now.text, error: now.error }).toEqual({ value: ['grace@example.org'], text: 'ada@', error: true });
  });

  test('CHF-10: with as many entries as maxEntries the typing part stays focusable and editable and every candidate is refused with the reason limit; nothing is disabled, hidden or marked beforehand and no count is drawn; a maxEntries that is no whole number of 0 or more is no limit, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountField(page, `value='["a","b"]' max-entries="2" supporting-text="Up to 2."`);
    let now = await look(page);
    expect({ error: now.error, invalid: now.invalid }).toEqual({ error: false, invalid: null });
    await expect(typing(page)).toBeEditable();
    await expect(f(page).locator('tanrei-field [part~="counter"]')).toHaveCount(0);
    await focusTyping(page);
    await page.keyboard.type('c');
    expect((await look(page)).text).toBe('c');
    await page.keyboard.press('Enter');
    now = await look(page);
    expect({ value: now.value, text: now.text, errorText: now.errorText }).toEqual({ value: ['a', 'b'], text: 'c', errorText: 'No more can be added.' });
    expect((await heard(page, 'check', 'reject')).map((entry) => [entry.name, entry.detail?.reason])).toEqual([['reject', 'limit']]);
    // It never cuts a list the product sets.
    await set(page, { value: ['a', 'b', 'c', 'd'], inputValue: '' });
    expect((await look(page)).chips).toHaveLength(4);
    for (const bad of [-1, 1.5, Number.NaN]) {
      await set(page, { maxEntries: bad, inputValue: 'e' });
      await page.keyboard.press('Enter');
      await set(page, { value: ['a'] });
    }
    expect(seen.filter((text) => text.includes('CHF-10')).length).toBeGreaterThanOrEqual(2);
    expect((await heard(page, 'reject')).length, 'no further refusal').toBe(1);
  });

  test('CHF-11: the chip field is one stop — its typing part; every Chip and every remove action is out of the Tab order and stays focusable; from an entry Tab moves to the typing part and Shift+Tab to what stands before the chip field; a press on the box outside every entry focuses the typing part', async ({ page }) => {
    await mountField(page, `value='["ada@example.com","grace.hopper@example.org","alan@example.net"]'`);
    await page.locator('#before').focus();
    await tab(page);
    expect((await look(page)).focus).toBe('typing');
    await tab(page);
    expect((await look(page)).focus).toBe('outside:after');
    await tab(page, { back: true });
    expect((await look(page)).focus).toBe('typing');
    await tab(page, { back: true });
    expect((await look(page)).focus).toBe('outside:before');
    expect(await chips(page).evaluateAll((all) => all.map((one) => one.getAttribute('tabindex')))).toEqual(['-1', '-1', '-1']);
    // From an entry.
    await chip(page, 1).evaluate((el: HTMLElement) => el.focus());
    expect((await look(page)).focus).toBe('entry:grace.hopper@example.org');
    await tab(page);
    expect((await look(page)).focus).toBe('typing');
    await chip(page, 1).evaluate((el: HTMLElement) => el.focus());
    await tab(page, { back: true });
    expect((await look(page)).focus).toBe('outside:before');
    // The remove action is reached by a pointer and by script, as the element it is.
    await removeOf(page, 0).evaluate((el: HTMLElement) => el.focus());
    expect((await look(page)).focus).toBe('remove:ada@example.com');
    // A press on the box, in the gap between two lines of entries and beside the last entry.
    await page.locator('#after').focus();
    const container = await bounds(inputBox(page));
    await page.mouse.click(container.x + container.width - 3, container.y + 3);
    expect((await look(page)).focus).toBe('typing');
    // A press on the label does what the Field says (FLD-12): the control takes focus.
    await page.locator('#after').focus();
    await f(page).locator('tanrei-field .label-row .label').click();
    expect((await look(page)).focus).toBe('typing');
  });

  test('CHF-12: with the caret at the start of the typing part and nothing selected, Backspace or the arrow that points to the line’s start moves focus to the last entry and removes nothing; not from elsewhere in the text, not while the list is empty, and never for the repeats of a held key', async ({ page }) => {
    await mountField(page, `value='["a","b"]'`);
    await focusTyping(page);
    await page.keyboard.press('Backspace');
    let now = await look(page);
    expect({ focus: now.focus, value: now.value }).toEqual({ focus: 'entry:b', value: ['a', 'b'] });
    expect(await names(page)).toEqual([]);
    await focusTyping(page);
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('entry:b');
    // The other arrow is the caret's.
    await focusTyping(page);
    await page.keyboard.press('ArrowRight');
    expect((await look(page)).focus).toBe('typing');
    // With text: only from its start, with nothing selected.
    await page.keyboard.type('xy');
    await page.keyboard.press('Backspace');
    now = await look(page);
    expect({ focus: now.focus, text: now.text }).toEqual({ focus: 'typing', text: 'x' });
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('typing');
    // A held Backspace erases the text and stops at its start.
    await caretTo(page, 'end');
    await page.keyboard.type('yz');
    await page.keyboard.down('Backspace');
    for (let repeat = 0; repeat < 6; repeat++) await page.keyboard.down('Backspace');
    await page.keyboard.up('Backspace');
    now = await look(page);
    expect({ focus: now.focus, text: now.text, value: now.value }).toEqual({ focus: 'typing', text: '', value: ['a', 'b'] });
    // A new press reaches the entry.
    await page.keyboard.press('Backspace');
    expect((await look(page)).focus).toBe('entry:b');
    // An empty list: the key is the Text input's.
    await set(page, { value: [] });
    await focusTyping(page);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('typing');
  });

  test('CHF-12, CHF-13, CHF-27: in a right-to-left layout the arrows move the way they point — Right Arrow from the start of the typing part to the last entry, Left Arrow past the last entry back to the typing part — and the order of value and of focus stays the order the entries were made in', async ({ page }) => {
    await mountField(page, `value='["אחת","שתיים","שלוש"]'`, { dir: 'rtl' });
    await focusTyping(page);
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('typing');
    await page.keyboard.press('ArrowRight');
    expect((await look(page)).focus).toBe('entry:שלוש');
    await page.keyboard.press('ArrowRight');
    expect((await look(page)).focus).toBe('entry:שתיים');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect((await look(page)).focus).toBe('entry:אחת');
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('typing');
    // Each line starts at the right: the first entry is the rightmost, and the next stands to its left.
    const [first, second] = [await bounds(chip(page, 0)), await bounds(chip(page, 1))];
    const container = await bounds(inputBox(page));
    expect(first.x + first.width).toBeGreaterThan(container.x + container.width / 2);
    expect(second.y > first.y || second.x + second.width <= first.x).toBe(true);
  });

  test('CHF-13: on an entry the arrows move focus the way they point without activating or removing, Home and End go to the first and the last, the arrow past the last entry goes to the typing part with the caret at the start of its text, the arrow before the first and Up and Down do nothing, Escape returns to the typing part, and a character is typed in the typing part; focus that arrives by the keyboard shows the Chip’s focus ring', async ({ page }) => {
    await mountField(page, `value='["a","b","c"]'`);
    await set(page, { inputValue: 'xy' });
    await focusTyping(page);
    await caretTo(page, 0);
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('entry:c');
    expect(await chip(page, 2).locator('.container').evaluate((el) => el.matches(':focus-visible')), 'the Chip’s focus ring').toBe(true);
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('entry:b');
    await page.keyboard.press('Home');
    expect((await look(page)).focus).toBe('entry:a');
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus, 'no wrapping').toBe('entry:a');
    for (const key of ['ArrowUp', 'ArrowDown']) {
      await page.keyboard.press(key);
      expect((await look(page)).focus, key).toBe('entry:a');
    }
    await page.keyboard.press('End');
    expect((await look(page)).focus).toBe('entry:c');
    await page.keyboard.press('ArrowRight');
    let now = await look(page);
    expect({ focus: now.focus, caret: now.caret }).toEqual({ focus: 'typing', caret: [0, 0] });
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Escape');
    expect((await look(page)).focus).toBe('typing');
    // A character on an entry is typed in the typing part.
    await caretTo(page, 0);
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('entry:c');
    await page.keyboard.type('z');
    now = await look(page);
    expect(now.focus).toBe('typing');
    expect(now.text.split('').sort().join('')).toBe('xyz');
    expect({ value: now.value }).toEqual({ value: ['a', 'b', 'c'] });
    expect((await names(page)).filter((name) => name !== 'input')).toEqual([]);
  });

  test('CHF-14: Backspace on an entry removes it and moves focus to the entry before — the one after where it was the first; Delete and the remove action move focus to the entry after, on the Chip and never on a remove action, or to the typing part where none follows; each emits change once and announces the removal, and a held key removes one entry', async ({ page }) => {
    await mountField(page, `value='["a","b","c","d","e"]'`);
    await chip(page, 2).evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Backspace');
    let now = await look(page);
    expect({ value: now.value, focus: now.focus, said: now.said }).toEqual({ value: ['a', 'b', 'd', 'e'], focus: 'entry:b', said: 'c removed' });
    expect((await heard(page)).map((entry) => [entry.name, entry.detail])).toEqual([['change', { value: ['a', 'b', 'd', 'e'], added: [], removed: ['c'] }]]);
    // The first: Backspace goes to the one that followed.
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    now = await look(page);
    expect({ value: now.value, focus: now.focus }).toEqual({ value: ['b', 'd', 'e'], focus: 'entry:b' });
    // Delete: to the one that followed; held, it removes one.
    await forget(page);
    await page.keyboard.down('Delete');
    await page.keyboard.down('Delete');
    await page.keyboard.down('Delete');
    await page.keyboard.up('Delete');
    now = await look(page);
    expect({ value: now.value, focus: now.focus }).toEqual({ value: ['d', 'e'], focus: 'entry:d' });
    expect(await names(page)).toEqual(['change']);
    // Delete on the last: the typing part.
    await page.keyboard.press('End');
    await page.keyboard.press('Delete');
    now = await look(page);
    expect({ value: now.value, focus: now.focus, said: now.said }).toEqual({ value: ['d'], focus: 'typing', said: 'e removed' });
    // The remove action, by a pointer: the entry after, on its Chip.
    await set(page, { value: ['a', 'b', 'c'] });
    await forget(page);
    await removeOf(page, 0).click();
    now = await look(page);
    expect({ value: now.value, focus: now.focus }).toEqual({ value: ['b', 'c'], focus: 'entry:b' });
    expect(await names(page)).toEqual(['change']);
    await removeOf(page, 1).click();
    await removeOf(page, 0).click();
    now = await look(page);
    expect({ value: now.value, focus: now.focus }).toEqual({ value: [], focus: 'typing' });
  });

  test('CHF-15: activating an entry’s Chip — by a press, Enter or Space — takes it back: it leaves the list, its text stands in the typing part with the caret at its end and focus there, and change is emitted once; text already typed is offered first and, if refused, nothing more happens; nothing is announced for it, and the text is checked again when it is offered', async ({ page }) => {
    await mountField(page, `value='["ada@example.com","grace@example.org","alan@example.net"]'`);
    await grammar(page);
    await chip(page, 1).locator('.label').click();
    let now = await look(page);
    expect({ value: now.value, text: now.text, drawn: now.drawn, focus: now.focus, caret: now.caret, said: now.said }).toEqual({ value: ['ada@example.com', 'alan@example.net'], text: 'grace@example.org', drawn: 'grace@example.org', focus: 'typing', caret: [17, 17], said: '' });
    expect((await heard(page)).map((entry) => [entry.name, entry.detail])).toEqual([['change', { value: ['ada@example.com', 'alan@example.net'], added: [], removed: ['grace@example.org'] }]]);
    // Typed text is offered first: accepted, it is an entry at the end, and the entry taken back follows it out.
    await forget(page);
    await caretTo(page, 0);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Home');
    expect((await look(page)).focus).toBe('entry:ada@example.com');
    await page.keyboard.press('Enter');
    now = await look(page);
    expect({ value: now.value, text: now.text, focus: now.focus }).toEqual({ value: ['alan@example.net', 'grace@example.org'], text: 'ada@example.com', focus: 'typing' });
    expect((await heard(page, 'check', 'change', 'reject')).map((entry) => [entry.name, entry.detail])).toEqual([
      ['check', { text: 'grace@example.org', values: ['ada@example.com', 'alan@example.net'] }],
      ['change', { value: ['alan@example.net', 'grace@example.org'], added: ['grace@example.org'], removed: ['ada@example.com'] }],
    ]);
    // Refused: nothing more than the refusal.
    await forget(page);
    await set(page, { inputValue: 'not one' });
    await chip(page, 0).evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Space');
    now = await look(page);
    expect({ value: now.value, text: now.text, error: now.error }).toEqual({ value: ['alan@example.net', 'grace@example.org'], text: 'not one', error: true });
    expect((await heard(page, 'check', 'change', 'reject')).map((entry) => entry.name)).toEqual(['check', 'reject']);
    // The text taken back is typed text like any other: it becomes an entry again at the end of the list.
    await set(page, { inputValue: '' });
    await chip(page, 0).evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    expect((await look(page)).value).toEqual(['grace@example.org', 'alan@example.net']);
  });

  test('CHF-16: the action key on an empty typing part is the Text input’s — it emits action and asks for the form’s submission; input is emitted for every change of the typed text, with that text; change is emitted only for a change of the list, never for typed text and never when focus leaves with nothing made', async ({ page }) => {
    await mountField(page, `value='["a@example.com"]'`);
    await focusTyping(page);
    await page.keyboard.press('Enter');
    let log = await heard(page);
    expect(log.map((entry) => entry.name)).toEqual(['action', 'submit']);
    expect(log[1]!.data).toEqual([['to', 'a@example.com']]);
    await forget(page);
    await page.keyboard.type('ab');
    log = await heard(page);
    expect(log.map((entry) => [entry.name, entry.text])).toEqual([['input', 'a'], ['input', 'ab']]);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await forget(page);
    await page.locator('#after').focus();
    await focusTyping(page);
    expect(await names(page)).toEqual([]);
    // Cancelling action keeps the form from being submitted.
    await page.evaluate(() => document.getElementById('f')!.addEventListener('action', (event) => event.preventDefault()));
    await page.keyboard.press('Enter');
    expect(await names(page)).toEqual(['action']);
  });

  test('CHF-17: the Text input is given the placeholder only while the list is empty; in the filled and the outlined look a list with an entry floats the label, and the Field draws no label row there', async ({ page }) => {
    await mountField(page, 'placeholder="name@example.com"');
    await expect(typing(page)).toHaveAttribute('placeholder', 'name@example.com');
    await set(page, { value: ['a@example.com'] });
    expect(await typing(page).evaluate((el: HTMLInputElement) => el.placeholder)).toBe('');
    await set(page, { value: [] });
    expect(await typing(page).evaluate((el: HTMLInputElement) => el.placeholder)).toBe('name@example.com');
    for (const variant of ['filled', 'outlined']) {
      await set(page, { variant, value: [] });
      await settle(page);
      const inner = f(page).locator('tanrei-text-input .field');
      await expect(inner, variant).not.toHaveAttribute('data-has-value', /.*/);
      await expect(f(page).locator('tanrei-field .label-row'), `${variant}: no label row of the Field's`).toHaveCount(0);
      const resting = await bounds(f(page).locator('tanrei-text-input label.label'));
      await set(page, { value: ['a@example.com'] });
      await settle(page);
      await expect(inner, variant).toHaveAttribute('data-has-value', '');
      await expect.poll(async () => (await bounds(f(page).locator('tanrei-text-input label.label'))).y, `${variant}: the label floats`).toBeLessThan(resting.y);
    }
  });

  test('CHF-18: every entry is shown — none hidden, counted in or scrolled — on lines that wrap inside the box, which grows by whole lines; an entry wider than a line has that line to itself and is cut by the Chip, its whole text staying its name and its value; focus stays where it is when the lines change', async ({ page }) => {
    await mountField(page, '', { width: 280 });
    const container = inputBox(page);
    const empty = (await bounds(container)).height;
    expect(empty).toBe(await resolveToken(page, '--tanrei-comp-input-box-container-height-medium'));
    await set(page, { value: ['ada@example.com'] });
    expect((await bounds(container)).height, 'one line of entries: as tall as a text field').toBe(empty);
    const many = ['ada@example.com', 'grace.hopper@example.org', 'alan@example.net', 'katherine.johnson@example.com', 'hedy@example.org', 'margaret.hamilton@example.com', 'tim@example.net', 'barbara.liskov@example.org'];
    await focusTyping(page);
    await set(page, { value: many });
    expect((await look(page)).focus).toBe('typing');
    const line = (await resolveToken(page, '--tanrei-comp-chip-container-height-small')) + (await resolveToken(page, '--tanrei-comp-text-input-entries-row-gap'));
    const grown = (await bounds(container)).height;
    expect((grown - empty) / line, 'the box grows by whole lines').toBeCloseTo(Math.round((grown - empty) / line), 5);
    expect(grown).toBeGreaterThan(empty + 3 * line);
    const box = await bounds(container);
    for (let index = 0; index < many.length; index++) {
      const one = await bounds(chip(page, index));
      expect(one.width > 0 && one.x >= box.x && one.x + one.width <= box.x + box.width + 0.5 && one.y >= box.y && one.y + one.height <= box.y + box.height, `${many[index]} is shown inside the box`).toBe(true);
    }
    expect(await container.evaluate((el) => [getComputedStyle(el).overflowY, el.scrollHeight <= el.clientHeight + 1])).toEqual(['visible', true]);
    // An entry wider than a line: a line to itself, cut by the Chip, whole to assistive technology and in the value.
    const long = 'the-team-that-keeps-the-design-system-and-its-five-platforms-in-step@subdomain.of.a.long.example.org';
    await set(page, { value: ['ada@example.com', long, 'grace@example.org'] });
    const [before, cut, after] = [await bounds(chip(page, 0)), await bounds(chip(page, 1)), await bounds(chip(page, 2))];
    expect(cut.y).toBeGreaterThan(before.y);
    expect(after.y).toBeGreaterThan(cut.y);
    const inner = await f(page).locator('tanrei-text-input .body').evaluate((el) => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight));
    expect(cut.width).toBeCloseTo(inner, 0);
    expect(await chip(page, 1).locator('.label').evaluate((el) => [el.scrollWidth > el.clientWidth, getComputedStyle(el).textOverflow])).toEqual([true, 'ellipsis']);
    await expect(f(page).getByRole('button', { name: long, exact: true })).toHaveCount(1);
    expect((await look(page)).value[1]).toBe(long);
  });

  test('CHF-19: while disabled the Field, the Text input and every Chip are disabled — nothing takes focus, no entry is made, removed or taken back, no event is emitted — the entries stay drawn and exposed as disabled, and nothing is submitted', async ({ page }) => {
    await mountField(page, `value='["a@example.com","b@example.com"]' disabled`);
    await set(page, { inputValue: 'c@example.com' });
    expect(await f(page).evaluate((el) => [(el.shadowRoot!.querySelector('tanrei-field') as unknown as { disabled: boolean }).disabled, ...[...el.shadowRoot!.querySelectorAll('tanrei-chip')].map((one) => (one as unknown as { disabled: boolean }).disabled)])).toEqual([true, true, true]);
    await expect(typing(page)).toBeDisabled();
    await page.locator('#before').focus();
    await tab(page);
    expect((await look(page)).focus).toBe('outside:after');
    await focusTyping(page);
    expect((await look(page)).focus).toBe('outside:after');
    await chip(page, 0).locator('.label').click({ force: true });
    await removeOf(page, 1).click({ force: true });
    const now = await look(page);
    expect({ value: now.value, text: now.text }).toEqual({ value: ['a@example.com', 'b@example.com'], text: 'c@example.com' });
    expect(await names(page)).toEqual([]);
    await expect(f(page).getByRole('button', { name: 'a@example.com', exact: true })).toBeDisabled();
    await expect(f(page).getByRole('button', { name: 'Remove a@example.com' })).toBeDisabled();
    expect(await page.evaluate(() => [...new FormData(document.getElementById('form') as HTMLFormElement).entries()])).toEqual([]);
    // A disabled fieldset around it does the same, whatever its own property says.
    await set(page, { disabled: false });
    await expect(typing(page)).toBeEnabled();
    await page.evaluate(() => {
      const set = document.createElement('fieldset');
      set.disabled = true;
      const form = document.getElementById('form')!;
      form.prepend(set);
      set.append(document.getElementById('f')!);
    });
    await settle(page);
    await expect(typing(page)).toBeDisabled();
    await expect(f(page).getByRole('button', { name: 'a@example.com', exact: true })).toBeDisabled();
  });

  test('CHF-20: while read-only no entry is made, removed or taken back — each entry is an input Chip without a remove action, a press or a key on it moves focus and does nothing else, and check, reject and change are not emitted; the entries stay reachable by the keys and the list is submitted', async ({ page }) => {
    await mountField(page, `value='["a@example.com","b@example.com"]' readonly`);
    await expect(typing(page)).toHaveAttribute('readonly', '');
    expect(await chips(page).evaluateAll((all) => all.map((one) => [(one as unknown as { removable: boolean }).removable, getComputedStyle(one.shadowRoot!.querySelector('.remove')!).display]))).toEqual([[false, 'none'], [false, 'none']]);
    await expect(f(page).getByRole('button', { name: /^Remove/ })).toHaveCount(0);
    await focusTyping(page);
    await page.keyboard.press('Backspace');
    expect((await look(page)).focus).toBe('entry:b@example.com');
    await page.keyboard.press('ArrowLeft');
    expect((await look(page)).focus).toBe('entry:a@example.com');
    for (const key of ['Backspace', 'Delete', 'Enter', 'Space']) {
      await page.keyboard.press(key);
      const now = await look(page);
      expect({ focus: now.focus, value: now.value, text: now.text }, key).toEqual({ focus: 'entry:a@example.com', value: ['a@example.com', 'b@example.com'], text: '' });
    }
    await chip(page, 1).locator('.label').click();
    expect((await look(page)).value).toEqual(['a@example.com', 'b@example.com']);
    // Text the product put in the typing part makes no entry: not by Enter, not by leaving.
    await set(page, { inputValue: 'c@example.com' });
    await focusTyping(page);
    await page.locator('#after').focus();
    expect((await look(page)).value).toEqual(['a@example.com', 'b@example.com']);
    expect(await heard(page, 'check', 'reject', 'change')).toEqual([]);
    expect(await page.evaluate(() => new FormData(document.getElementById('form') as HTMLFormElement).getAll('to'))).toEqual(['a@example.com', 'b@example.com']);
  });

  test('CHF-21: assistive technology meets, in order, the entries as one list named by label — each an item that holds its Chip, a button named by the entry’s whole text, and its remove action, a button named by removeLabel — then the typing part, a text box named by label and described by the supporting row, invalid in an entry error and required while requirement says so; with no entry there is no list, and the element has no role of its own', async ({ page, browserName }) => {
    await mountField(page, `value='["ada@example.com","grace@example.org"]' supporting-text="Separate addresses with a comma." requirement="required" required-text="Required"`);
    const list = f(page).getByRole('list', { name: 'Recipients', exact: true });
    await expect(list).toHaveCount(1);
    await expect(list.getByRole('listitem')).toHaveCount(2);
    const second = list.getByRole('listitem').nth(1);
    await expect(second.getByRole('button')).toHaveCount(2);
    await expect(second.getByRole('button', { name: 'grace@example.org', exact: true })).toHaveCount(1);
    await expect(second.getByRole('button', { name: 'Remove grace@example.org', exact: true })).toHaveCount(1);
    const box = f(page).getByRole('textbox', { name: 'Recipients', exact: true });
    await expect(box).toHaveCount(1);
    const tree = await f(page).ariaSnapshot();
    expect(tree.indexOf('- list "Recipients"')).toBeGreaterThanOrEqual(0);
    expect(tree.indexOf('- list "Recipients"'), 'the list, then the typing part').toBeLessThan(tree.indexOf('- textbox "Recipients"'));
    expect(await f(page).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-roledescription'), el.getAttribute('tabindex')])).toEqual([null, null, null, null]);
    await grammar(page);
    await focusTyping(page);
    await page.keyboard.type('alan@');
    await page.keyboard.press('Enter');
    await settle(page);
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Accessibility.enable');
      const node = async (expression: string) => {
        const { result } = await cdp.send('Runtime.evaluate', { expression });
        const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId!, fetchRelatives: false });
        const found = nodes[0]!;
        return { ignored: found.ignored, role: found.role?.value, name: found.name?.value, description: found.description?.value, properties: Object.fromEntries((found.properties ?? []).map((p) => [p.name, p.value.value])) };
      };
      const root = `document.getElementById('f').shadowRoot`;
      expect(await node(`${root}.querySelector('[role=list]')`)).toMatchObject({ ignored: false, role: 'list', name: 'Recipients' });
      expect(await node(`${root}.querySelector('[role=listitem]')`)).toMatchObject({ ignored: false, role: 'listitem' });
      expect(await node(`${root}.querySelector('tanrei-chip').shadowRoot.querySelector('.container')`)).toMatchObject({ role: 'button', name: 'ada@example.com' });
      expect(await node(`${root}.querySelector('tanrei-chip').shadowRoot.querySelector('.remove')`)).toMatchObject({ role: 'button', name: 'Remove ada@example.com' });
      const typed = await node(`${root}.querySelector('tanrei-text-input').shadowRoot.querySelector('.input')`);
      expect(typed).toMatchObject({ role: 'textbox', name: 'Recipients' });
      expect(typed.description).toContain('Enter a full address.');
      expect(typed.properties).toMatchObject({ invalid: 'true', required: true });
    }
    await expect(box).toHaveAttribute('aria-invalid', 'true');
    // No entry: no list.
    await set(page, { value: [] });
    await expect(f(page).getByRole('list')).toHaveCount(0);
  });

  test('CHF-22: one live region, polite, empty at rest and not drawn: one entry made says addedText with {entry} filled, several made at once addedCountText with {count} — or addedText for the last where that is not given — and a removal removedText; a later sentence replaces the one before; nothing is said when the product sets value, when an entry is taken back or when one is refused', async ({ page }) => {
    await mountField(page, `separators='[","]'`);
    const region = page.locator('#f span.announcer:not([role])');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    expect(await region.evaluate((el) => [el.textContent, el.getBoundingClientRect().width, getComputedStyle(el).position, getComputedStyle(el).clipPath])).toEqual(['', 1, 'absolute', 'inset(50%)']);
    await focusTyping(page);
    await page.keyboard.type('ada@example.com,');
    expect((await look(page)).said).toBe('ada@example.com added');
    // The entry is put in as plain text of its own direction, isolated from the sentence.
    const isolated = () => f(page).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.announcer bdi')].map((each) => each.textContent));
    expect(await isolated()).toEqual(['ada@example.com']);
    // It is never read as markup and never read again for places: what a person typed between braces stays.
    await page.keyboard.type('{entry} {{ <b>x</b>,');
    expect((await look(page)).said).toBe('{entry} {{ <b>x</b> added');
    expect(await isolated()).toEqual(['{entry} {{ <b>x</b>']);
    expect(await f(page).evaluate((el) => el.shadowRoot!.querySelectorAll('.announcer b').length)).toBe(0);
    await pasteInto(page, 'b@example.com,c@example.com,d@example.com');
    expect((await look(page)).said, 'replaced, not queued').toBe('3 added');
    expect(await isolated(), 'a number is not isolated').toEqual([]);
    await set(page, { addedCountText: '' });
    await pasteInto(page, 'e@example.com,f@example.com');
    expect((await look(page)).said).toBe('f@example.com added');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    expect((await look(page)).said).toBe('f@example.com removed');
    // Not for what the product sets.
    await set(page, { value: ['x@example.com', 'y@example.com'] });
    expect((await look(page)).said).toBe('f@example.com removed');
    // Not for an entry taken back, and not for a refusal.
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');
    expect((await look(page)).said).toBe('y@example.com removed');
    await chip(page, 0).locator('.label').click();
    expect((await look(page)).said).toBe('y@example.com removed');
    await grammar(page, '^never$');
    await page.keyboard.press('Enter');
    const now = await look(page);
    expect({ error: now.error, said: now.said }).toEqual({ error: true, said: 'y@example.com removed' });
  });

  test('CHF-23: it has no words of its own — each sentence is the instance’s prop and, while that is empty, the product’s word under the key the prop names; the places are filled wherever and however often they stand, and a sentence without a place is said as it is written; a removeLabel without {entry} is reported; with no removeLabel the remove action is drawn, works and has no name, and with no addedText or removedText nothing is said — each reported', async ({ page }) => {
    const seen = warnings(page);
    await mountField(page, `value='["a"]'`, { words: '' });
    // Nothing given: the action is drawn and works, unnamed; the missing word is recorded.
    await expect(removeOf(page, 0)).toBeVisible();
    expect(await removeOf(page, 0).getAttribute('aria-label')).toBeNull();
    expect(await missingWords(page)).toContain('entryRemoveLabel');
    expect(seen.filter((text) => text.includes(`<${TAG}>`) && text.includes('remove-label') && text.includes('CHF-23'))).toHaveLength(1);
    await focusTyping(page);
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');
    expect((await look(page)).said).toBe('');
    await removeOf(page, 0).click();
    let now = await look(page);
    expect({ value: now.value, said: now.said }).toEqual({ value: ['b'], said: '' });
    expect(await missingWords(page)).toEqual(expect.arrayContaining(['entryAddedText', 'entryRemovedText']));
    // A duplicate with no words: errorText would be shown; with none, nothing — and that is said.
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');
    expect((await look(page)).errorText).toBe('');
    // The product's words, once for every chip field.
    await setWords(page, {
      entryRemoveLabel: '{entry}: remove {entry}',
      entryAddedText: 'Added',
      entriesAddedText: '{count} of them',
      entryRemovedText: '{entry} — gone',
      duplicateEntryText: 'Twice.',
      entryLimitText: 'Full.',
      requiredText: 'Required',
      optionalText: 'Optional',
    });
    await settle(page);
    expect(await removeOf(page, 0).getAttribute('aria-label')).toBe('b: remove b');
    await page.keyboard.press('Enter');
    expect((await look(page)).errorText).toBe('Twice.');
    await set(page, { inputValue: 'c', maxEntries: 1 });
    await page.keyboard.press('Enter');
    expect((await look(page)).errorText).toBe('Full.');
    await set(page, { maxEntries: 0 });
    await page.keyboard.press('Enter');
    expect((await look(page)).said, 'a sentence without a place, as it is written').toBe('Added');
    await set(page, { requirement: 'required' });
    await expect(requirementTag(page)).toHaveAttribute('label', 'Required');
    await set(page, { requirement: 'optional' });
    await expect(requirementTag(page)).toHaveAttribute('label', 'Optional');
    // The instance's own win over the product's.
    await set(page, { removeLabel: 'Take {entry} away', removedText: 'Took {entry}', duplicateText: 'Same.', limitText: 'No room.' });
    expect(await removeOf(page, 0).getAttribute('aria-label')).toBe('Take b away');
    await removeOf(page, 1).click();
    expect((await look(page)).said).toBe('Took c');
    await set(page, { inputValue: 'b' });
    await page.keyboard.press('Enter');
    expect((await look(page)).errorText).toBe('Same.');
    // invalidText is the instance's alone, and a removeLabel without its place is said in a debug build.
    now = await look(page);
    await set(page, { removeLabel: 'Remove' });
    expect(seen.filter((text) => text.includes('{entry}') && text.includes('CHF-23'))).toHaveLength(1);
    expect(await removeOf(page, 0).getAttribute('aria-label')).toBe('Remove');
    // Another text between braces, and a brace that opens or closes nothing, are said and named as they are written
    // and reported once per page, naming the prop; a brace written twice is one brace.
    seen.length = 0;
    await mountField(page, `value='["a","b"]' separators='[","]' remove-label="Take {entry} {away}" added-text="{{{entry}}} added {" added-count-text="{count} {n}" removed-text="{entri} removed"`, { words: '' });
    const of = (prop: string, what: string) => seen.filter((text) => text.includes(`<${TAG}>`) && text.includes('CHF-23') && text.includes(`${prop} holds`) && text.includes(what));
    expect(await removeOf(page, 0).getAttribute('aria-label')).toBe('Take a {away}');
    expect(await removeOf(page, 1).getAttribute('aria-label')).toBe('Take b {away}');
    expect(of('removeLabel', '{away}'), 'two chips, one report').toHaveLength(1);
    expect(seen.filter((text) => text.includes('has no place')), 'the place it needs is there').toEqual([]);
    const places = () => seen.filter((text) => text.includes(' holds ') || text.includes('has no place'));
    expect(places(), 'a sentence is reported where it is used, not before').toHaveLength(1);
    await focusTyping(page);
    await page.keyboard.type('c');
    await page.keyboard.press('Enter');
    expect((await look(page)).said, 'a doubled brace is one brace; a lone brace stays').toBe('{c} added {');
    expect(of('addedText', 'a brace that opens or closes nothing')).toHaveLength(1);
    await page.keyboard.type('d');
    await page.keyboard.press('Enter');
    expect((await look(page)).said).toBe('{d} added {');
    expect(of('addedText', ''), 'said again, reported no second time').toHaveLength(1);
    await pasteInto(page, 'e,g');
    expect((await look(page)).said).toBe('2 {n}');
    expect(of('addedCountText', '{n}')).toHaveLength(1);
    await removeOf(page, 0).click();
    expect((await look(page)).said, 'said as it is written').toBe('{entri} removed');
    expect(of('removedText', '{entri}')).toHaveLength(1);
    await removeOf(page, 0).click();
    expect(of('removedText', '{entri}')).toHaveLength(1);
    expect(places()).toHaveLength(4);
    // A mistyped place in the name of the remove action: named as written, and both faults are said.
    await set(page, { removeLabel: 'Remove {entri}' });
    expect(await removeOf(page, 0).getAttribute('aria-label')).toBe('Remove {entri}');
    expect(of('removeLabel', '{entri}')).toHaveLength(1);
    expect(seen.filter((text) => text.includes('removeLabel has no place {entry}') && text.includes('CHF-23'))).toHaveLength(1);
    // A sentence that fits reports nothing.
    seen.length = 0;
    await mountField(page, `value='["a"]'`);
    await focusTyping(page);
    await page.keyboard.type('c');
    await page.keyboard.press('Enter');
    await removeOf(page, 0).click();
    expect(places()).toEqual([]);
  });

  test('CHF-24: in a form it submits one value for each entry under its name, in order — none while the list is empty, and never the typed text; a reset returns the list it was first given, with an empty typing part and no entry error; the platform’s restore gives the list back; its members submit nothing', async ({ page }) => {
    await mountField(page, `value='["a@example.com","b@example.com"]'`);
    const submitted = () => page.evaluate(() => [...new FormData(document.getElementById('form') as HTMLFormElement).entries()]);
    expect(await submitted()).toEqual([['to', 'a@example.com'], ['to', 'b@example.com']]);
    expect(await f(page).evaluate((el: HTMLElement & { form: HTMLFormElement | null }) => [el.form?.id, (el.constructor as unknown as { formAssociated: boolean }).formAssociated])).toEqual(['form', true]);
    await grammar(page);
    await focusTyping(page);
    await page.keyboard.type('c@example.com');
    await page.keyboard.press('Enter');
    await page.keyboard.type('not an entry');
    await page.keyboard.press('Enter');
    expect((await look(page)).error).toBe(true);
    expect(await submitted()).toEqual([['to', 'a@example.com'], ['to', 'b@example.com'], ['to', 'c@example.com']]);
    // Reset.
    await page.evaluate(() => (document.getElementById('form') as HTMLFormElement).reset());
    let now = await look(page);
    expect({ value: now.value, text: now.text, error: now.error }).toEqual({ value: ['a@example.com', 'b@example.com'], text: '', error: false });
    expect((await heard(page, 'change')).length, 'a reset is not the person’s change').toBe(1);
    // The value attribute is read once: a later change of it is not a new list, and a reset still returns to it.
    await f(page).evaluate((el) => el.setAttribute('value', '["z@example.com"]'));
    expect((await look(page)).value).toEqual(['a@example.com', 'b@example.com']);
    // Empty: nothing is submitted.
    await set(page, { value: [], inputValue: 'typed' });
    expect(await submitted()).toEqual([]);
    // Restore, as the platform calls it.
    await f(page).evaluate((el) => (el as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('["r@example.com","s@example.com"]', 'restore'));
    now = await look(page);
    expect(now.value).toEqual(['r@example.com', 's@example.com']);
    expect(await submitted()).toEqual([['to', 'r@example.com'], ['to', 's@example.com']]);
    // A list first given as a property, with no attribute: the reset returns to it.
    await page.evaluate((tag) => {
      const made = document.createElement(tag) as HTMLElement & { value: string[]; label: string };
      document.getElementById('f')!.remove();
      Object.assign(made, { id: 'f', value: ['first@example.com'], label: 'Recipients' });
      made.setAttribute('name', 'to');
      document.getElementById('form')!.prepend(made);
    }, TAG);
    await settle(page);
    await set(page, { value: ['later@example.com'] });
    await page.evaluate(() => (document.getElementById('form') as HTMLFormElement).reset());
    expect((await look(page)).value).toEqual(['first@example.com']);
  });

  test('CHF-25: while requirement is required the typing part is exposed as required and an empty list is reported to the form’s constraint validation as a missing value, whatever text is typed; an entry makes it valid; nothing else is validated — error is not set and no error text is shown for an empty list', async ({ page }) => {
    await mountField(page, 'requirement="required" required-text="Required"');
    await expect(typing(page)).toHaveAttribute('required', '');
    const validity = () => f(page).evaluate((el: HTMLElement & { validity: ValidityState; validationMessage: string; willValidate: boolean; checkValidity(): boolean }) => ({ missing: el.validity.valueMissing, valid: el.checkValidity(), message: el.validationMessage !== '', will: el.willValidate }));
    expect(await validity()).toEqual({ missing: true, valid: false, message: true, will: true });
    await focusTyping(page);
    await page.keyboard.type('typed, and not an entry');
    expect(await validity()).toMatchObject({ missing: true, valid: false });
    let now = await look(page);
    expect({ error: now.error, own: now.own.error, errorText: now.errorText }).toEqual({ error: false, own: false, errorText: '' });
    // reportValidity() is false and focuses the typing part, where the message points.
    await page.locator('#after').focus();
    await set(page, { value: [], inputValue: '' });
    expect(await f(page).evaluate((el: HTMLElement & { reportValidity(): boolean }) => el.reportValidity())).toBe(false);
    expect((await look(page)).focus).toBe('typing');
    await page.keyboard.type('a@example.com');
    await page.keyboard.press('Enter');
    expect(await validity()).toEqual({ missing: false, valid: true, message: false, will: true });
    await set(page, { value: [], requirement: 'optional' });
    expect(await validity()).toMatchObject({ missing: false, valid: true });
    now = await look(page);
    expect(now.error).toBe(false);
  });

  test('CHF-26: type gives the typing part its keyboard and checks nothing — a text of any type becomes an entry unless it is there already, exceeds the limit or is refused by the product’s check; a type that is not one line of plain text behaves as text and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountField(page, 'type="email"');
    await expect(typing(page)).toHaveAttribute('inputmode', 'email');
    await expect(typing(page)).toHaveAttribute('type', 'text');
    await focusTyping(page);
    await page.keyboard.type('not an address at all');
    await page.keyboard.press('Enter');
    expect((await look(page)).value).toEqual(['not an address at all']);
    for (const [type, mode] of [['tel', 'tel'], ['url', 'url']] as const) {
      await set(page, { type });
      await expect(typing(page)).toHaveAttribute('inputmode', mode);
    }
    expect(seen.filter((text) => text.includes('CHF-26'))).toEqual([]);
    for (const type of ['date', 'password', 'no-such-type']) {
      await set(page, { type });
      await settle(page);
      await expect(typing(page), type).toHaveAttribute('type', 'text');
      await expect(f(page).locator('tanrei-text-input .segment'), type).toHaveCount(0);
      expect(await f(page).evaluate((el) => (el.shadowRoot!.querySelector('tanrei-text-input') as unknown as { type: string }).type), type).toBe('text');
    }
    expect(seen.filter((text) => text.includes('CHF-26') && text.includes(`<${TAG}>`))).toHaveLength(3);
    await page.keyboard.type('2026-10-09');
    await page.keyboard.press('Enter');
    expect((await look(page)).value).toEqual(['not an address at all', '2026-10-09']);
  });

  test('CHF-27: in a right-to-left layout every line of entries starts at the right and the typing part follows the last entry to its left; the chip field takes its direction from where it is used; an entry’s text keeps its own direction, so an address reads left to right inside a right-to-left list', async ({ page }) => {
    await mountField(page, `value='["ada@example.com","נמען"]'`, { dir: 'rtl', width: 360 });
    await set(page, { inputValue: 'alan@' });
    const container = await bounds(inputBox(page));
    const [first, second, typed] = [await bounds(chip(page, 0)), await bounds(chip(page, 1)), await bounds(typing(page))];
    expect(container.x + container.width - (first.x + first.width), 'the first entry starts at the right').toBeLessThan(24);
    expect(second.x + second.width, 'the second stands to its left').toBeLessThanOrEqual(first.x);
    expect(typed.x + typed.width, 'the typing part follows the last entry to its left').toBeLessThanOrEqual(second.x);
    expect(await f(page).evaluate((el) => [el.getAttribute('dir'), getComputedStyle(el).direction])).toEqual([null, 'rtl']);
    expect(await chip(page, 0).locator('.label').evaluate((el) => getComputedStyle(el).unicodeBidi)).toMatch(/isolate|plaintext/);
    expect((await look(page)).value).toEqual(['ada@example.com', 'נמען']);
    // Its direction follows a change of where it stands.
    await page.locator('#place').evaluate((el) => el.setAttribute('dir', 'ltr'));
    const moved = await bounds(chip(page, 0));
    expect(moved.x - container.x).toBeLessThan(24);
  });

  test('CHF-28: at twice the text size in a place 320 wide every entry is still shown, each on a line of its own where two no longer fit, cut only by the Chip with its whole text as its name; the typing part is on a line of its own and wide enough to type in; nothing lies over another part and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    const entries = ['ada@example.com', 'grace.hopper@example.org', 'katherine.johnson@example.com'];
    await mountHtml(page, `<${TAG} id="f" label="Recipients" supporting-text="Separate addresses with a comma." ${WORDS} value='${JSON.stringify(entries)}'></${TAG}>`, '<style>html { font-size: 200%; } body { margin: 0; }</style>');
    await set(page, { inputValue: 'alan@' });
    const boxes = [];
    for (let index = 0; index < entries.length; index++) boxes.push(await bounds(chip(page, index)));
    const typed = await bounds(typing(page));
    for (const [index, box] of boxes.entries()) {
      expect(box.width, `${entries[index]} is shown`).toBeGreaterThan(40);
      expect(box.x >= 0 && box.x + box.width <= 320).toBe(true);
      if (index > 0) expect(box.y, 'each on a line of its own').toBeGreaterThanOrEqual(boxes[index - 1]!.y + boxes[index - 1]!.height);
      await expect(f(page).getByRole('button', { name: entries[index]!, exact: true })).toHaveCount(1);
    }
    expect(typed.y, 'the typing part has a line of its own').toBeGreaterThanOrEqual(boxes.at(-1)!.y + boxes.at(-1)!.height);
    expect(typed.width).toBeGreaterThanOrEqual(await resolveToken(page, '--tanrei-comp-text-input-entries-typing-min-width'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const help = await bounds(row(page));
    const container = await bounds(inputBox(page));
    expect(help.y, 'the supporting row stands below the box').toBeGreaterThanOrEqual(container.y + container.height - 0.5);
    expect(typed.y + typed.height).toBeLessThanOrEqual(container.y + container.height + 0.5);
  });

  test('CHF-29: under forced colors the chip field draws nothing of its own — its sheet names no color — and a refused entry is told from an accepted one by being text in the typing part and not a Chip, with its reason in words', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountField(page, `value='["ada@example.com"]'`);
    await grammar(page);
    await focusTyping(page);
    await page.keyboard.type('alan@');
    await page.keyboard.press('Enter');
    const now = await look(page);
    expect({ chips: now.chips, drawn: now.drawn, errorText: now.errorText }).toEqual({ chips: ['ada@example.com'], drawn: 'alan@', errorText: 'Enter a full address.' });
    await expect(errorRow(page)).toHaveText('Enter a full address.');
    await expect(errorRow(page)).toBeVisible();
    expect(await f(page).evaluate((el) => [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((text) => /color|background|forced/.test(text)))).toEqual([]);
    // The members are drawn there as they are anywhere: the entry keeps an edge.
    expect(await chip(page, 0).locator('.container').evaluate((el) => getComputedStyle(el).display)).not.toBe('none');
  });

  test('CHF-30: every entry keeps the Chip’s hit areas — a press on an entry’s visible bounds is that entry’s, a press between two entries on one line or on two is the nearer one’s, and a press that lands on no entry is the typing part’s; the remove action is reached on its own', async ({ page }) => {
    await mountField(page, `value='["ada@example.com","grace.hopper@example.org","alan@example.net","tim@example.net"]' readonly`, { width: 280 });
    // Read-only first: what a point of the box belongs to, read from the page — the chip whose shadow tree is hit.
    await set(page, { readOnly: false });
    const owner = (x: number, y: number) =>
      page.evaluate(
        ([px, py]) => {
          let hit = document.elementFromPoint(px!, py!);
          let chipLabel: string | null = null;
          let part = '';
          while (hit) {
            if (hit.localName === 'tanrei-chip') chipLabel = (hit as HTMLElement & { label: string }).label;
            const inner: Element | null = hit.shadowRoot?.elementFromPoint(px!, py!) ?? null;
            if (!inner || inner === hit) break;
            part = inner.classList.contains('remove') || inner.closest?.('.remove') ? 'remove' : inner.closest?.('.container') ? 'chip' : part;
            hit = inner;
          }
          return chipLabel ? `${part || 'chip'}:${chipLabel}` : 'box';
        },
        [x, y],
      );
    const boxes = [];
    for (let index = 0; index < 4; index++) boxes.push(await bounds(chip(page, index)));
    // Every corner of an entry's visible bounds, inside its label's half, is that entry's.
    const labels = ['ada@example.com', 'grace.hopper@example.org', 'alan@example.net', 'tim@example.net'];
    for (const [index, box] of boxes.entries()) {
      expect(await owner(box.x + 6, box.y + 2), `${labels[index]}: its top edge`).toBe(`chip:${labels[index]}`);
      expect(await owner(box.x + 6, box.y + box.height - 2), `${labels[index]}: its bottom edge`).toBe(`chip:${labels[index]}`);
      expect(await owner(box.x + box.width - 10, box.y + box.height / 2), `${labels[index]}: its remove action`).toBe(`remove:${labels[index]}`);
    }
    // Between two lines: the nearer one's.
    const [upper, lower] = [boxes[0]!, boxes[1]!];
    expect(lower.y).toBeGreaterThan(upper.y + upper.height);
    const gap = lower.y - (upper.y + upper.height);
    expect(await owner(upper.x + 6, upper.y + upper.height + gap * 0.25)).toBe(`chip:${labels[0]}`);
    expect(await owner(lower.x + 6, lower.y - gap * 0.25)).toBe(`chip:${labels[1]}`);
    // The remove action's target reaches the pointer's minimum across the chip's own height, bounded by the set.
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    const remove = await removeOf(page, 0).evaluate((el) => {
      const area = getComputedStyle(el, '::before');
      return { width: parseFloat(area.width), height: parseFloat(area.height) };
    });
    expect(remove.height).toBeGreaterThan(boxes[0]!.height);
    expect(remove.height).toBeLessThanOrEqual(target);
    // A press that lands on no entry: the typing part.
    const container = await bounds(inputBox(page));
    expect(await owner(container.x + container.width - 4, container.y + 4)).toBe('box');
    await page.locator('#after').focus();
    await page.mouse.click(container.x + container.width - 4, container.y + 4);
    expect((await look(page)).focus).toBe('typing');
    // And a real press on an entry is that entry's: it is taken back.
    await page.mouse.click(boxes[2]!.x + 8, boxes[2]!.y + boxes[2]!.height / 2);
    expect((await look(page)).text).toBe('alan@example.net');
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { theme, icons: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    });
  }

  test('every fixture is one text box named by its label, after one list of that name where it holds entries — each entry a button named by its whole text — and the element itself has no role and no name of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const fixture of spec.fixtures) {
      const label = String(fixture.props.label);
      const entries = (fixture.props.value as string[] | undefined) ?? [];
      await expect(host(page, fixture.id).getByRole('textbox', { name: label, exact: true }), fixture.id).toHaveCount(1);
      await expect(host(page, fixture.id).getByRole('list', { name: label, exact: true }), fixture.id).toHaveCount(entries.length ? 1 : 0);
      await expect(host(page, fixture.id).getByRole('listitem'), fixture.id).toHaveCount(entries.length);
      for (const entry of entries) await expect(host(page, fixture.id).getByRole('button', { name: entry, exact: true }), `${fixture.id}: ${entry}`).toHaveCount(1);
      expect(await host(page, fixture.id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('tabindex')]), fixture.id).toEqual([null, null, null]);
    }
  });

  test('keyboard: Tab makes one stop in every enabled fixture, however many entries it holds', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((fixture) => ['email-many', 'email-disabled', 'email-read-only', 'keywords'].includes(fixture.id)) });
    await page.evaluate(() => document.body.insertAdjacentHTML('afterbegin', '<button id="first">First</button>'));
    await page.locator('#first').focus();
    const stops: string[] = [];
    for (let press = 0; press < 3; press++) {
      await tab(page);
      stops.push(await page.evaluate(() => document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture') ?? 'outside'));
    }
    expect(stops).toEqual(['email-many', 'email-read-only', 'keywords']);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('every fixture is mounted, with a Chip for each entry of its value', async ({ page }) => {
    await expect(page.locator(`[data-fixture] > ${TAG}`)).toHaveCount(spec.fixtures.length);
    for (const fixture of spec.fixtures) await expect(host(page, fixture.id).locator('tanrei-chip'), fixture.id).toHaveCount(((fixture.props.value as string[] | undefined) ?? []).length);
  });

  for (const fixture of spec.fixtures) {
    test(`snapshot: ${fixture.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${fixture.id}"]`)).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
    });
  }
});
