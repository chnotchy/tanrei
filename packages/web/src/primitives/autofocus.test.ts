// `autofocus` on a Tanrei control that is not focusable itself — its shadow root delegates focus, or its `focus()`
// goes to a part — gives the control focus when the page first loads, as it does when the element is inserted later.
//
// The browser looks for what to focus when it first draws the page, before a module script has defined the element:
// the host has no shadow root to delegate to yet, nothing is focused, and it does not look again. So the element
// focuses itself when it first renders, where the page has given focus to nothing else (src/primitives/autofocus.ts;
// a composed element does the same through its base, W7 item 4).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

/**
 * Each control, as markup that can take focus: `rest` is where `id` and `autofocus` go. Not here: an item of a set whose
 * focus the set moves (a segment, a carousel's item, a drawer's item, a bar's destination) — its shadow root delegates
 * focus for the set's own script, and which of them is the stop is the set's to say.
 */
const SUBJECTS: Record<string, (rest: string) => string> = {
  'tanrei-button': (rest) => `<tanrei-button ${rest}>Send</tanrei-button>`,
  'tanrei-button-with-menu': (rest) => `<tanrei-button-with-menu ${rest} label="More"><tanrei-menu-item label="One"></tanrei-menu-item></tanrei-button-with-menu>`,
  'tanrei-main-action-button': (rest) => `<tanrei-main-action-button ${rest} label="New"><span slot="icon">add</span></tanrei-main-action-button>`,
  'tanrei-copy-button': (rest) => `<tanrei-copy-button ${rest} value="a" label="Copy" copied-label="Copied"></tanrei-copy-button>`,
  'tanrei-chip': (rest) => `<tanrei-chip ${rest} label="Chip"></tanrei-chip>`,
  'tanrei-card': (rest) => `<tanrei-card ${rest} interactive label="Card">Card</tanrei-card>`,
  'tanrei-checkbox': (rest) => `<tanrei-checkbox ${rest} label="Checkbox"></tanrei-checkbox>`,
  'tanrei-switch': (rest) => `<tanrei-switch ${rest} label="Switch"></tanrei-switch>`,
  'tanrei-radio-button': (rest) => `<tanrei-radio-button ${rest} label="Radio" value="a"></tanrei-radio-button>`,
  'tanrei-slider': (rest) => `<tanrei-slider ${rest} label="Slider" value="40"></tanrei-slider>`,
  'tanrei-text-input': (rest) => `<tanrei-text-input ${rest} label="Text"></tanrei-text-input>`,
  'tanrei-embedded-text-input': (rest) => `<tanrei-embedded-text-input ${rest} label="Text"></tanrei-embedded-text-input>`,
  'tanrei-one-time-code-input': (rest) => `<tanrei-one-time-code-input ${rest} label="Code"></tanrei-one-time-code-input>`,
  'tanrei-search': (rest) => `<tanrei-search ${rest} label="Search"></tanrei-search>`,
  'tanrei-fab-menu': (rest) => `<tanrei-fab-menu ${rest} label="Create" close-label="Close"><tanrei-fab-menu-item label="One"></tanrei-fab-menu-item></tanrei-fab-menu>`,
  'tanrei-number-input': (rest) => `<tanrei-number-input ${rest} label="Number" increment-label="More" decrement-label="Less"></tanrei-number-input>`,
  'tanrei-color-input': (rest) => `<tanrei-color-input ${rest} label="Color" value="#0f766e"></tanrei-color-input>`,
  'tanrei-select': (rest) => `<tanrei-select ${rest} label="Select"><tanrei-option value="a">Alpha</tanrei-option></tanrei-select>`,
  'tanrei-combobox': (rest) => `<tanrei-combobox ${rest} label="Combobox"><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox>`,
};

const document_ = (body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><style>${read('dist/tokens.css')}</style></head>
<body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

/** A page that is loaded, not written: the browser's own first load (autofocus is a matter of the load). */
async function load(page: Page, tag: string, body: string) {
  await page.route('http://autofocus.test/**', (route) => route.fulfill({ contentType: 'text/html', body: document_(body) }));
  await page.goto(`http://autofocus.test/${tag}`);
  await page.waitForFunction((t) => !!customElements.get(t), tag);
  await page.evaluate(async () => {
    type Updating = HTMLElement & { updateComplete?: Promise<unknown> };
    for (let pass = 0; pass < 2; pass++) {
      for (const el of document.querySelectorAll<Updating>('*')) await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 30))));
    }
  });
}

/** Where focus is: the element of the document that has it, and whether something in its shadow root does. */
const focus = (page: Page) => page.evaluate(() => [document.activeElement?.id || document.activeElement?.localName, !!document.activeElement?.shadowRoot?.activeElement]);

for (const [tag, subject] of Object.entries(SUBJECTS)) {
  test(`${tag}: autofocus gives it focus when the page first loads and when it is inserted later, takes focus from nothing that has it, and an element without it is given none`, async ({ page }) => {
    await load(page, tag, subject('id="auto" autofocus'));
    expect(await focus(page), 'first load').toEqual(['auto', true]);
    // Inserted into a page whose elements are defined.
    await load(page, tag, '<p>Nothing to focus</p>');
    await page.evaluate(async (html) => {
      document.body.insertAdjacentHTML('beforeend', html);
      await (document.querySelector('#auto') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    }, subject('id="auto" autofocus'));
    await expect.poll(() => focus(page), 'inserted later').toEqual(['auto', true]);
    // Focus the page has given already stays where it is.
    await load(page, tag, `<input id="first" autofocus />${subject('id="auto" autofocus')}`);
    expect(await focus(page), 'after an input that has focus').toEqual(['first', false]);
    // No autofocus: no focus.
    await load(page, tag, subject('id="plain"'));
    expect(await focus(page), 'without autofocus').toEqual(['body', false]);
  });
}
