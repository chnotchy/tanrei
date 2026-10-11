import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusRing } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';
import { CORE_SIZES, CORE_VARIANTS, DEFAULT_SIZE, DEFAULT_VARIANT, layoutBlock, sizeBlock, variantBlock } from './code-block.light.js';

// Every visual value is a token (tokens/comp/code-block.tokens.json). The block is not pressed (COD-26): there is no
// state rule, no state layer and no ripple here. What it draws in its shadow root is the frame — the container, the
// header, the copy button's place, the scrolling body and its focus indicator; the code is the product's own
// `<pre><code>`, slotted, and its rules are code-block.light.ts.
const PREFIX = '--tanrei-comp-code-block';
const T = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);
/**
 * The copy button is a small Button (COD-9): its height — which is its width, icon-only — is the Button's
 * own token, read here to keep its place clear (COD-9's minimum height, COD-10's padding).
 */
const BUTTON = unsafeCSS('var(--tanrei-comp-button-container-height-small)');

/**
 * The open axes (COD-25): a size or variant a layer added gets its block on demand, built by the same
 * functions as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in
 * debug builds. A variant a layer adds has no edge: only `outlined` draws one (COD-1).
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-padding-block-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-${value}-container-color` },
];

export const styles = css`
  /* COD-1: a block as wide as its layout gives it and never wider, with no space outside itself. */
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  :host([hidden]) {
    display: none;
  }
  /* COD-25: a block with no code draws nothing and takes no space. Its own rule: a browser without custom states drops
     only this one, and the empty block is then an empty box. */
  :host(:state(empty)) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((variant) => variant !== DEFAULT_VARIANT).map((variant) => variantBlock(variant, `:host([variant='${variant}'])`)).join('\n'))}
  ${unsafeCSS(layoutBlock(':host'))}

  /* COD-1: the container — the look's fill, container.shape corners through the shared corner rule, no elevation. It
     clips nothing: the body rounds its own corners, so the copy button's hit area can reach past the edge (CPY-1). The
     code's text style is set here so that a line of it (1lh) is a length the body and the copy button's patch can use. */
  .container {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    background: var(--_code-block-container);
    font: var(--_code-block-font);
    letter-spacing: var(--_code-block-tracking);
  }
  /* COD-9: at least as tall as the copy button and its inset above and below. */
  .container.copy {
    min-block-size: calc(${BUTTON} + ${T('copy-button-inset')} * 2);
  }
  /* COD-1: the outlined look's edge, inside the container's size and following its corners — drawn over what the block
     holds, so a band, the gutter and the copy button's patch never cover it, and nothing moves for it. */
  :host([variant='outlined']) .container::after {
    content: '';
    position: absolute;
    inset: 0;
    border: ${T('outline-width')} solid ${T('outline-color')};
    border-radius: inherit;
    pointer-events: none;
  }
  ${shape}

  /* COD-8: the header — the top of the same container, with no fill and no line: a row that begins copy-button.inset
     from the top edge, as tall as the copy button where there is one and as one line of the title's text style
     otherwise, its items centred and header.gap apart; the title begins at the inline padding of COD-3, and the copy
     button stands copy-button.inset from the end edge (COD-9). */
  .header {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${T('header-gap')};
    box-sizing: border-box;
    padding-block-start: ${T('copy-button-inset')};
    padding-inline: var(--_code-block-pad-inline);
  }
  .container.copy .header {
    padding-inline-end: ${T('copy-button-inset')};
  }
  /* The title: one line, cut with an ellipsis at the end of its own direction (the element gives it dir="auto"). */
  .title {
    flex: 0 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    font: ${T('title-typescale-font')};
    letter-spacing: ${T('title-typescale-letter-spacing')};
    color: ${T('title-color')};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  ${productText('.title')}
  /* The title's box is as wide as its text, so the layout places it — at the start — whatever its own direction is;
     what is left of the row is between it and the items at the end. */
  .space {
    flex: 1 1 0;
  }
  /* The language: at the end, before the copy button, never cut. */
  .language {
    flex: none;
    font: ${T('language-typescale-font')};
    letter-spacing: ${T('language-typescale-letter-spacing')};
    color: ${T('language-color')};
    white-space: nowrap;
  }
  .header > tanrei-copy-button {
    flex: none;
  }

  /* COD-9, COD-10: without a header the copy button stands over the top end corner of the body, copy-button.inset from
     the top and the end edge, on a patch of the block's ground: whole lines high (a line is never half covered), no
     taller than the block, with the container's corners at that end. It does not scroll with the code. */
  .corner {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    z-index: 1;
    box-sizing: border-box;
    block-size: calc(var(--_code-block-pad-block) + round(up, ${BUTTON} + ${T('copy-button-inset')} - var(--_code-block-pad-block), 1lh));
    max-block-size: 100%;
    padding-block-start: ${T('copy-button-inset')};
    padding-inline-end: ${T('copy-button-inset')};
    border-start-end-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    border-end-end-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    corner-shape: inherit;
    background: var(--_code-block-ground);
  }
  /* Wrapped, every row ends before the button's column (COD-10): no code passes under it, and it needs no patch. */
  :host([wrap]) .corner {
    background: none;
  }
  /* COD-20: in a right-to-left layout the button is at the left, over the gutter where the lines have one. The gutter
     stays in view there, on the block's ground (COD-13), so no code passes under the button and it needs no patch —
     which would cover the bar and the start of the band of the lines beside it (COD-15). */
  :host(:dir(rtl)) .container.gutter .corner {
    background: none;
  }

  /* COD-4, COD-6: the body holds the lines and scrolls inside the container — sideways when a line does not fit,
     up and down past maxLines lines — and never scrolls the page sideways. Left to right in every layout (COD-20): the
     element writes dir="ltr" on it. Its corners are the container's, so what scrolls is cut where the container ends. */
  .body {
    position: relative;
    flex: 1 1 auto;
    box-sizing: border-box;
    min-inline-size: 0;
    overflow: auto;
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    outline: none;
  }
  .container.has-header .body {
    /* COD-8: the code begins header.padding-block-end below the header's row, in place of the block padding. */
    --_code-block-pad-top: ${T('header-padding-block-end')};
    border-start-start-radius: 0;
    border-start-end-radius: 0;
  }
  /* COD-10: without a header the padding at the copy button's side is widened by the button and its inset, so a line's
     end can be scrolled clear of it and a wrapped row ends before its column. COD-20: in a right-to-left layout the
     button is at the left, where the lines begin, and the padding is widened there. */
  .container.copy:not(.has-header) .body {
    --_code-block-pad-end: calc(var(--_code-block-pad-inline) + ${BUTTON} + ${T('copy-button-inset')});
  }
  :host(:dir(rtl)) .container.copy:not(.has-header) .body {
    --_code-block-pad-start: calc(var(--_code-block-pad-inline) + ${BUTTON} + ${T('copy-button-inset')});
    --_code-block-pad-end: var(--_code-block-pad-inline);
  }
  /* COD-6: no more than maxLines lines of the code's text style and the paddings; more scroll up and down. */
  .body.capped {
    max-block-size: calc(var(--_max-lines) * 1lh + var(--_code-block-pad-top) + var(--_code-block-pad-block));
  }

  /* COD-7: the body's keyboard focus, drawn inside the container's edge with the container's corners by a box that
     does not scroll with the code. Pointer focus never shows it. */
  .focus {
    position: absolute;
    inset: 0;
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    pointer-events: none;
  }
  ${focusRing((focus) => `.body${focus} ~ .focus`, { inside: true })}

  /* COD-23: forced colors remove every fill, so every look gains the edge, in the platform's text color; the patch is
     the page's own ground there. */
  @media (forced-colors: active) {
    .container::after {
      content: '';
      position: absolute;
      inset: 0;
      border: ${T('outline-width')} solid CanvasText;
      border-radius: inherit;
      pointer-events: none;
    }
    :host([variant='outlined']) .container::after {
      border-color: CanvasText;
    }
    .corner {
      background: Canvas;
    }
  }
`;
