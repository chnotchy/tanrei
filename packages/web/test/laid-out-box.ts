import type { Locator } from '@playwright/test';

/** An element's border box in the window: its place and its size. */
export interface LaidOutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * An element's border box as the engine laid it out: its `getBoundingClientRect()`, whose width and height are the
 * box's own size, not the difference of its two edges.
 *
 * Playwright's `boundingBox()` gives the corners of the box, and in Firefox a corner is a 32-bit float: a box that
 * begins part of a pixel down — under a line of the page's text, as a product's controls stand — has two edges that
 * are each rounded on their own, and its height reads 24.0000305 or 36.0000610 where the box is 24 or 36 high, with
 * no layout of any engine behind the difference. The rectangle the page reads is the engine's own (app units in
 * Firefox, 1/64 px elsewhere): two boxes of one size have the same width and height wherever they stand.
 */
export const laidOutBox = (target: Locator): Promise<LaidOutBox> =>
  target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
