// A drag that moves fast and then holds still before its release, at exact page times. A release's velocity is the
// pointer's over its last moves, and none once the pointer has held still for longer than STOPPED_AFTER: someone who
// drags quickly, stops where they want and lets go there is not flung past it (the stillness each spec that flings
// names, POINTER_STOPPED_TIME in src/primitives/sheet.ts). Whether 41 ms or 40 ms passed between the last move and the
// release is a fact only on a held clock: real waits are lower bounds, and a round trip to the page can take longer
// than the whole threshold.
import type { Locator, Page } from '@playwright/test';
import { holdClock, releaseClock } from './page-clock.js';

/** How long a pointer may hold still before its release and still fling, in ms (`POINTER_STOPPED_TIME`). */
export const STOPPED_AFTER = 40;

export interface DragPoint {
  x: number;
  y: number;
}

export interface FlingThenHold {
  /** Where the pointer goes down, in the viewport. */
  from: DragPoint;
  /** Where it moves to, one move per point, `every` ms of page time apart. */
  moves: DragPoint[];
  /** The page time between two moves (and between the press and the first move), in ms. */
  every?: number;
  /** The page time between the last move and the release, in ms: above STOPPED_AFTER the pointer has stopped. */
  hold: number;
  pointerType?: 'touch' | 'pen' | 'mouse';
  pointerId?: number;
  /** Leaves the page clock held after the release, for a test that counts the time after it itself. */
  keepClock?: boolean;
}

/**
 * Dispatches a drag on `target` on a held page clock (`holdClock`): the press at `from`, each move `every` ms of page
 * time after the one before, then the release where the last move left the pointer, `hold` ms later. Each event's
 * `timeStamp` is the held page time it was dispatched at (Playwright's clock stamps events from its own time), so the
 * stillness before the release is exactly `hold`, however long the machine took between the steps. The events are
 * composed and bubble, as a browser's own do; the clock runs again at the machine's pace after the release.
 */
export async function flingThenHold(page: Page, target: Locator, drag: FlingThenHold): Promise<void> {
  const { from, moves, every = 4, hold, pointerType = 'touch', pointerId = 41, keepClock = false } = drag;
  const send = (type: string, at: DragPoint) =>
    target.evaluate(
      (el, { type, at, pointerType, pointerId }) => {
        el.dispatchEvent(
          new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId, pointerType, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: at.x, clientY: at.y }),
        );
      },
      { type, at, pointerType, pointerId },
    );
  await holdClock(page);
  await send('pointerdown', from);
  let last = from;
  for (const move of moves) {
    await page.clock.runFor(every);
    await send('pointermove', move);
    last = move;
  }
  await page.clock.runFor(hold);
  await send('pointerup', last);
  if (!keepClock) await releaseClock(page);
}

/** `count` moves from `from` by `step` each (x and y), for a fast drag: 10 px every 4 ms is 2.5 px per ms. */
export const strokes = (from: DragPoint, step: DragPoint, count = 3): DragPoint[] =>
  Array.from({ length: count }, (_, i) => ({ x: from.x + step.x * (i + 1), y: from.y + step.y * (i + 1) }));
