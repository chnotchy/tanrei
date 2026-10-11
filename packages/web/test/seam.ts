// Reads what is painted where two joined parts meet (BGR-22, BGR-24, SPB-26, SPB-31): the seam of a connected button
// group's items, or of a button with menu's halves, under a divider. Layout cannot say it — both parts are where they
// should be — and a tolerance cannot either: a fill painted twice in a strip one pixel wide, or an outline whose two
// strokes overlap by a pixel, is a few levels off on the surface it was designed on. So the parts are drawn on a
// background unlike any of them (`stageBehind`, test/one-shape.ts), where a translucent fill painted twice, or a share
// of the page between two fills, is far off, and every pixel beside the seam is compared with the same part's own
// pixels a little further from it.
//
// What is read is every line of pixels that crosses the seam between an edge of the joined shape and the nearer end of
// the divider's rule — the outline's lines first, then the fill's — at both ends of the seam: the stretch on which
// nothing but the two parts is drawn. (The rule's own stretch is the divider tests'.) Each such line must be:
//
//   'one'  the same color all the way through the seam: one fill, one outline of even color (two parts that rest on
//          the same fill and state);
//   'two'  the first part's color up to one pixel and the second part's from the next: no third color, and neither
//          color again once it has ended (a selected toggle beside an unselected one — BGR-24 draws no rule there).
//
// Read at whole device pixel ratios, at any offset: there two neighbouring boxes meet on one device pixel in every
// engine. At a fractional ratio an engine antialiases, or rounds, the edge between ANY two neighbouring boxes — a page
// shows through two plain `div`s that touch — which no component can undo.
import type { Box, Rgb, Shot } from './one-shape.js';

export interface SeamOptions {
  /** The parts stand in a column: the seam is horizontal, and the lines read are vertical. */
  column?: boolean;
  /** How far the divider's rule stops short of each end of the seam, in device pixels. */
  inset: number;
  /** What each line through the seam must be (see above). */
  expect: 'one' | 'two';
  /**
   * Also read this many lines just outside each edge of the parts (an elevation's ring, which a Button draws around
   * its box), within `slack` levels: the blurred layers of two boxes that are cut where they meet differ by a level or two.
   */
  outside?: number;
  slack?: number;
  /**
   * How far from the seam a part is still straight, in CSS pixels: a part's own color is read six from the seam, or
   * this far where that is less (never nearer than the three beside the seam that are compared with it). A part whose
   * round end begins nearer the seam than six — a large narrow trailing half of a button with menu — names it, or its
   * outline is read where it has already turned.
   */
  reference?: number;
}
export interface SeamRead {
  /** The lines of pixels read. */
  lines: number;
  /** What was off, at most eight of them: where, what was painted, and what the line's own color is. */
  off: string[];
}

const far = (a: Rgb, b: Rgb) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

/**
 * Reads the seam between two parts whose boxes (device pixels, `shot.box()`) touch. `first` and `second` in any order:
 * the one nearer the origin is taken first.
 */
export function readSeam(shot: Shot, first: Box, second: Box, { column = false, inset, expect, outside = 0, slack = 1, reference: straight = 6 }: SeamOptions): SeamRead {
  const [a, b] = (column ? first.y <= second.y : first.x <= second.x) ? [first, second] : [second, first];
  const seam = Math.round(column ? a.y + a.height : a.x + a.width);
  const [from, to] = column ? [Math.max(a.x, b.x), Math.min(a.x + a.width, b.x + b.width)] : [Math.max(a.y, b.y), Math.min(a.y + a.height, b.y + b.height)];
  const at = (across: number, along: number): Rgb => (column ? shot.rgb(along, across) : shot.rgb(across, along));
  // Across the seam: three CSS pixels on each side of it, compared with the part's color six from it.
  const [near, reference] = [Math.ceil(3 * shot.ratio), Math.round(Math.min(6, Math.max(3, straight)) * shot.ratio)];
  // A CSS pixel short of the rule's end, so that the rule's own antialiased end is never read as a part.
  const stretch = Math.max(0, Math.round(inset - shot.ratio));
  // The parts' first and last lines of pixels. An edge that layout puts on a device pixel is drawn there. One it puts
  // between two is snapped to one of them, and not by every engine to the same one: the line it may be on is left out
  // (it is read wherever the offset is whole).
  const whole = (value: number) => Math.abs(value - Math.round(value)) < 0.01;
  const [start, end] = [Math.round(from) + (whole(from) ? 0 : 1), Math.round(to) - (whole(to) ? 0 : 1)];
  const lines: [number, number][] = [];
  for (let k = 0; k < stretch; k++) lines.push([start + k, 1], [end - 1 - k, 1]);
  if (whole(from) && whole(to)) for (let k = 1; k <= outside; k++) lines.push([start - k, slack], [end - 1 + k, slack]);
  const result: SeamRead = { lines: 0, off: [] };
  const report = (across: number, along: number, pixel: Rgb, wanted: string) => {
    if (result.off.length < 8) result.off.push(`${column ? `(${along}, ${across})` : `(${across}, ${along})`} is rgb(${pixel.join(', ')}), not ${wanted} — the seam is at ${seam}`);
  };
  for (const [along, allowed] of lines) {
    result.lines++;
    const [left, right] = [at(seam - reference, along), at(seam + reference - 1, along)];
    const name = (color: Rgb) => `rgb(${color.join(', ')})`;
    if (expect === 'one' && far(left, right) > allowed) report(seam + reference - 1, along, right, `${name(left)} as before the seam`);
    let ended = false;
    for (let across = seam - near; across < seam + near; across++) {
      const pixel = at(across, along);
      if (expect === 'one') {
        if (far(pixel, left) > allowed) report(across, along, pixel, name(left));
        continue;
      }
      const [isLeft, isRight] = [far(pixel, left) <= allowed, far(pixel, right) <= allowed];
      if (!isLeft && !isRight) report(across, along, pixel, `${name(left)} or ${name(right)}`);
      else if (ended && !isRight) report(across, along, pixel, `${name(right)}: the first part's color had ended`);
      else if (!isLeft) ended = true;
    }
  }
  return result;
}
