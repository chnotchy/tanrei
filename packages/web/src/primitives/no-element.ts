import { type CSSResult, unsafeCSS } from 'lit';

/**
 * A box of a component's own that is drawn over its content — the box that carries a focus indicator over a text that
 * scrolls, a panel's edge kept above what scrolls in it, a state layer over a covered copy — drawn as no element. The box
 * keeps its place, holds the values (and runs their transitions), but is `visibility: hidden`; its `::before` inherits
 * `inherited` (the properties the box draws with, as CSS property names) with the box's corners, and draws the same
 * thing at the same place in the paint order: it is the box's first child. What the box holds (a ripple) and its
 * `::after` (a focus ring's inner stroke) stay drawn.
 *
 * Why: a contrast checker sees what lies over a text from the page's elements, whatever their `pointer-events` —
 * axe-core's `color-contrast` builds its own paint order of every visible element with a size, and leaves a text under
 * any of them "incomplete" (overlapped by another element) instead of checking it, so a faint text there passes unseen.
 * A pseudo-element is not one of them, so the text under it is checked.
 *
 * The box is positioned and has no border of its own (its `::before` fills its padding box), and uses neither of its
 * pseudo-elements for anything else. In forced colors a box that draws a border there (a system-color edge) draws it
 * itself: give it `visibility: visible` and its `::before` `content: none` in that mode.
 *
 * `fill`: the box is a fill of its own stacking context (`isolation: isolate`) with a ripple in it, at level -1 above the
 * fill: its `::before` lies at level -2, under the ripple, where the box's own background was drawn.
 */
export const drawnAsNoElement = (selector: string, inherited: readonly string[], { fill = false }: { fill?: boolean } = {}): CSSResult =>
  unsafeCSS(`
  ${selector} {
    visibility: hidden;
  }
  ${selector}::before {
    content: '';
    position: absolute;${fill ? '\n    z-index: -2;' : ''}
    inset: 0;
    visibility: visible;
    pointer-events: none;
    border-radius: inherit;
    corner-shape: inherit;${inherited.map((name) => `\n    ${name}: inherit;`).join('')}
  }
  ${selector}::after,
  ${selector} > * {
    visibility: visible;
  }
`);
