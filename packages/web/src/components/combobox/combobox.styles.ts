import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusGlow, focusGlowEnds, iconGlyph, minimumTarget, stateRules } from '../../primitives/index.js';
import { INPUT_BOX, TRIGGER_SIZE_MEMBERS, floatingLabelStyles, floatingLabelText, stackedBoxStyles, triggerEdgeStyles, triggerOn, triggerTokens } from '../../primitives/field-trigger.js';
import { optionListStyles, optionVariantRules } from '../../primitives/option-list.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token. The combobox is two things: the box reads the one set of tokens every input box is
// drawn from (tokens/comp/input-box.tokens.json; CMB-63), the list the combobox's own (tokens/comp/combobox.tokens.json).
//
//   the box       the input box of its variant and size, the text input's too (CMB-1, CMB-2), written once for a select's
//                 trigger and this one (src/primitives/field-trigger.ts): for each state it reads that state's tokens
//                 of its look — plain or error — and never computes how a state looks. `filled` and `outlined` float
//                 the label inside the box; `stacked` — the default, and every variant a layer adds (CMB-56) — draws no
//                 label (the label above is the row of the Field that frames it) and draws its edge as a line inside
//                 the container. What is the combobox's own is the row inside: the native input, the clear button and
//                 the chevron's button. It draws no label row, no requirement tag, no help and no error text (CMB-62).
//   the list      the raised sheet, the rows and what parts the groups: the option list a select shares
//                 (src/primitives/option-list.ts), from the combobox's `list.*`, `option.*`, `group.*` and `divider.*`;
//                 the status row after the options and the matched run of a label are the combobox's own.

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
  r: 'caret-color',
  s: 'leading-icon-color',
  t: 'trailing-icon-color',
  ra: 'required-asterisk-color',
} as const;

export const PREFIX = '--tanrei-comp-combobox';
const P = unsafeCSS(PREFIX);
/** The box is drawn from the one set of tokens every input box is drawn from; `PREFIX` is what this component alone draws. */
const B = unsafeCSS(INPUT_BOX);
const STATE_MOTION = `var(--_state-duration) var(${INPUT_BOX}-motion-state-easing)`;
const motion = unsafeCSS(STATE_MOTION);
// The field's token blocks: per variant both looks' parts in every state, per size the members of the size axis, which
// look is painted (CMB-10), and each state's paint (CMB-15).
const { variantBlock, sizeBlock, lookBlock, paint } = triggerTokens(PARTS);

/**
 * CMB-61, FLD-26: how far the combobox's input text stands from its own start edge, and the padding it keeps at its
 * end edge, as lengths — the sums the box itself is laid out by (`--_text-start`, `--_end` below), written from the
 * size's tokens so that the Field that is told them resolves them where it stands: custom properties are inherited.
 * Beside a leading glyph the text starts after the glyph's padding, the glyph and its gap; the clear button or the
 * chevron changes the end padding. A size a layer added falls back to the default's token, as its styles do.
 */
export function INSET(size: string, { leading, trailing }: { leading: boolean; trailing: boolean }): { start: string; end: string } {
  const core = (CORE_SIZES as readonly string[]).includes(size);
  const t = (member: string) => (core ? `var(${INPUT_BOX}-${member}-${size})` : `var(${INPUT_BOX}-${member}-${size}, var(${INPUT_BOX}-${member}-${DEFAULT_SIZE}))`);
  return {
    start: leading ? `calc(${t(TRIGGER_SIZE_MEMBERS['pad-icon'])} + ${t(TRIGGER_SIZE_MEMBERS.icon)} + ${t(TRIGGER_SIZE_MEMBERS.gap)})` : t(TRIGGER_SIZE_MEMBERS.pad),
    end: trailing ? t(TRIGGER_SIZE_MEMBERS['pad-icon']) : t(TRIGGER_SIZE_MEMBERS.pad),
  };
}

/**
 * The open axes (CMB-56): a size or variant a layer added gets its block on demand, built by the same
 * functions as the core blocks and falling back to the default's tokens; a value the active system lacks is reported
 * in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${INPUT_BOX}-container-height-${value}` },
  {
    name: 'variant',
    core: CORE_VARIANTS,
    default: DEFAULT_VARIANT,
    rules: (value, selector) => `${variantBlock(value, selector, DEFAULT_VARIANT)}\n${optionVariantRules(PREFIX, value, selector, DEFAULT_VARIANT)}`,
    probe: (value) => `${INPUT_BOX}-${value}-container-color`,
  },
];

/** The combobox is disabled — its own `disabled`, a fieldset's or a field group's (`data-disabled` on the root). */
const DISABLED = '.field[data-disabled]';
const FILLED = ".field[data-layout='filled']";

export const styles = css`
  /* CMB-49, CMB-62: a block exactly as wide as its place, framed and bare alike, and as tall as its container (with
     the room an outlined combobox keeps above it for a floated label that wraps, CMB-8). It has no width of its own:
     never the native element's default, never its options' or its value's. */
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
  ${stackedBoxStyles()}

  .field {
    ${unsafeCSS(paint('-r', ''))}
    /* What the combobox positions is laid out against the combobox. */
    position: relative;
    /* Where the text starts: after the leading glyph and its gap, or at the text padding (CMB-1, CMB-18). */
    --_start: var(--_pad);
    --_end: var(--_pad);
    --_text-start: var(--_start);
    /* Where the text ends: before the clear button, the chevron and their gap, or at the text padding. */
    --_text-end: var(--_end);
    /* One line of a text style, as a length (a typescale's line height is a ratio of its size). */
    --_floated-line: calc(var(--_floated-line-height) * var(--_floated-font-size));
    --_label-line: calc(var(--_label-line-height) * var(--_label-font-size));
    --_input-line: calc(var(--_input-line-height) * var(--_input-font-size));
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    transition: opacity ${motion};
  }
  .field[data-leading] {
    --_start: var(--_pad-icon);
    --_text-start: calc(var(--_pad-icon) + var(--_icon) + var(--_gap));
  }
  /* The actions at the end — the clear button's box, the chevron, or both, action-gap apart: a glyph stands
     padding-inline-with-icon from the edge, and the first of the two container.gap after the input. */
  .field[data-clear],
  .field[data-chevron] {
    --_end: var(--_pad-icon);
    --_text-end: calc(var(--_pad-icon) + var(--_icon) + var(--_gap));
  }
  .field[data-clear][data-chevron] {
    --_text-end: calc(var(--_pad-icon) + 2 * var(--_icon) + var(${P}-container-action-gap) + var(--_gap));
  }

  /* CMB-15: each state sets the current value of every part from that state's tokens of the current look; focused over
     hovered, disabled over all. */
  ${stateRules(triggerOn, {
    hovered: paint('-h', 'hovered'),
    focused: paint('-f', 'focused'),
    pressed: '',
    pressedContent: '',
    disabled: paint('-d', 'disabled'),
  })}

  /* CMB-1: at least the size's height; the text padded by padding-inline (padding-inline-with-icon beside a glyph);
     four rounded corners stacked and outlined, the bottom two by shape-bottom filled; eased by the corner smoothing
     (data-tanrei-shape). CMB-14: a press on its padding moves focus to the input, and it draws no press answer. */
  .container {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context: the edges, the label and the input stack inside it. */
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
  /* CMB-14: the hit area meets the minimum target without changing the visual size. The content above stacks over it. */
  ${minimumTarget('.container')}

  /* The input's line: one line of the input's text style, centred in the container. */
  .body {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    min-inline-size: 0;
    padding-block: var(--_pad-block);
    font: var(--_input-font);
    letter-spacing: var(--_input-letter-spacing);
    line-height: var(--_input-line-height);
  }
  /* CMB-8: a filled combobox that draws its label keeps room for the floated label above the input, from the start. */
  ${unsafeCSS(FILLED)}[data-labelled] .body {
    padding-block: calc(var(--_pad-label) + var(--_floated-line)) var(--_pad-label);
  }
  ${unsafeCSS(FILLED)}[data-labelled] .container {
    min-block-size: max(var(--_height), calc(2 * var(--_pad-label) + var(--_floated-line) + var(--_input-line)));
  }

  /* CMB-16: the native text element, on one line, in input.typescale and the input color, its caret in the caret color;
     a text longer than the input scrolls inside it. It takes the rest of the row, as the text input's does (CMB-2). */
  .input {
    all: unset;
    box-sizing: border-box;
    display: block;
    flex: 1 1 auto;
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
    text-align: start;
    cursor: inherit;
    transition:
      color ${motion},
      caret-color ${motion};
  }
  /* CMB-15: the focused edge is the focus indicator; the native element draws no ring of its own. */
  .input:focus {
    outline: none;
  }
  /* CMB-15: selected text is highlighted in selection.color and drawn in selection.content.color, in every variant and
     state. The fill color is named too: the input sets it to currentcolor, and the highlight has to carry its own. */
  .input::selection {
    background: var(${B}-selection-color);
    color: var(${B}-selection-content-color);
    -webkit-text-fill-color: var(${B}-selection-content-color);
  }
  /* CMB-8, CMB-55: the placeholder, in the placeholder color: its own run, in the direction of its first strong
     character, still at the field's start edge. */
  .input::placeholder {
    color: var(--_placeholder, var(--_h));
    -webkit-text-fill-color: var(--_placeholder, var(--_h));
    opacity: 1;
    unicode-bidi: plaintext;
    text-align: left;
  }
  :host(:dir(rtl)) .input::placeholder {
    text-align: right;
  }
  /* CMB-8: the placeholder shows only while the label is not in the input line — above, floated or not drawn — so the
     two never overlap. Said ON the field, as a value the placeholder reads (src/styles/has.test.ts). */
  .field[data-labelled]:not([data-layout='stacked']):not(:is([data-has-value], [data-focused])) {
    --_placeholder: transparent;
  }
  /* Controls a browser draws inside its own element are hidden, so every platform shows the same field. */
  .input::-webkit-search-cancel-button,
  .input::-webkit-search-decoration,
  .input::-webkit-contacts-auto-fill-button,
  .input::-webkit-credentials-auto-fill-button {
    appearance: none;
    display: none;
  }
  .input::-ms-reveal,
  .input::-ms-clear {
    display: none;
  }

  /* CMB-18, CMB-19: the glyphs, at the size's icon size in the family and fill of an unselected icon, colored by
     their part. CMB-54: iconGlyph() mirrors the glyph GlyphMirrorController marked, in right-to-left, in its own box;
     the chevron is never marked. */
  ${iconGlyph('.icon', { size: '--_icon', selected: '.never-selected', duration: '--_state-duration', easing: `${INPUT_BOX}-motion-state-easing` })}
  .icon {
    position: relative;
    display: none;
    align-self: center;
    transition:
      color ${motion},
      font-variation-settings ${motion};
  }
  .field[data-leading='slot'] .leading-slot,
  .field[data-leading='option'] .leading-own,
  .chevron-glyph {
    display: inline-block;
  }
  /* CMB-14: a press on a decorative leading glyph is a press on the container. */
  .leading-slot,
  .leading-own {
    color: var(--_s);
    pointer-events: none;
  }
  .chevron-glyph {
    color: var(--_t);
  }
  /* Until the icon set can draw a glyph nothing stands in its place — never its name — and its box is kept. */
  :is(.chevron-glyph, .leading-own, .clear-glyph):not([data-drawn]) {
    visibility: hidden;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  ::slotted(svg),
  ::slotted(img) {
    display: block;
    inline-size: var(--_icon);
    block-size: var(--_icon);
  }
  /* The gap sits on the input's side: the icon box lays its glyph out left to right, whatever the layout's direction. */
  .field[data-leading] .body {
    margin-inline-start: var(--_gap);
  }
  .field:is([data-clear], [data-chevron]) .body {
    margin-inline-end: var(--_gap);
  }

  /* CMB-20: the clear button is a Button — its own tokens, press, focus ring and target — which the combobox only
     places: centred in a box of the glyphs' size, so that its glyph stands where a glyph of the row stands. */
  .clear-box {
    position: relative;
    z-index: 2;
    display: flex;
    flex: none;
    align-self: center;
    align-items: center;
    justify-content: center;
    inline-size: var(--_icon);
    block-size: var(--_icon);
  }
  .clear-box > tanrei-button {
    flex: none;
  }
  .clear-glyph {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
  }
  .clear-box + .chevron {
    margin-inline-start: var(${P}-container-action-gap);
  }

  /* CMB-19: the chevron's button: the glyph's box, with a hit area that reaches from the container's end edge to the
     input's end over the container's whole height, at least the minimum target wide. It draws no press answer and no
     ring — it is no focus stop — and it does not turn. */
  .chevron {
    all: unset;
    box-sizing: border-box;
    position: relative;
    z-index: 1;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    inline-size: var(--_icon);
    cursor: default;
    -webkit-tap-highlight-color: transparent;
  }
  .chevron::before {
    --_target: var(--tanrei-sys-target-pointer);
    content: '';
    position: absolute;
    inset-block: 0;
    inset-inline-end: calc(-1 * var(--_end));
    inline-size: max(calc(100% + var(--_end) + var(--_gap)), var(--_target));
  }
  .clear-box + .chevron::before {
    inline-size: max(calc(100% + var(--_end) + var(${P}-container-action-gap) / 2), var(--_target));
  }
  @media (pointer: coarse) {
    .chevron::before {
      --_target: var(--tanrei-sys-target-touch);
    }
  }

  /* CMB-8: the label of a filled or outlined combobox — resting in the input line, floated, wrapping — and CMB-7, its
     asterisk, drawn exactly while its Field says so (src/primitives/field-trigger.ts). */
  ${floatingLabelStyles()}

  /* CMB-15: a stacked combobox's edge, a line inside the container's edge that takes no layout space; CMB-8: an
     outlined one's three-piece outline with the gap for the floated label, and a filled one's active indicator. */
  ${triggerEdgeStyles()}

  /* CMB-15: where the focus style is glow, the glow around the container while the combobox is focused (no ring ever). */
  ${focusGlow((focus) => (focus === ':focus-visible' ? '.field[data-focused] .container' : ".field[data-focused][data-focus-style='glow'] .container"))}
  /* A filled box's bottom corners are container.shape-bottom's: the glow follows them. */
  ${focusGlowEnds((focus) => (focus === ':focus-visible' ? `${FILLED}[data-focused] .container` : `${FILLED}[data-focused][data-focus-style='glow'] .container`), `var(${B}-container-shape-bottom)`)}

  /* CMB-55: the floating label and the copies it is measured by are each a run of their own direction. */
  ${floatingLabelText()}

  /* CMB-1, CMB-42: corner smoothing, the shared rule, on the container, the list and the rows. */
  ${shape}

  /* CMB-22 … CMB-45: the list (src/primitives/option-list.ts). It is exactly as wide as the container. */
  ${optionListStyles({ prefix: PREFIX, variants: [DEFAULT_VARIANT, ...CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT)] })}

  /* CMB-38: the run of a label that matched the text: its weight raised by option.match.emphasis over the label's, in
     the label's own color and with no fill; it wraps with the label as one text. */
  .option-label mark {
    background: none;
    color: inherit;
    font-weight: calc(var(${P}-option-label-typescale-font-weight) + var(${P}-option-match-emphasis));
  }

  /* CMB-32: the status row, after the last option — inset as an option's row is, taking no input and no state:
     statusText, wrapping, in status.typescale and status.color (status.error.color while the source failed), the empty
     text in the same place and style, or the loading indicator at the row's start; one line of text high whether or not
     the indicator shows yet. CMB-33: its two live regions exist from the moment the list opens, so the row itself is
     always there and takes no room until it has something to show. It is not in the list box, which holds options and
     groups only, and not in the box that scrolls: the options scroll above it, and it stays in view. */
  .status {
    display: flex;
    flex: none;
    align-items: center;
    font: var(${P}-status-typescale-font);
    letter-spacing: var(${P}-status-typescale-letter-spacing);
    color: var(${P}-status-color);
  }
  /* It stands in the sheet under the options, which scroll above it: inside the list's paddings, as a row is. */
  .status[data-shown] {
    margin-block-end: var(${P}-list-padding-block);
    margin-inline: var(${P}-list-padding-inline);
    padding-block: var(${P}-option-padding-block-regular);
    padding-inline: var(${P}-option-padding-inline-regular);
  }
  .list.bare > .status[data-shown] {
    margin-block-start: var(${P}-list-padding-block);
  }
  /* One line of the status text, whatever the row holds. */
  .status[data-shown]::before {
    content: '\\200b';
    flex: none;
    inline-size: 0;
  }
  .status.error {
    color: var(${P}-status-error-color);
  }
  .said {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }
  .spinner {
    flex: none;
  }
  ${productText('.said', { align: 'start' })}

  /* CMB-8, CMB-15: where motion is reduced, the label and the states change at once. */
  @media (prefers-reduced-motion: reduce) {
    .field,
    .container,
    .input,
    .floating,
    .floating .asterisk,
    .icon,
    .edge,
    .outline > span,
    .outline-notch,
    .indicator {
      transition: none !important;
    }
  }
  /* CMB-51: forced colors — an edge outline.width wide in the control text color around the container in every
     variant, in the highlight color at the focused width while focused; every text in the text color; the matched run
     by its weight alone; a disabled combobox in the disabled text color. */
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
    .status,
    .status.error {
      color: CanvasText;
    }
    .input,
    .icon {
      color: ButtonText;
    }
    .input::placeholder {
      color: GrayText;
      -webkit-text-fill-color: GrayText;
    }
    .option-label mark {
      forced-color-adjust: none;
      background: none;
      color: CanvasText;
    }
    .row.p.d .option-label mark {
      color: GrayText;
    }
    .row.p.active .option-label mark {
      color: HighlightText;
    }
    ${unsafeCSS(DISABLED)} :is(.container, .floating, .floating .asterisk, .input, .icon) {
      color: GrayText;
      border-color: GrayText;
    }
  }
`;
