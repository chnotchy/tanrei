// Reads what two parts of one shape paint where they meet (CHK-22, RAD-24): an outline and the fill inside it are one
// shape when no pixel between them shows what is behind (a seam) and none is painted twice (an overlap). Layout cannot
// say that — both parts are where they should be — so the test draws the component at the device pixel ratios a
// browser's zoom gives (1.25, 1.5: an edge falls inside a pixel), at a half-pixel offset, on a background unlike either
// part, and reads the pixels.
import type { Browser, Locator, Page } from '@playwright/test';
import { type Pixels, decodePng, paintedColor } from './png.js';

/** The ratios the two `verify` paragraphs name: whole ones, and the fractional ones of a zoomed page. */
export const RATIOS = [1, 1.25, 1.5, 2, 3];
/** A saturated color no token of a box, ring or fill is near, so that a share of it in a pixel is seen. */
export const BEHIND = 'rgb(255, 0, 200)';

export type Rgb = [number, number, number];
const parse = (color: string): Rgb => {
  const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(color);
  if (!m) throw new Error(`not an opaque rgb() color: ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/** A page at `ratio` device pixels per CSS pixel (360 × 420 unless `viewport` says otherwise); closed with its context when `run` ends. */
export async function atRatio<T>(browser: Browser, ratio: number, run: (page: Page) => Promise<T>, viewport = { width: 360, height: 420 }): Promise<T> {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport, colorScheme: 'light' });
  try {
    return await run(await context.newPage());
  } finally {
    await context.close();
  }
}

/**
 * Puts `BEHIND` behind every fixture and moves them all by `offset` device pixels on both axes (layout, not a
 * transform: a transformed layer would be resampled, and the question is what the engine rasterizes).
 */
export const stageBehind = (page: Page, offset: number) =>
  page.evaluate(
    ([color, by]) => {
      const style = document.createElement('style');
      style.textContent = `body, .stage { background: ${color} !important; } main { margin-inline-start: ${by / devicePixelRatio}px; margin-block-start: ${by / devicePixelRatio}px; }`;
      document.head.append(style);
    },
    [BEHIND, offset] as const,
  );

/** A color as the engine paints it once over `BEHIND`. */
export const paintedBehind = async (page: Page, color: string): Promise<Rgb> => parse(await paintedColor(page, color, BEHIND));

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Shot {
  pixels: Pixels;
  /** Device pixels per CSS pixel, as the screenshot has them. */
  ratio: number;
  rgb(x: number, y: number): Rgb;
  /** An element's border box in the screenshot's device pixels, as layout places it. */
  box(locator: Locator): Promise<Box>;
}

/** The viewport as painted now (a running or paused transition is left where it is). */
export async function shoot(page: Page): Promise<Shot> {
  const pixels = decodePng(await page.screenshot({ scale: 'device', animations: 'allow' }));
  const ratio = pixels.width / (await page.evaluate(() => innerWidth));
  return {
    pixels,
    ratio,
    rgb: (x, y) => [pixels.data[(y * pixels.width + x) * 4], pixels.data[(y * pixels.width + x) * 4 + 1], pixels.data[(y * pixels.width + x) * 4 + 2]],
    box: (locator) =>
      locator.evaluate((el, k) => {
        const r = el.getBoundingClientRect();
        return { x: r.x * k, y: r.y * k, width: r.width * k, height: r.height * k };
      }, ratio),
  };
}

/**
 * How far the center of device pixel (x, y) lies inside a box with round corners of `radius` (device pixels; anything
 * from half the box's side up is a circle or a capsule): positive inside, by the distance to the nearest point of the edge.
 */
export function depth(box: Box, x: number, y: number, radius: number): number {
  const r = Math.min(radius, box.width / 2, box.height / 2);
  const [px, py] = [Math.abs(x + 0.5 - (box.x + box.width / 2)) - (box.width / 2 - r), Math.abs(y + 0.5 - (box.y + box.height / 2)) - (box.height / 2 - r)];
  const outside = Math.hypot(Math.max(px, 0), Math.max(py, 0));
  return r - outside - Math.min(Math.max(px, py), 0);
}

/**
 * How far `pixel` is from being a mix of `a` and `b` (the largest channel difference from the nearest point of the line
 * between them): 0 for either color and for every share of the two that adds up to the whole. A share of what is
 * behind (a seam) or a part painted twice (an overlap) takes the pixel off that line.
 */
export function offLine(pixel: Rgb, a: Rgb, b: Rgb): number {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const t = length ? Math.min(1, Math.max(0, ((pixel[0] - a[0]) * d[0] + (pixel[1] - a[1]) * d[1] + (pixel[2] - a[2]) * d[2]) / length)) : 0;
  return Math.max(...[0, 1, 2].map((k) => Math.abs(pixel[k] - (a[k] + t * d[k]))));
}

export interface Worst {
  /** The largest `offLine` among the pixels read, where, and what was painted there. */
  off: number;
  at: [number, number] | null;
  pixel: Rgb | null;
  /** How many pixels were read. */
  read: number;
}

/**
 * The engine may draw an edge up to half a device pixel from where layout puts it (it snaps a box to the pixel grid,
 * or it does not and antialiases the edge where it falls), so "more than one device pixel inside the outer edge" is
 * read as more than one and a half inside the edge layout gives: the outer edge's own antialiasing is never read as a
 * seam, and the line where the two parts meet — at least two device pixels in — always is.
 */
export const INSIDE = 1.5;

/**
 * Reads every pixel of `box` that lies more than `margin` device pixels inside its outer edge and reports the one
 * farthest from a mix of `a` and `b`.
 */
export function worst(shot: Shot, box: Box, radius: number, a: Rgb, b: Rgb, margin = INSIDE): Worst {
  if (box.x < 0 || box.y < 0 || box.x + box.width > shot.pixels.width || box.y + box.height > shot.pixels.height) throw new Error('the box is not wholly in the viewport that was read');
  const result: Worst = { off: 0, at: null, pixel: null, read: 0 };
  for (let y = Math.floor(box.y); y < Math.ceil(box.y + box.height); y++) {
    for (let x = Math.floor(box.x); x < Math.ceil(box.x + box.width); x++) {
      if (depth(box, x, y, radius) <= margin) continue;
      result.read++;
      const pixel = shot.rgb(x, y);
      const off = offLine(pixel, a, b);
      if (off > result.off || result.at === null) Object.assign(result, { off, at: [x, y], pixel });
    }
  }
  return result;
}

/**
 * Stops every transition running in the element's shadow tree (its pseudo-elements' too) at `share` of its own
 * duration, so that one frame of a motion can be read for as long as a screenshot takes.
 */
export const holdMotionAt = (host: Locator, share: number) =>
  host.evaluate((el, at) => {
    for (const a of el.shadowRoot!.getAnimations()) {
      a.pause();
      a.currentTime = Number(a.effect!.getComputedTiming().duration) * at;
    }
  }, share);
/** Ends every transition running in the element's shadow tree. */
export const endMotion = (host: Locator) => host.evaluate((el) => { for (const a of el.shadowRoot!.getAnimations()) a.finish(); });
