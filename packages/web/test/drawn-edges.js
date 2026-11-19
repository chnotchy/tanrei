// Where a picture's edges are drawn: the change of layout inside a box that keeps its size.
//
// A baseline comparison counts the pixels beyond a colour threshold (playwright.config.ts) and checks where the
// picture is drawn (test/drawn-box.js). Both miss what moves inside a box that keeps its size: a list whose box keeps
// its height and scrolls, whose rows moved from 48 to 40 CSS px, changed under 1 % of its pixels and drew the same
// box, so four stale baselines passed; a close button or a field that grew inside a larger picture did the same. So
// `expectBaseline` (test/baseline.ts) also compares the edges each picture draws — a glyph's outline, a border, the
// side of a fill: an edge of one picture that the other draws nowhere within `EDGE_REACH` device pixels has moved.
// A row of text that moved 8 CSS px moves hundreds of edge pixels together, a control that grew by a CSS px tens; a
// picture drawn again, by the same engine or another build of it, moves none, or a few scattered ones where
// antialiasing rounds a stem to the other pixel. A change of colour that keeps every edge in place is the pixel
// count's to see.
//
// It is plain JavaScript, with no imports, so that the Node tests (test/drawn-edges.test.mjs) load it as Playwright does.

/**
 * How far apart two neighbouring pixels are, in some channel (0–255), for the pair to be an edge of the picture: every
 * glyph, border and divider a person reads; not the gradient of a shadow, which changes a level or two a pixel.
 */
export const EDGE = 24;

/**
 * How far apart two neighbouring pixels of the other picture must be to be the same edge there. Lower than `EDGE`, so
 * an edge drawn near that level in both pictures, and over it in only one, is the same edge in both; the ink level of
 * the drawn box (test/drawn-box.js).
 */
export const EDGE_FAINT = 8;

/** How many device pixels an edge may move: the drawn box's tolerance, for the same reason (test/drawn-box.js). */
export const EDGE_REACH = 1;

/**
 * Edge pixels that moved within this many device pixels of each other are one change: the gap between the letters of
 * a word, so a word that moved is one change, not one per letter.
 */
export const EDGE_JOIN = 2;

/**
 * How many edge pixels one change must move for the picture to differ: 8 CSS px of edge at the baselines' scale of 2.
 * Measured on every baseline against a run of the whole suite in the CI container (arm64 Linux; the baselines are
 * recorded on x86_64), November 2026: every baseline recorded in the week before was drawn again to the same bytes,
 * and where a picture differed only by its antialiasing, a glyph's stem rounded to the other pixel, the largest change
 * was 7 edge pixels (a run of Japanese text) and 5 (Arabic). A row of text that moved moved about 300 to 650 edge
 * pixels in one change, a close button that grew 40 to 45, a word that moved by one CSS px 16 to 30.
 */
export const EDGE_CHANGE = 16;

/**
 * The largest difference, in some channel, between each pixel and its right or lower neighbour.
 * @param {{ width: number, height: number, data: Uint8Array | Buffer }} picture RGBA, row by row
 * @returns {Uint8Array}
 */
export function edgeLevels({ width, height, data }) {
  const levels = new Uint8Array(width * height);
  const row = width * 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let level = 0;
      for (let k = 0; k < 4; k++) {
        const here = data[i + k];
        if (x + 1 < width) level = Math.max(level, Math.abs(here - data[i + 4 + k]));
        if (y + 1 < height) level = Math.max(level, Math.abs(here - data[i + row + k]));
      }
      levels[y * width + x] = level;
    }
  }
  return levels;
}

/** The pixels whose level is over `level`, grown by `reach` device pixels on every side (a square). */
function near(levels, width, height, level, reach) {
  const across = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    let last = -Infinity;
    // a forward pass remembers the last edge to the left, a backward pass the next one to the right
    for (let x = 0; x < width; x++) {
      if (levels[y * width + x] > level) last = x;
      if (x - last <= reach) across[y * width + x] = 1;
    }
    let next = Infinity;
    for (let x = width - 1; x >= 0; x--) {
      if (levels[y * width + x] > level) next = x;
      if (next - x <= reach) across[y * width + x] = 1;
    }
  }
  const out = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    let last = -Infinity;
    for (let y = 0; y < height; y++) {
      if (across[y * width + x]) last = y;
      if (y - last <= reach) out[y * width + x] = 1;
    }
    let next = Infinity;
    for (let y = height - 1; y >= 0; y--) {
      if (across[y * width + x]) next = y;
      if (next - y <= reach) out[y * width + x] = 1;
    }
  }
  return out;
}

/**
 * The edge pixels of `from` that `to` draws no edge near: a mask.
 * @returns {{ mask: Uint8Array, count: number }}
 */
function unmatched(from, to, width, height) {
  const there = near(to, width, height, EDGE_FAINT, EDGE_REACH);
  const mask = new Uint8Array(width * height);
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (from[i] > EDGE && !there[i]) {
      mask[i] = 1;
      count++;
    }
  }
  return { mask, count };
}

/**
 * The groups of a mask's pixels, pixels within `EDGE_JOIN` of each other in one group, largest first: each with its
 * size and its box (device pixels, inclusive).
 */
function groups(mask, width, height) {
  const seen = new Uint8Array(width * height);
  const found = [];
  const stack = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const group = { pixels: 0, left: width, top: height, right: -1, bottom: -1 };
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      const x = p % width;
      const y = (p - x) / width;
      group.pixels++;
      if (x < group.left) group.left = x;
      if (x > group.right) group.right = x;
      if (y < group.top) group.top = y;
      if (y > group.bottom) group.bottom = y;
      for (let yy = Math.max(0, y - EDGE_JOIN); yy <= Math.min(height - 1, y + EDGE_JOIN); yy++) {
        for (let xx = Math.max(0, x - EDGE_JOIN); xx <= Math.min(width - 1, x + EDGE_JOIN); xx++) {
          const q = yy * width + xx;
          if (mask[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
      }
    }
    found.push(group);
  }
  return found.sort((a, b) => b.pixels - a.pixels);
}

/**
 * The edges of two pictures of the same size compared: the groups of edge pixels that one draws and the other does not
 * near them, each way, largest first. `moved` holds the groups of `EDGE_CHANGE` pixels or more, from both.
 * @param {{ width: number, height: number, data: Uint8Array | Buffer }} actual RGBA, row by row
 * @param {{ width: number, height: number, data: Uint8Array | Buffer }} expected RGBA, row by row
 */
export function edgeMoves(actual, expected) {
  const { width, height } = actual;
  if (expected.width !== width || expected.height !== height) throw new Error('edgeMoves compares pictures of the same size');
  const [now, then] = [edgeLevels(actual), edgeLevels(expected)];
  const added = groups(unmatched(now, then, width, height).mask, width, height).map((group) => ({ ...group, side: 'added' }));
  const lost = groups(unmatched(then, now, width, height).mask, width, height).map((group) => ({ ...group, side: 'lost' }));
  const moved = [...added, ...lost].filter((group) => group.pixels >= EDGE_CHANGE).sort((a, b) => b.pixels - a.pixels);
  return { added, lost, moved };
}

/**
 * The changes `edgeMoves` found, for a failure's message: how many, the box around them all, and the largest few.
 * @param {{ pixels: number, left: number, top: number, right: number, bottom: number, side: string }[]} moved
 */
export function describeEdgeMoves(moved) {
  if (moved.length === 0) return 'no edge moved';
  const box = moved.reduce((all, g) => ({ left: Math.min(all.left, g.left), top: Math.min(all.top, g.top), right: Math.max(all.right, g.right), bottom: Math.max(all.bottom, g.bottom) }));
  const one = (g) => `${g.pixels} edge px ${g.side === 'added' ? 'drawn only now' : 'drawn only in the baseline'} at ${g.left},${g.top} – ${g.right},${g.bottom}`;
  return `${moved.length} change${moved.length === 1 ? '' : 's'} in ${box.left},${box.top} – ${box.right},${box.bottom} (device px); the largest: ${moved.slice(0, 3).map(one).join('; ')}`;
}
