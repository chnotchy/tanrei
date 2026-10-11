import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusGlow, focusGlowEnds, iconGlyph, minimumTarget, stateRules } from '../../primitives/index.js';
import { INPUT_BOX, TRIGGER_SIZE_MEMBERS, floatingLabelStyles, floatingLabelText, triggerEdgeStyles, triggerOn, triggerTokens } from '../../primitives/field-trigger.js';
import { optionListStyles, optionVariantRules } from '../../primitives/option-list.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token. The select is two things: the trigger reads the one set of tokens every input box is
// drawn from (tokens/comp/input-box.tokens.json; SEL-65), the list the select's own (tokens/comp/select.tokens.json).
//
//   the trigger   the input box of its variant and size, the text input's too (SEL-1, SEL-2): for each state it reads that
//                 state's tokens of its look — plain or error — and never computes how a state looks. Where the label
//                 goes and how the edge is drawn is the variant's geometry, set on the root as `data-layout`: `filled`
//                 and `outlined` float the label inside the box; `stacked` — the default, and every variant a layer
//                 adds (SEL-60) — draws no label and draws its edge as a line inside the container.
//   the list      the raised sheet, the rows and what parts the groups: the option list a combobox shares
//                 (src/primitives/option-list.ts), from the select's `list.*`, `option.*`, `group.*` and `divider.*`.
//
// It draws no row of a frame (SEL-64): the label above it, the requirement mark, the help and the error text are the
// rows of the Field that frames it, drawn from `comp.field`.

/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['stacked', 'filled', 'outlined'] as const;
export const CORE_SIZES = ['medium', 'small', 'large'] as const;
const DEFAULT_VARIANT = 'stacked';
const DEFAULT_SIZE = 'medium';
/** Every part of the trigger a state recolors (the state-layer color is read only through the container's state tokens). */
const PARTS = {
  c: 'container-color',
  i: 'active-indicator-color',
  o: 'outline-color',
  l: 'label-color',
  n: 'input-color',
  h: 'placeholder-color',
  s: 'leading-icon-color',
  t: 'trailing-icon-color',
  ra: 'required-asterisk-color',
} as const;

/** What a select alone draws: its list, its options, the rows' own state motion and opacity (SEL-65). */
export const PREFIX = '--tanrei-comp-select';
/** The box is drawn from the one set of tokens every input box is drawn from; `PREFIX` is what this component alone draws. */
const B = unsafeCSS(INPUT_BOX);
const STATE_MOTION = `var(${INPUT_BOX}-motion-state-duration) var(${INPUT_BOX}-motion-state-easing)`;
const motion = unsafeCSS(STATE_MOTION);
// The trigger's token blocks (src/primitives/field-trigger.ts): per variant both looks' parts in every state, per size
// the members of the size axis, which look is painted (SEL-9), and each state's paint (SEL-7, SEL-9, SEL-20, SEL-46).
const { variantBlock, sizeBlock, lookBlock, paint } = triggerTokens(PARTS);

/**
 * SEL-63, FLD-26: how far the value stands from the container's start edge — the inline padding or, beside a leading
 * icon, the padding beside a glyph, the icon and its gap — and the padding the container keeps at its end edge (the
 * padding beside a glyph while the chevron is drawn), as lengths of the box's tokens for `size`: the same sums
 * the container is laid out by (`--_text-start`, `--_end`). The Field's supporting row starts and ends there. A size a
 * layer added falls back to the default's token where the active system has none.
 */
export function INSET(size: string, { leading, chevron }: { leading: boolean; chevron: boolean }): { start: string; end: string } {
  const core = (CORE_SIZES as readonly string[]).includes(size);
  const t = (member: string) => (core ? `var(${INPUT_BOX}-${member}-${size})` : `var(${INPUT_BOX}-${member}-${size}, var(${INPUT_BOX}-${member}-${DEFAULT_SIZE}))`);
  const M = TRIGGER_SIZE_MEMBERS;
  return {
    start: leading ? `calc(${t(M['pad-icon'])} + ${t(M.icon)} + ${t(M.gap)})` : t(M.pad),
    end: chevron ? t(M['pad-icon']) : t(M.pad),
  };
}

/**
 * The open axes (SEL-60): a size or variant a layer added gets its block on demand, built by the same
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

/** The select is disabled — its own `disabled`, a fieldset's, its Field's or a field group's (`data-disabled` on the root). */
const DISABLED = '.field[data-disabled]';

const FILLED = ".field[data-layout='filled']";

export const styles = css`
  /* SEL-49, SEL-64: bare, an inline box as wide as its widest option and exactly as tall as its container, never wider
     than its layout gives it. */
  :host {
    display: inline-flex;
    flex-direction: column;
    vertical-align: middle;
    min-inline-size: 0;
    max-inline-size: 100%;
    outline: none;
  }
  /* SEL-49: a select a Field frames is a block that fills the width that Field gives it (select.ts says the state). */
  :host(:state(framed)) {
    display: flex;
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
    /* Where the value starts: after the leading icon and its gap, or at the text padding (SEL-1, SEL-18). */
    --_start: var(--_pad);
    --_end: var(--_pad);
    --_text-start: var(--_start);
    /* Where the value ends: before the chevron and its gap, or at the text padding (a read-only select draws none). */
    --_text-end: var(--_end);
    /* One line of a text style, as a length (a typescale's line height is a ratio of its size). */
    --_floated-line: calc(var(--_floated-line-height) * var(--_floated-font-size));
    --_label-line: calc(var(--_label-line-height) * var(--_label-font-size));
    --_input-line: calc(var(--_input-line-height) * var(--_input-font-size));
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-inline-size: 0;
    transition: opacity ${motion};
  }
  .field[data-leading] {
    --_start: var(--_pad-icon);
    --_text-start: calc(var(--_pad-icon) + var(--_icon) + var(--_gap));
  }
  .field[data-chevron] {
    --_end: var(--_pad-icon);
    --_text-end: calc(var(--_pad-icon) + var(--_icon) + var(--_gap));
  }

  /* SEL-20: each state sets the current value of every part from that state's tokens of the current look; focused over
     hovered, disabled over all. */
  ${stateRules(triggerOn, {
    hovered: paint('-h', 'hovered'),
    focused: paint('-f', 'focused'),
    pressed: '',
    pressedContent: '',
    disabled: paint('-d', 'disabled'),
  })}

  /* SEL-1: at least the size's height; the text padded by padding-inline (padding-inline-with-icon beside a glyph);
     four rounded corners stacked and outlined, the bottom two by shape-bottom filled; eased by the corner smoothing
     (data-tanrei-shape). SEL-22: the whole container is one target and draws no press answer. */
  .container {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context: the edges, the label and the value stack inside it. */
    isolation: isolate;
    display: flex;
    align-items: stretch;
    min-block-size: var(--_height);
    padding-inline: var(--_start) var(--_end);
    ${unsafeCSS(cornerRadius(`${INPUT_BOX}-container-shape`))}
    background: var(--_c);
    /* SEL-21: the focused edge is the focus indicator; the element draws no ring of its own. */
    outline: none;
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: background-color ${motion};
  }
  ${unsafeCSS(FILLED)} .container {
    border-end-start-radius: calc(var(${B}-container-shape-bottom) * var(--_corner-scale));
    border-end-end-radius: calc(var(${B}-container-shape-bottom) * var(--_corner-scale));
  }

  /* SEL-13, SEL-22: the container is the one hit target: nothing inside it is hit-tested, so a press anywhere in it
     lands on the container itself. (In WebKit a press that lands on the value or a glyph leaves the sequential focus
     navigation starting point on that descendant of the focused container, and Tab then moves focus nowhere.) */
  .container > * {
    pointer-events: none;
  }
  /* SEL-22: the hit area meets the minimum target without changing the visual size. The content above stacks over it. */
  ${minimumTarget('.container')}

  /* The value's line: one line of the input's text style, centred in the container. SEL-49: its cell also holds every
     option's label in that style, never drawn, so the select is as wide as its widest option would make it. */
  .body {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    flex: 1 1 auto;
    align-items: center;
    min-inline-size: 0;
    padding-block: var(--_pad-block);
    font: var(--_input-font);
    letter-spacing: var(--_input-letter-spacing);
    line-height: var(--_input-line-height);
  }
  /* SEL-15: a filled select that draws its label keeps room for the floated label above the value, from the start. */
  ${unsafeCSS(FILLED)}[data-labelled] .body {
    padding-block: calc(var(--_pad-label) + var(--_floated-line)) var(--_pad-label);
  }
  ${unsafeCSS(FILLED)}[data-labelled] .container {
    min-block-size: max(var(--_height), calc(2 * var(--_pad-label) + var(--_floated-line) + var(--_input-line)));
  }
  /* SEL-16, SEL-59: the value (or the placeholder) stands at the layout's start edge; its text is a run of its own
     direction, on one line, cut with an ellipsis at the end of its own direction. */
  .line {
    grid-area: 1 / 1;
    display: flex;
    min-inline-size: 0;
    min-block-size: var(--_input-line);
  }
  .value,
  .placeholder {
    flex: 0 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--_n);
    transition: color ${motion};
  }
  .placeholder {
    color: var(--_h);
  }
  ${productText(':is(.value, .placeholder)')}
  /* SEL-16: the placeholder shows only while the label is not in the line — above, floated or not drawn. */
  .field[data-labelled]:not([data-layout='stacked']):not([data-focused]) .placeholder {
    color: transparent;
    transition: none;
  }
  .sizer {
    grid-area: 1 / 1;
    display: block;
    block-size: 0;
    min-inline-size: 0;
    overflow: hidden;
    visibility: hidden;
    /* One label to a line (select.ts sizerLines()): one text, and after it a line of its own for each option that
       says its language. The widest line is the width. */
    white-space: pre;
    pointer-events: none;
  }
  /* SEL-49: where an option has a glyph and the container shows none now, the column it would take is kept in the width. */
  .field[data-option-icons]:not([data-leading]) .sizer {
    padding-inline-end: calc(var(--_pad-icon) + var(--_icon) + var(--_gap) - var(--_pad));
  }

  /* SEL-18, SEL-19: the glyphs, at the size's icon size in the family and fill of an unselected icon, colored by
     their part, gap from the value. SEL-57: iconGlyph() mirrors the glyph GlyphMirrorController marked, in
     right-to-left, in its own box; the chevron is never marked. */
  ${iconGlyph('.icon', { size: '--_icon', selected: '.never-selected', duration: `${INPUT_BOX}-motion-state-duration`, easing: `${INPUT_BOX}-motion-state-easing` })}
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
  .chevron {
    display: inline-block;
  }
  .leading-slot,
  .leading-own {
    color: var(--_s);
  }
  .chevron {
    color: var(--_t);
  }
  /* SEL-19: until the icon set can draw a glyph nothing stands in its place — never its name — and its box is kept. */
  :is(.chevron, .leading-own):not([data-drawn]) {
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
  /* The gap sits on the value's side: the icon box lays its glyph out left to right, whatever the layout's direction. */
  .field[data-leading] .body {
    margin-inline-start: var(--_gap);
  }
  .field[data-chevron] .body {
    margin-inline-end: var(--_gap);
  }

  /* SEL-15: the label of a filled or outlined select — resting in the line, floated, wrapping — and SEL-7, its asterisk
     (src/primitives/field-trigger.ts). */
  ${floatingLabelStyles()}

  /* SEL-20: a stacked select's edge, a line inside the container's edge that takes no layout space; SEL-15: an outlined
     select's three-piece outline with the gap for the floated label, and a filled select's active indicator. */
  ${triggerEdgeStyles()}

  /* SEL-21: where the focus style is glow, the glow around the container while the select is focused (no ring ever). */
  ${focusGlow((focus) => (focus === ':focus-visible' ? '.field[data-focused] .container' : ".field[data-focused][data-focus-style='glow'] .container"))}
  /* A filled box's bottom corners are container.shape-bottom's: the glow follows them. */
  ${focusGlowEnds((focus) => (focus === ':focus-visible' ? `${FILLED}[data-focused] .container` : `${FILLED}[data-focused][data-focus-style='glow'] .container`), `var(${B}-container-shape-bottom)`)}

  /* SEL-58: the floating label and the copies it is measured by are each a run of their own direction, aligned to the
     layout's start (src/styles/product-text.ts). */
  ${floatingLabelText()}

  /* SEL-1, SEL-43: corner smoothing, the shared rule, on the container, the list and the rows. */
  ${shape}

  /* SEL-24 … SEL-45: the list (src/primitives/option-list.ts). */
  ${optionListStyles({ prefix: PREFIX, variants: [DEFAULT_VARIANT, ...CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT)], minWidth: `var(${PREFIX}-list-min-width)` })}

  /* SEL-15, SEL-20: where motion is reduced, the label and the states change at once. */
  @media (prefers-reduced-motion: reduce) {
    .field,
    .container,
    .value,
    .placeholder,
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
  /* SEL-52, SEL-53: forced colors — an edge outline.width wide in the control text color around the container in
     every variant, in the highlight color at the focused width while focused; every text in the text color; a disabled
     select in the disabled text color. */
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
    .floating .asterisk {
      color: CanvasText;
    }
    .value,
    .placeholder,
    .icon {
      color: ButtonText;
    }
    ${unsafeCSS(DISABLED)} :is(.container, .floating, .floating .asterisk, .value, .placeholder, .icon) {
      color: GrayText;
      border-color: GrayText;
    }
  }
`;
