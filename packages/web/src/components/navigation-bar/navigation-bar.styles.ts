import { css, unsafeCSS } from 'lit';
import { cornerRadius, destinationStyles, iconGlyph, shape } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';

// Every visual value is a token (tokens/comp/navigation-bar.tokens.json). The bar paints its container, its top edge,
// the layout of its cells and the active indicator while it moves; each destination paints its item container (its
// whole share of the bar, held in by container.padding: the state layer's box, and the active indicator at rest), its
// icon indicator, icon, label and the covered copy of both, from the condition (unselected, selected,
// filled-unselected, filled-selected) and state it is in — how a state looks is the design system's decision,
// the component only says which tokens are drawn.
const PREFIX = '--tanrei-comp-navigation-bar';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);
const selection = unsafeCSS(`var(${PREFIX}-motion-selection-duration) var(${PREFIX}-motion-selection-easing)`);
const recolor = unsafeCSS('var(--_recolor-duration) var(--_recolor-easing)');
/** The item container's own corners, for a box drawn to its shape (the icon indicator's fill). */
const BOX_RADIUS = 'calc(var(--tanrei-corner-radius) * var(--_corner-scale))';

/**
 * The bar (NVB-11, NVB-18): the parent's full width, at least container.height above the bottom inset, on its color and
 * elevation with its top edge — the same whichever destination is selected and while the indicator moves; its width,
 * less container.padding at its start and at its end, divided into equal cells in reading order (logical, so RTL
 * mirrors). The color reaches under the bottom and side insets, the destinations stay inside them.
 *
 * The active indicator while it moves (NVB-15, NVB-27): one layer under the destinations, an item container's size, in
 * the selected destination's item container color, which the element places between the destinations' item containers —
 * sliding to a new selection, or where a dragged pointer is. At rest it is not drawn: the selected destination's item
 * container is the indicator, so it is never painted twice.
 *
 * NVB-27: a sideways drag on the bar is the indicator's and a vertical one the page's (`touch-action: pan-y`).
 */
export const barStyles = css`
  :host {
    display: block;
    --_inset-bottom: env(safe-area-inset-bottom, 0px);
    --_inset-left: env(safe-area-inset-left, 0px);
    --_inset-right: env(safe-area-inset-right, 0px);
  }
  :host([hidden]) {
    display: none;
  }
  .bar {
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    inline-size: 100%;
    padding-block-end: var(--_inset-bottom);
    padding-left: var(--_inset-left);
    padding-right: var(--_inset-right);
    background: ${t('container-color')};
    box-shadow: ${t('container-elevation')};
    touch-action: pan-y pinch-zoom;
  }
  .outline {
    position: absolute;
    z-index: 1;
    inset-inline: 0;
    inset-block-start: 0;
    block-size: ${t('outline-width')};
    background: ${t('outline-color')};
    pointer-events: none;
  }
  .destinations {
    box-sizing: border-box;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    min-block-size: ${t('container-height')};
    padding-inline: ${t('container-padding')};
  }
  .pill {
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    inline-size: 0;
    block-size: 0;
    visibility: hidden;
    pointer-events: none;
    background: ${t('selected-item-container-color')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-item-container-shape`))}
    /* The selection motion (a slide, a return) and the state motion (the catch-up of a drag, NVB-27), read by the
       element through real properties: no animation is named and no property transitions here. */
    animation-duration: ${t('motion-selection-duration')};
    animation-timing-function: ${t('motion-selection-easing')};
    transition-property: none;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  .pill.moving {
    visibility: visible;
  }
  .pill.filled {
    background: ${t('filled-selected-item-container-color')};
  }
  .pill.d {
    background: ${t('selected-disabled-item-container-color')};
  }
  .pill.filled.d {
    background: ${t('filled-selected-disabled-item-container-color')};
  }
  ${shape}
  @media (prefers-reduced-motion: reduce) {
    .pill {
      animation-duration: 0s;
      transition-duration: 0s;
    }
  }
  @media (forced-colors: active) {
    .outline {
      background: CanvasText;
    }
    .pill {
      background: Highlight;
    }
  }
`;

/**
 * The item container, the icon indicator and the covered copy (NVB-5, NVB-6, NVB-12, NVB-13, NVB-23), over the shared
 * destination's cell, states, press, ripple and focus ring:
 *
 *   .cell        the hit area: the destination's share of the bar's width and the bar's full height; the first and the
 *                last reach the bar's two ends (their ::before / ::after cover container.padding beside them)
 *   .container   the item container: the whole cell less container.padding above and below — the same box for every
 *                destination, whatever it holds, with corners item.container.shape — a grid holding the two copies in
 *                one area, centred, item.container.padding-block and -inline inside it
 *     .indicator its fill: the state layer, and the active indicator while selected
 *     .content   the column: the icon indicator (its fill behind the icon, the badge on the icon), the label item.gap below
 *     .covered   the same column again, in the covered colors: at rest the whole of it when selected and none of it
 *                otherwise; while the indicator moves, the element clips it to the indicator frame by frame
 */
const boxStyles = css`
  /* NVB-5: the focus indicator reaches over the neighbouring destinations, so the focused one is drawn above them. */
  :host(:focus-within) {
    z-index: 1;
  }
  .cell {
    align-items: stretch;
    padding-block: ${t('container-padding')};
  }
  /* NVB-28: a destination that is a link is not draggable as a link — the drag is the indicator's. (The cell unsets
     every property, the browser's own rule for draggable="false" with them.) */
  a.cell {
    -webkit-user-drag: none;
  }
  /* NVB-6: the first and the last cell's hit areas reach the bar's start and end edges. */
  .cell.first::before,
  .cell.last::after {
    content: '';
    position: absolute;
    inset-block: 0;
    inline-size: ${t('container-padding')};
  }
  .cell.first::before {
    inset-inline-end: 100%;
  }
  .cell.last::after {
    inset-inline-start: 100%;
  }
  .container {
    display: grid;
    flex: 1 1 auto;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    place-items: stretch;
    padding-block: ${t('item-container-padding-block')};
    padding-inline: ${t('item-container-padding-inline')};
  }
  .content,
  .covered {
    grid-area: 1 / 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-inline-size: 0;
  }
  .covered {
    clip-path: inset(50%);
  }
  /* At rest the selected destination's covered copy is the whole of it — its icon and label wholly in their covered
     colors, whatever the item container's corners would cut off a long label — and the plain glyph and label under it
     are not drawn, so no edge of theirs shows around the covered colors. While the indicator moves both are drawn
     (data-moving): the covered copy clipped to the indicator, the plain one cut away exactly there. */
  .cell.selected .covered {
    clip-path: none;
  }
  .cell.selected .container:not([data-moving]) > .content :is(.icon, .label) {
    visibility: hidden;
  }
  /* The indicator slides between destinations (the bar draws it on the way): a change of selection repaints the item
     containers at once, and the icon indicators grow in and fade out instead. */
  .cell[data-condition-change] .indicator {
    transition: none;
  }

  /* The icon indicator: item.icon-indicator.width × height with its corners, the icon centred in it. Every part is laid
     out in every system: a transparent fill hides it without moving anything. */
  .icon-indicator,
  .c-icon-indicator {
    position: relative;
    isolation: isolate;
    display: grid;
    place-items: center;
    flex: none;
    inline-size: ${t('item-icon-indicator-width')};
    block-size: ${t('item-icon-indicator-height')};
  }
  .icon-indicator {
    ${unsafeCSS(cornerRadius(`${PREFIX}-item-icon-indicator-shape`))}
  }
  .icon-fill {
    position: absolute;
    z-index: -1;
    inset: 0;
    border-radius: ${unsafeCSS(BOX_RADIUS)};
    corner-shape: inherit;
    background: var(--_ii);
    pointer-events: none;
    animation-duration: ${t('motion-selection-duration')};
    animation-timing-function: ${t('motion-selection-easing')};
    transition: background-color ${recolor};
  }
  .cell.selected[data-condition-change] .icon-fill {
    transition: none;
  }
  /* The plain glyph (and its badge), as a box the element can cut where the indicator covers it. */
  .plain {
    display: grid;
    place-items: center;
  }

  /* The label: item.gap below the icon indicator, on one line, never wider than the item container's content box — a
     longer one is cut at its end with an ellipsis inside the padding. A label that is not drawn collapses to nothing over
     the selection motion, so the icon indicator comes to the middle of the item container, whose size does not change
     (NVB-13). */
  .label-box,
  .c-label-box {
    display: grid;
    align-self: center;
    grid-template-rows: 1fr;
    grid-template-columns: minmax(0, 1fr);
    max-inline-size: 100%;
    min-inline-size: 0;
    margin-block-start: ${t('item-gap')};
    transition:
      grid-template-rows ${selection},
      margin-block-start ${selection},
      opacity ${selection};
  }
  .cell.no-label :is(.label-box, .c-label-box) {
    grid-template-rows: 0fr;
    margin-block-start: 0px;
    opacity: 0;
  }
  .c-label {
    min-block-size: 0;
    min-inline-size: 0;
    overflow: hidden;
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
    font: ${t('item-label-typescale-font')};
    letter-spacing: ${t('item-label-typescale-letter-spacing')};
    color: var(--_cl);
    transition: color ${recolor};
  }
  /* NVB-26: a label, in both of its copies, is its own run in the direction of its first strong character: it keeps its
     order in a right-to-left bar and, too long for its item container, loses the end of its own direction — a
     left-to-right label its right end, never its beginning. It stays centred (src/styles/product-text.ts). */
  ${productText(':is(.label, .c-label)')}
  /* NVB-25: iconGlyph() mirrors the glyph GlyphMirrorController marked, in both copies, in right-to-left. */
  ${iconGlyph('.c-icon', { size: `${PREFIX}-item-icon-size`, selected: '.cell.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .c-icon {
    color: var(--_ci);
    transition:
      color ${recolor},
      font-variation-settings ${recolor};
  }
  .cell:where(:has(> .container[data-pressed]:not([data-pressed='none']))) :is(.icon-fill, .c-icon, .c-label) {
    transition-duration: 0s;
  }

  @media (prefers-reduced-motion: reduce) {
    .icon-fill,
    .label-box,
    .c-label-box,
    .c-label,
    .c-icon {
      transition: none;
    }
    .icon-fill {
      animation-duration: 0s;
    }
  }
  @media (forced-colors: active) {
    .covered {
      display: none;
    }
    .cell.selected .container:not([data-moving]) > .content :is(.icon, .label) {
      visibility: visible;
    }
  }
`;

/**
 * A destination (NVB-4…10, NVB-12…16, NVB-23): the shared destination styles with the icon indicator and the covered
 * colors as parts of every condition and the filled conditions, its cell the bar's full height and an equal share of its
 * width, narrower than the touch target when the bar is (NVB-6), its focus indicator held inside the bar (NVB-5: the room
 * around the item container is container.padding); then the item container that is the whole cell.
 */
export const itemStyles = [
  destinationStyles(PREFIX, {
    lines: 1,
    shareWidth: true,
    parts: { ii: 'item-icon-indicator-color', ci: 'item-covered-icon-color', cl: 'item-covered-label-color' },
    variants: ['filled'],
    focusWithin: `var(${PREFIX}-container-padding)`,
  }),
  boxStyles,
];
