import { css, unsafeCSS } from 'lit';
import { focusGlow, stateRules } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/one-time-code-input.tokens.json). A cell reads, for each state, that
// state's tokens of its look — plain, or the `error.` parts while error is true — and never computes how a state looks:
// hover is the hovered tokens of every cell, focus the focused tokens of the active cell alone.
//
// The layout (OTC-1, OTC-15, OTC-23, OTC-24, OTC-27) is written once, in CSS, and no script measures a width:
//
//   .row     a wrapping flex row of groups, laid out left to right in every layout direction. A group's flex basis is
//            its NARROWEST width, so the row breaks only when the cells cannot become narrower, and it grows by its
//            number of cells up to its widest: the cells of every group share the width equally.
//   .group   a grid of equal columns that folds onto further rows when the group alone does not fit.
//   the mark between two groups hangs before the second of them, in a margin every group has at its left; the row
//            starts that margin to the left of the field, so the margin of the first group of every row lies outside
//            the field and each row starts at the field's edge. The element hides the mark of a group that begins a
//            row (the only thing read from the layout: `data-row-start`).

export const PREFIX = '--tanrei-comp-one-time-code-input';
const P = unsafeCSS(PREFIX);
const motion = unsafeCSS(`var(${PREFIX}-motion-state-duration) var(${PREFIX}-motion-state-easing)`);

/**
 * OTC-7: how long the caret the element draws is shown and hidden for, in milliseconds. The platform's own caret rate
 * is not exposed to the web; this is the rate browsers' text carets use where the system gives them none. A behaviour
 * of the platform, not a design value.
 */
export const CARET_BLINK_MS = 1000;

/** The states a cell declares: no pressed — a press on a field is not an action (OTC-25). */
const STATES = { '': '-r', hovered: '-h', focused: '-f', disabled: '-d' } as const;
/** Every part a state recolors (the state-layer color is read only through the container's state tokens). */
const PARTS = { c: 'container-color', o: 'outline-color', n: 'input-color', r: 'caret-color', s: 'separator-color' } as const;
/** The two looks (OTC-17): the plain parts, and their `error.` twins while error is true. */
const LOOKS = { plain: '', error: 'error-' } as const;

/** One look's parts in every state, as private custom properties (`--_o-f` = the outline color, focused). */
const lookBlock = (look: keyof typeof LOOKS) =>
  Object.entries(STATES)
    .flatMap(([state, suffix]) => Object.entries(PARTS).map(([key, part]) => `--_${key}${suffix}: var(${PREFIX}-standard-${state ? `${state}-` : ''}${LOOKS[look]}${part});`))
    .join('\n    ');
/** The line's width in every state (OTC-7, OTC-17): a dimension has no look. */
const widths = Object.entries(STATES)
  .map(([state, suffix]) => `--_ow${suffix}: var(${PREFIX}-${state ? `${state}-` : ''}outline-width);`)
  .join('\n    ');
/** The current value of every part, from one state's tokens. */
const paint = (suffix: string) => `${Object.keys(PARTS).map((key) => `\n    --_${key}: var(--_${key}${suffix});`).join('')}\n    --_ow: var(--_ow${suffix});`;

/**
 * Where each state is read (for `stateRules()`). Hover is the native input's, which lies over the row (OTC-25); focused
 * is the active cell of a focused field, and the group marks of that field; disabled is the field's. `:where()` keeps
 * every state rule at the resting rule's specificity, so the order `stateRules()` writes them in is the precedence:
 * focused over hovered, disabled over all (OTC-7).
 */
const on = (state: string) =>
  state === ':hover'
    ? ':where(.input:hover ~ .row) :is(.cell, .mark)'
    : state === ':focus-visible'
      ? ':where(.field[data-focused]) :is(.cell:where([data-active]), .mark)'
      : state === ':disabled'
        ? ':where(.field[data-disabled]) :is(.cell, .mark)'
        : `:is(.cell, .mark):where(${state})`;

/** OTC-7: the active cell of a focused field — the element that shows focus. */
const ACTIVE = '.field[data-focused] .cell[data-active]';

export const styles = css`
  ${shape}

  /* OTC-1, OTC-23: a block as wide as its layout gives it, never wider; where nothing gives it a width, as wide as its
     row at full size. */
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
    outline: none;
  }
  :host([hidden]) {
    display: none;
  }

  .field {
    ${unsafeCSS(lookBlock('plain'))}
    ${unsafeCSS(widths)}
    --_gap: var(${P}-container-gap);
    --_pad: var(${P}-container-padding-inline);
    --_width: var(${P}-container-width);
    --_line: calc(var(${P}-input-typescale-line-height) * var(${P}-input-typescale-font-size));
    /* OTC-23: a cell is never narrower than a character of the input's text style with the padding on each side: a
       figure (tabular, so every digit is one \`ch\`) for digits, the widest letter's room (1em) for letters. */
    --_min: min(var(--_width), calc(1ch + 2 * var(--_pad)));
    /* OTC-15: the room a group mark takes before its group — the mark and one gap; the row's own gap is the other.
       Nothing while there is one group. */
    --_mark: calc((var(${P}-separator-width) + var(--_gap)) * min(1, var(--_groups, 1) - 1));
    /* OTC-1: the row at full size — every cell at container.width, a gap between two cells, and a mark with a gap on
       each side between two groups. */
    --_full: calc(var(--_cells, 6) * var(--_width) + (var(--_cells, 6) - var(--_groups, 1)) * var(--_gap) + (var(--_groups, 1) - 1) * (var(--_gap) + var(--_mark)));
    position: relative;
    /* The margin of a row's first group lies outside the field (above): it is no part of what a scrolling ancestor
       measures, and the parts placed here are placed against the field. */
    contain: layout;
    font: var(${P}-input-typescale-font);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(${P}-input-typescale-letter-spacing);
  }
  .field[data-type='alphanumeric'] {
    --_min: min(var(--_width), calc(1em + 2 * var(--_pad)));
  }
  /* OTC-17: the error parts of every token while error is true. */
  .field[data-error] {
    ${unsafeCSS(lookBlock('error'))}
  }

  /* OTC-1, OTC-23, OTC-27: the row. Left to right in every layout direction — the first character in the leftmost cell
     of its row — and placed by the layout's direction: its width is given, so in a right-to-left layout it ends at the
     field's right edge, and a wrapped row starts there too. */
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--_gap);
    box-sizing: border-box;
    direction: ltr;
    inline-size: calc(var(--_full) + var(--_mark));
    max-inline-size: calc(100% + var(--_mark));
    margin-left: calc(-1 * var(--_mark));
    justify-content: flex-start;
  }
  :host(:dir(rtl)) .row {
    justify-content: flex-end;
  }

  /* OTC-15, OTC-23: a group of cells. It is as narrow as its cells can be before the row breaks, as wide as they are at
     full size, and grows by the number of its cells, so that every cell of every group has one width. */
  .group {
    --_n: 1;
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(var(--_min), 1fr));
    gap: var(--_gap);
    flex: var(--_n) 1 calc(var(--_n) * var(--_min) + (var(--_n) - 1) * var(--_gap));
    box-sizing: border-box;
    min-inline-size: var(--_min);
    max-inline-size: calc(var(--_n) * var(--_width) + (var(--_n) - 1) * var(--_gap));
    margin-left: var(--_mark);
  }

  /* OTC-1, OTC-3, OTC-24: a cell — at least container.height high, growing with the character's line; its corners
     eased by the corner smoothing (data-tanrei-shape); an empty cell and a filled one are the same box and fill. */
  .cell {
    ${unsafeCSS(paint('-r'))}
    position: relative;
    display: grid;
    place-items: center;
    box-sizing: border-box;
    min-inline-size: 0;
    min-block-size: max(var(${P}-container-height), var(--_line));
    padding-inline: var(--_pad);
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    background-color: var(--_c);
    color: var(--_n);
    transition:
      background-color ${motion},
      color ${motion};
  }
  /* OTC-7, OTC-17: the line inside the cell's edge — the error line at rest, the focused line on the active cell. It
     follows the cell's corners and takes no layout space, so no cell moves as it appears, moves or goes. */
  .cell::before {
    content: '';
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border: var(--_ow) solid var(--_o);
    border-radius: inherit;
    pointer-events: none;
    transition:
      border-color ${motion},
      border-width ${motion};
  }

  /* The group marks rest as the cells do (their rule is further down; a state's rule must come after this one). */
  .mark {
    ${unsafeCSS(paint('-r'))}
  }

  /* OTC-7, OTC-17, OTC-20: each state sets the current value of every part from that state's tokens of the current
     look; focused — the active cell alone — over hovered, disabled over all. */
  ${stateRules(on, { hovered: paint('-h'), focused: paint('-f'), pressed: '', pressedContent: '', disabled: paint('-d') })}

  /* OTC-3, OTC-16: the character, or the mark that stands for it while mask is true: centred, on one line, in the
     input's text style with tabular figures. */
  .char {
    display: block;
    line-height: var(${P}-input-typescale-line-height);
    white-space: pre;
    user-select: none;
    -webkit-user-select: none;
  }
  /* OTC-6: text an input method has not committed yet, marked as the platform marks composing text. */
  .char[data-composing] {
    text-decoration: underline;
  }

  /* OTC-7: the caret of an empty active cell — one line of the input's text style high, blinking; steady where motion
     is reduced. */
  .caret {
    display: block;
    inline-size: var(--tanrei-sys-border-hairline);
    block-size: var(--_line);
    background-color: var(--_r);
    animation: caret ${unsafeCSS(CARET_BLINK_MS)}ms step-end infinite;
  }
  @keyframes caret {
    50% {
      visibility: hidden;
    }
  }

  /* OTC-15: the mark between two groups — a line with round ends, centred on the height of the cells, a gap from the
     cell on each side. It hangs before its group; a group that begins a row draws none. */
  .mark {
    position: absolute;
    right: calc(100% + var(--_gap));
    top: 50%;
    inline-size: var(${P}-separator-width);
    block-size: var(${P}-separator-thickness);
    border-radius: calc(var(${P}-separator-thickness) / 2);
    background-color: var(--_s);
    translate: 0 -50%;
    pointer-events: none;
    transition: background-color ${motion};
  }
  .group[data-row-start] > .mark {
    display: none;
  }

  /* OTC-2, OTC-25: the one native text element, laid over the whole row: it takes every press, the keyboard, the
     clipboard, autofill and assistive technology. Its own text, selection and caret are not drawn — the cells are the
     drawing. Where a cell is lower than the minimum target, the hit area reaches it above and below. */
  .input {
    all: unset;
    position: absolute;
    z-index: 1;
    inset-block: min(0px, calc((100% - var(--tanrei-sys-target-pointer)) / 2));
    inset-inline: 0;
    box-sizing: border-box;
    display: block;
    inline-size: min(100%, var(--_full));
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    letter-spacing: inherit;
    color: transparent;
    -webkit-text-fill-color: transparent;
    caret-color: transparent;
    direction: ltr;
    text-align: left;
    cursor: text;
    -webkit-tap-highlight-color: transparent;
  }
  @media (pointer: coarse) {
    .input {
      inset-block: min(0px, calc((100% - var(--tanrei-sys-target-touch)) / 2));
    }
  }
  .input:focus {
    outline: none;
  }
  .input::selection {
    background: transparent;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }
  .input:disabled {
    cursor: default;
  }
  /* Controls a browser draws inside its own element are hidden: the cells are the whole drawing. */
  .input::-webkit-contacts-auto-fill-button,
  .input::-webkit-credentials-auto-fill-button,
  .input::-webkit-strong-password-auto-fill-button {
    appearance: none;
    display: none;
  }
  .input::-ms-reveal,
  .input::-ms-clear {
    display: none;
  }

  /* OTC-7: where the focus style is glow, the glow around the active cell (no ring ever). */
  ${focusGlow((focus) => (focus === ':focus-visible' ? ACTIVE : `.field[data-focus-style='glow'][data-focused] .cell[data-active]`))}

  @media (prefers-reduced-motion: reduce) {
    .cell,
    .cell::before,
    .mark {
      transition: none;
    }
    .caret {
      animation: none;
    }
  }

  /* OTC-26: with forced colors an edge around every cell in the control text color, the focused width in the highlight
     color around the active cell; characters, marks and the caret in the text color; a disabled field in the disabled
     text color. No color of its own shows an error. */
  @media (forced-colors: active) {
    .cell {
      color: CanvasText;
    }
    .cell::before {
      border-color: ButtonText;
    }
    ${unsafeCSS(ACTIVE)}::before {
      border-color: Highlight;
    }
    .mark,
    .caret {
      background-color: CanvasText;
    }
    .field[data-disabled] .cell {
      color: GrayText;
    }
    .field[data-disabled] .cell::before {
      border-color: GrayText;
    }
    .field[data-disabled] .mark {
      background-color: GrayText;
    }
  }
`;
