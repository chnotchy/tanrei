import { css } from 'lit';
import { FRAME_PARTS, frameColors, frameStyles } from '../../primitives/field-frame.js';
import { productText } from '../../styles/product-text.js';

// Every visual value is a token (tokens/comp/field.tokens.json). The field draws a frame and nothing else (FLD-1): no
// container, edge, fill or elevation, no padding, and nothing of its control. For each state the frame reads that
// state's tokens of its look — plain or error — and never computes how a state looks; it has no state layer, because
// it answers no hover and no press (FLD-12).
export const PREFIX = '--tanrei-comp-field';

export const styles = css`
  /* FLD-1: a block as wide as its layout gives it, as tall as its rows and its control together. */
  :host {
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
  /* The positioning container of the announcer, which is drawn nowhere. */
  .frame {
    position: relative;
    min-inline-size: 0;
  }

  /* FLD-8, FLD-13, FLD-14: the current color of every part, from the tokens of the look and the state the field is in.
     Focused is never set while disabled, so each later rule wins over the ones before it. */
  ${frameColors(
    PREFIX,
    'standard',
    {
      rest: '.frame',
      error: '.frame[data-error]',
      focused: '.frame[data-focused]',
      focusedError: '.frame[data-focused][data-error]',
      disabled: '.frame[data-disabled]',
      disabledError: '.frame[data-disabled][data-error]',
    },
    [...FRAME_PARTS, 'error-text', 'counter', 'value-text'],
    null,
    // FLD-31: the error text has one color, whichever look the frame is in — it is drawn only in error.
    ['error-text'],
  )}

  /* FLD-2 … FLD-7, FLD-9, FLD-13, FLD-16, FLD-17, FLD-21: the frame, from the field's tokens. */
  ${frameStyles({ prefix: PREFIX, glyph: true, disabled: '.frame[data-disabled]' })}

  /* FLD-7, FLD-26, FLD-27, FLD-31: the supporting row — its texts from its start, the count at the end of its first
     line, at least counter.gap apart — supporting-text.gap below the control. The texts are one column that takes the
     room beside the count: the help, and while the field is in error the error text — in the help's place, which the
     element then does not render (error-text.placement replace), or error-text.gap below it (append); where there is
     no help the error text is the column's first line. The row starts
     and ends where the control says its content does (--_inset-start / --_inset-end, which the element writes from
     what the control said; a control that says nothing has the row at the field's edges). The texts wrap; the count
     stays whole on one line, in figures of one width, in the supporting text's style and its own color, and is never
     announced: the control says its own count. Nothing here moves by itself: the error text comes and goes with the
     layout, at once (FLD-31). */
  .supporting {
    display: flex;
    align-items: flex-start;
    column-gap: var(--tanrei-comp-field-counter-gap);
    min-inline-size: 0;
    margin-block-start: var(--tanrei-comp-field-supporting-text-gap);
    padding-inline: var(--_inset-start, 0px) var(--_inset-end, 0px);
  }
  .texts {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    row-gap: var(--tanrei-comp-field-error-text-gap);
    min-inline-size: 0;
  }
  .texts > .supporting-text {
    margin-block-start: 0;
  }
  /* FLD-31: the error text, in the supporting text's style and the error text's own color, wrapping and never cut. */
  .error-text {
    min-inline-size: 0;
    overflow-wrap: break-word;
    font: var(--tanrei-comp-field-supporting-text-typescale-font);
    letter-spacing: var(--tanrei-comp-field-supporting-text-typescale-letter-spacing);
    color: var(--_frame-error-text);
    transition: color var(--tanrei-comp-field-motion-state-duration) var(--tanrei-comp-field-motion-state-easing);
  }
  /* FLD-21: the error text is a run of its own, in the direction of its first strong character, as the help is. */
  ${productText('.error-text', { align: 'start' })}
  .counter {
    flex: none;
    align-self: flex-start;
    margin-inline-start: auto;
    font: var(--tanrei-comp-field-supporting-text-typescale-font);
    letter-spacing: var(--tanrei-comp-field-supporting-text-typescale-letter-spacing);
    color: var(--_frame-counter);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    transition: color var(--tanrei-comp-field-motion-state-duration) var(--tanrei-comp-field-motion-state-easing);
  }
  /* FLD-21: the count is a run of its own, in the direction of its first strong character, as wide as itself. */
  ${productText('.counter')}
  @media (prefers-reduced-motion: reduce) {
    .counter,
    .error-text {
      transition: none !important;
    }
  }
  /* FLD-17: under forced colors the count and the error text are in the platform's text color, as the help is: the two
     texts are then told apart by their words and their order, the help first. */
  @media (forced-colors: active) {
    .counter,
    .error-text {
      color: CanvasText;
    }
    .frame[data-disabled] :is(.counter, .error-text) {
      color: GrayText;
    }
  }

  /* FLD-29: the value text at the end edge of the label row, on the baseline of the label's first line, at least
     value-text.gap from the label with its mark. The row and the text are the two items of a line that wraps: the row
     takes the room the text leaves and is never given less than half of the line — where the two would not fit so,
     the text takes a line of its own after the row, from the start edge, and wraps there where it must. label.gap is
     then below the line, whichever of the two ends it. The row's baseline is the label's, with a glyph before it too. */
  .label-line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: var(--tanrei-comp-field-value-text-gap);
    min-inline-size: 0;
    margin-block-end: var(--tanrei-comp-field-label-gap);
  }
  .label-line > .label-row {
    flex: 1 1 0;
    min-inline-size: 50%;
    margin-block-end: 0;
  }
  .label-line > .label-row > .label {
    align-self: baseline;
  }
  .value-text {
    flex: 0 1 auto;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    font: var(--tanrei-comp-field-value-text-typescale-font);
    letter-spacing: var(--tanrei-comp-field-value-text-typescale-letter-spacing);
    color: var(--_frame-value-text);
    cursor: default;
    transition: color var(--tanrei-comp-field-motion-state-duration) var(--tanrei-comp-field-motion-state-easing);
  }
  /* FLD-21: the value text is a run of its own — isolated, in the direction of its first strong character
     (data-own-direction, which the element sets where the text has one) and in the layout's where it has none: a
     number, or a range's two values, each isolated already, in reading order. On a line of its own its lines are
     aligned by the layout. */
  .value-text {
    unicode-bidi: isolate;
  }
  ${productText('.value-text[data-own-direction]', { align: 'start' })}
  @media (prefers-reduced-motion: reduce) {
    .value-text {
      transition: none !important;
    }
  }
  /* FLD-17: under forced colors the value text is in the platform's text color, as the label beside it. */
  @media (forced-colors: active) {
    .value-text {
      color: CanvasText;
    }
    .frame[data-disabled] .value-text {
      color: GrayText;
    }
  }

  /* FLD-1: the control is given the field's whole width to lay itself out in and is not changed. In the flow of a
     block, a control that fills the width it is given fills it. A control with a size of its own (an inline-level box:
     a switch, a checkbox) keeps it at the start edge — and stands as an item of a column rather than on a line of
     text, so that the line's own height and the room under its baseline add nothing to the field's height
     (data-inline, which the element sets from the control's own display). */
  .control {
    display: block;
    min-inline-size: 0;
  }
  .control[data-inline] {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
`;
