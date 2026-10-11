// What drawing many of one component at once costs the page in STYLE PASSES and LAYOUTS.
//
// A component that reads the cascade or a box in its own first update — after writing its own shadow tree, each
// instance in its own microtask — has the browser style and lay out the page once for itself. One such read is a
// fraction of a millisecond on a bare page and several on a product's, and a page that draws fifty of the component
// pays it fifty times; a product that writes anything wide afterwards in the same turn pays for the whole page twice.
// So the PASSES are counted here, never the time (a time is the machine's as much as the package's): Chromium's own
// counters (`RecalcStyleCount`, `LayoutCount`, over the DevTools protocol) around N instances appended in one task on
// a bare page, from the append until the page is at rest.
//
// What is held, for each subject: the count for N instances is a small constant — what one frame owes, and a fixed
// number of reads for the batch — and not a number that grows with N.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CDPSession, type Page, expect, test } from '@playwright/test';
import { rootTokens } from '../../test/harness.js';
import { LIGHT_DOM_SUBJECTS } from '../../test/light-dom.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The address the test's pages are served at (nothing is fetched from it). */
const PAGE = 'http://passes.test/';

/** How many are appended at once: enough that "once" and "once each" cannot be mistaken for one another. */
const N = 50;

/** A page of `body`, with the tokens, `css` as the page's own stylesheets and the bundle that defines every element. */
const document = (body: string, css: string[] = [], style = '') =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style>${css.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}${style ? `<style>${style}</style>` : ''}</head><body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;

async function open(page: Page, html: string) {
  await page.unroute(PAGE);
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(PAGE);
  await page.evaluate(() => customElements.whenDefined('tanrei-button'));
  await rest(page);
}

/** The page at rest: its fonts answered, and `frames` frames drawn with nothing asked for in between. */
async function rest(page: Page, frames = 4) {
  await page.evaluate(async (count) => {
    await document.fonts.ready;
    for (let frame = 0; frame < count; frame++) await new Promise((done) => requestAnimationFrame(done));
  }, frames);
}

export interface Passes {
  /** Style recalculations (`RecalcStyleCount`). */
  style: number;
  /** Layouts (`LayoutCount`). */
  layout: number;
}

async function counters(cdp: CDPSession): Promise<Passes> {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const value = (name: string) => metrics.find((metric) => metric.name === name)!.value;
  return { style: value('RecalcStyleCount'), layout: value('LayoutCount') };
}

/**
 * The style passes and layouts from `script` — one task of the page — until the page is at rest again (`frames` frames
 * later: a component that moves something by frames is counted while it moves). What the task forced and what the
 * frames after it owed are counted together: the counters are read over the protocol, and nothing tells a reading
 * taken directly after the task from one taken a frame later. A page at rest owes a frame nothing, so the sum is the
 * same at every run.
 */
export async function passes(page: Page, cdp: CDPSession, script: string, frames = 4): Promise<Passes> {
  const before = await counters(cdp);
  await cdp.send('Runtime.evaluate', { expression: `{ ${script} }; undefined` });
  await rest(page, frames);
  const after = await counters(cdp);
  return { style: after.style - before.style, layout: after.layout - before.layout };
}

/** A script that appends `count` of `html(n)` to `into`, all at once. */
const append = (html: (n: number) => string, count: number, into = 'body') =>
  `document.querySelector(${JSON.stringify(into)}).insertAdjacentHTML('beforeend', ${JSON.stringify(Array.from({ length: count }, (_, n) => html(n + 1)).join(''))})`;

async function session(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Runtime.enable');
  return cdp;
}

interface Subject {
  /** What is counted, as the test's title says it. */
  name: string;
  /** The stylesheets the page loads. */
  css?: string[];
  /** One instance. */
  html: (n: number) => string;
  /**
   * The most `N` instances may cost, appended at once after a first one, until the page is at rest: what was counted
   * on Chromium 153 and two style passes and a layout more, for another engine version — nothing like
   * one for each instance.
   */
  most: Passes;
  /** Frames until rest (long enough to count a first placement that moves by frames). */
  frames?: number;
  /**
   * Style passes the ENGINE counts for each instance, with no script on the page: an element that is a size container
   * (`container-type: inline-size`) is styled inside the layout that first sizes it, and that is counted as a pass of
   * its own — fifty bare `<div>`s that are containers count fifty-one. `most.style` includes them; what is held is
   * that script adds nothing for each instance on top of them.
   */
  each?: number;
  /** Rules of the page's own, after the stylesheets. */
  style?: string;
}

// The light-DOM elements, with the markup of
// test/light-dom.ts on a page that loaded the element's stylesheet. Counted for fifty before each was changed (style
// passes and layouts), and what each read for itself:
//  - description list 153 and 103: the widest term, measured by each list in its own update and again in its own
//    report of sizes (now: every list of a turn held, read and written together; one observer for them all);
//  - breadcrumbs 251 and 152 (202 and 102 once the sheet's question was gone): the levels' widths, measured by each
//    trail in its own update and in its own report of sizes, and a token its empty overflow menu read when it was
//    connected and when it was updated (now: measured together; a menu without rows reads nothing);
//  - skeleton about 120: its delay, the stylesheet's wait and the manner, read at each insertion and again at each
//    update (now: read for every skeleton of the turn, then written). Counted with the manner `none`: a skeleton that
//    pulses has the engine style it in every frame, which is its animation and not a read;
//  - link card 101 and 2: nothing of its own — the debug build's availability (src/primitives/availability.ts) read
//    the computed style of each card, a size container, before the card wrote its parts, and so had the page laid
//    out twice (now: it reads after the hosts' updates);
//  - table of contents 51 and 51: where its targets are, read by each in its own first update (now: read for all in
//    one microtask after their updates, each then given its item);
//  - app shell 50 and 1: the widths its stylesheet was written for, read by each frame as it was connected, after
//    the class the one before it had written (now: read for the frames of a turn together);
//  - table 52 and 1, page header 51 and 1: nothing — they were the engine's own passes for size containers (`each`),
//    and are held here so that they stay that.
const LIGHT: [tag: string, most: Passes, more?: Pick<Subject, 'each' | 'style'>][] = [
  ['tanrei-description-list', { style: 56, layout: 5 }, { each: 1 }],
  ['tanrei-breadcrumbs', { style: 8, layout: 6 }],
  ['tanrei-skeleton', { style: 5, layout: 2 }, { style: ':root { --tanrei-comp-skeleton-motion-animation: none; }' }],
  ['tanrei-link-card', { style: 53, layout: 2 }, { each: 1 }],
  ['tanrei-table', { style: 53, layout: 2 }, { each: 1 }],
  ['tanrei-page-header', { style: 53, layout: 2 }, { each: 1 }],
  ['tanrei-table-of-contents', { style: 3, layout: 2 }],
  ['tanrei-app-shell', { style: 3, layout: 2 }],
];

const options = (count: number) => Array.from({ length: count }, (_, n) => `<tanrei-option value="o${n}" label="Option ${n}"></tanrei-option>`).join('');

// Counted for fifty before each was changed (style passes and layouts): the color field 53 and 51, the select and the
// combobox 100 and 50 (each host read its glyph's box in its own update: src/primitives/glyph.ts); the tabs 301 and
// 250 (each tab measured its label and each row placed its indicator in its own turn); the slider 50 and 1 (the
// direction, asked of the cascade by each instance: src/primitives/direction.ts); the number field with a value 105
// and 101 (each field measured its steppers after writing their lengths: src/primitives/kept-length.ts); the text
// field 50 and 50, multiline 250 and 250 (`document.fonts.ready` and the height, fitted field by field); the
// reorderable list 355 and 351 (each list measured in a microtask of its own, between the other lists' renders).
const SUBJECTS: Subject[] = [
  { name: 'color field with its picker', html: (n) => `<tanrei-color-field label="Color ${n}" value="#336699" picker></tanrei-color-field>`, most: { style: 8, layout: 3 } },
  { name: 'select of three', html: (n) => `<tanrei-select label="Select ${n}">${options(3)}</tanrei-select>`, most: { style: 5, layout: 2 } },
  { name: 'combobox of five', html: (n) => `<tanrei-combobox label="Combobox ${n}">${options(5)}</tanrei-combobox>`, most: { style: 5, layout: 2 } },
  { name: 'combobox field of five', html: (n) => `<tanrei-combobox-field label="Combobox ${n}">${options(5)}</tanrei-combobox-field>`, most: { style: 5, layout: 2 } },
  {
    name: 'tabs of four',
    html: (n) => `<tanrei-tabs label="Tabs ${n}" value="a">${['a', 'b', 'c', 'd'].map((value) => `<tanrei-tab value="${value}" label="Tab ${value}"></tanrei-tab>`).join('')}</tanrei-tabs>`,
    most: { style: 6, layout: 3 },
    frames: 30,
  },
  { name: 'slider', html: (n) => `<tanrei-slider label="Slider ${n}" value="40"></tanrei-slider>`, most: { style: 4, layout: 2 } },
  { name: 'number field', html: (n) => `<tanrei-number-field label="Number ${n}" value="4"></tanrei-number-field>`, most: { style: 10, layout: 4 } },
  { name: 'number input', html: (n) => `<tanrei-number-input label="Number ${n}" value="4"></tanrei-number-input>`, most: { style: 10, layout: 4 } },
  { name: 'text input', html: (n) => `<tanrei-text-input label="Text ${n}"></tanrei-text-input>`, most: { style: 4, layout: 2 } },
  { name: 'multiline text input', html: (n) => `<tanrei-text-input multiline label="Text ${n}" value="One line"></tanrei-text-input>`, most: { style: 8, layout: 7 } },
  { name: 'text field', html: (n) => `<tanrei-text-field label="Text ${n}"></tanrei-text-field>`, most: { style: 4, layout: 2 } },
  { name: 'multiline text field', html: (n) => `<tanrei-text-field multiline label="Text ${n}" value="One line"></tanrei-text-field>`, most: { style: 8, layout: 7 } },
  {
    name: 'reorderable list of three',
    html: (n) => `<tanrei-list reorder="buttons" label="List ${n}">${[1, 2, 3].map((row) => `<tanrei-list-item headline="Row ${row}"></tanrei-list-item>`).join('')}</tanrei-list>`,
    most: { style: 10, layout: 5 },
  },
  {
    name: 'file picker with its drop area',
    html: (n) => `<tanrei-file-picker layout="drop-area" label="Files ${n}" drop-text="Drag files here" constraints-text="Any file"><tanrei-button slot="trigger">Choose</tanrei-button></tanrei-file-picker>`,
    most: { style: 3, layout: 2 },
  },
  ...LIGHT.map(([tag, most, more]) => {
    const subject = LIGHT_DOM_SUBJECTS.find((each) => each.tag === tag)!;
    return { name: `${tag.replace('tanrei-', '').replaceAll('-', ' ')} (light DOM, the page's stylesheet)`, css: [subject.css], html: subject.html, most, ...more };
  }),
];

/** Counts, from before any script of the page runs, how often a computed style is asked for one of `marks`. */
async function watchQuestions(page: Page, marks: string[]) {
  await page.addInitScript((names) => {
    const asked: string[] = [];
    (window as unknown as { __asked: string[] }).__asked = asked;
    const own = CSSStyleDeclaration.prototype.getPropertyValue;
    CSSStyleDeclaration.prototype.getPropertyValue = function (name: string) {
      if (names.includes(name)) asked.push(name);
      return own.call(this, name);
    };
  }, marks);
}
/** The questions asked since the last call. */
const questions = (page: Page) => page.evaluate(() => (window as unknown as { __asked: string[] }).__asked.splice(0));

test.describe('the style passes and layouts of many instances drawn at once', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the counters are Chromium\'s');

  for (const subject of SUBJECTS) {
    test(`${subject.name}: ${N} appended in one task cost a fixed number of style passes and layouts, not one for each`, async ({ page }) => {
      await open(page, document(subject.html(0), subject.css, subject.style));
      const cdp = await session(page);
      await rest(page, subject.frames);
      const few = await passes(page, cdp, append(subject.html, 5), subject.frames);
      const many = await passes(page, cdp, append(subject.html, N), subject.frames);
      test.info().annotations.push({ type: 'passes', description: `5 → ${JSON.stringify(few)}; ${N} → ${JSON.stringify(many)}` });
      // Ten times as many cost what five cost (a frame more or less), and no more than was counted.
      expect(many.style - few.style - (subject.each ?? 0) * (N - 5), `style passes ${N} cost more than 5 (${few.style})`).toBeLessThanOrEqual(2);
      expect(many.layout - few.layout, `layouts ${N} cost more than 5 (${few.layout})`).toBeLessThanOrEqual(1);
      expect(many.style, `style passes for ${N} (for 5: ${few.style})`).toBeLessThanOrEqual(subject.most.style);
      expect(many.layout, `layouts for ${N} (for 5: ${few.layout})`).toBeLessThanOrEqual(subject.most.layout);
    });
  }

  // A choice: the indicator's slide
  // (TAB-17) is the browser's — the row writes where everything rests, once, and hands every tab's pieces to the
  // browser as animations. Before, the row drew every tab's piece in each frame of the slide: thirty-one frames with a
  // write and thirty-one frames asked for at the default duration, and more for a longer one. What is counted: the
  // frames in which a style or a class of the row or of a tab is written, and the frames the page's script asks for,
  // from the choice until the slide is over — the same for a slide ten times as long — while the indicator is seen at
  // places in between.
  test('tabs of four: a choice writes the row once and asks for no frame, however long the indicator slides', async ({ page }) => {
    const tabs = SUBJECTS.find((subject) => subject.name === 'tabs of four')!;
    const choose = async (duration: number) => {
      await open(page, document(tabs.html(0)));
      await rest(page, 30);
      await rootTokens(page, { '--tanrei-comp-tabs-motion-indicator-duration': `${duration}ms` });
      return page.evaluate(async () => {
        const frame = (): Promise<number> => new Promise((done) => ask(done));
        const ask = window.requestAnimationFrame.bind(window);
        await frame();
        await frame();
        const row = document.querySelector('tanrei-tabs')!;
        const all = [...row.querySelectorAll('tanrei-tab')] as HTMLElement[];
        const cover = all[3].shadowRoot!.querySelector('.cover')!;
        const place = () => getComputedStyle(cover).clipPath;
        const from = place();
        let [now, asked] = [0, 0];
        const written = new Set<number>();
        const seen = new MutationObserver(() => written.add(now));
        for (const root of [row, row.shadowRoot!, ...all.flatMap((tab) => [tab, tab.shadowRoot!])]) seen.observe(root, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
        window.requestAnimationFrame = (callback) => {
          asked++;
          return ask(callback);
        };
        all[3].click();
        const places = new Set<string>();
        const clock = () => row.shadowRoot!.querySelector('.tabs')!.getAnimations().some((animation) => animation.id === 'tanrei-tabs-slide');
        const slid = [] as boolean[];
        do {
          await frame();
          now++;
          slid.push(clock());
          places.add(place());
        } while (slid[slid.length - 1] || slid.length < 4);
        for (let after = 0; after < 4; after++, now++) await frame();
        seen.disconnect();
        const to = place();
        places.delete(from);
        places.delete(to);
        return { written: written.size, asked, frames: slid.filter(Boolean).length, between: places.size, moved: from !== to, value: (row as unknown as { value: string }).value };
      });
    };
    const short = await choose(200);
    const long = await choose(2000);
    test.info().annotations.push({ type: 'passes', description: `200 ms → ${JSON.stringify(short)}; 2000 ms → ${JSON.stringify(long)}` });
    for (const slide of [short, long]) {
      expect(slide.value).toBe('d');
      expect(slide.moved, 'the indicator went to the chosen tab').toBe(true);
      expect(slide.written, 'frames in which the row or a tab is written').toBeLessThanOrEqual(2);
      expect(slide.asked, 'frames asked for by script').toBe(0);
    }
    // The browser draws it in between: a slide ten times as long is seen at many more places, for the same writes.
    expect(long.frames).toBeGreaterThan(short.frames * 3);
    expect(long.between).toBeGreaterThan(short.between);
    expect(long.between).toBeGreaterThanOrEqual(long.frames - 4);
    expect(long.written).toBe(short.written);
  });

  // The question a light-DOM element asks of the cascade when it is connected — does this root draw me already
  // (src/primitives/sheets.ts)? — is a read of computed style inside the script that connected it: whatever that
  // script wrote so far is styled, and laid out, there and then. It is asked once for a root and a
  // sheet: by the first element of the page, and by none after it — side by side or one inside another, in that turn
  // or a later one. The QUESTIONS are counted exactly (each is a read of the sheet's mark, on the element and on what
  // it inherits from); and the passes of a page that loaded the stylesheet are no more than those of a page whose
  // elements were handed their own sheet, where nothing is asked because the root has the sheet.
  for (const subject of LIGHT_DOM_SUBJECTS) {
    test(`${subject.tag}: on a page that loaded ${subject.css} the first ${N} connected in one task ask the cascade once, and those of later turns never`, async ({ page }) => {
      const nestedIn = subject.inside ? `${subject.tag} ${subject.inside}` : subject.tag;
      await watchQuestions(page, [subject.mark]);
      const count = async (css: string[]) => {
        await open(page, document('', css));
        const cdp = await session(page);
        await questions(page);
        const first = { passes: await passes(page, cdp, append(subject.html, N)), asked: (await questions(page)).length };
        const second = { passes: await passes(page, cdp, append(subject.html, N)), asked: (await questions(page)).length };
        const nested = { passes: await passes(page, cdp, append(subject.html, 1, nestedIn)), asked: (await questions(page)).length };
        await cdp.detach();
        return { first, second, nested };
      };
      const own = await count([]);
      const loaded = await count([subject.css]);
      test.info().annotations.push({ type: 'passes', description: `own sheet ${JSON.stringify(own)}; loaded ${JSON.stringify(loaded)}` });
      // The page with the element's own sheet is the measure: its first element reads the mark once, finds nothing and
      // hands the root the sheet, and no element after it asks (the root has the sheet). What an element reads of its
      // mark for a purpose of its own (the app shell's breakpoint) is in both counts.
      expect(loaded.first.asked - own.first.asked, 'reads of the mark by the first batch, more than with the element\'s own sheet: what the element inherits from').toBeLessThanOrEqual(1);
      expect(loaded.second.asked, 'reads of the mark by a later batch').toBe(own.second.asked);
      expect(loaded.nested.asked, 'reads of the mark by one inside another').toBe(own.nested.asked);
      if (subject.steady) {
        expect(loaded.second.passes.style, `style passes of ${N} side by side (with the element's own sheet: ${own.second.passes.style})`).toBeLessThanOrEqual(own.second.passes.style);
        expect(loaded.second.passes.layout, `layouts of ${N} side by side (with the element's own sheet: ${own.second.passes.layout})`).toBeLessThanOrEqual(own.second.passes.layout);
        expect(loaded.nested.passes.style, `style passes of one inside another (with the element's own sheet: ${own.nested.passes.style})`).toBeLessThanOrEqual(own.nested.passes.style);
        expect(loaded.nested.passes.layout, `layouts of one inside another (with the element's own sheet: ${own.nested.passes.layout})`).toBeLessThanOrEqual(own.nested.passes.layout);
      }
    });
  }
});
