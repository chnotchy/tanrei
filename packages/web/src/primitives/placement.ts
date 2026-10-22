// Where a surface that opens beside a control goes against that control (TIP-9, TIP-20, TIP-22 to TIP-25; POP-2 to
// POP-5, POP-10, POP-34): geometry alone, with no element and no browser, so that every side, alignment, direction and
// edge of the window can be tested as numbers. The tooltip and the popover read the same thirteen placements the same
// way; what differs between them is named by the caller (the placement an unknown value falls back to, the order `auto`
// tries the sides in and how it lines the surface up).

/**
 * Where an anchored surface prefers to stand: a side of the anchor, and how it lines up along that side. `top` and
 * `bottom` centre it above or below; with `-start` or `-end` its start or end edge meets the anchor's. `start` and `end`
 * centre it beside the anchor; with `-top` or `-bottom` its top or bottom edge meets the anchor's. `auto` takes the first
 * side with room. Start and end follow the layout direction.
 */
export type AnchoredPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'start'
  | 'start-top'
  | 'start-bottom'
  | 'end'
  | 'end-top'
  | 'end-bottom'
  | 'auto';
/** The thirteen values. */
export const ANCHORED_PLACEMENTS: readonly AnchoredPlacement[] = ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end', 'start', 'start-top', 'start-bottom', 'end', 'end-top', 'end-bottom', 'auto'];

export interface AnchoredBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A side of the anchor as the window has it: `start` and `end` resolved by the layout direction. */
export type AnchoredSide = 'top' | 'bottom' | 'left' | 'right';
/** A side by its name, before the layout direction resolves it. */
export type NamedSide = 'top' | 'bottom' | 'start' | 'end';

/** The arrow's measures for a placement: its base, its height, and how far its base stays off the surface's corners. */
export interface AnchoredArrow {
  width: number;
  height: number;
  /** The component's `arrow.inset` token. */
  inset: number;
  /** The surface's corner radius, as drawn. */
  radius: number;
  /** Whether one is drawn: the surface then stands its height farther from the anchor, so that the tip keeps the offset. */
  drawn: boolean;
}

/** Where `placeAnchored()` puts the surface. */
export interface AnchoredPlace {
  top: number;
  left: number;
  /** The side of the anchor it stands on. */
  side: AnchoredSide;
  /** The window is smaller than the surface on that side, so it was moved back inside the window, over the anchor. */
  held: boolean;
  /** Whether an arrow is drawn: asked for, and the surface does not cover the anchor. */
  arrow: boolean;
  /**
   * Where an arrow points, or would point: along the surface's edge that faces the anchor, measured from the surface's
   * left edge (above or below the anchor) or its top edge (beside it).
   */
  point: number;
  /** The room the side it stands on has for the surface, within the margin: its height above or below, its width beside. */
  room: number;
  /** Whether the surface, at the size given, has that room. */
  fits: boolean;
}

export interface AnchoredInput {
  anchor: AnchoredBox;
  surface: { width: number; height: number };
  viewport: { width: number; height: number };
  placement: AnchoredPlacement;
  offset: number;
  margin: number;
  rtl: boolean;
  crossOffset?: number;
  arrow?: AnchoredArrow;
  /** The side it is on: it stays there for as long as that side has room, whatever the preferred side has. */
  keep?: AnchoredSide | null;
  /** What a placement that is not one of the thirteen is placed as. */
  fallback?: AnchoredPlacement;
  /** The order `auto` tries the sides in, by their names. */
  auto?: readonly NamedSide[];
  /** How `auto` lines the surface up along the side it takes: centred on the anchor, or start edges (top edges, beside it) together. */
  autoAlign?: 'center' | 'start';
  /**
   * Where a surface larger than the room on its side is moved back to: inside the window's edges (it gives up the margin
   * before it covers the anchor), or — true — still `margin` inside them (a popover, POP-5; a tooltip, TIP-9).
   */
  holdInMargin?: boolean;
}

const OPPOSITE: Record<AnchoredSide, AnchoredSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const between = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high));

/**
 * Where the surface goes, in the coordinates `anchor` and `viewport` are given in.
 *
 * The side and the alignment `placement` names — start and end mirrored in right-to-left, `auto` trying its sides in
 * order — `offset` from the anchor's edge (measured to the arrow's tip while one is drawn) and moved along the side by
 * `crossOffset`, which never leaves less than an arrow's width of the surface beside the anchor. Then, in order: it flips
 * to the opposite side, keeping the alignment, when the preferred one has no room within `margin` of the window's edges
 * and the opposite has, and takes the one with more room when neither has; it shifts along the side as far as the margin
 * asks; and where the room on its side is smaller than the surface it stands in the margin, and rather than leave the
 * window is moved back over the anchor, its top and start edges first (`held`, with no arrow). `keep` is the side it is
 * on: it stays there for as long as that side has room, whatever the preferred side has.
 *
 * A caller whose surface can be made smaller (a popover's scrolls) reads `fits` and `room`: it limits the surface to
 * the room and places it again with `keep` set to the side it was given.
 */
export function placeAnchored(input: AnchoredInput): AnchoredPlace {
  const { anchor, surface, viewport, offset, margin, rtl, arrow } = input;
  const fallback = input.fallback ?? 'top';
  const order = input.auto ?? ['top', 'bottom', 'end', 'start'];
  const [named, given] = (ANCHORED_PLACEMENTS.includes(input.placement) ? input.placement : fallback).split('-') as [string, string | undefined];
  const physical = (side: string): AnchoredSide => (side === 'start' ? (rtl ? 'right' : 'left') : side === 'end' ? (rtl ? 'left' : 'right') : (side as AnchoredSide));
  // The offset is kept by the tip, so the surface stands the arrow's height farther away.
  const gap = offset + (arrow?.drawn ? arrow.height : 0);
  const room: Record<AnchoredSide, number> = {
    top: anchor.y - gap - margin,
    bottom: viewport.height - margin - (anchor.y + anchor.height + gap),
    left: anchor.x - gap - margin,
    right: viewport.width - margin - (anchor.x + anchor.width + gap),
  };
  const above = (side: AnchoredSide) => side === 'top' || side === 'bottom';
  const fits = (side: AnchoredSide) => room[side] >= (above(side) ? surface.height : surface.width);
  // auto tries the sides by their names; any other placement only ever goes to its opposite side.
  const sides: AnchoredSide[] = named === 'auto' ? order.map(physical) : [physical(named), OPPOSITE[physical(named)]];
  // The side it is on while that side has room; else the first with room; else the one with the most.
  const side = input.keep && sides.includes(input.keep) && fits(input.keep) ? input.keep : (sides.find(fits) ?? sides.reduce((most, each) => (room[each] > room[most] ? each : most)));

  // Along the side: the surface's left edge above or below the anchor, its top edge beside it.
  const horizontal = above(side);
  const alignment = named === 'auto' ? (input.autoAlign === 'start' ? (horizontal ? 'start' : 'top') : undefined) : given;
  const [from, length, size, extent] = horizontal ? [anchor.x, anchor.width, surface.width, viewport.width] : [anchor.y, anchor.height, surface.height, viewport.height];
  // Above or below, start and end are the right and the left in right-to-left; top and bottom never mirror.
  const mirrored = horizontal && rtl;
  const first = alignment === 'start' || alignment === 'top';
  const second = alignment === 'end' || alignment === 'bottom';
  let along = first || second ? (first !== mirrored ? from : from + length - size) : from + length / 2 - size / 2;
  // Moved by crossOffset, towards the end or the bottom, and never off the anchor's side.
  const cross = Number.isFinite(input.crossOffset) ? (input.crossOffset as number) : 0;
  const beside = Math.min(arrow?.width ?? 0, size, length);
  along = between(along + (mirrored ? -cross : cross), from - size + beside, from + length - beside);
  // Shifted as far as the margin asks; larger than the window, its top or start edge first.
  const last = extent - margin - size;
  along = last >= margin ? between(along, margin, last) : mirrored ? last : margin;

  // Away from the anchor: the gap from its edge. Larger than the room on its side, it stands in the margin first, and
  // rather than leave the window it is moved back over the anchor, its top or start edge first.
  const depth = horizontal ? surface.height : surface.width;
  const gapped = side === 'top' ? anchor.y - gap - depth : side === 'bottom' ? anchor.y + anchor.height + gap : side === 'left' ? anchor.x - gap - depth : anchor.x + anchor.width + gap;
  const pad = input.holdInMargin ? margin : 0;
  const slack = (horizontal ? viewport.height : viewport.width) - depth - pad;
  const away = slack >= pad ? between(gapped, pad, slack) : !horizontal && rtl ? slack : pad;
  const held = away !== gapped;
  // Over the anchor it draws no arrow, and without one it may have the room after all.
  if (held && arrow?.drawn) return placeAnchored({ ...input, arrow: { ...arrow, drawn: false } });

  // The middle of the part of the anchor's edge the surface stands beside, off the surface's corners.
  const [start, end] = [Math.max(from, along), Math.min(from + length, along + size)];
  const middle = end >= start ? (start + end) / 2 : between(from + length / 2, along, along + size);
  const corner = arrow ? Math.max(arrow.inset, arrow.radius) + arrow.width / 2 : 0;
  const point = size - 2 * corner >= 0 ? between(middle - along, corner, size - corner) : size / 2;
  return { top: horizontal ? away : along, left: horizontal ? along : away, side, held, arrow: !!arrow?.drawn, point, room: room[side], fits: fits(side) };
}

/**
 * Whether nothing of an anchor can be seen (TIP-9, POP-5): outside the window, or scrolled out of sight inside an
 * ancestor that clips its content. A box with no size yet (an anchor still drawing its first frame) is out of sight
 * only once it is past an edge.
 */
export function anchorOutOfSight(element: Element, box: DOMRect, viewport: { width: number; height: number }): boolean {
  const sized = box.width > 0 && box.height > 0;
  const past = (from: number, to: number, low: number, high: number) => (sized ? to <= low || from >= high : to < low || from > high);
  if (past(box.top, box.bottom, 0, viewport.height) || past(box.left, box.right, 0, viewport.width)) return true;
  // An absolutely positioned box is clipped by the box it is positioned against and that box's ancestors, not by what
  // lies between; a fixed one by the window alone.
  let escaping = false;
  for (let node: Element | null = element; node && node !== document.body && node !== document.documentElement; ) {
    const style = getComputedStyle(node);
    if (node !== element && style.display !== 'inline' && style.display !== 'contents' && !(escaping && style.position === 'static')) {
      escaping = false;
      const [clipsX, clipsY] = [style.overflowX !== 'visible', style.overflowY !== 'visible'];
      if (clipsX || clipsY) {
        const outer = node.getBoundingClientRect();
        const [left, top] = [outer.left + node.clientLeft, outer.top + node.clientTop];
        if (clipsY && past(box.top, box.bottom, top, top + node.clientHeight)) return true;
        if (clipsX && past(box.left, box.right, left, left + node.clientWidth)) return true;
      }
    }
    if (style.position === 'fixed') return false;
    if (style.position === 'absolute') escaping = true;
    const root = node.getRootNode();
    node = node.assignedSlot ?? node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return false;
}

/**
 * Whether an anchor has gone (TIP-9, POP-5): removed, hidden (`display: none`, `visibility: hidden`, a closed
 * `<details>`) or out of sight. `box` is its box in the window.
 */
export function anchorGone(element: Element, box: DOMRect, viewport: { width: number; height: number }): boolean {
  if (!element.isConnected) return true;
  if (typeof element.checkVisibility === 'function' && !element.checkVisibility({ visibilityProperty: true })) return true;
  return anchorOutOfSight(element, box, viewport);
}

/** An attribute that is a number (TIP-17, TIP-24, POP-4): empty, or anything `Number` does not read, is not a number (not 0). */
export const numericAttribute = {
  fromAttribute: (value: string | null) => (value === null ? null : value.trim() === '' ? Number.NaN : Number(value)),
};

/** `cross-offset` (TIP-24, POP-4), whose absence is 0. */
export const crossOffsetAttribute = {
  fromAttribute: (value: string | null) => numericAttribute.fromAttribute(value) ?? 0,
};

/**
 * A prop that is true, false or null, and its attribute (TIP-25, TIP-26, POP-10): absent is null, present (empty,
 * `true` or anything else) is true, and `="false"` is false — the one way to refuse a system whose choice is on.
 */
export const choiceAttribute = {
  fromAttribute: (value: string | null): boolean | null => (value === null ? null : value.trim().toLowerCase() !== 'false'),
  toAttribute: (value: unknown): string | null => (value === true ? '' : value === false ? 'false' : null),
};

/** A set length used as given (finite, not negative); anything else takes the token (TIP-17, TIP-24, POP-4). */
export const usableLength = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

// ── The window a placed surface is kept in ───────────────────────────────────────────────────────────────────────────

/** A box in the window, in the coordinates of `getBoundingClientRect()` and of a fixed box. */
export interface ViewportBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The visible part of the window, above the on-screen keyboard (MNU-2, SEL-24, CMB-22, POP-36, DTM-2), in the layout
 * viewport's coordinates — those `getBoundingClientRect()` gives and a fixed box is placed in. It is the visual viewport
 * where the browser has one, within the layout viewport: the on-screen keyboard shrinks the visual viewport and not the
 * layout one (iOS Safari, and every browser whose keyboard resizes the visual viewport only), so a surface placed in the
 * layout viewport opens under the keyboard; a pinch-zoomed page shows only the part the visual viewport covers. With no
 * visual viewport it is the layout viewport, scroll bars left out.
 */
export function visibleViewport(): ViewportBox {
  const root = document.documentElement;
  const [width, height] = [root.clientWidth, root.clientHeight];
  const visual = typeof window === 'undefined' ? null : window.visualViewport;
  if (!visual) return { x: 0, y: 0, width, height };
  const x = between(visual.offsetLeft, 0, width);
  const y = between(visual.offsetTop, 0, height);
  const right = between(visual.offsetLeft + visual.width, x, width);
  const bottom = between(visual.offsetTop + visual.height, y, height);
  return { x, y, width: right - x, height: bottom - y };
}

/** The visible part of the window as one comparable string: what a placement that depends on it compares. */
export const viewportKey = (box: ViewportBox = visibleViewport()) => `${box.x},${box.y},${box.width},${box.height}`;

/**
 * The most a product lets a placed surface be tall (MNU-2, MNU-46): the `max-block-size` the product's own rules give
 * it (`::part(surface)`), as a computed value in pixels; Infinity where it sets none. It is read on `twin`, an element
 * that carries the surface's part name and is never drawn (`display: none !important` in the component's own sheet),
 * so that the product's `::part()` rules reach it and the limit the placement writes on the surface itself does not:
 * taking that limit off the surface to read under it, and putting it back, sends a scrolled list back to its top in
 * WebKit. A length the computed value keeps relative (a percentage, a `calc()` with one) is resolved as the surface's
 * own is: against the window, the box a surface in the top layer is sized against.
 */
export function surfaceCap(twin: Element | null | undefined): number {
  if (!twin) return Number.POSITIVE_INFINITY;
  const value = getComputedStyle(twin).maxBlockSize;
  if (!value || value === 'none') return Number.POSITIVE_INFINITY;
  if (/^-?[\d.]+(e-?\d+)?px$/i.test(value)) return Math.max(0, Number.parseFloat(value));
  // Against the window — the box a surface in the top layer is sized against, whatever its ancestors are.
  const vertical = getComputedStyle(twin).writingMode.startsWith('vertical');
  const percent = /^(-?[\d.]+)%$/.exec(value);
  const root = document.documentElement;
  if (percent) return Math.max(0, (Number.parseFloat(percent[1]!) / 100) * (vertical ? root.clientWidth : root.clientHeight));
  // Any other form (a calc() with a percentage): a box in the top layer, as tall as that length, measures it.
  const probe = document.createElement('div');
  probe.setAttribute('popover', 'manual');
  probe.style.cssText = 'position: fixed; inset: 0 auto auto 0; margin: 0; padding: 0; border: 0; inline-size: 0; visibility: hidden; pointer-events: none';
  probe.style.blockSize = value;
  (twin.parentNode ?? document.body).appendChild(probe);
  probe.showPopover?.();
  const measured = probe.getBoundingClientRect();
  probe.remove();
  const size = vertical ? measured.width : measured.height;
  return Number.isFinite(size) ? Math.max(0, size) : Number.POSITIVE_INFINITY;
}

// ── A menu's kind of surface: below or above its anchor, beside its parent surface, at a point ─────────────────────

/** The four placements of a menu's kind of surface (MNU-2, DTM-2): a side of the anchor, and the edge it is aligned by. */
export type MenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export interface MenuBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The window as a placement takes it: the visible part of it (`visibleViewport()`), or a box from the origin. */
export type PlacementViewport = { x?: number; y?: number; width: number; height: number };

/** `place` run in coordinates whose origin is the viewport's corner, its `top` and `left` given back in the window's. */
function inViewport<T extends { top: number; left: number }>(viewport: PlacementViewport, place: (shift: (box: MenuBox) => MenuBox, size: { width: number; height: number }) => T): T {
  const [x, y] = [viewport.x ?? 0, viewport.y ?? 0];
  const at = place((box) => ({ x: box.x - x, y: box.y - y, width: box.width, height: box.height }), { width: viewport.width, height: viewport.height });
  return { ...at, top: at.top + y, left: at.left + x };
}

/**
 * Where the surface goes (MNU-2, DTM-2): `offset` from the anchor on the placement's side, flipped to the other side
 * when this one has less room than the surface needs within `margin` of the viewport's edge and the other has more;
 * aligned by its start or end edge with the anchor's (mirrored in right-to-left), then shifted along the anchor to stay
 * `margin` inside the viewport; its height limited to the room left. `viewport` is the visible part of the window
 * (`visibleViewport()`); coordinates are the window's (`left` is physical). A surface the product caps is given at its
 * capped height (`surfaceCap()`).
 */
export function placeMenu(input: { anchor: MenuBox; surface: { width: number; height: number }; viewport: PlacementViewport; placement: MenuPlacement; offset: number; margin: number; rtl: boolean }) {
  return inViewport(input.viewport, (shift, viewport) => {
    const { surface, placement, offset, margin, rtl } = input;
    const anchor = shift(input.anchor);
    let side: 'top' | 'bottom' = placement.startsWith('top') ? 'top' : 'bottom';
    const edge = placement.endsWith('end') ? 'end' : 'start';
    const below = viewport.height - margin - (anchor.y + anchor.height + offset);
    const above = anchor.y - offset - margin;
    if (side === 'bottom' && below < surface.height && above > below) side = 'top';
    else if (side === 'top' && above < surface.height && below > above) side = 'bottom';
    const room = Math.max(0, side === 'bottom' ? below : above);
    const height = Math.min(surface.height, room);
    const top = side === 'bottom' ? anchor.y + anchor.height + offset : anchor.y - offset - height;
    // The start edge is the left one in left-to-right.
    const alignLeft = (edge === 'start') !== rtl;
    const wanted = alignLeft ? anchor.x : anchor.x + anchor.width - surface.width;
    const left = Math.max(margin, Math.min(wanted, viewport.width - margin - surface.width));
    return { top, left, maxHeight: room, side };
  });
}

/**
 * Where the surface of a context menu goes from the point it was asked for at (MNU-61): with no offset, a corner on the
 * point — the block-start corner for a `bottom-*` placement, the block-end one for `top-*`, the inline-start one for
 * `*-start` (mirrored in right-to-left) — flipped to the other side of the point, along each axis by itself, where its
 * side has less room than the surface needs within `margin` of the viewport's edge and the other side has more; then
 * shifted to stay `margin` inside the viewport, its height limited to the room left. Coordinates are the window's.
 */
export function placeAtPoint(input: { point: { x: number; y: number }; surface: { width: number; height: number }; viewport: PlacementViewport; placement: MenuPlacement; margin: number; rtl: boolean }) {
  return inViewport(input.viewport, (shift, viewport) => {
    const { surface, placement, margin, rtl } = input;
    const point = shift({ ...input.point, width: 0, height: 0 });
    let side: 'top' | 'bottom' = placement.startsWith('top') ? 'top' : 'bottom';
    const below = viewport.height - margin - point.y;
    const above = point.y - margin;
    if (side === 'bottom' && below < surface.height && above > below) side = 'top';
    else if (side === 'top' && above < surface.height && below > above) side = 'bottom';
    const room = Math.max(0, side === 'bottom' ? below : above);
    const height = Math.min(surface.height, room);
    const top = side === 'bottom' ? point.y : point.y - height;
    // Along the line: the surface runs to the right of the point where its start is the left (left-to-right, `*-start`).
    let rightward = placement.endsWith('end') === rtl;
    const right = viewport.width - margin - point.x;
    const left = point.x - margin;
    if (rightward && right < surface.width && left > right) rightward = false;
    else if (!rightward && left < surface.width && right > left) rightward = true;
    const wanted = rightward ? point.x : point.x - surface.width;
    return { top, left: Math.max(margin, Math.min(wanted, viewport.width - margin - surface.width)), maxHeight: room, side };
  });
}

/**
 * Where a submenu's surface goes (MNU-46, MNU-47): beside the surface that holds its item (`parent`), `offset` from that
 * surface's inline-end edge — or from the side `prefer` names, the side its parent surface was itself placed on — and on
 * the other side when this one has less room than the surface needs within `margin` of the viewport's edge and the
 * other has more. Where the side it is on has room for `minWidth` but not for the surface, the surface is narrowed to
 * the room. Where neither side has room for `minWidth` it is laid over `parent`: on the side with more room, as far
 * towards it as the margin allows, as wide as leaves `touch` of the parent uncovered on its other side and never
 * narrower than `minWidth`. Its first row (`lead` below its own block-start edge) is level with the item's `row`, then
 * it is shifted along the block axis to stay `margin` inside the viewport, its height limited to the room.
 * Coordinates are the window's (`left` and `side` are physical).
 */
export function placeSubmenu(input: {
  parent: MenuBox;
  row: MenuBox;
  surface: { width: number; height: number };
  lead: number;
  viewport: PlacementViewport;
  offset: number;
  margin: number;
  minWidth: number;
  touch: number;
  rtl: boolean;
  prefer?: 'left' | 'right' | null;
}) {
  return inViewport(input.viewport, (shift, viewport) => {
    const { surface, lead, offset, margin, minWidth, touch, rtl, prefer } = input;
    const [parent, row] = [shift(input.parent), shift(input.row)];
    const rooms = { right: viewport.width - margin - (parent.x + parent.width + offset), left: parent.x - offset - margin };
    let side: 'left' | 'right' = prefer ?? (rtl ? 'left' : 'right');
    const other = side === 'right' ? 'left' : 'right';
    if (rooms[side] < surface.width && rooms[other] > rooms[side]) side = other;
    let width = surface.width;
    let left: number;
    const overlap = rooms[side] < Math.min(minWidth, surface.width);
    if (overlap) {
      // MNU-47: over the parent, from the viewport's margin on that side back towards the parent's far edge.
      const edge = side === 'right' ? viewport.width - margin : margin;
      const kept = side === 'right' ? parent.x + touch : parent.x + parent.width - touch;
      const free = side === 'right' ? edge - kept : kept - edge;
      width = Math.min(Math.max(minWidth, Math.min(surface.width, free)), Math.max(0, viewport.width - 2 * margin));
      left = side === 'right' ? edge - width : edge;
    } else {
      width = Math.min(surface.width, rooms[side]);
      left = side === 'right' ? parent.x + parent.width + offset : parent.x - offset - width;
    }
    const room = Math.max(0, viewport.height - 2 * margin);
    const height = Math.min(surface.height, room);
    const top = Math.max(margin, Math.min(row.y - lead, viewport.height - margin - height));
    return { top, left, width, maxHeight: room, side, overlap };
  });
}
