// What a form's reset returns each form-associated element to (src/primitives/form-default.ts): the value it was first
// given — its default, as a native control's `defaultValue` or `defaultChecked` is (the HTML form-reset algorithm) —
// whichever way it was given: written in the markup, set as a property before the element first drew (a client
// framework's props), or, on a page rendered on a server, written by the server and given again with hydration, with
// the lists no attribute carries arriving only then (`takeFormDefaults()`, which `@tanrei/react` calls once each element
// has mounted). A value set after the element first drew — by the product or the person — is the current value alone; a
// `value` or `checked` attribute the product writes after that is a new default, as on a native control.
//
// The specs' own words: CHK (the checkbox resets as the native checkbox does), SWT, RAD and RAT-15, RGP-9, CKG-8, TXF-63,
// TXI, ETI-19, NMI-35, NUM-48, CLF-44, OTC-29, OTF-4, CMB-59, CMB-78, CBF-4, SEL, SEF-2, SLD, SLF-6, CHF-24: "resets to
// the value it was first given".
// affected: each component — each test names in its title the component it draws.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

const OPTIONS = '<tanrei-option value="a">Alpha</tanrei-option><tanrei-option value="b">Beta</tanrei-option><tanrei-option value="c">Gamma</tanrei-option>';
const RADIOS = '<tanrei-radio-button value="a" label="Alpha"></tanrei-radio-button><tanrei-radio-button value="b" label="Beta"></tanrei-radio-button><tanrei-radio-button value="c" label="Gamma"></tanrei-radio-button>';
const BOXES = (checked = '') => `<tanrei-checkbox value="a" label="Alpha" ${checked}></tanrei-checkbox><tanrei-checkbox value="b" label="Beta"></tanrei-checkbox><tanrei-checkbox value="c" label="Gamma"></tanrei-checkbox>`;

type Value = string | number | boolean | string[];

/**
 * One element: its markup with `attrs` (the attribute that gives the first value, or nothing), the property that holds
 * the value, the attribute that gives it (none for a list only a property gives), and three values: the first, the one
 * the product or the person sets after, and the one a product writes into the attribute after the element drew.
 */
interface Subject {
  markup: (attrs: string) => string;
  prop: string;
  attribute: string | null;
  first: Value;
  later: Value;
  written: Value;
  /** The markup that gives the first value where no attribute of the element gives it (a checkbox group's children). */
  firstMarkup?: string;
}

const text = (tag: string, inner = '', extra = ''): Subject['markup'] => (attrs) => `<${tag} label="Label" ${extra} ${attrs}>${inner}</${tag}>`;
const strings = (tag: string, inner = '', extra = ''): Subject => ({ markup: text(tag, inner, extra), prop: 'value', attribute: 'value', first: 'a', later: 'b', written: 'c' });
const checked = (tag: string, extra = ''): Subject => ({ markup: text(tag, '', extra), prop: 'checked', attribute: 'checked', first: true, later: false, written: false });

const SUBJECTS: Record<string, Subject> = {
  'tanrei-checkbox': checked('tanrei-checkbox'),
  'tanrei-switch': checked('tanrei-switch'),
  'tanrei-radio-button': checked('tanrei-radio-button', 'value="r"'),
  'tanrei-radio-group': strings('tanrei-radio-group', RADIOS),
  'tanrei-checkbox-group': { markup: text('tanrei-checkbox-group', BOXES()), firstMarkup: text('tanrei-checkbox-group', BOXES('checked'))(''), prop: 'value', attribute: null, first: ['a'], later: ['b', 'c'], written: [] },
  'tanrei-text-input': strings('tanrei-text-input'),
  'tanrei-text-field': strings('tanrei-text-field'),
  'tanrei-embedded-text-input': strings('tanrei-embedded-text-input'),
  'tanrei-search': strings('tanrei-search'),
  'tanrei-select': strings('tanrei-select', OPTIONS),
  'tanrei-select-field': strings('tanrei-select-field', OPTIONS),
  'tanrei-combobox': strings('tanrei-combobox', OPTIONS),
  'tanrei-combobox-field': strings('tanrei-combobox-field', OPTIONS),
  'tanrei-combobox (selection multiple)': { markup: text('tanrei-combobox', OPTIONS, 'selection="multiple"'), prop: 'values', attribute: 'values', first: ['a', 'b'], later: ['c'], written: ['b'] },
  'tanrei-one-time-code-input': { markup: text('tanrei-one-time-code-input', '', 'length="4"'), prop: 'value', attribute: 'value', first: '1234', later: '5678', written: '9012' },
  'tanrei-one-time-code-field': { markup: text('tanrei-one-time-code-field', '', 'length="4"'), prop: 'value', attribute: 'value', first: '1234', later: '5678', written: '9012' },
  'tanrei-number-input': { markup: text('tanrei-number-input'), prop: 'value', attribute: 'value', first: 3, later: 5, written: 8 },
  'tanrei-number-field': { markup: text('tanrei-number-field'), prop: 'value', attribute: 'value', first: 3, later: 5, written: 8 },
  'tanrei-color-input': { markup: text('tanrei-color-input'), prop: 'value', attribute: 'value', first: '#0f766e', later: '#336699', written: '#993366' },
  'tanrei-color-field': { markup: text('tanrei-color-field'), prop: 'value', attribute: 'value', first: '#0f766e', later: '#336699', written: '#993366' },
  'tanrei-slider': { markup: text('tanrei-slider'), prop: 'value', attribute: 'value', first: 40, later: 70, written: 20 },
  'tanrei-slider (start value)': { markup: text('tanrei-slider', '', 'range start-label="From" value="80"'), prop: 'startValue', attribute: 'start-value', first: 20, later: 10, written: 30 },
  'tanrei-slider-field': { markup: text('tanrei-slider-field'), prop: 'value', attribute: 'value', first: 40, later: 70, written: 20 },
  'tanrei-rating': { markup: text('tanrei-rating'), prop: 'value', attribute: 'value', first: 3, later: 5, written: 1 },
  'tanrei-chip-field': { markup: text('tanrei-chip-field', '', 'remove-label="Remove {entry}"'), prop: 'value', attribute: 'value', first: ['x', 'y'], later: ['z'], written: ['w'] },
};

/** The attribute's text for a value, as a product or a server writes it; `null` for none. */
const attributeText = (value: Value): string | null => (typeof value === 'boolean' ? (value ? '' : null) : Array.isArray(value) ? JSON.stringify(value) : String(value));
const attrs = (subject: Subject, value: Value) => {
  const written = subject.attribute ? attributeText(value) : null;
  return written === null ? '' : `${subject.attribute}='${written}'`;
};

/**
 * Four forms, one element each:
 *   #markup    the first value in the markup;
 *   #client    the element made by script and given the first value as a property in the same task, as a client
 *              framework gives its props;
 *   #server    what a server's render writes — the first value as its attribute where the element has one, nothing for
 *              a list no attribute gives — and, once the element has drawn, the first value given again as hydration
 *              gives it, then `takeFormDefaults()` as `@tanrei/react` calls it;
 *   #written   the first value in the markup, then another written into the attribute by the product once it drew.
 */
async function mount(page: Page, subject: Subject) {
  const first = subject.firstMarkup ?? subject.markup(attrs(subject, subject.first));
  const server = subject.attribute ? subject.markup(attrs(subject, subject.first)) : subject.markup('');
  await page.setContent(`<!doctype html>
<html lang="en"><head><style>${read('dist/tokens.css')}</style></head>
<body><form id="markup">${first}</form><form id="client"></form><form id="server">${server}</form><form id="written">${first}</form>
<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-text-input'));
  // The client's: made and given its first value in one task, before it first draws.
  await page.evaluate(
    ([markup, prop, value]) => {
      const form = document.querySelector('#client')!;
      form.innerHTML = markup as string;
      (form.firstElementChild as unknown as Record<string, unknown>)[prop as string] = value;
    },
    [subject.markup(''), subject.prop, subject.first] as const,
  );
  await settle(page);
  // Hydration: the props given again to an element that has drawn, then told they were its first.
  await page.evaluate(
    ([prop, value]) => {
      const element = document.querySelector('#server')!.firstElementChild as unknown as Record<string, unknown> & { takeFormDefaults(): void };
      element[prop as string] = value;
      element.takeFormDefaults();
    },
    [subject.prop, subject.first] as const,
  );
  await settle(page);
}

/** Every element under the forms has rendered, twice (a change made by the first render is drawn), and a frame has passed. */
const settle = (page: Page) =>
  page.evaluate(async () => {
    type Updating = HTMLElement & { updateComplete?: Promise<unknown> };
    const all = [...document.querySelectorAll<Updating>('form *')];
    for (let pass = 0; pass < 2; pass++) {
      for (const el of all) await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    for (const el of all) await el.updateComplete;
  });

/** The value each form's element holds. */
const values = (page: Page, prop: string) =>
  page.evaluate((p) => Object.fromEntries([...document.querySelectorAll('form')].map((form) => [form.id, (form.firstElementChild as unknown as Record<string, unknown>)[p]])), prop);

/** Sets the value of each form's element as the product would, after it drew. */
const setAll = async (page: Page, prop: string, value: Value) => {
  await page.evaluate(
    ([p, v]) => {
      for (const form of document.querySelectorAll('form')) (form.firstElementChild as unknown as Record<string, unknown>)[p as string] = v;
    },
    [prop, value] as const,
  );
  await settle(page);
};

const resetAll = async (page: Page) => {
  await page.evaluate(() => {
    for (const form of document.querySelectorAll('form')) form.reset();
  });
  await settle(page);
};

for (const [name, subject] of Object.entries(SUBJECTS)) {
  test(`${name}: a form's reset returns it to the value it was first given — in markup, as a property before it drew, or by a server and hydration — not to a value set after it drew`, async ({ page }) => {
    await mount(page, subject);
    const { first, later } = subject;
    const all = (value: Value) => ({ markup: value, client: value, server: value, written: value });
    expect(await values(page, subject.prop), 'each holds the first value').toEqual(all(first));
    await setAll(page, subject.prop, later);
    expect(await values(page, subject.prop), 'the product set another value').toEqual(all(later));
    await resetAll(page);
    expect(await values(page, subject.prop), 'a reset returns each to its first value').toEqual(all(first));
    // Reset again with nothing changed: still the first value.
    await resetAll(page);
    expect(await values(page, subject.prop)).toEqual(all(first));
  });

  if (!subject.attribute) continue;
  test(`${name}: the attribute the product writes after it drew is its new default, as on a native control, and a value set after that is not`, async ({ page }) => {
    await mount(page, subject);
    const attribute = subject.attribute!;
    const writing = attributeText(subject.written);
    await page.evaluate(
      ([a, t]) => {
        const element = document.querySelector('#written')!.firstElementChild!;
        if (t === null) element.removeAttribute(a as string);
        else element.setAttribute(a as string, t as string);
      },
      [attribute, writing] as const,
    );
    await settle(page);
    await setAll(page, subject.prop, subject.later);
    await resetAll(page);
    const after = await values(page, subject.prop);
    expect(after.written, 'the written attribute').toEqual(subject.written);
    expect(after.markup, 'the markup beside it, whose attribute was not written').toEqual(subject.first);
  });
}
