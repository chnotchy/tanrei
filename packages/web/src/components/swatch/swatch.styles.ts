import { css, unsafeCSS } from 'lit';
import type { OpenAxis } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/swatch.tokens.json). A swatch has no state (SWC-13): what changes what it
// draws is its size and its shape, each read from that value's own tokens, the color it is given, and whether its text
// is drawn.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
export const CORE_SHAPES = ['square', 'circle'] as const;
const DEFAULT_SIZE = 'medium';
const DEFAULT_SHAPE = 'square';

const PREFIX = '--tanrei-comp-swatch';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

/** Per size (SWC-1, SWC-7): the sample's side, the gap to the text, and the two text roles used whole. */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) => {
  const role = (part: string, member: string) => ref((v) => `${PREFIX}-${part}-typescale-${v}-${member}`, size, fallback);
  return `${selector} {
  --_side: ${ref((v) => `${PREFIX}-container-size-${v}`, size, fallback)};
  --_gap: ${ref((v) => `${PREFIX}-gap-${v}`, size, fallback)};
  --_label-font: ${role('label', 'font')};
  --_label-tracking: ${role('label', 'letter-spacing')};
  --_supporting-font: ${role('supporting-text', 'font')};
  --_supporting-tracking: ${role('supporting-text', 'letter-spacing')};
}`;
};

/** Per shape (SWC-1): the corners, and whether that token is the full step — a circle whatever the smoothing. */
const shapeBlock = (name: string, selector: string, fallback: string | null = null) => `${selector} {
  --_shape: ${ref((v) => `${PREFIX}-container-shape-${v}`, name, fallback)};
  --_shape-pill: ${ref((v) => `${PREFIX}-container-shape-${v}-pill`, name, fallback)};
}`;

/** SWC-19: a size or a shape a layer added gets its block on demand, falling back to the default's tokens. */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-size-${value}` as const },
  { name: 'shape', core: CORE_SHAPES, default: DEFAULT_SHAPE, rules: (value, selector) => shapeBlock(value, selector, DEFAULT_SHAPE), probe: (value) => `${PREFIX}-container-shape-${value}` as const },
];

const forms = css`
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(shapeBlock(DEFAULT_SHAPE, ':host'))}
  ${unsafeCSS(CORE_SHAPES.filter((name) => name !== DEFAULT_SHAPE).map((name) => shapeBlock(name, `:host([shape='${name}'])`)).join('\n'))}
`;

export const styles = css`
  /* SWC-1, SWC-7: inline with the text or the row it is placed in, as wide as its sample, the gap and its longest line
     and no wider; the sample and the column of text are centred on each other. SWC-13: pointer events are left as
     they are — there is no listener here, so a press over a swatch inside a link or a Button reaches that element. */
  :host {
    display: inline-flex;
    align-items: center;
    gap: var(--_gap);
    vertical-align: middle;
    max-inline-size: 100%;
  }
  :host([hidden]) {
    display: none;
  }
  ${forms}

  /* SWC-1: a square of the size's side with the shape's corners through the shared corner rule (the browser clamps a
     radius to half the side, and the full step is a circle whatever the smoothing), one box a layout neither
     stretches nor shrinks. SWC-3: under the color, the checkerboard — a conic gradient of the two colors tiled at
     twice the square's side, so that the square at the top-left corner is checkerboard.color in every direction
     (background positions are physical). SWC-2: the color over it, exactly, as a gradient of one color; nothing is
     mixed in. SWC-4: the edge is an inset shadow, drawn over the background and following the corners. SWC-5: an
     empty sample has neither layer and keeps the edge. */
  .sample {
    box-sizing: border-box;
    flex: none;
    display: block;
    inline-size: var(--_side);
    block-size: var(--_side);
    ${unsafeCSS(cornerRadius('--_shape'))}
    background:
      linear-gradient(var(--_color), var(--_color)),
      conic-gradient(
        ${t('checkerboard-alternate-color')} 25%,
        ${t('checkerboard-color')} 0 50%,
        ${t('checkerboard-alternate-color')} 0 75%,
        ${t('checkerboard-color')} 0
      )
      0 0 / calc(2 * ${t('checkerboard-size')}) calc(2 * ${t('checkerboard-size')});
    box-shadow: inset 0 0 0 ${t('outline-width')} ${t('outline-color')};
    /* SWC-16: the color and the checkerboard are content, kept out of the forced palette. */
    forced-color-adjust: none;
  }
  .sample.empty {
    background: none;
  }
  ${shape}

  /* SWC-7: one column of text after the gap, the label over the supporting text, each in its role used whole and its
     color. Each wraps at word boundaries rather than being cut, and a word longer than the line breaks rather than
     overflowing; the sample stays whole (flex: none). */
  .text {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    overflow-wrap: break-word;
  }
  .label {
    font: var(--_label-font);
    letter-spacing: var(--_label-tracking);
    color: ${t('label-color')};
  }
  .supporting {
    font: var(--_supporting-font);
    letter-spacing: var(--_supporting-tracking);
    color: ${t('supporting-text-color')};
  }
  /* SWC-7, SWC-17: each text in its own direction, isolated from the text around it; placed by the layout. */
  ${productText('.label', { align: 'start' })}
  ${productText('.supporting', { align: 'start' })}

  /* SWC-16: the edge in the text color, so the sample is bounded on any background; the texts in the text color. */
  @media (forced-colors: active) {
    .sample {
      box-shadow: inset 0 0 0 ${t('outline-width')} CanvasText;
    }
    .label,
    .supporting {
      color: CanvasText;
    }
  }
`;
