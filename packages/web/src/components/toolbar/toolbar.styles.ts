import { css, unsafeCSS } from 'lit';
import { type OpenAxis, keptLength } from '../../primitives/index.js';
import { shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/toolbar.tokens.json): per variant the container's color, elevation, corners,
// cross-axis size, end padding, minimum gap and edge color, and the edge's width. The toolbar has no states and draws no
// text or glyph: its items are the product's icon buttons and Buttons, drawn from their own tokens (TBR-9).
export const CORE_VARIANTS = ['docked', 'floating'] as const;
export const DEFAULT_VARIANT = 'docked';
const PREFIX = '--tanrei-comp-toolbar';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);

// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: string, variant: string, fallback: string | null) =>
  fallback ? `var(${PREFIX}-${name}-${variant}, var(${PREFIX}-${name}-${fallback}))` : `var(${PREFIX}-${name}-${variant})`;

/** One variant's members (`dev.tanrei.axes.variant.members`) as private custom properties under `selector`. */
const variantBlock = (variant: string, selector: string, fallback: string | null = null) => `${selector} {
  --_bg: ${ref('container-color', variant, fallback)};
  --_elevation: ${ref('container-elevation', variant, fallback)};
  --_shape: ${ref('container-shape', variant, fallback)};
  --_shape-pill: ${fallback ? `var(${PREFIX}-container-shape-${variant}-pill, var(${PREFIX}-container-shape-${fallback}-pill, 0))` : `var(${PREFIX}-container-shape-${variant}-pill, 0)`};
  --_size: ${ref('container-size', variant, fallback)};
  --_pad: ${ref('container-padding-inline', variant, fallback)};
  --_gap: ${ref('container-gap', variant, fallback)};
  --_edge: ${ref('outline-color', variant, fallback)};
}`;

/**
 * The open axis (TBR-13): a variant a layer added gets its values on demand, built by the same function and
 * falling back to docked's tokens, and takes the docked structure (the structure is not a value: only `floating` is
 * drawn as a floating toolbar); a value the active system lacks is reported.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-container-color-${value}` },
];

const FLOATING = ":host([variant='floating'])";
// TBR-16: read on the items themselves, where a private name of the toolbar's (--_gap) would be the item's own.
const FLOATING_GAP = `var(${PREFIX}-container-gap-floating)`;
const VERTICAL = ":host([variant='floating'][orientation='vertical'])";

export const styles = css`
  /* TBR-1, TBR-3, TBR-13: the docked structure — every variant but floating. The parent's full width; the container at
     least container.size high above the bottom inset, its color reaching under the bottom and side insets while the
     items stay inside them. */
  :host {
    display: flex;
    --_inset-bottom: env(safe-area-inset-bottom, 0px);
    --_inset-left: env(safe-area-inset-left, 0px);
    --_inset-right: env(safe-area-inset-right, 0px);
  }
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}
  :host([hidden]) {
    display: none;
  }

  /* TBR-1, TBR-2: one row in reading order (logical: right-to-left starts at the right, TBR-7), padding-inline at each
     end, the items spread with equal space between them and never less than the gap, each centred across the row. The
     edge is the container's top inset line; the fill, elevation and corners are the variant's. */
  .container {
    box-sizing: border-box;
    flex: 1 1 auto;
    min-inline-size: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--_gap);
    min-block-size: calc(var(--_size) + var(--_inset-bottom));
    padding-block-end: var(--_inset-bottom);
    padding-left: calc(var(--_inset-left) + var(--_pad));
    padding-right: calc(var(--_inset-right) + var(--_pad));
    background: var(--_bg);
    box-shadow: var(--_elevation), inset 0 ${t('outline-width')} 0 0 var(--_edge);
    --tanrei-corner-radius: var(--_shape);
    --tanrei-corner-pill: var(--_shape-pill);
  }

  /* TBR-8, TBR-9: every item keeps its own size (it never shrinks, and a Button's label stays on one line); TBR-2: one
     item is centred. */
  ::slotted(*) {
    flex: none;
  }
  ::slotted(:only-child) {
    margin-inline: auto;
  }

  /* TBR-8: items that need more length than the toolbar has scroll along its axis (the gap at its minimum: space-between
     starts at the start edge when there is no free space). Only then is the container a scroll container, so at rest
     nothing of an item — its target, its ring, an elevated Button's shadow — is clipped. */
  .container.scrolls {
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .container.scrolls::-webkit-scrollbar {
    display: none;
  }

  /* TBR-4, TBR-5: floating — at its own size where the layout places it, never wider than its container; the items
     packed from the start, padding-inline at each end and the gap between them (TBR-16, below), at least container.size
     across, every item centred; the edge around the whole shape, rounded by the variant's corners eased by corner
     smoothing. No inset is read. */
  ${unsafeCSS(FLOATING)} {
    display: inline-flex;
    vertical-align: middle;
    max-inline-size: 100%;
  }
  ${unsafeCSS(FLOATING)} .container {
    justify-content: flex-start;
    gap: 0;
    min-block-size: var(--_size);
    padding-block-end: 0;
    padding-left: var(--_pad);
    padding-right: var(--_pad);
    box-shadow: var(--_elevation), inset 0 0 0 ${t('outline-width')} var(--_edge);
  }

  /* TBR-6: vertical (floating only) — the items stacked top to bottom in the order given, whatever the direction (TBR-7),
     the paddings and gap along the block axis, at least container.size wide, never taller than its container. */
  ${unsafeCSS(VERTICAL)} {
    flex-direction: column;
    max-inline-size: none;
    max-block-size: 100%;
  }
  ${unsafeCSS(VERTICAL)} .container {
    flex-direction: column;
    min-inline-size: var(--_size);
    min-block-size: 0;
    padding-block: var(--_pad);
    padding-left: 0;
    padding-right: 0;
  }
  /* TBR-16: a floating toolbar's items stand container.gap.floating apart between their visible bounds — 0 in the
     default system — and two neighbours further only as far as each needs to keep sys.target.touch of length along the
     axis, centred on itself, that its neighbour's does not reach into: an item at least that long touches its
     neighbour, a shorter one stands half of what it lacks away (src/primitives/kept-length.ts; the element measures the
     items' lengths). Nothing of an item is widened or restyled (TBR-9), and the space is the same for every pointer.
     Along the row, or the column of a vertical toolbar. A docked toolbar spreads its items and keeps its gap (TBR-2). */
  ${keptLength(":host([variant='floating']:not([orientation='vertical'])) ::slotted(*)", { gap: FLOATING_GAP })}
  ${keptLength(`${VERTICAL} ::slotted(*)`, { gap: FLOATING_GAP, axis: 'block' })}
  ${unsafeCSS(VERTICAL)} .container.scrolls {
    overflow-x: hidden;
    overflow-y: auto;
  }

  /* TBR-4: corner smoothing, the shared rule, on the container (data-tanrei-shape). */
  ${shape}

  @media (forced-colors: active) {
    .container {
      border-block-start: ${t('outline-width')} solid CanvasText;
    }
    ${unsafeCSS(FLOATING)} .container {
      border: ${t('outline-width')} solid CanvasText;
    }
  }
`;
