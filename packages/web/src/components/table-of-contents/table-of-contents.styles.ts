import { css, unsafeCSS } from 'lit';
import { focusRing, iconGlyph, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// What the shadow root draws: the navigation landmark, the title, and the compact presentation's block and row
// (tokens/comp/table-of-contents.tokens.json). The list itself — the product's own anchors — is drawn by
// src/styles/table-of-contents.css, in the document. Every visual value is a token; for each state the row reads that
// state's tokens of the disclosure part and never computes how a state looks.
const PREFIX = '--tanrei-comp-table-of-contents';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);
const on = (state: string) => `.row${state}`;
const paintContent = (state: string) => `
    color: var(${PREFIX}-disclosure-${state}label-color);`;
const paint = (state: string) => `
    background-color: var(${PREFIX}-disclosure-${state}container-color);${paintContent(state)}`;

export const styles = css`
  /* TOC-1: as wide as its layout; no fill, no edge, no padding and no place of its own. */
  :host {
    display: block;
    box-sizing: border-box;
    min-inline-size: 0;
  }
  /* TOC-32: no items — nothing is drawn, no space is taken, nothing is exposed. */
  :host([hidden]),
  :host([data-empty]) {
    display: none;
  }
  nav {
    display: block;
    min-inline-size: 0;
  }

  /* TOC-2: the title above the list — the label's text, or the product's own heading in its place, in one style. */
  .title {
    display: block;
    margin: 0;
    margin-block-end: ${t('container-gap')};
    font: ${t('title-typescale-font')};
    letter-spacing: ${t('title-typescale-letter-spacing')};
    color: ${t('title-color')};
    overflow-wrap: anywhere;
  }
  ${productText('.title', { align: 'start' })}
  /* (A rule on a slotted element reads that element's own cascade: only what it inherits and the tokens are named.) */
  ::slotted([slot='title']) {
    margin: 0;
    padding: 0;
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
  }

  /* ── The compact presentation (TOC-25 to TOC-27): one block with a fill, the row, and the list under it ────── */
  /* The block is never taller than its layout gives the element (a maximum height of the element's own, or the
     height a flex or grid layout holds it to): the list then scrolls inside, under the row. */
  :host([presentation='compact']) {
    display: flex;
    flex-direction: column;
  }
  .compact {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 0 1 auto;
    min-block-size: 0;
    overflow: clip;
    ${unsafeCSS(cornerRadius(`${PREFIX}-compact-container-shape`))}
    background-color: ${t('compact-container-color')};
  }

  /* The disclosure row: a button — the title, the current section's name on one line, the chevron. */
  .row {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple can sit above the container color and below the row's parts. */
    isolation: isolate;
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('compact-row-gap')};
    inline-size: 100%;
    min-block-size: max(${t('compact-row-height')}, var(--tanrei-sys-target-pointer));
    padding-inline: ${t('compact-row-padding-inline')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-row-shape`))}
    ${unsafeCSS(paint(''))}
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  @media (pointer: coarse) {
    .row {
      min-block-size: max(${t('compact-row-height')}, var(--tanrei-sys-target-touch));
    }
  }
  /* The title is never cut before the current section's name has been cut to nothing: the name has no size of its own
     and takes the room that is left; the title gives way — and wraps — only when the name has none. */
  .row-title {
    flex: 0 1 auto;
    min-inline-size: 0;
    font: ${t('title-typescale-font')};
    letter-spacing: ${t('title-typescale-letter-spacing')};
    overflow-wrap: anywhere;
  }
  /* (The current section's name too: without a letter it has no dir, and is left to right as every such text.) */
  ${productText(':is(.row-title, .row-current)')}
  .row-current {
    flex: 1 1 0%;
    min-inline-size: 0;
    overflow: hidden;
    font: ${t('compact-supporting-text-typescale-font')};
    letter-spacing: ${t('compact-supporting-text-typescale-letter-spacing')};
    color: ${t('compact-supporting-text-color')};
    text-overflow: ellipsis;
    white-space: nowrap;
    /* TOC-37: the name is text of its own direction (the element gives the box dir="auto", so that every engine cuts
       it at its own end), and its line still begins at the layout's start: the host's direction. */
    text-align: left;
  }
  :host(:dir(rtl)) .row-current {
    text-align: right;
  }
  /* TOC-25, TOC-35, TOC-38: expand_more in its box, turned half a turn while the list is shown — never mirrored, and
     nothing in its place until the icon set can draw it (GlyphDrawnController sets data-drawn); the box is kept. */
  ${iconGlyph('.chevron', { size: `${PREFIX}-compact-icon-size`, selected: ':not(*)' })}
  .chevron {
    color: ${t('compact-icon-color')};
    transition: rotate ${t('motion-disclosure-duration')} ${t('motion-disclosure-easing')};
  }
  .open .chevron {
    rotate: 0.5turn;
  }
  .chevron:not([data-drawn]) {
    visibility: hidden;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* TOC-26, TOC-27: the list under the row. Closed, its track has no height and it is neither drawn nor reachable
     (the element also makes it inert at once); open, it is as high as its rows, and scrolls where the block is held
     to less. The height moves over the disclosure motion, the rows clipped while it does. */
  .compact .scroller {
    flex: 0 1 auto;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .compact .clip {
    display: grid;
    grid-template-rows: 0fr;
    visibility: hidden;
    transition:
      grid-template-rows ${t('motion-disclosure-duration')} ${t('motion-disclosure-easing')},
      visibility 0s linear ${t('motion-disclosure-duration')};
  }
  .compact.open .clip {
    grid-template-rows: 1fr;
    visibility: visible;
    transition-delay: 0s;
  }
  .compact .inner {
    min-block-size: 0;
    overflow: clip;
    padding-inline: ${t('compact-list-padding-inline')};
  }
  /* The space under the list is the list's own, inside what is clipped: a closed block is as high as its row. */
  .compact .inner::after {
    content: '';
    display: block;
    block-size: ${t('compact-list-padding-block')};
  }

  /* TOC-18, TOC-20, TOC-21: each state paints the row from that state's tokens of the disclosure part; pressed over
     focused over hovered. Pressed is data-pressed="<feedback>" (PressController). */
  ${stateRules(on, {
    hovered: `${paint('hovered-')}
    opacity: var(${PREFIX}-hovered-opacity);`,
    focused: `${paint('focused-')}
    opacity: var(${PREFIX}-focused-opacity);`,
    pressed: `${paint('pressed-')}
    opacity: var(${PREFIX}-pressed-opacity);`,
    pressedContent: `${paintContent('pressed-')}
    opacity: var(${PREFIX}-pressed-opacity);`,
    disabled: '',
  })}
  ${rippleStyles({
    color: `${PREFIX}-disclosure-pressed-container-color`,
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}
  /* TOC-19, TOC-22: the focus indicator inside the row — the ring, or the glow — never animated. */
  ${focusRing(on, { inside: true })}
  /* TOC-22, corner smoothing: the shared rule, on the block and the row (data-tanrei-shape). */
  ${shape}
  /* TOC-20: the current section's name carries press-hold for PressController. */
  ${pressHold('.row-current')}

  /* TOC-30: a change of presentation is drawn at once. */
  [data-at-once],
  [data-at-once] * {
    transition: none !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .row,
    .chevron,
    .compact .clip,
    .compact.open .clip {
      transition: none;
    }
  }
  /* TOC-34: the compact form with an edge in the text color in place of its fill, the row's texts in the text color. */
  @media (forced-colors: active) {
    .compact {
      border: var(--tanrei-sys-border-hairline) solid CanvasText;
    }
    .row:focus-visible {
      outline-color: Highlight;
    }
    .title,
    .row,
    .row-current,
    .chevron {
      color: CanvasText;
    }
    .row:hover,
    .row[data-pressed]:not([data-pressed='none']) {
      color: ButtonText;
      background-color: ButtonFace;
    }
    .row:hover .row-current,
    .row:hover .chevron,
    .row[data-pressed]:not([data-pressed='none']) .row-current,
    .row[data-pressed]:not([data-pressed='none']) .chevron {
      color: ButtonText;
    }
  }
`;
