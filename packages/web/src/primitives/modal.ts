/**
 * The modal `<dialog>`s of Tanrei's surfaces open in this window, the topmost last: every surface opened with
 * `openModal()` (src/primitives/modal-exit.ts) — a dialog, a modal layer, a modal side or bottom sheet, a modal navigation
 * drawer, an image preview, a popover's sheet, a search's dialog and full-screen views, a modal date-time picker — is
 * added when `showModal()` has made it modal and deleted when it is no longer modal (`closeModal()`). Everything outside
 * the topmost is inert (HTML: "blocked by a modal dialog"), so a snackbar host shows its snackbar inside it (SNK-38);
 * anyone may subscribe to the change.
 */
const open: HTMLDialogElement[] = [];
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of [...listeners]) listener();
};

export const modalLayer = {
  /**
   * The topmost modal `<dialog>` of a Tanrei surface, or null. One taken out of the document, or closed by other means
   * than `closeModal()`, no longer counts.
   */
  get top(): HTMLDialogElement | null {
    for (let index = open.length - 1; index >= 0; index--) {
      const dialog = open[index];
      if (dialog.isConnected && dialog.matches(':modal')) return dialog;
    }
    return null;
  },
  /** `dialog` has just been made modal (`showModal()`): it is now the topmost. */
  add(dialog: HTMLDialogElement) {
    const at = open.indexOf(dialog);
    if (at >= 0) open.splice(at, 1);
    // The surfaces already open are now under this one, and inert: the platform says so of everything outside the
    // topmost modal dialog. WebKit keeps the style it computed for a `<dialog>` while it was the topmost — "not
    // inert" — when another opens above it, so a script could still focus what is inside the lower one (it
    // does the same with two bare `<dialog>`s).
    // The shadow tree it is in is styled again — the same sheets, given again — and the engine then reads it as it is.
    for (const under of open) {
      const root = under.getRootNode();
      if (root instanceof ShadowRoot) root.adoptedStyleSheets = [...root.adoptedStyleSheets];
    }
    open.push(dialog);
    notify();
  },
  /** `dialog` is no longer modal (`close()`, or taken out of the document). */
  delete(dialog: HTMLDialogElement) {
    const at = open.indexOf(dialog);
    if (at < 0) return;
    open.splice(at, 1);
    notify();
  },
  /** Calls `listener` whenever a modal surface opens or closes; returns the unsubscribe. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** The element that has focus, through shadow roots. */
export function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** Whether focus is inside `host`: in its light DOM, its shadow root, or a shadow root nested in either. */
export function focusWithin(host: Element): boolean {
  const active = deepActive();
  if (!active) return false;
  if (host.contains(active) || host.shadowRoot?.contains(active)) return true;
  let root = active.getRootNode();
  while (root instanceof ShadowRoot) {
    if (root.host === host || host.contains(root.host)) return true;
    root = root.host.getRootNode();
  }
  return false;
}

/**
 * Whether the engine reads `focusVisible` from the options of `focus()` (Chromium 145, Firefox 104, Safari 18.4). An
 * engine that does not know it leaves it unread, and draws the focus indicator its own way for a script's focus: where
 * the last focus was given from the keyboard, it draws one. Asked of a fresh element that is in no document, so that
 * asking moves no focus: the options are read before the element is.
 */
export function hasFocusVisibleOption(): boolean {
  let read = false;
  document.createElement('div').focus({
    get focusVisible() {
      read = true;
      return false;
    },
  } as FocusOptions);
  return read;
}

/**
 * A pointer's press (`mousedown`) on `element` while it has focus and draws the focus indicator, in an engine whose
 * `focus()` cannot be told to draw none (`hasFocusVisibleOption()` is false): focus is let go, so that the press's own
 * default gives it back, as a pointer's focus. Such an engine draws the indicator on a script's focus unless the last
 * focus was given by a pointer, and a press on the element that has focus already gives none — so the focus a component
 * moves elsewhere for that press (`focusVisible: false`) would draw it, as if a key had moved it. Called from a
 * `mousedown` listener that leaves the default alone: a touch sends `mousedown` once it is a tap, just before the
 * platform gives focus, never for a scroll. Where the engine knows the option, or the indicator is not drawn, nothing
 * happens.
 */
export function pressGivesFocus(event: MouseEvent, element: HTMLElement): void {
  if (event.button !== 0 || event.defaultPrevented) return;
  if ((element.getRootNode() as Document | ShadowRoot).activeElement !== element || !element.matches(':focus-visible')) return;
  if (!hasFocusVisibleOption()) element.blur();
}

/**
 * Focus back to `opener`, the element that had it when an overlay or a region opened (BSH-3, SSH-3) — or, where that
 * element is gone, cannot take focus or is inert, dropped from inside `host` (the platform's default: the document).
 */
export function returnFocus(opener: Element | null, host: Element) {
  const element = opener as HTMLElement | null;
  if (element && element.isConnected && typeof element.focus === 'function' && !element.closest('[inert]')) element.focus();
  else if (focusWithin(host)) (deepActive() as HTMLElement | null)?.blur();
}

/**
 * The elements Tab stops at inside `root`, in the order Tab visits them: through shadow roots and slots (a Tanrei
 * Button's native button, a slotted field), skipping what is disabled, hidden or inert.
 *
 * `root` itself is never one of them, whatever `tabIndex` it has: it is what the stops are inside of (Firefox reports
 * 0 for a `<dialog>` with no `tabindex`, and a trap that counted it wrapped to the dialog instead of its first
 * control). And what a shadow host holds is reached through its shadow tree alone — its slots, in the order the tree
 * places them — so a slotted element is listed once, where it is drawn, and a child that no slot takes is not listed.
 */
export function tabbables(root: Node): HTMLElement[] {
  const found: HTMLElement[] = [];
  const inside = (node: Node) => {
    // A host's light children are in the flat tree only where a slot of its shadow tree takes them.
    if (node instanceof Element && node.shadowRoot) visit(node.shadowRoot);
    else for (const child of node.childNodes) visit(child);
  };
  const visit = (node: Node) => {
    if (node instanceof HTMLSlotElement) {
      for (const assigned of node.assignedNodes({ flatten: true })) visit(assigned);
      return;
    }
    if (!(node instanceof HTMLElement)) {
      inside(node);
      return;
    }
    if (node.inert || node.hidden) return;
    if (typeof node.checkVisibility === 'function' && !node.checkVisibility({ visibilityProperty: true })) return;
    const disabled = 'disabled' in node && (node as HTMLButtonElement).disabled === true;
    if (!node.shadowRoot && node.tabIndex >= 0 && !disabled) found.push(node);
    else if (node.shadowRoot && node.hasAttribute('tabindex') && node.tabIndex >= 0) found.push(node);
    inside(node);
  };
  // The root is asked what it holds, not whether it is a stop.
  if (root instanceof HTMLSlotElement) visit(root);
  else if (!(root instanceof HTMLElement) || !(root.inert || root.hidden)) inside(root);
  return found;
}

/**
 * The focus trap of a modal overlay (DLG-3, NVD-19): Tab from the last focusable element inside `container` goes to the
 * first, Shift+Tab from the first (or from the container itself) to the last; with nothing focusable, the container keeps
 * focus. Call it from the container's `keydown` for Tab.
 */
export function trapFocus(event: KeyboardEvent, container: HTMLElement) {
  const order = tabbables(container);
  if (order.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }
  const active = deepActive();
  const first = order[0];
  const last = order[order.length - 1];
  const at = (element: Element) => active === element || (active instanceof Element && element.shadowRoot?.contains(active));
  if (event.shiftKey && (active === container || at(first))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && at(last)) {
    event.preventDefault();
    first.focus();
  }
}

/** The overlays holding the page's scroll, and what the root's own overflow was before the first of them. */
const holders = new Set<Element>();
let heldOverflow: string | null = null;
/** What the hold wrote on the root to keep the scroll bar's room, each with the root's own inline value of it. */
let heldRoom: [property: string, value: string][] = [];

/**
 * The room the window gains on its left and on its right while the page's scroll is held, where the hold cannot keep the
 * scroll bar's room for what is placed against the window (MDL-2): set on the root, as a length, only while the scroll is
 * held and only on a side that gained room — so a product reads it with a fallback, `var(--tanrei-scroll-hold-inset-right,
 * 0px)`. An element in `position: fixed` (or in the top layer) that stands against the window's edge adds it to its inset
 * on that side and stays where it was.
 */
export const SCROLL_HOLD_INSET = { left: '--tanrei-scroll-hold-inset-left', right: '--tanrei-scroll-hold-inset-right' } as const;

/**
 * Where the window's own box stands — the containing block of an element in `position: fixed` — read from such an
 * element, a child of the root, for the instant it is measured. The root's `clientWidth` does not say it: Chromium keeps a
 * stable gutter and reports it as no room taken.
 */
function windowBox(root: HTMLElement) {
  const probe = document.createElement('div');
  probe.style.cssText = 'position: fixed; left: 0; right: 0; top: 0; height: 0; margin: 0; padding: 0; border: 0; visibility: hidden; pointer-events: none';
  root.append(probe);
  const { left, right } = probe.getBoundingClientRect();
  probe.remove();
  return { left, right };
}

/**
 * Keeps the room the root's scroll bar took, as `overflow: hidden` takes the bar away (`holdPageScroll()`): measured from
 * the root as it stands with its own styles and the bar drawn, and written on it with what each property was.
 */
function keepRoom(root: HTMLElement) {
  const write = (property: string, value: string) => {
    heldRoom.push([property, root.style.getPropertyValue(property)]);
    root.style.setProperty(property, value);
  };
  const style = getComputedStyle(root);
  // The room is read from the root's own box, which a kept gutter narrows as the bar did — not from its clientWidth,
  // which leaves out only a scroll bar that is drawn: Chromium keeps the gutter and reports it as no room taken, and
  // padding over it would narrow the page by the bar's width again. It is read first: it lays the page out whole, and
  // Chromium's root clientWidth, read first after the root's overflow changed (as it does when the room is measured
  // again), still leaves out a bar that layout has just brought back (Linux, over overlay scroll bars, a styled bar).
  const width = root.getBoundingClientRect().width;
  const room = window.innerWidth - root.clientWidth > 0;
  // A root that keeps a stable gutter of its own keeps it (`both-edges` too); it is measured all the same, since an
  // engine that keeps no gutter for the bar keeps none for the root's either (WebKit, and Chromium over overlay scroll
  // bars, under a styled bar).
  const gutter = /stable/.test(style.getPropertyValue('scrollbar-gutter'));
  const side = root.clientLeft > 0 ? 'padding-left' : 'padding-right';
  const padding = style.getPropertyValue(side);
  const edges = room ? windowBox(root) : null;
  root.style.overflow = 'hidden';
  if (!edges) return;
  if (!gutter) write('scrollbar-gutter', 'stable');
  const lost = root.getBoundingClientRect().width - width;
  if (lost > 0) write(side, `calc(${padding} + ${lost}px)`);
  const held = windowBox(root);
  if (edges.left - held.left > 0) write(SCROLL_HOLD_INSET.left, `${edges.left - held.left}px`);
  if (held.right - edges.right > 0) write(SCROLL_HOLD_INSET.right, `${held.right - edges.right}px`);
}

/** Gives the root back what `keepRoom()` wrote on it, and its own overflow. */
function giveBackRoom(root: HTMLElement, overflow: string) {
  root.style.overflow = overflow;
  for (const [property, value] of heldRoom.reverse()) {
    if (value) root.style.setProperty(property, value);
    else root.style.removeProperty(property);
  }
  heldRoom = [];
}

/**
 * The window resized while the scroll is held — made shorter or taller, so that the bar would come back or would not;
 * zoomed, so that a bar's width in CSS pixels changes — has the room measured again, as it would be had the hold begun in
 * that window: given back and kept again within the `resize` event, so that no frame is drawn in between.
 */
function measureRoomAgain() {
  const root = document.documentElement;
  if (!root || heldOverflow === null) return;
  giveBackRoom(root, heldOverflow);
  keepRoom(root);
}

/**
 * The page's scroll, held while any modal overlay is open (DLG-1, NVD-19, MDL-2): `overflow: hidden` on the root from the
 * first holder until the last lets go, then the root's own value back. A root whose scroll bar takes room (a classic
 * scroll bar, not an overlay one) keeps that room while it is held, so that nothing behind moves sideways as the bar
 * goes and comes back: `scrollbar-gutter: stable` (unless the root keeps a stable gutter of its own), and — where the
 * engine keeps no gutter for the bar (WebKit, and Chromium over overlay scroll bars, the macOS default, for a bar styled
 * with `::-webkit-scrollbar`) — as much padding on the bar's side as the root's box grew. Padding keeps the page's
 * content in place but not the window's own box, which widens by the bar's width: an element in `position: fixed` across
 * the window would move. The room the window gained on each side is written on the root as `SCROLL_HOLD_INSET`,
 * measured, for such elements to add to their insets (a product's own; a snackbar's). The room is measured when the hold
 * begins and again each time the window is resized while it lasts. A root with no bar is given nothing: a stable gutter
 * where no bar is drawn would make room for one, and move the page.
 */
export function holdPageScroll(holder: Element, hold: boolean) {
  if (hold) holders.add(holder);
  else holders.delete(holder);
  const root = document.documentElement;
  // A document being torn down has no root element left to give back.
  if (!root) {
    heldOverflow = null;
    heldRoom = [];
    window.removeEventListener('resize', measureRoomAgain);
    return;
  }
  if (holders.size > 0 && heldOverflow === null) {
    heldOverflow = root.style.overflow;
    keepRoom(root);
    window.addEventListener('resize', measureRoomAgain);
  } else if (holders.size === 0 && heldOverflow !== null) {
    window.removeEventListener('resize', measureRoomAgain);
    giveBackRoom(root, heldOverflow);
    heldOverflow = null;
  }
}
