// `focus()` called on a Tanrei control before its first update — React's `ref.current.focus()` right after mounting,
// a script that inserts a control and focuses it at once — is kept, with its options, and given once the control has
// drawn (`TanreiElement`, src/primitives/element.ts): unless something else took focus meanwhile, `blur()` was called,
// or the control left the page. Before its first update a control's shadow root holds nothing to delegate to and the
// part its own `focus()` goes to is not there, so without this the call lands nowhere. That every `focus()` and
// `blur()` the package writes takes part is read by test/kept-focus.test.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

/** Each control as markup with `id="subject"`: a shadow root that delegates focus, a `focus()` of its own, or a composed element's. */
const SUBJECTS: Record<string, string> = {
  'tanrei-button': '<tanrei-button id="subject">Send</tanrei-button>',
  'tanrei-button-with-menu': '<tanrei-button-with-menu id="subject" label="More"><tanrei-menu-item label="One"></tanrei-menu-item></tanrei-button-with-menu>',
  'tanrei-main-action-button': '<tanrei-main-action-button id="subject" label="New"><span slot="icon">add</span></tanrei-main-action-button>',
  'tanrei-copy-button': '<tanrei-copy-button id="subject" value="a" label="Copy" copied-label="Copied"></tanrei-copy-button>',
  'tanrei-chip': '<tanrei-chip id="subject" label="Chip"></tanrei-chip>',
  'tanrei-card': '<tanrei-card id="subject" interactive label="Card">Card</tanrei-card>',
  'tanrei-checkbox': '<tanrei-checkbox id="subject" label="Checkbox"></tanrei-checkbox>',
  'tanrei-switch': '<tanrei-switch id="subject" label="Switch"></tanrei-switch>',
  'tanrei-radio-button': '<tanrei-radio-button id="subject" label="Radio" value="a"></tanrei-radio-button>',
  'tanrei-slider': '<tanrei-slider id="subject" label="Slider" value="40"></tanrei-slider>',
  'tanrei-text-input': '<tanrei-text-input id="subject" label="Text"></tanrei-text-input>',
  'tanrei-embedded-text-input': '<tanrei-embedded-text-input id="subject" label="Text"></tanrei-embedded-text-input>',
  'tanrei-one-time-code-input': '<tanrei-one-time-code-input id="subject" label="Code"></tanrei-one-time-code-input>',
  'tanrei-search': '<tanrei-search id="subject" label="Search"></tanrei-search>',
  'tanrei-number-input': '<tanrei-number-input id="subject" label="Number" increment-label="More" decrement-label="Less"></tanrei-number-input>',
  'tanrei-color-input': '<tanrei-color-input id="subject" label="Color" value="#0f766e"></tanrei-color-input>',
  'tanrei-select': '<tanrei-select id="subject" label="Select"><tanrei-option value="a">Alpha</tanrei-option></tanrei-select>',
  'tanrei-combobox': '<tanrei-combobox id="subject" label="Combobox"><tanrei-option value="a">Alpha</tanrei-option></tanrei-combobox>',
  'tanrei-file-picker': '<tanrei-file-picker id="subject" label="Attachment"><tanrei-button slot="trigger">Choose a file</tanrei-button></tanrei-file-picker>',
  'tanrei-calendar': '<tanrei-calendar id="subject" value="2026-09-17" today="2026-09-24" locale="en-US" previous-month-label="Previous month" next-month-label="Next month" year-view-label="Choose a year" today-label="Today"></tanrei-calendar>',
  'tanrei-text-field': '<tanrei-text-field id="subject" label="Email"></tanrei-text-field>',
  'tanrei-number-field': '<tanrei-number-field id="subject" label="Amount" increment-label="More" decrement-label="Less"></tanrei-number-field>',
  'tanrei-select-field': '<tanrei-select-field id="subject" label="Country"><tanrei-option value="ca">Canada</tanrei-option></tanrei-select-field>',
};

const document_ = () => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><style>${read('dist/tokens.css')}</style></head>
<body><input id="other" aria-label="Other" /><div id="stage"></div><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

async function load(page: Page, tag: string) {
  await page.route('http://kept-focus.test/**', (route) => route.fulfill({ contentType: 'text/html', body: document_() }));
  await page.goto(`http://kept-focus.test/${tag}`);
  await page.waitForFunction((t) => !!customElements.get(t), tag);
}

/** What happens when a script inserts the control and, before its first update, does `then`; read after it has drawn. */
type Then = 'focus' | 'focus, then the other input' | 'focus, then blur' | 'focus, then remove' | 'focus without scrolling' | 'focus, then focus without scrolling';

async function insertAnd(page: Page, markup: string, then: Then) {
  return page.evaluate(
    async ({ markup, then }) => {
      type Updating = HTMLElement & { updateComplete: Promise<unknown>; hasUpdated: boolean };
      const stage = document.querySelector<HTMLElement>('#stage')!;
      // Below the fold, so that whether focus scrolled the page to it can be read.
      stage.style.paddingBlockStart = '200vh';
      stage.innerHTML = markup;
      const subject = stage.querySelector<Updating>('#subject')!;
      const before = { updated: subject.hasUpdated, active: document.activeElement?.localName ?? null };
      if (then === 'focus without scrolling') subject.focus({ preventScroll: true });
      else if (then === 'focus, then focus without scrolling') {
        subject.focus();
        subject.focus({ preventScroll: true });
      } else subject.focus();
      if (then === 'focus, then the other input') document.querySelector<HTMLElement>('#other')!.focus();
      if (then === 'focus, then blur') subject.blur();
      if (then === 'focus, then remove') subject.remove();
      const atOnce = document.activeElement?.localName ?? null;
      // Drawn: its own update and its members' (a composed element's `updateComplete` waits for them), two frames on.
      // One that left the page at once still updates (it was connected), but it is not waited for.
      const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      for (let pass = 0; pass < 2; pass++) {
        for (const element of [subject, ...subject.querySelectorAll<Updating>('*')]) await Promise.race([element.updateComplete, frames()]);
        await frames();
      }
      let focused: Node | null = document.activeElement;
      while ((focused as Element | null)?.shadowRoot?.activeElement) focused = (focused as Element).shadowRoot!.activeElement;
      // Whether what has focus is the control or inside it, through every shadow root between.
      let inside = false;
      for (let node: Node | null = focused; node; node = node.parentNode ?? (node as ShadowRoot).host ?? null) {
        if (node === subject) inside = true;
      }
      return { before, atOnce, focused: (focused as Element | null)?.id || (focused as Element | null)?.localName || null, inside, scrolled: window.scrollY > 0 };
    },
    { markup, then },
  );
}

for (const [tag, markup] of Object.entries(SUBJECTS)) {
  test(`${tag}: focus() called before its first update is given once it has drawn, with its options, and not where focus moved meanwhile, after blur() or once it left the page`, async ({ page }) => {
    await load(page, tag);

    const given = await insertAnd(page, markup, 'focus');
    // The call is made before the first update, and lands nowhere then: the control has nothing drawn to focus.
    expect(given.before, 'the call is made before the first update').toEqual({ updated: false, active: 'body' });
    expect(given.atOnce, 'nothing takes focus at the call').toBe('body');
    expect(given.inside, `focus is in the control once it has drawn (it is on ${given.focused})`).toBe(true);
    expect(given.scrolled, 'focus scrolls it into view').toBe(true);

    await load(page, tag);
    const still = await insertAnd(page, markup, 'focus without scrolling');
    expect(still.inside, `focus({ preventScroll: true }) is given (it is on ${still.focused})`).toBe(true);
    expect(still.scrolled, 'with its options: the page does not scroll').toBe(false);

    await load(page, tag);
    const last = await insertAnd(page, markup, 'focus, then focus without scrolling');
    expect(last.inside, 'focus asked for twice is given once').toBe(true);
    expect(last.scrolled, 'with the last call’s options').toBe(false);

    await load(page, tag);
    const moved = await insertAnd(page, markup, 'focus, then the other input');
    expect([moved.focused, moved.inside], 'focus the page moved meanwhile stays where it is').toEqual(['other', false]);

    await load(page, tag);
    const blurred = await insertAnd(page, markup, 'focus, then blur');
    expect([blurred.focused, blurred.inside], 'blur() gives the kept focus up').toEqual(['body', false]);

    await load(page, tag);
    const removed = await insertAnd(page, markup, 'focus, then remove');
    expect([removed.focused, removed.inside], 'a control that left the page takes no focus').toEqual(['body', false]);
  });
}
