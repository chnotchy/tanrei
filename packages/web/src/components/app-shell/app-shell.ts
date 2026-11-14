import type { PropertyDeclarations, PropertyValues } from 'lit';
import {
  AvailabilityController,
  type Binding,
  SEPARATIONS,
  SEPARATION_VALUES,
  type SeparationProp,
  ambientConvention,
  chordPressed,
  chordsOf,
  compChoice,
  containedWheel,
  deepActive,
  platformConvention,
  readBinding,
  report,
  styleQueries,
  takesText,
} from '../../primitives/index.js';
import { debugBuild } from '../../primitives/report.js';
import { adoptUnlessDrawn } from '../../primitives/sheets.js';
import { TanreiLightElement } from '../../primitives/element.js';

/** What scrolls (APS-14, APS-15): the whole page in the window, or the main region alone inside a frame as tall as the window. */
export type TanreiAppShellScroll = 'page' | 'main';
/** Whether the header stays at the top of the window while the page scrolls (APS-16). */
export type TanreiAppShellHeaderPosition = 'sticky' | 'static';
/** Whether the main region's content is limited to the readable width (APS-8). */
export type TanreiAppShellMainWidth = 'contained' | 'full';
/** Where the aside stands in reading order, and so where it is drawn when it is not beside the main content (APS-9). */
export type TanreiAppShellAsideOrder = 'after' | 'before';
/** How regions that touch are told apart (APS-18): `auto` takes `comp.app-shell.separation`. */
export type TanreiAppShellSeparation = SeparationProp;
/** Where the one control that shows and hides the navigation lives (APS-6): the header's menu button, or the navigation drawer's own. */
export type TanreiAppShellMenuButtonPlacement = 'header' | 'drawer';
/** The class the window's width gives it (APS-2). */
export type TanreiWindowClass = 'compact' | 'medium' | 'expanded';
/** What `windowclasschange` carries: the class the window has now (which `windowClass` already holds). */
export interface TanreiAppShellWindowClassChangeDetail {
  windowClass: TanreiWindowClass;
}
/** What `navigationopenchange` carries: the value asked for (which `navigationOpen` already holds). */
export interface TanreiAppShellNavigationOpenChangeDetail {
  navigationOpen: boolean;
}

// The text of src/styles/app-shell.css — the stylesheet that lays the frame out — written in by the build
// (scripts/build.js), so the element can add it to the root it is connected to. A build that wrote nothing leaves it
// empty, and the frame is then laid out by the page's own copy of `@tanrei/web/app-shell.css` alone.
declare const TANREI_APP_SHELL_CSS: string;
const SHELL_CSS: string = (() => {
  try {
    return TANREI_APP_SHELL_CSS;
  } catch {
    return '';
  }
})();

const SCROLLS: readonly string[] = ['page', 'main'];
const HEADER_POSITIONS: readonly string[] = ['sticky', 'static'];
const MAIN_WIDTHS: readonly string[] = ['contained', 'full'];
const ASIDE_ORDERS: readonly string[] = ['after', 'before'];
/** The mark of the header's one button that opens the navigation (APS-6). */
const MENU = '[data-app-shell-menu]';
/** What the frame gives the page: the height it keeps over the top of the scrolling view, and over its bottom (APS-17). */
const OFFSET = '--tanrei-app-shell-scroll-offset';
const OFFSET_END = '--tanrei-app-shell-scroll-offset-end';
/** The footer's measured height, for the stylesheet (APS-11). */
const FOOTER = '--_aps-footer';
/** A side sheet's measured width in the aside, for the stylesheet: what the navigation leaves it (APS-5, APS-10). */
const ASIDE = '--_aps-aside';
/**
 * The window's width as the page has it — the root's content width, less a scrollbar that takes room in the window — for
 * the stylesheet: the row's whole room, which the navigation's is taken from (APS-5).
 */
const WINDOW = '--_aps-window';

type Root = Document | ShadowRoot;
/** A navigation drawer in the navigation region, as much of it as the frame uses. */
type Drawer = HTMLElement & {
  open: boolean;
  expanded?: boolean;
  responsive?: boolean;
  collapsible?: boolean;
  presentation?: string | null;
  updateComplete?: Promise<unknown>;
  /** NVD-19: told that the frame's regions changed (whether its header holds it). */
  shellChanged?: () => void;
  /** APS-7, NVD-37: the frame's menu button was activated (by `button`, from a pointer where `pointer`). */
  menuFromShell?: (button: HTMLElement | null, pointer: boolean) => void;
  /** APS-7, MDL-2: holds the page's scroll for the frame, `holder`, as a modal layer does (the drawer's module carries the code). */
  holdShellScroll?: (holder: Element, hold: boolean) => void;
  /** APS-33: a drawer that filters its items, its chord, and the request to focus its field (NVD-87, NVD-88). */
  filterable?: boolean;
  filterShortcut?: string[];
  focusFilter?: () => void;
};

let made: CSSStyleSheet | null | undefined;
/** The frame's stylesheet, made once and shared by every root that needs it. */
function sheet(): CSSStyleSheet | null {
  if (made !== undefined) return made;
  if (typeof CSSStyleSheet === 'undefined' || !SHELL_CSS) return (made = null);
  made = new CSSStyleSheet();
  try {
    made.replaceSync(SHELL_CSS);
  } catch {
    // A browser that cannot construct it: the page's own copy of app-shell.css lays the frame out.
  }
  return made;
}

/** Writes an attribute only when it differs. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** Whether `element` is drawn: it, and everything it stands in, has a box. */
const drawn = (element: Element) => element.getClientRects().length > 0;

/** The frames that have measured something over the top or the bottom of the page: the last one to measure wins, and the last to leave takes the value back. */
const measured = new Map<string, Set<Element>>();
function publish(owner: Element, name: string, size: number | null) {
  const owners = measured.get(name) ?? new Set<Element>();
  measured.set(name, owners);
  const root = document.documentElement;
  if (size === null) {
    if (!owners.delete(owner)) return;
    if (!owners.size) root.style.removeProperty(name);
    return;
  }
  owners.add(owner);
  const value = `${Math.round(size * 100) / 100}px`;
  if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
}

let ids = 0;

/**
 * Frames a page or an app: places a header, the navigation, the main content, an aside and a footer, decides from the
 * window's width how each of them is shown, and lets a keyboard reach the content in one step. It draws the frame and
 * none of what stands in it.
 *
 * Contract: specs/app-shell.spec.json. The element has **no shadow root**: it is the frame around the product's own
 * regions, which stay in the document and keep their semantics — a `<header>` is the page's banner and the one
 * `<main>` its main landmark for a screen reader, a crawler and a page without script alike.
 *
 * ```html
 * <tanrei-app-shell aside-order="before" aside-label="On this page">
 *   <a class="tanrei-link" data-standalone slot="skip-link" href="#main">Skip to content</a>
 *   <div slot="announcement">…a callout…</div>
 *   <header slot="header">
 *     <tanrei-app-bar headline="Tanrei">
 *       <tanrei-button slot="navigation" data-app-shell-menu variant="text" label="Menu"><span slot="icon">menu</span></tanrei-button>
 *     </tanrei-app-bar>
 *   </header>
 *   <tanrei-navigation-drawer slot="navigation" responsive collapsible label="Documentation">…</tanrei-navigation-drawer>
 *   <aside slot="aside">…</aside>
 *   <main id="main" tabindex="-1">…</main>
 *   <footer slot="footer">…</footer>
 *   <tanrei-navigation-bar slot="navigation-bar" label="Sections">…</tanrei-navigation-bar>
 * </tanrei-app-shell>
 * ```
 *
 * A region is a child with a `slot` attribute — the region's name; no shadow root reads it — and the main region is
 * the one `<main>` without one. They are written in the order a keyboard walks them (APS-22): the skip link, the
 * announcement, the header, the navigation, the aside while `aside-order` is `before`, the main region, the aside
 * while it is `after`, the footer, the navigation bar. The stylesheet places them by name and never reorders focus.
 * `footer-hidden` leaves a filled footer out of the frame (APS-31).
 *
 * Everything laid out is `@tanrei/web/app-shell.css`, before and without this script (APS-24): the window's class is
 * a media condition, a region the class does not show has no box, and the skip link is an anchor to the main region's
 * id. The element adds the same sheet to the root it is connected to, and what a stylesheet cannot say:
 *
 * - **the class**, as the read-only `windowClass`, the `data-window-class` attribute and `windowclasschange` — from
 *   two `matchMedia` listeners of the widths the stylesheet was written with; no resize listener and no frame loop.
 *   What the frame holds also inherits it as `--tanrei-app-shell-window-class`, from the stylesheet alone;
 * - **the menu button** — the one icon-only `<tanrei-button data-app-shell-menu>` in the header — shown in every
 *   window class for a `<tanrei-navigation-drawer>` (`menu-button-placement="drawer"`: only where the navigation has
 *   no place in the layout). It asks the drawer for what the drawer's own menu button asks: where the navigation has no
 *   place (or only its column) `navigationOpen` and the drawer's `open` become true, and a second press, Escape or the
 *   drawer's `close` makes them false again; where it stands beside the content it collapses and expands it, or hides
 *   and shows one with no collapsed form. The button says `aria-expanded` and what it controls. A frame without a
 *   header takes it from its `menu-button` slot instead, and shows it only where the navigation has no place in the
 *   layout, alone in the header's place and kept at the top of the window (APS-34);
 * - **the navigation open over the content**, drawn below the header with its scrim (the drawer is then no dialog
 *   and keeps no focus): the skip link, the main region, the aside, the footer and the navigation bar are inert and
 *   the page does not scroll, until closing begins. The header and the announcement stay usable;
 * - **the scroll offset**: the header's measured height as `--tanrei-app-shell-scroll-offset` on the document's root
 *   (the stylesheet sets the root's scroll padding from it), and the navigation bar's as
 *   `--tanrei-app-shell-scroll-offset-end`, so a link's target and a focused element rest clear of both. The product's
 *   own sticky parts read the same properties;
 * - **a landmark** for a region whose element does not give one (`role="banner"` on a header that is not a
 *   `<header>`, `aria-label` from `aside-label` on an aside without a name), and `tabindex="-1"` on a `<main>` that
 *   lacks it;
 * - the debug reports of APS-4, APS-21 and APS-29.
 *
 * With `scroll="main"` the main region is the scrolling view: name its id in the app bar's `scroll-target`.
 *
 * @tag tanrei-app-shell
 * @slot - The main region: the one `<main>` child without a `slot` attribute. Its `id` is the skip link's destination.
 * @slot skip-link - The skip link: a standalone Link (`class="tanrei-link" data-standalone`) whose `href` is the main region's id, with the product's words. Shown only while it has keyboard focus.
 * @slot announcement - The notice above the header: an element around a callout, across the frame's width.
 * @slot header - The header: a `<header>` around the product's app bar, with the menu button in the bar's navigation slot.
 * @slot menu-button - The menu button of a frame without a header: an icon-only `<tanrei-button slot="menu-button">`, placed alone in the header's place at the top start corner and kept at the top of the window while the page scrolls (APS-34). Not shown while the header slot is filled.
 * @slot navigation - The navigation: a `<tanrei-navigation-drawer responsive>`. Anything else is placed beside the content in an expanded window and is not shown in a narrower one.
 * @slot aside - The aside: an `<aside>` with the product's supporting content, or a side sheet.
 * @slot footer - The footer: a `<footer>` with the product's own layout.
 * @slot navigation-bar - A navigation bar for the bottom edge of a compact window.
 * @fires {CustomEvent<TanreiAppShellWindowClassChangeDetail>} windowclasschange - The frame decided the window's class for the first time, or the window's width changed it: `detail.windowClass` (and `windowClass`) is `compact`, `medium` or `expanded`.
 * @fires {CustomEvent<TanreiAppShellNavigationOpenChangeDetail>} navigationopenchange - The navigation asks to be presented over the content, or to be put away: the menu button was activated (`detail.navigationOpen` true, and false while it was open), or the open navigation closed — by its scrim, Escape, the platform's back, a drag, a destination — or the window became wide enough for it to stand beside the content (false). `navigationOpen` already holds it.
 * @cssprop --tanrei-app-shell-scroll-offset - On the document's root: the height the frame keeps over the top of the page (a sticky header's), for the product's own sticky parts.
 * @cssprop --tanrei-app-shell-scroll-offset-end - On the document's root: the height the frame keeps over the bottom of the page (the navigation bar's).
 * @cssprop --tanrei-app-shell-window-class - Inherited by everything the frame holds: `compact`, `medium` or `expanded`, for a style container query.
 */
export class TanreiAppShell extends TanreiLightElement {
  private readonly availability = new AvailabilityController(this, 'app-shell');

  static override properties: PropertyDeclarations = {
    // The defaults are not reflected: a frame that is defined is the frame that was written.
    // `scroll` is the attribute; the property cannot have that name, which is every element's `scroll()` method.
    scrolls: { type: String, attribute: 'scroll', reflect: true, useDefault: true },
    headerPosition: { type: String, attribute: 'header-position', reflect: true, useDefault: true },
    mainWidth: { type: String, attribute: 'main-width', reflect: true, useDefault: true },
    asideOrder: { type: String, attribute: 'aside-order', reflect: true, useDefault: true },
    footerHidden: { type: Boolean, attribute: 'footer-hidden', reflect: true },
    separation: { type: String, reflect: true, useDefault: true },
    navigationOpen: { type: Boolean, attribute: 'navigation-open', reflect: true },
    menuButtonPlacement: { type: String, attribute: 'menu-button-placement', reflect: true, useDefault: true },
    asideLabel: { type: String, attribute: 'aside-label' },
  };

  /**
   * What scrolls: the `scroll` attribute. `page`: the whole page scrolls in the window, the header stays at the top and the navigation and the aside stay in view beside the content. `main`: the frame is exactly as tall as the window and only the main region scrolls inside it.
   * @attr scroll
   */
  scrolls: TanreiAppShellScroll = 'page';

  /** Whether the header stays at the top of the window while the page scrolls (`sticky`) or scrolls away with it (`static`). Ignored while `scroll` is `main`, where the header never moves. */
  headerPosition: TanreiAppShellHeaderPosition = 'sticky';

  /** `contained`: the main region's content is no wider than the frame's readable width and is centred in its room. `full`: it takes all the room inside the gutters. */
  mainWidth: TanreiAppShellMainWidth = 'contained';

  /** Where the aside stands in reading and focus order, and so where it is drawn when it is not beside the main content: `after` it (below) or `before` it (above). Write the aside on that side of the `<main>` in the markup. */
  asideOrder: TanreiAppShellAsideOrder = 'after';

  /**
   * APS-31: whether the footer is left out of the frame although the footer region is filled — for a screen that is a
   * task rather than a page of the site (a checkout, a sign-in, an editor). While true the footer has no box, no line,
   * no landmark and no focus stop; the stylesheet hides it, and focus that was inside it goes to the main region. The
   * footer is shown only while it is filled and this is false.
   */
  footerHidden = false;

  /** How regions that touch are told apart: `divider` draws the one hairline, `gap` draws nothing; `auto` takes `comp.app-shell.separation`, the design system's answer. */
  separation: TanreiAppShellSeparation = 'auto';

  /**
   * Whether the navigation is presented over the content — below the header — while it has no place of its own in the
   * layout (or only its column). The menu button makes it true and, while it is true, false; closing the navigation makes
   * it false, and so does the window becoming wide enough for the navigation to stand beside the content. A change
   * between the two narrower classes keeps it.
   */
  navigationOpen = false;

  /**
   * Where the one control that shows and hides the navigation lives. `header` (the default): the menu button in the
   * header, in every window class — it opens and closes the navigation over the content where the navigation has no
   * place (or only its column), and where it stands beside the content shows, hides or collapses it. `drawer`: the
   * navigation drawer's own menu button (its first header button) collapses and expands it where it has a place, and the
   * header's menu button is shown only where the navigation has none. Any other value is `header`.
   */
  menuButtonPlacement: TanreiAppShellMenuButtonPlacement = 'header';

  /** Names the aside for assistive technology where its element has no name of its own. */
  asideLabel = '';

  /** APS-2: the two widths the stylesheet was written with, as media queries, and what stops listening. */
  private widths: { medium: MediaQueryList; expanded: MediaQueryList; text: string } | null = null;
  private decided: TanreiWindowClass | null = null;
  /** APS-3: a `windowclasschange` owed once the class it names is drawn. */
  private announce = false;
  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.read());
  /** The navigation's `collapsible` decides its presentation in a medium window (APS-4). */
  private readonly navigationMutations =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => {
          // APS-7: a drawer opened or closed by the product is followed before the frame's own value is given to it.
          this.pullOpen();
          this.read();
        });
  /** APS-7: the regions the frame made inert while the navigation is open over the content below the header. */
  private readonly inerted = new Set<HTMLElement>();
  /** APS-7: the drawer through which the frame holds the page's scroll, and lets it go even once that drawer has left. */
  private scrollHeld: Drawer | null = null;
  private readonly sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => this.resized(entries));
  /** The regions read last. */
  private header: Element | null = null;
  /** APS-17, APS-34: what the frame keeps over the top of the page — the header, or the menu button of a frame without one. */
  private top: Element | null = null;
  private bar: Element | null = null;
  private footer: Element | null = null;
  /** APS-5, APS-10: a side sheet in the aside, whose width — its own, and changing as it slides — is measured. */
  private sheet: Element | null = null;
  /** APS-23: what last took focus in the frame, until focus goes elsewhere by a person's doing. */
  private focused: Element | null = null;
  private drawer: Drawer | null = null;
  private navigation: Element | null = null;
  /**
   * APS-5, APS-9: the regions that scroll inside their own height beside the main region — the navigation where it is
   * not a drawer (a drawer keeps its own scroll, NVD-61) and the aside — each holding `containedWheel`, so that a wheel
   * at the end of one does not scroll the page in Firefox. On the regions themselves, never on the frame: a wheel
   * listener that can cancel makes every wheel over its element wait for script before the browser scrolls, and the
   * main region is the page's own scrolling. (With `scroll="main"` the window has nothing to scroll.)
   */
  private wheeled: Element[] = [];
  /** The elements the frame gave a role, a name or a tab index, and what it gave: taken back when they leave it. */
  private readonly given = new Map<Element, string[]>();
  private menuStated: Element | null = null;
  private menuAwaited: Element | null = null;
  private awaitingParse = false;

  /** No shadow root: the regions are the document's. */
  protected override createRenderRoot() {
    return this;
  }

  /**
   * APS-2, APS-3: the class of the window's current width — `compact`, `medium` or `expanded` — or null until it is
   * decided. Read-only, derived from the width alone and never stored in a prop; reflected as the `data-window-class`
   * attribute.
   */
  get windowClass(): TanreiWindowClass | null {
    return this.decided;
  }

  override connectedCallback() {
    // Asked for before the element's own first update is (which `super` asks for): the frames connected in one turn
    // are all read before any of them is drawn.
    this.watchTogether();
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet(), '--_aps-breakpoint-medium');
    this.mutations?.observe(this, { childList: true });
    // APS-5: the window's width as the page has it, of which the navigation is left what the main region and the aside
    // do not need.
    this.sizes?.observe(document.documentElement);
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.mutations?.disconnect();
    this.navigationMutations?.disconnect();
    this.sizes?.disconnect();
    this.navigationSizes?.disconnect();
    this.resizing = null;
    this.reading = null;
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeyDown);
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('focusout', this.onFocusOut);
    this.holdWheel([]);
    this.syncInert(false);
    this.focused = null;
    this.style.removeProperty(FOOTER);
    this.style.removeProperty(ASIDE);
    this.style.removeProperty(WINDOW);
    this.unwatch();
    this.listen(null);
    // APS-33: removed, it listens for no chord.
    this.syncChord();
    this.header = this.bar = this.footer = this.sheet = this.navigation = null;
    publish(this, OFFSET, null);
    publish(this, OFFSET_END, null);
    for (const [element, names] of this.given) for (const name of names) element.removeAttribute(name);
    this.given.clear();
  }

  // ---- APS-2, APS-3: the window's class ----

  /** The two widths are read back from the stylesheet that lays the frame out, so the two can never disagree. */
  private watch() {
    this.takeWidths(this.readWidths());
  }

  /** The frames connected in this turn, whose widths are read together (`watchTogether`). */
  private static readonly connecting = new Set<TanreiAppShell>();

  /**
   * `watch()` for a frame that was just connected: in ONE microtask after the script that connected it, for every
   * frame of that turn — all read, then all told their class — and before any of them is drawn or a frame painted.
   * Read in its own connection, each frame had the page styled for itself, after the class the one before it had just
   * written (fifty at once: fifty style passes). A page has one frame; a gallery of them has many.
   */
  private watchTogether() {
    const due = TanreiAppShell.connecting;
    if (!due.size) {
      queueMicrotask(() => {
        const all = [...due];
        due.clear();
        const read = all.map((each) => each.readWidths());
        all.forEach((each, index) => each.takeWidths(read[index]));
      });
    }
    due.add(this);
  }

  /** The reading half of `watch()`: the widths the frame's stylesheet was written for, and the tokens' here. */
  private readWidths(): { medium: string; expanded: string; tokens: string } | null {
    if (!this.isConnected || typeof matchMedia !== 'function') return null;
    const style = getComputedStyle(this);
    const [medium, expanded] = ['medium', 'expanded'].map((name) => style.getPropertyValue(`--_aps-breakpoint-${name}`).trim());
    // Before its stylesheet has arrived nothing names the widths: nothing is decided on a guess (APS-24).
    if (!medium || !expanded) return null;
    const tokens = debugBuild() ? ['medium', 'expanded'].map((name) => style.getPropertyValue(`--tanrei-comp-app-shell-breakpoint-${name}`).trim()).join(' ') : '';
    return { medium, expanded, tokens };
  }

  /** The writing half of `watch()`: the widths are listened to, and the window's class decided. */
  private takeWidths(read: { medium: string; expanded: string; tokens: string } | null) {
    if (!read || !this.isConnected) return;
    const { medium, expanded, tokens } = read;
    const text = `${medium} ${expanded}`;
    if (this.widths?.text !== text) {
      this.unwatch();
      this.widths = { medium: matchMedia(`(min-width: ${medium})`), expanded: matchMedia(`(min-width: ${expanded})`), text };
      this.widths.medium.addEventListener('change', this.onWidth);
      this.widths.expanded.addEventListener('change', this.onWidth);
      // The stylesheet's conditions are written by the build from the tokens of one system: a system or a layer that
      // moves the widths needs the stylesheet written for it, or the frame and a navigation drawer in it part.
      if (debugBuild() && tokens.trim() && tokens !== text) {
        report(this, 'APS-2', `the stylesheet was written for the window widths ${text}, and comp.app-shell.breakpoint is ${tokens} here: load the app-shell stylesheet built for this design system`);
      }
    }
    this.decide();
  }

  private unwatch() {
    this.widths?.medium.removeEventListener('change', this.onWidth);
    this.widths?.expanded.removeEventListener('change', this.onWidth);
    this.widths = null;
  }

  private readonly onWidth = () => this.decide();

  /**
   * APS-3, APS-7, APS-23: the class of the window's current width. The first decision is only told. A change closes
   * an open navigation at once and takes focus off what the new arrangement does not show.
   */
  private decide() {
    const widths = this.widths;
    if (!widths) return;
    const next: TanreiWindowClass = widths.expanded.matches ? 'expanded' : widths.medium.matches ? 'medium' : 'compact';
    const before = this.decided;
    if (next === before) return;
    this.decided = next;
    mark(this, 'data-window-class', next);
    this.announce = true;
    if (before !== null) {
      // APS-7: only the navigation's coming to stand beside the content ends its presentation over the content; a
      // change between the two narrower classes keeps it open (NVD-54). The drawer ends its own overlay at the same width;
      // the frame's side is told once.
      if (next === 'expanded') this.setOpen(false, true);
      // APS-23: focus on something the new arrangement does not show — the menu button, a destination of the
      // navigation bar — goes to the main region. (Where focus was in the navigation, the drawer has kept it: NVD-54.)
      // A browser takes focus from an element as soon as it is no longer drawn, before or after it tells of the new
      // width: what had focus is what the frame last saw take it, unless a person has moved it since.
      this.rescueFocus();
    }
    if (this.hasUpdated) {
      this.read();
      this.tell();
    }
  }

  /**
   * APS-23, APS-31: focus on something in the frame that is no longer drawn goes to the main region. A browser takes
   * focus from an element as soon as it is no longer drawn: what had focus is then what the frame last saw take it.
   */
  private rescueFocus() {
    const active = deepActive();
    const lost = !active || active === document.body || active === document.documentElement;
    const had = lost ? this.focused : active;
    if (had && this.holds(had) && !drawn(had)) this.main()?.focus({ preventScroll: true });
  }

  private readonly onFocusIn = (event: FocusEvent) => {
    const [target] = event.composedPath();
    this.focused = target instanceof Element ? target : null;
  };

  /** Focus that leaves an element which is still drawn was moved by a person; one that is no longer drawn lost it to the layout. */
  private readonly onFocusOut = (event: FocusEvent) => {
    const [target] = event.composedPath();
    if (target instanceof Element && target === this.focused && drawn(target) && !(event.relatedTarget instanceof Element && this.holds(event.relatedTarget))) this.focused = null;
  };

  /** Whether `element` is in the frame: in its regions, or in a shadow root of something in them. */
  private holds(element: Element): boolean {
    for (let at: Node | null = element; at; at = at.parentNode ?? (at as ShadowRoot).host ?? null) if (at === this) return true;
    return false;
  }

  /** APS-3: `windowclasschange`, once for each class decided. */
  private tell() {
    if (!this.announce || !this.decided) return;
    this.announce = false;
    this.dispatchEvent(new CustomEvent<TanreiAppShellWindowClassChangeDetail>('windowclasschange', { bubbles: true, detail: { windowClass: this.decided } }));
  }

  // ---- the regions ----

  private region(name: string): Element | null {
    return this.querySelector(`:scope > [slot="${name}"]`);
  }

  private main(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > main, :scope > [role="main"]');
  }

  /** APS-4: how the navigation is presented now: beside the content, as its column, or over the content when opened. */
  private get presentation(): 'standard' | 'column' | 'modal' | null {
    if (!this.navigation || !this.decided) return null;
    if (this.decided === 'expanded') return 'standard';
    return this.decided === 'medium' && this.navigation.hasAttribute('collapsible') ? 'column' : 'modal';
  }

  /** Gives `element` an attribute it lacks, and remembers that the frame did. */
  private give(element: Element, name: string, value: string) {
    const names = this.given.get(element) ?? [];
    if (!names.includes(name)) {
      if (element.hasAttribute(name)) return;
      this.given.set(element, [...names, name]);
    }
    mark(element, name, value);
  }

  private takeBack(element: Element, name: string) {
    const names = this.given.get(element);
    if (!names?.includes(name)) return;
    element.removeAttribute(name);
    this.given.set(element, names.filter((given) => given !== name));
  }

  /**
   * Reads the regions the frame holds and writes what follows from them: the landmarks and names their elements lack
   * (APS-21), the main region's tab index (APS-20), what is measured (APS-17), the navigation that is followed
   * (APS-7), and the two choices where the browser cannot query them (APS-6, APS-18). Called when a property, a child
   * or the class changes; it writes only what differs, so it settles.
   */
  private read() {
    if (!this.isConnected) return;
    for (const element of [...this.given.keys()]) {
      if (element.parentNode === this) continue;
      for (const name of this.given.get(element)!) element.removeAttribute(name);
      this.given.delete(element);
    }
    const header = this.region('header');
    const menuSlot = this.region('menu-button');
    const footer = this.region('footer');
    const aside = this.region('aside');
    const navigation = this.region('navigation');
    const bar = this.region('navigation-bar');
    const mains = this.querySelectorAll<HTMLElement>(':scope > main, :scope > [role="main"]');

    // APS-21: the landmark of a region whose element does not give it.
    if (header && header.localName !== 'header') this.give(header, 'role', 'banner');
    // APS-34: the menu-button slot is for a frame without a header; with one, it is not shown.
    if (header && menuSlot) report(this, 'APS-34', 'the menu-button slot is for a frame without a header: put the menu button in the header, marked data-app-shell-menu');
    if (footer && footer.localName !== 'footer') this.give(footer, 'role', 'contentinfo');
    if (aside) {
      // A side sheet is named by its own headline, and is the landmark itself (SSH-22).
      const names = aside.localName === 'tanrei-side-sheet';
      if (!names && aside.localName !== 'aside') this.give(aside, 'role', 'complementary');
      const label = String(this.asideLabel ?? '').trim();
      if (!names && label) this.give(aside, 'aria-label', label);
      else this.takeBack(aside, 'aria-label');
      if (!names && !aside.hasAttribute('aria-label') && !aside.hasAttribute('aria-labelledby')) {
        report(this, 'APS-21', 'the aside has no name: set aside-label, or aria-label on the aside itself');
      }
    }
    // APS-20: the main region takes focus when the skip link is followed, and is no stop of the Tab order.
    for (const main of mains) this.give(main, 'tabindex', '-1');
    if (debugBuild()) {
      // A frame that is still being parsed is read again when it is whole.
      if (document.readyState === 'loading') {
        if (!this.awaitingParse) document.addEventListener('DOMContentLoaded', () => ((this.awaitingParse = false), this.read()), { once: true });
        this.awaitingParse = true;
      } else if (mains.length !== 1) report(this, 'APS-21', mains.length ? `the frame holds ${mains.length} main regions; a page has one` : 'the frame holds no main region: give it one <main> child without a slot attribute');
    }

    // APS-17: what the frame keeps over the top and the bottom of the page is measured.
    // APS-5, APS-10: and the width of a side sheet in the aside, which the navigation leaves it; the window's width is
    // watched again with them (the observer lets go of everything it watched).
    const top = header ?? menuSlot;
    const sheet = aside?.localName === 'tanrei-side-sheet' ? aside : null;
    if (header !== this.header || top !== this.top || bar !== this.bar || footer !== this.footer || sheet !== this.sheet) {
      this.sizes?.disconnect();
      this.header = header;
      this.top = top;
      this.bar = bar;
      this.footer = footer;
      this.sheet = sheet;
      for (const observed of [document.documentElement, top, bar, footer, sheet]) if (observed) this.sizes?.observe(observed);
      if (!top) publish(this, OFFSET, null);
      if (!bar) publish(this, OFFSET_END, null);
      if (!footer) this.style.removeProperty(FOOTER);
      if (!sheet) this.style.removeProperty(ASIDE);
    }

    // APS-4, APS-7: the navigation, and the drawer whose opening and closing the frame follows.
    if (navigation !== this.navigation) {
      this.navigationMutations?.disconnect();
      this.navigation = navigation;
      if (navigation) this.navigationMutations?.observe(navigation, { attributes: true, attributeFilter: ['collapsible', 'filterable', 'filter-shortcut', 'open', 'expanded'] });
      this.listen(navigation?.localName === 'tanrei-navigation-drawer' ? (navigation as Drawer) : null);
    }
    const presentation = this.presentation;
    if (navigation && !this.drawer && presentation && presentation !== 'standard') {
      report(this, 'APS-4', 'the navigation of a narrow window needs a navigation drawer: what the navigation region holds cannot present itself over the content, and is not shown');
    }
    if (this.drawer && this.drawer.responsive === false && this.decided) {
      report(this, 'APS-4', 'the navigation drawer in the navigation region is not responsive: set its responsive attribute, so that the window’s class chooses its presentation as it chooses the frame’s');
    }
    // NVD-19: the drawer learns whether the header holds it below.
    this.drawer?.shellChanged?.();
    this.syncNavigation();
    this.syncInert();
    this.syncChord();
    this.holdWheel([navigation?.localName === 'tanrei-navigation-drawer' ? null : navigation, aside].filter((region): region is Element => !!region));

    // APS-6, APS-18: where the browser answers style queries the stylesheet reads both itself, and nothing is written.
    const queries = styleQueries();
    mark(this, 'data-separation', queries ? null : compChoice(this, '--_aps-separation', SEPARATIONS));
    mark(this, 'data-menu', queries ? null : this.menuShown ? 'shown' : 'hidden');
    this.stateMenu();
  }

  /** APS-5, APS-9: `containedWheel` on exactly these regions. */
  private holdWheel(regions: Element[]) {
    for (const region of this.wheeled) if (!regions.includes(region)) region.removeEventListener('wheel', containedWheel);
    for (const region of regions) if (!this.wheeled.includes(region)) region.addEventListener('wheel', containedWheel, containedWheel);
    this.wheeled = regions;
  }

  // ---- APS-17: the scroll offset ----

  private resized(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      const size = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      // APS-5: the root's content width, not 100vw: a scrollbar that takes room in the window (a classic one, or the
      // gutter scrollbar-gutter keeps) is no room of the row's. The root, never the frame: the root's width does not
      // follow what it holds, where a frame in a box as wide as its content would follow the room it gives and shrink
      // by it in every frame.
      if (entry.target === document.documentElement) this.length(WINDOW, entry.contentRect.width);
      // APS-5: the sheet's width in every frame it slides, so that the navigation leaves it room as it comes.
      else if (entry.target === this.sheet) this.length(ASIDE, entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
      else if (entry.target === this.top) this.measure(size);
      else if (entry.target === this.bar) publish(this, OFFSET_END, this.scrolls !== 'main' && size > 0 ? size : null);
      // APS-11: where the navigation and the aside stop staying in view (a browser keeps a sticky part inside the
      // frame, not inside its row: the stylesheet takes this much off the end of what it may reach).
      else if (entry.target === this.footer) this.length(FOOTER, size);
    }
  }

  /** A measured length on the element, for the stylesheet: written only when it changes. */
  private length(name: string, size: number) {
    const value = `${Math.round(size * 100) / 100}px`;
    if (this.style.getPropertyValue(name) !== value) this.style.setProperty(name, value);
  }

  /**
   * The header's height, while the header is kept over the top of the page (APS-17); in a frame without a header, the
   * menu button's height and the gutter it is kept from the top of the window by, while it is shown (APS-34); nothing
   * otherwise.
   */
  private measure(size: number | undefined = this.top?.getBoundingClientRect().height) {
    const top = this.top;
    if (!top || top === this.header) {
      const kept = this.scrolls !== 'main' && this.headerPosition !== 'static';
      publish(this, OFFSET, kept && size !== undefined && size > 0 ? size : null);
      return;
    }
    const kept = this.scrolls !== 'main' && size !== undefined && size > 0;
    publish(this, OFFSET, kept ? size + (parseFloat(getComputedStyle(top).marginBlockStart) || 0) : null);
  }

  // ---- APS-5: the place being read while a person changes the navigation's width ----

  /** APS-5: the element at the top of what is being read in the main region, and where it stood then. */
  private reading: { element: Element; top: number } | null = null;
  /** APS-5: the drawer whose width is followed, in every frame it changes. */
  private resizing: Element | null = null;
  private readonly navigationSizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.holdReading());

  /**
   * @internal APS-5: the navigation drawer is about to change its width at a person's doing (NVD-98 to NVD-101): the
   * place being read in the main region is noted now, and held there in every frame the width changes while the drawer
   * says a person is changing it (its `data-person-resize`). The main region itself has no motion: the grid gives it
   * the room that is left in the same frame.
   */
  keepReading(drawer: Element) {
    const element = this.readingAt();
    this.reading = element ? { element, top: element.getBoundingClientRect().top } : null;
    if (this.navigationSizes && this.resizing !== drawer) {
      this.navigationSizes.disconnect();
      this.navigationSizes.observe(drawer);
      this.resizing = drawer;
    }
  }

  /** APS-5: the main content scrolled by as much as the place being read moved, so that it stands where it stood. */
  private holdReading() {
    const kept = this.reading;
    if (!kept || !kept.element.isConnected || !this.resizing?.hasAttribute('data-person-resize')) return;
    const moved = kept.element.getBoundingClientRect().top - kept.top;
    if (Math.abs(moved) < 0.5) return;
    const main = this.main();
    if (this.scrolls === 'main' && main) main.scrollTop += moved;
    else window.scrollBy(0, moved);
  }

  /**
   * APS-5: what is being read — the first element of the main region that begins at or below the top of what is seen
   * (below what the frame keeps over the page), or, where one runs across that line, the first of its own that does.
   */
  private readingAt(): Element | null {
    const main = this.main();
    if (!main) return null;
    const kept = this.scrolls === 'main' ? 0 : Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(OFFSET)) || 0;
    const line = Math.max(main.getBoundingClientRect().top, kept);
    let found: Element | null = null;
    for (let at: Element = main, depth = 0; depth < 8; depth++) {
      const next = [...at.children].find((child) => {
        const box = child.getBoundingClientRect();
        return box.height > 0 && box.bottom > line;
      });
      if (!next) break;
      found = next;
      if (next.getBoundingClientRect().top >= line || !next.firstElementChild) break;
      at = next;
    }
    return found;
  }

  // ---- APS-6, APS-7: the menu button and the navigation ----

  /**
   * APS-6: whether the menu button is shown: in every class while the navigation region holds a navigation drawer and
   * `menuButtonPlacement` is not `drawer`; otherwise only while the navigation has no place in the layout. APS-34: a
   * frame without a header shows its menu-button slot's button as `drawer` does.
   */
  private get menuShown(): boolean {
    if (this.header && this.drawer && this.menuButtonPlacement !== 'drawer') return true;
    return this.presentation === 'modal';
  }

  /** APS-4, APS-7: whether the navigation is open over the content: a drawer open in the column or the modal presentation. */
  private get over(): boolean {
    const presentation = this.presentation;
    return !!this.drawer?.open && (presentation === 'column' || presentation === 'modal');
  }

  /** APS-33, NVD-53: the drawer stands beside the content with no collapsed form and is hidden (its expanded false). */
  private get hiddenBeside(): boolean {
    const drawer = this.drawer;
    return this.presentation === 'standard' && !!drawer && !drawer.collapsible && drawer.expanded === false;
  }

  /**
   * APS-7, APS-22, APS-32: while the navigation is open over the content below the header, every region but the
   * announcement and the header is inert — the skip link, the main region, the aside, the footer, the navigation bar —
   * and the page does not scroll under the scrim (MDL-2); both stop as closing begins. A frame without a header leaves
   * this to the drawer, which is then a modal dialog over the whole window (NVD-19).
   */
  private syncInert(over = this.isConnected && !!this.header && this.over) {
    const regions = over ? ([...this.querySelectorAll<HTMLElement>(':scope > [slot="skip-link"], :scope > main, :scope > [role="main"], :scope > [slot="aside"], :scope > [slot="footer"], :scope > [slot="navigation-bar"]')] as HTMLElement[]) : [];
    for (const region of [...this.inerted]) {
      if (regions.includes(region)) continue;
      region.inert = false;
      this.inerted.delete(region);
    }
    for (const region of regions) {
      if (region.inert) continue;
      region.inert = true;
      this.inerted.add(region);
    }
    // The page's scroll is the frame's to hold; the code that holds it, as a modal layer does, is the drawer's module's:
    // only a drawer is ever open over the content, and a frame imported alone does not carry it twice.
    if (over && !this.scrollHeld) {
      this.scrollHeld = this.drawer;
      this.scrollHeld?.holdShellScroll?.(this, true);
    } else if (!over && this.scrollHeld) {
      this.scrollHeld.holdShellScroll?.(this, false);
      this.scrollHeld = null;
    }
  }

  /** APS-7: a drawer that opened or closed over the content by itself (its column's menu button, the product) is followed, and told once. */
  private pullOpen() {
    const drawer = this.drawer;
    const presentation = this.presentation;
    if (!drawer || (presentation !== 'column' && presentation !== 'modal')) return;
    if (drawer.open !== this.navigationOpen) this.setOpen(drawer.open, true);
    this.syncInert();
  }

  /** APS-6, APS-34: the menu button — the header's marked one, or the menu-button slot's in a frame without a header. */
  private get menu(): HTMLElement | null {
    if (this.header) return this.header.querySelector<HTMLElement>(MENU);
    return this.querySelector<HTMLElement>(':scope > [slot="menu-button"]');
  }

  /** The drawer whose `close` and `expandedchange` the frame follows: one at a time. */
  private listen(drawer: Drawer | null) {
    if (drawer === this.drawer) return;
    this.drawer?.removeEventListener('close', this.onDrawerClose);
    this.drawer?.removeEventListener('expandedchange', this.onDrawerForm);
    this.drawer = drawer;
    drawer?.addEventListener('close', this.onDrawerClose);
    drawer?.addEventListener('expandedchange', this.onDrawerForm);
  }

  /**
   * APS-7: the menu button asks the drawer for what its own menu button asks (NVD-37) — its other form where it stands
   * beside the content, opening where it is a column or not shown, closing where it is open — and the frame follows.
   * What the navigation region holds when it is not a drawer is opened over the content where it has no place.
   */
  private activateMenu(button: HTMLElement | null, pointer: boolean) {
    const drawer = this.drawer;
    if (drawer && this.presentation && drawer.menuFromShell) {
      drawer.menuFromShell(button, pointer);
      this.pullOpen();
      this.stateMenu();
      this.syncChord();
      return;
    }
    this.setOpen(true, true);
    this.syncNavigation();
  }

  /** NVD-20: Escape on the menu button closes the navigation open over the content (Escape in the drawer is the drawer's). */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !this.over) return;
    const menu = this.menu;
    if (!menu || !event.composedPath().includes(menu)) return;
    event.preventDefault();
    this.activateMenu(menu, false);
  };

  /** APS-7: the menu button, activated. */
  private readonly onClick = (event: MouseEvent) => {
    const path = event.composedPath();
    // APS-20: the skip link moves focus to the main region itself.
    const skip = path.find((node) => node instanceof Element && node.parentNode === this && node.getAttribute('slot') === 'skip-link') as Element | undefined;
    if (skip) {
      // A plain activation only: a press that opens the link elsewhere is the browser's.
      if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && this.skip(skip)) event.preventDefault();
      return;
    }
    const menu = this.menu;
    if (!menu || !path.includes(menu) || !this.menuShown) return;
    this.activateMenu(menu, event.detail > 0);
  };

  /** APS-7: the open navigation closed — by its scrim, Escape, a destination, a drag or the platform's back (NVD-20, NVD-21). */
  private readonly onDrawerClose = () => {
    const menu = this.menu;
    const told = this.setOpen(false, true);
    // APS-7: what the frame made inert stops being inert as closing begins — before the drawer gives focus back
    // (NVD-22), which it does after this event.
    this.syncInert();
    this.stateMenu();
    this.syncChord();
    // Ended by the navigation's coming to stand beside the content, focus stays where it is (NVD-54).
    if (!told || !menu || this.presentation === 'standard') return;
    // The drawer gives focus back to where it was (NVD-22); a press that gave the button no focus (Safari does not
    // focus a button that is clicked) left it nowhere, and the menu button is where it belongs.
    void (this.drawer?.updateComplete ?? Promise.resolve()).then(() => {
      const active = document.activeElement;
      if (this.menuShown && (!active || active === document.body || active === this.drawer)) menu.focus();
    });
  };

  /** APS-4, APS-7: the drawer's own menu button (or the frame's) changed its form, or widened its column over the content (NVD-37). */
  private readonly onDrawerForm = () => {
    this.pullOpen();
    this.stateMenu();
    this.syncChord();
  };

  /** Makes `navigationOpen` `open`, and tells it once where the value changed. */
  private setOpen(open: boolean, tell: boolean): boolean {
    if (this.navigationOpen === open) return false;
    this.navigationOpen = open;
    if (tell) this.dispatchEvent(new CustomEvent<TanreiAppShellNavigationOpenChangeDetail>('navigationopenchange', { bubbles: true, detail: { navigationOpen: open } }));
    return true;
  }

  /** APS-7: the drawer is open while `navigationOpen` is, where it is presented over the content; a drawer beside it is left alone. */
  private syncNavigation() {
    const drawer = this.drawer;
    const presentation = this.presentation;
    if (!drawer || !presentation || presentation === 'standard') return;
    if (drawer.open !== this.navigationOpen) drawer.open = this.navigationOpen;
  }

  /**
   * APS-7: the menu button says whether the navigation it controls is shown — open over the content, or expanded where it
   * stands beside the content — on the button it draws.
   */
  private stateMenu() {
    const menu = this.menuShown ? this.menu : null;
    // A Tanrei Button draws its button in its shadow root, which is what is focused and read; a native one is itself.
    const custom = !!menu && menu.localName.includes('-');
    const target = menu ? (custom ? (menu.shadowRoot?.querySelector<HTMLElement>('button, [role="button"]') ?? null) : menu) : null;
    const was = this.menuStated;
    if (was && was !== target) {
      was.removeAttribute('aria-expanded');
      was.removeAttribute('aria-controls');
      if ('ariaControlsElements' in was) (was as unknown as { ariaControlsElements: Element[] | null }).ariaControlsElements = null;
    }
    this.menuStated = target;
    if (menu && !target && this.menuAwaited !== menu) {
      // A button that has not drawn itself yet is stated when it has.
      this.menuAwaited = menu;
      void customElements
        .whenDefined(menu.localName)
        .then(() => (menu as { updateComplete?: Promise<unknown> }).updateComplete)
        .then(() => this.isConnected && this.read());
    }
    if (!target) return;
    const drawer = this.drawer;
    const expanded = this.presentation === 'standard' && drawer ? drawer.expanded !== false : this.navigationOpen;
    mark(target, 'aria-expanded', String(expanded));
    const controlled = this.navigation;
    if (!controlled) return;
    if (target.getRootNode() === controlled.getRootNode()) {
      if (!controlled.id) controlled.id = `tanrei-app-shell-navigation-${++ids}`;
      mark(target, 'aria-controls', controlled.id);
    } else if ('ariaControlsElements' in target) {
      // An id of the page cannot be named from inside the button's shadow root; the element itself can.
      (target as unknown as { ariaControlsElements: Element[] | null }).ariaControlsElements = [controlled];
    }
  }

  // ---- APS-33: a filterable drawer's chord, while the navigation is closed over the content ----

  /** APS-33: the chord the frame listens for now — the drawer's, while it is not shown (modal and closed, or hidden beside the content) — or null. */
  private chord: Binding | null = null;

  /**
   * APS-33: the frame answers a filterable drawer's chord only while the drawer is not shown — its presentation modal and
   * the navigation closed, or standard with the drawer hidden (no collapsed form, expanded false) — and listens for
   * nothing then (NVD-87). Where the drawer is shown it answers it itself. No other key is bound.
   */
  private get chordIsFrames(): boolean {
    return (this.presentation === 'modal' && !this.navigationOpen) || this.hiddenBeside;
  }

  private syncChord() {
    const drawer = this.drawer;
    const chords = this.isConnected && drawer?.filterable ? chordsOf(drawer.filterShortcut) : [];
    const next = this.chordIsFrames && chords.length === 1 ? readBinding(chords[0]) : null;
    if ((next?.id ?? null) === (this.chord?.id ?? null)) return;
    if (this.chord) window.removeEventListener('keydown', this.onWindowKeyDown);
    this.chord = next;
    if (next) window.addEventListener('keydown', this.onWindowKeyDown);
  }

  /**
   * APS-33: the chord opens the navigation as the menu button does (APS-7: navigationopenchange with true; a drawer
   * hidden beside the content is shown, its expanded true) and asks the drawer to focus its filter (NVD-88), so that
   * focus lands in its field once it is open. Left alone, as the drawer
   * leaves it (SRC-38): a press something else has taken, a key repeating while held, an input-method composition,
   * and a chord without mod, ctrl or alt while focus is in an element that takes text.
   */
  private readonly onWindowKeyDown = (event: KeyboardEvent) => {
    const chord = this.chord;
    const drawer = this.drawer;
    if (!chord || !drawer?.filterable || event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229) return;
    if (!chordPressed(event, chord, ambientConvention(this) ?? platformConvention())) return;
    if (!chord.mod && !chord.ctrl && !chord.alt && takesText(deepActive())) return;
    if (!this.chordIsFrames) return;
    event.preventDefault();
    const beside = this.hiddenBeside;
    this.activateMenu(null, false);
    // A drawer shown beside the content is drawn before its field can take focus; a closed one is owed it (NVD-88).
    if (beside) void (drawer.updateComplete ?? Promise.resolve()).then(() => drawer.focusFilter?.());
    else drawer.focusFilter?.();
  };

  // ---- APS-20: the skip link ----

  /**
   * APS-20: focus goes to the region the link names — the main region — and its top comes into view below the header,
   * at once, whatever the page says of how it scrolls. The link's own navigation is then not needed, and is not left to
   * follow: a browser that is given the focus here and then follows the fragment starts its next Tab after the first
   * link of the region (Firefox). Without this script the anchor does the same by itself. Returns whether it did.
   */
  private skip(link: Element): boolean {
    const href = link.getAttribute('href') ?? '';
    let target: HTMLElement | null = null;
    if (href.startsWith('#') && href.length > 1) {
      try {
        target = (this.getRootNode() as Root).getElementById(decodeURIComponent(href.slice(1)));
      } catch {
        target = null;
      }
    }
    target ??= this.main();
    if (!target) return false;
    if (!target.hasAttribute('tabindex') && target.tabIndex < 0) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    // While the main region is the scrolling view (APS-15) its top is its own scroll position.
    if (this.scrolls === 'main' && target.parentNode === this) target.scrollTo({ top: 0, behavior: 'instant' });
    else target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
    return document.activeElement === target || target.contains(document.activeElement);
  }

  // ---- changes ----

  protected override willUpdate() {
    // The stylesheet may have arrived since the element was connected (a page that loads it late).
    if (!this.widths) this.watch();
  }

  protected override updated(changed: PropertyValues) {
    // APS-29: a value the frame does not define renders with the default (no rule matches it); a debug build says so.
    const known: [string, readonly string[], string][] = [
      ['scrolls', SCROLLS, 'page'],
      ['headerPosition', HEADER_POSITIONS, 'sticky'],
      ['mainWidth', MAIN_WIDTHS, 'contained'],
      ['asideOrder', ASIDE_ORDERS, 'after'],
    ];
    for (const [name, values, fallback] of known) {
      const value = String((this as unknown as Record<string, unknown>)[name]);
      if (changed.has(name) && !values.includes(value)) report(this, 'APS-29', `${name === 'scrolls' ? 'scroll' : name} "${value}" is not a value the app shell defines; it is rendered as "${fallback}"`);
    }
    // APS-18: a separation the frame does not define is auto.
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'APS-18', `separation "${this.separation}" is not a value the app shell defines; it is drawn as "auto"`);
    }
    this.read();
    if (changed.has('scrolls') || changed.has('headerPosition')) this.measure();
    // APS-31: a footer hidden while focus was in it gives focus to the main region.
    if (changed.has('footerHidden') && this.footerHidden) this.rescueFocus();
    this.tell();
  }
}

if (!customElements.get('tanrei-app-shell')) customElements.define('tanrei-app-shell', TanreiAppShell);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-app-shell': TanreiAppShell;
  }
}
