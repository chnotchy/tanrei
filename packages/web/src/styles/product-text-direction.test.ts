// productText() (`product-text.ts`): the direction of a text the product gives a component, signs and numbers included.
//
// A text the product gives a component is laid out by its first strong character — and left to right where it
// has none, in every layout: `−5`, `40 %` and `+1 555 0100` keep their order in a right-to-left layout, where a
// right-to-left paragraph would draw `5−`, `% 40` and `0100 555 1+`. The first table holds that for the boxes that
// compose productText(): each is given such a text in a right-to-left stage and must draw its characters from the
// left, as a left-to-right stage does; a text with a left-to-right letter keeps its order, and one with a
// right-to-left letter is right to left.
//
// A text that does not fit is cut at the end of its own direction. The second table holds it for the boxes that
// cut a text and have no test of their own for it (ownDirection()).
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, loadSpec, mountFixtures } from '../../test/harness.js';

/** Texts without a letter: a signed number, a number and its unit, a telephone number, a range. */
const LETTERLESS = ['−5', '40 %', '+1 555 0100', '10 – 20'];
/** A range, for the second table. */
const RANGE = '10 – 20';
/** With a left-to-right letter first: a left-to-right text. */
const NAMED = 'v 1 – 2';
/** With a right-to-left letter first: a right-to-left text, its letter at the right and 1 at the right of 2. */
const HEBREW = 'א 1 – 2';

/** The props that are a text the component draws. */
const TEXTS = new Set(['label', 'headline', 'title', 'subtitle', 'text', 'message', 'supportingText', 'trailingText', 'heading', 'shortLabel', 'actionLabel', 'constraintsText', 'selectionText', 'dropText', 'name', 'sizeText', 'statusText', 'placeholder', 'valueText']);

const withText = (props: Fixture['props'], text: string, also: string[]) => Object.fromEntries(Object.entries(props ?? {}).map(([key, value]) => [key, (TEXTS.has(key) || also.includes(key)) && typeof value === 'string' ? text : value]));
const itemsWithText = (items: FixtureItem[] | undefined, text: string, also: string[]): FixtureItem[] | undefined => items?.map((item) => ({ ...item, props: withText(item.props, text, also), items: itemsWithText(item.items, text, also) }) as FixtureItem);
/** `fixture` in a right-to-left stage with every text it gives replaced by `text`. */
function retold(fixture: Fixture, text: string, { content, texts = [] }: Subject): Fixture {
  return { ...fixture, id: `${fixture.id}--told`, direction: 'rtl', props: withText(fixture.props, text, texts), items: itemsWithText(fixture.items, text, texts), ...(content && fixture.content !== undefined ? { content: text } : {}) };
}

interface Seen {
  /** `<host tag> .<class of the box that holds the text>`. */
  where: string;
  /** The left edge of each character that is not a space, in the order written. */
  lefts: number[];
}

/**
 * Every text node drawn whole on one line that is exactly `text` and is held by a component — in a shadow root, or
 * slotted into one — inside a retold stage: where it is, and where each of its characters stands.
 */
function seen(page: Page, text: string): Promise<Seen[]> {
  return page.evaluate((text) => {
    const out: { where: string; lefts: number[] }[] = [];
    const staged = (node: Node): boolean => {
      for (let at: Node | null = node; at; at = at instanceof ShadowRoot ? at.host : (at.parentNode ?? null)) if (at instanceof Element && at.matches('[data-fixture$="--told"]')) return true;
      return false;
    };
    const walk = (root: Node) => {
      for (const node of root.childNodes) {
        if (node instanceof Element) {
          if (node.shadowRoot) walk(node.shadowRoot);
          walk(node);
          continue;
        }
        if (!(node instanceof Text) || node.data.trim() !== text) continue;
        const holder = node.assignedSlot ?? node.parentElement;
        if (!holder || !(holder.getRootNode() instanceof ShadowRoot) || !staged(node)) continue;
        const named = holder.closest('[class]') ?? holder;
        if (!named.checkVisibility({ visibilityProperty: true })) continue;
        const from = node.data.indexOf(text);
        const rects = [...text].flatMap((char, index) => {
          if (char === ' ') return [];
          const range = document.createRange();
          range.setStart(node, from + index);
          range.setEnd(node, from + index + 1);
          return [range.getBoundingClientRect()];
        });
        // Broken onto two lines, or cut (an engine gives what an ellipsis hides no box): only a whole line says.
        if (rects.some((rect) => !rect.width) || rects.some((rect) => Math.abs(rect.top - rects[0]!.top) > 2)) continue;
        out.push({ where: `${(named.getRootNode() as ShadowRoot).host.localName} .${named.classList[0] ?? named.localName}`, lefts: rects.map((rect) => rect.left) });
      }
    };
    walk(document.body);
    return out;
  }, text);
}

interface Subject {
  /** The boxes that hold a text of the product's under productText(): each must be seen, and no other is. */
  boxes: string[];
  /** The fixtures to mount, where not all of them can be drawn in one page. */
  only?: string[];
  /** Fixtures not mounted: ones that draw no box the others do not, and take long to mount six times. */
  without?: string[];
  /** The fixture's content is the label (a slot). */
  content?: boolean;
  /** Props of this component that are a text it draws, beside `TEXTS`. */
  texts?: string[];
  /** A prop every fixture is given beside its own. */
  give?: string;
  /** Boxes that draw the text and are not this file's: said where they are listed. */
  except?: string[];
}

const SUBJECTS: Record<string, Subject> = {
  'app-bar': { boxes: ['tanrei-app-bar .subtitle', 'tanrei-app-bar .title'] },
  button: { boxes: ['tanrei-button .label'], content: true },
  'button-with-menu': { boxes: ['tanrei-button-with-menu .label'] },
  callout: { boxes: ['tanrei-callout .headline'] },
  checkbox: { boxes: ['tanrei-checkbox .label'] },
  chip: { boxes: ['tanrei-chip .label'] },
  'code-block': { boxes: ['tanrei-code-block .title'] },
  dialog: { boxes: ['tanrei-dialog .headline', 'tanrei-dialog .supporting'] },
  // `.announce` is what the state says to assistive technology, not drawn (WebKit gives it a box).
  'empty-state': { boxes: ['tanrei-empty-state .headline'], except: ['tanrei-empty-state .announce'] },
  'fab-menu': { boxes: ['tanrei-fab-menu-item .label'] },
  // `.start` and `.whole` are a tile's name: drawn in two boxes inside a <bdi> (FIT-9), and whole for assistive
  // technology, not drawn. Neither is under productText().
  'file-item': { boxes: ['tanrei-file-item .headline', 'tanrei-file-item .said'], except: ['tanrei-file-item .start', 'tanrei-file-item .whole'] },
  'file-picker': { boxes: ['tanrei-file-picker .label', 'tanrei-file-picker .selection', 'tanrei-file-picker .supporting'] },
  'main-action-button': { boxes: ['tanrei-main-action-button .label'] },
  menu: {
    boxes: [
      'tanrei-menu-checkbox-item .label',
      'tanrei-menu-group .title',
      'tanrei-menu-item .label',
      'tanrei-menu-item .supporting',
      'tanrei-menu-item .trailing-text',
      'tanrei-menu-radio-item .label',
      'tanrei-menu-radio-item .supporting',
      'tanrei-menu-radio-item .trailing-text',
      'tanrei-submenu .label',
      'tanrei-submenu .supporting',
      'tanrei-submenu .trailing-text',
    ],
  },
  menubar: { boxes: ['tanrei-menubar-item .label', 'tanrei-menubar-menu .label'] },
  'navigation-bar': { boxes: ['tanrei-navigation-bar-item .c-label', 'tanrei-navigation-bar-item .label'] },
  'navigation-drawer': {
    // Two drawers of 77 rows each, of the same elements as site-sidebar's 17: with them a mount takes 3 s in WebKit on
    // a fast machine and 5 to 8 s on the CI's, and the six mounts of this test more than the 30 s a test has.
    // So the long and the restored sidebar are left out here.
    without: ['site-sidebar-long', 'site-sidebar-restored'],
    boxes: [
      'tanrei-main-action-button .label',
      'tanrei-navigation-drawer-group .label',
      'tanrei-navigation-drawer-group .short-text',
      'tanrei-navigation-drawer-item .label',
      'tanrei-navigation-drawer-item .short-text',
      'tanrei-navigation-drawer-item .trailing-text',
      'tanrei-navigation-drawer-section .heading-text',
    ],
  },
  popover: { boxes: ['tanrei-popover .headline'] },
  search: {
    boxes: ['tanrei-search .headline', 'tanrei-search .said', 'tanrei-search .supporting', 'tanrei-search .trigger-text', 'tanrei-search-result .headline', 'tanrei-search-result-group .headline', 'tanrei-search-result-group .title'],
  },
  'segmented-button': { boxes: ['tanrei-segment .label'] },
  'side-sheet': { boxes: ['tanrei-side-sheet .headline'] },
  stepper: { boxes: ['tanrei-stepper .label', 'tanrei-stepper-step .description', 'tanrei-stepper-step .label'], texts: ['description'] },
  slider: { boxes: ['tanrei-slider .value-text'], give: 'valueText' },
  snackbar: { boxes: ['tanrei-snackbar .hold', 'tanrei-snackbar .message', 'tanrei-snackbar .title'], texts: ['action'] },
  switch: { boxes: ['tanrei-switch .label'] },
  'table-of-contents': { boxes: ['tanrei-table-of-contents .row-current', 'tanrei-table-of-contents .row-title', 'tanrei-table-of-contents .title'] },
  tag: { boxes: ['tanrei-tag .label'] },
  // One tooltip is open in a page at a time.
  tooltip: { boxes: ['tanrei-tooltip .text', 'tanrei-tooltip .title'], only: ['rich'] },
};

const unique = (all: string[]) => [...new Set(all)].sort();
const leftToRight = (lefts: number[]) => lefts.every((left, index) => index === 0 || left > lefts[index - 1]!);

for (const [name, subject] of Object.entries(SUBJECTS)) {
  test(`${name} — in a right-to-left layout a text without a letter is drawn from the left, as in a left-to-right one; a text with a left-to-right letter keeps its order and one with a right-to-left letter is right to left`, async ({ page }) => {
    const spec = loadSpec(name);
    const fixtures = spec.fixtures.filter((f) => (!subject.only || subject.only.includes(f.id)) && !subject.without?.includes(f.id));
    const told = async (text: string) => {
      await mountFixtures(page, spec, { icons: true, fixtures: fixtures.map((f) => retold(subject.give ? { ...f, props: { ...f.props, [subject.give]: text } } : f, text, subject)) });
      return (await seen(page, text)).filter((s) => !subject.except?.includes(s.where));
    };
    // −5, 40 %, +1 555 0100, 10 – 20: every character at the right of the one before it. (The longest does not fit
    // every box on one line: each box is seen with one of them at least.)
    const boxes: string[] = [];
    for (const text of LETTERLESS) {
      const all = await told(text);
      boxes.push(...all.map((s) => s.where));
      expect(unique(all.filter((s) => !leftToRight(s.lefts)).map((s) => s.where)), text).toEqual([]);
    }
    expect(unique(boxes)).toEqual([...subject.boxes].sort());
    // "v 1 – 2": a left-to-right text, the same.
    const names = await told(NAMED);
    expect(unique(names.map((s) => s.where))).toEqual([...subject.boxes].sort());
    expect(unique(names.filter((s) => !leftToRight(s.lefts)).map((s) => s.where))).toEqual([]);
    // "א 1 – 2": a right-to-left text — its letter at the right, then 1, then 2 at the left.
    const hebrew = await told(HEBREW);
    expect(unique(hebrew.map((s) => s.where))).toEqual([...subject.boxes].sort());
    expect(unique(hebrew.filter((s) => !(s.lefts[0]! > s.lefts[1]! && s.lefts[1]! > s.lefts[3]!)).map((s) => s.where))).toEqual([]);
  });
}

/** A label too long for any box here, left to right and right to left, and a short one. */
const LATIN_LONG = 'Awaiting a second review from the accessibility working group before the release candidate can be tagged';
const ARABIC_LONG = 'في انتظار مراجعة ثانية من فريق إمكانية الوصول قبل إصدار النسخة المرشحة لكل المنصات';
const LATIN_SHORT = 'Inbox';

interface Cut {
  /** The fixture the three are made from, and the props that are the text. */
  fixture: string;
  texts: string[];
  /** The boxes that cut the text, in the component's shadow root. */
  boxes: string[];
  /** The box is as wide as its line's room, so a text that fits is placed in it: at the layout's start edge. */
  placed?: boolean;
}

/**
 * The boxes that hold a product's text on one line and cut it, where the cut is not held by the component's own test
 * (the tag's TAG-18, the tabs' TAB-33, the navigation bar's NVB-26, the drawer's NVD-52).
 */
const CUTS: Record<string, Cut> = {
  chip: { fixture: 'action-no-icon', texts: ['label'], boxes: ['.label'] },
  'app-bar': { fixture: 'small-subtitle', texts: ['title', 'subtitle'], boxes: ['.row .title', '.row .subtitle'], placed: true },
  search: { fixture: 'trigger', texts: ['label', 'placeholder'], boxes: ['.trigger-text'], placed: true },
};

for (const [name, cut] of Object.entries(CUTS)) {
  test(`${name} — a text that does not fit is cut at the end of its own direction, with an ellipsis, and one that fits stands where the layout places it`, async ({ page }) => {
    const spec = loadSpec(name);
    const base = spec.fixtures.find((f) => f.id === cut.fixture)!;
    const told = (id: string, text: string, direction?: 'rtl'): Fixture => ({ ...base, id, props: { ...base.props, ...Object.fromEntries(cut.texts.map((prop) => [prop, text])) }, ...(direction ? { direction } : {}) });
    await mountFixtures(page, spec, { icons: true, fixtures: [told('latin-rtl', LATIN_LONG, 'rtl'), told('arabic-ltr', ARABIC_LONG), told('short-rtl', LATIN_SHORT, 'rtl'), told('range-rtl', RANGE, 'rtl')] });
    // Less room than the long texts need.
    await page.addStyleTag({ content: `.stage { box-sizing: border-box; inline-size: 280px; } .stage > * { max-inline-size: 100%; }` });
    const tag = spec.platforms.web.name;
    const measured = (id: string, box: string) =>
      page.locator(`[data-fixture="${id}"] ${tag}`).first().locator(box).first().evaluate((el) => {
        const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, (node) => ((node as Text).data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)).nextNode() as Text;
        const at = (index: number) => {
          const range = document.createRange();
          range.setStart(text, index);
          range.setEnd(text, index + 1);
          const { left, right } = range.getBoundingClientRect();
          return { left, right };
        };
        const { left, right } = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return { box: { left, right }, scrolled: el.scrollLeft, first: at(text.data.search(/\S/)), last: at(text.data.trimEnd().length - 1), overflows: el.scrollWidth > el.clientWidth, direction: style.direction, layout: getComputedStyle(el.parentElement!).direction, textOverflow: style.textOverflow, dir: el.getAttribute('dir') };
      });
    for (const box of cut.boxes) {
      // A left-to-right text in a right-to-left layout: the box that cuts it has the text's direction, so every engine
      // draws the ellipsis, and draws it at the right; the text begins at the box's left edge.
      const latin = await measured('latin-rtl', box);
      expect([latin.overflows, latin.direction, latin.layout, latin.textOverflow], box).toEqual([true, 'ltr', 'rtl', 'ellipsis']);
      expect(latin.first.left, box).toBeCloseTo(latin.box.left, 0);
      // A right-to-left text in a left-to-right layout: mirrored.
      const arabic = await measured('arabic-ltr', box);
      expect([arabic.overflows, arabic.direction, arabic.layout, arabic.textOverflow], box).toEqual([true, 'rtl', 'ltr', 'ellipsis']);
      // (A box that cuts its text is one that scrolls, and one engine places what a right-to-left one holds by whole
      // pixels: where the box's width has a fraction — the font's doing, 247.5 with one system font and 247.625 with
      // another — the text may stand one pixel past the edge, and the box says so as its scroll position. Never more.)
      expect(Math.abs(arabic.scrolled), box).toBeLessThanOrEqual(1);
      expect(arabic.first.right, box).toBeCloseTo(arabic.box.right - arabic.scrolled, 0);
      // A left-to-right text that fits, in a right-to-left layout: its own order, at the layout's start edge — the right.
      const short = await measured('short-rtl', box);
      expect([short.overflows, short.direction, short.layout], box).toEqual([false, 'ltr', 'rtl']);
      expect(short.first.left, box).toBeLessThan(short.last.left);
      if (cut.placed) expect(short.last.right, box).toBeCloseTo(short.box.right, 0);
      // A text without a letter takes no direction of its own: its box keeps the layout's and places it at the
      // layout's start edge, and the text is read from the left.
      const range = await measured('range-rtl', box);
      expect([range.dir, range.direction, range.layout], box).toEqual([null, 'rtl', 'rtl']);
      expect(range.first.left, box).toBeLessThan(range.last.left);
      if (cut.placed) expect(range.last.right, box).toBeCloseTo(range.box.right, 0);
    }
  });
}
