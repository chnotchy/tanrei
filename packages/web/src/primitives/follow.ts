import type { ReactiveController, ReactiveControllerHost } from 'lit';

// An overlay in the top layer is placed by script against its anchor (a tooltip, a menu and its submenus, a FAB menu's
// items, a search view, a docked picker), so it has to be placed again whenever the anchor moves — and nothing tells a
// script that an element moved. Asking in every frame does (it is what these five did, each with its own copy of the
// loop), and costs a page a share of a core for as long as an overlay is open, moving or not.
//
// FollowController asks only when something can have moved, and asks in every frame only while something is moving:
//
//   scroll                  — any scroll in the window, or in a shadow root an anchor is inside (captured, passive)
//   resize                  — the window and the visual viewport (and its scroll: a pinch-zoomed page panned, the keyboard)
//   a size                  — a ResizeObserver on what is followed, on what is sized and on the root element
//   a place, with no event  — an IntersectionObserver per followed element whose root is cut down to the element's own
//                             box: it reports the moment the element is no longer exactly there (a sibling's layout, a
//                             transform, a script), and is set again at the new box
//   a motion beginning      — `transitionrun` / `transitionstart` / `animationstart` / `animationiteration` on an
//                             ancestor of what is followed or sized (or on it)
//   the cascade             — an attribute changed on an ancestor (`dir`, a theme, a style), the colour scheme, and the
//                             host rendered again
//
// Any of them starts a run of frames that lasts for as long as `check` keeps finding a change, and for QUIET frames
// after the last one. At rest no frame is asked for.
//
// The component keeps what it compares and how it places: `check()` reads what the placement depends on, places again
// if that differs from what it placed for, and says whether it did.
//
// An overlay with nothing drawn beside it no longer says what it belongs to (Floating UI's `hide` middleware,
// `referenceHidden`; CSS anchor positioning's `position-visibility: anchors-visible`). Given its `anchor`, the
// controller tells the component (`undrawn()`, once each time) when that anchor is no longer drawn: taken out of the
// page, `display: none` (on it or on an ancestor), `visibility: hidden`, or skipped by `content-visibility`. Each of
// these is seen by the observers above: the anchor's size becomes 0 × 0 (a ResizeObserver report), or an attribute
// changed on an ancestor (a class, a style).
//
// What this cannot see (the frame loop could): an element followed that moves by less than a pixel with no event, one
// that moves while it is wholly outside the viewport or has no area, a style sheet replaced so that an inherited value
// changes with no attribute changed on an ancestor, and an anchor moved to another parent while the overlay is open.
// Each is seen at the next thing that is.

/** Frames without a change that end a run: a transition's first frames may not have moved anything yet. */
const QUIET = 3;

const MOTION_EVENTS = ['transitionrun', 'transitionstart', 'animationstart', 'animationiteration'] as const;

type Host = ReactiveControllerHost & HTMLElement;
type Maybe = Element | null | undefined;

export interface FollowOptions {
  /** The elements whose place decides the placement (the anchor; a submenu's item), read again after every check. */
  followed: () => Iterable<Maybe>;
  /** The elements whose size alone decides it (the overlay's surface, what scrolls in it). */
  sized?: () => Iterable<Maybe>;
  /** Places again if what the placement depends on changed; returns whether it did. */
  check: () => boolean;
  /** The element the overlay stands beside, whose being drawn `undrawn()` is about (the anchor; a context menu's area). */
  anchor?: () => Element | null | undefined;
  /** The anchor is no longer drawn (`anchorUndrawn()`): called once each time it goes, with no placement for it. */
  undrawn?: () => void;
}

/**
 * Whether an anchor is no longer drawn: out of the page, without a box (`display: none` on it or an ancestor),
 * `visibility: hidden`, or in a subtree `content-visibility` skips (hidden, or auto off screen). An engine without
 * `checkVisibility()` sees a box only.
 */
export function anchorUndrawn(element: Element): boolean {
  if (!element.isConnected) return true;
  if (typeof element.checkVisibility === 'function') return !element.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
  return element.getClientRects().length === 0;
}

/** The size a ResizeObserver last reported, as one comparable string. */
const sizeOf = (entry: ResizeObserverEntry) => {
  const box = entry.borderBoxSize?.[0];
  return box ? `${box.inlineSize},${box.blockSize}` : `${entry.contentRect.width},${entry.contentRect.height}`;
};

/**
 * Follows what an overlay is placed against by events, frame by frame only while it moves (TIP-9, MNU-2, MNU-46,
 * FBM-13, SRC-7, DTM-2), and tells it when its anchor is no longer drawn (MNU-65, DTM-51). `start()` when the overlay is
 * shown and placed, `stop()` when it is hidden.
 */
export class FollowController implements ReactiveController {
  private active = false;
  private frame = 0;
  private quiet = 0;
  private reobserve = 0;
  private followed: Element[] = [];
  private sized: Element[] = [];
  /** Every flat-tree ancestor of what is watched, and the watched elements themselves. */
  private readonly chain = new Set<Element>();
  private readonly roots = new Set<ShadowRoot>();
  private readonly sizes = new WeakMap<Element, string>();
  private resizes: ResizeObserver | null = null;
  private attributes: MutationObserver | null = null;
  private readonly places = new Map<Element, IntersectionObserver>();
  private scheme: MediaQueryList | null = null;
  /** The anchor was found not drawn, and the component told; until it is drawn again. */
  private undrawn = false;
  /** The anchor last found: one taken out of the page is no longer found by its id, and is still the one that went. */
  private lastAnchor: Element | null = null;

  constructor(
    private readonly host: Host,
    private readonly options: FollowOptions,
  ) {
    host.addController(this);
  }

  /** Whether the overlay is being followed now. */
  get following(): boolean {
    return this.active;
  }

  hostUpdated() {
    // What the host drew may be what the placement depends on (its content, a prop, the choices of the design system).
    if (this.active) this.request();
  }

  hostDisconnected() {
    this.stop();
  }

  start() {
    if (this.active || typeof window === 'undefined') return;
    this.active = true;
    this.undrawn = false;
    this.lastAnchor = null;
    window.addEventListener('scroll', this.request, { capture: true, passive: true });
    window.addEventListener('resize', this.request, { passive: true });
    window.visualViewport?.addEventListener('resize', this.request, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.request, { passive: true });
    for (const type of MOTION_EVENTS) window.addEventListener(type, this.onMotion, { capture: true, passive: true });
    this.scheme = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
    this.scheme?.addEventListener('change', this.request);
    if (typeof ResizeObserver !== 'undefined') this.resizes = new ResizeObserver(this.onResize);
    if (typeof MutationObserver !== 'undefined') this.attributes = new MutationObserver(this.request);
    this.watch();
    this.request();
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.reobserve);
    this.frame = this.reobserve = 0;
    window.removeEventListener('scroll', this.request, { capture: true });
    window.removeEventListener('resize', this.request);
    window.visualViewport?.removeEventListener('resize', this.request);
    window.visualViewport?.removeEventListener('scroll', this.request);
    for (const type of MOTION_EVENTS) window.removeEventListener(type, this.onMotion, { capture: true });
    this.scheme?.removeEventListener('change', this.request);
    this.scheme = null;
    this.unwatch();
    this.resizes = this.attributes = null;
    this.followed = [];
    this.sized = [];
    this.lastAnchor = null;
  }

  /** Something this cannot see may have changed the placement: checked in the next frame, and for as long as it changes. */
  readonly request = () => {
    if (!this.active) return;
    this.quiet = 0;
    if (!this.frame) this.frame = requestAnimationFrame(this.step);
  };

  private readonly step = () => {
    this.frame = 0;
    if (!this.active) return;
    if (this.run()) this.quiet = 0;
    else this.quiet++;
    if (this.active && this.quiet < QUIET) this.frame = requestAnimationFrame(this.step);
  };

  /**
   * Whether the anchor is not drawn: the component is told the first time, and nothing is placed against it while it
   * is not (its box is 0 × 0 at the window's corner, or the last one it had).
   */
  private anchorGone(): boolean {
    if (!this.options.undrawn) return false;
    const found = this.options.anchor?.() ?? null;
    if (found) this.lastAnchor = found;
    const anchor = found ?? this.lastAnchor;
    const gone = !!anchor && anchorUndrawn(anchor);
    if (gone && !this.undrawn) {
      this.undrawn = true;
      this.options.undrawn?.();
    } else if (!gone) this.undrawn = false;
    return gone;
  }

  /** One check; what is watched is read again after it, and each followed element's box is taken as its place. */
  private run(): boolean {
    if (this.anchorGone()) return false;
    const changed = this.options.check();
    // What the check wrote on what is watched (the surface's place, its cap read and put back) is the component's own,
    // not a move: an attribute record it left would ask for the next frame, and that frame's check for the one after.
    this.attributes?.takeRecords();
    if (!this.active) return changed;
    const followed = [...this.options.followed()].filter((element): element is Element => !!element);
    const sized = [...(this.options.sized?.() ?? [])].filter((element): element is Element => !!element);
    const same = (a: Element[], b: Element[]) => a.length === b.length && a.every((element, index) => element === b[index]);
    if (!same(followed, this.followed) || !same(sized, this.sized)) {
      this.unwatch();
      this.watch(followed, sized);
    } else if (changed) for (const element of this.followed) this.arm(element);
    return changed;
  }

  /** A check outside a frame (an observer's callback): a change starts the frames that follow a motion. */
  private now() {
    if (!this.active) return;
    if (this.run()) this.request();
  }

  private watch(
    followed = [...this.options.followed()].filter((element): element is Element => !!element),
    sized = [...(this.options.sized?.() ?? [])].filter((element): element is Element => !!element),
  ) {
    this.followed = followed;
    this.sized = sized;
    const hostRoot = this.host.shadowRoot;
    if (hostRoot) this.roots.add(hostRoot);
    for (const element of [...followed, ...sized]) {
      let node: Element | null = element;
      while (node && !this.chain.has(node)) {
        this.chain.add(node);
        const parent: Node | null = node.assignedSlot ?? node.parentNode;
        if (parent instanceof ShadowRoot) {
          this.roots.add(parent);
          node = parent.host;
        } else node = parent instanceof Element ? parent : null;
      }
    }
    for (const root of this.roots) {
      root.addEventListener('scroll', this.request, { capture: true, passive: true });
      for (const type of MOTION_EVENTS) root.addEventListener(type, this.onMotion, { capture: true, passive: true });
    }
    for (const element of this.chain) this.attributes?.observe(element, { attributes: true });
    this.resizes?.observe(document.documentElement);
    for (const element of [...followed, ...sized]) this.resizes?.observe(element);
    for (const element of followed) this.arm(element);
  }

  private unwatch() {
    for (const root of this.roots) {
      root.removeEventListener('scroll', this.request, { capture: true });
      for (const type of MOTION_EVENTS) root.removeEventListener(type, this.onMotion, { capture: true });
    }
    this.roots.clear();
    this.chain.clear();
    this.attributes?.disconnect();
    this.resizes?.disconnect();
    for (const observer of this.places.values()) observer.disconnect();
    this.places.clear();
  }

  /** A transition or an animation beginning on what is watched or on an ancestor of it: it may move it. */
  private readonly onMotion = (event: Event) => {
    const target = event.composedPath()[0];
    if (target instanceof Element && this.chain.has(target)) this.request();
  };

  /**
   * A size changed. Checked at once, in the same frame — with the sized elements (which the placement itself resizes: a
   * capped height) out of the observer until the next frame, so that placing inside the callback is not a resize loop.
   * Observing again reports each once more; a report of the size already seen is not a change.
   */
  private readonly onResize = (entries: ResizeObserverEntry[]) => {
    let changed = false;
    for (const entry of entries) {
      const size = sizeOf(entry);
      if (this.sizes.get(entry.target) !== size) changed = true;
      this.sizes.set(entry.target, size);
    }
    if (!changed || !this.active) return;
    for (const element of this.sized) this.resizes?.unobserve(element);
    this.now();
    if (!this.active || this.reobserve) return;
    this.reobserve = requestAnimationFrame(() => {
      this.reobserve = 0;
      if (!this.active) return;
      for (const element of this.sized) {
        // The size it has now is the one placed for, unless something else changed it since: the report says which.
        const box = element.getBoundingClientRect();
        this.sizes.set(element, `${box.width},${box.height}`);
        this.resizes?.observe(element);
      }
    });
  };

  /**
   * Watches one followed element's place: an IntersectionObserver whose root is the viewport cut down to the element's
   * box reports when the element is no longer where it was. Its first report is where it is (and the ratio a clipped
   * element is seen at, which the observer is then set to — once: a ratio the browser reports differently a second time
   * is watched as it is, not chased); the next one is a move.
   */
  private arm(element: Element, threshold = 1, adjusted = false) {
    this.places.get(element)?.disconnect();
    this.places.delete(element);
    if (typeof IntersectionObserver === 'undefined' || !element.isConnected) return;
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const root = element.ownerDocument.documentElement;
    const inset = (value: number) => `${-Math.floor(value)}px`;
    const rootMargin = `${inset(box.top)} ${inset(root.clientWidth - box.right)} ${inset(root.clientHeight - box.bottom)} ${inset(box.left)}`;
    let first = true;
    const report: IntersectionObserverCallback = (entries) => {
      const ratio = entries[entries.length - 1]!.intersectionRatio;
      if (first) {
        first = false;
        // Clipped (by the viewport, by a scroll container): watched at the ratio it is seen at; out of sight, for coming in.
        if (ratio !== threshold && !adjusted) this.arm(element, ratio === 0 ? Number.MIN_VALUE : ratio, true);
        return;
      }
      if (!this.active) return;
      this.arm(element);
      this.now();
    };
    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(report, { root: element.ownerDocument, rootMargin, threshold: Math.min(1, Math.max(0, threshold)) });
    } catch {
      // A document as the root is not everywhere: the top-level viewport then (right for a page that is not framed).
      observer = new IntersectionObserver(report, { rootMargin, threshold: Math.min(1, Math.max(0, threshold)) });
    }
    observer.observe(element);
    this.places.set(element, observer);
  }
}
