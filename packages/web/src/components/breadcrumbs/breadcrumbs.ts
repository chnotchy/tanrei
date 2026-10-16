import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import {
  AvailabilityController,
  DIRECTION_PROBE,
  DirectionController,
  GlyphDrawnController,
  GlyphMirrorController,
  PressController,
  SystemWatchController,
  glyphMirrors,
  report,
  styleQueries,
  syncFocusStyle,
} from '../../primitives/index.js';
import { LINK_KEYS, readDestination } from '../../primitives/link.js';
import { debugBuild } from '../../primitives/report.js';
import { WordsController } from '../../primitives/words.js';
import { MIRRORED } from '../../styles/icons.js';
// BRC-11: the levels taken out of the trail are listed in a menu, which the breadcrumbs define wherever they are imported.
import '../menu/menu.js';
import type { TanreiMenuCloseDetail } from '../menu/menu.js';
import { styles } from './breadcrumbs.styles.js';
import { adoptUnlessDrawn } from '../../primitives/sheets.js';

/** What a trail longer than its width does (BRC-9, BRC-15): fold its middle behind the overflow button, or run over several lines. */
export type TanreiBreadcrumbsOverflow = 'collapse' | 'wrap';

// The text of src/styles/breadcrumbs.css — the stylesheet that draws the product's levels — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. Read once; a build that wrote
// nothing leaves it empty, and the levels are then drawn by the page's own copy of `@tanrei/web/breadcrumbs.css`.
declare const TANREI_BREADCRUMBS_CSS: string;
const LEVELS_CSS: string = (() => {
  try {
    return TANREI_BREADCRUMBS_CSS;
  } catch {
    return '';
  }
})();

/** When the levels that are links are underlined (BRC-30): `auto` takes `comp.breadcrumbs.underline.visibility`. */
export type TanreiBreadcrumbsUnderline = 'auto' | 'always' | 'hover' | 'never';

const OVERFLOWS: readonly string[] = ['collapse', 'wrap'];
const UNDERLINES: readonly string[] = ['auto', 'always', 'hover', 'never'];
/** BRC-30: the trail's own choice of when a link is underlined, as the choice's name; and the mark of it for a browser without style queries. */
const UNDERLINE = '--tanrei-comp-breadcrumbs-underline-visibility';
const UNDERLINE_MARK = 'data-tanrei-underline';
/** The glyphs the trail draws itself, by their names in the system's icon set (BRC-6, BRC-10). */
const SEPARATOR = 'chevron_right';
const MORE = 'more_horiz';
/** What the element writes on the product's elements (see breadcrumbs.css). */
const DIRECTED = 'dir';
/** What the observer re-reads a level for: everything the product says about it. */
const ATTRIBUTES = ['href', 'aria-current', 'data-icon', 'data-icon-only', 'data-mirror'];
/** A character with a direction of its own: a letter of any script (digits, signs and spaces have none). */
const STRONG = /\p{L}/u;
/** Boxes are laid out on fractions of a pixel: a trail that is this much wider than its room still fits. */
const SLACK = 0.05;

type Root = Document | ShadowRoot;

/** One level: the product's own child, and what it says. */
interface Level {
  element: HTMLElement;
  label: string;
  /** The `href` attribute as it was written, where it is a destination (BRC-2); null for a level that is text (BRC-3). */
  href: string | null;
  current: boolean;
  icon: string;
}

let sheet: CSSStyleSheet | null | undefined;
/** The levels' stylesheet, made once and shared by every root that needs it. */
function levelsSheet(): CSSStyleSheet | null {
  if (sheet !== undefined) return sheet;
  if (typeof CSSStyleSheet === 'undefined') return (sheet = null);
  sheet = new CSSStyleSheet();
  try {
    sheet.replaceSync(LEVELS_CSS);
  } catch {
    // A browser that cannot construct it: the page's own copy of breadcrumbs.css draws the levels.
  }
  return sheet;
}

/** Writes an attribute only when it differs: what is written here must settle. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

const flagged = (element: Element, name: string) => element.hasAttribute(name) && element.getAttribute(name) !== 'false';
const width = (element: Element | null | undefined) => element?.getBoundingClientRect().width ?? 0;

/**
 * BRC-9: the levels that are out of a trail of `count` levels when `out` of them are — first those between the first
 * and the last, beginning next to the first; then the first. The last is never among them.
 */
function takenOut(count: number, out: number): Set<number> {
  const order = [...Array.from({ length: Math.max(0, count - 2) }, (_, index) => index + 1), ...(count > 1 ? [0] : [])];
  return new Set(order.slice(0, out));
}

/**
 * Shows where a page sits in a hierarchy of pages and leads back up it: the levels above as links, in order from the
 * top, with the page itself last.
 *
 * Contract: specs/breadcrumbs.spec.json. The levels are the product's own children, which stay in the document
 * (BRC-2, BRC-13): an `<a href>` for a level with a destination, a `<span>` for one without — the current page, or a
 * level that has no page. Before the element is defined, and with scripting off, the page holds the whole trail as
 * links that work.
 *
 * ```html
 * <tanrei-breadcrumbs label="Breadcrumbs" overflow-label="Show hidden levels">
 *   <a href="/" data-icon="home">Home</a>
 *   <a href="/components/">Components</a>
 *   <span aria-current="page">Button</span>
 * </tanrei-breadcrumbs>
 * ```
 *
 * A level's label is its text. `aria-current="page"` on the last level marks the current page; `data-icon` names a
 * glyph of the system's icon set, drawn before the label; `data-icon-only` draws the glyph alone and keeps the text
 * as the level's name; `data-mirror="always"` or `"never"` is the product's word on mirroring that glyph in a
 * right-to-left layout. `underline` says when the links are underlined (BRC-30); a row of the overflow menu is a menu
 * item and never is. A level's `click` is the anchor's own: cancel it and the browser follows nothing (BRC-22).
 *
 * Everything drawn on a level is `@tanrei/web/breadcrumbs.css` (every value a `--tanrei-comp-breadcrumbs-*` token),
 * which draws the trail before and without this script; the element adds the same sheet to the root it is connected
 * to. The shadow root holds only what the product did not write: a `<nav>` named by `label`, the ordered list with
 * one item for each level, the separators, and the overflow button with its menu.
 *
 * `overflow="collapse"` (the default) keeps the trail on one line: when it is wider than the width it is given, its
 * middle levels go behind the overflow button, beginning next to the first, as many as the width asks for; then the
 * first; and the last label is cut only when the button and it alone do not fit. The button opens a menu of the
 * levels taken out; choosing one is a click on that level's own anchor. The trail is measured when its width, a
 * label, the text size or the direction changes; at rest it runs nothing. `overflow="wrap"` keeps every level and
 * lets the trail run over as many lines as it needs.
 *
 * @tag tanrei-breadcrumbs
 * @slot - The levels, from the top of the hierarchy to the page: `<a href>` and `<span>` children. They stay in the document.
 * @csspart nav - The navigation landmark.
 * @csspart list - The ordered list of the levels.
 * @csspart separator - A separator between two entries (hidden from assistive technology).
 * @csspart overflow-button - The button that stands for the levels taken out of the trail and opens their menu.
 * @csspart overflow-icon - The overflow button's glyph.
 */
export class TanreiBreadcrumbs extends LitElement {
  static override styles = styles;

  // Each level stands in a list item of its own, so the element assigns each child to that item's slot (BRC-1).
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    // The default is not reflected: a trail that is defined is the one that was written.
    overflow: { type: String, reflect: true, useDefault: true },
    overflowLabel: { type: String, attribute: 'overflow-label' },
    underline: { type: String, reflect: true, useDefault: true },
    out: { state: true },
    cut: { state: true },
    menuOpen: { state: true },
  };

  /** The accessible name of the navigation landmark ("Breadcrumbs"), in the product's language. Required: it tells this landmark from the page's other navigation. */
  label = '';

  /** What a trail longer than its width does: `collapse` keeps it on one line and puts its middle levels behind the overflow button; `wrap` keeps every level and runs over as many lines as it needs. */
  overflow: TanreiBreadcrumbsOverflow = 'collapse';

  /** The accessible name of the overflow button ("Show hidden levels"), in the product's language. Required while `overflow` is `collapse`. */
  overflowLabel = '';

  /** When the levels that are links are underlined: `always` at rest and in every state; `hover` while a level is hovered, focused from the keyboard or pressed; `never` in no state. `auto` takes `comp.breadcrumbs.underline.visibility`, the design system's answer (always in the default system). Forced colors draw the line whatever is chosen. */
  underline: TanreiBreadcrumbsUnderline = 'auto';

  /** BRC-9: how many levels are out of the trail. */
  private out = 0;
  /** BRC-14: the last level's label is cut. */
  private cut = false;
  private menuOpen = false;

  private readonly availability = new AvailabilityController(this, 'breadcrumbs');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  /** BRC-12: a design system switched on the page's root changes the text style and the gaps the trail is measured with. */
  private readonly system = new SystemWatchController(this);
  /** BRC-12, BRC-26: the direction it inherits changed. */
  private readonly direction = new DirectionController(this, () => this.decide());
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.separator, .more-glyph') ?? []);
  /** BRC-27: chevron_right is drawn mirrored where the icon set marks its name; more_horiz where it marks that one. */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.separator, .more-glyph' });
  private readonly morePress = new PressController(this, {
    container: () => this.more,
    holdCarrier: () => this.renderRoot?.querySelector('.more-glyph .ink') ?? null,
    disabled: () => false,
  });

  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.mutated(records));
  /**
   * BRC-12: the width the layout gives, and a line of the trail's text — one observer for every trail of the page, so
   * that the trails that change size in one frame (all of them, when a page is first laid out) are measured together.
   */
  private static readonly owners = new WeakMap<Element, TanreiBreadcrumbs>();
  private static readonly sizes =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          const trails = new Set(entries.map((entry) => TanreiBreadcrumbs.owners.get(entry.target)).filter((trail): trail is TanreiBreadcrumbs => !!trail));
          TanreiBreadcrumbs.decideTogether([...trails], true);
        });
  /** The trails drawn in this turn, which are measured together after it (`updated`). */
  private static readonly due = new Set<TanreiBreadcrumbs>();
  private watched: Element | null = null;
  private keeping = 0;
  private levels: Level[] = [];
  private levelsStale = true;
  /** The level this element gave its text's direction (BRC-28). */
  private directed: Element | null = null;
  private readonly presses = new WeakMap<HTMLElement, PressController>();
  private readonly pressControllers = new Set<PressController>();
  private heldPress: PressController | null = null;
  private heldAnchor: HTMLElement | null = null;

  private get more(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.overflow') ?? null;
  }

  /** BRC-29: an overflow it does not have is collapse. */
  private get wraps(): boolean {
    return this.overflow === 'wrap';
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptUnlessDrawn(this, levelsSheet(), '--_brc-start');
    for (const [type, listener] of this.pressListeners) this.addEventListener(type, listener, true);
    this.mutations?.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
    this.watch(this, true);
    document.fonts?.addEventListener('loadingdone', this.onFaces);
    this.levelsStale = true;
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    for (const [type, listener] of this.pressListeners) this.removeEventListener(type, listener, true);
    this.mutations?.disconnect();
    this.watch(this, false);
    if (this.watched) this.watch(this.watched, false);
    this.watched = null;
    TanreiBreadcrumbs.due.delete(this);
    cancelAnimationFrame(this.keeping);
    this.keeping = 0;
    document.fonts?.removeEventListener('loadingdone', this.onFaces);
    for (const press of this.pressControllers) press.hostDisconnected();
    this.heldPress = null;
    this.heldAnchor = null;
    this.menuOpen = false;
  }

  // ── The levels ────────────────────────────────────────────────────────────────────────────────────────────────────

  /** What the observer saw. The ripple's layer is this package's own: its coming and going is not a change of the levels. */
  private mutated(records: MutationRecord[]) {
    const ripple = (node: Node) => node instanceof Element && node.classList.contains('ripple');
    if (records.every((record) => record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(ripple))) return;
    this.levelsStale = true;
    this.requestUpdate();
  }

  /** A face arrived: the labels may be wider or narrower than they were measured. */
  private readonly onFaces = () => this.decide();

  /**
   * Reads the product's children: every `<a>` and `<span>` is a level. An address that is no destination is taken off
   * its anchor, which is then text (BRC-3) — as the Link does (LNK-21), so that it is no link to the browser either.
   */
  private readLevels() {
    this.levelsStale = false;
    const levels: Level[] = [];
    for (const element of this.children) {
      if (!(element instanceof HTMLElement) || (element.localName !== 'a' && element.localName !== 'span')) {
        report(this, 'BRC-1', `a <${element.localName}> child is not a level and is not drawn: a level is an <a href> or a <span>`);
        continue;
      }
      const given = element.localName === 'a' ? element.getAttribute('href') : null;
      let href: string | null = null;
      if (given !== null) {
        const read = readDestination(given);
        href = read.href;
        if (href === null) {
          element.removeAttribute('href');
          report(
            this,
            'BRC-3',
            read.refusal === 'script'
              ? 'a level’s href names a script to run, not a place to go; it is taken off and the level is drawn as text'
              : read.refusal === 'unreadable'
                ? `a level’s href "${given}" cannot be read as an address; it is taken off and the level is drawn as text`
                : 'a level’s href is empty; it is taken off and the level is drawn as text',
          );
        }
      }
      levels.push({
        element,
        label: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        href,
        current: flagged(element, 'aria-current'),
        icon: (element.getAttribute('data-icon') ?? '').trim(),
      });
    }
    this.levels = levels;
    if (debugBuild()) this.check();
  }

  /** What a debug build says about a trail it still draws (BRC-1, BRC-4, BRC-7, BRC-10, BRC-29). */
  private check() {
    // A trail that is still being parsed is read again when it is whole.
    if (document.readyState === 'loading' || !this.levels.length) return;
    if (!this.label.trim()) report(this, 'BRC-1', 'label is empty: the navigation landmark has no accessible name; give it the words ("Breadcrumbs")');
    this.levels.forEach((level, index) => {
      if (level.current && index < this.levels.length - 1) report(this, 'BRC-4', `the level "${level.label}" is marked as the current page and is not the last; it is drawn as if it were not current`);
      if (!level.label) report(this, 'BRC-7', 'a level has no label, so it has no name; give it its text (a glyph alone keeps its text as its name)');
    });
    if (!UNDERLINES.includes(this.underline)) report(this, 'BRC-30', `underline "${this.underline}" is not a value it defines ("auto", "always", "hover" or "never"); it is treated as "auto"`);
    if (!OVERFLOWS.includes(this.overflow)) report(this, 'BRC-29', `overflow "${this.overflow}" is not a value it defines ("collapse" or "wrap"); it behaves as "collapse"`);
    if (!this.wraps && this.out > 0 && this.words.lacks('breadcrumbsOverflowLabel', this.overflowLabel)) {
      report(this, 'BRC-10', 'overflowLabel is empty: the overflow button has no accessible name; give it the words ("Show hidden levels")');
    }
  }

  // ── What fits (BRC-9, BRC-12, BRC-14) ─────────────────────────────────────────────────────────────────────────────

  /**
   * Decides which levels are out of the trail, by the width the trail has: every entry is measured at its own width —
   * a level with its separator, the overflow button with its own — in one task, so the measuring is never painted;
   * then levels are taken out, in BRC-9's order, only while what is left does not fit. Nothing is written when the
   * answer is the one already drawn.
   *
   * `observed`: it was asked for by the observer of sizes. What is decided is drawn at once all the same; only the
   * width the whole trail needs — which may be the element's own width, in a layout that gives it the width of its
   * content — is then written in the next frame, because a size changed while sizes are being told is told late and
   * reported as a loop.
   */
  private decide({ observed = false } = {}) {
    TanreiBreadcrumbs.decideTogether([this], observed);
  }

  /** Has the one observer of sizes tell this trail of `element`, or no longer. */
  private watch(element: Element, on: boolean) {
    if (on) {
      TanreiBreadcrumbs.owners.set(element, this);
      TanreiBreadcrumbs.sizes?.observe(element);
    } else {
      TanreiBreadcrumbs.sizes?.unobserve(element);
      TanreiBreadcrumbs.owners.delete(element);
    }
  }

  /**
   * `decide()` for every trail of `trails`: each is laid out for measuring, then all are read — one style pass and one
   * layout between them — and only then does each write what it decided. A trail that measured in its own update, and
   * again in its own report of sizes, had the page laid out for itself each time (fifty trails drawn at once: 251
   * style passes and 152 layouts).
   */
  private static decideTogether(trails: TanreiBreadcrumbs[], observed: boolean) {
    const live = trails.flatMap((trail) => {
      const list = trail.renderRoot?.querySelector('ol');
      return list && trail.isConnected && trail.hasUpdated ? [{ trail, list }] : [];
    });
    for (const { list } of live) list.classList.add('measure');
    const read = live.map(({ list }) => ({ widths: [...list.querySelectorAll('li.level')].map(width), button: width(list.querySelector('li.more')), room: width(list) }));
    for (const { list } of live) list.classList.remove('measure');
    live.forEach(({ trail }, index) => trail.take(read[index]!, observed));
  }

  /** The writing half of `decide()`: what follows from the widths that were read. */
  private take({ widths, button, room }: { widths: number[]; button: number; room: number }, observed: boolean) {
    const count = this.levels.length;
    const whole = widths.reduce((sum, each) => sum + each, 0);
    let out = 0;
    let cut = false;
    if (!this.wraps && count) {
      let shown = whole;
      const order = [...takenOut(count, count)];
      while (shown > room + SLACK && out < order.length) {
        shown -= widths[order[out]!] ?? 0;
        if (out === 0) shown += button;
        out++;
      }
      cut = shown > room + SLACK;
    }
    this.keep(whole, observed);
    if (out === this.out && cut === this.cut) return;
    const before = takenOut(count, this.out);
    this.out = out;
    this.cut = cut;
    // (After the state is set: focus moves once what it moves to has been drawn.)
    this.moveFocus(before, takenOut(count, out));
  }

  /** BRC-8: the width the whole trail needs stays the element's own widest size (see `.sizer`). */
  private keep(whole: number, later: boolean) {
    const sizer = this.renderRoot?.querySelector<SVGElement>('.sizer');
    const kept = whole ? `${Math.ceil(whole * 100) / 100}px` : '';
    if (!sizer || sizer.style.inlineSize === kept) return;
    cancelAnimationFrame(this.keeping);
    this.keeping = 0;
    if (!later) {
      sizer.style.inlineSize = kept;
      return;
    }
    this.keeping = requestAnimationFrame(() => {
      this.keeping = 0;
      if (this.isConnected) this.decide();
    });
  }

  /**
   * BRC-12: focus follows what it was on. A level that held keyboard focus and is taken out hands it to the overflow
   * button; an overflow button that is removed while it holds focus, or while its menu is open, closes the menu and
   * hands focus to the first level that returned.
   */
  private moveFocus(before: ReadonlySet<number>, after: ReadonlySet<number>) {
    const active = (this.getRootNode() as Root).activeElement;
    const focused = this.levels.findIndex((level) => level.element === active);
    if (focused >= 0 && after.has(focused) && !before.has(focused)) {
      void this.updateComplete.then(() => this.more?.focus());
      return;
    }
    if (after.size || !before.size) return;
    const inside = !!this.shadowRoot?.activeElement;
    if (!inside && !this.menuOpen) return;
    this.menuOpen = false;
    const returned = this.levels.find((level, index) => before.has(index) && level.href !== null);
    if (returned) void this.updateComplete.then(() => returned.element.focus());
  }

  // ── The overflow button and its menu (BRC-10, BRC-11) ─────────────────────────────────────────────────────────────

  private readonly onMoreClick = () => {
    this.menuOpen = !this.menuOpen;
  };

  // BRC-20: where the browser has no style queries, the focus style is read when focus arrives.
  private readonly onMoreFocus = () => {
    if (!styleQueries()) syncFocusStyle(this, this.more);
  };

  /** The menu asks to be closed — Escape, a press outside, Tab, a level chosen — and returns focus to the button itself. */
  private readonly onMenuClose = (_event: CustomEvent<TanreiMenuCloseDetail>) => {
    this.menuOpen = false;
  };

  /**
   * BRC-11, BRC-22: a level chosen in the menu is that level's own anchor activated. The row is a link to the level
   * (the menu's link item, MNU-53), so the address, a new tab and the browser's own menu are there; a plain
   * activation of it is handed to the product's anchor as one `click` — the event the product listens to and cancels
   * (a router's link component) — and the browser follows that anchor unless it was cancelled. The row's own click
   * opens nothing and goes no further than the menu. A modified or a middle click is the browser's, on the row.
   */
  private readonly onMenuClick = (event: MouseEvent) => {
    const row = event.composedPath().find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'tanrei-menu-item');
    const index = Number(row?.dataset.level ?? -1);
    const level = this.levels[index];
    if (!row || !level || level.href === null) return;
    if ((event.button ?? 0) !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    level.element.click();
  };

  // ── A level's press and focus (BRC-18 to BRC-20): the shared primitives, on the product's anchors ─────────────────

  private linkOf(event: Event): HTMLElement | null {
    const path = event.composedPath();
    return this.levels.find((level) => level.href !== null && path.includes(level.element))?.element ?? null;
  }

  private pressOf(a: HTMLElement): PressController {
    let press = this.presses.get(a);
    if (!press) {
      press = new PressController(a, {
        container: () => a,
        // The anchor's first transition is the hold (breadcrumbs.css), so its delay is press-hold as a time.
        holdCarrier: () => a,
        disabled: () => !a.hasAttribute('href'),
        // BRC-18, BRC-22: Enter presses a link; Space does what it does on any link and shows no pressed state.
        keys: LINK_KEYS,
      });
      this.presses.set(a, press);
      this.pressControllers.add(press);
    }
    return press;
  }

  /** The press is this script's from here: the stylesheet's own answer to `:active` stands down for an anchor that carries `data-pressed`. */
  private answered(a: HTMLElement) {
    if (!a.hasAttribute('data-pressed')) a.dataset.pressed = 'none';
  }

  private readonly releasePress = (event?: Event) => {
    this.heldPress?.release(event);
    this.heldPress = null;
    this.heldAnchor = null;
  };

  private readonly onPointerDown = (event: Event) => {
    const a = this.linkOf(event);
    const pointer = event as PointerEvent;
    if (!a || (pointer.button !== 0 && pointer.pointerType === 'mouse')) return;
    this.answered(a);
    this.heldPress = this.pressOf(a);
    this.heldAnchor = a;
    this.heldPress.onPointerDown(pointer);
  };

  // `pointerleave` is not seen from here: the press ends when the pointer goes out of the level it holds.
  private readonly onPointerOut = (event: Event) => {
    const to = (event as PointerEvent).relatedTarget;
    if (this.heldAnchor && !(to instanceof Node && this.heldAnchor.contains(to))) this.releasePress(event);
  };

  private readonly onLevelKeyDown = (event: Event) => {
    const a = this.linkOf(event);
    const key = event as KeyboardEvent;
    if (!a || key.repeat || !LINK_KEYS.includes(key.key)) return;
    this.answered(a);
    this.pressOf(a).onKeyDown(key);
  };

  private readonly onLevelKeyUp = (event: Event) => {
    const a = this.linkOf(event);
    if (a) this.presses.get(a)?.onKeyUp(event as KeyboardEvent);
  };

  private readonly onFocusIn = (event: Event) => {
    const a = this.linkOf(event);
    if (a && !styleQueries()) syncFocusStyle(a, a);
  };

  private readonly onFocusOut = (event: Event) => {
    const a = this.linkOf(event);
    if (a) this.presses.get(a)?.onBlur();
  };

  private readonly pressListeners: [string, (event: Event) => void][] = [
    ['pointerdown', this.onPointerDown],
    ['pointerup', this.releasePress],
    ['pointercancel', this.releasePress],
    ['pointerout', this.onPointerOut],
    ['dragstart', this.releasePress],
    ['keydown', this.onLevelKeyDown],
    ['keyup', this.onLevelKeyUp],
    ['focusin', this.onFocusIn],
    ['focusout', this.onFocusOut],
  ];

  // ── Drawing ───────────────────────────────────────────────────────────────────────────────────────────────────────

  protected override willUpdate(changed: PropertyValues) {
    if (this.levelsStale) this.readLevels();
    else if (debugBuild() && (changed.has('label') || changed.has('overflow') || changed.has('overflowLabel') || changed.has('underline') || changed.has('out'))) this.check();
    // BRC-10, BRC-15: no level out — no overflow button, and no menu of it.
    if (this.wraps || this.out > this.levels.length - 1) {
      this.out = 0;
      this.cut = false;
    }
    if (!this.out) this.menuOpen = false;
  }

  protected override updated() {
    // BRC-1: each level in the slot of its own list item; only a changed assignment is written (assigning again
    // re-slots the child, which blurs a focused level).
    const slots = this.renderRoot.querySelectorAll<HTMLSlotElement>('li.level > slot');
    this.levels.forEach((level, index) => {
      const slot = slots[index];
      if (slot && (slot.assignedNodes().length !== 1 || slot.assignedNodes()[0] !== level.element)) slot.assign(level.element);
    });
    mark(this, 'data-empty', this.levels.length ? null : '');
    // BRC-30: where the browser has no style queries, the trail's token is read when it renders — again when the
    // system is switched (SystemWatchController) — and named for the stylesheet. `always`, and a name that is not
    // known, need no mark.
    if (!styleQueries()) {
      const named = getComputedStyle(this).getPropertyValue(UNDERLINE).trim();
      mark(this, UNDERLINE_MARK, named === 'hover' || named === 'never' ? named : null);
    }
    // BRC-27: a level's own glyph is mirrored where the icon set marks its name — read where an icon is drawn.
    const drawn = this.renderRoot.querySelector('.separator, .more-glyph') ?? this;
    for (const level of this.levels) mark(level.element, MIRRORED, level.icon && glyphMirrors(drawn, level.icon) ? '' : null);
    // BRC-28: a label that is cut takes its text's direction as its own, so that every engine cuts it — and draws the
    // ellipsis — at the text's own end. Not a level with a glyph, which stands at the layout's start, nor one whose
    // direction the product named, nor a label without a letter, which has no direction of its own.
    const last = this.levels.at(-1);
    const direct = this.cut && last && !last.icon && STRONG.test(last.label) && (last.element === this.directed || !last.element.hasAttribute(DIRECTED)) ? last.element : null;
    if (this.directed && this.directed !== direct) this.directed.removeAttribute(DIRECTED);
    if (direct) mark(direct, DIRECTED, 'auto');
    this.directed = direct;
    // BRC-12: a line of the trail's text is watched once it is drawn.
    const probe = this.renderRoot.querySelector('.text-probe');
    if (probe !== this.watched) {
      if (this.watched) this.watch(this.watched, false);
      if (probe) this.watch(probe, true);
      this.watched = probe;
    }
    // Measured with every other trail drawn in this turn, in one microtask after their updates — still in the task
    // that drew them, before any frame.
    const due = TanreiBreadcrumbs.due;
    if (!due.size) {
      queueMicrotask(() => {
        const trails = [...due];
        due.clear();
        TanreiBreadcrumbs.decideTogether(trails, false);
      });
    }
    due.add(this);
  }

  protected override render() {
    const levels = this.levels;
    if (!levels.length) return nothing;
    const label = this.label ?? '';
    // The product's words hold it under `breadcrumbsOverflowLabel`: the instance's prop, else that key.
    const name = this.words.get('breadcrumbsOverflowLabel', this.overflowLabel ?? '');
    const out = takenOut(levels.length, this.out);
    const last = levels.length - 1;
    const separator = html`<span part="separator" class="separator" aria-hidden="true"><span class="ink">${SEPARATOR}</span></span>`;
    return html`
      <nav part="nav" aria-label=${label.trim() ? label : nothing}>
        <ol part="list" role="list" class=${this.wraps ? 'wrap' : 'collapse'}>
          ${levels.map(
            (_level, index) =>
              html`<li class=${classMap({ level: true, out: out.has(index), cut: this.cut && index === last })}><slot></slot>${index < last ? separator : nothing}</li>${index === 0 && last > 0 && !this.wraps
                  ? html`<li class=${classMap({ more: true, none: !out.size })}>
                      <button
                        id="more"
                        part="overflow-button"
                        class="overflow"
                        type="button"
                        data-tanrei-shape
                        aria-label=${name.trim() ? name : nothing}
                        @click=${this.onMoreClick}
                        @pointerdown=${this.morePress.onPointerDown}
                        @pointerup=${this.morePress.release}
                        @pointercancel=${this.morePress.release}
                        @pointerleave=${this.morePress.release}
                        @keydown=${this.morePress.onKeyDown}
                        @keyup=${this.morePress.onKeyUp}
                        @blur=${this.morePress.onBlur}
                        @focus=${this.onMoreFocus}
                      >
                        <span part="overflow-icon" class="more-glyph" aria-hidden="true"><span class="ink">${MORE}</span></span>
                      </button>
                      ${separator}
                      <tanrei-menu anchor="more" placement="bottom-start" .open=${this.menuOpen && out.size > 0} @close=${this.onMenuClose} @click=${this.onMenuClick}>
                        ${levels.map((level, at) =>
                          out.has(at)
                            ? html`<tanrei-menu-item
                                data-level=${at}
                                label=${level.label}
                                leading-icon=${level.icon || nothing}
                                href=${level.href ?? nothing}
                                ?disabled=${level.href === null}
                              ></tanrei-menu-item>`
                            : nothing,
                        )}
                      </tanrei-menu>
                    </li>`
                  : nothing}`,
          )}
        </ol>
        <svg class="sizer" aria-hidden="true"></svg>
        <span class="text-probe" aria-hidden="true">0</span>
        ${DIRECTION_PROBE}
      </nav>
    `;
  }
}

if (!customElements.get('tanrei-breadcrumbs')) customElements.define('tanrei-breadcrumbs', TanreiBreadcrumbs);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-breadcrumbs': TanreiBreadcrumbs;
  }
}
