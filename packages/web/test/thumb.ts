// What a row of tabs draws as its active indicator ("thumb"), read without touching it: every tab's piece of the
// indicator (the covered layer's clip), the hole cut out of its plain content, and the box the indicator has on it — all
// in the tab's own pixels, whatever scales the row on the page — so a test can say that one thumb is drawn, where, and in
// what shape, at the first paint (TAB-16, TAB-24).
import { type Locator, expect } from '@playwright/test';

/**
 * How far two boxes may be apart, in px: what a browser rounds a box on the page to (Firefox: a sixtieth of a pixel),
 * read through a scale. The defects this guards against are several times larger: a box measured at 0.9 of its size.
 */
const TOLERANCE_AT_REST = 0.3;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface ThumbPiece {
  selected: boolean;
  /** How much larger the tab is drawn than laid out (1 at rest), across and down. */
  scale: number;
  scaleY: number;
  tab: { w: number; h: number };
  /** The container: the indicator's box on this tab, in the tab's coordinates. */
  box: Rect;
  /** The plain content's box and, in a row that hugs, the width a capsule has: the content plus the indicator's padding. */
  content: Rect;
  plate: number;
  /** The covered layer's clip, in the tab's coordinates, and its corner; null while the stylesheet's (nothing placed). */
  clip: (Rect & { r: number }) | null;
  /** Whether the covered layer is drawn at all. */
  drawn: boolean;
  /** The hole cut out of the plain content, in the tab's coordinates, and its corner; null where there is none. */
  cut: (Rect & { r: number }) | null;
}

/** Every tab's piece of the indicator in `row` (a `<tanrei-tabs>`), in order. */
export const readThumb = (row: Locator) =>
  row.evaluate((host): ThumbPiece[] =>
    ([...host.querySelectorAll(':scope > tanrei-tab')] as HTMLElement[]).map((each) => {
      const root = each.shadowRoot!;
      const [tab, box, cover, content, plate] = ['.tab', '.box', '.cover', '.tab > .content', '.plate'].map((s) => root.querySelector<HTMLElement>(s)!);
      const own = tab.getBoundingClientRect();
      const style = getComputedStyle(tab);
      const [sx, sy] = [own.width / Number.parseFloat(style.width) || 1, own.height / Number.parseFloat(style.height) || 1];
      const local = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: (r.left - own.left) / sx, y: (r.top - own.top) / sy, w: r.width / sx, h: r.height / sy };
      };
      const size = { w: own.width / sx, h: own.height / sy };
      let clip: ThumbPiece['clip'] = null;
      const inset = /^inset\((.*)\)$/.exec(getComputedStyle(cover).clipPath);
      if (inset && !inset[1].includes('%')) {
        const [edges, round] = inset[1].split(' round ');
        const v = edges.trim().split(/\s+/).map(Number.parseFloat);
        const [top, right, bottom, left] = v.length === 1 ? [v[0], v[0], v[0], v[0]] : v.length === 2 ? [v[0], v[1], v[0], v[1]] : v.length === 3 ? [v[0], v[1], v[2], v[1]] : v;
        clip = { x: left, y: top, w: size.w - left - right, h: size.h - top - bottom, r: round ? Number.parseFloat(round) : 0 };
      }
      // path(evenodd, "M-99999 -99999H99999V99999H-99999Z M<x+r> <y>H<x+w-r>A<r> <r> 0 0 1 <x+w> <y+r>V<y+h-r>…"): the
      // hole's numbers follow the five of the outer rectangle, in the content's coordinates.
      let cut: ThumbPiece['cut'] = null;
      const at = local(content);
      const n = (content.style.clipPath.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number);
      if (n.length >= 16) {
        const r = n[8];
        const [x, y, right, bottom] = [n[5] - r, n[6], n[13], n[15] + r];
        cut = { x: x + at.x, y: y + at.y, w: right - x, h: bottom - y, r };
      }
      return {
        selected: tab.classList.contains('selected'),
        scale: sx,
        scaleY: sy,
        tab: size,
        box: local(box),
        content: at,
        plate: plate.getBoundingClientRect().width / sx,
        clip,
        drawn: getComputedStyle(cover).visibility !== 'hidden' && !!clip && clip.w > 0 && clip.h > 0 && clip.x < size.w && clip.x + clip.w > 0,
        cut,
      };
    }),
  );

/**
 * TAB-16, TAB-24: exactly one thumb is drawn in `row`, on the selected tab, at that tab's container; the container is
 * the box the spec gives it (`circle`: as wide as it is tall; `capsule`: the content plus the indicator's padding, wider
 * than it is tall; `fill`: the tab's whole share); its corner is half its shorter side — a capsule or a circle, never a
 * rounded rectangle; and the hole cut out of the plain content is the same box with the same corner.
 */
export async function expectOneThumb(row: Locator, shape: 'circle' | 'capsule' | 'fill', hint = '') {
  const pieces = await readThumb(row);
  const say = `${hint} ${JSON.stringify(pieces)}`;
  // A piece is a thumb where it covers more of its tab than the page's rounding: the thumb's edge is written from boxes
  // read on the page, so while a row is drawn scaled it may lie a few hundredths of a pixel past its tab's edge (WebKit,
  // at 0.945: 0.05), and the neighbouring tab's piece is then that sliver — the same thumb, within the tolerance every
  // comparison below allows, not a second one.
  const covers = (piece: ThumbPiece) => {
    if (!piece.drawn || !piece.clip) return false;
    const across = Math.min(piece.tab.w, piece.clip.x + piece.clip.w) - Math.max(0, piece.clip.x);
    return across > TOLERANCE_AT_REST / Math.min(1, piece.scale, piece.scaleY);
  };
  const drawn = pieces.filter(covers);
  expect(drawn.length, `one thumb is drawn: ${say}`).toBe(1);
  const [piece] = drawn;
  expect(piece.selected, `on the selected tab: ${say}`).toBe(true);
  const clip = piece.clip!;
  const { box } = piece;
  // What is read through a scale is as exact as the page's rounding divided by it.
  const TOLERANCE = TOLERANCE_AT_REST / Math.min(1, piece.scale, piece.scaleY);
  for (const k of ['x', 'y', 'w', 'h'] as const) expect(Math.abs(clip[k] - box[k]), `the thumb's ${k} is its container's: ${say}`).toBeLessThan(TOLERANCE);
  // The container itself: as wide as its shape says.
  if (shape === 'circle') expect(Math.abs(box.w - box.h), `a circle: ${say}`).toBeLessThan(TOLERANCE);
  else if (shape === 'fill') expect(Math.abs(box.w - piece.tab.w), `the tab's whole share: ${say}`).toBeLessThan(TOLERANCE);
  else {
    expect(box.w, `wider than tall: ${say}`).toBeGreaterThan(box.h + TOLERANCE);
    expect(Math.abs(box.w - Math.min(piece.tab.w, piece.plate)), `the content plus the indicator's padding: ${say}`).toBeLessThan(TOLERANCE);
  }
  // A capsule (or a circle): the corner is half the shorter side of the box as it is DRAWN, never less.
  expect(Math.abs(clip.r - Math.min(clip.w, clip.h) / 2), `a full corner: ${say}`).toBeLessThan(TOLERANCE);
  // TAB-24: the plain content is cut away exactly where the covered copy is drawn.
  expect(piece.cut, `the plain content is cut: ${say}`).not.toBeNull();
  for (const k of ['x', 'y', 'w', 'h', 'r'] as const) expect(Math.abs(piece.cut![k] - clip[k]), `the cut's ${k} is the thumb's: ${say}`).toBeLessThan(TOLERANCE);
  // No other tab keeps a hole in its plain content where no thumb is.
  for (const other of pieces) if (other !== piece) expect(other.cut, `no cut without a thumb: ${say}`).toBeNull();
}
