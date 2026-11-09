// Where a picture is drawn: the box around every pixel that is not the surface it is drawn on.
//
// A baseline comparison counts the pixels that differ by more than a colour threshold, and passes while they are fewer
// than a share of the picture (playwright.config.ts). That misses a component drawn light on a light surface: a white
// floating toolbar that grew from about 180 × 50 to 208 × 64 CSS px moved only its pale shadow, under 1 % of the picture's
// pixels beyond the threshold, and its stale baseline passed for weeks. So `expectBaseline` (test/baseline.ts) also
// compares where the two pictures are drawn: a box that moved or changed size by more than `BOX_TOLERANCE` device
// pixels is a different picture, however pale.
//
// It is plain JavaScript, with no imports, so that the Node tests (test/drawn-box.test.mjs) load it as Playwright does.

/**
 * How far, in any channel (0–255), a pixel must be from the surface to count as drawn. Below it are only the faintest
 * edges of a shadow or a scrim, which an engine may composite a level or two apart; above it, every border, fill, glyph
 * and shadow a person can see.
 */
export const INK = 8;

/**
 * How many device pixels an edge of the drawn box may move. One absorbs an edge pixel antialiased to either side of
 * the ink level; a move of one CSS pixel (two device pixels at the baselines' scale of 2) is past it.
 */
export const BOX_TOLERANCE = 1;

/**
 * The surface a picture is drawn on: the colour most of its border pixels have (a fixture's stage has padding of the
 * surface around what it shows). RGBA, 0–255.
 * @param {{ width: number, height: number, data: Uint8Array | Buffer }} picture RGBA, row by row
 * @returns {[number, number, number, number]}
 */
export function surfaceOf({ width, height, data }) {
  const counts = new Map();
  const count = (x, y) => {
    const i = (y * width + x) * 4;
    const key = ((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]) >>> 0;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (let x = 0; x < width; x++) {
    count(x, 0);
    count(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    count(0, y);
    count(width - 1, y);
  }
  let best = 0;
  let surface = 0;
  for (const [key, n] of counts) if (n > best) [best, surface] = [n, key];
  return [surface >>> 24, (surface >>> 16) & 255, (surface >>> 8) & 255, surface & 255];
}

/**
 * The box, in device pixels and inclusive, around every pixel more than `INK` from the picture's surface in some
 * channel; null when nothing is drawn.
 * @param {{ width: number, height: number, data: Uint8Array | Buffer }} picture RGBA, row by row
 * @returns {{ left: number, top: number, right: number, bottom: number } | null}
 */
export function drawnBox(picture) {
  const { width, height, data } = picture;
  const surface = surfaceOf(picture);
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (
        Math.abs(data[i] - surface[0]) > INK ||
        Math.abs(data[i + 1] - surface[1]) > INK ||
        Math.abs(data[i + 2] - surface[2]) > INK ||
        Math.abs(data[i + 3] - surface[3]) > INK
      ) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
}

/**
 * How far the drawn box of `actual` is from that of `expected`, in device pixels: the largest move of any edge
 * (Infinity when one picture draws nothing and the other something).
 * @param {{ left: number, top: number, right: number, bottom: number } | null} actual
 * @param {{ left: number, top: number, right: number, bottom: number } | null} expected
 */
export function boxMove(actual, expected) {
  if (!actual || !expected) return actual === expected ? 0 : Infinity;
  return Math.max(Math.abs(actual.left - expected.left), Math.abs(actual.top - expected.top), Math.abs(actual.right - expected.right), Math.abs(actual.bottom - expected.bottom));
}

/** A box as `left,top – right,bottom (width × height)` in device pixels, for a failure's message. */
export const describeBox = (box) => (box ? `${box.left},${box.top} – ${box.right},${box.bottom} (${box.right - box.left + 1} × ${box.bottom - box.top + 1} device px)` : 'nothing drawn');
