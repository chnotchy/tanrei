import { css, unsafeCSS } from 'lit';
import type { OpenAxis } from '../../primitives/index.js';
import { focusRing, iconGlyph, itemRowStyles, pressHold, rowTarget } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/list.tokens.json). An item's two conditions, unselected and selected, are
// its state variants: each colors the box, the content's foreground and the check in every state, and the item only
// says which condition and which state's tokens are drawn — never how a state looks.
const PREFIX = '--tanrei-comp-list';
const T = (name: string) => `var(${PREFIX}-${name})`;

/** The densities every design system has (LST-51). A layer may add more; those get their rules on demand. */
export const CORE_DENSITIES = ['regular', 'compact'] as const;
const DEFAULT_DENSITY = 'regular';
const ref = (member: string, density: string, fallback: string | null) =>
  fallback ? `var(${PREFIX}-${member}-${density}, var(${PREFIX}-${member}-${fallback}))` : `var(${PREFIX}-${member}-${density})`;
/**
 * LST-51: the list's density, set on its host as private switches its items inherit: an action's, a link's and an
 * option's least height and its padding above and below. LST-11: a fine pointer's item is held to the pointer target,
 * except in the compact density.
 */
const densityBlock = (density: string, selector: string, fallback: string | null = null) => `${selector} {
  --_lst-height: ${ref('container-height', density, fallback)};
  --_lst-padding-block: ${ref('container-padding-block', density, fallback)};
  --_lst-pointer-target: ${density === 'compact' ? '0px' : 'var(--tanrei-sys-target-pointer)'};
}`;

/** LST-51: a density a layer added gets its block on demand, falling back to the default's tokens. */
export const AXES: readonly OpenAxis[] = [
  {
    name: 'density',
    core: CORE_DENSITIES,
    default: DEFAULT_DENSITY,
    rules: (value, selector) => densityBlock(value, selector, DEFAULT_DENSITY),
    probe: (value) => `${PREFIX}-container-height-${value}` as const,
  },
];

/** The parts each condition colors in every state (private key → token part). */
const PARTS = {
  c: 'container-color',
  ct: 'content-color',
  m: 'mark-color',
} as const;

/**
 * Where each state is read (LST-9): an item answers states only while it is an action, a link or an option (`.p`). An
 * interactive item's box is its own button, so its focus is the box's; an option's semantics and focus are its host's.
 * Every selector has the same specificity, so the order the states are written in is the precedence.
 */
const on = (state: string) => {
  if (state === ':focus-visible') return '.row.p:focus-visible, :host(:focus-visible) .row';
  if (state === ':disabled') return '.row.p.d';
  return `.row.p${state}`;
};

/** The list itself: a box that lays its items out and draws nothing, and adds no space, around them. */
export const listStyles = css`
  :host {
    display: block;
    /* Its own stacking order: the z-index of a part below orders the component's parts only, and never reaches the
       page's (a sticky header of the product's). What stands over the page is drawn in the top layer. */
    isolation: isolate;
    /* LST-1: the gap between two items, by the gap value; none where it names nothing the list defines (LST-6). The
       items read it too: the divider stands in the middle of it (LST-3). */
    --_gap: 0px;
  }
  ${unsafeCSS(densityBlock(DEFAULT_DENSITY, ':host'))}
  ${unsafeCSS(
    CORE_DENSITIES.filter((density) => density !== DEFAULT_DENSITY)
      .map((density) => densityBlock(density, `:host([density='${density}'])`))
      .join('\n'),
  )}
  :host([gap='small']) {
    --_gap: ${unsafeCSS(T('gap-small'))};
  }
  :host([gap='medium']) {
    --_gap: ${unsafeCSS(T('gap-medium'))};
  }
  :host([gap='large']) {
    --_gap: ${unsafeCSS(T('gap-large'))};
  }
  /* LST-1: a column from the top, each item as wide as the list; LST-5: logical, so right-to-left mirrors a line. */
  .items {
    display: flex;
    flex-direction: column;
    gap: var(--_gap);
    position: relative;
  }
  /* LST-1: a line from the start edge, each item as wide as its content and as tall as the tallest, never narrower
     than its content: a line wider than the list goes past its end. */
  :host([orientation='horizontal']) .items {
    flex-direction: row;
    align-items: stretch;
  }
  ::slotted(*) {
    flex: none;
  }
  /* LST-2: a grid — lines that wrap, the items of a line aligned at their start, never wider than the list. A vertical
     list wraps onto further columns where the height the product gives it ends. */
  :host([wrap]) .items {
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: flex-start;
  }
  :host([wrap]) ::slotted(*) {
    max-inline-size: 100%;
  }
  :host([wrap]:not([orientation='horizontal'])) .items {
    block-size: 100%;
  }
  /* LST-37: while a pointer carries an item, nothing of the list is selected as text, and the cursor is the platform's
     for something held. */
  :host([data-pointer-carrying]) {
    cursor: grabbing;
    -webkit-user-select: none;
    user-select: none;
  }
  /* LST-44: what is announced is drawn nowhere; its box is placed in a box of the list's own that takes no room. */
  .quiet {
    position: relative;
    display: block;
    block-size: 0;
  }
  /* LST-38, LST-41, LST-43: it also carries the time and the curve of the reorder motion as the cascade computes them, for
     the script that moves the items and waits for the product's order (a duration token is an expression: it is
     computed through a real property, here one that moves nothing). */
  .announcer {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
    transition-property: none;
    transition-duration: ${unsafeCSS(T('motion-reorder-duration'))};
    transition-timing-function: ${unsafeCSS(T('motion-reorder-easing'))};
  }
`;

export const itemStyles = css`
  :host {
    display: block;
    position: relative;
    box-sizing: border-box;
    /* LST-10: the ring is drawn inside the item, never around the host. */
    outline: none;
  }
  /* LST-37: a dragged item is drawn above the other items of the list. */
  :host([data-dragged]) {
    z-index: 1;
  }

  /* LST-8, LST-9, LST-13, LST-15, LST-16, LST-25: the conditions, the states and their precedence, the paints, the ripple
     and the state motion (src/primitives/item-row.ts). */
  ${itemRowStyles({
    prefix: PREFIX,
    parts: PARTS,
    conditions: { unselected: '.row', selected: '.row.selected' },
    on,
    paints: { '.row.p .content': 'ct', '.new-context': 'ct' },
  })}

  /* LST-7: a static item draws nothing and adds no space: its content is the item. */
  .row {
    display: flex;
    align-items: center;
    block-size: 100%;
  }
  /* LST-8: an action, a link or an option is one padded box, at least container.height tall, its content and the parts
     beside it container.gap apart; it grows with its content, never clipping it. */
  .row.p {
    gap: ${unsafeCSS(T('container-gap'))};
    padding-block: var(--_lst-padding-block, ${unsafeCSS(T('container-padding-block-regular'))});
    padding-inline: ${unsafeCSS(T('container-padding-inline-start'))} ${unsafeCSS(T('container-padding-inline-end'))};
  }
  .row.p .content {
    font: ${unsafeCSS(T('content-typescale-font'))};
    letter-spacing: ${unsafeCSS(T('content-typescale-letter-spacing'))};
  }
  /* LST-26: a link item's box is an anchor, and nothing of a text link — no underline, no link or visited color. */
  a.row {
    color: inherit;
    text-decoration: none;
  }
  /* LST-11: an action, a link or an option is at least the minimum target tall and wide. */
  ${rowTarget('.row.p', `var(--_lst-height, ${T('container-height-regular')})`, 'var(--_lst-pointer-target, var(--tanrei-sys-target-pointer))')}
  .row.p {
    min-inline-size: var(--tanrei-sys-target-pointer);
  }
  @media (pointer: coarse) {
    .row.p {
      min-inline-size: var(--tanrei-sys-target-touch);
    }
  }
  .content {
    display: block;
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  /* LST-32: the handle at the item's start, container.gap before the content and centred across the item. A Button: its
     own tokens, press answer, target, states and focus ring. A touch on it drags at once and never scrolls (LST-36). */
  .row.reorder {
    gap: ${unsafeCSS(T('container-gap'))};
  }
  .handle {
    flex: none;
    touch-action: none;
  }
  .handle-glyph {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
  }
  .handle-glyph:not([data-drawn]) {
    visibility: hidden;
  }
  /* LST-36: in a reorderable list the whole item can be dragged: it is not selected as text or called out by a long
     press, and a fine pointer shows that it can be held. */
  .row.reorder {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  @media (hover: hover) and (pointer: fine) {
    .row.reorder {
      cursor: grab;
    }
  }

  /* LST-37: a dragged item, under its content: the dragged fill and shadow, with the container's corners, arriving over
     the state motion (at once where motion is reduced). */
  .row {
    transition-property: background-color, opacity, border-radius, box-shadow;
  }
  :host([data-dragged]) .row {
    background: ${unsafeCSS(T('dragged-container-color'))};
    box-shadow: ${unsafeCSS(T('dragged-container-elevation'))};
    ${unsafeCSS(cornerRadius('--tanrei-comp-list-container-shape'))}
  }
  :host([data-dragged]) .divider {
    visibility: hidden;
  }

  /* LST-21: the check's box is reserved at the end of every option. The check is the icon set's \`check\` glyph, always in
     the selected family and fill, in the mark color of the condition, never mirrored; it fades in or out over the state
     motion, never moved or scaled, and at once where motion is reduced. */
  ${iconGlyph('.mark', { size: '--tanrei-comp-list-mark-size', selected: '.row', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .mark {
    color: var(--_m);
    opacity: 0;
    /* LST-22: nothing in the glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn). */
    visibility: hidden;
    transition:
      opacity ${unsafeCSS(T('motion-state-duration'))} ${unsafeCSS(T('motion-state-easing'))},
      color ${unsafeCSS(T('motion-state-duration'))} ${unsafeCSS(T('motion-state-easing'))},
      font-variation-settings ${unsafeCSS(T('motion-state-duration'))} ${unsafeCSS(T('motion-state-easing'))};
  }
  .row.selected .mark {
    opacity: 1;
  }
  .mark[data-drawn] {
    visibility: visible;
  }
  /* LST-28: the mark of a new context at the item's end, mirrored in right-to-left as the icon set marks its name. */
  ${iconGlyph('.new-context', { size: '--tanrei-sys-icon-small', selected: '.row.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .new-context:not([data-drawn]) {
    visibility: hidden;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  @media (prefers-reduced-motion: reduce) {
    .mark,
    .row {
      transition: none;
    }
  }

  /* LST-3: the hairline between this item and the one before it, across the list and in the middle of the gap. It is
     the box's sibling, so it keeps its color and its full opacity in every state and condition. */
  .divider {
    position: absolute;
    background: ${unsafeCSS(T('divider-color'))};
    pointer-events: none;
  }
  .divider.block {
    inset-inline: 0;
    inset-block-start: calc(-1 * (var(--_gap, 0px) + ${unsafeCSS(T('divider-thickness'))}) / 2);
    block-size: ${unsafeCSS(T('divider-thickness'))};
  }
  .divider.inline {
    inset-block: 0;
    inset-inline-start: calc(-1 * (var(--_gap, 0px) + ${unsafeCSS(T('divider-thickness'))}) / 2);
    inline-size: ${unsafeCSS(T('divider-thickness'))};
  }

  /* LST-10, LST-14: the ring (or the glow) inside the box — a scrolling ancestor cannot clip it — never animated, for
     keyboard focus only: on the box of an interactive item or a link item, or on the host of an option. */
  ${focusRing((focus) => `.row.p${focus}`, { inside: true })}
  ${focusRing((focus) => `:host(${focus}) .row`, { inside: true })}

  /* LST-14: corner smoothing on the box (data-tanrei-shape). */
  ${shape}

  /* LST-12: an empty box carries press-hold for PressController; it draws nothing and has no transition of its own. */
  .hold {
    position: absolute;
    inline-size: 0;
    block-size: 0;
    overflow: hidden;
    pointer-events: none;
  }
  ${pressHold('.hold')}

  @media (forced-colors: active) {
    .row.p.d {
      color: GrayText;
    }
    .divider {
      background: CanvasText;
    }
    /* LST-45: a dragged item on the background color with a hairline edge in the highlight color. */
    :host([data-dragged]) .row {
      background: Canvas;
      box-shadow: none;
      outline: var(--tanrei-sys-border-hairline) solid Highlight;
      outline-offset: calc(-1 * var(--tanrei-sys-border-hairline));
    }
  }
`;
