// Where a tooltip's container goes against its anchor (TIP-9, TIP-20, TIP-22 to TIP-25): geometry alone, with no element
// and no browser, so that every side, alignment, direction and edge of the window can be tested as numbers. The geometry
// is the one every anchored surface shares (src/primitives/placement.ts); the tooltip names what is its own: an unknown
// placement is `top`, and `auto` tries top, bottom, end, start with the container centred on its anchor.
import { ANCHORED_PLACEMENTS, type AnchoredArrow, type AnchoredBox, type AnchoredInput, type AnchoredPlace, type AnchoredPlacement, type AnchoredSide, placeAnchored } from '../../primitives/placement.js';

/**
 * Where the tooltip prefers to stand (TIP-22): a side of the anchor, and how it lines up along that side. `top` and
 * `bottom` centre it above or below; with `-start` or `-end` its start or end edge meets the anchor's. `start` and `end`
 * centre it beside the anchor; with `-top` or `-bottom` its top or bottom edge meets the anchor's. `auto` takes the first
 * side with room (TIP-23). Start and end follow the layout direction.
 */
export type TanreiTooltipPlacement = AnchoredPlacement;
/** The thirteen values; anything else is placed as `top` (TIP-22). */
export const PLACEMENTS: readonly TanreiTooltipPlacement[] = ANCHORED_PLACEMENTS;

export type TooltipBox = AnchoredBox;
/** A side of the anchor as the window has it: `start` and `end` resolved by the layout direction. */
export type TooltipSide = AnchoredSide;
/** The arrow's measures for a placement (TIP-24, TIP-25): its base, its height, and how far its base stays off the container's corners. */
export type TooltipArrow = AnchoredArrow;
/** Where `placeTooltip()` puts the container. */
export type TooltipPlace = AnchoredPlace;

/**
 * Where the container goes, in viewport coordinates (TIP-9, TIP-20, TIP-22 to TIP-25): `placeAnchored()` with the
 * tooltip's own fallback (`top`) and `auto` order (top, bottom, end, start, centred). Larger than the room on its side,
 * it is still kept `margin` inside the window's edges (TIP-9), over the anchor; only a container larger than the window
 * gives up the margin, at its bottom and end edges first.
 */
export function placeTooltip(input: Omit<AnchoredInput, 'fallback' | 'auto' | 'autoAlign' | 'holdInMargin'>): TooltipPlace {
  return placeAnchored({ ...input, fallback: 'top', auto: ['top', 'bottom', 'end', 'start'], autoAlign: 'center', holdInMargin: true });
}
