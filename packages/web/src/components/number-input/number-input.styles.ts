import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusGlow, focusGlowEnds, keptLength, minimumTarget, stateRules } from '../../primitives/index.js';
import { INPUT_BOX, TRIGGER_SIZE_MEMBERS, floatingLabelStyles, floatingLabelText, stackedBoxStyles, triggerEdgeStyles, triggerOn, triggerTokens } from '../../primitives/field-trigger.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token: the box's (tokens/comp/input-box.tokens.json; NMI-47), and for where the steppers
// stand and how a hold repeats the number input's own (tokens/comp/number-input.tokens.json). The number input is two things, and draws no
// row around them — the label above, the requirement tag, the help and the error are the rows of the Field that frames
// it, drawn from `comp.field.*` (NMI-46):
//
//   the box       the input box of its variant and size, the text input's too (NMI-1, NMI-2), written once for the fields
//                 that are not a text input (src/primitives/field-trigger.ts): for each state it reads that state's
//                 tokens of its look — plain or error — and never computes how a state looks. `filled` and `outlined`
//                 float the label inside the box; `stacked` — the default, and every variant a layer adds (NMI-43) —
//                 draws none and draws its edge as a line inside the container. What is the number input's own is the
//                 row inside: the prefix, the native input, the suffix and the two steppers.
//   the steppers  two `<tanrei-button>`s, drawn from Button's own tokens (NMI-25): the number input owns only where
//                 they stand and how a hold repeats.

/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['stacked', 'filled', 'outlined'] as const;
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_VARIANT = 'stacked';
const DEFAULT_SIZE = 'medium';
/** Every part of the field a state recolors (the state-layer color is read only through the container's state tokens). */
const PARTS = {
  c: 'container-color',
  i: 'active-indicator-color',
  o: 'outline-color',
  l: 'label-color',
  n: 'input-color',
  h: 'placeholder-color',
  a: 'affix-color',
  r: 'caret-color',
  ra: 'required-asterisk-color',
} as const;
/** The members of the size axis a number input has: the field's, without the glyphs a number input does not hold (it has no icon in its container). */
const SIZE_MEMBERS = Object.fromEntries(Object.entries(TRIGGER_SIZE_MEMBERS).filter(([key]) => key !== 'pad-icon' && key !== 'icon'));

const PREFIX = '--tanrei-comp-number-input';
const P = unsafeCSS(PREFIX);
/** The box is drawn from the one set of tokens every input box is drawn from; `PREFIX` is what this component alone draws. */
const B = unsafeCSS(INPUT_BOX);
const STATE_MOTION = `var(--_state-duration) var(${INPUT_BOX}-motion-state-easing)`;
const motion = unsafeCSS(STATE_MOTION);
// The field's token blocks: per variant both looks' parts in every state, per size the members of the size axis, which
// look is painted (NMI-10), and each state's paint (NMI-15).
const { variantBlock, sizeBlock, lookBlock, paint } = triggerTokens(PARTS, SIZE_MEMBERS);

/**
 * The open axes (NMI-43): a size or variant a layer added gets its block on demand, built by the same
 * functions as the core blocks and falling back to the default's tokens; a value the active system lacks is reported
 * in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${INPUT_BOX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${INPUT_BOX}-${value}-container-color` },
];

/**
 * NMI-45, FLD-26: how far the line of the number stands from the input's own start edge and from its end edge, as
 * lengths — its inline padding at each (`--_text-start` and `--_pad` below), written from the size's token so that the
 * Field that is told them resolves them where it stands: custom properties are inherited. The same with and without
 * steppers: a line of help is aligned with the text above it, not with a button. A size a layer added falls back to
 * the default's token, as its styles do.
 */
export function INSET(size: string): { start: string; end: string } {
  const member = SIZE_MEMBERS.pad;
  const pad = (CORE_SIZES as readonly string[]).includes(size) ? `var(${INPUT_BOX}-${member}-${size})` : `var(${INPUT_BOX}-${member}-${size}, var(${INPUT_BOX}-${member}-${DEFAULT_SIZE}))`;
  return { start: pad, end: pad };
}

/** The number input is disabled — its own `disabled`, a fieldset's, or its Field's or field group's (`data-disabled` on the root). */
const DISABLED = '.field[data-disabled]';
const FILLED = ".field[data-layout='filled']";
/** The label is in the input line: a filled or outlined field's, resting — the field is empty and not focused. */
const IN_LINE = ".field[data-labelled]:not([data-layout='stacked']):not(:is([data-has-value], [data-focused]))";

export const styles = css`
  /* NMI-36: block-level, framed and bare alike — exactly as wide as its place, which in a Field is the Field's whole
     width, with no width of its own and never a native text element's default width; never narrower than its
     paddings, its prefix and suffix, its steppers and room for three digits need (the least width its own content
     has). NMI-46: exactly as tall as its container. */
  :host {
    display: flex;
    flex-direction: column;
    min-inline-size: min-content;
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
  ${stackedBoxStyles()}

  .field {
    ${unsafeCSS(paint('-r', ''))}
    /* Where the text starts and the container's content ends: the text padding (NMI-1). */
    --_start: var(--_pad);
    --_end: var(--_pad);
    --_text-start: var(--_start);
    /* Where the input line ends: at the text padding, or before the steppers and their gap. */
    --_text-end: var(--_end);
    /* One line of a text style, as a length (a typescale's line height is a ratio of its size). */
    --_floated-line: calc(var(--_floated-line-height) * var(--_floated-font-size));
    --_label-line: calc(var(--_label-line-height) * var(--_label-font-size));
    --_input-line: calc(var(--_input-line-height) * var(--_input-font-size));
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    transition: opacity ${motion};
  }
  /* NMI-25: the stepper nearest the end stands stepper.inset from the container's end edge; the input line ends
     container.gap before the pair, whose length the element measures (--_steppers). */
  .field[data-steppers] {
    --_end: var(${P}-stepper-inset);
    --_text-end: calc(var(--_end) + var(--_steppers, 0px) + var(--_gap));
  }
  /* NMI-36, NMI-37: where the input's line and the steppers do not fit on one row, the steppers go to a row of their own
     below it (the container wraps; the element says when it has, data-wrapped). The input's line then ends at the text
     padding — at least, since the container's own end padding stays the steppers' inset, so the rows never fit again
     because of it — and a floating label ends there too. */
  .field[data-steppers][data-wrapped] {
    --_text-end: max(var(--_pad), var(--_end));
  }

  /* NMI-15: each state sets the current value of every part from that state's tokens of the current look; focused over
     hovered, disabled over all. */
  ${stateRules(triggerOn, {
    hovered: paint('-h', 'hovered'),
    focused: paint('-f', 'focused'),
    pressed: '',
    pressedContent: '',
    disabled: paint('-d', 'disabled'),
  })}

  /* NMI-1: at least the size's height; the text padded by padding-inline; four rounded corners stacked and outlined,
     the bottom two by shape-bottom filled; eased by the corner smoothing (data-tanrei-shape). NMI-14: a press on its
     padding moves focus to the input, and it draws no press answer. */
  .container {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context: the edges, the label, the input and the steppers stack inside it. */
    isolation: isolate;
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    /* The input's line fills its row; a row of the steppers alone stands at the end (NMI-37). */
    justify-content: flex-end;
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
  /* NMI-14: the hit area meets the minimum target without changing the visual size. The content above stacks over it. */
  ${minimumTarget('.container')}

  /* NMI-1: the input's line — the prefix, the native input and the suffix — one line of the input's text style,
     centred in the container. NMI-39: the three stand in written order along the direction of the number's run, which
     the element writes as this box's own \`dir\`; so the box places nothing of its own by a logical side (the paddings
     and the gap before the steppers are the container's and the steppers', by the layout). NMI-29: its figures are tabular, so the digits of two fields stand under each other and
     a number that is stepped does not move from side to side. */
  .body {
    position: relative;
    display: flex;
    /* NMI-36: the rest of the row, from nothing: the row wraps only where its least width — the affixes and three
       digits — and the steppers do not fit together. */
    flex: 1 1 0;
    min-inline-size: min-content;
    align-items: center;
    padding-block: var(--_pad-block);
    font: var(--_input-font);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--_input-letter-spacing);
    line-height: var(--_input-line-height);
  }
  /* NMI-8: a filled number input that draws its label keeps room for the floated label above the input, from the start. */
  ${unsafeCSS(FILLED)}[data-labelled] .body {
    padding-block: calc(var(--_pad-label) + var(--_floated-line)) var(--_pad-label);
  }
  ${unsafeCSS(FILLED)}[data-labelled] .container {
    min-block-size: max(var(--_height), calc(2 * var(--_pad-label) + var(--_floated-line) + var(--_input-line)));
  }

  /* NMI-16, NMI-17: the native text element, on one line, in input.typescale and the input color, its caret in the
     caret color; a number longer than the input scrolls inside it and is never cut with an ellipsis. NMI-36: the rest
     of the row when something sizes the number input, its own intrinsic width (a native control's) when nothing does,
     and never less than three digits (a figure is one \`ch\` wide). NMI-39: the number is laid out left to right in
     every layout direction — its digits, its sign and its separator. NMI-29: it is aligned physically, because the
     row's own direction is the run's and not the layout's (\`dir\` on .body): \`start\` is the field's start edge, which
     the layout names — the left, and the right under the host's :dir(rtl) — and \`end\` is the end of the number's run,
     where the suffix stands or would stand: the right for a left-to-right run and the left for a right-to-left one, in
     every layout direction. The placeholder stands where the number would and inherits the same side. */
  .input {
    all: unset;
    box-sizing: border-box;
    display: block;
    flex: 1 1 auto;
    inline-size: 100%;
    min-inline-size: 3ch;
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
  :host(:dir(rtl)) .input,
  .field[data-align='end'] .input {
    text-align: right;
  }
  .field[data-align='end'][data-run='rtl'] .input {
    text-align: left;
  }
  /* NMI-15: the focused edge is the focus indicator; the native element draws no ring of its own. */
  .input:focus {
    outline: none;
  }
  /* NMI-15: selected text is highlighted in selection.color and drawn in selection.content.color, in every variant and
     state. The fill color is named too: the input sets it to currentcolor, and the highlight has to carry its own. */
  .input::selection {
    background: var(${B}-selection-color);
    color: var(${B}-selection-content-color);
    -webkit-text-fill-color: var(${B}-selection-content-color);
  }
  /* NMI-8, NMI-42: the placeholder, in the placeholder color: its own run, in the direction of its first strong
     character, where the number would stand. */
  .input::placeholder {
    color: var(--_placeholder, var(--_h));
    -webkit-text-fill-color: var(--_placeholder, var(--_h));
    opacity: 1;
    unicode-bidi: plaintext;
  }
  /* NMI-8: the placeholder shows only while the label is not in the input line — above, floated or not drawn — so the
     two never overlap. Said ON the field, as a value the placeholder reads (src/styles/has.test.ts). */
  ${unsafeCSS(IN_LINE)} {
    --_placeholder: transparent;
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

  /* NMI-28: the prefix before the number and the suffix after it along the direction of the number's run (the margins
     are logical in .body's direction, NMI-39), affix.gap from the input, on the input's line and in its text style, in
     the affix color, exactly while the label is not in the input line. They are part of the field and never of the value:
     not selected, never cut (the input gives up its width first), and a press on them is a press on the container. */
  .prefix,
  .suffix {
    flex: none;
    color: var(--_a);
    white-space: pre;
    line-height: var(--_input-line-height);
    user-select: none;
    -webkit-user-select: none;
    pointer-events: none;
    transition: color ${motion};
  }
  :is(.prefix, .suffix):empty,
  ${unsafeCSS(IN_LINE)} :is(.prefix, .suffix) {
    display: none;
  }
  .prefix {
    margin-inline-end: var(${B}-affix-gap);
  }
  .suffix {
    margin-inline-start: var(${B}-affix-gap);
  }
  /* NMI-42: the prefix and the suffix are each a run of their own (a unit, a currency code), in the direction of their
     first strong character, and stand where the number's run puts them — which the same characters decide (NMI-39;
     src/styles/product-text.ts). */
  ${productText(':is(.prefix, .suffix)')}

  /* NMI-25: the two steppers at the end of the container, after the input line and container.gap from it, centred
     vertically: first the one that steps down, then the one that steps up — in a right-to-left layout the row runs the
     other way, so down is still the first in reading order (NMI-39). Each is a Button — its own tokens, press answer
     and target — which the number input only places. They stack over the container's own hit area.
     NMI-27: the three waiting times of a hold are read from this box (a duration token is an expression: it is
     computed through a real property, here one that moves nothing). */
  .steppers {
    position: relative;
    z-index: 2;
    display: flex;
    flex: none;
    align-self: center;
    align-items: center;
    margin-inline-start: var(--_gap);
    cursor: default;
    transition-property: none;
    transition-delay: var(${P}-motion-repeat-delay), var(${P}-motion-repeat-interval), var(${P}-motion-repeat-interval-fast);
  }
  /* NMI-37: wrapped, the steppers stand on their own row below the input's line, at the container's end — the one that
     steps down first, as on one row — stepper.inset from the end edge and from the bottom edge. */
  .field[data-wrapped] .container {
    align-content: flex-start;
  }
  .field[data-wrapped] .steppers {
    margin-block-end: var(${P}-stepper-inset);
  }
  /* A resting floating label is centred on the first row — the input's line — and not on the whole container. */
  .field[data-wrapped][data-layout='outlined']:not([data-has-value], [data-focused]) .floating {
    inset-block-start: calc(var(--_pad-block) + var(--_input-line) / 2);
  }
  ${unsafeCSS(FILLED)}[data-wrapped]:not([data-has-value], [data-focused]) .floating {
    inset-block-start: calc(var(--_pad-label) + (var(--_floated-line) + var(--_input-line)) / 2);
  }
  .stepper {
    flex: none;
    touch-action: manipulation;
    -webkit-touch-callout: none;
  }
  /* NMI-25: the two stand stepper.gap apart, or as much further as each needs to keep the touch target's length along
     the row that the other's does not reach into (src/primitives/kept-length.ts; the element measures the buttons). */
  ${keptLength('.stepper', { gap: `var(${PREFIX}-stepper-gap)` })}
  /* Until the icon set can draw a glyph nothing stands in its place — never its name — and its box is kept. */
  .stepper-glyph {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
  }
  .stepper-glyph:not([data-drawn]) {
    visibility: hidden;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* NMI-8: the label of a filled or outlined number input — resting in the input line, floated, wrapping — and NMI-7,
     its asterisk, drawn exactly while the Field that frames the input says so (src/primitives/field-trigger.ts). */
  ${floatingLabelStyles()}

  /* NMI-15: a stacked number input's edge, a line inside the container's edge that takes no layout space; NMI-8: an
     outlined one's three-piece outline with the gap for the floated label, and a filled one's active indicator. */
  ${triggerEdgeStyles()}

  /* NMI-15: where the focus style is glow, the glow around the container while the field is focused (no ring ever). */
  ${focusGlow((focus) => (focus === ':focus-visible' ? '.field[data-focused] .container' : ".field[data-focused][data-focus-style='glow'] .container"))}
  /* A filled box's bottom corners are container.shape-bottom's: the glow follows them. */
  ${focusGlowEnds((focus) => (focus === ':focus-visible' ? `${FILLED}[data-focused] .container` : `${FILLED}[data-focused][data-focus-style='glow'] .container`), `var(${B}-container-shape-bottom)`)}

  /* NMI-42: the floating label and the copies it is measured by are each a run of their own direction. */
  ${floatingLabelText()}

  /* NMI-1: corner smoothing, the shared rule, on the container. */
  ${shape}

  /* NMI-8, NMI-15: where motion is reduced, the label and the states change at once. (The waiting times of a hold are
     not motion: NMI-27 keeps them.) */
  @media (prefers-reduced-motion: reduce) {
    .field,
    .container,
    .input,
    .prefix,
    .suffix,
    .floating,
    .floating .asterisk,
    .edge,
    .outline > span,
    .outline-notch,
    .indicator {
      transition: none !important;
    }
  }
  /* NMI-38: forced colors — an edge outline.width wide in the control text color around the container in every
     variant, in the highlight color at the focused width while focused; every text in the text color; a disabled
     number input in the disabled text color. The steppers are Buttons and draw themselves as Buttons do there. */
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
    .input,
    .prefix,
    .suffix {
      color: CanvasText;
    }
    .input::placeholder {
      color: GrayText;
      -webkit-text-fill-color: GrayText;
    }
    ${unsafeCSS(DISABLED)} :is(.container, .floating, .floating .asterisk, .input, .prefix, .suffix) {
      color: GrayText;
      border-color: GrayText;
    }
  }
`;
