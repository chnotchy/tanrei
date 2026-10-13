import { css, unsafeCSS } from 'lit';
import { type OpenAxis, iconGlyph } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/tag.tokens.json). A tag is text, not a control (TAG-9): it has no state, so
// there is no state rule, no state layer, no ripple, no focus indicator, no minimum target and no transition here. What
// changes what it draws is its variant, its status and its size, each read from that look's own tokens — and whether it
// stands inside something disabled (TAG-21), which only recolors it.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['tonal', 'outlined', 'filled'] as const;
export const CORE_SIZES = ['small', 'medium'] as const;
/** The statuses besides `default`: a closed set (TAG-19), each a prefix inside every variant's parts (TAG-3). */
export const STATUSES = ['info', 'warning', 'error', 'success'] as const;
const DEFAULT_VARIANT = 'tonal';
const DEFAULT_SIZE = 'medium';
/** The parts of a look (TAG-2, TAG-3): the fill, the label, and the glyph or the dot. */
const PARTS = { c: 'container-color', l: 'label-color', i: 'icon-color' } as const;
/** The members of the size axis (`dev.tanrei.axes.size.members`). */
const SIZE_MEMBERS = {
  height: 'container-height',
  pad: 'container-padding-inline',
  'pad-icon': 'container-padding-inline-with-icon',
  'pad-block': 'container-padding-block',
  font: 'label-typescale',
} as const;

const PREFIX = '--tanrei-comp-tag';
const T = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// Per variant, the three parts with no status and under each status, as private custom properties (`--_c` = the fill,
// `--_error-i` = the mark of an error tag). The token is `<variant>-[<status>-]<part>`.
//
// TAG-21: a tag drawn as part of something disabled takes the same parts from its look's disabled tokens,
// `<variant>-disabled-[<status>-]<part>`, under the same selector with `[disabled]` added — more specific than every
// resting block, so it wins whatever order the blocks are in (a variant a layer adds gets both on demand).
const disabledOf = (selector: string) => (selector === ':host' ? ':host([disabled])' : selector.replace(/^:host\((.*)\)$/, ':host($1[disabled])'));
const partsBlock = (variant: string, selector: string, state: string, fallback: string | null) =>
  `${selector} {\n${['', ...STATUSES]
    .flatMap((status) => Object.entries(PARTS).map(([key, part]) => `  --_${status ? `${status}-` : ''}${key}: ${ref((v) => `${PREFIX}-${v}-${state}${status ? `${status}-` : ''}${part}`, variant, fallback)};`))
    .join('\n')}\n}`;
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${partsBlock(variant, selector, '', fallback)}\n${partsBlock(variant, disabledOf(selector), 'disabled-', fallback)}`;

// The label's text role is used whole: its font shorthand and its letter spacing.
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) =>
      member === 'label-typescale'
        ? [`  --_font: ${ref((v) => `${PREFIX}-${member}-${v}-font`, size, fallback)};`, `  --_tracking: ${ref((v) => `${PREFIX}-${member}-${v}-letter-spacing`, size, fallback)};`]
        : [`  --_${key}: ${ref((v) => `${PREFIX}-${member}-${v}`, size, fallback)};`],
    )
    .join('\n')}\n}`;

/** TAG-3: what a status paints — the same three parts, from the variant's parts of that status. Colors only. */
const statusBlock = (status: string) => `:host([status='${status}']) .container {
    background: var(--_${status}-c);
    color: var(--_${status}-l);
    --_mark: var(--_${status}-i);
  }`;

/**
 * The open axes (TAG-19): a size or variant a layer added gets its block on demand, built by the same functions
 * as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug
 * builds. A variant a layer adds has no edge: only `outlined` draws one (TAG-4).
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-${value}-container-color` },
];

export const styles = css`
  /* TAG-13: inline with the text or the row it is placed in, one unbreakable box, its label on the baseline of the text
     beside it; TAG-1: as wide as its content and its paddings, never wider than its layout gives it. The host is the
     positioning container of the status text read in place (TAG-11). It has no role, no tabindex and no listener, and
     leaves pointer-events as they are: input over a tag reaches the element that holds it (TAG-9, TAG-10). */
  :host {
    display: inline-flex;
    position: relative;
    vertical-align: baseline;
    max-inline-size: 100%;
  }
  :host([hidden]) {
    display: none;
  }
  /* TAG-20: a tag with no label draws nothing and takes no space. Its own rule: a browser without custom states drops
     only this one, and the empty tag is then an empty inline box. */
  :host(:state(empty)) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}

  /* TAG-1: the container — at least the size's height, the size's paddings, container.shape corners through the shared
     corner rule (round caps for the full step, at any height the tag grows to), no elevation. TAG-2: the look's fill, its
     label color (inherited by the label) and its mark color. The row inside it is centred, so a height a system makes
     larger than one line and its paddings keeps the content in the middle. */
  .container {
    box-sizing: border-box;
    display: inline-flex;
    flex: 0 1 auto;
    align-items: center;
    min-inline-size: 0;
    max-inline-size: 100%;
    min-block-size: var(--_height);
    padding-block: var(--_pad-block);
    padding-inline: var(--_pad);
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    background: var(--_c);
    color: var(--_l);
    --_mark: var(--_i);
    font: var(--_font);
    letter-spacing: var(--_tracking);
    white-space: nowrap;
  }
  /* TAG-1: a glyph or a dot at the start brings that end nearer. */
  .container.has-lead {
    padding-inline-start: var(--_pad-icon);
  }
  ${unsafeCSS(STATUSES.map(statusBlock).join('\n  '))}
  /* TAG-4: the outlined look's edge, inside the container's size and following its corners — an inset ring changes
     neither the box nor the place of its content. One hairline in every status. */
  :host([variant='outlined']) .container {
    box-shadow: inset 0 0 0 ${T('outline-width')} ${T('outline-color')};
  }
  ${shape}

  /* TAG-13: the mark and the label share ONE baseline, the label's, which is therefore the row's, the container's and
     the host's (a flex container's baseline is that of its items aligned by baseline). The mark's box holds an empty
     line of the label's text style (the ::before), so the mark is centred on the label's line (TAG-6, TAG-7) whichever
     of the two is taller, and a mark taller than the line makes the row taller without moving the baseline off the text. */
  .row {
    display: flex;
    flex: 0 1 auto;
    align-items: baseline;
    min-inline-size: 0;
  }
  .lead {
    display: none;
    flex: none;
    align-items: center;
    margin-inline-end: ${T('container-gap')};
  }
  .container.has-lead .lead {
    display: inline-flex;
  }
  .lead::before {
    content: '\\200b';
    inline-size: 0;
  }

  /* TAG-6: the product's glyph in a box of icon.size, in the look's mark color, drawn by the icon helper: the icon set's
     unselected family and fill (a tag's glyph never stands for a selection), sys.icon.weight, the optical size of the
     box, and no transition (TAG-12). TAG-17: iconGlyph() mirrors the slotted glyph GlyphMirrorController marked, in
     right-to-left, in its own box. */
  ${iconGlyph('.icon', { size: `${PREFIX}-icon-size`, selected: ':not(*)' })}
  .icon {
    display: none;
    align-items: center;
    justify-content: center;
    color: var(--_mark);
  }
  .container.has-icon .icon {
    display: inline-flex;
  }
  ::slotted(svg),
  ::slotted(img) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }
  /* TAG-7: the dot, a circle of diameter dot.size whatever corners the container has. */
  .dot {
    flex: none;
    inline-size: ${T('dot-size')};
    block-size: ${T('dot-size')};
    border-radius: 50%;
    background: var(--_mark);
  }

  /* TAG-11: the status in words, read before the label and never drawn. */
  .status {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* TAG-5: the label on one line, cut with an ellipsis only when the layout gives the tag less than it needs; the
     paddings and the mark do not shrink. TAG-18: text of its own direction, isolated (styles/product-text.ts), in a box
     of that direction — the element gives it dir="auto" — so it is cut at its own end; it is exactly as wide as its one
     line, so it needs no alignment, and where it stands in the row is the layout's. */
  .label {
    flex: 0 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  ${productText('.label')}

  /* TAG-14: forced colors remove every fill, so every look gains an edge in the text color, inside the container's
     size: a border the paddings give room for, so nothing moves. The label and the glyph are text and take CanvasText
     from the mode; the dot is a fill, which the mode would remove, so it is drawn in CanvasText by name. */
  @media (forced-colors: active) {
    .container {
      border: ${T('outline-width')} solid CanvasText;
      padding-block: calc(var(--_pad-block) - ${T('outline-width')});
      padding-inline: calc(var(--_pad) - ${T('outline-width')});
      color: CanvasText;
      --_mark: CanvasText;
    }
    .container.has-lead {
      padding-inline-start: calc(var(--_pad-icon) - ${T('outline-width')});
    }
    /* The glyph takes its parent's forced color without the backplate the mode paints behind text: at a round end the
       backplate would cover the edge beside it. */
    .icon {
      forced-color-adjust: preserve-parent-color;
      color: inherit;
    }
    .dot {
      forced-color-adjust: none;
      background: CanvasText;
    }
    /* TAG-21: drawn as part of something disabled, in the mode's color for disabled text. */
    :host([disabled]) .container {
      border-color: GrayText;
      color: GrayText;
      --_mark: GrayText;
    }
    :host([disabled]) .dot {
      background: GrayText;
    }
  }
`;
