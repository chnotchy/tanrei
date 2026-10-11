import type { Locator, Page } from '@playwright/test';

/** Where a scroller is: both offsets, as the engine reports them. */
export interface RestingPlace {
  top: number;
  left: number;
}

/**
 * Waits until a scroller stands still — the same offsets in `frames` frames in a row — and returns where.
 *
 * A key or a turn of the wheel scrolls over some frames, and what a test does next has to meet a box at rest, as a
 * person's next key does: Chromium drops a scrolling key that arrives between the last frame of a key's smooth scroll
 * and that scroll's end; WebKit adds a key that arrives on the way to where the scroll was going; WebKit on Linux takes
 * one turn of the wheel in ten or so steps over about 230 ms. `scrollend` is no way to wait (Playwright's Firefox sends
 * none for a turn of the wheel), and a poll for "has moved" is satisfied by the first step.
 *
 * Give a locator for a scrolling box, or the page for the window's own scrolling.
 */
export const atRest = (target: Locator | Page, frames = 5): Promise<RestingPlace> =>
  ('keyboard' in target ? target.locator('html') : target).evaluate(async (given, count) => {
    // The window's own scrolling is read on the element that scrolls for it.
    const el = given === document.documentElement ? (document.scrollingElement ?? given) : given;
    for (let last = [Number.NaN, Number.NaN], same = 0; same < count; ) {
      await new Promise((r) => requestAnimationFrame(r));
      same = el.scrollTop === last[0] && el.scrollLeft === last[1] ? same + 1 : 0;
      last = [el.scrollTop, el.scrollLeft];
    }
    return { top: el.scrollTop, left: el.scrollLeft };
  }, frames);
