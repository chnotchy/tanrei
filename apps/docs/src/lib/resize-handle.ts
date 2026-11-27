// The width handle of a fixture's stage (components/fixtures/ResizeHandle.astro): a vertical window splitter as the
// WAI-ARIA Authoring Practices describe one — a focusable `separator` with its value, its least and its greatest — moved
// by a pointer dragging it and by the keys: Left and Right Arrow move it, with Shift by a larger step, Home and End take
// it to its least and greatest value, and Enter takes it to its least and back to where it was.
//
// The handle says nothing of what it resizes. It reports each new value as a `docs-resize` event (`detail.value`, in CSS
// pixels), which bubbles, and the stage that holds it sets its own width (lib/fixture-stages.ts). So the handle can be
// replaced — by Tanrei's own splitter, when there is one — by an element that sends the same event, and nothing else
// changes.

export const RESIZE_EVENT = 'docs-resize';

export interface ResizeRange {
  /** The value now, the least and the greatest, asked each time they are needed (the room can change). */
  value(): number;
  min(): number;
  max(): number;
}

/** The step of an arrow key, and of an arrow key with Shift, in CSS pixels. */
const STEP = 16;
const LARGE_STEP = 64;

export function resizeHandle(handle: HTMLElement, range: ResizeRange): void {
  const clamp = (value: number) => Math.round(Math.min(range.max(), Math.max(range.min(), value)));
  let restore: number | undefined;
  const show = (value: number) => {
    handle.setAttribute('aria-valuemin', String(Math.round(range.min())));
    handle.setAttribute('aria-valuemax', String(Math.round(range.max())));
    handle.setAttribute('aria-valuenow', String(value));
  };
  const move = (value: number) => {
    const next = clamp(value);
    show(next);
    handle.dispatchEvent(new CustomEvent(RESIZE_EVENT, { bubbles: true, detail: { value: next } }));
  };
  // Its first value is read in a task after a frame has been laid out and painted, and not before the page has loaded:
  // read now, a handle set up as its stage is drawn laid the page out at once, for each stage drawn, between one stage's
  // writes and the next's; read in a frame callback, before that frame's layout, it laid out what the page's modules
  // had upgraded since the last frame, while the page loaded. Until then the separator has no value; a key or a
  // pointer reads the value it starts from itself.
  const first = () => requestAnimationFrame(() => setTimeout(() => handle.isConnected && show(clamp(range.value()))));
  if (document.readyState === 'complete') first();
  else addEventListener('load', first, { once: true });
  // The handle stands at the stage's end: in a right-to-left layout that is its left, and moving it left widens the stage.
  const sign = () => (getComputedStyle(handle).direction === 'rtl' ? -1 : 1);

  handle.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? LARGE_STEP : STEP;
    const now = range.value();
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = now + step * sign();
    else if (event.key === 'ArrowLeft') next = now - step * sign();
    else if (event.key === 'Home') next = range.min();
    else if (event.key === 'End') next = range.max();
    else if (event.key === 'Enter') {
      if (restore !== undefined && now <= range.min()) {
        next = restore;
        restore = undefined;
      } else {
        restore = now;
        next = range.min();
      }
    }
    if (next === undefined) return;
    event.preventDefault();
    move(next);
  });

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    handle.focus({ preventScroll: true });
    const start = range.value();
    const x = event.clientX;
    const direction = sign();
    handle.dataset.dragging = '';
    const follow = (moved: PointerEvent) => move(start + (moved.clientX - x) * direction);
    const stop = () => {
      delete handle.dataset.dragging;
      handle.removeEventListener('pointermove', follow);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
    };
    handle.addEventListener('pointermove', follow);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  });
}
