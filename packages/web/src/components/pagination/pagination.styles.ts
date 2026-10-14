import { css, unsafeCSS } from 'lit';
import {
  DISABLED,
  type OpenAxis,
  conditionBlock,
  conditionStates,
  focusRing,
  iconGlyph,
  minimumTarget,
  neighbourTarget,
  pressHold,
  rippleStyles,
  selectionContainerShape,
} from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/pagination.tokens.json). An item has two parts — a page or a control
// (`item`) and the current page (`current`) — which are its state variants: each colors the container, the number and
// the arrow, in every state. How a state looks is the design system's decision (a state-layer mix in the default
// system, a dim or nothing elsewhere), by value; the component only says which state's tokens are drawn.
export const CORE_SIZES = ['small', 'medium'] as const;
const DEFAULT_SIZE = 'medium';
const PREFIX = '--tanrei-comp-pagination';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);

/** PGN-12: the size axis has one member, the container height (an item's height and least width). */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n  --_height: ${fallback ? `var(${PREFIX}-container-height-${size}, var(${PREFIX}-container-height-${fallback}))` : `var(${PREFIX}-container-height-${size})`};\n}`;

/**
 * PGN-12: a size a layer added gets its block on demand, built by the same function and falling back to the default's
 * token; a value the active system lacks is reported in debug builds (src/primitives/axes.ts).
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
];

/** The parts each variant colors in every state: the container, the page's number, the control's arrow. */
const PARTS = { c: 'container-color', l: 'label-color', i: 'icon-color' } as const;

/**
 * Where each state is read (PGN-13): hover, keyboard focus, press (`data-pressed`, PressController) and disabled on the
 * item's own element — a native button, or the anchor of a link, whose disabled form carries `aria-disabled` (DISABLED
 * names both). `:where()` keeps every selector at one class, so the order is the precedence.
 */
const on = (state: string) => `.item:where(${state === ':disabled' ? DISABLED : state})`;

export const styles = css`
  /* PGN-11, PGN-12: as wide as the layout gives it, asking a layout that sizes it by its content for the width of its
     widest form (.measure below) and for no least width. */
  :host {
    display: block;
    box-sizing: border-box;
    min-inline-size: 0;
    --_gap: ${t('gap')};
  }
  /* PGN-3: no page — nothing is drawn, no room is taken, no landmark is exposed. */
  :host([hidden]),
  :host([data-empty]) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}

  nav {
    display: block;
    min-inline-size: 0;
  }

  /* PGN-1, PGN-12: one row at the start edge, comp.pagination.gap apart, never wrapped. The row is as wide as the
     element and asks for no width of its own: the width the element asks for is the measuring copy's to say. */
  .row,
  .sizer {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-start;
    gap: var(--_gap);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    box-sizing: border-box;
    inline-size: 0;
    min-inline-size: 100%;
  }
  .slot {
    display: flex;
    flex: none;
    align-items: center;
  }

  /* PGN-11: a copy of the widest form the variant draws — the numbered row, or the compact one — laid out at no height,
     clipped and unseen, so that the element's own width as its content is that row's, and its least width is none (a
     grid track of minmax(0, max-content)). The element compares the copy with its own width to choose the form. */
  .measure {
    display: grid;
    grid-template-columns: minmax(0, max-content);
    block-size: 0;
    overflow: hidden;
    overflow: clip;
    visibility: hidden;
    pointer-events: none;
  }
  .sizer {
    inline-size: max-content;
    justify-self: start;
  }

  ${unsafeCSS(conditionBlock(PREFIX, 'item', PARTS, '.item'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'current', PARTS, '.item.current'))}

  /* PGN-9, PGN-12, PGN-22: an item is the size's container height high and at least as wide, its number centred with
     comp.pagination.container.padding-inline on each side where it is wider than the square, its arrow centred in it;
     it grows with its number where the text is enlarged, never below the height. */
  .item {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the content. */
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--_height);
    min-block-size: var(--_height);
    padding-inline: ${t('container-padding-inline')};
    ${unsafeCSS(selectionContainerShape)}
    background: var(--_c);
    color: var(--_l);
    font: ${t('label-typescale-font')};
    letter-spacing: ${t('label-typescale-letter-spacing')};
    /* PGN-9: figures of one width, so that the row keeps its width from page to page. */
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    /* PGN-18: an item changes between its states over the state motion. */
    transition-property: background-color, color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  /* PGN-17: the one corner rule, after the item's reset (all: unset). */
  ${shape}

  /* PGN-20: the hit area reaches the minimum target above and below, and along the row toward a neighbour no further
     than half the gap between them, so that no two hit areas overlap; at the row's two ends it reaches the whole target. */
  ${minimumTarget('.item')}
  ${neighbourTarget('.item')}
  .item {
    --_cap-start: calc(var(--_gap) / 2);
    --_cap-end: calc(var(--_gap) / 2);
  }
  .slot:first-child > .item {
    --_cap-start: initial;
  }
  .slot:last-child > .item {
    --_cap-end: initial;
  }

  /* PGN-4, PGN-13, PGN-16: each state paints from that state's tokens of the item's part (item, or current); pressed >
     focused > hovered, disabled over all. Pressed is data-pressed="<feedback>" (PressController): overlay paints the
     pressed tokens on the whole container; ripple and dim paint everything else from them while the container color
     stays with the state under the press; none paints nothing. */
  ${unsafeCSS(conditionStates(PREFIX, PARTS, { container: 'c', root: '.item', on }))}
  .item[data-pressed]:not([data-pressed='none']) .glyph {
    transition-duration: 0s;
  }

  /* PGN-16 ripple: the pressed container color of the item's part, grown over motion.feedback-duration and faded over
     motion.state-duration, both with motion.state-easing, clipped to the item's corners. */
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* PGN-14, PGN-17: the ring (or the glow) around the item, for keyboard focus only, never animated. */
  ${focusRing((focus) => `.item${focus}`)}

  /* PGN-8: the arrows of the icon set, unselected, at comp.pagination.icon.size, in the icon color of the item's state;
     PGN-23: iconGlyph() mirrors in right-to-left the glyph GlyphMirrorController marked, in its own box. */
  ${iconGlyph('.glyph', { size: `${PREFIX}-icon-size`, selected: ':not(*)', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .glyph {
    color: var(--_i);
    transition: color ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  /* Nothing in an arrow's place until the icon set can draw it (GlyphDrawnController sets data-drawn); its box keeps its
     room, so no width changes when the font arrives. */
  .glyph:not([data-drawn]) .ink {
    visibility: hidden;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* PGN-10: the ellipsis, the character drawn in the number's text style and its own color, centred in a place as wide
     as an item is high. No state, no hit area. */
  .ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--_height);
    min-block-size: var(--_height);
    color: ${t('ellipsis-color')};
    font: ${t('label-typescale-font')};
    letter-spacing: ${t('label-typescale-letter-spacing')};
    -webkit-user-select: none;
    user-select: none;
  }

  /* PGN-11: the compact form's sentence, comp.pagination.count.padding-inline on each side, in its own text style and
     color, on one line. */
  .count-slot {
    min-block-size: var(--_height);
  }
  .count {
    display: block;
    padding-inline: ${t('count-padding-inline')};
    color: ${t('count-color')};
    font: ${t('count-typescale-font')};
    letter-spacing: ${t('count-typescale-letter-spacing')};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  /* PGN-24: the sentence is text of its own direction, isolated from the text around it; one without a letter
     ("3 / 10") reads from the left in either direction. */
  ${productText('.count')}

  /* PGN-15: an element that is always rendered carries press-hold for PressController. */
  ${pressHold('.hold')}
  .hold {
    display: none;
  }

  /* PGN-18: the row drawn for a new page is drawn at once, without a motion of its own (the element marks it for two
     frames); and every change of state is at once where motion is reduced. */
  .row.still .item,
  .row.still .glyph {
    transition: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .item,
    .glyph {
      transition: none;
    }
  }

  /* PGN-21: the person's own colors — the numbers, the arrows and the sentence in the text color (the link color for a
     link), the current page in the highlight colors, a disabled control in the disabled text color. The focus ring is
     focusRing()'s, in the highlight color. */
  @media (forced-colors: active) {
    .item,
    .item .glyph,
    .count,
    .ellipsis {
      color: CanvasText;
    }
    a.item,
    a.item .glyph {
      color: LinkText;
    }
    .item.current {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
    }
    .item.current .glyph {
      color: HighlightText;
    }
    .item${unsafeCSS(DISABLED)},
    .item${unsafeCSS(DISABLED)} .glyph {
      color: GrayText;
    }
    .item:focus-visible {
      outline-color: Highlight;
    }
  }
`;
