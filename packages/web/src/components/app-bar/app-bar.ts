import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  AvailabilityController,
  type DividerVisibilityProp,
  OpenAxesController,
  SystemWatchController,
  isDividerVisibility,
  report,
  deepActive,
  syncDividerVisibility,
} from '../../primitives/index.js';
import { WordsController } from '../../primitives/words.js';
import '../button/button.js';
import '../menu/menu.js';
import type { TanreiMenu } from '../menu/menu.js';
import { AXES, CORE_SIZES, heightProbe, styles } from './app-bar.styles.js';
import { ownDirection } from '../../styles/product-text.js';
import { TanreiElement } from '../../primitives/element.js';
import { cancelPhaseRead, readInPhase } from '../../primitives/read-phase.js';

/** The core sizes (small, large), plus any a design system adds: a size other than small has a title row that collapses. */
export type TanreiAppBarSize = 'small' | 'large' | (string & {});

/** Where the top row's title sits: after the navigation button, or centred on the bar. */
export type TanreiAppBarTitleAlignment = 'start' | 'center';

/** When the bottom edge is drawn (APB-18): `auto` takes `comp.app-bar.outline.visibility`. */
export type TanreiAppBarDividerVisibility = DividerVisibilityProp;

/** How a brand's symbol and wordmark stand when both are given (APB-21): side by side, or by turns with the window's width. */
export type TanreiAppBarBrandLayout = 'lockup' | 'responsive';

/** What becomes of the actions that do not fit (APB-26): into a Menu opened from a more button, or left out of the bar. */
export type TanreiAppBarOverflow = 'menu' | 'hide';

const BRAND_LAYOUTS: readonly string[] = ['lockup', 'responsive'];
const OVERFLOWS: readonly string[] = ['menu', 'hide'];
/** APB-28: the more button's glyph. */
const OVERFLOW_GLYPH = 'more_horiz';
/** APB-26: the attribute the bar writes on an action that is out of the top row; the bar's styles draw it as nothing. */
const OUT = 'app-bar-out';
/** APB-26: the product's attribute that keeps an action in the top row. */
const KEEP = 'app-bar-overflow';
const BUTTON = 'tanrei-button';
/** APB-29: the menu's rows a Menu anchored to an action holds, which its submenu in the overflow menu repeats. */
const MENU_ROWS = 'tanrei-menu-item, tanrei-menu-checkbox-item, tanrei-menu-radio-item, tanrei-submenu, tanrei-menu-group';

/** An action as the bar reads it: a Tanrei Button's own members. */
type Action = HTMLElement & { label?: string; disabled?: boolean; toggle?: boolean; selected?: boolean; href?: string; target?: string; targetLabel?: string; updateComplete?: Promise<unknown> };

/** A computed length in px (0 where there is none). */
const px = (style: CSSStyleDeclaration, property: string) => Number.parseFloat(style.getPropertyValue(property)) || 0;

/** Whether focus is on `element`, or inside it or its shadow root. */
function holdsFocus(element: Element) {
  const active = deepActive();
  return !!active && (active === element || element.contains(active) || !!element.shadowRoot?.contains(active));
}
const BRAND_SLOTS = ['brand', 'brand-symbol', 'brand-wordmark'] as const;
type BrandSlot = (typeof BRAND_SLOTS)[number];

/** What the bar reads of the app shell it stands in (src/components/app-shell): the window's class, once decided. */
type WindowClassSource = Element & { windowClass?: string | null };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Names the current screen at its top edge and holds the way back and the screen's most used actions, its bottom edge
 * drawn as the edge of a region that stays (or, under `divider-visibility="scroll"`, only once content scrolls under it).
 *
 * Contract: specs/app-bar.spec.json. A layout region: no role of its own, never focusable, no events of its
 * own. Its items are the product's icon-only `<tanrei-button>`s — the spec's `navigation` kind with `slot="navigation"` and
 * its `action` kind with `slot="actions"` — which it lays out and never restyles (APB-11). The title is `headline`,
 * because HTML's global `title` attribute would put a tooltip over the whole bar; it is the screen's heading, of
 * `heading-level` (1 by default).
 *
 * Scrolled: the bar connects to a scrolling element and sets `scrolled` from it — the document's scrolling element by
 * default, the element whose id `scroll-target` names, or nothing with `scroll-target="none"` (then set `scrolled`
 * yourself). A large bar shrinks one for one with the scroll until only its top row is left (APB-8).
 *
 * The brand (APB-19 to APB-23): one link to the product's first page (`brand-href`), named by the product's name
 * (`brand-label`), drawn by the bar around the images the product gives it — an `<img>` or an inline `<svg>`, which the
 * bar sizes from its tokens and hides from assistive technology: one image (`slot="brand"`, a single logo file), the
 * symbol (`slot="brand-symbol"`), the wordmark (`slot="brand-wordmark"`), or both. One image, a symbol alone or a
 * wordmark alone is shown at every width. Given both, `brand-layout` sets them side by side (`lockup`, the default:
 * `comp.app-bar.brand.lockup.gap` apart, aligned as `comp.app-bar.brand.lockup.alignment` says) or by turns
 * (`responsive`: the wordmark while the window is medium or wider, the symbol while it is compact — the enclosing
 * `<tanrei-app-shell>`'s window class, or the window's width against `--tanrei-sys-breakpoint-medium` outside one). The
 * brand stands after the navigation item in an icon button's cell, in `comp.app-bar.brand.color`, which an image drawn
 * in `currentColor` takes. The link is the bar's: a router that follows links by their clicks reads it from the
 * click's composed path. Without `brand-href` the brand is one image named by `brand-label`.
 *
 * The bottom edge: `divider-visibility` (`auto | always | scroll`, APB-18). `always` — the default system's — draws it
 * at rest and under content alike, in the scrolled condition's outline color; `scroll` draws each condition's own (none
 * at rest in the default system). `auto` takes `comp.app-bar.outline.visibility`. The color and elevation follow
 * `scrolled` under either.
 *
 * The actions (APB-26 to APB-33): every action that fits is drawn, with no limit on their number. The start items and the
 * title (its whole width, in the top row's text roles) keep their room first; the actions that do not fit leave from the
 * end, one at a time, skipping one with `app-bar-overflow="never"`, and come back as soon as they fit. `overflow` says
 * where they go: `menu` (the default) into a Tanrei Menu opened from a more button at the end, named by `overflow-label`
 * or the product's word `toolbarOverflowLabel`; `hide` out of the bar, for actions the product also gives elsewhere. An
 * action that is out carries `app-bar-out` and is drawn as nothing; it stays in the page with its listeners and state.
 * What is out is decided before the frame, from widths measured while each action is drawn.
 *
 * Every visual value comes from `--tanrei-comp-app-bar-*` tokens. The color reaches under `env(safe-area-inset-top)` and
 * the side insets; the content stays inside them (APB-10).
 *
 * @tag tanrei-app-bar
 * @slot navigation - The navigation item: one icon-only `<tanrei-button>` (back, menu or close) at the start.
 * @slot brand - The brand as one image (a single logo file), drawn `comp.app-bar.brand.image.height` high.
 * @slot brand-symbol - The brand's symbol, drawn `comp.app-bar.brand.symbol.size` high.
 * @slot brand-wordmark - The brand's wordmark, drawn `comp.app-bar.brand.wordmark.height` high.
 * @slot context - One control of the product's context after the brand (a `<tanrei-button>` that opens a menu of workspaces, projects or design systems), laid out and never restyled.
 * @slot actions - The action items: icon-only `<tanrei-button>`s at the end, in reading order, as many as fit (APB-26); one with `app-bar-overflow="never"` is never taken out.
 * @csspart container - The bar: its color, elevation, and the system insets it reaches under.
 * @csspart top-row - The row of the navigation item, the brand, the title block and the actions.
 * @csspart brand - The brand: its link (or, without `brand-href`, its image) around the images it shows.
 * @csspart title - The title (the heading), in the top row and in a large bar's own title row.
 * @csspart subtitle - The line under the title.
 * @csspart expanded - A large bar's own title row, under the top row, which collapses as the content scrolls.
 * @csspart outline - The bar's bottom edge.
 * @csspart overflow-button - The icon-only Button after the actions shown that opens the menu of the actions that are out (APB-28).
 * @csspart overflow-menu - The Tanrei Menu of the actions that are out (APB-29).
 */
export class TanreiAppBar extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'app-bar');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    size: { type: String, reflect: true },
    headline: { type: String },
    subtitle: { type: String },
    titleAlignment: { type: String, attribute: 'title-alignment', reflect: true },
    brandHref: { type: String, attribute: 'brand-href' },
    brandLabel: { type: String, attribute: 'brand-label' },
    brandLayout: { type: String, attribute: 'brand-layout', reflect: true },
    scrolled: { type: Boolean, reflect: true },
    dividerVisibility: { type: String, attribute: 'divider-visibility', reflect: true },
    overflow: { type: String, reflect: true },
    overflowLabel: { type: String, attribute: 'overflow-label' },
    scrollTarget: { type: String, attribute: 'scroll-target' },
    headingLevel: { type: Number, attribute: 'heading-level' },
    hasNavigation: { state: true },
    hasContext: { state: true },
    brands: { state: true },
    compact: { state: true },
    hasActions: { state: true },
    layerExpands: { state: true },
    collapse: { state: true },
    covered: { state: true },
    connected: { state: true },
    moreWanted: { state: true },
    outCount: { state: true },
  };

  /** Small puts the title in the one row; large gives it a larger row of its own that collapses as the content scrolls. Reflected. */
  size: TanreiAppBarSize = 'small';

  /** The screen's name (the spec's `title`), and its heading for assistive technology. Empty draws no title and exposes no heading. */
  headline = '';

  /** One line under the title. Empty draws none. */
  subtitle = '';

  /** `start` (after the navigation button) or `center` (centred on the bar). A large bar's own title row always starts at the start. Reflected. */
  titleAlignment: TanreiAppBarTitleAlignment = 'start';

  /** The address of the product's first page: the brand is a link to it. Empty draws the brand as an image (APB-22). */
  brandHref = '';

  /** The product's name: the brand's one accessible name, whichever of its images is shown (APB-22). */
  brandLabel = '';

  /**
   * How the brand's symbol and wordmark stand when both are given (APB-21): `lockup` (side by side, the default) or
   * `responsive` (the wordmark while the window is medium or wider, the symbol while it is compact). Reflected as
   * `brand-layout`.
   */
  brandLayout: TanreiAppBarBrandLayout = 'lockup';

  /** Whether content lies under the bar: the scrolled look, and a large bar drawn collapsed. A connected scrolling element sets it. Reflected. */
  scrolled = false;

  /**
   * When the bottom edge is drawn: `always` at rest and while content is under the bar, `scroll` only while content is
   * under it; `auto` takes `comp.app-bar.outline.visibility`, the design system's answer (always in the default system).
   * Reflected as `divider-visibility`.
   */
  dividerVisibility: TanreiAppBarDividerVisibility = 'auto';

  /**
   * The scrolling element the bar follows (web only): empty follows the document's scrolling element, an id follows the
   * element with that id (in the bar's own document or shadow root), `none` follows nothing.
   */
  scrollTarget = '';

  /** The title's heading level (web only), 1 to 6. */
  headingLevel = 1;

  /**
   * What becomes of the actions that do not fit (APB-26): `menu` (the default) moves them, from the end, into a Menu
   * opened from a more button at the end; `hide` leaves them out of the bar, for actions the product also gives
   * elsewhere (APB-30). Anything else is `menu`. Reflected.
   */
  overflow: TanreiAppBarOverflow = 'menu';

  /** The more button's accessible name ("More actions"). Never drawn. Empty takes the product's word `toolbarOverflowLabel`. */
  overflowLabel = '';

  /** APB-28: the more button is drawn from the first time an action had to go out under overflow menu. */
  private moreWanted = false;
  /** APB-26: how many actions are out now. */
  private outCount = 0;
  /** The elements of the actions slot, in reading order. */
  private actionItems: Action[] = [];
  /** APB-32: each action's width, measured while it is drawn and kept while it is out. */
  private readonly actionWidths = new Map<Element, number>();
  /** APB-26: the actions out of the top row now. */
  private out = new Set<Element>();
  /** APB-28: the product's words, read where the instance gives no overflow label. */
  private readonly words = new WordsController(this);
  /** APB-27: an action's own `app-bar-overflow` changes what may go out. */
  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => void this.settle());

  private hasNavigation = false;
  /** APB-25: whether the context slot holds a control. */
  private hasContext = false;
  /** How many images each brand slot holds (APB-19, APB-23). */
  private brands: Record<BrandSlot, number> = { brand: 0, 'brand-symbol': 0, 'brand-wordmark': 0 };
  /** Whether the window class is compact (APB-21): the app shell's, or the window's width against sys.breakpoint.medium. */
  private compact = false;
  private shell: WindowClassSource | null = null;
  private widths: MediaQueryList | null = null;
  private hasActions = false;
  /** Whether a size a layer added is defined by the active system (then it has a title row that collapses). */
  private layerExpands = false;
  /** How far a connected scroll has pulled a large bar's title row up under the top row, in px. */
  private collapse = 0;
  /** The part of the expanded title that is covered, 0 to 1: the top row's title fades in with it (APB-8). */
  private covered = 0;
  /** Whether a scrolling element is connected (APB-9). */
  private connected = false;

  /** APB-14: sizes a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'app-bar', behavior: 'APB-14', axes: AXES });

  /** APB-18: where a browser has no style queries, the divider visibility is read when it renders — again when the system is switched. */
  private readonly system = new SystemWatchController(this);

  private source: { target: EventTarget; read: () => number } | null = null;
  private retry = 0;
  private offset = 0;
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.resized());
  /** Between a decision made in the observer's callback and the next frame, nothing is observed (see `resized`). */
  private resting = false;

  override connectedCallback() {
    super.connectedCallback();
    this.watchWindow();
    this.mutations?.observe(this, { attributes: true, subtree: true, attributeFilter: [KEEP] });
    if (!this.hasUpdated) return;
    this.observe();
    this.connectScroll();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unwatchWindow();
    this.disconnectScroll();
    this.resize$?.disconnect();
    this.mutations?.disconnect();
  }

  // ---- APB-21: the window class a responsive brand follows ----

  /**
   * The app shell's window class where the bar stands in one and it has decided; else the window's width. The width
   * the window is medium from is the cascade's, read in the frame's read phase (src/primitives/read-phase.ts), after its
   * layout and before its paint: a read as the bar is connected had the browser style the whole page for it.
   */
  private watchWindow() {
    this.unwatchWindow();
    this.shell = this.closest<WindowClassSource>('tanrei-app-shell');
    this.shell?.addEventListener('windowclasschange', this.onWindow);
    this.onWindow();
    if (typeof matchMedia !== 'function') return;
    readInPhase(this.windowRead, () => {
      if (!this.isConnected) return;
      const medium = getComputedStyle(this).getPropertyValue('--tanrei-sys-breakpoint-medium').trim();
      if (!medium) return;
      this.widths = matchMedia(`(min-width: ${medium})`);
      this.widths.addEventListener('change', this.onWindow);
      this.onWindow();
    });
  }

  /** Who asks for the reads of the read phase: the window's width, and where the connected scroll is. */
  private readonly windowRead = {};
  private readonly scrollRead = {};

  private unwatchWindow() {
    cancelPhaseRead(this.windowRead);
    this.shell?.removeEventListener('windowclasschange', this.onWindow);
    this.widths?.removeEventListener('change', this.onWindow);
    this.shell = null;
    this.widths = null;
  }

  private readonly onWindow = () => {
    const decided = this.shell?.windowClass;
    this.compact = decided ? decided === 'compact' : this.widths ? !this.widths.matches : false;
  };

  /**
   * APB-21, APB-23: the brand's images shown — one image wherever `brand` holds one (the parts are then not shown); a
   * symbol or a wordmark alone; both as a lockup; or, responsive, the one the window's class asks for.
   */
  private get shownBrand(): BrandSlot[] {
    if (this.brands.brand > 0) return ['brand'];
    const symbol = this.brands['brand-symbol'] > 0;
    const wordmark = this.brands['brand-wordmark'] > 0;
    if (symbol && wordmark) return this.brandLayout === 'responsive' ? [this.compact ? 'brand-symbol' : 'brand-wordmark'] : ['brand-symbol', 'brand-wordmark'];
    return symbol ? ['brand-symbol'] : wordmark ? ['brand-wordmark'] : [];
  }

  /** A size other than small has a title row of its own: large, or a size a layer added that the active system defines. */
  private get expands(): boolean {
    if (this.size === 'large') return true;
    return !(CORE_SIZES as readonly string[]).includes(this.size) && this.layerExpands;
  }

  private get center(): boolean {
    return this.titleAlignment === 'center';
  }

  private find<T extends Element>(selector: string): T | null {
    return this.renderRoot?.querySelector<T>(selector) ?? null;
  }

  // ---- APB-8, APB-9: the connected scrolling element ----

  private disconnectScroll() {
    cancelAnimationFrame(this.retry);
    cancelPhaseRead(this.scrollRead);
    if (this.source) this.source.target.removeEventListener('scroll', this.onScroll);
    this.source = null;
    this.connected = false;
  }

  /** Follows the element `scroll-target` names (the document's scrolling element when empty; nothing for `none`). */
  private connectScroll(attempt = 0) {
    this.disconnectScroll();
    const name = (this.scrollTarget ?? '').trim();
    if (name === 'none') return;
    if (name === '') {
      const read = () => document.scrollingElement?.scrollTop ?? window.scrollY;
      this.source = { target: window, read };
    } else {
      const root = this.getRootNode() as Document | ShadowRoot;
      const element = typeof root.getElementById === 'function' ? root.getElementById(name) : null;
      if (!element) {
        // The element may come later in the document: look again on the next frame, once.
        if (attempt === 0) this.retry = requestAnimationFrame(() => this.connectScroll(1));
        else report(this, 'APB-9', `scroll-target "${name}" names no element; the bar follows nothing and draws what scrolled says`);
        return;
      }
      this.source = { target: element, read: () => element.scrollTop };
    }
    this.source.target.addEventListener('scroll', this.onScroll, { passive: true });
    this.connected = true;
    // Where it is scrolled to now (a page restored scrolled) is read in the frame's read phase, before the first frame
    // is painted: a read of the scroll in the bar's first update had the browser lay the page out for it.
    readInPhase(this.scrollRead, this.onScroll);
  }

  private readonly onScroll = () => {
    if (!this.source) return;
    this.offset = Math.max(0, this.source.read());
    this.follow();
  };

  /**
   * APB-8, APB-9: a small bar is scrolled while the content has left its top; a large one shrinks one for one with the
   * scroll, from its expanded height to its top row, and is scrolled only once it has fully collapsed.
   */
  private follow() {
    if (!this.connected) return;
    const block = this.find<HTMLElement>('.block');
    const range = this.expands && block ? block.offsetHeight : 0;
    this.collapse = this.expands ? clamp(this.offset, 0, range) : 0;
    this.covered = this.expands ? this.coveredPart(block, range) : 1;
    this.scrolled = this.offset > range;
  }

  /** How much of the expanded title the top row covers, 0 to 1 (APB-8). */
  private coveredPart(block: HTMLElement | null, range: number): number {
    if (!block || range <= 0) return 0;
    if (this.collapse >= range) return 1;
    const title = block.querySelector<HTMLElement>('.title');
    if (!title || title.offsetHeight <= 0) return this.collapse >= range ? 1 : 0;
    return clamp((this.collapse - title.offsetTop) / title.offsetHeight, 0, 1);
  }

  // ---- APB-6: the centred title's balance ----

  private measure() {
    this.balance();
    this.follow();
  }

  /**
   * A box the bar watches changed size: the centred title's balance, the collapse and which actions are out are decided
   * again, before the frame (APB-32). Showing or hiding an action resizes boxes the observer may already have reported in
   * this frame, which it would report only in the next one, with a loop error; so after a decision that changed what is
   * shown, the observation is laid down and taken up again in the next frame, where its first report decides once more
   * and finds nothing to change.
   */
  private resized() {
    this.measure();
    if (!this.fit() || !this.resize$) return;
    this.resize$.disconnect();
    this.resting = true;
    requestAnimationFrame(() => {
      this.resting = false;
      if (!this.isConnected) return;
      this.observe();
      this.fit();
    });
  }

  // ---- APB-26 to APB-33: as many actions as fit ----

  private get menuMode(): boolean {
    return this.overflow !== 'hide';
  }

  private get moreButton(): Action | null {
    return this.find<Action>('.more');
  }

  private get overflowMenu(): TanreiMenu | null {
    return this.find<TanreiMenu>('.overflow-menu');
  }

  /** APB-26: an action the bar may take out — a Tanrei Button whose own overflow is not never. */
  private mayLeave(item: Element) {
    return item.localName === BUTTON && item.getAttribute(KEEP) !== 'never';
  }

  /**
   * APB-32: what is out is decided once every action and the more button have drawn themselves — still before the frame,
   * since every element renders in a microtask.
   */
  private settling = false;
  private again = false;
  private async settle() {
    if (this.settling) {
      this.again = true;
      return;
    }
    this.settling = true;
    try {
      do {
        this.again = false;
        await this.updateComplete;
        await Promise.all([...this.actionItems, this.moreButton].map((element) => element?.updateComplete));
        if (this.isConnected) this.fit();
      } while (this.again);
    } finally {
      this.settling = false;
    }
  }

  /**
   * APB-26: the length the top row needs to hold the start items, the title block at its whole width, the actions that
   * are not in `out` and, under overflow menu with an action out, the more button — with the row's paddings and gaps.
   */
  private needs(out: ReadonlySet<Element>, room: { start: number; lead: number; title: number; gap: number; actionsGap: number; endActions: number; endNone: number; more: number }) {
    const shown = this.actionItems.filter((item) => !out.has(item)).map((item) => this.actionWidths.get(item) ?? 0).filter((width) => width > 0);
    if (this.menuMode && out.size) shown.push(room.more);
    const actions = shown.reduce((sum, width) => sum + width, 0) + Math.max(0, shown.length - 1) * room.actionsGap;
    const end = shown.length ? room.gap + actions + room.endActions : room.endNone;
    const start = room.start + room.lead + (room.lead > 0 ? room.gap : 0);
    // APB-6: a centred title is centred on the bar's full width, so it needs the larger side on both.
    if (this.center && room.title > 0) return room.title + 2 * Math.max(start, end);
    return start + room.title + end;
  }

  /** APB-26: the title block's whole width, one line each, in the top row's text roles (measured on the bar's probe). */
  private titleRoom() {
    if (this.headline.trim() === '') return 0;
    const probes = this.renderRoot?.querySelectorAll<HTMLElement>('.metrics > span') ?? [];
    return Math.max(0, ...[...probes].map((probe) => probe.getBoundingClientRect().width));
  }

  /**
   * APB-26, APB-32: decides which actions are out, at once — every action shown; then, while the row cannot hold them,
   * actions taken out from the end, one at a time, skipping those that may not leave. Returns whether what is shown
   * changed.
   */
  private fitting = false;
  private fit(): boolean {
    const row = this.find<HTMLElement>('.row');
    const metrics = this.find<HTMLElement>('.metrics');
    if (!row || !metrics || this.fitting || !this.isConnected) return false;
    this.fitting = true;
    try {
      // APB-32: each action's width while it is drawn; an action that is out keeps the width it had.
      for (const item of this.actionItems) if (!item.hasAttribute(OUT)) this.actionWidths.set(item, item.getBoundingClientRect().width);
      for (const item of [...this.actionWidths.keys()]) if (!this.actionItems.includes(item as Action)) this.actionWidths.delete(item);
      const rowStyle = getComputedStyle(row);
      const metricsStyle = getComputedStyle(metrics);
      const lead = this.find<HTMLElement>('.lead');
      const more = this.moreButton;
      const room = {
        start: px(rowStyle, 'padding-inline-start'),
        lead: lead ? lead.getBoundingClientRect().width : 0,
        title: this.titleRoom(),
        gap: px(rowStyle, 'column-gap'),
        actionsGap: px(getComputedStyle(this.find<HTMLElement>('.actions') ?? row), 'column-gap'),
        // APB-4: the row ends padding-inline from the end edge after an action, title.inset where there is none.
        endActions: px(metricsStyle, 'padding-inline-start'),
        endNone: px(metricsStyle, 'padding-inline-end'),
        more: more ? more.getBoundingClientRect().width : 0,
      };
      const has = row.getBoundingClientRect().width;
      const fits = (out: ReadonlySet<Element>) => has <= 0 || this.needs(out, room) <= has + 0.5;
      const out = new Set<Element>();
      for (const item of this.actionItems.filter((each) => this.mayLeave(each)).reverse()) {
        if (fits(out)) break;
        out.add(item);
      }
      // APB-28: the more button's width is needed before the decision is drawn: it is drawn (unseen), and the decision
      // is made again once it is — before the frame (APB-32).
      if (out.size && this.menuMode && !more) {
        this.moreWanted = true;
        void this.settle();
        return false;
      }
      return this.apply(out);
    } finally {
      this.fitting = false;
    }
  }

  /** APB-26, APB-30, APB-31: draws the decision — an action out as nothing — and hands on the focus an action had. */
  private apply(out: Set<Element>): boolean {
    const before = this.out;
    const changed = before.size !== out.size || [...out].some((item) => !before.has(item));
    const shownAction = this.actionItems.some((item) => !out.has(item) && (this.actionWidths.get(item) ?? 0) > 0);
    const hasActions = shownAction || (this.menuMode && out.size > 0);
    if (this.hasActions !== hasActions) this.hasActions = hasActions;
    if (!changed) return false;
    const focused = [...out].find((item) => !before.has(item) && holdsFocus(item)) ?? null;
    this.out = out;
    this.outCount = out.size;
    for (const item of this.actionItems) {
      const isOut = out.has(item);
      if (item.hasAttribute(OUT) === isOut) continue;
      // An action that goes out is no longer watched (it is drawn as nothing); one that comes back is watched again from
      // the next frame, so that its first report is not one the observer must defer (see `resized`).
      if (isOut) this.resize$?.unobserve(item);
      item.toggleAttribute(OUT, isOut);
      if (!isOut) requestAnimationFrame(() => {
        if (this.isConnected && !this.resting && !item.hasAttribute(OUT)) this.resize$?.observe(item);
      });
    }
    if (focused) void this.handOnFocus(focused);
    // APB-29: a menu open while what it holds changes is closed.
    const menu = this.overflowMenu;
    if (menu?.open) menu.open = false;
    if (out.size && this.menuMode && !this.words.get('toolbarOverflowLabel', this.overflowLabel)) {
      this.words.missing('toolbarOverflowLabel', { prop: 'overflowLabel', id: 'APB-33', effect: 'the more button is drawn and opens its menu, and has no accessible name' });
    }
    return true;
  }

  /**
   * APB-31: focus on an action that went out moves, without scrolling, to the more button (overflow menu); or to the
   * nearest action still shown before it, else after it, else the last of the start items that takes focus (hide).
   */
  private async handOnFocus(from: Element) {
    if (this.menuMode) {
      await this.updateComplete;
      this.moreButton?.focus({ preventScroll: true });
      return;
    }
    const index = this.actionItems.indexOf(from as Action);
    const shown = (item: Element) => !this.out.has(item) && (this.actionWidths.get(item) ?? 0) > 0;
    const near = [...this.actionItems.slice(0, index).reverse(), ...this.actionItems.slice(index + 1)].filter(shown);
    // The start items in reading order are navigation, brand, context: the last of them first.
    const starts = [this.querySelector<HTMLElement>(':scope > [slot="context"]'), this.find<HTMLElement>('a.brand'), this.querySelector<HTMLElement>(':scope > [slot="navigation"]')];
    for (const item of [...near, ...starts]) {
      if (!item || item.getClientRects().length === 0) continue;
      item.focus({ preventScroll: true });
      if (holdsFocus(item)) return;
    }
  }

  // ---- APB-29: the overflow menu ----

  private readonly onMoreClick = () => {
    const menu = this.overflowMenu;
    if (!menu) return;
    if (menu.open) {
      menu.open = false;
      return;
    }
    this.buildOverflowMenu(menu);
    menu.open = true;
  };

  private readonly onMenuClose = () => {
    const menu = this.overflowMenu;
    if (menu) menu.open = false;
  };

  /** What the overflow menu's rows fire stays in the bar: what a row does is the action's own event (APB-29). */
  private readonly onMenuEvent = (event: Event) => {
    event.stopPropagation();
  };

  /** APB-29: the actions that are out, in reading order, a row (or a submenu) each. */
  private buildOverflowMenu(menu: TanreiMenu) {
    menu.replaceChildren(...this.actionItems.filter((item) => this.out.has(item)).flatMap((item) => this.rowsFor(item)));
  }

  /** The glyph an action shows in its icon slot, by the icon set's name; empty for a drawing of the product's own. */
  private glyphOf(item: Element) {
    const icon = item.querySelector(':scope > [slot="icon"]');
    if (!icon || icon.children.length) return '';
    return (icon.textContent ?? '').trim();
  }

  /** An action's label: its `label`, else its text without its icon. */
  private labelOf(item: Action) {
    if (item.label) return item.label;
    return [...item.childNodes]
      .filter((node) => !(node instanceof Element && node.hasAttribute('slot')))
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
  }

  /** APB-29: a Menu the product anchored to an action, in the bar's document or shadow root. */
  private menuOf(item: Element): Element | null {
    if (!item.id) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return root.querySelector?.(`tanrei-menu[anchor="${CSS.escape(item.id)}"]`) ?? null;
  }

  /** APB-29: the rows of the overflow menu that stand for one action. */
  private rowsFor(item: Action): Element[] {
    const disabled = !!item.disabled;
    const glyph = this.glyphOf(item);
    const label = this.labelOf(item);
    const own = this.menuOf(item);
    if (own) {
      const sub = document.createElement('tanrei-submenu');
      sub.setAttribute('label', label);
      if (glyph) sub.setAttribute('leading-icon', glyph);
      sub.toggleAttribute('disabled', disabled);
      sub.append(...this.copies([...own.children].filter((child) => child.matches(MENU_ROWS))));
      return [sub];
    }
    const row = document.createElement(item.toggle ? 'tanrei-menu-checkbox-item' : 'tanrei-menu-item');
    row.setAttribute('label', label);
    if (glyph) row.setAttribute('leading-icon', glyph);
    if (item.toggle) row.toggleAttribute('checked', !!item.selected);
    row.toggleAttribute('disabled', disabled);
    if (item.href && !item.toggle) {
      // A link goes where the action goes, in the same target: the row is a link item (MNU-53).
      row.setAttribute('href', item.href);
      if (item.target) row.setAttribute('target', item.target);
      if (item.targetLabel) row.setAttribute('target-label', item.targetLabel);
      return [row];
    }
    // The action is activated as a person would: its own button, so that it fires its own click (and change).
    row.addEventListener('click', () => (item.shadowRoot?.querySelector('[part~="container"]') as HTMLElement | null)?.click());
    return [row];
  }

  /** APB-29: a Menu's rows repeated in the overflow menu; activating a copy activates the row it repeats. */
  private copies(rows: Element[]): Element[] {
    return rows.map((row) => {
      const copy = row.cloneNode(true) as Element;
      const originals = [row, ...row.querySelectorAll(MENU_ROWS)];
      const copied = [copy, ...copy.querySelectorAll(MENU_ROWS)];
      copied.forEach((element, i) => {
        element.removeAttribute('slot');
        element.removeAttribute('id');
        const original = originals[i] as HTMLElement;
        if (element.localName === 'tanrei-submenu' || element.localName === 'tanrei-menu-group' || element.hasAttribute('href')) return;
        element.addEventListener('click', (event) => {
          if (event.target === element) original.click();
        });
      });
      return copy;
    });
  }

  /**
   * APB-6: a centred title block is centred on the bar's full width — narrowed on the side that has less beside it by
   * the difference, so that it never runs under either slot.
   */
  private balance() {
    const row = this.find<HTMLElement>('.row');
    const area = this.find<HTMLElement>('.title-area');
    if (!row || !area) return;
    if (!this.center) {
      area.style.removeProperty('--_balance-start');
      area.style.removeProperty('--_balance-end');
      return;
    }
    const r = row.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    const rtl = getComputedStyle(this).direction === 'rtl';
    const start = rtl ? r.right - a.right : a.left - r.left;
    const end = rtl ? a.left - r.left : r.right - a.right;
    area.style.setProperty('--_balance-start', `${Math.max(0, end - start)}px`);
    area.style.setProperty('--_balance-end', `${Math.max(0, start - end)}px`);
  }

  /** APB-4, APB-13, APB-26: which slots hold items; more than one navigation item still renders, and is reported. */
  #onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const items = slot.assignedElements();
    if ((BRAND_SLOTS as readonly string[]).includes(slot.name)) {
      this.brands = { ...this.brands, [slot.name]: items.length };
      // APB-22: the images are the link's picture, not its name: the name is brand-label, read once.
      for (const item of items) if (item.getAttribute('aria-hidden') !== 'true') item.setAttribute('aria-hidden', 'true');
      if (items.length > 1) report(this, 'APB-23', `the ${slot.name} slot holds ${items.length} images; it draws one`);
      this.reportBrand();
    } else if (slot.name === 'context') {
      this.hasContext = items.length > 0;
    } else if (slot.name === 'navigation') {
      this.hasNavigation = items.length > 0;
      if (items.length > 1) report(this, 'APB-13', `the bar holds ${items.length} navigation items; a bar has one navigation button`);
    } else {
      this.actionItems = items as Action[];
      // An element that left the slot is no longer the bar's to hide.
      for (const item of this.out) if (!items.includes(item)) item.removeAttribute(OUT);
      this.out = new Set([...this.out].filter((item) => items.includes(item)));
      this.outCount = this.out.size;
      this.hasActions = items.length > 0;
      this.observe();
      void this.settle();
    }
  }

  /** APB-23: a brand without a name, and an image in brand given beside the parts it takes the place of. */
  private reportBrand() {
    const { brand, 'brand-symbol': symbol, 'brand-wordmark': wordmark } = this.brands;
    if (brand > 0 && symbol + wordmark > 0) report(this, 'APB-23', 'the bar has an image in brand and the symbol or the wordmark beside it; it shows the image in brand alone');
    if (brand + symbol + wordmark > 0 && !this.brandLabel.trim()) report(this, 'APB-23', 'the bar has a brand and no brand-label; give it the product\'s name');
  }

  /** The boxes whose size moves the centred title's balance and the collapse's range. */
  private observe() {
    if (this.resting) return;
    for (const selector of ['.row', '.lead', '.actions', '.block', '.metrics > span', '.more']) {
      for (const element of this.renderRoot?.querySelectorAll(selector) ?? []) this.resize$?.observe(element);
    }
    // APB-27: each action drawn; one that is out is drawn as nothing.
    for (const item of this.actionItems) if (!item.hasAttribute(OUT)) this.resize$?.observe(item);
  }

  protected override firstUpdated() {
    this.observe();
    this.connectScroll();
    void this.settle();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // APB-18: a divider visibility the bar does not define is drawn as auto (no rule matches it).
    if (changed.has('dividerVisibility') && !isDividerVisibility(this.dividerVisibility)) {
      report(this, 'APB-18', `divider-visibility "${this.dividerVisibility}" is not a value of the app bar; it is drawn as "auto"`);
    }
    // APB-23: a brand layout the bar does not define is drawn as a lockup (shownBrand reads only "responsive").
    if (changed.has('brandLayout') && !BRAND_LAYOUTS.includes(this.brandLayout)) {
      report(this, 'APB-23', `brand-layout "${this.brandLayout}" is not a value of the app bar; it is drawn as "lockup"`);
    }
    if (changed.has('brandLabel') && this.hasUpdated) this.reportBrand();
    // APB-33: an overflow the bar does not define is menu.
    if (changed.has('overflow') && !OVERFLOWS.includes(this.overflow)) {
      report(this, 'APB-33', `overflow "${this.overflow}" is not a value of the app bar; it is drawn as "menu"`);
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // APB-18: the fallback where style queries are missing — the name the cascade gives, on the container.
    syncDividerVisibility(this, this.find<HTMLElement>('.container'));
    // APB-14: a size a layer added is a size with its own title row where the active system defines it.
    if (changed.has('size')) {
      const layer = !(CORE_SIZES as readonly string[]).includes(this.size);
      this.layerExpands = layer && getComputedStyle(this).getPropertyValue(heightProbe(this.size)).trim() !== '';
    }
    if (changed.has('scrollTarget') && changed.get('scrollTarget') !== undefined) this.connectScroll();
    // The block's natural height is the collapse's range: watch it (fonts, text size, a subtitle).
    const block = this.find('.block');
    if (block) this.resize$?.observe(block);
    if (changed.has('size') || changed.has('layerExpands' as keyof TanreiAppBar) || changed.has('headline') || changed.has('subtitle')) this.follow();
    // APB-27: the room the actions have follows the title, the start items, the alignment and the overflow; the probe and
    // the more button drawn now are watched.
    if (['headline', 'subtitle', 'size', 'titleAlignment', 'overflow', 'hasNavigation', 'hasContext', 'brands', 'compact', 'brandLayout', 'moreWanted'].some((name) => changed.has(name as keyof TanreiAppBar))) {
      this.observe();
      void this.settle();
    }
    if (changed.has('titleAlignment') || changed.has('hasNavigation' as keyof TanreiAppBar) || changed.has('hasContext' as keyof TanreiAppBar) || changed.has('hasActions' as keyof TanreiAppBar) || changed.has('brands' as keyof TanreiAppBar) || changed.has('compact' as keyof TanreiAppBar)) this.balance();
  }

  /** APB-5, APB-7, APB-12: the title (a heading) and the subtitle read after it; `hidden` keeps a copy out of the tree. */
  private titleBlock(hidden: boolean) {
    const level = clamp(Math.round(Number(this.headingLevel) || 1), 1, 6);
    return html`
      <div class="title-block" aria-hidden=${hidden ? 'true' : nothing}>
        <div part="title" class="title" dir=${ownDirection(this.headline)} role="heading" aria-level=${level}>${this.headline}</div>
        ${this.subtitle ? html`<div part="subtitle" class="subtitle" dir=${ownDirection(this.subtitle)}>${this.subtitle}</div>` : nothing}
      </div>
    `;
  }

  protected override render() {
    const titled = this.headline.trim() !== '';
    const expands = this.expands;
    // APB-9: without a connection, a large bar is drawn collapsed while scrolled is true and expanded while it is false.
    const covered = !expands ? 1 : this.connected ? this.covered : this.scrolled ? 1 : 0;
    // APB-7, APB-8: the top row draws no title while the expanded one is wholly visible, and fades it in as it is covered.
    const topTitle = titled && covered > 0;
    // APB-12: the expanded title is the one exposed while any of it is visible.
    const topHidden = expands && covered < 1;
    const showsExpanded = expands && (this.connected || !this.scrolled);
    const shown = this.shownBrand;
    const hasBrand = shown.length > 0;
    // APB-21, APB-22: the slots stay, so that the bar hears what they hold; the ones not shown are in no box. The images
    // are the picture of one link (or one image) named by brand-label.
    // APB-24: a lockup's symbol stands at the wordmark's height.
    const images = html`<span class=${classMap({ images: true, lockup: shown.length > 1 })}>${BRAND_SLOTS.map((name) => html`<slot name=${name} ?hidden=${!shown.includes(name)} @slotchange=${this.#onSlotChange}></slot>`)}</span>`;
    const label = this.brandLabel.trim() || nothing;
    const brand = !hasBrand
      ? html`<span class="brand" hidden>${images}</span>`
      : this.brandHref
        ? html`<a part="brand" class="brand" href=${this.brandHref} aria-label=${label}>${images}</a>`
        : html`<span part="brand" class="brand" role="img" aria-label=${label}>${images}</span>`;
    // APB-28, APB-29: the more button and its menu, from the first time an action had to go out under overflow menu;
    // while none is out the button is laid out unseen, so that its width is known.
    const moreShown = this.menuMode && this.moreWanted;
    const more = moreShown
      ? html`<tanrei-button
          part="overflow-button"
          class=${classMap({ more: true, idle: this.outCount === 0 })}
          id="overflow"
          variant="text"
          size="medium"
          label=${this.words.get('toolbarOverflowLabel', this.overflowLabel)}
          @click=${this.onMoreClick}
          ><span slot="icon">${OVERFLOW_GLYPH}</span></tanrei-button
        >`
      : nothing;
    const menu = moreShown
      ? html`<span class="menus"
          ><tanrei-menu part="overflow-menu" class="overflow-menu" anchor="overflow" placement="bottom-end" @close=${this.onMenuClose} @click=${this.onMenuEvent} @change=${this.onMenuEvent} @toggle=${this.onMenuEvent}></tanrei-menu
        ></span>`
      : nothing;
    return html`
      <div part="container" class="container">
        <div
          part="top-row"
          class=${classMap({ row: true, center: this.center, 'has-navigation': this.hasNavigation, 'has-brand': hasBrand, 'has-context': this.hasContext, 'has-actions': this.hasActions })}
        >
          <div class="lead">
            <div class="navigation"><slot name="navigation" @slotchange=${this.#onSlotChange}></slot></div>
            ${brand}
            <div class="context"><slot name="context" @slotchange=${this.#onSlotChange}></slot></div>
          </div>
          <div class="title-area" style=${styleMap({ opacity: expands && covered < 1 ? String(covered) : null })}>
            ${topTitle ? this.titleBlock(topHidden) : nothing}
          </div>
          <div class="actions"><slot name="actions" @slotchange=${this.#onSlotChange}></slot>${more}</div>
        </div>
        ${showsExpanded
          ? html`<div part="expanded" class="expanded" aria-hidden=${covered >= 1 ? 'true' : nothing}>
              <div class="block" style=${styleMap({ '--_collapse': this.collapse > 0 ? `${this.collapse}px` : null })}>
                ${titled ? this.titleBlock(false) : nothing}
              </div>
            </div>`
          : nothing}
        <div part="outline" class="outline" aria-hidden="true"></div>
        <div class="metrics" aria-hidden="true">${titled ? html`<span class="probe-title">${this.headline}</span>${this.subtitle ? html`<span class="probe-subtitle">${this.subtitle}</span>` : nothing}` : nothing}</div>
        ${menu}
      </div>
    `;
  }
}

if (!customElements.get('tanrei-app-bar')) customElements.define('tanrei-app-bar', TanreiAppBar);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-app-bar': TanreiAppBar;
  }
}
