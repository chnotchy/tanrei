import { type PropertyDeclarations, type PropertyValues, ReactiveElement } from 'lit';
import {
  AvailabilityController,
  PressController,
  SEPARATIONS,
  SEPARATION_VALUES,
  SHEET_TOUCH_SLOP,
  type SeparationProp,
  compChoice,
  findInteractive,
  lineArrow,
  pressTakenWithin,
  report,
  styleQueries,
  syncFocusStyle,
} from '../../primitives/index.js';
import { DRAWN_WIDTH } from '../../primitives/glyph.js';
import { debugBuild } from '../../primitives/report.js';
import type { TanreiAccordionDensityRegistry, TanreiAccordionVariantRegistry } from '../../registry.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';

/** The core looks (plain, outlined), plus any a design system's generated `.d.ts` registers. */
export type TanreiAccordionVariant = keyof TanreiAccordionVariantRegistry;
/** The core densities (regular, compact), plus any a design system's generated `.d.ts` registers. */
export type TanreiAccordionDensity = keyof TanreiAccordionDensityRegistry;
/** How an item is told from the item next to it (ACC-10): `auto` takes `comp.accordion.separation`. */
export type TanreiAccordionSeparation = SeparationProp;

// The text of src/styles/accordion.css — the stylesheet that draws the accordion — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. Read once; a build that wrote
// nothing leaves it empty, and the accordion is then drawn by the page's own copy of `@tanrei/web/accordion.css` alone.
declare const TANREI_ACCORDION_CSS: string;
const ACCORDION_CSS: string = (() => {
  try {
    return TANREI_ACCORDION_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-accordion';
const PREFIX = '--tanrei-comp-accordion';
const CORE_VARIANTS: readonly string[] = ['plain', 'outlined'];
const CORE_DENSITIES: readonly string[] = ['regular', 'compact'];
const DEFAULT_VARIANT = 'plain';
const DEFAULT_DENSITY = 'regular';
/** The members of the density axis (`dev.tanrei.axes.density.members`) as accordion.css names them. */
const DENSITY_MEMBERS: readonly (readonly [string, string])[] = [
  ['--_acc-height', 'container-height-*'],
  ['--_acc-pad-block', 'container-padding-block-*'],
  ['--_acc-pad-inline', 'container-padding-inline-*'],
  ['--_acc-label-font', 'label-typescale-*-font'],
  ['--_acc-label-tracking', 'label-typescale-*-letter-spacing'],
  ['--_acc-supporting-font', 'supporting-text-typescale-*-font'],
  ['--_acc-supporting-tracking', 'supporting-text-typescale-*-letter-spacing'],
  ['--_acc-trailing-font', 'trailing-text-typescale-*-font'],
  ['--_acc-trailing-tracking', 'trailing-text-typescale-*-letter-spacing'],
  ['--_acc-icon-size', 'icon-size-*'],
  ['--_acc-chevron-size', 'chevron-size-*'],
  ['--_acc-content-end', 'content-padding-block-end-*'],
];
/** The per-variant parts (`dev.tanrei.states.perVariant`) and the states, as accordion.css names them. */
const VARIANT_PARTS: readonly (readonly [string, string])[] = [
  ['container', 'container-color'],
  ['label', 'label-color'],
  ['supporting', 'supporting-text-color'],
  ['trailing', 'trailing-text-color'],
  ['icon', 'icon-color'],
  ['chevron', 'chevron-color'],
];
const STATES: readonly string[] = ['', 'hovered-', 'focused-', 'pressed-', 'disabled-'];
/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
/** The pose of the height motion, where the element moves it (accordion.css). */
const MOVING = 'data-tanrei-moving';
const AT_ONCE = 'data-tanrei-at-once';
const SIZE = '--_acc-size';
/** The item's clock (accordion.css): an unregistered custom property whose one step, over the disclosure motion, is the transition this element hears. */
const CLOCK = '--_acc-open';
/** A header moved by less than this has not moved: boxes are laid out on fractions of a pixel. */
const SLACK = 0.5;
/** ACC-32: deeper than this is reported. */
const MAX_DEPTH = 3;
/** ACC-36: a press in the content that moved further than this is a drag, not a press — the touch slop the sheets use, the web naming none of its own. */
const SLOP = SHEET_TOUCH_SLOP;
/** ACC-36: the item a fine pointer is over as one target, and the item whose own pointer cursor is set aside while a cursor is read. */
const HIT = 'data-tanrei-hit';
const READING = 'data-tanrei-reading';
const modified = (event: MouseEvent) => event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

type Root = Document | ShadowRoot;

const sheets = new Map<string, CSSStyleSheet>();
/** A stylesheet of the page, made once and shared by every root that needs it. */
function sheet(id: string, text: () => string): CSSStyleSheet | null {
  if (typeof CSSStyleSheet === 'undefined') return null;
  let made = sheets.get(id);
  if (!made) {
    made = new CSSStyleSheet();
    try {
      made.replaceSync(text());
    } catch {
      // A browser that cannot construct it: the page's own copy of accordion.css draws the accordion.
    }
    sheets.set(id, made);
  }
  return made;
}

/** ACC-34: a density a design system added — the default's rules, read from that density's tokens. */
const densityRules = (density: string) =>
  `@layer tanrei.components { :where(${TAG}[density='${density}']) { ${DENSITY_MEMBERS.map(
    ([name, token]) => `${name}: var(${PREFIX}-${token.replace('*', density)}, var(${PREFIX}-${token.replace('*', DEFAULT_DENSITY)}));`,
  ).join(' ')} } }`;

/** ACC-34: a variant a design system added — its colors in each state, the default's where it has none. */
const variantRules = (variant: string) =>
  `@layer tanrei.components { :where(${TAG}[variant='${variant}']) { ${STATES.flatMap((state) =>
    VARIANT_PARTS.map(([part, token]) => `--_acc-${state}${part}: var(${PREFIX}-${variant}-${state}${token}, var(${PREFIX}-${DEFAULT_VARIANT}-${state}${token}));`),
  ).join(' ')} } }`;

/** Writes an attribute only when it differs: what is written here may be observed, and must settle. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

const supports = (condition: string) => {
  try {
    return CSS.supports(condition);
  } catch {
    return false;
  }
};
/** Whether the browser moves a height to `auto` in CSS: accordion.css then moves the content alone (ACC-13). */
const CSS_MOTION = supports('block-size: calc-size(auto, size)');
/** Whether the content's own box can be styled at all: where it cannot, an item opens and closes at once. */
const CONTENT_BOX = supports('selector(::details-content)');
/** Whether closed content leaves the focus order by a style: where it does not, the element says it while it closes. */
const CSS_INERT = supports('interactivity: inert');

const summaryOf = (details: HTMLDetailsElement) => details.querySelector<HTMLElement>(':scope > summary');
const disabled = (summary: Element) => summary.getAttribute('aria-disabled') === 'true';
const isClock = (animation: Animation) => typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition && animation.transitionProperty === CLOCK;
/** ACC-13: whether the item's own clock is running — its disclosure motion, as the cascade gives it now. */
const clockRuns = (details: Element) => typeof details.getAnimations === 'function' && details.getAnimations().some(isClock);
/** Computes the style of an item and of its content's box, so that what is written next is a change from it. */
function flush(details: Element) {
  void getComputedStyle(details).getPropertyValue(CLOCK);
  if (CONTENT_BOX) void getComputedStyle(details, '::details-content').blockSize;
}

/**
 * ACC-33: whether the icon set can draw a glyph now. A glyph is a ligature — one glyph, about one em wide — and its
 * name spelled in a text face is several (src/primitives/glyph.ts): the name is measured in the icon family, in a box
 * that is not drawn. A family that draws is remembered until the fonts of the page change.
 */
const drawable = new Set<string>();
const EM = 24;
function glyphProbe(): HTMLElement {
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.setAttribute('data-tanrei-glyph-probe', '');
  probe.style.cssText = `position: absolute; visibility: hidden; pointer-events: none; white-space: nowrap; font: normal ${EM}px/1 var(--tanrei-sys-icon-family-unselected); letter-spacing: normal; font-feature-settings: 'liga'; text-transform: none`;
  probe.textContent = 'expand_more';
  return probe;
}
/** The accordions on the page, told when the set of fonts says a load is over. */
const connected = new Set<TanreiAccordion>();
const fontsChanged = () => {
  drawable.clear();
  for (const accordion of connected) accordion.readGlyphs();
};

let groups = 0;
let descriptions = 0;

/**
 * Content that a row shows and hides in place. One item is a single disclosure; several are a set whose items open by
 * themselves or, with `exclusive`, one at a time. A help page's questions, the sections of a settings screen, the
 * advanced part of a form.
 *
 * Contract: specs/accordion.spec.json. The element has **no shadow root**: its items are the product's own native
 * `<details>` elements, which stay in the document. They open and close, are focusable, carry the expanded state, keep
 * their closed content in the page (a field in it keeps its value and is sent with its form) and are opened by a link
 * to a fragment and by the browser's find-in-page, before any script runs and without it.
 *
 * ```html
 * <tanrei-accordion variant="outlined">
 *   <details open>
 *     <summary>
 *       <span class="tanrei-icon" aria-hidden="true">palette</span>
 *       Colors
 *       <span data-supporting-text>Roles, palettes and the six schemes</span>
 *       <span data-trailing-text>48 roles</span>
 *     </summary>
 *     <p>Every color a component reads is a role.</p>
 *   </details>
 *   <details>
 *     <summary><h3>A label that is a heading</h3></summary>
 *     <p>…</p>
 *   </details>
 *   <details>
 *     <summary aria-disabled="true" tabindex="-1">A disabled item</summary>
 *     <p>…</p>
 *   </details>
 * </tanrei-accordion>
 * ```
 *
 * An item is a `<details>` whose first child is its `<summary>`: the header. The summary's text is the label, or ONE
 * element in its place — a heading of the level the page's outline needs, or a `<span>` around text with inline
 * content; an element with `data-supporting-text` is the line under the label, one with `data-trailing-text` the short
 * value before the chevron, a `.tanrei-icon` the glyph at the start. `open` is the item's own attribute and property
 * and `toggle` its own event (it does not bubble; `event.newState` is `open` or `closed`) — the browser also sends it
 * when the product sets `open`. A disabled item is `<summary aria-disabled="true" tabindex="-1">`.
 *
 * Everything drawn is `@tanrei/web/accordion.css` — every value a `--tanrei-comp-accordion-*` token — which draws the
 * whole look and every state before and without this script; the element adds the same sheet to the root it is
 * connected to, so it also works inside another component's shadow root. The script adds what a stylesheet cannot:
 * the system's answer to a press (ripple, dim), the arrow keys, `exclusive` (the `name` it writes on its items), the
 * height motion where the browser cannot move a height to `auto` in CSS, the pressed header kept in place while an
 * item above it closes, focus given to the header when its item closes around it, the supporting and trailing text
 * read as the header's description instead of as part of its name, a disabled header refused, an open item drawn
 * and answered as one target — closed by a press on its content, hovered, pressed and focused as a whole, with the
 * pointer cursor over it (ACC-36; without script only the header is a target), and the debug reports.
 *
 * An accordion in an item's content is content like any other, drawn by its own attributes.
 *
 * @tag tanrei-accordion
 * @slot - The items: native `<details>` elements, each with a `<summary>` first. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export class TanreiAccordion extends ReactiveElement {
  private readonly availability = new AvailabilityController(this, 'accordion');

  static override properties: PropertyDeclarations = {
    // The defaults are not reflected: an accordion that is defined is the accordion that was written.
    variant: { type: String, reflect: true, useDefault: true },
    density: { type: String, reflect: true, useDefault: true },
    separation: { type: String, reflect: true, useDefault: true },
    exclusive: { type: Boolean, reflect: true },
  };

  /** How the accordion stands on its surface: plain is rows on the surface, outlined is bounded by one hairline with rounded corners. A design system may add values. */
  variant: TanreiAccordionVariant = 'plain';

  /** How much room a header takes: regular for a page a person reads, compact for a panel among controls. A design system may add values. */
  density: TanreiAccordionDensity = 'regular';

  /** How an item is told from the item next to it: `divider` is one hairline (in the outlined look the items share one edge), `gap` empty space and no line (each item has an edge of its own); `auto` takes `comp.accordion.separation`, the design system's answer. */
  separation: TanreiAccordionSeparation = 'auto';

  /** Whether opening an item closes the one that was open. The element writes a `name` of its own on its items, which the browser keeps to one open; markup that must be exclusive without script writes `name` itself. */
  exclusive = false;

  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.mutated(records));
  /** What is observed already: an item for its `open` and its children, a header for its parts and `aria-disabled`. */
  private observed = new WeakSet<Node>();
  /** Each item's `open` as it was last drawn: a change from it is what opens and closes. */
  private readonly states = new WeakMap<HTMLDetailsElement, boolean>();
  /** The items whose next change of `open` is drawn at once (ACC-12's first frame). */
  private readonly quiet = new WeakSet<HTMLDetailsElement>();
  /** What this element wrote on the product's elements: only that is taken off again. */
  private readonly named = new WeakSet<Element>();
  private readonly unfocusable = new WeakSet<Element>();
  private readonly described = new WeakSet<Element>();
  private readonly hiddenParts = new WeakSet<Element>();
  private readonly inerted = new WeakSet<Element>();
  private readonly presses = new WeakMap<HTMLElement, PressController>();
  private readonly pressControllers = new Set<PressController>();
  private held: PressController | null = null;
  private heldSummary: HTMLElement | null = null;
  /** The header the user acted on, and where it was in the view, until the task of that act is over (ACC-14). */
  private acted: { summary: HTMLElement; top: number } | null = null;
  private actedTimer: ReturnType<typeof setTimeout> | undefined;
  /** The header that is being kept in place, and the frame that keeps it. */
  private holding: { summary: HTMLElement; top: number; above: HTMLDetailsElement[] } | null = null;
  private holdFrame = 0;
  /** ACC-36: a press in an open item's content — which pointer, where it began, and whether it has moved past the slop. */
  private contentPress: { id: number; x: number; y: number; details: HTMLDetailsElement; moved: boolean } | null = null;
  /** ACC-36: what a press in an item's content holds — the item: the press ends when the pointer leaves it. */
  private heldItem: HTMLDetailsElement | null = null;
  /** ACC-36: the item a fine pointer is over where a press would toggle or close it — drawn hovered as one target. */
  private hit: HTMLDetailsElement | null = null;
  private readonly group = `tanrei-accordion-${++groups}`;
  /** The box the glyph's name is measured in, kept only while the icon set cannot draw it (ACC-33). */
  private glyphProbe: HTMLElement | null = null;
  private glyphSizes: ResizeObserver | null | undefined;

  /** No shadow root: the items are the document's. */
  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet('accordion', () => ACCORDION_CSS), '--_acc-container');
    for (const [type, listener] of this.listeners) this.addEventListener(type, listener, true);
    this.observed = new WeakSet();
    this.mutations?.observe(this, { childList: true });
    if (!connected.size) {
      document.fonts?.addEventListener('loadingdone', fontsChanged);
      document.fonts?.addEventListener('loadingerror', fontsChanged);
    }
    connected.add(this);
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    for (const [type, listener] of this.listeners) this.removeEventListener(type, listener, true);
    this.mutations?.disconnect();
    connected.delete(this);
    if (!connected.size) {
      document.fonts?.removeEventListener('loadingdone', fontsChanged);
      document.fonts?.removeEventListener('loadingerror', fontsChanged);
    }
    this.glyphSizes?.disconnect();
    this.glyphProbe?.remove();
    this.glyphProbe = null;
    for (const press of this.pressControllers) press.hostDisconnected();
    this.held = null;
    this.heldSummary = null;
    this.heldItem = null;
    this.contentPress = null;
    this.setHit(null);
    clearTimeout(this.actedTimer);
    this.acted = null;
    this.release();
  }

  protected override updated(changed: PropertyValues) {
    // ACC-10: a separation the accordion does not define is auto (no rule matches the attribute); a debug build says so.
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'ACC-10', `separation "${this.separation}" is not a value the accordion defines; it is drawn as "auto"`);
    }
    if (changed.has('variant')) this.readAxis('variant', String(this.variant ?? ''), CORE_VARIANTS, DEFAULT_VARIANT, variantRules, (value) => `${PREFIX}-${value}-label-color`);
    if (changed.has('density')) this.readAxis('density', String(this.density ?? ''), CORE_DENSITIES, DEFAULT_DENSITY, densityRules, (value) => `${PREFIX}-container-height-${value}`);
    this.read();
  }

  /** The accordion's own items: the `<details>` elements that are its children, in order. */
  private items(): HTMLDetailsElement[] {
    return [...this.children].filter((child): child is HTMLDetailsElement => child instanceof HTMLDetailsElement);
  }

  /** The item a node of an event belongs to as its header: this accordion's own, never a nested accordion's. */
  private headerOf(node: EventTarget | null): { details: HTMLDetailsElement; summary: HTMLElement } | null {
    const summary = node instanceof Element ? node.closest<HTMLElement>('summary') : null;
    const details = summary?.parentElement;
    return summary && details instanceof HTMLDetailsElement && details.parentElement === this && summaryOf(details) === summary ? { details, summary } : null;
  }

  /**
   * ACC-36: the open item of this accordion whose content a pointer event lands in, where a press there is the item's:
   * the innermost `<details>` on the event's path is this accordion's own item (a nested accordion's item is its own),
   * the item is open and not disabled, the press is not on its header, and nothing between the element pressed and the
   * item takes a press itself.
   */
  private contentOf(event: MouseEvent): HTMLDetailsElement | null {
    const path = event.composedPath();
    const details = path.find((node): node is HTMLDetailsElement => node instanceof HTMLDetailsElement);
    if (!details || details.parentElement !== this || !details.open) return null;
    const summary = summaryOf(details);
    if (!summary || disabled(summary) || path.includes(summary)) return null;
    // A press on the item's own box (its inset, its edge) is in the content only below the header.
    if (path[0] === details) {
      const row = summary.getBoundingClientRect();
      if (event.clientX >= row.left && event.clientX <= row.right && event.clientY >= row.top && event.clientY <= row.bottom) return null;
    }
    // The item's own pointer cursor is set aside while the cursor the product gave what is pressed is read: only a
    // pointer of the product's own counts as a box that answers the press itself.
    const reading = details.hasAttribute(HIT);
    if (reading) details.setAttribute(READING, '');
    try {
      return pressTakenWithin(path, details) ? null : details;
    } finally {
      if (reading) details.removeAttribute(READING);
    }
  }

  /** ACC-36: the item an event's pointer would toggle or close by a press: its header's, or its open content's. */
  private targetOf(event: MouseEvent): HTMLDetailsElement | null {
    const header = this.headerOf(event.target);
    if (header) return disabled(header.summary) ? null : header.details;
    return this.contentOf(event);
  }

  /** ACC-36: the item drawn as the one target under a fine pointer (`data-tanrei-hit`), or none. */
  private setHit(details: HTMLDetailsElement | null) {
    if (this.hit === details) return;
    this.hit?.removeAttribute(HIT);
    this.hit = details;
    details?.setAttribute(HIT, '');
  }

  /**
   * ACC-34: a value of an open axis the core does not have was added by a design system — its rules are added to the
   * root, falling back to the default's tokens — or is unknown to the active one, which a debug build says.
   */
  private readAxis(axis: string, value: string, core: readonly string[], fallback: string, rules: (value: string) => string, probe: (value: string) => string) {
    if (core.includes(value)) return;
    const known = KEY.test(value);
    if (known) adopt(this.getRootNode() as Root, sheet(`${axis}:${value}`, () => rules(value)));
    if (!known || getComputedStyle(this).getPropertyValue(probe(value)).trim() === '') {
      report(this, 'ACC-34', `${axis} "${value}" is not a value of the active design system; it is drawn as "${fallback}"`);
    }
  }

  /**
   * Reads the items the accordion holds and writes what follows from them: `exclusive` as their `name`, a disabled
   * header out of the focus order, the supporting and trailing text as the header's description, the separation and
   * the glyphs where a stylesheet cannot tell. Called when a property changes and when the items or a header's parts
   * do; it writes only what differs, so it settles.
   */
  private read() {
    if (!this.isConnected) return;
    const items = this.items();
    for (const details of items) {
      const summary = summaryOf(details);
      if (!this.observed.has(details)) {
        this.observed.add(details);
        this.mutations?.observe(details, { attributes: true, attributeFilter: ['open'], childList: true });
      }
      if (summary && !this.observed.has(summary)) {
        this.observed.add(summary);
        this.mutations?.observe(summary, { attributes: true, attributeFilter: ['aria-disabled'], childList: true });
      }
      // ACC-7: an item is first drawn as its `open` says, without motion and without an event of this element's.
      if (!this.states.has(details)) this.states.set(details, details.open);
      if (summary) this.readHeader(summary);
    }
    this.readExclusive(items);
    // ACC-10: where the browser answers style queries the stylesheet reads the choice itself, and nothing is written.
    mark(this, 'data-separation', styleQueries() ? null : compChoice(this, '--_acc-separation', SEPARATIONS));
    this.readGlyphs();
    if (debugBuild()) {
      // An accordion that is still being parsed is read again when it is whole: an item may not have its content yet.
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.read(), { once: true });
      else this.check(items);
    }
  }

  /**
   * ACC-12: `exclusive` is the items' `name` — a name of this accordion's own, so an accordion inside an item keeps its
   * own — which the browser holds to one open item. Given several open, the first in order stays; the others are closed
   * here, at once. A `name` the product wrote is left as it is.
   */
  private readExclusive(items: HTMLDetailsElement[]) {
    if (this.exclusive) {
      const open = items.filter((details) => details.open);
      if (open.length > 1) {
        report(this, 'ACC-12', `an exclusive accordion was given ${open.length} open items; the first is drawn open and the others closed`, { once: false });
        for (const details of open.slice(1)) this.closeAtOnce(details);
      }
      for (const details of items) {
        if (details.hasAttribute('name') && !this.named.has(details)) continue;
        this.named.add(details);
        mark(details, 'name', this.group);
      }
    } else {
      for (const details of items) {
        if (!this.named.has(details)) continue;
        this.named.delete(details);
        details.removeAttribute('name');
      }
    }
  }

  /** Closes an item without the motion of ACC-13: the styles are computed once with their transitions off. */
  private closeAtOnce(details: HTMLDetailsElement) {
    this.quiet.add(details);
    details.setAttribute(AT_ONCE, '');
    details.open = false;
    flush(details);
    details.removeAttribute(AT_ONCE);
  }

  /**
   * A header's parts (ACC-20, ACC-24). A disabled header leaves the focus order. The supporting and the trailing text
   * are the header's description, in that order, and not part of its name: each is hidden from the name and named by
   * `aria-describedby`, which reads what it points to even where that is hidden. Each is text of its own direction
   * (ACC-31): `dir="auto"`, unless the product named one.
   */
  private readHeader(summary: HTMLElement) {
    if (disabled(summary)) {
      if (!summary.hasAttribute('tabindex')) {
        summary.setAttribute('tabindex', '-1');
        this.unfocusable.add(summary);
      }
    } else if (this.unfocusable.has(summary)) {
      this.unfocusable.delete(summary);
      summary.removeAttribute('tabindex');
    }
    const parts = [...summary.querySelectorAll<HTMLElement>(':scope > [data-supporting-text]'), ...summary.querySelectorAll<HTMLElement>(':scope > [data-trailing-text]')];
    for (const part of parts) {
      if (!part.id) part.id = `tanrei-accordion-description-${++descriptions}`;
      if (!part.hasAttribute('aria-hidden')) {
        part.setAttribute('aria-hidden', 'true');
        this.hiddenParts.add(part);
      }
      if (!part.hasAttribute('dir')) part.setAttribute('dir', 'auto');
    }
    const ids = parts.filter((part) => this.hiddenParts.has(part)).map((part) => part.id).join(' ');
    if (ids && (!summary.hasAttribute('aria-describedby') || this.described.has(summary))) {
      this.described.add(summary);
      mark(summary, 'aria-describedby', ids);
    } else if (!ids && this.described.has(summary)) {
      this.described.delete(summary);
      summary.removeAttribute('aria-describedby');
    }
  }

  /**
   * ACC-33: while the icon set cannot draw a glyph, the stylesheet draws none and keeps every box. The glyph's name is
   * measured once; only while it cannot be drawn does the box it was measured in stay, as a child that is not drawn,
   * so that the font's arrival is heard as a change of that box's size in the frame it happens — whatever the engine
   * says of its fonts.
   *
   * @internal
   */
  readGlyphs() {
    if (!this.isConnected) return;
    const family = getComputedStyle(this).getPropertyValue('--tanrei-sys-icon-family-unselected').trim();
    let drawn = !family || drawable.has(family);
    if (!drawn) {
      const probe = this.glyphProbe ?? this.appendChild(glyphProbe());
      // (An accordion that is not drawn measures nothing: it is asked again when it is.)
      const width = probe.getBoundingClientRect().width;
      drawn = width <= EM * DRAWN_WIDTH;
      if (drawn && width > 0) drawable.add(family);
      else if (!this.glyphProbe) {
        this.glyphProbe = probe;
        this.glyphSizes ??= typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.readGlyphs());
        this.glyphSizes?.observe(probe);
      }
    }
    if (drawn && this.glyphProbe) {
      this.glyphSizes?.disconnect();
      this.glyphProbe = null;
    }
    if (drawn) this.querySelector(':scope > [data-tanrei-glyph-probe]')?.remove();
    mark(this, 'data-glyphs', drawn ? null : 'pending');
  }

  /** What a debug build says about an accordion it still draws (ACC-3, ACC-24, ACC-32, ACC-35). */
  private check(items: HTMLDetailsElement[]) {
    let depth = 1;
    for (let outer = this.parentElement?.closest(TAG); outer; outer = outer.parentElement?.closest(TAG)) depth++;
    if (depth > MAX_DEPTH) report(this, 'ACC-32', `accordions are nested ${depth} levels deep; more than ${MAX_DEPTH} is hard to follow`);
    for (const details of items) {
      const summary = summaryOf(details);
      if (!summary) {
        report(details, 'ACC-24', 'the item has no <summary>: its header has no accessible name, and the browser draws one of its own');
        continue;
      }
      const label = [...summary.childNodes].filter(
        (node) => !(node instanceof Element && node.matches('.tanrei-icon, [data-supporting-text], [data-trailing-text], .ripple')) && (node instanceof Element || !!node.textContent?.trim()),
      );
      const named = label.some((node) => !!node.textContent?.trim()) || !!summary.getAttribute('aria-label')?.trim() || summary.hasAttribute('aria-labelledby');
      if (!named) report(details, 'ACC-24', 'the header has no accessible name; give the summary its label');
      // ACC-3: a header is one button and holds no other control.
      const control = label.map((node) => (node instanceof Element ? findInteractive(node) : null)).find(Boolean);
      if (control) report(details, 'ACC-3', `the label holds a control (<${control.localName}>): a header is one button and holds no other; put the action in the item's content`);
      if (label.length > 1) report(details, 'ACC-3', 'the label is several nodes, and each is laid out as a part of the header; put text with inline content in one <span>');
      // ACC-35: a header that opens onto nothing.
      const content = [...details.childNodes].some((node) => node !== summary && (node instanceof Element || !!node.textContent?.trim()));
      if (!content) report(details, 'ACC-35', 'the item has no content: its header shows and hides nothing');
    }
  }

  /** What the observer saw: a change of an item's `open` opens or closes it; anything else is read again. */
  private mutated(records: MutationRecord[]) {
    const toggled = new Set<HTMLDetailsElement>();
    let structure = false;
    // The box the glyph's name is measured in is this element's own: its coming and going is not a change of the items.
    const probe = (node: Node) => node instanceof Element && node.hasAttribute('data-tanrei-glyph-probe');
    for (const record of records) {
      if (record.type === 'attributes' && record.attributeName === 'open' && record.target instanceof HTMLDetailsElement) {
        if (record.target.parentElement === this) toggled.add(record.target);
      } else if (record.type !== 'childList' || ![...record.addedNodes, ...record.removedNodes].every(probe)) structure = true;
    }
    if (structure) this.read();
    if (toggled.size) this.toggled([...toggled]);
  }

  /**
   * Items opened or closed — by the user, by the browser for another (`name`), for a search or a fragment, or by the
   * product. Called before the change is drawn.
   */
  private toggled(candidates: HTMLDetailsElement[]) {
    const changed = candidates.filter((details) => this.states.get(details) !== details.open);
    if (!changed.length) return;
    for (const details of changed) this.states.set(details, details.open);
    // ACC-12, for a browser that does not hold a `name` to one open item: the item that opened closes the others.
    if (this.exclusive) {
      const opened = changed.find((details) => details.open);
      if (opened) for (const other of this.items()) if (other !== opened && other.open && other.getAttribute('name') === this.group) other.open = false;
    }
    for (const details of changed) {
      const summary = summaryOf(details);
      // ACC-15: an item that closes around the focus gives it to its header; a disabled one leaves it to the browser.
      if (!details.open && summary && !disabled(summary) && details.matches(':focus-within') && !summary.matches(':focus')) summary.focus({ preventScroll: true });
      // ACC-16: a link to a place inside a closed item opens it at once; so does ACC-12's first frame.
      const atOnce = this.quiet.delete(details) || (details.open && !!details.querySelector(':target') && !this.acted);
      if (atOnce) {
        this.settle(details);
        details.setAttribute(AT_ONCE, '');
        flush(details);
        details.removeAttribute(AT_ONCE);
      } else this.move(details);
    }
    this.keep(changed);
  }

  /**
   * ACC-13, where the browser cannot move a height to `auto` in CSS: the content's height is measured once, before the
   * first frame, and the stylesheet moves its box between 0 and that height. An item whose `open` changes again on the
   * way goes on from where it is: the pose is turned, and the transition reverses by itself. Where the stylesheet
   * moves the content alone, or the item's clock does not run (reduced motion, a duration of zero), nothing is done.
   */
  private move(details: HTMLDetailsElement) {
    if (CSS_MOTION || !CONTENT_BOX) return;
    const opening = details.open;
    const pose = details.getAttribute(MOVING);
    if (pose !== 'opening' && pose !== 'closing') {
      if (!clockRuns(details)) return;
      details.setAttribute(MOVING, 'measure');
      const size = details.getBoundingClientRect().height - (summaryOf(details)?.getBoundingClientRect().height ?? 0);
      details.style.setProperty(SIZE, `${Math.max(0, size)}px`);
      if (opening) details.setAttribute(MOVING, 'opening-from');
      flush(details);
    }
    details.setAttribute(MOVING, opening ? 'opening' : 'closing');
    // Content that is being hidden leaves the focus order and assistive technology when the motion begins.
    this.setInert(details, !opening);
  }

  /** The motion of an item is over, or was never begun: its pose, its measured height and what it made inert are taken off. */
  private settle(details: HTMLDetailsElement) {
    if (details.hasAttribute(MOVING)) details.removeAttribute(MOVING);
    details.style.removeProperty(SIZE);
    // The measured height was the only thing written there: an item is left without the empty attribute it leaves.
    if (details.getAttribute('style') === '') details.removeAttribute('style');
    this.setInert(details, false);
  }

  /** The content of a closing item, out of the focus order while it is still drawn (where no style says so). */
  private setInert(details: HTMLDetailsElement, on: boolean) {
    if (CSS_INERT) return;
    const summary = summaryOf(details);
    for (const child of details.children) {
      if (child === summary || !(child instanceof HTMLElement)) continue;
      if (on && !child.inert) {
        child.inert = true;
        this.inerted.add(child);
      } else if (!on && this.inerted.has(child)) {
        this.inerted.delete(child);
        child.inert = false;
      }
    }
  }

  /**
   * ACC-14: the header the user acted on stays where it is in the view while an item above it closes. Its place is
   * read when the change begins and, only while such an item is still closing, once a frame, and the scrolling of what
   * holds it is moved by what it lost. Nothing is scrolled for any other reason.
   */
  private keep(changed: HTMLDetailsElement[]) {
    const acted = this.acted;
    if (!acted) return;
    const items = this.items();
    const at = items.indexOf(acted.summary.parentElement as HTMLDetailsElement);
    const above = changed.filter((details) => !details.open && items.indexOf(details) > -1 && items.indexOf(details) < at);
    if (!above.length) return;
    this.release();
    this.holding = { ...acted, above };
    this.holdStep();
  }

  private readonly holdStep = () => {
    const holding = this.holding;
    if (!holding || !holding.summary.isConnected) {
      this.release();
      return;
    }
    let lost = holding.summary.getBoundingClientRect().top - holding.top;
    for (let parent = holding.summary.parentElement; parent && Math.abs(lost) >= SLACK; parent = parent.parentElement) {
      const scroller = parent === document.documentElement || parent === document.body ? document.scrollingElement : parent;
      if (!scroller || scroller.scrollHeight - scroller.clientHeight < 1) continue;
      if (scroller !== document.scrollingElement && !/auto|scroll/.test(getComputedStyle(scroller).overflowY)) continue;
      const before = scroller.scrollTop;
      scroller.scrollTop = before + lost;
      lost -= scroller.scrollTop - before;
      if (scroller === document.scrollingElement) break;
    }
    if (holding.above.some(clockRuns)) this.holdFrame = requestAnimationFrame(this.holdStep);
    else this.release();
  };

  private release() {
    cancelAnimationFrame(this.holdFrame);
    this.holdFrame = 0;
    this.holding = null;
  }

  /** The user acts on a header: where it is in the view is remembered until the task of the act is over (ACC-14). */
  private act(summary: HTMLElement) {
    clearTimeout(this.actedTimer);
    this.acted = { summary, top: summary.getBoundingClientRect().top };
    this.actedTimer = setTimeout(() => (this.acted = null));
  }

  /** The press of one header (the shared primitive), made when it is first pressed. */
  private pressOf(summary: HTMLElement): PressController {
    let press = this.presses.get(summary);
    if (!press) {
      press = new PressController(summary, {
        container: () => summary,
        // The summary's first transition is the hold (accordion.css), so its delay is press-hold as a time.
        holdCarrier: () => summary,
        disabled: () => disabled(summary),
      });
      this.presses.set(summary, press);
      this.pressControllers.add(press);
    }
    return press;
  }

  /**
   * The press is this script's from here: the stylesheet's own answer to `:active` stands down for a summary that
   * carries `data-pressed`, so the attribute is written before anything reads a style.
   */
  private answered(summary: HTMLElement) {
    if (!summary.hasAttribute('data-pressed')) summary.dataset.pressed = 'none';
  }

  private readonly releasePress = (event?: Event) => {
    this.held?.release(event);
    this.held = null;
    this.heldSummary = null;
    this.heldItem = null;
  };

  private readonly onPointerDown = (event: Event) => {
    const pointer = event as PointerEvent;
    // ACC-36: a press of the primary button, a touch or a pen in an open item's content, with no modifier key, is a
    // press of the item: its header's press primitive answers it, drawn on the whole item.
    this.contentPress = null;
    if (pointer.isPrimary && pointer.button === 0 && !modified(pointer)) {
      const details = this.contentOf(pointer);
      const summary = details && summaryOf(details);
      if (details && summary) {
        this.contentPress = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY, details, moved: false };
        this.answered(summary);
        this.held = this.pressOf(summary);
        this.heldSummary = summary;
        this.heldItem = details;
        this.held.onPointerDown(pointer);
        return;
      }
    }
    const header = this.headerOf(event.target);
    if (!header || disabled(header.summary)) return;
    if (pointer.button !== 0 && pointer.pointerType === 'mouse') return;
    this.answered(header.summary);
    this.held = this.pressOf(header.summary);
    this.heldSummary = header.summary;
    this.held.onPointerDown(pointer);
  };

  // `pointerleave` is not seen from here: the press ends when the pointer goes out of the header (or the item, for a
  // press in its content) it holds, and the item under a fine pointer is none once the pointer leaves the accordion.
  private readonly onPointerOut = (event: Event) => {
    const to = (event as PointerEvent).relatedTarget;
    const holds = this.heldItem ?? this.heldSummary;
    if (holds && !(to instanceof Node && holds.contains(to))) this.releasePress(event);
    if (!(to instanceof Node && this.contains(to))) this.setHit(null);
  };

  // ACC-36: a fine pointer over an item where a press would toggle or close it — its header, or its open content
  // outside anything that takes a press itself — draws that item hovered, as one target; elsewhere none is.
  private readonly onPointerOver = (event: Event) => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType === 'touch') return;
    this.setHit(this.targetOf(pointer));
  };

  private readonly onKeyDown = (event: Event) => {
    const header = this.headerOf(event.target);
    const key = event as KeyboardEvent;
    if (!header || event.target !== header.summary || disabled(header.summary)) return;
    if (!key.repeat && (key.key === 'Enter' || key.key === ' ')) {
      this.answered(header.summary);
      this.pressOf(header.summary).onKeyDown(key);
    }
    // ACC-11: the arrow toward the end of the line opens a closed item, the one toward its start closes an open one.
    // The arrow that would do neither, and every other key, is the browser's.
    if (key.altKey || key.ctrlKey || key.metaKey || key.shiftKey) return;
    const arrow = lineArrow(key.key, header.summary);
    if ((arrow === 'end' && !header.details.open) || (arrow === 'start' && header.details.open)) {
      event.preventDefault();
      this.act(header.summary);
      header.details.open = !header.details.open;
    }
  };

  private readonly onKeyUp = (event: Event) => {
    const header = this.headerOf(event.target);
    if (header) this.presses.get(header.summary)?.onKeyUp(event as KeyboardEvent);
  };

  // ACC-23: where the browser has no style queries, the focus style is read when focus arrives.
  private readonly onFocusIn = (event: Event) => {
    const header = this.headerOf(event.target);
    if (header && event.target === header.summary && !styleQueries()) syncFocusStyle(header.summary, header.summary);
  };

  private readonly onFocusOut = (event: Event) => {
    const header = this.headerOf(event.target);
    if (header) this.presses.get(header.summary)?.onBlur();
  };

  // ACC-20: a disabled header is not toggled, whatever reaches it. ACC-14: an act on a header is where its place is read.
  private readonly onClick = (event: Event) => {
    const header = this.headerOf(event.target);
    if (!header) return;
    if (disabled(header.summary)) {
      event.preventDefault();
      event.stopPropagation();
    } else if (!event.defaultPrevented) this.act(header.summary);
  };

  // ACC-36: past the slop, a press in the content is a drag — a scroll, a selection, a move — and never closes.
  private readonly onPointerMove = (event: Event) => {
    const press = this.contentPress;
    const pointer = event as PointerEvent;
    if (press && !press.moved && pointer.pointerId === press.id && Math.hypot(pointer.clientX - press.x, pointer.clientY - press.y) > SLOP) {
      press.moved = true;
      // The press of the item ends there: what follows is a drag, not a press.
      if (this.heldItem === press.details) this.releasePress(event);
    }
  };

  private readonly forgetContentPress = () => {
    this.contentPress = null;
  };

  /**
   * ACC-36: the click that ends a press in an open item's content closes the item, as its header's would — unless it
   * moved past the slop, is a second click, is modified, ends a text selection in the item, lands where something
   * else takes it, or is cancelled by a handler of the product's. The click is decided once it has reached every
   * listener (a task later), so that the product's own handler on the content is heard first.
   */
  private readonly onContentClick = (event: Event) => {
    const press = this.contentPress;
    this.contentPress = null;
    const click = event as MouseEvent;
    if (!press || press.moved || click.button !== 0 || click.detail !== 1 || modified(click)) return;
    if (Math.hypot(click.clientX - press.x, click.clientY - press.y) > SLOP || this.contentOf(click) !== press.details) return;
    const { details } = press;
    setTimeout(() => {
      if (event.defaultPrevented || !details.open || details.parentElement !== this || this.selects(details)) return;
      const summary = summaryOf(details);
      if (!summary || disabled(summary)) return;
      this.act(summary);
      // What was under the pointer goes with the content: the item is no longer the target there.
      if (this.hit === details) this.setHit(null);
      details.open = false;
    });
  };

  /** Whether the selection of the document (or of the shadow root the accordion is in) is text selected in `details`. */
  private selects(details: HTMLDetailsElement): boolean {
    const root = this.getRootNode() as Root & { getSelection?: () => Selection | null };
    const selection = (root instanceof ShadowRoot && typeof root.getSelection === 'function' ? root.getSelection() : null) ?? document.getSelection();
    if (!selection || selection.isCollapsed) return false;
    for (let i = 0; i < selection.rangeCount; i++) if (selection.getRangeAt(i).intersectsNode(details)) return true;
    return false;
  }

  // ACC-13: the item's clock has run out, or was cancelled and no other runs: its motion is over.
  private readonly onMotionEnd = (event: Event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || details.parentElement !== this || (event as TransitionEvent).propertyName !== CLOCK) return;
    if (event.type === 'transitioncancel' && clockRuns(details)) return;
    this.settle(details);
  };

  private readonly listeners: [string, (event: Event) => void][] = [
    ['pointerdown', this.onPointerDown],
    ['pointerup', this.releasePress],
    ['pointercancel', this.releasePress],
    ['pointercancel', this.forgetContentPress],
    ['pointermove', this.onPointerMove],
    ['pointerout', this.onPointerOut],
    ['pointerover', this.onPointerOver],
    ['dragstart', this.releasePress],
    ['dragstart', this.forgetContentPress],
    ['keydown', this.onKeyDown],
    ['keyup', this.onKeyUp],
    ['focusin', this.onFocusIn],
    ['focusout', this.onFocusOut],
    ['click', this.onClick],
    ['click', this.onContentClick],
    ['transitionend', this.onMotionEnd],
    ['transitioncancel', this.onMotionEnd],
  ];
}

if (!customElements.get('tanrei-accordion')) customElements.define('tanrei-accordion', TanreiAccordion);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-accordion': TanreiAccordion;
  }
}
