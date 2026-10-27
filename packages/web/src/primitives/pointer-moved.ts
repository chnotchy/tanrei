import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Whether a `pointermove` is the pointer moving — what "WHEN a pointer moves onto an option" (SEL-32, CMB-26) and
 * "onto an item" (MNU-8) ask.
 *
 * WebKit sends a `pointermove` (and a `mousemove`) to whatever comes under a pointer at rest once the page, or a box
 * under it, has scrolled: at the very place of the last one, a moment later. Chromium and Firefox send none. A list
 * that took it for a move made the option the content carried under a resting mouse the active one, taking it from the
 * keys: in Safari, a Down Arrow that scrolled a long list, or a field brought into view, lost the active option to the
 * row under the pointer a moment later.
 *
 * One listener on the window, in the capture phase — before any element hears the event — notes where each pointer
 * last was in the viewport, for every watcher connected (one listener however many lists there are, none once the last
 * is disconnected). `moved(event)` is false for an event at the place the same pointer last was, and true for any
 * other, and for one the listener did not hear (an event that does not reach the window).
 */
const places = new Map<number, { x: number; y: number }>();
let watchers = 0;
/** The last event the window heard, and whether it changed its pointer's place. */
let heard: Event | null = null;
let heardMoved = true;

function note(event: PointerEvent) {
  const last = places.get(event.pointerId);
  heard = event;
  heardMoved = !last || last.x !== event.clientX || last.y !== event.clientY;
  places.set(event.pointerId, { x: event.clientX, y: event.clientY });
}

/** A pointer that went up or was cancelled — a touch that ended, a pen lifted — leaves no place behind; a mouse keeps its own. */
function forget(event: PointerEvent) {
  if (event.pointerType !== 'mouse') places.delete(event.pointerId);
}

const FORGET = ['pointerup', 'pointercancel'] as const;

export class PointerMovedController implements ReactiveController {
  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected() {
    if (typeof window === 'undefined') return;
    if (watchers++ > 0) return;
    window.addEventListener('pointermove', note, { capture: true, passive: true });
    for (const type of FORGET) window.addEventListener(type, forget, { capture: true, passive: true });
  }

  hostDisconnected() {
    if (typeof window === 'undefined' || watchers === 0) return;
    if (--watchers > 0) return;
    window.removeEventListener('pointermove', note, { capture: true });
    for (const type of FORGET) window.removeEventListener(type, forget, { capture: true });
    places.clear();
    heard = null;
  }

  /** Whether `event`, a `pointermove`, moved its pointer: false where it is at the place that pointer last was. */
  moved(event: PointerEvent): boolean {
    return event === heard ? heardMoved : true;
  }
}
