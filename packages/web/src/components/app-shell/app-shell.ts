import type { PropertyDeclarations, PropertyValues } from 'lit';
import { AvailabilityController, SEPARATIONS, SEPARATION_VALUES, type SeparationProp, compChoice, deepActive, report, styleQueries } from '../../primitives/index.js';
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

type Root = Document | ShadowRoot;
/** A navigation drawer in the navigation region, as much of it as the frame uses. */
type Drawer = HTMLElement & { open: boolean; responsive?: boolean; collapsible?: boolean; presentation?: string | null; updateComplete?: Promise<unknown> };

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
 * - **the menu button** — the one icon-only `<tanrei-button data-app-shell-menu>` in the header — which it answers
 *   while the navigation has no place in the layout: `navigationOpen` and the `open` of a
 *   `<tanrei-navigation-drawer>` in the navigation region become true, the drawer's `close` makes them false again,
 *   and the button says `aria-expanded` and what it controls;
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
 * @slot navigation - The navigation: a `<tanrei-navigation-drawer responsive>`. Anything else is placed beside the content in an expanded window and is not shown in a narrower one.
 * @slot aside - The aside: an `<aside>` with the product's supporting content, or a side sheet.
 * @slot footer - The footer: a `<footer>` with the product's own layout.
 * @slot navigation-bar - A navigation bar for the bottom edge of a compact window.
 * @fires {CustomEvent<TanreiAppShellWindowClassChangeDetail>} windowclasschange - The frame decided the window's class for the first time, or the window's width changed it: `detail.windowClass` (and `windowClass`) is `compact`, `medium` or `expanded`.
 * @fires {CustomEvent<TanreiAppShellNavigationOpenChangeDetail>} navigationopenchange - The navigation asks to be presented over the content, or to be put away: the menu button was activated (`detail.navigationOpen` true), or the open navigation closed or the window's class changed (false). `navigationOpen` already holds it.
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

  /** Whether the navigation is presented over the content, while it has no place of its own in the layout (or only its column). The menu button makes it true; closing the navigation, and any change of the window's class, makes it false. */
  navigationOpen = false;

  /** Names the aside for assistive technology where its element has no name of its own. */
  asideLabel = '';

  /** APS-2: the two widths the stylesheet was written with, as media queries, and what stops listening. */
  private widths: { medium: MediaQueryList; expanded: MediaQueryList; text: string } | null = null;
  private decided: TanreiWindowClass | null = null;
  /** APS-3: a `windowclasschange` owed once the class it names is drawn. */
  private announce = false;
  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.read());
  /** The navigation's `collapsible` decides its presentation in a medium window (APS-4). */
  private readonly navigationMutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.read());
  private readonly sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => this.resized(entries));
  /** The regions read last. */
  private header: Element | null = null;
  private bar: Element | null = null;
  private footer: Element | null = null;
  /** APS-23: what last took focus in the frame, until focus goes elsewhere by a person's doing. */
  private focused: Element | null = null;
  private drawer: Drawer | null = null;
  private navigation: Element | null = null;
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
    this.addEventListener('click', this.onClick);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.mutations?.disconnect();
    this.navigationMutations?.disconnect();
    this.sizes?.disconnect();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('focusout', this.onFocusOut);
    this.focused = null;
    this.style.removeProperty(FOOTER);
    this.unwatch();
    this.listen(null);
    this.header = this.bar = this.footer = this.navigation = null;
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
      // APS-7: a responsive drawer takes its own overlay down at the same width (NVD-54); the frame's side is told once.
      this.setOpen(false, true);
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
    const footer = this.region('footer');
    const aside = this.region('aside');
    const navigation = this.region('navigation');
    const bar = this.region('navigation-bar');
    const mains = this.querySelectorAll<HTMLElement>(':scope > main, :scope > [role="main"]');

    // APS-21: the landmark of a region whose element does not give it.
    if (header && header.localName !== 'header') this.give(header, 'role', 'banner');
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
    if (header !== this.header || bar !== this.bar || footer !== this.footer) {
      this.sizes?.disconnect();
      this.header = header;
      this.bar = bar;
      this.footer = footer;
      for (const observed of [header, bar, footer]) if (observed) this.sizes?.observe(observed);
      if (!header) publish(this, OFFSET, null);
      if (!bar) publish(this, OFFSET_END, null);
      if (!footer) this.style.removeProperty(FOOTER);
    }

    // APS-4, APS-7: the navigation, and the drawer whose opening and closing the frame follows.
    if (navigation !== this.navigation) {
      this.navigationMutations?.disconnect();
      this.navigation = navigation;
      if (navigation) this.navigationMutations?.observe(navigation, { attributes: true, attributeFilter: ['collapsible'] });
      this.listen(navigation?.localName === 'tanrei-navigation-drawer' ? (navigation as Drawer) : null);
    }
    const presentation = this.presentation;
    if (navigation && !this.drawer && presentation && presentation !== 'standard') {
      report(this, 'APS-4', 'the navigation of a narrow window needs a navigation drawer: what the navigation region holds cannot present itself over the content, and is not shown');
    }
    if (this.drawer && this.drawer.responsive === false && this.decided) {
      report(this, 'APS-4', 'the navigation drawer in the navigation region is not responsive: set its responsive attribute, so that the window’s class chooses its presentation as it chooses the frame’s');
    }
    this.syncNavigation();

    // APS-6, APS-18: where the browser answers style queries the stylesheet reads both itself, and nothing is written.
    const queries = styleQueries();
    mark(this, 'data-separation', queries ? null : compChoice(this, '--_aps-separation', SEPARATIONS));
    mark(this, 'data-menu', queries ? null : this.menuShown ? 'shown' : 'hidden');
    this.stateMenu();
  }

  // ---- APS-17: the scroll offset ----

  private resized(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      const size = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      if (entry.target === this.header) this.measure(size);
      else if (entry.target === this.bar) publish(this, OFFSET_END, this.scrolls !== 'main' && size > 0 ? size : null);
      else if (entry.target === this.footer) {
        // APS-11: where the navigation and the aside stop staying in view (a browser keeps a sticky part inside the
        // frame, not inside its row: the stylesheet takes this much off the end of what it may reach).
        const value = `${Math.round(size * 100) / 100}px`;
        if (this.style.getPropertyValue(FOOTER) !== value) this.style.setProperty(FOOTER, value);
      }
    }
  }

  /** The header's height, while the header is kept over the top of the page; nothing otherwise (APS-17). */
  private measure(size: number | undefined = this.header?.getBoundingClientRect().height) {
    const kept = this.scrolls !== 'main' && this.headerPosition !== 'static';
    publish(this, OFFSET, kept && size !== undefined && size > 0 ? size : null);
  }

  // ---- APS-6, APS-7: the menu button and the navigation ----

  /** APS-6: whether the menu button is shown: only while the navigation has no place in the layout. */
  private get menuShown(): boolean {
    return this.presentation === 'modal';
  }

  private get menu(): HTMLElement | null {
    return this.header?.querySelector<HTMLElement>(MENU) ?? null;
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

  /** APS-7: the menu button opens the navigation over the content. */
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
    this.setOpen(true, true);
    this.syncNavigation();
  };

  /** APS-7: the open navigation closed — by its scrim, Escape, a destination, a drag or the platform's back (NVD-20, NVD-21). */
  private readonly onDrawerClose = () => {
    const menu = this.menu;
    const told = this.setOpen(false, true);
    if (!told || !menu) return;
    // The drawer gives focus back to where it was (NVD-22); a press that gave the button no focus (Safari does not
    // focus a button that is clicked) left it nowhere, and the menu button is where it belongs.
    void (this.drawer?.updateComplete ?? Promise.resolve()).then(() => {
      const active = document.activeElement;
      if (this.menuShown && (!active || active === document.body || active === this.drawer)) menu.focus();
    });
  };

  /** APS-4: the column's own menu button widened it over the content, or narrowed it again (NVD-37). */
  private readonly onDrawerForm = () => {
    const drawer = this.drawer;
    if (!drawer || this.presentation !== 'column') return;
    this.setOpen(!!drawer.open, true);
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

  /** APS-7: the menu button says whether the navigation it controls is open, on the button it draws. */
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
    mark(target, 'aria-expanded', String(this.navigationOpen));
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
