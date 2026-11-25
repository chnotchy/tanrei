import { type CSSResult, unsafeCSS } from 'lit';
import { BEHAVIOR, choice } from './behavior.js';
import { focusedIn } from './flat-tree.js';
import { drawnAsNoElement } from './no-element.js';

/**
 * Names the element that draws the indicator, given a focus condition: `(focus) => \`button${focus}\`` for a control
 * that is its own indicator, `(focus) => \`input${focus} + .box\`` for a native input drawn by a sibling. The condition
 * is `:focus-visible`, or `[data-focus-style='glow']:focus-visible` (see `syncFocusStyle`).
 */
export type FocusSelector = (focus: string) => string;

/** The outer stroke's color where a component names none: the system's focus color role. */
const SYSTEM_COLOR = 'var(--tanrei-sys-color-focus-ring)';

/** What `focusRing()` takes besides the selector. */
export interface FocusRingOptions {
  inside?: boolean;
  within?: string;
  /**
   * The outer stroke's color (the halo's outer color under glow), as a CSS color expression — a component whose
   * indicator is drawn on a surface of its own names that surface's focus color here (`var(--_focus)`, SNK-3). Left
   * out, it is the system's focus color role, `sys.color.focus-ring`. The inner stroke, the widths and the offset are
   * always the system's.
   */
  color?: string;
}

// focus-style: glow — the same two focus colors as a soft halo instead of a hard line. The outline is transparent, not
// none: forced-colors mode repaints it in a system color, where a box-shadow is dropped. The halo starts where the ring
// would, after the offset, and is the ring's two colors, from the control outwards, each blurred by its own width.
// (Why each rule is there is said here, not in the CSS: a comment inside the string ships in every bundle.)
const glow = (selector: string, color = SYSTEM_COLOR) => `
  ${selector} {
    outline-color: transparent;
  }
  ${selector}::after {
    inset: calc(var(--tanrei-sys-focus-offset) * -1);
    border: 0;
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale) + var(--tanrei-sys-focus-offset));
    box-shadow:
      0 0 var(--tanrei-sys-focus-inner-width) var(--tanrei-sys-focus-inner-width) var(--tanrei-sys-color-focus-ring-inner),
      0 0 var(--tanrei-sys-focus-outer-width) calc(var(--tanrei-sys-focus-inner-width) + var(--tanrei-sys-focus-outer-width)) ${color};
  }`;

/**
 * The keyboard focus indicator (BTN-4 and every control after it), from the control outwards: `sys.focus.offset`
 * (negative = inside), an optional inner stroke (`sys.focus.inner-width`, `sys.color.focus-ring-inner`), then the outer
 * stroke (`sys.focus.outer-width`, `sys.color.focus-ring`). With inner-width 0 it is a single ring and the offset leaves
 * the surface visible as a gap. Never animated; pointer focus never shows it (`:focus-visible`).
 * Under `sys.behavior.focus-style: glow` (BTN-10) the same two colors are a halo instead of a line.
 *
 * `inside` draws the whole indicator inside the element instead — the outer stroke on its edge, the inner stroke within
 * it, the content beyond — for an element whose parent would clip what it draws outside (a list row in a scrolling
 * list, a menu item in its surface: LST-10, MNU-11). It is the ring drawn around the element shrunk by the ring's
 * extent, so its corners stay concentric; the glow likewise starts that far inside and spreads out to the edge.
 * Never name an element that scrolls: the inner stroke and the glow are its `::after`, which would move away with what
 * it scrolls. Name a box over it that does not scroll — `(focus) => \`.scroll${focus} ~ .focus\`` — as the code block,
 * the dialog and the snackbar do.
 *
 * `within` is for an element with a known amount of room around it before something clips (a tab's container in its
 * track, TAB-4): a length expression. The indicator is drawn around the element where the room holds all of it, and
 * further in by what is missing, on every side alike and still concentric — with room for all of it this is the ring
 * above, with no room at all it is `inside`, and in between it is neither.
 *
 * `color` is the outer stroke's color where the indicator is drawn on a surface the system's focus color is not held
 * against (a snackbar's inverse or status bar, SNK-3): a CSS color expression, the system's role when left out.
 *
 * The indicator element must be a positioning container, carry the shape (`data-tanrei-shape`, whose radius and
 * `--_corner-scale` the ring follows, concentric) and leave its `::after` to the ring.
 */
export function focusRing(on: FocusSelector, { inside = false, within, color = SYSTEM_COLOR }: FocusRingOptions = {}): CSSResult {
  if (within !== undefined) return heldRing(on, within, color);
  if (inside) return insideRing(on, color);
  const focused = on(':focus-visible');
  // focus-style: glow, read by a style container query, and, for browsers without style queries, from
  // data-focus-style (syncFocusStyle).
  return unsafeCSS(`
  ${focused} {
    --_focus-inner-edge: calc(var(--tanrei-sys-focus-offset) + var(--tanrei-sys-focus-inner-width));
    outline: var(--tanrei-sys-focus-outer-width) solid ${color};
    outline-offset: var(--_focus-inner-edge);
  }
  ${focused}::after {
    content: '';
    position: absolute;
    inset: calc(var(--_focus-inner-edge) * -1);
    border: var(--tanrei-sys-focus-inner-width) solid var(--tanrei-sys-color-focus-ring-inner);
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale) + var(--_focus-inner-edge));
    pointer-events: none;
  }

  @container style(${BEHAVIOR}-focus-style: glow) {${glow(focused, color)}
  }
  ${glow(on("[data-focus-style='glow']:focus-visible"), color)}
`);
}

// focus-style: glow, inside the element: the halo's box is the element shrunk by the glow's reach (the offset, twice
// each width: the spreads and the outer blur), so the halo spreads out to the element's edge and no further.
const insideGlow = (selector: string, color = SYSTEM_COLOR) => `
  ${selector} {
    outline-color: transparent;
  }
  ${selector}::after {
    --_glow-inset: calc((var(--tanrei-sys-focus-inner-width) + var(--tanrei-sys-focus-outer-width)) * 2);
    inset: var(--_glow-inset);
    border: 0;
    border-radius: max(0px, calc(var(--tanrei-corner-radius) * var(--_corner-scale) - var(--_glow-inset)));
    box-shadow:
      0 0 var(--tanrei-sys-focus-inner-width) var(--tanrei-sys-focus-inner-width) var(--tanrei-sys-color-focus-ring-inner),
      0 0 var(--tanrei-sys-focus-outer-width) calc(var(--tanrei-sys-focus-inner-width) + var(--tanrei-sys-focus-outer-width)) ${color};
  }`;

function insideRing(on: FocusSelector, color: string): CSSResult {
  const focused = on(':focus-visible');
  return unsafeCSS(`
  ${focused} {
    outline: var(--tanrei-sys-focus-outer-width) solid ${color};
    outline-offset: calc(var(--tanrei-sys-focus-outer-width) * -1);
  }
  ${focused}::after {
    content: '';
    position: absolute;
    inset: var(--tanrei-sys-focus-outer-width);
    border: var(--tanrei-sys-focus-inner-width) solid var(--tanrei-sys-color-focus-ring-inner);
    border-radius: max(0px, calc(var(--tanrei-corner-radius) * var(--_corner-scale) - var(--tanrei-sys-focus-outer-width)));
    pointer-events: none;
  }

  @container style(${BEHAVIOR}-focus-style: glow) {${insideGlow(focused, color)}
  }
  ${insideGlow(on("[data-focus-style='glow']:focus-visible"), color)}
`);
}

// focus-style: glow, held within `within` of room: the halo's box starts after the offset and is pulled in by what its
// reach (the offset, then twice each width) lacks of the room — the glow above with room for it, insideGlow with none.
const heldGlow = (selector: string, within: string, color = SYSTEM_COLOR) => `
  ${selector} {
    outline-color: transparent;
  }
  ${selector}::after {
    --_glow-inset: calc(max(0px, calc(var(--tanrei-sys-focus-offset) + (var(--tanrei-sys-focus-inner-width) + var(--tanrei-sys-focus-outer-width)) * 2 - (${within}))) - var(--tanrei-sys-focus-offset));
    inset: var(--_glow-inset);
    border: 0;
    border-radius: max(0px, calc(var(--tanrei-corner-radius) * var(--_corner-scale) - var(--_glow-inset)));
    box-shadow:
      0 0 var(--tanrei-sys-focus-inner-width) var(--tanrei-sys-focus-inner-width) var(--tanrei-sys-color-focus-ring-inner),
      0 0 var(--tanrei-sys-focus-outer-width) calc(var(--tanrei-sys-focus-inner-width) + var(--tanrei-sys-focus-outer-width)) ${color};
  }`;

/**
 * A box the component adds only to carry the indicator over its content — over a text that scrolls
 * (`(focus) => \`.scroll${focus} ~ .focus\``), or above what a tab draws (its `.ring`): drawn as no element
 * (`drawnAsNoElement()`), so that the text it lies over is still checked for contrast. `focusRing()` gives the box the
 * outline, which its `::before` draws, and the `::after` (the inner stroke, the glow), which stays drawn. Write it
 * beside `focusRing()` for the same box, with the box's plain selector; the box leaves its `::before` to it too.
 */
export const focusRingBox = (selector: string): CSSResult => drawnAsNoElement(selector, ['outline', 'outline-offset']);

// The ring held within `within` of room: `--_focus-pull` is what the ring's reach (the offset and both strokes) lacks
// of the room, and every edge is drawn that much further in.
function heldRing(on: FocusSelector, within: string, color: string): CSSResult {
  const focused = on(':focus-visible');
  return unsafeCSS(`
  ${focused} {
    --_focus-pull: max(0px, calc(var(--tanrei-sys-focus-offset) + var(--tanrei-sys-focus-inner-width) + var(--tanrei-sys-focus-outer-width) - (${within})));
    --_focus-inner-edge: calc(var(--tanrei-sys-focus-offset) + var(--tanrei-sys-focus-inner-width) - var(--_focus-pull));
    outline: var(--tanrei-sys-focus-outer-width) solid ${color};
    outline-offset: var(--_focus-inner-edge);
  }
  ${focused}::after {
    content: '';
    position: absolute;
    inset: calc(var(--_focus-inner-edge) * -1);
    border: var(--tanrei-sys-focus-inner-width) solid var(--tanrei-sys-color-focus-ring-inner);
    border-radius: max(0px, calc(var(--tanrei-corner-radius) * var(--_corner-scale) + var(--_focus-inner-edge)));
    pointer-events: none;
  }

  @container style(${BEHAVIOR}-focus-style: glow) {${heldGlow(focused, within, color)}
  }
  ${heldGlow(on("[data-focus-style='glow']:focus-visible"), within, color)}
`);
}

/**
 * The glow alone, for a control whose focus indicator is its own edge (a text field, TXF-7): it draws no ring
 * — its focused tokens show focus — but where `sys.behavior.focus-style` is glow it adds the same halo `focusRing()`
 * draws, around the element `on()` names. Unlike the ring, the condition is the control's own (a field is focused by
 * pointer too): `on(focus)` receives `:focus-visible` or `[data-focus-style='glow']:focus-visible` and maps it to its own
 * condition. The indicator element must be a positioning container carrying the shape, and leave its `::after` to it.
 */
export function focusGlow(on: FocusSelector): CSSResult {
  const halo = (selector: string) => `
  ${selector}::after {
    content: '';
    position: absolute;
    pointer-events: none;
  }${glow(selector)}`;
  return unsafeCSS(`
  @container style(${BEHAVIOR}-focus-style: glow) {${halo(on(':focus-visible'))}
  }
  ${halo(on("[data-focus-style='glow']:focus-visible"))}
`);
}

/**
 * For a box whose block-end corners have a radius of their own (a filled input box: `container.shape-bottom`, where
 * its top corners take `container.shape`): the halo `focusGlow()` draws follows those two corners too. `on` is as
 * `focusGlow()`'s, naming the box in that condition alone; `radius` is the corners' radius as the box writes it, a
 * length expression. Written after `focusGlow()` in the stylesheet.
 */
export function focusGlowEnds(on: FocusSelector, radius: string): CSSResult {
  const ends = (selector: string) => `
  ${selector}::after {
    border-end-start-radius: calc(${radius} * var(--_corner-scale) + var(--tanrei-sys-focus-offset));
    border-end-end-radius: calc(${radius} * var(--_corner-scale) + var(--tanrei-sys-focus-offset));
  }`;
  return unsafeCSS(`
  @container style(${BEHAVIOR}-focus-style: glow) {${ends(on(':focus-visible'))}
  }
  ${ends(on("[data-focus-style='glow']:focus-visible"))}
`);
}

/**
 * The glow alone, as `focusGlow()` draws it, for a box that HOLDS other components — the container of a composed
 * element, whose stylesheet writes no custom property — every member would inherit it (`heldShape()` in src/styles/shape.ts): the
 * halo is the box's `::after`, at the radius the caller gives — the box's own, as a CSS length expression for each of
 * the two cases `heldShape()` has — and nothing of it is a custom property. `on(focus)` is as `focusGlow()`'s.
 */
export function heldFocusGlow(on: FocusSelector, radius: { plain: string; eased: string }): CSSResult {
  const halo = (selector: string) => `
  ${selector} {
    outline-color: transparent;
  }
  ${selector}::after {
    content: '';
    position: absolute;
    pointer-events: none;
    inset: calc(var(--tanrei-sys-focus-offset) * -1);
    border: 0;
    border-radius: calc(${radius.plain} + var(--tanrei-sys-focus-offset));
    box-shadow:
      0 0 var(--tanrei-sys-focus-inner-width) var(--tanrei-sys-focus-inner-width) var(--tanrei-sys-color-focus-ring-inner),
      0 0 var(--tanrei-sys-focus-outer-width) calc(var(--tanrei-sys-focus-inner-width) + var(--tanrei-sys-focus-outer-width)) ${SYSTEM_COLOR};
  }
  @supports (corner-shape: superellipse(log(2, 2))) {
    ${selector}::after {
      border-radius: calc(${radius.eased} + var(--tanrei-sys-focus-offset));
    }
  }`;
  return unsafeCSS(`
  @container style(${BEHAVIOR}-focus-style: glow) {${halo(on(':focus-visible'))}
  }
  ${halo(on("[data-focus-style='glow']:focus-visible"))}
`);
}

/**
 * BTN-10: where style queries are missing, the focus style is read when focus arrives. Call it from the focused
 * element's `focus` listener; it writes `data-focus-style` on `target` (the element `on()` names the condition of) — at
 * once for keyboard focus (`:focus-visible` on the element focused), in the next frame callback for focus that draws no
 * indicator.
 */
export function syncFocusStyle(host: Element, target: HTMLElement | null) {
  if (!target) return;
  const read = () => (target.dataset.focusStyle = choice(host, 'focus-style'));
  // Keyboard focus draws its indicator in the next frame: its style is read now. Focus that came with a press draws
  // none, and the read is a read of the page's style (WebKit styles the whole document to answer it): in the press's
  // task it styled the page once more, after the press and the focus had changed it, before the frame that styles it
  // anyway. It is made in the next frame callback instead, with that frame's style.
  // Which focus it is, is asked of the element that holds it, not of `target`: the target is often a box around it
  // (a field's frame, a container), which never matches `:focus-visible` itself — keyboard focus read late there left
  // `data-focus-style` unwritten until the frame (SEL-21).
  if (focusedIn(document)?.matches(':focus:not(:focus-visible)')) requestAnimationFrame(read);
  else read();
}
