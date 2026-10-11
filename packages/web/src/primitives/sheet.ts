import { trapFocus } from './modal.js';

/**
 * What the sheets share (the bottom sheet, BSH-5 and BSH-9; the side sheet, SSH-4): the drag's two gesture constants,
 * a drag along one axis that knows its slop and its velocity, a modal sheet's keys, the reason a native close request
 * carries, the on-screen keyboard's cover and a press on a modal sheet's scrim. Each sheet keeps its own geometry and
 * its own close reasons.
 */

/**
 * How far a pointer must move along the sheet's axis before the sheet follows it (BSH-9). The web names no touch slop
 * of its own, so the spec's 8 points (px).
 */
export const SHEET_TOUCH_SLOP = 8;

/** A release at least this fast along the axis is a fling (BSH-9), in px per ms: the web names no minimum of its own. */
export const SHEET_FLING_VELOCITY = 0.5;

/** How far back the velocity of a release looks, in ms: a pointer that stopped longer ago than this releases at rest. */
const VELOCITY_WINDOW = 80;

/** What a move did to a drag: nothing yet, it just started following, it follows, or it is not the sheet's (across the axis). */
export type SheetDragStep = 'wait' | 'start' | 'follow' | 'reject';

/**
 * One pointer's drag along one axis (`y` for a bottom sheet, `x` for a side sheet). It does not follow before it has
 * moved `SHEET_TOUCH_SLOP` along the axis, more than across it; a drag that goes across first is not the sheet's. Its
 * velocity is measured over the last `VELOCITY_WINDOW` ms, in px per ms along the axis (positive: toward larger
 * coordinates, down or right).
 */
export class SheetDrag {
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  following = false;
  rejected = false;
  /** The pointer's position along the axis at the last move. */
  last: number;
  private readonly samples: { at: number; time: number }[] = [];

  constructor(
    event: PointerEvent,
    private readonly axis: 'x' | 'y',
  ) {
    this.id = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.last = this.along(event);
    this.samples.push({ at: this.last, time: event.timeStamp });
  }

  private along(event: PointerEvent): number {
    return this.axis === 'y' ? event.clientY : event.clientX;
  }

  /** The distance from where the drag began, along the axis. */
  distance(event: PointerEvent): number {
    return this.along(event) - (this.axis === 'y' ? this.startY : this.startX);
  }

  /** Feeds one move. */
  move(event: PointerEvent): SheetDragStep {
    if (event.pointerId !== this.id || this.rejected) return 'wait';
    const at = this.along(event);
    this.samples.push({ at, time: event.timeStamp });
    while (this.samples.length > 2 && event.timeStamp - this.samples[0].time > VELOCITY_WINDOW) this.samples.shift();
    if (this.following) return 'follow';
    const along = Math.abs(this.distance(event));
    const across = Math.abs(this.axis === 'y' ? event.clientX - this.startX : event.clientY - this.startY);
    if (along > SHEET_TOUCH_SLOP && along > across) {
      this.following = true;
      return 'start';
    }
    if (across > SHEET_TOUCH_SLOP && across >= along) this.rejected = true;
    return 'wait';
  }

  /** The move since the last call, along the axis (and remembers this position). */
  delta(event: PointerEvent): number {
    const at = this.along(event);
    const moved = at - this.last;
    this.last = at;
    return moved;
  }

  /** The velocity at release, px per ms along the axis; 0 when the pointer had stopped. */
  velocity(event: PointerEvent): number {
    const recent = this.samples.filter((sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW);
    if (recent.length < 2) return 0;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const time = last.time - first.time;
    return time > 0 ? (last.at - first.at) / time : 0;
  }
}

/** The last Escape key seen in this window, so a native `cancel` can tell Escape from the platform's back. */
let lastEscape = Number.NEGATIVE_INFINITY;
let watching = false;

/**
 * Why a modal sheet's native `<dialog>` fired `cancel` (a close request): `escape` when an Escape key has just been
 * pressed (focus was somewhere the sheet's own `keydown` did not see it), otherwise the platform's `back` (Android's
 * back gesture or button). Call `watchEscape()` once a sheet can be shown.
 */
export function closeRequestReason(event: Event): 'escape' | 'back' {
  return event.timeStamp - lastEscape < 1000 ? 'escape' : 'back';
}

/**
 * A modal sheet's keys, from its `<dialog>`'s `keydown` (BSH-2, BSH-5, BSH-23; SSH-2, SSH-4, SSH-15): Escape asks to
 * close — unless something answered it already or an overlay opened from the sheet's content is above it — and the
 * browser's own close request never runs; Tab stays inside the dialog.
 */
export function modalSheetKeys(event: KeyboardEvent, dialog: HTMLDialogElement, escape: () => void) {
  if (event.key === 'Escape') {
    if (event.defaultPrevented) return;
    if (event.composedPath().some((node) => node instanceof HTMLDialogElement && node !== dialog && node.open)) return;
    event.preventDefault();
    event.stopPropagation();
    escape();
    return;
  }
  if (event.key === 'Tab') trapFocus(event, dialog);
}

/** Starts watching Escape for `closeRequestReason()` (once per window). */
export function watchEscape() {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') lastEscape = event.timeStamp;
    },
    { capture: true },
  );
}

/**
 * How much of an area whose bottom edge is at `bottom` (viewport px; the layout viewport's bottom when omitted) the
 * on-screen keyboard covers: the part of the layout viewport below the visual viewport (BSH-6, BSH-7).
 */
export function keyboardCover(bottom?: number): number {
  const viewport = typeof window === 'undefined' ? null : window.visualViewport;
  if (!viewport) return 0;
  const layout = document.documentElement.clientHeight;
  const edge = bottom === undefined ? layout : Math.min(bottom, layout);
  return Math.max(0, edge - (viewport.offsetTop + viewport.height));
}

/** Whether a press on a modal `<dialog>` landed on its `::backdrop` (the scrim): on the dialog itself, outside its box. */
export function onBackdrop(event: MouseEvent, dialog: HTMLDialogElement | null): boolean {
  if (!dialog || event.composedPath()[0] !== dialog) return false;
  const box = dialog.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}
