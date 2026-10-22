// What deciding whether the icon set can draw a component's glyphs costs a page of them (src/primitives/glyph.ts). The
// work is counted, not timed (a time is the machine's as much as the package's): the listeners the page's fonts are
// given, and the reads of the layout (`clientWidth` / `offsetWidth`, what a glyph is decided by) that a change of state
// and a text face's arrival cost.
//
// What is held:
//   - the page's fonts are listened to once, however many hosts there are, and not at all once none is connected;
//   - a change of state that leaves every glyph's name and family as they were reads no layout, and the glyphs keep
//     their marks;
//   - a face of a family no glyph is drawn in (a text face) reads no glyph when it arrives. WebKit fires no
//     `loadingdone` for a face added this way, so there it holds whatever the controller does with the event.
// That a change of family, and the arrival of the icon face, are still decided at once is held by the components'
// own tests (CHK-19, SWT-17).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { presetFontFaces } from '../../test/harness.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The address the test's page is served at (nothing is fetched from it). */
const PAGE = 'http://glyph.test/';

/** How many hosts of each kind: enough that "once" and "once for each" cannot be mistaken for one another. */
const N = 40;

/** Hosts whose every glyph the controller decides, and the property that changes their state. */
const HOSTS = [
  { tag: 'tanrei-checkbox', markup: '<tanrei-checkbox label="Email me"></tanrei-checkbox>' },
  { tag: 'tanrei-switch', markup: '<tanrei-switch label="Wi-Fi" checked-icon="check" unchecked-icon="close"></tanrei-switch>' },
] as const;

/** Counts from before any script of the page runs. */
const COUNT = () => {
  const seen = { reads: 0, listeners: 0 };
  (window as unknown as { seen: typeof seen }).seen = seen;
  for (const [proto, name] of [
    [Element.prototype, 'clientWidth'],
    [HTMLElement.prototype, 'offsetWidth'],
  ] as const) {
    const own = Object.getOwnPropertyDescriptor(proto, name)!;
    Object.defineProperty(proto, name, {
      configurable: true,
      get() {
        seen.reads += 1;
        return own.get!.call(this);
      },
    });
  }
  const { addEventListener: add, removeEventListener: remove } = EventTarget.prototype;
  const ofFonts = (target: EventTarget, type: string) => target === document.fonts && (type === 'loadingdone' || type === 'loadingerror');
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: [never, never]) {
    if (ofFonts(this, type)) seen.listeners += 1;
    return add.call(this, type, ...rest);
  };
  EventTarget.prototype.removeEventListener = function (this: EventTarget, type: string, ...rest: [never, never]) {
    if (ofFonts(this, type)) seen.listeners -= 1;
    return remove.call(this, type, ...rest);
  };
};

async function mount(page: Page) {
  const icons = await presetFontFaces(['Material Symbols Rounded']);
  const body = HOSTS.map((host) => host.markup.repeat(N)).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style><style>${icons}</style></head><body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;
  await page.addInitScript(COUNT);
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(PAGE);
  await page.evaluate(async (tags) => {
    await document.fonts.load('24px "Material Symbols Rounded"', 'check');
    await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
    await Promise.all(tags.flatMap((tag) => [...document.querySelectorAll(tag)].map((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete)));
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  }, HOSTS.map((host) => host.tag));
}

/** The glyphs of every host marked drawable. */
const drawn = (page: Page) =>
  page.evaluate((tags) => tags.flatMap((tag) => [...document.querySelectorAll(tag)].map((el) => el.shadowRoot!.querySelectorAll('[data-drawn]').length)), HOSTS.map((host) => host.tag));

test.describe('GlyphDrawnController', () => {
  test.beforeEach(async ({ page }) => mount(page));

  test('the fonts of the page are listened to once, however many hosts draw glyphs, and not at all once none is connected', async ({ page }) => {
    expect(await page.evaluate(() => (window as unknown as { seen: { listeners: number } }).seen.listeners)).toBe(2);
    const left = await page.evaluate(async () => {
      for (const el of [...document.body.children]) if (el.localName.startsWith('tanrei-')) el.remove();
      return (window as unknown as { seen: { listeners: number } }).seen.listeners;
    });
    expect(left).toBe(0);
  });

  test('a change of state that leaves every glyph its name and family reads no layout, and every glyph keeps its mark', async ({ page }) => {
    const before = await drawn(page);
    expect(before.every((marks) => marks > 0), 'the glyphs are drawable before the change').toBe(true);
    for (let i = 0; i < 2; i++) {
      const reads = await page.evaluate(async (tags) => {
        const seen = (window as unknown as { seen: { reads: number } }).seen;
        const hosts = tags.flatMap((tag) => [...document.querySelectorAll(tag)]) as unknown as { checked: boolean; updateComplete: Promise<unknown> }[];
        const from = seen.reads;
        for (const host of hosts) host.checked = !host.checked;
        await Promise.all(hosts.map((host) => host.updateComplete));
        // The hosts decide in a microtask after their renders: past it, in a task of its own.
        await new Promise((done) => setTimeout(done, 0));
        return seen.reads - from;
      }, HOSTS.map((host) => host.tag));
      expect(reads, `change ${i + 1}`).toBe(0);
    }
    expect(await drawn(page)).toEqual(before);
  });

  test('a face of a family no glyph is drawn in reads no glyph when it arrives', async ({ page }) => {
    const family = 'Tanrei Late Text';
    const faces = (await presetFontFaces(['Material Symbols Rounded'])).replaceAll('Material Symbols Rounded', family);
    const reads = await page.evaluate(
      async ({ family, faces }) => {
        const seen = (window as unknown as { seen: { reads: number } }).seen;
        const from = seen.reads;
        const style = document.createElement('style');
        style.textContent = faces;
        document.head.append(style);
        await document.fonts.load(`16px "${family}"`, 'a');
        await document.fonts.ready;
        await new Promise((done) => setTimeout(done, 0));
        return seen.reads - from;
      },
      { family, faces },
    );
    expect(reads).toBe(0);
  });
});
