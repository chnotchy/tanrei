import { flatParent } from './flat-tree.js';

/**
 * How much larger an element is drawn than it is laid out, along each axis: 1 at rest, 0.9 while an ancestor scales it
 * in from 0.9 (a dialog or a popover growing over its open motion), any number under a transformed ancestor.
 *
 * `getBoundingClientRect()` answers in the page's pixels, after every ancestor's transform; what a component writes
 * back — a `clip-path`, a width, an inset — is read in the element's own pixels, before them. A component that measures
 * one and writes the other divides what it measured by this, so that what it draws is right at any scale and needs no
 * second measurement when the transform ends (nothing reports that end: a transform is not a resize).
 *
 * The laid-out size is the used `width` / `height` of the element's border box, so the element must be a box that has
 * them (not an inline one). An element that is not laid out, or has no size, answers 1 — and 0 on an axis it has a
 * size on and is drawn flat (scaled to nothing: the first frame of a surface that grows from an edge): nothing can be
 * measured through it then, and the caller measures again once it is not.
 *
 * A caller that has read the element's box on the page and its computed style already, for its own use, passes them
 * (`drawn`, `style`): the scale is then found without reading either again.
 */
export function layoutScale(element: Element, drawn: DOMRectReadOnly = element.getBoundingClientRect(), style: CSSStyleDeclaration = getComputedStyle(element)): { x: number; y: number } {
  const side = (names: string[]) => names.reduce((sum, name) => sum + (Number.parseFloat(style.getPropertyValue(name)) || 0), 0);
  const border = style.boxSizing === 'border-box';
  const laid = {
    x: Number.parseFloat(style.width) + (border ? 0 : side(['padding-left', 'padding-right', 'border-left-width', 'border-right-width'])),
    y: Number.parseFloat(style.height) + (border ? 0 : side(['padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width'])),
  };
  const ratio = (page: number, own: number) => {
    if (!(own > 0)) return 1;
    if (!(page > 0)) return 0;
    const scale = page / own;
    // What the two readings differ by at rest is their rounding, not a scale.
    return Math.abs(scale - 1) < 1e-4 ? 1 : scale;
  };
  return { x: ratio(drawn.width, laid.x), y: ratio(drawn.height, laid.y) };
}

/**
 * The CSS `zoom` an element is drawn at: its own times its ancestors'. An element in the top layer takes the zoom of
 * its ancestors in the page — its box is that much larger — though no transform of theirs reaches it. 1 where no zoom
 * is set.
 *
 * Under a zoom the element's pixels are not the window's: `getBoundingClientRect()` answers in the window's pixels,
 * while a length the element is given (`top`, `left`, a custom property its rules size it by) is drawn at the zoom
 * times its value, and a length read from its computed style or its layout (`offsetHeight`, `layoutSize()`) is in its
 * own pixels. A component that places an element against another by script measures in the window's pixels: it turns
 * what it reads from the element into them (times the zoom) and what it writes back into the element's own (divided by
 * it), so that the element stands against what it is placed by, the distances between them drawn at the zoom as the
 * element is.
 *
 * `Element.currentCSSZoom` where the engine has it; elsewhere the product of the computed `zoom` of the element and of
 * each of its ancestors in the flat tree (`flatParent()`: its slot, its parent, its shadow root's host), which is what
 * `currentCSSZoom` answers. The zoom is never found by measuring the element's box: a surface is measured while its
 * entrance scales it (a menu's from 0.96), and what it is drawn at over what it is laid out at would take that scale
 * for a zoom (`layoutScale()` is for that scale).
 */
export function cssZoom(element: Element): number {
  const current = (element as Element & { currentCSSZoom?: number }).currentCSSZoom;
  if (typeof current === 'number' && current > 0) return current;
  let zoom = 1;
  for (let at: Element | null = element; at; at = flatParent(at)) {
    // The computed value is a number; a percentage is turned into one all the same. `normal`, and a zoom of 0, are 1.
    const value = getComputedStyle(at).zoom;
    const own = Number.parseFloat(value) / (value.trim().endsWith('%') ? 100 : 1);
    if (own > 0) zoom *= own;
  }
  return zoom;
}
