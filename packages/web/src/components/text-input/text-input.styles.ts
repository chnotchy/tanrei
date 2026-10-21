import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusGlow, focusGlowEnds, iconGlyph, minimumTarget, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token: the box's (tokens/comp/input-box.tokens.json) or the text input's own
// (tokens/comp/text-input.tokens.json). The input draws the box and what is in it, and
// no row around it: the label above, the requirement tag, the help, the error and the count are the rows of the Field
// that frames it, drawn from `comp.field.*` (TXI-63). For each state the input reads that state's tokens
// of its look — plain or error — and never computes how a state looks: a filled field's hover is a state layer and its
// focus a thicker, focus-colored edge in the default system, nothing at all in cupertino, by value.
//
// Whether a label is drawn and how the edge is drawn is the variant's geometry, set on the root as `data-layout`:
// `filled` and `outlined` float the label inside the box; `stacked` — the default, and every variant a layer adds
// (TXI-9) — draws none and draws its edge as a line inside the container (TXI-13, TXI-26).
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['stacked', 'filled', 'outlined'] as const;
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_VARIANT = 'stacked';
const DEFAULT_SIZE = 'medium';
/** The states a field declares: no pressed — a press on a field is not an action (TXI-8). */
const STATES = { '': '-r', hovered: '-h', focused: '-f', disabled: '-d' } as const;
/** Every part a state recolors (the state-layer color is read only through the container's state tokens). */
const PARTS = {
  c: 'container-color',
  i: 'active-indicator-color',
  o: 'outline-color',
  l: 'label-color',
  n: 'input-color',
  h: 'placeholder-color',
  a: 'affix-color',
  s: 'leading-icon-color',
  t: 'trailing-icon-color',
  r: 'caret-color',
  // The asterisk after a floating label (TXI-50).
  ra: 'required-asterisk-color',
} as const;
/** The two looks of each variant (TXI-11): the plain parts, and their `error.` twins while error is true. */
const LOOKS = { plain: '', error: 'error-' } as const;
/**
 * The members of the size axis (`dev.tanrei.axes.size.members`). Text styles are used whole: font and tracking. A stacked
 * field has a height and a block padding of its own, as tall as a Button of the same size (TXI-16).
 */
const SIZE_MEMBERS = {
  height: 'container-height',
  'stacked-height': 'stacked-container-height',
  pad: 'container-padding-inline',
  'pad-icon': 'container-padding-inline-with-icon',
  'pad-block': 'container-padding-block',
  'stacked-pad-block': 'stacked-container-padding-block',
  'pad-label': 'container-padding-block-with-label',
  gap: 'container-gap',
  label: 'label-typescale',
  floated: 'label-floated-typescale',
  input: 'input-typescale',
  icon: 'icon-size',
  'state-duration': 'motion-state-duration',
} as const;
const TYPESCALES = new Set(['label-typescale', 'label-floated-typescale', 'input-typescale']);

/**
 * The box is drawn from the one set of tokens every input box is drawn from, `comp.input-box` (TXI-68):
 * the container, its edges, the floating label, the value's line, the glyphs, the paddings and heights of a size, and
 * their colors in each look and state. The select, the combobox, the number input and the color input read the same.
 */
const BOX = '--tanrei-comp-input-box';
/** What a text input alone draws: a date or time segment, the code face, the entries place, the motion of a height that follows its text. */
const OWN = '--tanrei-comp-text-input';
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// Per variant, both looks' parts in every state, as private custom properties (`--_error-l-f` = the error look's label,
// focused). The token of a state and a look is `<variant>-[<state>-]<look><part>`.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(LOOKS)
    .flatMap(([look, prefix]) =>
      Object.entries(STATES).flatMap(([state, suffix]) =>
        Object.entries(PARTS).map(([key, part]) => `  --_${look}-${key}${suffix}: ${ref((v) => `${BOX}-${v}-${state ? `${state}-` : ''}${prefix}${part}`, variant, fallback)};`),
      ),
    )
    .join('\n')}\n}`;

const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) =>
      TYPESCALES.has(member)
        ? ['font', 'letter-spacing', 'line-height', 'font-size'].map((field) => `  --_${key}-${field}: ${ref((v) => `${BOX}-${member}-${v}-${field}`, size, fallback)};`)
        : [`  --_${key}: ${ref((v) => `${BOX}-${member}-${v}`, size, fallback)};`],
    )
    .join('\n')}\n}`;

/** Which look the field paints (TXI-11): the error look exactly while `error` is true (`data-error` on the root). */
const lookBlock = (look: keyof typeof LOOKS, selector: string) =>
  `${selector} {\n${Object.values(STATES)
    .flatMap((suffix) => Object.keys(PARTS).map((key) => `  --_${key}${suffix}: var(--_${look}-${key}${suffix});`))
    .join('\n')}\n}`;

/**
 * The open axes (TXI-9): a size or variant a layer added gets its block on demand, built by the same functions
 * as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${BOX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${BOX}-${value}-container-color` },
];

/**
 * TXI-62, FLD-26: how far the input's text stands from its own start edge, and the padding it keeps at its end edge,
 * as lengths — the sums the box itself is laid out by (`--_text-start`, `--_end` below), written from the size's
 * tokens so that the Field that is told them resolves them where it stands: custom properties are inherited. Beside a
 * leading icon the text starts after the icon's padding, the icon and its gap; a trailing icon or the picker button
 * changes the end padding. A size a layer added falls back to the default's token, as its styles do. `lead` is the
 * measured length of the leading box where what the product slotted is wider than an icon (TXI-22): it stands for the
 * icon's size in the sum, as `--_lead` does in the styles.
 */
export function INSET(size: string, { leading, trailing, lead = '' }: { leading: boolean; trailing: boolean; lead?: string }): { start: string; end: string } {
  const core = (CORE_SIZES as readonly string[]).includes(size);
  const t = (member: string) => (core ? `var(${BOX}-${member}-${size})` : `var(${BOX}-${member}-${size}, var(${BOX}-${member}-${DEFAULT_SIZE}))`);
  return {
    start: leading ? `calc(${t(SIZE_MEMBERS['pad-icon'])} + ${lead || t(SIZE_MEMBERS.icon)} + ${t(SIZE_MEMBERS.gap)})` : t(SIZE_MEMBERS.pad),
    end: trailing ? t(SIZE_MEMBERS['pad-icon']) : t(SIZE_MEMBERS.pad),
  };
}

/** The current value of every part, the widths of the edges and the opacity, from one state's tokens. */
const paint = (suffix: string, state: string) =>
  `${Object.keys(PARTS)
    .map((key) => `\n    --_${key}: var(--_${key}${suffix});`)
    .join('')}
    --_ow: var(${BOX}-${state ? `${state}-` : ''}outline-width);
    --_iw: var(${BOX}-${state ? `${state}-` : ''}active-indicator-width);${state ? `
    opacity: var(${BOX}-${state}-opacity);` : ''}`;

/**
 * What takes the typing: the native input, or — in a date, time or date-time field — the segment that has focus
 * (TXI-43: the field counts as focused while any of its segments has focus).
 */
const ENTRY_FOCUS = ':is(.input, .segment):focus';
/** The field is disabled — its own `disabled`, or a fieldset's (`data-disabled` on the root: a row of segments has no native element to ask). */
const DISABLED = '.field[data-disabled]';

/**
 * Where each state is read (for `stateRules()`): hover is the container's, focus is the native input's or a segment's —
 * gained by pointer or by keyboard alike (TXI-6: a field shows where typing will go however it was focused) — and
 * disabled is the field's. A field has no press (TXI-8), so the pressed conditions name a mark the field never sets.
 * `:where()` keeps every state rule at the resting rule's specificity, so the order `stateRules()` writes them in is the
 * precedence.
 */
const on = (state: string) =>
  state === ':hover'
    ? '.field:where(:has(.container:hover))'
    : state === ':focus-visible'
      ? `.field:where(:has(${ENTRY_FOCUS}))`
      : state === ':disabled'
        ? '.field:where([data-disabled])'
        : `.field:where(${state})`;

/**
 * A filled or outlined label is floated while the input is focused, the text is not empty (`data-has-value`), or the
 * browser marks the field autofilled — before it exposes the value to script (TXI-13, TXI-21). `:is()` forgives a
 * pseudo-class a browser does not know; `:has()` alone would not.
 */
const FLOAT = `:is([data-has-value], :has(${ENTRY_FOCUS}), :has(.input:autofill), :has(.input:-webkit-autofill))`;
const FILLED = ".field[data-layout='filled']";
const OUTLINED = ".field[data-layout='outlined']";
const STACKED = ".field[data-layout='stacked']";
/** The label of a floating-label field (filled or outlined) is floated. */
const FLOATED = `.field:not([data-layout='stacked'])${FLOAT}`;
/** The label is not in the input line: above a stacked field, floated, or not drawn (hidden, or empty). The placeholder,
 * the prefix and the suffix show then (TXI-15). */
const OUT_OF_LINE = `:is(${STACKED}, ${FLOATED}, .field:not([data-labelled]))`;

export const styles = css`
  /* TXI-63: a block as wide as its place, framed and bare alike, and as tall as its container (with the room an
     outlined input keeps above it for a floated label that wraps, TXI-13). It has no width of its own. */
  :host {
    display: block;
    min-inline-size: 0;
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
    /* What the field positions is laid out against the field. Its live region (.announcer) is in no positioned box of
       its own, and was laid out against whatever is positioned above the element — outside a box the field scrolls in,
       which then does not cut it, so the page scrolled sideways to reach it (src/scroll-box.test.ts). */
    position: relative;
    /* Where the text starts: after the leading icon and its gap, or at the text padding (TXI-16). */
    --_start: var(--_pad);
    --_end: var(--_pad);
    --_text-start: var(--_start);
    /* Where the text ends: before the trailing icon and its gap, or at the text padding. */
    --_text-end: var(--_end);
    /* One line of a text style, as a length (a typescale's line height is a ratio of its size). */
    --_floated-line: calc(var(--_floated-line-height) * var(--_floated-font-size));
    --_label-line: calc(var(--_label-line-height) * var(--_label-font-size));
    --_input-line: calc(var(--_input-line-height) * var(--_input-font-size));
    /* TXI-51: where the first line of a multi-line field starts, from the container's top edge — where a single-line
       field of the same variant, size, label and text size draws its one line (TXI-16): centred in container.height, or
       padding-block below the edge where enlarged text makes the field taller than that. A fixed distance: no part of it
       follows the container's height. */
    --_first: max(var(--_pad-block), calc((var(--_height) - var(--_input-line)) / 2));
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    transition: opacity var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  /* TXI-16: a stacked field is as tall as a Button of the same size, with the block padding that leaves room for its line
     in that height; a filled or an outlined field keeps the taller height, which holds the label floated in it. */
  ${unsafeCSS(STACKED)} {
    --_height: var(--_stacked-height);
    --_pad-block: var(--_stacked-pad-block);
  }
  /* TXI-51: a filled field that draws its label sets the line under the floated label's band, as a single-line one does —
     centred in what container.height leaves below the band, where that is more than a line. */
  ${unsafeCSS(FILLED)}[data-labelled] {
    --_band: var(--_floated-line);
    --_first: calc(var(--_pad-label) + var(--_band) + max(0px, calc((var(--_height) - 2 * var(--_pad-label) - var(--_band) - var(--_input-line)) / 2)));
  }
  ${unsafeCSS(FILLED)}[data-labelled][data-label-wraps] {
    --_band: calc(var(--_float-lines) * var(--_floated-line));
  }
  /* TXI-22: an element the product slotted that is wider than an icon keeps its own size, and the text follows its
     box. So does all that starts and ends where the text does (TXI-13: the label and its copies): the box's measured
     length stands for the icon's (--_lead, --_trail, written by the input only while a box is wider than an icon). */
  .field[data-leading] {
    --_start: var(--_pad-icon);
    --_text-start: calc(var(--_pad-icon) + var(--_lead, var(--_icon)) + var(--_gap));
  }
  /* The trailing slot's content, the picker button, or both (TXI-32): each takes an icon's box and container.gap. */
  .field:is([data-trailing], [data-picker]) {
    --_end: var(--_pad-icon);
    --_text-end: calc(var(--_pad-icon) + var(--_icon) + var(--_gap));
  }
  .field[data-trailing] {
    --_text-end: calc(var(--_pad-icon) + var(--_trail, var(--_icon)) + var(--_gap));
  }
  .field[data-trailing][data-picker] {
    --_text-end: calc(var(--_pad-icon) + var(--_trail, var(--_icon)) + var(--_icon) + 2 * var(--_gap));
  }

  /* TXI-6: each state sets the current value of every part from that state's tokens of the current look; focused over
     hovered, disabled over all. */
  ${stateRules(on, {
    hovered: paint('-h', 'hovered'),
    focused: paint('-f', 'focused'),
    pressed: '',
    pressedContent: '',
    disabled: paint('-d', 'disabled'),
  })}

  /* TXI-16: at least the size's height; the text padded by padding-inline (padding-inline-with-icon beside an icon);
     four rounded corners outlined, the bottom two by shape-bottom filled; eased by the corner smoothing (data-tanrei-shape). */
  .container {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context: the edges, the label and the input stack inside it. */
    isolation: isolate;
    display: flex;
    align-items: stretch;
    min-block-size: var(--_height);
    padding-inline: var(--_start) var(--_end);
    ${unsafeCSS(cornerRadius(`${BOX}-container-shape`))}
    background: var(--_c);
    cursor: text;
    -webkit-tap-highlight-color: transparent;
    transition: background-color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  ${unsafeCSS(FILLED)} .container {
    border-end-start-radius: calc(var(${unsafeCSS(BOX)}-container-shape-bottom) * var(--_corner-scale));
    border-end-end-radius: calc(var(${unsafeCSS(BOX)}-container-shape-bottom) * var(--_corner-scale));
  }
  ${unsafeCSS(DISABLED)} .container {
    cursor: default;
  }

  /* TXI-8: the hit area meets the minimum target without changing the visual size. The content above stacks over it. */
  ${minimumTarget('.container')}

  /* The row of the input: the prefix, the native element and the suffix, one input line centred in the container. */
  .body {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    min-inline-size: 0;
    padding-block: var(--_pad-block);
    font: var(--_input-font);
    letter-spacing: var(--_input-letter-spacing);
  }
  /* TXI-16: a filled field that draws its label keeps room for the floated label above the input line, from the start. */
  ${unsafeCSS(FILLED)}[data-labelled] .body {
    padding-block: calc(var(--_pad-label) + var(--_floated-line)) var(--_pad-label);
  }
  ${unsafeCSS(FILLED)}[data-labelled] .container {
    min-block-size: max(var(--_height), calc(2 * var(--_pad-label) + var(--_floated-line) + var(--_input-line)));
  }

  /* TXI-64: what was entered already and the typing part, in lines from the start edge that wrap: entries.gap between
     two items on a line (and before the typing part), entries.row-gap between two lines, every item centred on its
     line (the row's own align-items), an item that does not fit going whole to the next line and never wider than one.
     The slot's box is not one: its items stand in the row itself. The typing part takes what is left of the last line
     while that is entries.typing-min-width at least, and a line of its own otherwise. The paddings are the row's own,
     so the container grows by whole lines. The two distances are handed to the items as a set's are (the Chip's
     internal contract, TGR-5): an item's hit area ends at the middle of the gap to its neighbour, along the line and
     between two lines, so that a press between two is the nearer one's. */
  .entries {
    display: contents;
    --tanrei-set-gap: var(${unsafeCSS(OWN)}-entries-gap);
    --tanrei-set-row-gap: var(${unsafeCSS(OWN)}-entries-row-gap);
  }
  .field[data-entries] .body {
    flex-wrap: wrap;
    /* The first line stands where a single-line input draws its one line (--_first), and the last as far from the
       bottom: one line of items is the height of the size, and each further line adds itself and entries.row-gap. */
    padding-block: var(--_first);
    gap: var(${unsafeCSS(OWN)}-entries-row-gap) var(${unsafeCSS(OWN)}-entries-gap);
  }
  .field[data-entries] .input {
    flex-basis: var(${unsafeCSS(OWN)}-entries-typing-min-width);
  }
  /* TXI-64: read-only and holding no typed text, the typing part takes no room on a line and no line of its own — the
     entries end the content, since nothing can be typed there. It is taken out of the lines, not out of the page: it
     stays focusable and exposed. Disabled, it keeps its room, so the field keeps the shape it has when enabled. */
  .field[data-entries][data-no-typing] .input {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 0;
    min-inline-size: 0;
    flex: none;
  }
  ::slotted([slot='entries']) {
    flex: none;
    max-inline-size: 100%;
  }

  .input {
    all: unset;
    box-sizing: border-box;
    display: block;
    /* Its own intrinsic width (a native control's) when nothing sizes the field; the rest of the row when something does. */
    flex: 1 1 auto;
    min-inline-size: 0;
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
      color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      caret-color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  /* A single line is one line of the input's text style, as the label's and the affixes' beside it are: two engines of
     three give a text input no line shorter than the face's own ("normal"), so with a face whose own line is taller
     than the text style's — a fallback face, where the system's is not installed — the input, and the container with
     it, would stand a pixel taller than the color input and the number input beside it, which name this size too. */
  input.input {
    block-size: var(--_input-line);
  }
  /* TXI-7: the focused edge is the focus indicator; the native element draws no ring of its own. */
  .input:focus {
    outline: none;
  }
  /* TXI-6: selected text is highlighted in selection.color and drawn in selection.content.color, in every variant and
     state. The fill color is named too: the input sets it to currentcolor, and the highlight has to carry its own. */
  .input::selection {
    background: var(${unsafeCSS(BOX)}-selection-color);
    color: var(${unsafeCSS(BOX)}-selection-content-color);
    -webkit-text-fill-color: var(${unsafeCSS(BOX)}-selection-content-color);
  }
  .input::placeholder {
    color: var(--_placeholder, var(--_h));
    -webkit-text-fill-color: var(--_placeholder, var(--_h));
    opacity: 1;
  }
  /* TXI-15: the placeholder shows only while the label is not in the input line — above, floated or not drawn — so the
     two never overlap. Said ON the field, as a value the placeholder reads: \`:has()\` on one element with the rule's
     subject on another (\`.field:has(…) .input::placeholder\`) is the shape whose subject an engine cannot name — a
     pseudo-element inside the input — so it restyled the whole subtree of EVERY element some \`:has()\` is asked of,
     in every root of the page (src/styles/has.test.ts holds the shape, prose.perf.test.ts what it costs). */
  .field[data-labelled]:not([data-layout='stacked']):not(:is([data-has-value], :has(${unsafeCSS(ENTRY_FOCUS)}))) {
    --_placeholder: transparent;
  }
  /* TXI-22: controls a browser draws inside its own element are hidden, so every platform shows the same field. */
  .input::-webkit-search-cancel-button,
  .input::-webkit-search-decoration {
    appearance: none;
    display: none;
  }
  .input::-ms-reveal,
  .input::-ms-clear {
    display: none;
  }
  /* TXI-17, TXI-37: a multi-line field shows --_rows lines of its text style — the lines of its text (auto), the lines
     the person gave it (manual) or minRows (fixed), which the element writes — never fewer than minRows nor more than
     maxRows (--_rows-min / --_rows-max, on the container). An auto-resized field shows no scrollbar while every line
     fits; beyond maxRows (data-overflows), and in a field whose height does not follow its text, the text scrolls. The
     browser's own grip is never drawn: the field's is its own resize handle (TXI-39). */
  textarea.input {
    resize: none;
    overflow-y: hidden;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    block-size: calc(var(--_rows, var(--_rows-min, 2)) * var(--_input-line));
    min-block-size: calc(var(--_rows-min, 2) * var(--_input-line));
    max-block-size: calc(var(--_rows-max, 1e5) * var(--_input-line));
    /* TXI-38, TXI-51: the room the input takes is its box and --_lag lines more (or fewer) — the lines by which the
       height shown still differs from the box, which the element sets for a change of height that moves, and which is
       nothing at rest. */
    margin-block-end: calc(var(--_lag, 0) * var(--_input-line));
  }
  textarea.input[data-overflows],
  .field:not([data-resize='auto']) textarea.input {
    overflow-y: auto;
  }
  /* TXI-38: a change of height that follows the value (or the handle's keys, TXI-41) moves over motion.resize-*; the
     element sets data-resizing for that change only, so a changed width or text size changes the height at once.
     TXI-51: the text never moves with it. The box is already as tall as it will be — so nothing scrolls inside it to
     keep the caret in view — and what moves is the room it takes: the margin goes from the difference to nothing, and
     a box taller than its room is cut at the room's bottom edge, so a new line is uncovered as the container's bottom
     edge passes it and is never drawn over that edge. data-resizing="from" is the starting point, drawn without the
     transition. */
  textarea.input[data-resizing] {
    clip-path: inset(0 0 max(0px, calc(-1 * var(--_lag, 0) * var(--_input-line))) 0);
  }
  textarea.input[data-resizing]:not([data-resizing='from']) {
    transition:
      color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      caret-color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      margin-block-end var(${unsafeCSS(OWN)}-motion-resize-duration) var(${unsafeCSS(OWN)}-motion-resize-easing),
      clip-path var(${unsafeCSS(OWN)}-motion-resize-duration) var(${unsafeCSS(OWN)}-motion-resize-easing);
  }
  /* TXI-17, TXI-51: a multi-line field sets its content from the top: the first line --_first below the container's top
     edge, every further line under it, and whatever more the container is high below the text. */
  .field[data-multiline] .body {
    align-items: flex-start;
    padding-block-start: var(--_first);
  }
  /* TXI-24: an email, url, tel, number or password value is laid out left to right, aligned to the field's start edge;
     a date or time as its locale writes it — which may be right to left in a left-to-right layout — at the start edge too. */
  :host(:dir(rtl)) .input[dir='ltr'] {
    text-align: right;
  }
  :host(:dir(ltr)) .input[dir='rtl'] {
    text-align: left;
  }
  /* TXI-67: beside a prefix, the value of an always left-to-right type — and an empty field's placeholder — stands
     against the prefix, at the start of the run (the row's own dir), in every layout direction: "https://" and the
     address after it are one string, not set apart by the width of the field. Without a prefix it stays at the field's
     start edge (above). (While a floating label rests in the input line the prefix is not drawn, and there is then no
     value and no placeholder to place.) */
  :host .body[dir='ltr'] .prefix:not(:empty) ~ .input,
  :host .body[dir='ltr'] .prefix:not(:empty) ~ .input::placeholder {
    text-align: left;
  }
  :host .body[dir='rtl'] .prefix:not(:empty) ~ .input,
  :host .body[dir='rtl'] .prefix:not(:empty) ~ .input::placeholder {
    text-align: right;
  }
  /* TXI-24: in a multiline field each paragraph takes the direction, and the alignment, of its own first strong
     character — once the value has a letter to tell a direction by (the element sets dir="auto" then); until then the
     field keeps the layout's direction, so the caret of an empty field stands at its start edge. */
  textarea.input[dir='auto'] {
    unicode-bidi: plaintext;
  }
  /* TXI-36: the placeholder is its own run, in the direction of its first strong character, still at the field's start
     edge: a left-to-right hint in a right-to-left field reads in its own order from the right. */
  .input::placeholder {
    unicode-bidi: plaintext;
    text-align: left;
  }
  :host(:dir(rtl)) .input::placeholder {
    text-align: right;
  }

  /* TXI-53: a code field's input line — the prefix, the value with its caret, the placeholder, the suffix — is one
     left-to-right row in every layout direction (dir="ltr" on the row and on the native element), beginning at the left
     end of the room between the icons: the value is aligned to the left on one line and on many, empty or not, and so
     is its placeholder, which is code too and takes the row's direction, not that of its own first letter. Everything
     else is the layout's (TXI-24). The row's own inline sides are left and right, so the gap an icon keeps from it is
     written from the layout's side: the leading icon stands at the row's right in a right-to-left layout. */
  .field[data-code] .input,
  :host(:dir(rtl)) .field[data-code] .input[dir='ltr'] {
    text-align: left;
  }
  .field[data-code] .input::placeholder,
  :host(:dir(rtl)) .field[data-code] .input::placeholder {
    unicode-bidi: normal;
    text-align: left;
  }
  :host(:dir(rtl)) .field[data-code] .body {
    margin-inline: 0;
  }
  :host(:dir(rtl)) .field[data-code][data-leading] .body {
    margin-inline-end: var(--_gap);
  }
  :host(:dir(rtl)) .field[data-code][data-trailing] .body {
    margin-inline-start: var(--_gap);
  }
  /* TXI-54: the code face — the family, the weight and the letter spacing of code.typescale at the size and the line
     height of the input's own text style, so that a code field is as tall as any text field and sets its first line
     where one does. The characters are drawn as they are held: a tab to the next multiple of code.tab-size columns, no
     two characters joined into a ligature, nothing hyphenated or transformed. The native element, the prefix and the
     suffix inherit all of it from the row. */
  .field[data-code] .body {
    font-family: var(${unsafeCSS(OWN)}-code-typescale-font-family);
    font-weight: var(${unsafeCSS(OWN)}-code-typescale-font-weight);
    letter-spacing: var(${unsafeCSS(OWN)}-code-typescale-letter-spacing);
    font-variant-ligatures: none;
    tab-size: var(${unsafeCSS(OWN)}-code-tab-size);
    hyphens: none;
    text-transform: none;
  }
  /* TXI-57: a line of code that does not fit continues on following rows — at its spaces first and, where a part with
     no space is wider than the row, between any two characters. */
  .field[data-code] textarea.input {
    overflow-wrap: anywhere;
  }
  /* TXI-58: with no-wrap no line is broken (wrap="off" on the text area): a line wider than the input scrolls sideways
     inside the container, from the left, and only the code moves. An auto-resized field is --_bar taller — the room a
     sideways scrollbar takes where the browser draws one that takes room, which the element measures — so that no line
     stands under the scrollbar. */
  .field[data-nowrap] textarea.input {
    white-space: pre;
    overflow-wrap: normal;
    overflow-x: auto;
    block-size: calc(var(--_rows, var(--_rows-min, 2)) * var(--_input-line) + var(--_bar, 0px));
    max-block-size: calc(var(--_rows-max, 1e5) * var(--_input-line) + var(--_bar, 0px));
  }
  /* TXI-53: in a right-to-left layout the resize handle (data-axis: a field resized by hand, not disabled) stands in the
     corner where a line of code begins. The input keeps room after its last line — the handle's box — that it scrolls
     through: scrolled to its end, the last line stands above the handle. Room, not height: the box is the lines the
     field gives it, as in a left-to-right layout. */
  :host(:dir(rtl)) .field[data-code][data-axis] textarea.input {
    padding-block-end: var(--tanrei-comp-handle-container-breadth-small);
  }

  /* TXI-42: a date, time or date-time field's row of segments, in place of the input: one left-to-right run (dir="ltr"
     on the row) at the field's start edge in every layout direction, in the input's text style. A filled segment is in
     the input color and an empty one shows its placeholder in the placeholder color; the text between two segments is
     in the placeholder color while every segment is empty. Digits are set at one width, so a number keeps its place as
     it is stepped. */
  .row {
    display: flex;
    flex: 0 1 auto;
    align-items: baseline;
    min-inline-size: 0;
    line-height: var(--_input-line-height);
    color: var(--_n);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    cursor: inherit;
    transition: color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  .literal {
    flex: none;
    white-space: pre;
    transition: color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  .row[data-empty] .literal {
    color: var(--_h);
  }
  /* TXI-42: each segment is as wide as the wider of its placeholder and its widest filled form — four digits for a
     year, two for the others, the wider name of a day period — with segment.padding-inline on each side, whatever it
     holds: its cell is as wide as copies of the two which are never drawn, and the segment fills the cell, what it
     shows centred in it, so the row never shifts as it fills or empties and no placeholder runs into a separator. An
     hour is written as the locale writes it, one digit or two, against its minutes, at the end of its cell. */
  .unit {
    display: inline-grid;
    flex: none;
  }
  .unit > * {
    grid-area: 1 / 1;
  }
  .sizer {
    visibility: hidden;
    padding-inline: var(${unsafeCSS(OWN)}-segment-padding-inline);
    white-space: pre;
    pointer-events: none;
  }
  .segment {
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    /* As wide as its cell and no part of the cell's width: a wide placeholder does not widen it. */
    inline-size: 0;
    min-inline-size: 100%;
    padding-inline: var(${unsafeCSS(OWN)}-segment-padding-inline);
    white-space: pre;
    cursor: inherit;
    /* TXI-43: no caret — the focused segment is drawn as selected text. */
    caret-color: transparent;
  }
  .segment[data-unit='hour'] {
    justify-content: flex-end;
  }
  .segment[data-unit='period'] {
    justify-content: flex-start;
    unicode-bidi: isolate;
  }
  .segment:empty::before {
    content: attr(data-placeholder);
    color: var(--_h);
    transition: color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  /* TXI-43: the focused segment is drawn as selected text — selection.color behind it, and its number or its
     placeholder in selection.content.color. Neither is animated: the pair is readable only together. */
  .segment:focus {
    outline: none;
    background: var(${unsafeCSS(BOX)}-selection-color);
    color: var(${unsafeCSS(BOX)}-selection-content-color);
  }
  .segment:focus:empty::before {
    color: inherit;
    transition: none;
  }
  /* No part of the row can be selected on its own (TXI-43): a drag across it highlights nothing. */
  .row ::selection {
    background: transparent;
  }
  /* TXI-15: the segments are shown by the placeholder's rule — not while a filled or outlined field's label rests in
     the input line. They stay focus stops: focus floats the label and shows them. */
  .field[data-labelled]:not([data-layout='stacked']):not(:is([data-has-value], :has(${unsafeCSS(ENTRY_FOCUS)}))) .literal,
  .field[data-labelled]:not([data-layout='stacked']):not(:is([data-has-value], :has(${unsafeCSS(ENTRY_FOCUS)}))) .segment:empty::before {
    color: transparent;
  }

  /* TXI-15: the prefix and the suffix, affix.gap from the value in the input's text style, only while the label is not
     in the input line. */
  .prefix,
  .suffix {
    flex: none;
    display: none;
    color: var(--_a);
    white-space: pre;
    line-height: var(--_input-line-height);
    transition: color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  .prefix {
    margin-inline-end: var(${unsafeCSS(BOX)}-affix-gap);
  }
  .suffix {
    margin-inline-start: var(${unsafeCSS(BOX)}-affix-gap);
  }
  ${unsafeCSS(OUT_OF_LINE)} :is(.prefix, .suffix):not(:empty) {
    display: block;
  }

  /* TXI-36: the prefix and the suffix are each a run of their own (a unit, a currency, a country code), in the direction
     of their first strong character (src/styles/product-text.ts). Beside a value laid out by its own direction they
     stay where the layout puts them; beside one that is always left-to-right they stand where the run puts them
     (TXI-67: the row's own dir, in which their margins are logical). */
  ${productText(':is(.prefix, .suffix)')}
  /* TXI-53, TXI-36: in a code field they are code — part of the one left-to-right row, read as one expression with the
     value (the slashes around a pattern), each an isolated left-to-right run whatever its first letter is. */
  .field[data-code] :is(.prefix, .suffix) {
    unicode-bidi: isolate;
  }

  /* TXI-22: the icons, at the size's icon size in the family and fill of an unselected icon, colored by their part, gap
     from the text. A slotted element that is larger (the product's icon button) keeps its own size. TXI-35: iconGlyph()
     mirrors the slotted glyph GlyphMirrorController marked, in right-to-left, in its own box. */
  ${iconGlyph('.icon', { size: '--_icon', selected: '.never-selected', duration: '--_state-duration', easing: `${BOX}-motion-state-easing` })}
  .icon {
    position: relative;
    display: none;
    align-self: center;
    align-items: center;
    justify-content: center;
    inline-size: auto;
    block-size: auto;
    min-inline-size: var(--_icon);
    min-block-size: var(--_icon);
    overflow: visible;
    cursor: default;
    transition:
      color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      font-variation-settings var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  .field[data-leading] .leading,
  .field[data-trailing] .trailing {
    display: inline-flex;
  }
  .leading {
    color: var(--_s);
  }
  .trailing {
    color: var(--_t);
  }
  /* The gap sits on the input's side: the icon box lays its glyph out left to right, whatever the field's direction. */
  .field[data-leading] .body {
    margin-inline-start: var(--_gap);
  }
  .field:is([data-trailing], [data-picker]) .body {
    margin-inline-end: var(--_gap);
  }
  /* TXI-67: the row of a value that is always left-to-right has the direction of its run (dir on .body), which may run
     against the layout. Its own inline sides are then the run's, so the gap an icon keeps from it is written from the
     layout's side, as a code field's is (TXI-53): the leading icon stands at the end of such a row. */
  :host(:dir(rtl)) .field:not([data-code]) .body[dir='ltr'],
  :host(:dir(ltr)) .field:not([data-code]) .body[dir='rtl'] {
    margin-inline: 0;
  }
  :host(:dir(rtl)) .field[data-leading]:not([data-code]) .body[dir='ltr'],
  :host(:dir(ltr)) .field[data-leading]:not([data-code]) .body[dir='rtl'] {
    margin-inline-end: var(--_gap);
  }
  :host(:dir(rtl)) .field:is([data-trailing], [data-picker]):not([data-code]) .body[dir='ltr'],
  :host(:dir(ltr)) .field:is([data-trailing], [data-picker]):not([data-code]) .body[dir='rtl'] {
    margin-inline-start: var(--_gap);
  }

  /* TXI-32: the picker button — an icon-only text Button of its own tokens — has its glyph centred where a trailing
     icon's would be: it stands in an icon's box and overflows it evenly on both sides. The trailing slot's content comes
     before it, container.gap away. */
  .picker {
    position: relative;
    z-index: 2;
    display: none;
    flex: none;
    align-self: center;
    align-items: center;
    justify-content: center;
    inline-size: var(--_icon);
    block-size: var(--_icon);
  }
  .field[data-picker] .picker {
    display: flex;
  }
  .field[data-trailing][data-picker] .picker {
    margin-inline-start: var(--_gap);
  }
  .picker > tanrei-button {
    flex: none;
  }
  ::slotted(svg),
  ::slotted(img) {
    display: block;
    inline-size: var(--_icon);
    block-size: var(--_icon);
  }
  /* TXI-17, TXI-51: in a multi-line field the icons are centred on the first line, at its fixed distance from the top
     edge: each stands in a box that is the first line — as high as it, where it is — and what the box holds is centred
     in it, a glyph and a larger element the product placed in the slot (an icon-only Button) alike, reaching evenly
     above and below the line. Nothing of it follows the container's height. */
  .field[data-multiline] .icon {
    align-self: flex-start;
    margin-block-start: var(--_first);
    block-size: var(--_input-line);
    min-block-size: 0;
  }

  /* TXI-13: the label rests centred in the container (a multi-line field: on its first line) in label.typescale, and
     floats — onto the outline's top edge, or to the top of a filled container — in label.floated-typescale. A label that
     does not fit in the width it is given wraps, and is never cut. TXI-14: it moves and resizes over motion.label-*, and
     recolors over motion.state-*. */
  .label,
  .measure {
    position: absolute;
    inset-inline-start: var(--_text-start);
    max-inline-size: calc(100% - var(--_text-start) - var(--_text-end));
    overflow-wrap: break-word;
    font: var(--_label-font);
    letter-spacing: var(--_label-letter-spacing);
  }
  .label {
    z-index: 1;
    inset-block-start: 50%;
    translate: 0 -50%;
    color: var(--_l);
    pointer-events: none;
    transition-property: inset-block-start, inset-inline-start, translate, font-size, line-height, letter-spacing, max-inline-size, color;
    transition-duration:
      var(${unsafeCSS(BOX)}-motion-label-duration), var(${unsafeCSS(BOX)}-motion-label-duration),
      var(${unsafeCSS(BOX)}-motion-label-duration), var(${unsafeCSS(BOX)}-motion-label-duration),
      var(${unsafeCSS(BOX)}-motion-label-duration), var(${unsafeCSS(BOX)}-motion-label-duration),
      var(${unsafeCSS(BOX)}-motion-label-duration), var(--_state-duration);
    transition-timing-function:
      var(${unsafeCSS(BOX)}-motion-label-easing), var(${unsafeCSS(BOX)}-motion-label-easing),
      var(${unsafeCSS(BOX)}-motion-label-easing), var(${unsafeCSS(BOX)}-motion-label-easing),
      var(${unsafeCSS(BOX)}-motion-label-easing), var(${unsafeCSS(BOX)}-motion-label-easing),
      var(${unsafeCSS(BOX)}-motion-label-easing), var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  /* TXI-51: an outlined multi-line field rests its label on the first line; a filled one where a single-line filled
     field rests it — the middle of that field's height — at a distance from the top that the container's height does not
     change. */
  .field[data-multiline] .label {
    inset-block-start: calc(var(--_first) + var(--_input-line) / 2);
  }
  ${unsafeCSS(FILLED)}[data-multiline] .label {
    inset-block-start: calc(max(var(--_height), calc(2 * var(--_pad-label) + var(--_floated-line) + var(--_input-line))) / 2);
  }
  /* TXI-13: a label whose lines wrap — the room they take is the element's to reserve (data-label-wraps). A resting
     label's lines are centred in the container, or start on the first line of a multi-line field. */
  .field[data-multiline][data-label-wraps] .label {
    translate: 0 calc(-50% + (var(--_rest-lines) - 1) * var(--_label-line) / 2);
  }
  ${unsafeCSS(FILLED)}[data-multiline][data-label-wraps] .label {
    inset-block-start: calc(var(--_pad-label) + var(--_float-lines) * var(--_floated-line) + var(--_input-line) / 2);
  }
  ${unsafeCSS(FLOATED)} .label {
    font: var(--_floated-font);
    letter-spacing: var(--_floated-letter-spacing);
  }
  /* Outlined: centred on the outline's top edge, starting at padding-inline — over a leading icon, not at the input text. */
  ${unsafeCSS(OUTLINED + FLOAT)} .label {
    inset-block-start: calc(var(--_ow) / 2);
    inset-inline-start: var(--_pad);
    max-inline-size: calc(100% - var(--_pad) - var(--_end));
    translate: 0 -50%;
  }
  /* TXI-13: wrapped, its last line is centred on the edge; the lines above it take the room above the container. */
  ${unsafeCSS(OUTLINED + FLOAT)}[data-label-wraps] .label {
    translate: 0 calc(-50% - (var(--_float-lines) - 1) * var(--_floated-line) / 2);
  }
  /* Filled: at the top of the container, above the input line, at the input text in both positions. */
  ${unsafeCSS(FILLED + FLOAT)} .label {
    inset-block-start: var(--_pad-label);
    inset-inline-start: var(--_text-start);
    max-inline-size: calc(100% - var(--_text-start) - var(--_text-end));
    translate: 0 0;
  }

  /* TXI-13: two copies of the label, never drawn, laid out as the label is resting and floated: the element counts
     their lines (and the widest floated one) to give a label that wraps its room. */
  .measure {
    inset-block-start: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .measure-floated {
    inset-inline-start: var(--_pad);
    max-inline-size: calc(100% - var(--_pad) - var(--_end));
    font: var(--_floated-font);
    letter-spacing: var(--_floated-letter-spacing);
  }
  ${unsafeCSS(FILLED)} .measure-floated {
    inset-inline-start: var(--_text-start);
    max-inline-size: calc(100% - var(--_text-start) - var(--_text-end));
  }

  /* TXI-13: the room a wrapped label takes, resting and floated alike, so the field never changes height when it floats
     (the room for the floated lines is kept while the label rests, as a filled field keeps its band — TXI-16). An outlined
     field reserves room above its container for the floated lines above the last; the container holds the resting lines,
     centred, or from the first line of a multi-line field; a filled field's band holds every floated line. */
  .field[data-label-wraps] .container {
    margin-block-start: calc((var(--_float-lines) - 1) * var(--_floated-line));
    min-block-size: max(var(--_height), calc(2 * var(--_pad-block) + var(--_rest-lines) * var(--_label-line)));
  }
  .field[data-label-wraps][data-multiline] .container {
    min-block-size: max(var(--_height), calc(var(--_first) + var(--_pad-block) + (var(--_input-line) - var(--_label-line)) / 2 + var(--_rest-lines) * var(--_label-line)));
  }
  ${unsafeCSS(FILLED)}[data-labelled][data-label-wraps] .container {
    margin-block-start: 0;
    min-block-size: max(
      var(--_height),
      calc(2 * var(--_pad-label) + var(--_float-lines) * var(--_floated-line) + var(--_input-line)),
      calc(2 * var(--_pad-label) + var(--_rest-lines) * var(--_label-line))
    );
  }
  ${unsafeCSS(FILLED)}[data-labelled][data-label-wraps][data-multiline] .container {
    min-block-size: max(
      var(--_height),
      calc(2 * var(--_pad-label) + var(--_float-lines) * var(--_floated-line) + var(--_input-line)),
      calc(2 * var(--_pad-label) + var(--_float-lines) * var(--_floated-line) + (var(--_input-line) - var(--_label-line)) / 2 + var(--_rest-lines) * var(--_label-line))
    );
  }
  ${unsafeCSS(FILLED)}[data-labelled][data-label-wraps] .body {
    padding-block: calc(var(--_pad-label) + var(--_float-lines) * var(--_floated-line)) var(--_pad-label);
  }
  /* TXI-51: a filled multi-line field's first line stands where a single-line filled field's line does (--_first). */
  ${unsafeCSS(FILLED)}[data-labelled][data-multiline] .body {
    padding-block-start: var(--_first);
  }

  /* TXI-50: the asterisk after a floating label's text, requirement.asterisk-gap from it, in the label's own text style
     and at the label's place — it is part of the label, resting and floated with it. Whether one is drawn is the
     Field's to say (FLD-25): the input reads no token for the choice. */
  .asterisk {
    margin-inline-start: var(${unsafeCSS(BOX)}-requirement-asterisk-gap);
    color: var(--_ra);
    transition: color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }

  /* TXI-26: a stacked field's edge is a line inside the container's edge, following its corners, that takes no layout
     space: nothing inside moves as it appears, thickens or goes. At rest its color is transparent (no edge), in error the
     error line; focused, the focused color and width — over motion.state-* (TXI-14). */
  .edge {
    position: absolute;
    z-index: 1;
    inset: 0;
    box-sizing: border-box;
    border: var(--_ow) solid var(--_o);
    border-radius: inherit;
    corner-shape: inherit;
    pointer-events: none;
    transition:
      border-color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      border-width var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }

  /* The outlined variant's edge (TXI-13, TXI-16): three pieces, so that the floated label opens a gap of
     outline.notch-padding on each side of it. The gap's width is the floated label's own width, measured by a hidden copy
     of the label in the floated style; it opens over motion.label-*. */
  .outline {
    position: absolute;
    z-index: 1;
    inset: 0;
    display: flex;
    pointer-events: none;
    corner-shape: inherit;
  }
  .outline > span {
    box-sizing: border-box;
    border: 0 solid var(--_o);
    border-block-width: var(--_ow);
    corner-shape: inherit;
    transition:
      border-color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      border-width var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }
  .outline-start {
    flex: none;
    inline-size: max(calc(var(--tanrei-corner-radius) * var(--_corner-scale)), calc(var(--_pad) - var(${unsafeCSS(BOX)}-outline-notch-padding)));
    border-inline-start-width: var(--_ow) !important;
    border-start-start-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    border-end-start-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
  }
  .outline-notch {
    flex: none;
    display: grid;
    grid-template-columns: minmax(0, 0fr);
    max-inline-size: calc(100% - var(--_pad) - var(--_end));
    transition:
      border-color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      border-width var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      grid-template-columns var(${unsafeCSS(BOX)}-motion-label-duration) var(${unsafeCSS(BOX)}-motion-label-easing) !important;
  }
  ${unsafeCSS(FLOATED)} .outline-notch {
    grid-template-columns: minmax(0, 1fr);
    border-block-start-color: transparent;
  }
  .notch-label {
    min-inline-size: 0;
    overflow: hidden;
    visibility: hidden;
    white-space: nowrap;
    padding-inline: var(${unsafeCSS(BOX)}-outline-notch-padding);
    font: var(--_floated-font);
    letter-spacing: var(--_floated-letter-spacing);
  }
  /* TXI-13: a wrapped floated label opens the gap by the width of its widest line. */
  .field[data-label-wraps] .notch-label {
    inline-size: var(--_float-widest);
  }
  .outline-end {
    flex: 1 1 auto;
    border-inline-end-width: var(--_ow) !important;
    border-start-end-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    border-end-end-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
  }

  /* The filled variant's active indicator: a line along the bottom, active-indicator.width wide. */
  .indicator {
    position: absolute;
    z-index: 1;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: var(--_iw);
    background: var(--_i);
    pointer-events: none;
    transition:
      background-color var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing),
      block-size var(--_state-duration) var(${unsafeCSS(BOX)}-motion-state-easing);
  }

  /* TXI-7: where the focus style is glow, the glow around the container while the input is focused (no ring ever). */
  ${focusGlow((focus) => (focus === ':focus-visible' ? `.field:has(${ENTRY_FOCUS}) .container` : `.field[data-focus-style='glow']:has(${ENTRY_FOCUS}) .container`))}
  /* A filled box's bottom corners are container.shape-bottom's: the glow follows them. */
  ${focusGlowEnds((focus) => (focus === ':focus-visible' ? `${FILLED}:has(${ENTRY_FOCUS}) .container` : `${FILLED}[data-focus-style='glow']:has(${ENTRY_FOCUS}) .container`), `var(${BOX}-container-shape-bottom)`)}

  /* TXI-39: the resize handle of a field resized by hand — a Handle of size small, its box against the container's bottom
     edge and its end edge (the bottom-left corner in right-to-left, TXI-24), over the text and inside a stacked field's
     inner line. Everything it draws, its target and its cursor are the Handle's (TXI-40); the field gives it no color.
     Its box shares the container's corner where arc.radius plus inset is the box's corner (HDL-2). */
  .resize-handle {
    position: absolute;
    z-index: 2;
    inset-block-end: 0;
    inset-inline-end: 0;
  }
  /* TXI-39: what a field resized both ways is never narrower than, beside its paddings and icons: sys.target.touch. */
  .touch-probe {
    position: absolute;
    inline-size: var(--tanrei-sys-target-touch);
    block-size: 0;
    visibility: hidden;
    pointer-events: none;
  }

  /* TXI-16: corner smoothing, the shared rule, on the container; the outline's pieces inherit its curve. */
  ${shape}

  /* TXI-36: the floating label, and the copies it is measured by, are a run of their own, in the direction of their
     first strong character, so a left-to-right word keeps its order in a right-to-left field; their lines are still
     aligned by the layout, to its start edge (src/styles/product-text.ts). */
  ${productText(':is(.label, .measure)', { align: 'start' })}

  /* TXI-19: the count, announced politely when typing pauses, and drawn nowhere. */
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
  }

  /* TXI-14: where motion is reduced, the label and the states change at once. */
  @media (prefers-reduced-motion: reduce) {
    .field,
    .container,
    .input,
    .label,
    .asterisk,
    .row,
    .literal,
    .segment::before,
    .edge,
    .prefix,
    .suffix,
    .icon,
    .outline > span,
    .outline-notch,
    .indicator {
      transition: none !important;
    }
  }
  @media (forced-colors: active) {
    .container {
      border: 1px solid FieldText;
    }
    .outline > span,
    .edge,
    .indicator {
      display: none;
    }
    .label,
    .asterisk,
    .row,
    .prefix,
    .suffix {
      color: FieldText;
    }
    /* The focused segment takes the system's highlight. */
    .segment:focus {
      background: Highlight;
      color: HighlightText;
    }
    ${unsafeCSS(DISABLED)} :is(.container, .label, .asterisk, .input, .row) {
      color: GrayText;
      border-color: GrayText;
      outline-color: GrayText;
    }
    .field:has(${unsafeCSS(ENTRY_FOCUS)}) .container {
      outline: 2px solid Highlight;
    }
  }
`;
