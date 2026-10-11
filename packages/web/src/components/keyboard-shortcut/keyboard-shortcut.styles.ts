import { css, unsafeCSS } from 'lit';
import type { OpenAxis } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/keyboard-shortcut.tokens.json). The shortcut is not a control: it has one
// state besides rest, disabled, which fades the legends of its variant and keeps the caps at rest (KBS-9).
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['keycap', 'plain'] as const;
export const CORE_SIZES = ['small', 'medium'] as const;
const DEFAULT_VARIANT = 'keycap';
const DEFAULT_SIZE = 'medium';
/** The members of the size axis (`dev.tanrei.axes.size.members`). */
const SIZE_MEMBERS = {
  height: 'container-height',
  pad: 'container-padding-inline',
  shape: 'container-shape',
  font: 'label-typescale',
  chord: 'chord-gap',
  sequence: 'sequence-gap',
} as const;

const PREFIX = '--tanrei-comp-keyboard-shortcut';
const T = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// The corner is a member of the size axis, so its pill mark (the emitter's `<token>-pill`) travels with it:
// `cornerRadius('--_shape')` reads `--_shape` and `--_shape-pill`. The legend's text role is used whole.
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) => {
      if (member === 'label-typescale') {
        return [`  --_font: ${ref((v) => `${PREFIX}-${member}-${v}-font`, size, fallback)};`, `  --_tracking: ${ref((v) => `${PREFIX}-${member}-${v}-letter-spacing`, size, fallback)};`];
      }
      const line = `  --_${key}: ${ref((v) => `${PREFIX}-${member}-${v}`, size, fallback)};`;
      return member === 'container-shape' ? [line, `  --_${key}-pill: ${ref((v) => `${PREFIX}-${member}-${v}-pill`, size, fallback)};`] : [line];
    })
    .join('\n')}\n}`;

// The legend's color of each variant (`perVariant: label.color`), at rest and disabled.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {
  --_legend: ${ref((v) => `${PREFIX}-${v}-label-color`, variant, fallback)};
  --_legend-d: ${ref((v) => `${PREFIX}-${v}-disabled-label-color`, variant, fallback)};
}`;

/**
 * The open axes: a size or variant a layer added gets its block on demand, built by the same functions as the
 * core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug builds. A
 * variant a layer adds is drawn in caps; only `plain` draws none (KBS-7).
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-${value}-label-color` },
];

const CAPS = ":host(:not([variant='plain'])) .key";

export const styles = css`
  /* KBS-15: inline with the text around it, the legends on its baseline; KBS-16: left to right, isolated from the
     surrounding direction. */
  :host {
    display: inline-flex;
    position: relative;
    align-items: baseline;
    vertical-align: baseline;
    max-inline-size: 100%;
    direction: ltr;
    unicode-bidi: isolate;
  }
  :host([hidden]) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}

  /* KBS-10: the one text read in place of the drawn keys, never drawn. */
  .spoken {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* KBS-8, KBS-15: the chords in order, a sequence gap apart, breaking a line only between chords. */
  .sequence {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: var(--_sequence);
    row-gap: var(--_chord);
    max-inline-size: 100%;
  }
  kbd {
    font: inherit;
  }
  /* KBS-6, KBS-15: the keys of a chord, a chord gap apart (the separator between them where the convention writes one),
     their legends on one baseline, never broken across lines. */
  .chord {
    display: inline-flex;
    align-items: baseline;
    column-gap: var(--_chord);
    white-space: nowrap;
  }
  .key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  /* KBS-6: a cap at least its size's height tall and as wide as tall, growing with its legend (KBS-15), the legend centered
     with the size's padding on each side; its fill, and its edge inside its size — the deeper edge at its bottom — and the
     size's corners eased by the smoothing. The edge is a border of the tokens' widths and nothing else: a width of 0
     (both, in the default system) is no border at all — no least width is applied — and the cap is its fill alone. */
  ${unsafeCSS(CAPS)} {
    box-sizing: border-box;
    min-block-size: var(--_height);
    min-inline-size: var(--_height);
    padding-inline: var(--_pad);
    background: ${T('container-color')};
    border: ${T('outline-width')} solid ${T('outline-color')};
    border-block-end-width: ${T('outline-bottom-width')};
    ${unsafeCSS(cornerRadius('--_shape'))}
  }
  ${shape}

  /* KBS-6, KBS-7: the legends and the separators in the size's text role and the variant's legend color. */
  .label,
  .separator {
    font: var(--_font);
    letter-spacing: var(--_tracking);
    color: var(--_legend);
    white-space: nowrap;
  }
  /* KBS-7: the plain form writes each chord as one run of text: no cap, fill or edge, and nothing between the keys. */
  :host([variant='plain']) .chord {
    column-gap: 0;
  }
  /* KBS-9: disabled fades the legends and separators; the caps stay at rest. */
  :host([disabled]) .label,
  :host([disabled]) .separator {
    color: var(--_legend-d);
  }
  /* KBS-13: hosted in another component's part, the legends take that part's text style and color. */
  .sequence.hosted .label,
  .sequence.hosted .separator {
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
  }

  @media (forced-colors: active) {
    ${unsafeCSS(CAPS)} {
      border-color: CanvasText;
    }
    :host([disabled]) .label,
    :host([disabled]) .separator {
      color: GrayText;
    }
  }
`;
