import { css, unsafeCSS } from 'lit';
import { directionProbeStyles } from '../../primitives/index.js';
import { hiddenHost } from '../../primitives/hidden.js';

/** How a digit changes (`comp.number-ticker.animation`), in the order of its token: the first is what an unknown name draws. */
export const ANIMATIONS = ['slide', 'blur', 'blur-slide', 'flip'] as const;
/** The `animation` prop: `auto` takes the component token; `none` is the instance's only (NTK-7). */
export const ANIMATION_VALUES = ['auto', ...ANIMATIONS, 'none'] as const;
export const TRENDS = ['auto', 'up', 'down', 'digit'] as const;
export const NUMBER_STYLES = ['decimal', 'percent', 'currency', 'unit'] as const;
export const NOTATIONS = ['standard', 'compact'] as const;
export const SIGN_DISPLAYS = ['auto', 'always', 'except-zero'] as const;
export const LIVE_VALUES = ['off', 'polite'] as const;

const PREFIX = '--tanrei-comp-number-ticker';
/** The component token the `animation` prop's `auto` reads, from the cascade when a change starts. */
export const CHOICE = `${PREFIX}-animation`;
/** How many copies of the digits 0…9 a column stacks: a digit moving on past 9 to 0 (or back) has the next copy to go to. */
export const COPIES = 3;

const T = (name: string) => `var(${PREFIX}-${name})`;

// Every visual value is a token (tokens/comp/number-ticker.tokens.json) or the text style of where the ticker stands:
// it has no font, size, color, fill or edge of its own (NTK-1).
//
//   :host        inline, one run isolated from the text around it, in tabular figures; positions the hidden text
//   .text        the label and the formatted value for assistive technology (NTK-9): visually hidden, never drawn
//   .number      the box whose width follows the number (NTK-5, the shared size transition); hidden from assistive technology
//   .digits      the number, laid out in its locale's direction (NTK-13): its characters (.char) and its numeric run (.core)
//   .core        the digits, the group and the decimal separators: always left to right (NTK-13)
//   .place       one digit's window (NTK-2): an in-flow sizer one digit wide and one line high, the column over it
//   .column      the locale's digits 0…9, COPIES times, top to bottom; moved by `transform` (NTK-3)
//   .layer       a digit drawn for a moment by blur, blur-slide and flip (NTK-4), over the column
//   .timing      a probe the script reads the motion tokens from: never drawn
export const styles = [
  directionProbeStyles,
  css`
    :host {
      display: inline-block;
      position: relative;
      unicode-bidi: isolate;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .text {
      position: absolute;
      inset-block-start: 0;
      inset-inline-start: 0;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    /* NTK-5: the box the size transition moves; the number stands at its start edge. */
    .number {
      display: inline-flex;
      align-items: baseline;
      vertical-align: baseline;
    }

    .digits {
      position: relative;
      display: inline-flex;
      flex: none;
      align-items: baseline;
    }

    /* NTK-13: the digits are written left to right in every locale, whatever direction the characters around them take. */
    .core {
      display: inline-flex;
      align-items: baseline;
      direction: ltr;
      unicode-bidi: isolate;
    }

    .char {
      display: inline-block;
      white-space: pre;
    }

    /* NTK-2: a window one line high, as wide as one digit (every digit is: tabular figures), clipped above and below. */
    .place {
      position: relative;
      display: inline-block;
      clip-path: inset(0 -1em);
    }
    .sizer {
      visibility: hidden;
    }
    .column {
      position: absolute;
      inset-block-start: 0;
      inset-inline-start: 0;
      inline-size: 100%;
      display: flex;
      flex-direction: column;
      text-align: center;
    }
    .column > span {
      display: block;
    }
    .layer {
      position: absolute;
      inset: 0;
      text-align: center;
      backface-visibility: hidden;
    }
    /* NTK-4 flip: each half is the whole digit, clipped to its half, turning about the digit's middle. */
    .place[data-flip] {
      perspective: 4em;
    }
    .layer.top {
      clip-path: inset(0 0 50% 0);
    }
    .layer.bottom {
      clip-path: inset(50% 0 0 0);
    }

    /* A character or a digit place that goes, drawn where it was while it fades out (NTK-5). */
    .leaving {
      position: absolute;
      inset-block-start: 0;
      pointer-events: none;
    }

    .timing {
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      inline-size: ${unsafeCSS(T('blur-radius'))};
      block-size: ${unsafeCSS(T('blur-slide-distance'))};
      transition-property: none;
      transition-duration: ${unsafeCSS(T('motion-duration'))}, ${unsafeCSS(T('motion-stagger'))}, ${unsafeCSS(T('motion-reduced-duration'))};
      transition-timing-function: ${unsafeCSS(T('motion-easing'))};
    }
  `,
  hiddenHost,
];
