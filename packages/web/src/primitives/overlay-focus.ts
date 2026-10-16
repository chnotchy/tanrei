import { type CSSResult, unsafeCSS } from 'lit';
import { deepActive, tabbables } from './modal.js';

// Where focus goes for an operated overlay that is not modal (a popover, POP-19, POP-20, POP-22, and every
// surface that cites its rules): into it when it opens, through it and out of it by Tab as if it stood directly after
// its opener in the document, and back to the opener when it closes. The surface is in the top layer, which changes
// where it is drawn and not where it is in the tab order, and its element need not follow its opener in the document —
// so the order is kept here, at the surface's two ends, and left to the browser between them.

type Maybe = Element | null | undefined;

/** What the person last acted with, once `watchInput()` has been called: a key, or a pointer. */
let lastInput: 'key' | 'pointer' | null = null;
let watching = false;

/**
 * Starts noting whether the person's last act was a key or a press (once per window), for an overlay that shows its
 * own focus indicator only when it was opened from the keyboard (POP-19). An overlay calls it when it connects, so
 * that the act that opens it has been seen.
 */
export function watchInput() {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  window.addEventListener('keydown', () => (lastInput = 'key'), { capture: true, passive: true });
  window.addEventListener('pointerdown', () => (lastInput = 'pointer'), { capture: true, passive: true });
}

/** Whether `element` is the focused element, or holds it in its own tree or in a shadow root inside it. */
function holdsFocus(element: Maybe, active: Element | null): boolean {
  if (!element || !active) return false;
  for (let node: Node | null = active; node; ) {
    if (node === element) return true;
    const parent: Node | null = node.parentNode;
    node = parent instanceof ShadowRoot ? parent.host : parent;
  }
  return false;
}

/**
 * POP-19: focus into an overlay that has just opened — to the element the product marked (`autofocus`, on an element
 * slotted into `host`), or to `surface` itself (which has `tabindex="-1"`), so that assistive technology reads its
 * name first and the next Tab reaches its first focusable element.
 */
export function focusOverlay(host: Element, surface: HTMLElement) {
  const marked = host.querySelector<HTMLElement>('[autofocus]');
  if (marked && !marked.closest('[inert]') && typeof marked.focus === 'function') {
    marked.focus({ preventScroll: true });
    if (holdsFocus(marked, deepActive())) return;
  }
  // Opened by a press, it takes focus without an indicator of its own — `data-focus-quiet`, which the component's
  // styles answer (`quietFocus()`): a browser decides `:focus-visible` for a focus a script moves by where focus was,
  // which says nothing of how the overlay was opened.
  surface.toggleAttribute('data-focus-quiet', lastInput === 'pointer');
  surface.focus({ preventScroll: true });
}

/**
 * The rules that keep an overlay's own focus indicator from showing when it took focus as it was opened by a press
 * (POP-19): `on` is the selector of the element `focusOverlay()` focuses, which carries a `focusRing()`.
 */
export function quietFocus(on: string): CSSResult {
  return unsafeCSS(`
  ${on}[data-focus-quiet]:focus-visible {
    outline: none;
  }
  ${on}[data-focus-quiet]:focus-visible::after {
    display: none;
  }
`);
}

export interface OverlayTabOptions {
  /** The focusable box of the overlay, which holds everything Tab stops at in it. */
  surface: HTMLElement;
  /** The overlay's element: skipped by the browser's own Tab while focus leaves past its end. */
  host: HTMLElement;
  /** The element the overlay stands after in the focus order. */
  opener: HTMLElement | null;
}

/**
 * POP-20: Tab at an overlay's two ends, as if it stood directly after its opener. Tab on the opener moves to the
 * overlay's first focusable element; Shift+Tab from that element (or from the overlay itself) moves back to the
 * opener; Tab from its last focusable element moves on to what follows the opener in the page's order — focus goes to
 * the opener first and the key's own move goes on from there, with the overlay skipped. Between its ends the browser
 * moves focus, in the order the overlay's parts are placed, and nothing wraps. Call it for a Tab pressed on the opener
 * or inside the overlay, once everything inside has heard the key.
 */
export function tabThroughOverlay(event: KeyboardEvent, { surface, host, opener }: OverlayTabOptions) {
  // With Control or Command the key is the browser's (its own tabs); Option is Safari's Tab to every control.
  if (event.key !== 'Tab' || event.defaultPrevented || event.ctrlKey || event.metaKey) return;
  const active = deepActive();
  const order = tabbables(surface);
  const first = order[0];
  const last = order[order.length - 1];
  if (holdsFocus(opener, active) && !holdsFocus(host, active)) {
    // Shift+Tab on the opener leaves both, as it would with the overlay closed.
    if (event.shiftKey || !first) return;
    event.preventDefault();
    first.focus();
    return;
  }
  if (!holdsFocus(host, active) || !opener) return;
  const onSurface = active === surface;
  if (event.shiftKey) {
    if (!onSurface && !holdsFocus(first, active)) return;
    event.preventDefault();
    opener.focus();
    return;
  }
  if (onSurface && first) {
    event.preventDefault();
    first.focus();
    return;
  }
  if (!onSurface && !holdsFocus(last, active)) return;
  // Past its end: from the opener, on to what follows it — the browser's own move, which must not come back in here
  // where the overlay's element happens to follow its opener in the document.
  opener.focus({ preventScroll: true });
  skipDuringMove(host, opener, event);
}

/**
 * POP-20: `host` is left out (`inert`) of the move that `key`, a Tab, makes from `opener`, and only of that move. It is
 * over when focus leaves the opener — on to the next element, or out of the window — or, for a Tab that something
 * cancelled and that moves nothing, when the key comes up; a press or another key is a new act, and ends it too. Never
 * a timer: the browser may run one after later tasks, and the overlay would stay out of reach of focus the product
 * moves into it right away.
 */
function skipDuringMove(host: HTMLElement, opener: HTMLElement, key: KeyboardEvent) {
  const was = host.inert;
  host.inert = true;
  const over = (event: Event) => {
    // The key's own keydown, heard further along its way: the move has not been made yet.
    if (event === key) return;
    if (event.type === 'keyup' && (event as KeyboardEvent).key !== 'Tab') return;
    opener.removeEventListener('focusout', over, true);
    window.removeEventListener('keyup', over, true);
    window.removeEventListener('keydown', over, true);
    window.removeEventListener('pointerdown', over, true);
    host.inert = was;
  };
  opener.addEventListener('focusout', over, true);
  window.addEventListener('keyup', over, true);
  window.addEventListener('keydown', over, true);
  window.addEventListener('pointerdown', over, true);
}

/**
 * POP-22: focus when an overlay closes. Back to `opener` if it was inside the overlay (`inside` says so of the focused
 * element: the overlay, and every overlay opened from inside it) or was lost with it; left where the person put it if
 * they moved it to another element. Where the opener is gone or cannot take focus, focus is dropped from inside (the
 * platform's default for a closed overlay). Call it as the overlay closes, before anything is hidden.
 */
export function returnOverlayFocus(opener: HTMLElement | null, inside: (node: Element) => boolean) {
  const active = deepActive();
  const lost = !active || active === document.body || active === document.documentElement;
  if (!lost && !inside(active)) return;
  if (opener && opener.isConnected && typeof opener.focus === 'function' && !opener.closest('[inert]')) {
    if (!holdsFocus(opener, active)) opener.focus({ preventScroll: true });
  } else if (!lost) (active as HTMLElement).blur?.();
}

/**
 * POP-22: a press outside that landed on nothing focusable takes focus away from the page once the press is over,
 * after the overlay it closed has already given focus back: when that press ends with focus lost, the opener takes it
 * again. Call it when the overlay closes for a press outside.
 */
export function keepOverlayFocusAfterPress(opener: HTMLElement | null) {
  if (!opener) return;
  const check = () => {
    const active = deepActive();
    if ((!active || active === document.body || active === document.documentElement) && opener.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
  };
  const after = () => setTimeout(check, 0);
  // The press moves focus as it goes down (a mouse) or after it is lifted (a touch): looked at after both.
  after();
  const lifted = () => {
    window.removeEventListener('pointerup', lifted, true);
    window.removeEventListener('pointercancel', lifted, true);
    after();
  };
  window.addEventListener('pointerup', lifted, true);
  window.addEventListener('pointercancel', lifted, true);
}
