/**
 * An overlay's height with nothing capping it (menu MNU-2, date picker DTP-2, search SRC-7), which `placeMenu` compares
 * with the room on each side: the height the surface has now, plus what its scrolling box holds beyond its own height.
 * `scroller` is the one part of the surface that gives way to the cap; every other part keeps its size.
 *
 * Measured as the surface stands, never by lifting the cap: laid out uncapped, the box would not scroll, the browser
 * would clamp its scroll offset to 0, and capping it again would not bring the offset back — every placement (the anchor
 * moving, the window resizing, a font arriving) would send a scrolled list back to its top.
 */
export function naturalHeight(surface: HTMLElement, scroller: HTMLElement | null | undefined) {
  // What the scrolling box holds beyond its own height has no fractional form (`scrollHeight`, `clientHeight`): 0 while
  // the content fits, so an uncapped surface is measured exactly.
  const hidden = scroller ? Math.max(0, scroller.scrollHeight - scroller.clientHeight) : 0;
  return layoutSize(surface).height + hidden;
}

/**
 * A box's border-box size as it is laid out: fractional, and untouched by a transform. `offsetWidth` / `offsetHeight`
 * are snapped to whole pixels, so a surface placed by `anchor edge − size` would land up to a pixel off the edge it is
 * aligned to; `getBoundingClientRect()` is scaled by the enter motion these surfaces are placed under. The used value
 * of the box's own size is neither — with its paddings and borders added where the box is a content box. A box without
 * a used size (not rendered, or inline) falls back to the snapped one.
 */
export function layoutSize(element: HTMLElement): { width: number; height: number } {
  const style = getComputedStyle(element);
  const [width, height] = [Number.parseFloat(style.width), Number.parseFloat(style.height)];
  if (!Number.isFinite(width) || !Number.isFinite(height)) return { width: element.offsetWidth, height: element.offsetHeight };
  if (style.boxSizing === 'border-box') return { width, height };
  const px = (value: string) => Number.parseFloat(value) || 0;
  return {
    width: width + px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth),
    height: height + px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth),
  };
}
