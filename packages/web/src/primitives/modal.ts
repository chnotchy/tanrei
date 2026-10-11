/**
 * The Tanrei modal overlays open in this window (a `<tanrei-dialog>` shown modally), for the overlays that wait for them
 * or pause under them: a snackbar that is not shown yet waits until the last one closes (SNK-12), and a showing one
 * pauses its timeout while one covers it (SNK-9). A modal overlay adds itself when it opens and removes itself when it
 * closes; anyone may subscribe to the change.
 */
const open = new Set<Element>();
const listeners = new Set<() => void>();

export const modalLayer = {
  /** Whether a Tanrei modal overlay is open in this window. */
  get covered(): boolean {
    return open.size > 0;
  },
  add(element: Element) {
    if (open.has(element)) return;
    // The overlays already open are now under this one, and inert: the platform says so of everything outside the
    // topmost modal dialog. WebKit keeps the style it computed for a `<dialog>` while it was the topmost — "not
    // inert" — when another opens above it, so a script could still focus what is inside the lower one (it
    // does the same with two bare `<dialog>`s).
    // Its shadow tree is styled again — the same sheets, given again — and the engine then reads it as it is.
    for (const under of open) {
      const root = under.shadowRoot;
      if (root) root.adoptedStyleSheets = [...root.adoptedStyleSheets];
    }
    open.add(element);
    for (const listener of [...listeners]) listener();
  },
  delete(element: Element) {
    if (!open.delete(element)) return;
    for (const listener of [...listeners]) listener();
  },
  /** Calls `listener` whenever a modal overlay opens or closes; returns the unsubscribe. */
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

/**
 * The page's scroll, held while any modal overlay is open (DLG-1, NVD-19): `overflow: hidden` on the root from the first
 * holder until the last lets go, then the root's own value back.
 */
export function holdPageScroll(holder: Element, hold: boolean) {
  if (hold) holders.add(holder);
  else holders.delete(holder);
  const root = document.documentElement;
  // A document being torn down has no root element left to give back.
  if (!root) {
    heldOverflow = null;
    return;
  }
  if (holders.size > 0 && heldOverflow === null) {
    heldOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
  } else if (holders.size === 0 && heldOverflow !== null) {
    root.style.overflow = heldOverflow;
    heldOverflow = null;
  }
}
