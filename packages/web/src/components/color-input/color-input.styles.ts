import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusGlow, focusGlowEnds, minimumTarget, stateRules } from '../../primitives/index.js';
import { INPUT_BOX, TRIGGER_SIZE_MEMBERS, floatingLabelStyles, floatingLabelText, triggerEdgeStyles, triggerOn, triggerTokens } from '../../primitives/field-trigger.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token: the box's (tokens/comp/input-box.tokens.json; CLI-45), and for the swatch's shape and
// hairline the color input's own (tokens/comp/color-input.tokens.json). The input draws the box and what is in it, and
// no row around it: the label above, the requirement tag, the help and the error are the rows of the Field that frames
// it, drawn from `comp.field.*` (CLI-44). It is three things:
//
//   the box      the input box of its variant and size, the text input's too (CLI-1, CLI-2), written once for the boxes
//                that are not a text input (src/primitives/field-trigger.ts): for each state it reads that state's
//                tokens of its look — plain or error — and never computes how a state looks. `filled` and `outlined`
//                float the label inside the box; `stacked` — the default, and every variant a layer adds (CLI-41) —
//                draws none and draws its edge as a line inside the container. What is the color input's own is the
//                row inside: the swatch, the native input and the picker button.
//   the swatch   a square of the value's own color, edged by the one hairline (CLI-25). Its fill is the value, not a
//                token: nothing is mixed into it, and it is the one thing kept out of a forced palette (CLI-35).
//   the picker   a `<tanrei-button>`, drawn from Button's own tokens (CLI-27): the color input owns only where it
//                stands, and the native color input the browser anchors its own picker to (CLI-28).

/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['stacked', 'filled', 'outlined'] as const;
export const CORE_SIZES = ['medium', 'large'] as const;
const DEFAULT_VARIANT = 'stacked';
const DEFAULT_SIZE = 'medium';
/** Every part of the box a state recolors (the state-layer color is read only through the container's state tokens). */
const PARTS = {
  c: 'container-color',
  i: 'active-indicator-color',
  o: 'outline-color',
  l: 'label-color',
  n: 'input-color',
  r: 'caret-color',
  ra: 'required-asterisk-color',
} as const;
/** The members of the size axis a color input has: the box's. Its swatch stands where a leading icon stands and is that size — the box's icon size, under the swatch's private name (CLI-2, CLI-45). */
const SIZE_MEMBERS = { ...Object.fromEntries(Object.entries(TRIGGER_SIZE_MEMBERS).filter(([key]) => key !== 'icon')), swatch: TRIGGER_SIZE_MEMBERS.icon };

const PREFIX = '--tanrei-comp-color-input';
const P = unsafeCSS(PREFIX);
/** The box is drawn from the one set of tokens every input box is drawn from; `PREFIX` is what this component alone draws. */
const B = unsafeCSS(INPUT_BOX);
const STATE_MOTION = `var(${INPUT_BOX}-motion-state-duration) var(${INPUT_BOX}-motion-state-easing)`;
const motion = unsafeCSS(STATE_MOTION);
// The box's token blocks: per variant both looks' parts in every state, per size the members of the size axis, which
// look is painted (CLI-9), and each state's paint (CLI-22).
const { variantBlock, sizeBlock, lookBlock, paint } = triggerTokens(PARTS, SIZE_MEMBERS);

/**
 * The open axes (CLI-41): a size or variant a layer added gets its block on demand, built by the same
 * functions as the core blocks and falling back to the default's tokens; a value the active system lacks is reported
 * in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${INPUT_BOX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${INPUT_BOX}-${value}-container-color` },
];

/**
 * CLI-43, FLD-26: how far the value's text stands from the input's own start edge — the padding beside the swatch, the
 * swatch and the gap, the sum the box itself is laid out by (`--_text-start` below) — and the text padding it keeps at
 * its end edge, with or without the picker button, as lengths written from the size's tokens so that the Field that is
 * told them resolves them where it stands: custom properties are inherited. A size a layer added falls back to the
 * default's token, as its styles do.
 */
export function INSET(size: string): { start: string; end: string } {
  const core = (CORE_SIZES as readonly string[]).includes(size);
  const t = (member: string) => (core ? `var(${INPUT_BOX}-${member}-${size})` : `var(${INPUT_BOX}-${member}-${size}, var(${INPUT_BOX}-${member}-${DEFAULT_SIZE}))`);
  return {
    start: `calc(${t(TRIGGER_SIZE_MEMBERS['pad-icon'])} + ${t(SIZE_MEMBERS.swatch)} + ${t(TRIGGER_SIZE_MEMBERS.gap)})`,
    end: t(TRIGGER_SIZE_MEMBERS.pad),
  };
}

/** The color input is disabled — its own `disabled`, a fieldset's, or its Field's or a field group's (`data-disabled` on the root). */
const DISABLED = '.field[data-disabled]';
const FILLED = ".field[data-layout='filled']";

export const styles = css`
  /* CLI-44: a block as wide as its place, framed and bare alike, and exactly as tall as its container (with the room
     an outlined input keeps above it for a floated label that wraps, CLI-15). It has no width of its own. */
  :host {
    display: block;
    min-inline-size: 0;
    outline: none;
  }
  :host([hidden]) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}
  ${unsafeCSS(lookBlock('plain', '.field'))}
  ${unsafeCSS(lookBlock('error', '.field[data-error]'))}

  .field {
    ${unsafeCSS(paint('-r', ''))}
    /* CLI-1: the swatch stands padding-inline-with-icon from the start edge, where a text input's leading icon stands,
       and the value starts container.gap after it — where the text of a text input with a leading icon starts. */
    --_start: var(--_pad-icon);
    --_text-start: calc(var(--_pad-icon) + var(--_swatch) + var(--_gap));
    /* Without the picker button the input ends padding-inline from the end edge. */
    --_end: var(--_pad);
    --_text-end: var(--_pad);
    /* One line of a text style, as a length (a typescale's line height is a ratio of its size). */
    --_floated-line: calc(var(--_floated-line-height) * var(--_floated-font-size));
    --_label-line: calc(var(--_label-line-height) * var(--_label-font-size));
    --_input-line: calc(var(--_input-line-height) * var(--_input-font-size));
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    transition: opacity ${motion};
  }
  /* CLI-27: the picker button's glyph is centred as far from the end edge as the swatch's centre is from the start
     edge: it stands in a box of the swatch's size, padding-inline-with-icon from the end, and the input ends
     container.gap before that box. */
  .field[data-picker] {
    --_end: var(--_pad-icon);
    --_text-end: calc(var(--_pad-icon) + var(--_swatch) + var(--_gap));
  }

  /* CLI-22: each state sets the current value of every part from that state's tokens of the current look; focused over
     hovered, disabled over all. A hovered container's color is the state's own token: the state layer is in it, behind
     the swatch and never over it. */
  ${stateRules(triggerOn, {
    hovered: paint('-h', 'hovered'),
    focused: paint('-f', 'focused'),
    pressed: '',
    pressedContent: '',
    disabled: paint('-d', 'disabled'),
  })}

  /* CLI-1: at least the size's height; four rounded corners stacked and outlined, the bottom two by shape-bottom
     filled; eased by the corner smoothing (data-tanrei-shape). CLI-24: a press on its padding or on the swatch moves
     focus to the input, and it draws no press answer. */
  .container {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context: the edges, the label, the swatch, the input and the picker button stack inside it. */
    isolation: isolate;
    display: flex;
    align-items: stretch;
    min-block-size: var(--_height);
    padding-inline: var(--_start) var(--_end);
    ${unsafeCSS(cornerRadius(`${INPUT_BOX}-container-shape`))}
    background: var(--_c);
    cursor: text;
    -webkit-tap-highlight-color: transparent;
    transition: background-color ${motion};
  }
  ${unsafeCSS(DISABLED)} .container {
    cursor: default;
  }
  ${unsafeCSS(FILLED)} .container {
    border-end-start-radius: calc(var(${B}-container-shape-bottom) * var(--_corner-scale));
    border-end-end-radius: calc(var(${B}-container-shape-bottom) * var(--_corner-scale));
  }
  /* CLI-24: the hit area meets the minimum target without changing the visual size. The content above stacks over it. */
  ${minimumTarget('.container')}

  /* CLI-25: the swatch — a square of swatch.size, its corners swatch.shape (the shared rule holds a radius to half the
     side and eases it), centred on the row. Its edge is a line swatch.outline.width wide in swatch.outline.color,
     inside its size and over the fill: a border, which a background runs under. Filled, it is exactly the value: no
     state layer, no tint, no opacity, no elevation, and no motion when the value changes (CLI-26). Empty, it is the
     edge alone and the container shows through. It is not a control: no pointer answer of its own, and a press on it
     is a press on the container — or, while the picker button is shown, on the picker button (below). */
  .swatch {
    position: relative;
    box-sizing: border-box;
    flex: none;
    align-self: center;
    inline-size: var(--_swatch);
    block-size: var(--_swatch);
    ${unsafeCSS(cornerRadius(`${PREFIX}-swatch-shape`))}
    border: var(${P}-swatch-outline-width) solid var(${P}-swatch-outline-color);
    pointer-events: none;
  }
  .swatch[data-filled] {
    background-color: var(--_value);
  }
  /* CLI-25: while the picker button is shown, a press on the swatch is the picker button's: the swatch takes the press
     itself, and still draws no answer to it (the element passes it on). */
  .field[data-picker]:not([data-disabled]) .swatch {
    pointer-events: auto;
    cursor: default;
  }
  /* CLI-31: a disabled color input draws the swatch's fill at the disabled content opacity, and keeps its edge. */
  ${unsafeCSS(DISABLED)} .swatch[data-filled] {
    background-color: color-mix(in srgb, var(--_value) calc(var(--tanrei-sys-state-disabled-content-opacity) * 100%), transparent);
  }

  /* CLI-1: the input's line, container.gap after the swatch, one line of the input's text style, centred in the
     container with at least padding-block above and below it. */
  .body {
    position: relative;
    display: flex;
    flex: 1 1 0;
    min-inline-size: 0;
    align-items: center;
    margin-inline-start: var(--_gap);
    padding-block: var(--_pad-block);
    font: var(--_input-font);
    letter-spacing: var(--_input-letter-spacing);
    line-height: var(--_input-line-height);
  }
  /* CLI-15: a filled color input that draws its label keeps room for the floated label above the input, from the start. */
  ${unsafeCSS(FILLED)}[data-labelled] .body {
    padding-block: calc(var(--_pad-label) + var(--_floated-line)) var(--_pad-label);
  }
  ${unsafeCSS(FILLED)}[data-labelled] .container {
    min-block-size: max(var(--_height), calc(2 * var(--_pad-label) + var(--_floated-line) + var(--_input-line)));
  }

  /* CLI-17: the native text element, on one line, in input.typescale and the input color, its caret in the caret
     color. CLI-33: a value wider than the input scrolls inside it and is never cut with an ellipsis. CLI-37: the value
     is laid out left to right in every layout direction — a number sign and its digits are one left-to-right token —
     and aligned to the field's start edge, which the layout's direction names. */
  .input {
    all: unset;
    box-sizing: border-box;
    display: block;
    flex: 1 1 0;
    inline-size: 100%;
    min-inline-size: 0;
    block-size: var(--_input-line);
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    letter-spacing: inherit;
    line-height: var(--_input-line-height);
    color: var(--_n);
    caret-color: var(--_r);
    -webkit-text-fill-color: currentcolor;
    direction: ltr;
    text-align: left;
    cursor: inherit;
    transition:
      color ${motion},
      caret-color ${motion};
  }
  :host(:dir(rtl)) .input {
    text-align: right;
  }
  /* CLI-23: the focused edge is the focus indicator; the native element draws no ring of its own. */
  .input:focus {
    outline: none;
  }
  /* CLI-22: selected text is highlighted in selection.color and drawn in selection.content.color, in every variant and
     state. The fill color is named too: the input sets it to currentcolor, and the highlight has to carry its own. */
  .input::selection {
    background: var(${B}-selection-color);
    color: var(${B}-selection-content-color);
    -webkit-text-fill-color: var(${B}-selection-content-color);
  }
  /* Controls a browser draws inside its own element are hidden, so every platform shows the same field. */
  .input::-webkit-contacts-auto-fill-button,
  .input::-webkit-credentials-auto-fill-button {
    appearance: none;
    display: none;
  }
  .input::-ms-reveal,
  .input::-ms-clear {
    display: none;
  }

  /* CLI-27: the picker button at the end of the container, container.gap after the input, centred vertically. It is a
     Button — its own tokens, press answer, focus ring and target — which the color input only places: it stands in a
     box of the swatch's size and overflows it evenly on every side, so its glyph is centred where a trailing icon's
     would be. It stacks over the container's own hit area. */
  .picker {
    position: relative;
    z-index: 2;
    display: flex;
    flex: none;
    align-self: center;
    align-items: center;
    justify-content: center;
    inline-size: var(--_swatch);
    block-size: var(--_swatch);
    margin-inline-start: var(--_gap);
    cursor: default;
  }
  .picker-button {
    flex: none;
  }
  /* Until the icon set can draw the glyph nothing stands in its place — never its name — and its box is kept. The
     palette glyph is not one the icon set mirrors, and the color input mirrors nothing (CLI-27). */
  .picker-glyph {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
  }
  .picker-glyph:not([data-drawn]) {
    visibility: hidden;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  /* CLI-28: the browser's own color input, under the picker button, so that the browser anchors its picker there. It
     is never seen, never pressed and never a stop: the picker button opens it. It takes no room of its own. */
  .native-picker {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    inline-size: 100%;
    block-size: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    visibility: hidden;
    pointer-events: none;
  }

  /* CLI-15: the label of a filled or outlined color input — resting in the input line after the swatch, floated,
     wrapping — and CLI-7, its asterisk (src/primitives/field-trigger.ts). */
  ${floatingLabelStyles()}

  /* CLI-22: a stacked color input's edge, a line inside the container's edge that takes no layout space; CLI-15: an
     outlined one's three-piece outline with the gap for the floated label, and a filled one's active indicator. */
  ${triggerEdgeStyles()}

  /* CLI-23: where the focus style is glow, the glow around the container while the field is focused (no ring ever). */
  ${focusGlow((focus) => (focus === ':focus-visible' ? '.field[data-focused] .container' : ".field[data-focused][data-focus-style='glow'] .container"))}
  /* A filled box's bottom corners are container.shape-bottom's: the glow follows them. */
  ${focusGlowEnds((focus) => (focus === ':focus-visible' ? `${FILLED}[data-focused] .container` : `${FILLED}[data-focused][data-focus-style='glow'] .container`), `var(${B}-container-shape-bottom)`)}

  /* CLI-40: the floating label and the copies it is measured by are each a run of their own direction. */
  ${floatingLabelText()}

  /* CLI-1, CLI-25: corner smoothing, the shared rule, on the container and on the swatch. */
  ${shape}

  /* CLI-15, CLI-22: where motion is reduced, the label and the states change at once. */
  @media (prefers-reduced-motion: reduce) {
    .field,
    .container,
    .input,
    .floating,
    .floating .asterisk,
    .edge,
    .outline > span,
    .outline-notch,
    .indicator {
      transition: none !important;
    }
  }
  /* CLI-35: forced colors — an edge outline.width wide in the control text color around the container in every
     variant, in the highlight color at the focused width while focused; the value in the text color; a disabled color
     input in the disabled text color. The swatch ALONE is kept out of the forced palette (forced-color-adjust: none,
     on this element and no other): its fill is the value, the content the input shows and not a decoration of it. Its
     edge is the text color, so the sample is bounded on any background. The picker button is a Button and draws
     itself as a Button does there. */
  @media (forced-colors: active) {
    .container {
      border: var(${B}-outline-width) solid ButtonText;
    }
    .outline > span,
    .edge,
    .indicator {
      display: none;
    }
    .field[data-focused] .container {
      outline: var(${B}-focused-outline-width) solid Highlight;
      outline-offset: calc(-1 * var(${B}-focused-outline-width));
    }
    .floating,
    .floating .asterisk,
    .input {
      color: CanvasText;
    }
    .swatch {
      forced-color-adjust: none;
      border-color: CanvasText;
    }
    ${unsafeCSS(DISABLED)} :is(.container, .floating, .floating .asterisk, .input) {
      color: GrayText;
      border-color: GrayText;
    }
  }
`;
