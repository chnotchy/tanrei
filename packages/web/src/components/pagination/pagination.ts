import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { wordPlaces } from '../../generated/words.js';
import {
  AvailabilityController,
  DISABLED,
  GlyphDrawnController,
  GlyphMirrorController,
  OpenAxesController,
  PressController,
  report,
  syncFocusStyle,
} from '../../primitives/index.js';
import { LINK_KEYS, readDestination } from '../../primitives/link.js';
import { ambientLocale } from '../../primitives/locale-date.js';
import { fillPlaces, reportPlaces } from '../../primitives/places.js';
import { WordsController } from '../../primitives/words.js';
import { AXES, styles } from './pagination.styles.js';

/** numbered: the page numbers, drawn compact where they do not fit; compact: the controls and the sentence alone. */
export type TanreiPaginationVariant = 'numbered' | 'compact';

/** The core sizes (small, medium), plus any a design system adds. */
export type TanreiPaginationSize = 'small' | 'medium' | (string & {});

/** What `change` carries: the page the person asked for, counted from 1. */
export interface TanreiPaginationChangeDetail {
  page: number;
}

/** The four controls, by the page each leads to (PGN-7). */
type Control = 'first' | 'previous' | 'next' | 'last';

/** One place of the row (PGN-1). */
type Slot =
  | { kind: 'page'; page: number }
  | { kind: 'control'; control: Control; page: number; disabled: boolean }
  | { kind: 'ellipsis' }
  | { kind: 'count' };

/** PGN-8: the glyph of the system's icon set each control draws — the spec's names, not values. */
const GLYPHS: Record<Control, string> = { first: 'first_page', previous: 'chevron_left', next: 'chevron_right', last: 'last_page' };
/** PGN-10: the mark that stands for the pages left out (a character, hidden from assistive technology; not a word). */
const ELLIPSIS = '…';
/** PGN-11: the mark between the two numbers of the short form where the product gives no sentence (not a word). */
const SLASH = '/';
const VARIANTS: readonly string[] = ['numbered', 'compact'];
/** Boxes are laid out on fractions of a pixel: a row that is this much wider than its room still fits. */
const SLACK = 0.05;

const range = (start: number, end: number) => Array.from({ length: Math.max(0, end - start + 1) }, (_, at) => start + at);

/**
 * PGN-2: the places of the numbered form — the pages 1 to `boundaries`, `count − boundaries + 1` to `count`, and the
 * current page with `siblings` on each side, with an ellipsis in place of the pages left out between two runs, a page
 * in place of an ellipsis that would stand for that page alone, and more pages on the far side of a current page near
 * an end, so that the row holds 2 × boundaries + 2 × siblings + 3 places whenever `count` is at least that many. The
 * algorithm of MUI's `usePagination`, as most pagination of the web counts it.
 */
export function pageItems(page: number, count: number, siblings: number, boundaries: number): (number | 'ellipsis')[] {
  const startPages = range(1, Math.min(boundaries, count));
  const endPages = range(Math.max(count - boundaries + 1, boundaries + 1), count);
  const siblingsStart = Math.max(Math.min(page - siblings, count - boundaries - siblings * 2 - 1), boundaries + 2);
  const siblingsEnd = Math.min(Math.max(page + siblings, boundaries + siblings * 2 + 2), endPages.length > 0 ? endPages[0]! - 2 : count - 1);
  return [
    ...startPages,
    ...(siblingsStart > boundaries + 2 ? (['ellipsis'] as const) : boundaries + 1 < count - boundaries ? [boundaries + 1] : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < count - boundaries - 1 ? (['ellipsis'] as const) : count - boundaries > boundaries ? [count - boundaries] : []),
    ...endPages,
  ];
}

/**
 * Moves through the numbered pages of one list — search results, the posts of a blog, the rows of a table: a row of
 * page numbers with the current page marked and the pages that do not fit left out behind an ellipsis, previous and
 * next, first and last where the product asks for them, and a short form that says which page of how many.
 *
 * Contract: specs/pagination.spec.json. The shadow root holds a `nav` named by `label` around one ordered list; each
 * page and each control is an `<a href>` while `href` holds the place `{page}` — every link the browser's own — and a
 * `<button>` otherwise. The current page carries `aria-current="page"`; a disabled control is a disabled button, or an
 * anchor without `href`, with `role="link"` and `aria-disabled="true"`, out of the focus order.
 *
 * ```html
 * <tanrei-pagination label="Pages" page="3" count="10" previous-label="Previous page" next-label="Next page" page-label="Page {page}"></tanrei-pagination>
 * ```
 *
 * `change` is fired when the person asks for another page, before the page changes and, for a link, before the browser
 * follows it; cancel it and the page stays and nothing is followed (a router takes the navigation). Not cancelled, the
 * element takes the page itself — it needs no listener to page.
 *
 * `variant="numbered"` draws the compact form where the width its layout gives it is less than its numbered row needs:
 * the element keeps a copy of that row in its layout at no height, so a layout that sizes it by its content gives it
 * the row's width, and it compares the two whenever either changes. Every visual value is a
 * `--tanrei-comp-pagination-*` token; how a press is answered and how keyboard focus is drawn are the system's choices
 * of kind (`--tanrei-sys-behavior-*`), read from the cascade.
 *
 * @tag tanrei-pagination
 * @csspart nav - The navigation landmark.
 * @csspart list - The ordered list of the items.
 * @csspart item - A page or a control: its fill, corners, every state, the ripple and the focus ring.
 * @csspart current - The current page (also `item`).
 * @csspart control - First, previous, next or last (also `item`).
 * @csspart label - A page's number.
 * @csspart icon - A control's arrow (hidden from assistive technology).
 * @csspart ellipsis - The mark that stands for the pages left out (hidden from assistive technology).
 * @csspart count - The compact form's sentence.
 * @fires {CustomEvent<TanreiPaginationChangeDetail>} change - The person asked for another page: `detail.page`. Fired before the page changes and before a link is followed; cancelable — `preventDefault()` keeps the page and opens nothing.
 */
export class TanreiPagination extends LitElement {
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    label: { type: String },
    page: { type: Number },
    count: { type: Number },
    siblings: { type: Number },
    boundaries: { type: Number },
    variant: { type: String, reflect: true, useDefault: true },
    size: { type: String, reflect: true, useDefault: true },
    firstLast: { type: Boolean, attribute: 'first-last' },
    href: { type: String },
    previousLabel: { type: String, attribute: 'previous-label' },
    nextLabel: { type: String, attribute: 'next-label' },
    firstLabel: { type: String, attribute: 'first-label' },
    lastLabel: { type: String, attribute: 'last-label' },
    pageLabel: { type: String, attribute: 'page-label' },
    countText: { type: String, attribute: 'count-text' },
    narrow: { state: true },
  };

  /** The accessible name of the navigation landmark ("Pages", "Search results pages"), in the product's language. Required: it tells this landmark from the page's other navigation. */
  label = '';

  /** The current page, counted from 1. The element sets it when the person asks for another page and `change` was not cancelled. */
  page = 1;

  /** How many pages there are. Below 1 the element draws nothing and takes no room. */
  count = 1;

  /** How many pages are shown on each side of the current page in the numbered form. */
  siblings = 1;

  /** How many pages are always shown at the start and at the end of the numbered form. */
  boundaries = 1;

  /** `numbered` draws the page numbers, and the compact form where they do not fit its width; `compact` draws the controls and the sentence that says which page of how many. */
  variant: TanreiPaginationVariant = 'numbered';

  /** An item's height (32 / 40 in the default system). The hit area always meets the minimum target. */
  size: TanreiPaginationSize = 'medium';

  /** Draws first and last on either side of previous and next. */
  firstLast = false;

  /** The address of a page, with the place `{page}` the element fills with the page's number ("/results/?page={page}"). Given, every page and control is a link; empty, they are buttons. */
  href = '';

  /** The previous control's accessible name ("Previous page"). Empty reads the product's words (`previousPageLabel`). Required. */
  previousLabel = '';

  /** The next control's accessible name ("Next page"). Empty reads the product's words (`nextPageLabel`). Required. */
  nextLabel = '';

  /** The first control's accessible name ("First page"). Empty reads the product's words (`firstPageLabel`). Required while `firstLast` is true. */
  firstLabel = '';

  /** The last control's accessible name ("Last page"). Empty reads the product's words (`lastPageLabel`). Required while `firstLast` is true. */
  lastLabel = '';

  /** A page's accessible name, with the place `{page}` the element fills with the number as it draws it ("Page {page}"). Empty reads the product's words (`pageLabel`); where neither gives one, a page is named by its number alone. */
  pageLabel = '';

  /** The compact form's sentence, with the places `{page}` and `{count}` ("Page {page} of {count}"). Empty reads the product's words (`pageCountText`); where neither gives one, the two numbers are drawn with a slash between them. */
  countText = '';

  /** PGN-11: the numbered form does not fit the width the element is given. */
  private narrow = false;

  private readonly availability = new AvailabilityController(this, 'pagination');
  /** PGN-12: sizes a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'pagination', behavior: 'PGN-12', axes: AXES });
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  /** PGN-23: an arrow is drawn mirrored where the icon set marks its name (src/primitives/glyph-mirror.ts). */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.row .glyph' });
  /** An arrow is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly drawnGlyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.row .glyph') ?? []);
  /** PGN-11: the width the element is given, and the width its numbered row needs. */
  private readonly sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.decide());
  private observed: Element[] = [];

  /** PGN-15, PGN-16: one press for each item element, made when it is first pressed. */
  private readonly presses = new WeakMap<HTMLElement, PressController>();
  private readonly pressControllers = new Set<{ element: HTMLElement; press: PressController }>();
  /** PGN-19: where focus goes after the page changed, and whether it shows its ring. */
  private focusAfter: { control: Control | null; ring: boolean | undefined } | null = null;
  /** PGN-18: the current page that was drawn last. */
  private drawnPage = 0;

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.sizes?.disconnect();
    this.observed = [];
    for (const { press } of this.pressControllers) press.hostDisconnected();
    this.pressControllers.clear();
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.requestUpdate();
  }

  // ── What the props say (PGN-3, PGN-6, PGN-11) ─────────────────────────────────────────────────────────────────────

  /** PGN-3: a whole number read from `value`; NaN where it cannot be read. */
  private static whole(value: unknown): number {
    const read = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(read) ? Math.trunc(read) : Number.NaN;
  }

  /** PGN-3: how many pages, as drawn; 0 draws nothing. */
  private get pages(): number {
    const count = TanreiPagination.whole(this.count);
    return Number.isNaN(count) ? 0 : Math.max(0, count);
  }

  /** PGN-3: the current page as drawn, held between 1 and the count. */
  get current(): number {
    const page = TanreiPagination.whole(this.page);
    return Math.min(Math.max(1, Number.isNaN(page) ? 1 : page), Math.max(1, this.pages));
  }

  /** PGN-3: siblings or boundaries as drawn: a whole number of 0 or more (1 where it cannot be read). */
  private static atLeastZero(value: unknown): number {
    const read = TanreiPagination.whole(value);
    return Number.isNaN(read) ? 1 : Math.max(0, read);
  }

  /** PGN-11: whether the compact form is drawn — asked for, or the numbered form does not fit. */
  private get compact(): boolean {
    return this.variant === 'compact' || this.narrow;
  }

  /** PGN-6: the address template while it is a destination with the place {page}; null for buttons. */
  private get template(): string | null {
    const href = this.href ?? '';
    if (!href.trim()) return null;
    const filled = fillPlaces(href, { page: '1' });
    if (!filled.used.has('page')) return null;
    return readDestination(filled.runs.map((run) => run.text).join('')).href === null ? null : href;
  }

  /** PGN-6: the address of `page`: {page} filled with the number in Western digits. */
  private address(page: number): string {
    return fillPlaces(this.template ?? '', { page: String(page) })
      .runs.map((run) => run.text)
      .join('');
  }

  /** PGN-9: a number as the element's language writes a whole number. */
  private numberFormat(): Intl.NumberFormat {
    return new Intl.NumberFormat(ambientLocale(this), { maximumFractionDigits: 0, useGrouping: false });
  }

  // ── The row (PGN-1, PGN-2, PGN-5, PGN-11) ─────────────────────────────────────────────────────────────────────────

  private controls(which: readonly Control[]): Slot[] {
    const current = this.current;
    const count = this.pages;
    const to: Record<Control, number> = { first: 1, previous: current - 1, next: current + 1, last: count };
    return which.map((control) => ({
      kind: 'control' as const,
      control,
      page: to[control],
      disabled: control === 'first' || control === 'previous' ? current <= 1 : current >= count,
    }));
  }

  /** PGN-1: the items of a form, in reading order. */
  private slots(compact: boolean): Slot[] {
    const ends = this.firstLast;
    const before = this.controls(ends ? ['first', 'previous'] : ['previous']);
    const after = this.controls(ends ? ['next', 'last'] : ['next']);
    if (compact) return [...before, { kind: 'count' }, ...after];
    const pages = pageItems(this.current, this.pages, TanreiPagination.atLeastZero(this.siblings), TanreiPagination.atLeastZero(this.boundaries));
    return [...before, ...pages.map((each): Slot => (each === 'ellipsis' ? { kind: 'ellipsis' } : { kind: 'page', page: each })), ...after];
  }

  /** PGN-11: the compact form's sentence, each number written as the element's language writes it. */
  private countSentence(format: Intl.NumberFormat): string {
    const page = format.format(this.current);
    const count = format.format(this.pages);
    const sentence = this.words.get('pageCountText', this.countText ?? '');
    if (!sentence) return `${page} ${SLASH} ${count}`;
    return fillPlaces(sentence, { page, count })
      .runs.map((run) => run.text)
      .join('');
  }

  /** PGN-9: a page's accessible name: pageLabel with {page} filled by its number as drawn; null names it by the number alone. */
  private pageName(number: string): string | null {
    const sentence = this.words.get('pageLabel', this.pageLabel ?? '');
    if (!sentence) return null;
    const filled = fillPlaces(sentence, { page: number });
    // The number drawn stays part of the name: a sentence without its place names the page by the number alone.
    if (!filled.used.has('page')) return null;
    return filled.runs.map((run) => run.text).join('');
  }

  private controlName(control: Control): string {
    switch (control) {
      case 'first':
        return this.words.get('firstPageLabel', this.firstLabel ?? '');
      case 'previous':
        return this.words.get('previousPageLabel', this.previousLabel ?? '');
      case 'next':
        return this.words.get('nextPageLabel', this.nextLabel ?? '');
      case 'last':
        return this.words.get('lastPageLabel', this.lastLabel ?? '');
    }
  }

  // ── The person's activation (PGN-4, PGN-7, PGN-19) ────────────────────────────────────────────────────────────────

  private readonly onItemClick = (event: MouseEvent) => {
    const item = event.currentTarget as HTMLElement;
    if (item.matches(DISABLED)) {
      event.preventDefault();
      return;
    }
    const link = item.localName === 'a';
    // A click with a modifier key, or another button than the main one, is the browser's: the link opens elsewhere and
    // the page here stays (PGN-6).
    if (link && ((event.button ?? 0) !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    const target = Number(item.dataset.page);
    // PGN-4: the current page emits nothing; a link to it is still the browser's.
    if (!Number.isFinite(target) || target === this.current) return;
    const asked = new CustomEvent<TanreiPaginationChangeDetail>('change', { bubbles: true, cancelable: true, detail: { page: target } });
    if (!this.dispatchEvent(asked)) {
      event.preventDefault();
      return;
    }
    const control = (item.dataset.control as Control | undefined) ?? null;
    // A click with a detail of 0 came from a key (or from script): the browser decides the ring, as for any focus moved
    // by script after a key. A pointer's click moves focus without it.
    const ring = event.detail === 0 ? undefined : false;
    const take = () => {
      if (!this.isConnected) return;
      this.focusAfter = { control, ring };
      this.page = target;
    };
    // A link's address is read by the browser after the click has gone through the page, and the element's update runs
    // in a microtask before that — it would have rewritten the address of the control that was activated. So the page
    // is taken once the browser has followed it (a page of the same document, or the next one, which unloads this).
    if (link) setTimeout(take);
    else take();
  };

  private pressOf(item: HTMLElement): PressController {
    let press = this.presses.get(item);
    if (!press) {
      press = new PressController(item, {
        container: () => item,
        holdCarrier: () => this.renderRoot?.querySelector('.hold') ?? null,
        disabled: () => item.matches(DISABLED) || !item.isConnected,
        // PGN-7: Enter presses a link; Space does what it does on any link and shows no pressed state.
        keys: () => (item.localName === 'a' ? LINK_KEYS : undefined),
      });
      this.presses.set(item, press);
      this.pressControllers.add({ element: item, press });
    }
    return press;
  }

  private readonly onPointerDown = (event: PointerEvent) => this.pressOf(event.currentTarget as HTMLElement).onPointerDown(event);
  private readonly onRelease = (event: Event) => this.presses.get(event.currentTarget as HTMLElement)?.release(event);
  private readonly onKeyDown = (event: KeyboardEvent) => this.pressOf(event.currentTarget as HTMLElement).onKeyDown(event);
  private readonly onKeyUp = (event: KeyboardEvent) => this.presses.get(event.currentTarget as HTMLElement)?.onKeyUp(event);
  private readonly onBlur = (event: FocusEvent) => this.presses.get(event.currentTarget as HTMLElement)?.onBlur();
  /** PGN-14, PGN-17: the focus style is read when focus arrives, for a browser without style queries. */
  private readonly onFocus = (event: FocusEvent) => syncFocusStyle(this, event.currentTarget as HTMLElement);

  // ── The form that fits (PGN-11, PGN-22) ───────────────────────────────────────────────────────────────────────────

  /** PGN-11: the numbered form does not fit while its row is wider than the room the element is given. */
  private decide() {
    if (!this.isConnected) return;
    const measure = this.renderRoot?.querySelector<HTMLElement>('.measure');
    const sizer = measure?.querySelector<HTMLElement>('.sizer');
    if (this.variant === 'compact' || !measure || !sizer || measure.dataset.form !== 'numbered') {
      if (this.narrow) this.narrow = false;
      return;
    }
    const narrow = sizer.getBoundingClientRect().width > measure.getBoundingClientRect().width + SLACK;
    if (narrow !== this.narrow) this.narrow = narrow;
  }

  private observe() {
    const measure = this.renderRoot.querySelector('.measure');
    const sizer = measure?.querySelector('.sizer');
    const now = [measure, sizer].filter((each): each is Element => !!each);
    if (now.length === this.observed.length && now.every((each, at) => each === this.observed[at])) return;
    this.sizes?.disconnect();
    for (const each of now) this.sizes?.observe(each);
    this.observed = now;
  }

  // ── Drawing ───────────────────────────────────────────────────────────────────────────────────────────────────────

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('variant') && this.variant === 'compact') this.narrow = false;
  }

  protected override updated(changed: PropertyValues<this>) {
    if (this.pages < 1) this.setAttribute('data-empty', '');
    else this.removeAttribute('data-empty');
    // PGN-18: a new current page is drawn at once — no item recolors over the state motion for it.
    const row = this.renderRoot.querySelector('.row');
    if (row && this.drawnPage && this.drawnPage !== this.current) {
      row.classList.add('still');
      requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove('still')));
    }
    this.drawnPage = this.current;
    this.observe();
    this.decide();
    for (const entry of this.pressControllers) {
      if (!entry.element.isConnected) {
        entry.press.hostDisconnected();
        this.pressControllers.delete(entry);
      }
    }
    this.reports(changed);
    this.moveFocus();
  }

  /**
   * PGN-19: focus stays on an item when the page changed by one the person activated — on the page now current where
   * they activated a page, on the control they activated while it is still enabled, else on the page now current (in
   * the compact form, which draws no page, on the nearest enabled control).
   */
  private moveFocus() {
    const after = this.focusAfter;
    if (!after) return;
    this.focusAfter = null;
    const row = this.renderRoot.querySelector('.row');
    if (!row) return;
    const enabled = (selector: string) => [...row.querySelectorAll<HTMLElement>(selector)].find((each) => !each.matches(DISABLED)) ?? null;
    let target: HTMLElement | null = after.control ? enabled(`.item[data-control='${after.control}']`) : null;
    target ??= row.querySelector<HTMLElement>('.item.current');
    if (!target && after.control) {
      const order: Control[] = after.control === 'next' || after.control === 'last' ? ['previous', 'first', 'next', 'last'] : ['next', 'last', 'previous', 'first'];
      for (const control of order) target ??= enabled(`.item[data-control='${control}']`);
    }
    if (!target) return;
    const options: FocusOptions & { focusVisible?: boolean } = { preventScroll: true };
    if (after.ring !== undefined) options.focusVisible = after.ring;
    target.focus(options);
  }

  /** What a debug build says (PGN-1, PGN-3, PGN-6, PGN-8, PGN-9, PGN-11), once per element and message. */
  private reports(changed: PropertyValues<this>) {
    const count = TanreiPagination.whole(this.count);
    if (changed.has('count') && (Number.isNaN(count) || count !== this.count)) {
      const written = this.getAttribute('count') ?? String(this.count);
      report(this, 'PGN-3', Number.isNaN(count) ? `count "${written}" cannot be read as a number; nothing is drawn` : `count ${written} is not a whole number; it is read as ${count}`);
    }
    const pages = this.pages;
    if (pages < 1) return;
    if ((changed.has('page') || changed.has('count')) && this.current !== this.page) {
      report(this, 'PGN-3', `page ${String(this.page)} is not a whole number from 1 to the count (${pages}); page ${this.current} is drawn as the current one`, { once: false });
    }
    for (const prop of ['siblings', 'boundaries'] as const) {
      if (changed.has(prop) && TanreiPagination.atLeastZero(this[prop]) !== this[prop]) {
        report(this, 'PGN-3', `${prop} ${String(this[prop])} is not a whole number of 0 or more; it is read as ${TanreiPagination.atLeastZero(this[prop])}`);
      }
    }
    if (!(this.label ?? '').trim()) report(this, 'PGN-1', 'label is empty, so the navigation landmark has no accessible name; give it the words ("Pages")');
    if (!VARIANTS.includes(this.variant)) report(this, 'PGN-11', `variant "${String(this.variant)}" is not a value it defines ("numbered" or "compact"); it is drawn as "numbered"`);
    const href = this.href ?? '';
    if (href.trim() && this.template === null) {
      const read = fillPlaces(href, { page: '1' });
      report(
        this,
        'PGN-6',
        !read.used.has('page')
          ? `href "${href}" holds no place {page}, so it leads to no page of its own; the items are drawn as buttons`
          : `href "${href}" is not a place to go (a script to run, or an address that cannot be read); the items are drawn as buttons`,
      );
    }
    const controls: Control[] = this.firstLast ? ['first', 'previous', 'next', 'last'] : ['previous', 'next'];
    const keys = { first: ['firstPageLabel', 'firstLabel'], previous: ['previousPageLabel', 'previousLabel'], next: ['nextPageLabel', 'nextLabel'], last: ['lastPageLabel', 'lastLabel'] } as const;
    for (const control of controls) {
      if (!this.controlName(control)) this.words.missing(keys[control][0], { prop: keys[control][1], id: 'PGN-8', effect: `the ${control} control is drawn and has no accessible name` });
    }
    if (this.compact) {
      const sentence = this.words.get('pageCountText', this.countText ?? '');
      if (!sentence) this.words.missing('pageCountText', { prop: 'countText', id: 'PGN-11', effect: 'the two numbers are drawn with a slash between them' });
      else if (this.countText) reportPlaces(this, 'PGN-11', 'countText', sentence, wordPlaces.pageCountText ?? [], 'it is drawn as it is written');
    } else {
      const sentence = this.words.get('pageLabel', this.pageLabel ?? '');
      if (!sentence) this.words.missing('pageLabel', { prop: 'pageLabel', id: 'PGN-9', effect: 'each page is named by its number alone' });
      else {
        if (this.pageLabel) reportPlaces(this, 'PGN-9', 'pageLabel', sentence, wordPlaces.pageLabel ?? [], 'it is used as it is written');
        if (!fillPlaces(sentence, { page: '' }).used.has('page')) report(this, 'PGN-9', `pageLabel "${sentence}" holds no place {page}, so it would not hold the number drawn; each page is named by its number alone`);
      }
    }
  }

  /** One page or control, as a link or as a button (PGN-4, PGN-5, PGN-6, PGN-8, PGN-9). */
  private item(slot: Extract<Slot, { kind: 'page' | 'control' }>, format: Intl.NumberFormat, link: boolean) {
    const page = slot.kind === 'page';
    const current = page && slot.page === this.current;
    const disabled = !page && slot.disabled;
    const number = page ? format.format(slot.page) : '';
    const name = page ? this.pageName(number) : this.controlName(slot.control);
    const classes = classMap({ item: true, current, control: !page });
    const parts = page ? (current ? 'item current' : 'item') : 'item control';
    const content = page
      ? html`<span part="label" class="label">${number}</span>`
      : html`<span part="icon" class="glyph" aria-hidden="true"><span class="ink">${GLYPHS[slot.control]}</span></span>`;
    const control = page ? nothing : slot.control;
    if (link) {
      const rel = slot.kind === 'control' && !disabled && (slot.control === 'previous' || slot.control === 'next') ? (slot.control === 'previous' ? 'prev' : 'next') : null;
      return html`<a
        part=${parts}
        class=${classes}
        data-tanrei-shape
        data-page=${slot.page}
        data-control=${control}
        href=${disabled ? nothing : this.address(slot.page)}
        rel=${rel ?? nothing}
        role=${disabled ? 'link' : nothing}
        aria-disabled=${disabled ? 'true' : nothing}
        aria-current=${current ? 'page' : nothing}
        aria-label=${name || nothing}
        @click=${this.onItemClick}
        @pointerdown=${this.onPointerDown}
        @pointerup=${this.onRelease}
        @pointercancel=${this.onRelease}
        @pointerleave=${this.onRelease}
        @keydown=${this.onKeyDown}
        @keyup=${this.onKeyUp}
        @focus=${this.onFocus}
        @blur=${this.onBlur}
        >${content}</a
      >`;
    }
    return html`<button
      part=${parts}
      class=${classes}
      type="button"
      data-tanrei-shape
      data-page=${slot.page}
      data-control=${control}
      ?disabled=${disabled}
      aria-current=${current ? 'page' : nothing}
      aria-label=${name || nothing}
      @click=${this.onItemClick}
      @pointerdown=${this.onPointerDown}
      @pointerup=${this.onRelease}
      @pointercancel=${this.onRelease}
      @pointerleave=${this.onRelease}
      @keydown=${this.onKeyDown}
      @keyup=${this.onKeyUp}
      @focus=${this.onFocus}
      @blur=${this.onBlur}
    >
      ${content}
    </button>`;
  }

  /** PGN-11: the copy of a form, measured: the same boxes in the same classes, with nothing to press or to read. */
  private copy(slot: Slot, format: Intl.NumberFormat) {
    switch (slot.kind) {
      case 'page':
        return html`<span class="slot"><span class=${classMap({ item: true, current: slot.page === this.current })}><span class="label">${format.format(slot.page)}</span></span></span>`;
      case 'control':
        return html`<span class="slot"><span class="item control"><span class="glyph"><span class="ink">${GLYPHS[slot.control]}</span></span></span></span>`;
      case 'ellipsis':
        return html`<span class="slot"><span class="ellipsis">${ELLIPSIS}</span></span>`;
      case 'count':
        return html`<span class="slot count-slot"><span class="count">${this.countSentence(format)}</span></span>`;
    }
  }

  protected override render() {
    if (this.pages < 1) return nothing;
    const format = this.numberFormat();
    const link = this.template !== null;
    const compact = this.compact;
    const slots = this.slots(compact);
    // The widest form this variant draws: the numbered row while it is numbered (PGN-11), the compact one otherwise.
    const measured = this.variant === 'compact' ? 'compact' : 'numbered';
    const label = this.label ?? '';
    return html`
      <nav part="nav" aria-label=${label.trim() ? label : nothing}>
        <ol part="list" class="row" role="list">
          ${slots.map((slot) => {
            switch (slot.kind) {
              case 'ellipsis':
                return html`<li class="slot" aria-hidden="true"><span part="ellipsis" class="ellipsis">${ELLIPSIS}</span></li>`;
              case 'count':
                return html`<li class="slot count-slot"><span part="count" class="count">${this.countSentence(format)}</span></li>`;
              default:
                return html`<li class="slot">${this.item(slot, format, link)}</li>`;
            }
          })}
        </ol>
      </nav>
      <div class="measure" data-form=${measured} aria-hidden="true" inert>
        <div class="sizer">${(measured === 'compact' ? slots : this.slots(false)).map((slot) => this.copy(slot, format))}</div>
      </div>
      <span class="hold"></span>
    `;
  }
}

if (!customElements.get('tanrei-pagination')) customElements.define('tanrei-pagination', TanreiPagination);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-pagination': TanreiPagination;
  }
}
