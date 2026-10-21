import { css, unsafeCSS } from 'lit';
import { focusRing, iconGlyph, modalExitStyles } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/image-preview.tokens.json). The preview draws no state of its own
// (IMP-42): its five controls are Tanrei Buttons with their own tokens, which it places, names and gives a variant
// (IMP-8, IMP-10) and never restyles, and its placeholder is a Tanrei Skeleton with its own (IMP-29).
const PREFIX = '--tanrei-comp-image-preview';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

export const styles = css`
  :host {
    display: contents;
  }

  /* IMP-1: a native modal <dialog> in the top layer, over the whole window, filled with container.color. Nothing of
     the window is left uncovered, so there is no scrim: ::backdrop is clear. None of the browser's dialog box. The
     three rows are the bar, the fit area (IMP-11) and the caption (IMP-26). */
  dialog {
    box-sizing: border-box;
    position: fixed;
    inset: 0;
    inline-size: 100%;
    max-inline-size: none;
    block-size: 100dvh;
    max-block-size: none;
    margin: 0;
    border: 0;
    padding: 0;
    overflow: hidden;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    background: transparent;
    color: ${t('caption-color')};
    text-align: start;
    outline: none;
    /* IMP-33: out, all of it fades over the exit motion — kept drawn in the top layer until it has (closeModal). */
    opacity: 0;
    pointer-events: none;
    transition-property: opacity;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
  }
  dialog[open] {
    display: grid;
    opacity: 1;
    pointer-events: auto;
    /* IMP-33: in, the container, the bar, the controls and the caption fade in over the enter motion. */
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog[open] {
      opacity: 0;
    }
  }
  dialog::backdrop {
    background: transparent;
  }
  /* MDL-7: closed, it stays drawn in the top layer until its exit and its scrim's have played (src/primitives/modal-exit.ts). */
  ${modalExitStyles('dialog')}

  /* IMP-1: the fill, behind the image, so that the image's clear parts show it (IMP-11) and so that the downward drag
     can make the fill clearer and leave the image as it is (IMP-22). */
  .surface {
    position: absolute;
    inset: 0;
    background: ${t('container-color')};
    pointer-events: none;
  }

  /* IMP-11, IMP-32: the image shown and its two neighbours, each on a page as large as the stage; the page of the
     image after lies one stage and layout.page-gap toward the end — to the left in a right-to-left layout (IMP-35) —
     and all three follow a drag (IMP-18, IMP-22). The pages take no pointer: the stage above them does. */
  .pages {
    --_direction: 1;
    position: absolute;
    inset: 0;
    pointer-events: none;
    /* IMP-33: the image grows about the centre of the fit area (which the element measures). */
    transform-origin: var(--_fit-x, 50%) var(--_fit-y, 50%);
    transition: scale ${t('motion-enter-duration')} ${t('motion-enter-easing')};
  }
  .pages:dir(rtl) {
    --_direction: -1;
  }
  @starting-style {
    dialog[open] .pages {
      scale: ${t('motion-enter-scale')};
    }
  }
  .page {
    position: absolute;
    inset: 0;
    translate: calc(var(--_at, 0) * var(--_direction) * (100% + ${t('layout-page-gap')}) + var(--_drag-x, 0px)) var(--_drag-y, 0px);
  }
  /* IMP-18, IMP-20, IMP-22: one image replaces another, and a released drag settles, over the page motion. */
  .pages.settling .page {
    transition: translate ${t('motion-page-duration')} ${t('motion-page-easing')};
  }

  /* IMP-11: the image at its fit size, placed and enlarged by a transform the element writes (IMP-12 to IMP-17); never
     cropped, stretched, mirrored or recolored. */
  .image,
  .thumbnail {
    position: absolute;
    inset-block-start: 0;
    left: 0;
    display: block;
    max-inline-size: none;
    transform-origin: 0 0;
    user-select: none;
    -webkit-user-select: none;
    -webkit-user-drag: none;
  }
  /* IMP-13, IMP-14: a step of the zoom moves over the zoom motion; a pinch, a wheel and a drag follow the person. */
  .image.stepping {
    transition: transform ${t('motion-zoom-duration')} ${t('motion-zoom-easing')};
  }
  /* IMP-30: a source that is asked for and not drawn yet has no box of its own. */
  .asked {
    position: absolute;
    inline-size: 0;
    block-size: 0;
    visibility: hidden;
  }
  /* IMP-29: the Skeleton's one block, at the size the image will have (written by the element). */
  .waiting {
    position: absolute;
    inset-block-start: 0;
    left: 0;
  }
  .waiting .tanrei-skeleton-placeholder {
    inline-size: 100%;
    block-size: 100%;
  }
  tanrei-skeleton {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  /* IMP-31: the mark and the product's sentence in the middle of the fit area, error.gap apart, the text centred and
     wrapping. */
  .error {
    position: absolute;
    inset-block-start: 0;
    left: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${t('error-gap')};
    padding-inline: ${t('caption-padding-inline')};
  }
  ${iconGlyph('.glyph', { size: `${PREFIX}-error-icon-size`, selected: ':not(*)' })}
  .glyph {
    color: ${t('error-icon-color')};
  }
  /* Nothing in the glyph's place until the icon set can draw it (GlyphDrawnController); the box keeps its size. */
  .glyph:not([data-drawn]) {
    visibility: hidden;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  .error-text {
    max-inline-size: 100%;
    margin: 0;
    font: ${t('error-text-typescale-font')};
    letter-spacing: ${t('error-text-typescale-letter-spacing')};
    color: ${t('error-text-color')};
    text-align: center;
    overflow-wrap: break-word;
  }

  /* IMP-11, IMP-27: the stage is the whole container: it takes the gestures and the keys and is the one focus stop
     that is not a Button. It draws nothing (IMP-42), and the browser's own pinch and scroll do not take its gestures. */
  .stage {
    position: absolute;
    inset: 0;
    outline: none;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* IMP-11: the fit area — inside the safe area, below the bar and above the caption — which the element measures,
     and inside whose edge the stage's keyboard focus is drawn (IMP-27). */
  .fit {
    position: relative;
    grid-row: 2;
    grid-column: 1;
    margin-left: env(safe-area-inset-left, 0px);
    margin-right: env(safe-area-inset-right, 0px);
    min-block-size: 0;
    pointer-events: none;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
  }
  dialog:not(.captioned) .fit {
    margin-block-end: env(safe-area-inset-bottom, 0px);
  }
  ${focusRing((focus) => `.stage${focus} ~ .fit`, { inside: true })}
  /* IMP-27: focus the stage took as the preview was opened by a press shows no indicator. */
  .stage[data-focus-quiet]:focus-visible ~ .fit {
    outline: none;
  }
  .stage[data-focus-quiet]:focus-visible ~ .fit::after {
    display: none;
  }

  /* IMP-8: the bar across the top, inside the safe area, at least bar.height tall, on its own fill: the count at its
     start, the three controls at its end, bar.gap apart, centred on its height. A zoomed image passes under it.
     IMP-39: where the three controls leave the count less than half the bar (a narrow window with enlarged text), the
     count takes a line of its own above them, so that it is never cut. */
  .bar {
    position: relative;
    grid-row: 1;
    grid-column: 1;
    box-sizing: content-box;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: ${t('bar-gap')};
    min-block-size: ${t('bar-height')};
    padding-block-start: env(safe-area-inset-top, 0px);
    padding-left: calc(${t('bar-padding-inline')} + env(safe-area-inset-left, 0px));
    padding-right: calc(${t('bar-padding-inline')} + env(safe-area-inset-right, 0px));
    background: ${t('bar-container-color')};
  }
  .controls {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('bar-gap')};
    margin-inline-start: auto;
  }
  .controls tanrei-button {
    flex: none;
  }
  /* IMP-9: the count, in its role and color, wrapping — the bar grows — and never cut. It takes the room the controls
     leave, so they stand at the bar's end with or without it. */
  .count {
    flex: 1 1 50%;
    box-sizing: border-box;
    min-inline-size: 0;
    margin: 0;
    padding-inline: ${t('count-padding-inline')};
    font: ${t('count-typescale-font')};
    letter-spacing: ${t('count-typescale-letter-spacing')};
    color: ${t('count-color')};
    overflow-wrap: break-word;
  }
  .count:empty {
    display: none;
  }

  /* IMP-10: the previous control at the inline start of the stage and the next at its inline end,
     navigation.margin-inline from the safe area's side edge, centred on the height of the fit area. */
  .previous,
  .next {
    position: relative;
    grid-row: 2;
    grid-column: 1;
    align-self: center;
  }
  .previous {
    justify-self: start;
    margin-inline-start: ${t('navigation-margin-inline')};
  }
  .next {
    justify-self: end;
    margin-inline-end: ${t('navigation-margin-inline')};
  }
  .previous:dir(ltr),
  .next:dir(rtl) {
    left: env(safe-area-inset-left, 0px);
  }
  .previous:dir(rtl),
  .next:dir(ltr) {
    right: env(safe-area-inset-right, 0px);
  }

  /* IMP-26: the caption at the bottom, across the container and inside the safe area, on its own fill; no taller than
     a third of the container, and scrolling inside itself where the text needs more. Its lines begin at the start of a
     column at most caption.max-width wide, centred in the container. */
  .caption {
    position: relative;
    grid-row: 3;
    grid-column: 1;
    box-sizing: border-box;
    max-block-size: calc(100dvh / 3);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-block: ${t('caption-padding-block')} calc(${t('caption-padding-block')} + env(safe-area-inset-bottom, 0px));
    padding-left: calc(${t('caption-padding-inline')} + env(safe-area-inset-left, 0px));
    padding-right: calc(${t('caption-padding-inline')} + env(safe-area-inset-right, 0px));
    background: ${t('caption-container-color')};
    outline: none;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
  }
  .caption-text {
    max-inline-size: ${t('caption-max-width')};
    margin: 0 auto;
    font: ${t('caption-typescale-font')};
    letter-spacing: ${t('caption-typescale-letter-spacing')};
    color: ${t('caption-color')};
    overflow-wrap: break-word;
  }
  /* IMP-26: the scrolling region's keyboard focus, inside its edge — drawn by a box in the caption's place in the grid
     that does not scroll with the text (a box of the caption's own would move away with it). */
  .caption-focus {
    position: relative;
    grid-row: 3;
    grid-column: 1;
    pointer-events: none;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
  }
  ${focusRing((focus) => `.caption${focus} + .caption-focus`, { inside: true })}

  /* IMP-38: the count, the caption and the error text are each text of their own direction, isolated; the count and
     the caption are still placed, and their lines aligned, by the layout. */
  ${productText(':is(.count, .caption-text)', { align: 'start' })}
  ${productText('.error-text')}

  /* The bar, the two controls at the stage's sides and the caption stand over the stage, which is the whole container;
     so does the fit area's edge, where the stage's focus is drawn. */
  .bar,
  .previous,
  .next,
  .caption,
  .caption-focus,
  .fit {
    z-index: 1;
  }

  /* IMP-25: hidden, the bar, the count, the previous and next controls and the caption are only not drawn — they keep
     their boxes, so the image does not move, stay in the focus order and exposed, and take no press they cannot be
     seen to take. They fade over the controls motion. */
  .bar,
  .previous,
  .next,
  .caption {
    transition: opacity ${t('motion-controls-duration')} ${t('motion-controls-easing')};
  }
  dialog.controls-hidden :is(.bar, .previous, .next, .caption, .caption-focus) {
    opacity: 0;
    pointer-events: none;
  }

  /* IMP-22: while a downward drag is followed, the fill, the bar, the controls and the caption are as clear as the
     drag is long (--_presence, which the element writes); released, they come back over the page motion. */
  dialog.clearing :is(.surface, .bar, .previous, .next, .caption) {
    opacity: var(--_presence, 1);
    transition: none;
  }
  dialog.returning :is(.surface, .bar, .previous, .next, .caption) {
    transition: opacity ${t('motion-page-duration')} ${t('motion-page-easing')};
  }

  /* IMP-28: what assistive technology is told when the image changes, drawn nowhere. */
  .said {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    pointer-events: none;
  }

  /* IMP-34: where motion is reduced it opens and closes by fading without growing; the zoom steps, the change of
     image, the settle of a released drag and the controls change at once. */
  @media (prefers-reduced-motion: reduce) {
    .pages,
    .pages.settling .page,
    .image.stepping,
    .bar,
    .previous,
    .next,
    .caption,
    dialog.returning :is(.surface, .bar, .previous, .next, .caption) {
      transition: none;
    }
    @starting-style {
      dialog[open] .pages {
        scale: none;
      }
    }
  }

  ${shape}

  /* IMP-41: a person's own colors: the fills are the platform's background, the text and the mark its text color, the
     focus indicators its own; every image is left exactly as it is. The controls are Buttons and adapt as Buttons do. */
  @media (forced-colors: active) {
    .surface,
    .bar,
    .caption {
      background: Canvas;
    }
    .count,
    .caption-text,
    .error-text,
    .glyph {
      color: CanvasText;
    }
    .image,
    .thumbnail {
      forced-color-adjust: none;
    }
  }
`;
