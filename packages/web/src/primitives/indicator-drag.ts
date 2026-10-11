import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { SHEET_FLING_VELOCITY, SheetDrag } from './sheet.js';

/**
 * A drag that carries a selection indicator along a row of equals (a navigation bar's active indicator, NVB-27…29; the
 * model is the tabs', TAB-28…30): the gesture, and the arithmetic of where the indicator is while the pointer is at a
 * place along the row. The row keeps its own geometry and drawing — what its indicator's box is on an item, how it is
 * painted and how it settles — and gives this the pieces that do not differ between rows.
 *
 * The gesture: a press with touch, a pen or a mouse becomes a drag once it has moved past the touch slop, further
 * sideways than up or down (`SheetDrag`: 8 px, the web names no slop of its own); a press that goes up or down first is
 * the page's for its whole length. Once taken, the pointer is captured, the click the release ends with is swallowed
 * (it is not a tap), and Escape, a cancelled pointer or a lost capture cancel it. Nothing is selected before the
 * release.
 */

/** An item the indicator may rest on (an enabled one), with its box along the row on the page (clientX). */
export interface IndicatorStop<T> {
  item: T;
  left: number;
  right: number;
}

/** Where the indicator is: between `from` (toward the left) and `to` (toward the right), `p` of the way; the same item twice at an end. */
export interface IndicatorPlace<T> {
  from: T;
  to: T;
  p: number;
}

/**
 * Where the indicator is while the pointer is at `x`: on a stop while the pointer is at that stop's centre, halfway
 * between two neighbouring stops where they meet (the middle of whatever lies between them: disabled items), at the
 * linear interpolation in between, and on the first or last stop before or beyond its centre. Nothing changes at the
 * place where two stops meet: it is only where `p` passes one half. `stops` are in the order they are drawn, left to
 * right.
 */
export function indicatorPlace<T>(stops: readonly IndicatorStop<T>[], x: number): IndicatorPlace<T> | null {
  if (!stops.length) return null;
  const centre = (stop: IndicatorStop<T>) => (stop.left + stop.right) / 2;
  let index = 0;
  while (index < stops.length - 1 && x >= centre(stops[index + 1])) index++;
  const [a, b] = [stops[index], stops[Math.min(index + 1, stops.length - 1)]];
  let p = 0;
  if (a !== b && x > centre(a)) {
    const meet = (a.right + b.left) / 2;
    p = x <= meet ? (0.5 * (x - centre(a))) / Math.max(meet - centre(a), 0.001) : 0.5 + (0.5 * (x - meet)) / Math.max(centre(b) - meet, 0.001);
    p = Math.min(1, Math.max(0, p));
  }
  return { from: a.item, to: b.item, p };
}

/**
 * What a release chooses: the stop the indicator is nearer to of the two it lies between (the one after it from
 * halfway on), or the one of the two a fling is toward — a release at least `SHEET_FLING_VELOCITY` fast along the row
 * (`velocity` in px per ms, positive toward the right).
 */
export function indicatorChoice<T>(place: IndicatorPlace<T>, velocity: number): T {
  if (Math.abs(velocity) >= SHEET_FLING_VELOCITY) return velocity > 0 ? place.to : place.from;
  return place.p >= 0.5 ? place.to : place.from;
}

export interface IndicatorDragOptions {
  /** Whether this press may become a drag (a selected item to carry the indicator from, a press on the row itself). */
  accepts: (event: PointerEvent) => boolean;
  /** The row took the drag, with the pointer at `x` (clientX): the pressed item's press ends, the indicator comes to the pointer. */
  taken: (x: number) => void;
  /** The pointer moved to `x` while the drag lasts. */
  moved: (x: number) => void;
  /** The drag was released at `x`, at `velocity` px per ms along the row (positive toward the right). */
  released: (x: number, velocity: number) => void;
  /** The drag was cancelled: the platform took the pointer back, the capture was lost, or Escape was pressed. */
  cancelled: () => void;
}

interface Gesture {
  drag: SheetDrag;
  /** `taken`: the indicator follows the pointer. `cancelled`: it has returned, and the pointer is still down. */
  state: 'pending' | 'taken' | 'cancelled';
}

/**
 * The gesture, as a Lit controller on the row's host: `pointerdown` on the host, the pointer followed on the window
 * until it is released (before the drag is taken nothing captures it, and a mouse may leave the row), `setPointerCapture`
 * once it is taken. The host leaves vertical drags to the page with `touch-action: pan-y` on the box that is pressed.
 */
export class IndicatorDragController implements ReactiveController {
  private gesture: Gesture | null = null;
  /** The click that follows a drag the row took is not a tap. */
  private swallowClick = false;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: IndicatorDragOptions,
  ) {
    host.addController(this);
    host.addEventListener('pointerdown', this.onPointerDown);
    host.addEventListener('lostpointercapture', this.onLostCapture);
    host.addEventListener('click', this.onClickCapture, { capture: true });
  }

  hostDisconnected() {
    const gesture = this.gesture;
    if (gesture) this.unwatch(gesture);
    this.swallowClick = false;
  }

  /** Whether the indicator follows the pointer now. */
  get taken(): boolean {
    return this.gesture?.state === 'taken';
  }

  /**
   * Ends a drag the row has taken without a release (the product set the selection, or took away an item under the
   * indicator): the pointer, still down, is ignored until it is released. `notify` calls `cancelled`.
   */
  cancel(notify = true) {
    const gesture = this.gesture;
    if (!gesture) return;
    if (gesture.state === 'pending') {
      this.end(gesture);
      return;
    }
    if (gesture.state !== 'taken') return;
    gesture.state = 'cancelled';
    window.removeEventListener('keydown', this.onKey, { capture: true });
    if (notify) this.options.cancelled();
  }

  /**
   * Lets one activation through while the click of the release is still swallowed: a release that chooses an item
   * activates it with the item's own click (a link is followed), and the click the browser sends after is still not a tap.
   */
  activate(click: () => void) {
    const swallow = this.swallowClick;
    this.swallowClick = false;
    try {
      click();
    } finally {
      this.swallowClick = swallow;
    }
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.swallowClick = false;
    // A press whose release never came here (a mouse released outside the window) is over.
    if (this.gesture && this.gesture.state !== 'taken') this.unwatch(this.gesture);
    if (this.gesture || !event.isPrimary || event.button !== 0) return;
    // A wheel or a trackpad moves nothing: only a pointer that presses.
    if (!['touch', 'pen', 'mouse'].includes(event.pointerType)) return;
    if (!this.options.accepts(event)) return;
    this.gesture = { drag: new SheetDrag(event, 'x'), state: 'pending' };
    this.watch(true);
  };

  private watch(on: boolean) {
    const listen = on ? window.addEventListener.bind(window) : window.removeEventListener.bind(window);
    listen('pointermove', this.onPointerMove as EventListener, { capture: true });
    listen('pointerup', this.onPointerUp as EventListener, { capture: true });
    listen('pointercancel', this.onPointerCancel as EventListener, { capture: true });
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.drag.id || gesture.state === 'cancelled') return;
    // A mouse that comes back with no button down was released where nothing heard it.
    if (gesture.state === 'pending' && event.pointerType === 'mouse' && event.buttons === 0) {
      this.end(gesture);
      return;
    }
    const step = gesture.drag.move(event);
    // Up or down first: the page's, for its whole length.
    if (gesture.drag.rejected) {
      this.end(gesture);
      return;
    }
    if (step === 'start') {
      gesture.state = 'taken';
      try {
        this.host.setPointerCapture(event.pointerId);
      } catch {
        // A pointer the browser does not know (a synthetic one) cannot be captured; its events still come here.
      }
      this.swallowClick = true;
      window.addEventListener('keydown', this.onKey, { capture: true });
      this.options.taken(event.clientX);
    }
    if (gesture.state !== 'taken') return;
    event.preventDefault();
    this.options.moved(event.clientX);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.drag.id) return;
    const taken = gesture.state === 'taken';
    const velocity = taken ? gesture.drag.velocity(event) : 0;
    this.end(gesture);
    if (taken) this.options.released(event.clientX, velocity);
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.drag.id) return;
    const taken = gesture.state === 'taken';
    this.end(gesture);
    if (taken) this.options.cancelled();
  };

  /** A capture lost while the drag lasts (not by its own release) cancels it. */
  private readonly onLostCapture = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.drag.id || gesture.state !== 'taken') return;
    this.end(gesture);
    this.options.cancelled();
  };

  /** Escape while a drag lasts cancels it, and nothing else hears that key. */
  private readonly onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || this.gesture?.state !== 'taken') return;
    event.preventDefault();
    event.stopPropagation();
    this.cancel();
  };

  private unwatch(gesture: Gesture) {
    window.removeEventListener('keydown', this.onKey, { capture: true });
    this.watch(false);
    if (this.gesture === gesture) this.gesture = null;
  }

  /** The pointer is up (or gone): the click that may follow is swallowed no longer than this task. */
  private end(gesture: Gesture) {
    const pending = gesture.state === 'pending';
    this.unwatch(gesture);
    if (pending) return;
    setTimeout(() => {
      this.swallowClick = false;
    });
  }

  private readonly onClickCapture = (event: MouseEvent) => {
    if (!this.swallowClick) return;
    this.swallowClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
}
