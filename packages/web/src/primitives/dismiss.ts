import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { deepActive } from './modal.js';

// How an operated overlay that is not modal is dismissed — a popover (POP-21 to POP-24), and every
// surface that opens beside a control and cites its rules: Escape, a press outside, and focus leaving. Two halves:
//
//  - The overlays of a window know what opened them (`registerOverlay`). An overlay drawn in the top layer is nowhere
//    near its opener on the screen, and need not be near it in the document either (a menu names its anchor by id), so
//    "inside" is not a question of the DOM alone: a node is inside a surface when the surface is one of its *logical
//    ancestors* — its ancestors in the flat tree and, at each overlay on the way, the ancestors of whatever opened that
//    overlay (`logicalAncestors`). A menu opened from a button in a popover is inside the popover wherever it is.
//
//  - `DismissController` listens while its surface is shown and asks its host to close: a press whose target is not
//    inside (`outside`), focus arriving on an element that is not inside (`focus-out`), and Escape when nothing inside
//    took the key (`escape`). It asks once for one act of the person (a press that also moves focus asks once), and it
//    never closes anything itself: the host emits its event and the product, or a binding, closes.
//
// Escape is answered by the topmost surface alone, and only when the key reaches it: an overlay opened from inside (a
// menu, a tooltip) or an element inside (a field clearing its value) that takes the key stops it on the way, so the
// surface listens where the key leaves it — at its own edge, after everything inside has heard it — and stops it
// there, so that it goes no further (a dialog the surface stands in stays open).

type Maybe = Element | null | undefined;

/** What an overlay tells the window about itself while it is connected. */
export interface OverlayEntry {
  /** The elements that opened it and that it stands against (its anchor, its opener): what it is logically inside. */
  openers: () => Iterable<Maybe>;
  /** Whether it is shown now. */
  open: () => boolean;
  /** Whether it is modal while shown (it then stays open when the surface it was opened from closes). */
  modal?: () => boolean;
  /** Closes it at once, with no reason of the person's: the surface it was opened from closed (POP-24). */
  close?: () => void;
  /** Its kind, for a count of how deep one kind is nested (POP-24: a popover in a popover in a popover). */
  kind?: string;
}

const overlays = new Map<Element, OverlayEntry>();

/** Makes an overlay known to the window for as long as it is connected; returns the function that withdraws it. */
export function registerOverlay(host: Element, entry: OverlayEntry): () => void {
  overlays.set(host, entry);
  return () => {
    if (overlays.get(host) === entry) overlays.delete(host);
  };
}

/**
 * A node's logical ancestors, itself first: its ancestors in the flat tree (through slots and shadow roots) and, at
 * each registered overlay on the way, the ancestors of what opened it.
 */
export function* logicalAncestors(node: Node | null | undefined): Generator<Node> {
  const seen = new Set<Node>();
  const queue: Node[] = node ? [node] : [];
  while (queue.length) {
    let at: Node | null = queue.shift()!;
    while (at && !seen.has(at)) {
      seen.add(at);
      yield at;
      if (at instanceof Element) {
        const entry = overlays.get(at);
        if (entry) for (const opener of entry.openers()) if (opener) queue.push(opener);
      }
      const parent: Node | null = (at instanceof Element ? at.assignedSlot : null) ?? at.parentNode;
      at = parent instanceof ShadowRoot ? parent.host : parent;
    }
  }
}

/** How many overlays of `kind` a node is logically inside, the node's own overlay included (POP-24). */
export function overlayDepth(node: Node, kind: string): number {
  let depth = 0;
  for (const ancestor of logicalAncestors(node)) if (ancestor instanceof Element && overlays.get(ancestor)?.kind === kind) depth++;
  return depth;
}

/** Why a surface asks to be closed by itself. */
export type DismissReason = 'escape' | 'outside' | 'focus-out';

type Host = ReactiveControllerHost & HTMLElement;

export interface DismissOptions {
  /** The anchor and the opener: a press on them is never outside, and focus on them has not left (POP-21). */
  related: () => Iterable<Maybe>;
  /** Asks the host to close; called once for one act of the person. */
  request: (reason: DismissReason, event: Event) => void;
  /**
   * Tab pressed on the surface's side of its edge — inside it, or on a related element — after everything inside has
   * heard the key: where the host keeps the focus order (POP-20).
   */
  tab?: (event: KeyboardEvent) => void;
}

/** The surfaces shown now, the topmost last: Escape is the last one's. */
const shown: DismissController[] = [];

/** The window's one key listener, there while any surface is shown. */
function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape' && event.key !== 'Tab') return;
  const path = event.composedPath();
  const escape = event.key === 'Escape';
  // Tab is each surface's own business; Escape is the topmost one's, wherever in the window the key was pressed.
  const controller = escape ? shown[shown.length - 1] : [...shown].reverse().find((each) => each.edge(path) !== null);
  if (!controller) return;
  // Where the key leaves the surface: the outermost node it passes that is the surface's — or, pressed outside every
  // surface, the window.
  const edge: EventTarget = controller.edge(path) ?? shown.map((each) => each.edge(path)).find((found) => found !== null) ?? window;
  const answer = (at: Event) => {
    const key = at as KeyboardEvent;
    if (key !== event || !controller.active) return;
    if (!escape) {
      controller.options.tab?.(key);
      return;
    }
    // POP-23: something inside took the key for itself (it stopped it or cancelled it), or it is composing text.
    if (key.defaultPrevented || key.cancelBubble || key.isComposing) return;
    key.preventDefault();
    key.stopPropagation();
    controller.ask('escape', key);
  };
  edge.addEventListener('keydown', answer, { once: true });
  // A key stopped before it reached the edge never calls the listener: it is taken back once the key has been heard.
  setTimeout(() => edge.removeEventListener('keydown', answer), 0);
}

/**
 * Asks its host to close on Escape, on a press outside and on focus leaving (POP-21, POP-23, POP-24). `start()` when
 * the surface is shown, `stop()` when it is hidden; it also stops when the host is disconnected.
 */
export class DismissController implements ReactiveController {
  active = false;
  /** Modal overlays opened from inside the surface, which the DOM does not put inside it (POP-24). */
  private readonly adopted = new WeakSet<Element>();
  /** Whether the person's last press or key was inside the surface: a modal overlay that opens next is its own. */
  private actedInside = false;
  private asked = false;
  private reset: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly host: Host,
    readonly options: DismissOptions,
  ) {
    host.addController(this);
  }

  hostDisconnected() {
    this.stop();
  }

  start() {
    if (this.active || typeof window === 'undefined') return;
    this.active = true;
    this.asked = false;
    this.actedInside = this.owns(deepActive());
    if (shown.length === 0) window.addEventListener('keydown', onKey, true);
    shown.push(this);
    document.addEventListener('pointerdown', this.onPress, true);
    document.addEventListener('focusin', this.onFocus, true);
    document.addEventListener('keydown', this.onAct, true);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    clearTimeout(this.reset);
    this.asked = false;
    const at = shown.indexOf(this);
    if (at >= 0) shown.splice(at, 1);
    if (shown.length === 0) window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', this.onPress, true);
    document.removeEventListener('focusin', this.onFocus, true);
    document.removeEventListener('keydown', this.onAct, true);
  }

  /** Whether `node` is the surface's: the host itself, a related element, or an adopted modal overlay. */
  private own(node: unknown): node is Element {
    if (!(node instanceof Element)) return false;
    if (node === this.host || this.adopted.has(node)) return true;
    for (const related of this.options.related()) if (related === node) return true;
    return false;
  }

  /**
   * Whether `node` is inside the surface (POP-21, POP-24): in the host, in its anchor or its opener, or in an overlay
   * opened from inside any of them, however deep.
   */
  owns(node: Node | null | undefined): boolean {
    for (const ancestor of logicalAncestors(node)) if (this.own(ancestor)) return true;
    return false;
  }

  /** @internal Where a key that came along `path` leaves the surface: the outermost node of the path that is its own. */
  edge(path: EventTarget[]): EventTarget | null {
    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (this.own(node)) return node;
      // An overlay opened from inside, standing somewhere else in the document: the key leaves the surface where it leaves that overlay.
      if (node instanceof Element && overlays.has(node) && this.owns(node)) return node;
    }
    return null;
  }

  /** @internal Asks once for one act of the person: a press outside that also moves focus is one request. */
  ask(reason: DismissReason, event: Event) {
    if (!this.active || this.asked) return;
    this.asked = true;
    clearTimeout(this.reset);
    // The host may decline (a product that keeps the surface open): the next act asks again. A press or a key says
    // itself that it is a new act; a press is over only at the next one (a touch moves focus after it is lifted, which
    // is still that press); anything else is over once this task is.
    if (reason !== 'outside') this.reset = setTimeout(() => (this.asked = false), 0);
    this.options.request(reason, event);
  }

  /**
   * POP-24: every overlay opened from inside the surface that is not modal closes with it, at once. Called by the host
   * when it closes.
   */
  closeOwned() {
    for (const [overlay, entry] of [...overlays]) {
      if (overlay === this.host || !entry.close || !entry.open() || entry.modal?.()) continue;
      if ([...entry.openers()].some((opener) => !!opener && this.owns(opener))) entry.close();
    }
  }

  /** A key: a new act of the person's, which may ask again. */
  private readonly onAct = (event: Event) => {
    this.asked = false;
    this.actedInside = this.owns(event.composedPath()[0] as Node);
  };

  /** POP-21: a press outside the surface, its anchor, its opener and every overlay opened from inside it. */
  private readonly onPress = (event: PointerEvent) => {
    // A new act of the person's, which may ask again.
    this.asked = false;
    const target = event.composedPath()[0] as Node;
    const inside = this.owns(target) || this.adopt(target);
    this.actedInside = inside;
    if (!inside) this.ask('outside', event);
  };

  /**
   * POP-21: focus arriving on an element outside all of those. Focus that leaves the window arrives nowhere, and a
   * reading cursor moves no focus: neither is seen here.
   */
  private readonly onFocus = (event: FocusEvent) => {
    const target = event.composedPath()[0] as Node;
    if (this.owns(target) || this.adopt(target)) return;
    this.ask('focus-out', event);
  };

  /**
   * POP-24: a modal overlay (a dialog, a modal sheet) that opened after the person acted inside the surface is the
   * surface's own, wherever it stands in the document: `node` is in one, and it is adopted.
   */
  private adopt(node: Node): boolean {
    if (!this.actedInside) return false;
    // A modal overlay the surface itself stands in is not one it opened (POP-25).
    const around = new Set(logicalAncestors(this.host));
    for (const ancestor of logicalAncestors(node)) {
      if (!(ancestor instanceof Element) || around.has(ancestor)) continue;
      const modal = (ancestor instanceof HTMLDialogElement && ancestor.matches(':modal')) || (overlays.get(ancestor)?.modal?.() ?? false);
      if (!modal) continue;
      // The dialog element of a component is in its shadow root: the component is adopted with it.
      this.adopted.add(ancestor);
      const root = ancestor.getRootNode();
      if (root instanceof ShadowRoot) this.adopted.add(root.host);
      return true;
    }
    return false;
  }
}
