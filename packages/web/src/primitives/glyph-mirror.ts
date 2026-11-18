import { type ReactiveController, type ReactiveControllerHost, nothing } from 'lit';
import { type IconSet, iconSets, systemIconSets } from '../generated/icon-sets.js';
import { ICON_NAME, MIRROR, MIRRORED } from '../styles/icons.js';

// A glyph that shows a direction along the line is drawn mirrored in a right-to-left layout, and the icon set says
// which names those are. A stylesheet cannot read a name from an element's text, so script reads it and
// leaves ONE mark — the attribute `data-tanrei-mirrored` (MIRRORED, styles/icons.ts) on the element that holds the
// name — and the icon helper's styles (`iconGlyph()` in a shadow root, `icons.css` in the page) mirror what is marked
// under `:dir(rtl)`. The mark does not depend on the direction: a change of `dir` is followed by CSS alone.
//
// Three callers, one rule (`markGlyph()`):
//   GlyphMirrorController — a component, for the glyphs it draws itself and the glyphs the product put in its slots
//   observeIcons()        — the page, for every bare `.tanrei-icon` (installed by `@tanrei/web` and `@tanrei/web/icons`)
//   markGlyph()           — anything else that holds one element with a name
// And one word of the product's: `data-mirror` on the glyph's element, or — for a glyph a component draws from a name it
// was given — on the element that names it, which MirrorWordController carries to the component's box.
// All of them write the same mark on the same element, so a `.tanrei-icon` in a component's slot is marked twice with
// one result, never mirrored twice.

/** The product's decision for one use: by the icon set's list, always, or never. */
export type GlyphMirroring = 'auto' | 'always' | 'never';

/** The design system of a page that names none. */
const DEFAULT_SYSTEM = 'tanrei';

/** A ligature name: one word of letters, digits and underscores. Anything else is text, not a glyph. */
const NAME = /^[a-z0-9_]+$/i;

/** What is a picture or a view of the product's, not a name: never mirrored by the list. */
const NOT_A_NAME = 'svg, img, picture, canvas, video, object, embed, iframe';

/** The nearest `data-tanrei-system` around the element, across shadow roots. */
function scopeSystem(element: Element): string | null {
  for (let node: Element | null = element; node; ) {
    const scope = node.closest('[data-tanrei-system]');
    if (scope) return scope.getAttribute('data-tanrei-system');
    const root = node.getRootNode();
    node = root instanceof ShadowRoot ? root.host : null;
  }
  return null;
}

/**
 * The icon set that is active where `element` is: the set of the design system around it (the nearest
 * `data-tanrei-system`, the default system where there is none), and for a system Tanrei does not ship — a product's own
 * layer — the set whose `families` hold the first family the element is drawn with. Null: no set describes it, so
 * nothing is mirrored by itself there.
 */
export function activeIconSet(element: Element): IconSet | null {
  return iconSetAt(element, () => getComputedStyle(element).fontFamily);
}

/**
 * The set of the design system around `element`, and for a system Tanrei does not ship the set whose `families` hold
 * the first of `families()` — the font families the glyph is drawn with, read only where the system does not say.
 */
function iconSetAt(element: Element, families: () => string): IconSet | null {
  const system = scopeSystem(element) || DEFAULT_SYSTEM;
  if (Object.hasOwn(systemIconSets, system)) {
    const id = systemIconSets[system];
    return id && Object.hasOwn(iconSets, id) ? iconSets[id] : null;
  }
  const family = families().split(',')[0]?.trim().replace(/^["']|["']$/g, '').toLowerCase();
  if (!family) return null;
  return Object.values(iconSets).find((set) => set.families.some((name) => name.toLowerCase() === family)) ?? null;
}

/**
 * The glyph name an element holds, or null where it holds none: a `.tanrei-icon`'s `data-icon` where it is given (the
 * name drawn as generated content, ICON_NAME), else its text — through any wrapper of its own, such as the `.ink` of
 * GlyphDrawnController, and without the white space around it — when that is one ligature name. An image, an SVG, a
 * custom element, an element that holds one of those or a `.tanrei-icon` of its own (which is marked itself), and a box
 * whose slot the product filled (the glyph is then the slotted element, not the box) hold no name.
 */
export function glyphName(element: Element): string | null {
  if (element.matches(NOT_A_NAME) || element.localName.includes('-')) return null;
  const given = element.classList.contains('tanrei-icon') ? element.getAttribute(ICON_NAME) : null;
  if (given) return NAME.test(given.trim()) ? given.trim() : null;
  if (element.querySelector(`${NOT_A_NAME}, .tanrei-icon`)) return null;
  for (const slot of element.querySelectorAll('slot')) if (slot.assignedNodes({ flatten: true }).length) return null;
  const text = element.textContent?.trim() ?? '';
  return NAME.test(text) ? text : null;
}

/** Whether the icon set active at `element` mirrors the glyph called `name` in a right-to-left layout. */
export function glyphMirrors(element: Element, name: string | null): boolean {
  return !!name && !!activeIconSet(element)?.mirrored.has(name);
}

/**
 * THE rule: marks `element` with `data-tanrei-mirrored` when the glyph it holds is drawn mirrored
 * in a right-to-left layout, and removes the mark when it is not. `data-mirror="always"` on the element marks it
 * whatever it holds, `"never"` never; otherwise (`auto`) the active icon set's list decides by the glyph's name. Returns
 * whether it is marked. It writes nothing when nothing changes.
 */
export function markGlyph(element: Element): boolean {
  const mirroring = element.getAttribute(MIRROR);
  const mirrored = mirroring === 'always' || (mirroring !== 'never' && glyphMirrors(element, glyphName(element)));
  if (mirrored !== element.hasAttribute(MIRRORED)) element.toggleAttribute(MIRRORED, mirrored);
  return mirrored;
}

// The active icon set changes when the design system does. A system is switched on the document's root (as
// primitives/system-watch.ts says); everything that marked glyphs marks them again then. One observer for the page.
const refreshers = new Set<() => void>();
let systemObserver: MutationObserver | null = null;

/** The root whose attributes `systemObserver` watches. */
let watchedRoot: Element | null = null;
const SYSTEM_SWITCH: MutationObserverInit = { attributes: true, attributeFilter: ['data-tanrei-system', 'class', 'style'] };

/**
 * Watches the document's root of now where it is not the one watched, and returns whether it was another. A page that
 * writes a new document into its window (`document.open()`, as a test's second mount of fixtures does) keeps its
 * scripts and this observer, and has a new root: the switches heard are the new root's. The document's own children are
 * watched for that, and each new watch looks too.
 */
function followRoot(observer: MutationObserver): boolean {
  const root = document.documentElement;
  if (!root || root === watchedRoot) return false;
  // An observer cannot let go of one of its targets alone: the old root goes with all of them.
  observer.disconnect();
  observer.observe(document, { childList: true });
  observer.observe(root, SYSTEM_SWITCH);
  watchedRoot = root;
  return true;
}

function watchSystem(refresh: () => void) {
  refreshers.add(refresh);
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  if (!systemObserver) {
    const observer = new MutationObserver((records) => {
      // A new root is as much a switch as a changed attribute of it; another child of the document changed is none.
      if (!followRoot(observer) && records.every((record) => record.type === 'childList')) return;
      for (const each of [...refreshers]) each();
    });
    systemObserver = observer;
  }
  followRoot(systemObserver);
}

function unwatchSystem(refresh: () => void) {
  refreshers.delete(refresh);
  if (refreshers.size) return;
  systemObserver?.disconnect();
  systemObserver = null;
  watchedRoot = null;
}

/** The family a stylesheet draws its own glyph with (a tree view's chevron): the icon set's, unselected. */
const GENERATED_FAMILY = '--tanrei-sys-icon-family-unselected';

/**
 * The rule for a glyph that a light-DOM stylesheet draws itself as generated content (a `::before`'s `content`, such
 * as a tree view's chevron): a pseudo-element carries no attribute, so it cannot be marked, and the HOST is told
 * instead. `decided(mirrored)` is called with whether the icon set active at the host mirrors the glyph called `name`
 * in a right-to-left layout — the answer `markGlyph()` gives for that name, the family read from the token the
 * stylesheet draws it with (`sys.icon.family.unselected`; the host's own font is its text's) — when the host is
 * connected and again whenever the design system is switched; the host writes a mark of its own that its stylesheet
 * reads. The glyph is the component's own choice, so no product's `data-mirror` decides it.
 */
export class GeneratedGlyphMirror {
  private readonly refresh = () => {
    if (this.host.isConnected) this.decided(!!iconSetAt(this.host, () => getComputedStyle(this.host).getPropertyValue(GENERATED_FAMILY))?.mirrored.has(this.name));
  };

  constructor(
    private readonly host: Element,
    private readonly name: string,
    private readonly decided: (mirrored: boolean) => void,
  ) {}

  /** Call when the host is connected: decides now, and again when the design system is switched. */
  connect() {
    watchSystem(this.refresh);
    this.refresh();
  }

  /** Call when the host is disconnected. */
  disconnect() {
    unwatchSystem(this.refresh);
  }
}

/** What tells a glyph's mark to be decided again: its name (its text or its `data-icon`) or the product's `data-mirror` changed. */
const GLYPH_CHANGES: MutationObserverInit = { attributes: true, attributeFilter: [MIRROR, ICON_NAME], characterData: true, childList: true, subtree: true };

export interface GlyphMirrorOptions {
  /**
   * A selector, in the host's shadow root, for the boxes whose glyph the COMPONENT writes by name: each is an
   * `iconGlyph()` box holding the ligature text (directly or in an `.ink`). Leave it out when the component draws none
   * that could mirror — it costs one set lookup per box and render, so naming every box is fine.
   */
  drawn?: string;
  /**
   * A selector, in the host's shadow root, for the slots that take a glyph of the PRODUCT's: `'slot[name="icon"]'`.
   * Each element assigned to them (through forwarded slots too) is marked itself.
   */
  slots?: string;
}

type Host = ReactiveControllerHost & HTMLElement;

/**
 * Keeps the mirror mark of a component's glyphs right (BTN-19 and its like): after every render, when a slot's content
 * changes, when a slotted glyph's name or `data-mirror` changes, and when the design system is switched. The component
 * only names its boxes and slots; the direction itself is followed by the styles `iconGlyph()` includes.
 *
 * ```ts
 * private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]', drawn: '.chevron' });
 * ```
 *
 * Each `drawn` box and each slot's parent box must be styled by `iconGlyph()` — that is where the mirroring is drawn.
 * A text node placed directly in a slot cannot carry a mark: a glyph is given in an element.
 */
export class GlyphMirrorController implements ReactiveController {
  private readonly observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.mark());
  private observed: Element[] = [];
  private readonly refresh = () => this.mark();
  private root: Node | null = null;

  constructor(
    private readonly host: Host,
    private readonly options: GlyphMirrorOptions,
  ) {
    host.addController(this);
  }

  hostConnected() {
    watchSystem(this.refresh);
    // `slotchange` bubbles to the shadow root: one listener hears every slot of the component.
    this.root = this.host.shadowRoot;
    this.root?.addEventListener('slotchange', this.refresh);
    this.mark();
  }

  hostDisconnected() {
    unwatchSystem(this.refresh);
    this.root?.removeEventListener('slotchange', this.refresh);
    this.root = null;
    this.observer?.disconnect();
    this.observed = [];
  }

  /** After every render: the glyphs it drew, and what its slots hold now, before the frame is painted. */
  hostUpdated() {
    if (!this.root && this.host.shadowRoot) {
      this.root = this.host.shadowRoot;
      this.root.addEventListener('slotchange', this.refresh);
    }
    this.mark();
  }

  /** Decides every glyph of the host again. Called for you; call it after changing a glyph outside a render. */
  mark() {
    const root = this.host.shadowRoot;
    if (!root || !this.host.isConnected) return;
    const { drawn, slots } = this.options;
    if (drawn) for (const box of root.querySelectorAll(drawn)) markGlyph(box);
    if (!slots) return;
    const assigned = [...root.querySelectorAll<HTMLSlotElement>(slots)].flatMap((slot) => slot.assignedElements({ flatten: true }));
    for (const element of assigned) markGlyph(element);
    if (assigned.length === this.observed.length && assigned.every((element, index) => element === this.observed[index])) return;
    this.observer?.disconnect();
    this.observed = assigned;
    for (const element of assigned) this.observer?.observe(element, GLYPH_CHANGES);
  }
}

/**
 * The product's word on mirroring a glyph that a component draws from a NAME the product gave it (a tab's `icon`, a
 * switch's `checked-icon`, a menu item's `leading-icon`): `data-mirror="auto | always | never"` on the element that
 * names the glyph — the component's own element, or the item that names it — with the values and the default it has on
 * a glyph the product places itself. The product cannot write on a box in a shadow root, so the component writes
 * `word` as `data-mirror` on each box that draws such a glyph; the box's mark (`GlyphMirrorController`) and the styles
 * of `iconGlyph()` then decide as they do for any glyph, and a change of direction is followed by CSS alone, at once. A
 * glyph the component chooses itself (a chevron, a check) is given no word.
 *
 * ```ts
 * private readonly mirrorWord = new MirrorWordController(this);
 * html`<span class="icon" data-mirror=${this.mirrorWord.word}>${this.icon}</span>`
 * ```
 *
 * The host renders again when the word changes on the element that names the glyph. That element is the host unless
 * `namedBy` says otherwise (a menu item draws the mark its group names); it is asked again after every render. The
 * element's class hears the attribute (`hearsMirrorWord()`, called once before the class is defined): no observer is
 * made per element, so a list of a hundred items costs nothing until a word changes.
 */
export class MirrorWordController implements ReactiveController {
  private heardOn: Element | null = null;
  private readonly refresh = () => this.host.requestUpdate();

  constructor(
    private readonly host: Host,
    private readonly namedBy: () => Element | null = () => host,
  ) {
    host.addController(this);
  }

  hostConnected() {
    this.listen();
  }

  hostDisconnected() {
    this.listen(null);
  }

  hostUpdated() {
    this.listen();
  }

  /** What to write as `data-mirror` on a box that draws the glyph: the product's word, or nothing (`auto`). */
  get word(): string | typeof nothing {
    return mirrorWordOf(this.namedBy());
  }

  private listen(element: Element | null = this.host.isConnected ? this.namedBy() : null) {
    if (element === this.heardOn) return;
    if (this.heardOn) listeners.get(this.heardOn)?.delete(this.refresh);
    this.heardOn = element;
    if (!element) return;
    let each = listeners.get(element);
    if (!each) listeners.set(element, (each = new Set()));
    each.add(this.refresh);
  }
}

/** For each element that names a glyph, what renders again when its word changes. */
const listeners = new WeakMap<Element, Set<() => void>>();

type Hearing = { prototype: HTMLElement; observedAttributes?: string[] };

/** The classes that hear the word; their subclasses inherit it. */
const hearing = new WeakSet<object>();

/**
 * Makes the elements of a class that names glyphs — a tab, a switch, a menu item, a menu group — hear `data-mirror`:
 * it becomes one of the class's observed attributes, and a change of it renders again every host whose
 * `MirrorWordController` reads the element. Call it once for the class, before it is defined. A subclass of a class
 * that hears it hears it too.
 */
export function hearsMirrorWord(element: Hearing): void {
  for (let at: object | null = element; at; at = Object.getPrototypeOf(at)) if (hearing.has(at)) return;
  hearing.add(element);
  let observed: PropertyDescriptor | undefined;
  for (let at: object | null = element; at && !observed; at = Object.getPrototypeOf(at)) observed = Object.getOwnPropertyDescriptor(at, 'observedAttributes');
  Object.defineProperty(element, 'observedAttributes', {
    configurable: true,
    get(this: unknown) {
      return [...((observed?.get?.call(this) as string[] | undefined) ?? []), MIRROR];
    },
  });
  // The element's own reaction to its attributes stays first; the word's comes after it.
  const prototype = element.prototype as HTMLElement & { attributeChangedCallback?(name: string, old: string | null, value: string | null): void };
  const own = prototype.attributeChangedCallback;
  prototype.attributeChangedCallback = function (this: HTMLElement, name: string, old: string | null, value: string | null) {
    own?.call(this, name, old, value);
    if (name === MIRROR && old !== value) for (const refresh of listeners.get(this) ?? []) refresh();
  };
}

/** The product's word that `element` carries for the glyphs it names, as `MirrorWordController.word` gives it. */
export function mirrorWordOf(element: Element | null | undefined): string | typeof nothing {
  return element?.getAttribute(MIRROR) ?? nothing;
}

const ICON = '.tanrei-icon';
const observing = new WeakMap<Node, () => void>();

/**
 * Marks every bare `.tanrei-icon` under `root`, now and as the page changes:
 * icons added later, a glyph's name (its text or its `data-icon`) or `data-mirror` changed, the class given to an element, the design system
 * switched. `@tanrei/web` and `@tanrei/web/icons` call it for the document when they load; call it yourself for a
 * shadow root of your own, which the document's observer cannot see into. Calling it twice for one root observes once.
 * Returns a function that stops observing that root (the marks already written stay).
 */
export function observeIcons(root: Document | ShadowRoot | Element = document): () => void {
  const running = observing.get(root);
  if (running) return running;
  if (typeof MutationObserver === 'undefined') return () => {};
  const all = () => {
    for (const icon of root.querySelectorAll(ICON)) markGlyph(icon);
  };
  const observer = new MutationObserver((records) => {
    const icons = new Set<Element>();
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      // A change inside an icon (its text, a wrapper) or on it (its class, its `data-icon`, its `data-mirror`).
      const around = target?.closest(ICON);
      if (around) icons.add(around);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(ICON)) icons.add(node);
        for (const icon of node.querySelectorAll(ICON)) icons.add(icon);
      }
    }
    for (const icon of icons) if (icon.isConnected) markGlyph(icon);
  });
  observer.observe(root, { attributes: true, attributeFilter: ['class', MIRROR, ICON_NAME], characterData: true, childList: true, subtree: true });
  watchSystem(all);
  all();
  const stop = () => {
    observer.disconnect();
    unwatchSystem(all);
    observing.delete(root);
  };
  observing.set(root, stop);
  return stop;
}
