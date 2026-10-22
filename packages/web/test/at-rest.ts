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

/** An element's border box, as `getBoundingClientRect()` gives it. */
export interface RestingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Waits until an element's box stands still — the same border box in `frames` frames in a row — and returns it.
 *
 * For a box moved by a motion that no list of animations shows, once every motion the page can see has ended
 * (`motionEnded`, test/motions.ts): the height of a `<details>` element's content is a transition of its
 * `::details-content`, which `getAnimations()` lists in no engine and whose events reach no listener. It runs over the
 * same duration as the motions that come with it (a chevron's turn, an item's clock), but not on the same frames:
 * Chromium starts it a frame or two after them when a change turns a motion back, so it ends that much later, and a box
 * read in the task after they ended was a pixel short of its end on a CI runner. Counting frames and not time, this
 * waits as long as the motion takes on any machine and at any playback rate; a box that moves changes in every frame
 * (a layout unit is 1/64 px).
 */
export const boxAtRest = (target: Locator, frames = 3): Promise<RestingBox> =>
  target.evaluate(async (el, count) => {
    const read = () => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    };
    let last = read();
    for (let same = 0; same < count; ) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = read();
      same = now.left === last.left && now.top === last.top && now.width === last.width && now.height === last.height ? same + 1 : 0;
      last = now;
    }
    return last;
  }, frames);
