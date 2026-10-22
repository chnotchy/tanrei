import { css, unsafeCSS } from 'lit';
import { type OpenAxis, separationHost, whenGap } from '../../primitives/index.js';
import { shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/toolbar.tokens.json): per variant the container's color, elevation, corners,
// cross-axis size, end padding, minimum gap and edge color, and the edge's width; the space and the line that set two
// groups apart, and which of the two is drawn (`separation`). The toolbar has no states and draws no text or glyph of its
// own: its items are the product's Buttons and Buttons with menu, drawn from their own tokens (TBR-9), and its overflow
// button is a Tanrei Button.
export const CORE_VARIANTS = ['inline', 'docked', 'floating'] as const;
export const DEFAULT_VARIANT = 'inline';
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
 * The open axis (TBR-13): a variant a layer added gets its values on demand, built by the same function and falling back
 * to inline's tokens, and takes the inline structure (the structure is not a value: only `docked` and `floating` are
 * drawn as such); a value the active system lacks is reported.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-container-color-${value}` },
];

// The space between two neighbouring items is an element of the toolbar's own — or of a group's, between the group's
// items (toolbar-group.ts) — never a margin on the product's item: a page's rules beat the rules a shadow root gives
// what it slots, so a reset such as `* { margin: 0 }` would take a margin away.
//
//  - Docked (TBR-2): the spaces share the free length equally and are never shorter than the gap; the toolbar spreads
//    its items.
//  - Inline and floating (TBR-16, TBR-17): a space is the gap, or as much more as its two neighbours need to keep,
//    centred on each, a length of sys.target.touch along the axis that the other's does not reach into:
//    max(gap, lack(a) + lack(b)) with lack(x) = max(0, (sys.target.touch − x) / 2). The toolbar measures the two
//    neighbours' lengths along its axis and writes them on the space (`--_a`, `--_b`): lengths only, so no token is
//    read in script and a switch of the design system is followed by the cascade.
//
// What the space reads arrives from the toolbar's container by inheritance (it reaches a group's shadow root): the gap
// and whether the spaces grow.
const TOUCH = 'var(--tanrei-sys-target-touch)';
const lack = (length: string) => `max(0px, calc((${TOUCH} - var(${length}, ${TOUCH})) / 2))`;
const KEPT = `max(var(--_tanrei-toolbar-gap, 0px), calc(${lack('--_a')} + ${lack('--_b')}))`;

/** The rules of a space between two items, for the toolbar's shadow root and a group's. */
export const spaceStyles = css`
  .space {
    flex: var(--_tanrei-toolbar-grow, 0) var(--_tanrei-toolbar-grow, 0) var(--_tanrei-toolbar-basis, auto);
    align-self: center;
    inline-size: ${unsafeCSS(KEPT)};
    block-size: ${unsafeCSS(KEPT)};
    min-inline-size: var(--_tanrei-toolbar-min, 0px);
    pointer-events: none;
  }
  /* TBR-18, TBR-23: what is hidden, and a space or a line that stands beside nothing, is not drawn. */
  [data-off] {
    display: none !important;
  }
`;

const DOCKED = ":host([variant='docked'])";
const FLOATING = ":host([variant='floating'])";
/** The structures that are as long as their items: floating, inline and every value a layer adds (TBR-13). */
const PACKED = ":host(:not([variant='docked']))";
const VERTICAL = ":host(:not([variant='docked'])[orientation='vertical'])";

export const styles = [
  spaceStyles,
  css`
    /* TBR-17, TBR-13: the inline structure — every variant but docked and floating, and the default. In place where the
       layout puts it, as long as its items need and never longer than the layout allows; no inset is read. */
    :host {
      display: inline-flex;
      vertical-align: middle;
      max-inline-size: 100%;
    }
    ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
    ${unsafeCSS(
      CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT)
        .map((v) => variantBlock(v, `:host([variant='${v}'])`))
        .join('\n'),
    )}
    :host([hidden]) {
      display: none;
    }
    /* TBR-23: the separation it draws — its attribute's, else comp.toolbar.separation's. */
    ${separationHost(`${PREFIX}-separation`)}

    /* One line in reading order (logical: right-to-left starts at the right, TBR-7), padding-inline at each end, each
       item centred across the line; the fill, elevation, corners and edge are the variant's. */
    .container {
      box-sizing: border-box;
      flex: 1 1 auto;
      min-inline-size: 0;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: flex-start;
      gap: 0;
      min-block-size: var(--_size);
      padding-inline: var(--_pad);
      background: var(--_bg);
      box-shadow: var(--_elevation), inset 0 0 0 ${t('outline-width')} var(--_edge);
      --tanrei-corner-radius: var(--_shape);
      --tanrei-corner-pill: var(--_shape-pill);
      --_tanrei-toolbar-gap: var(--_gap);
    }

    /* TBR-1, TBR-2, TBR-3: docked — the parent's full width; the container at least container.size high above the
       bottom inset, its color reaching under the bottom and side insets while the items stay inside them; the items
       spread with equal space between them, never less than the gap; the edge is the container's top inset line. */
    ${unsafeCSS(DOCKED)} {
      display: flex;
      max-inline-size: none;
      --_inset-bottom: env(safe-area-inset-bottom, 0px);
      --_inset-left: env(safe-area-inset-left, 0px);
      --_inset-right: env(safe-area-inset-right, 0px);
    }
    ${unsafeCSS(DOCKED)} .container {
      min-block-size: calc(var(--_size) + var(--_inset-bottom));
      padding-block-end: var(--_inset-bottom);
      padding-left: calc(var(--_inset-left) + var(--_pad));
      padding-right: calc(var(--_inset-right) + var(--_pad));
      box-shadow: var(--_elevation), inset 0 ${t('outline-width')} 0 0 var(--_edge);
      --_tanrei-toolbar-grow: 1;
      --_tanrei-toolbar-basis: 0px;
      --_tanrei-toolbar-min: var(--_gap);
    }
    /* TBR-2: one item is centred — by the container, not by a margin on the item. */
    ${unsafeCSS(DOCKED)} .container.only {
      justify-content: center;
    }

    /* TBR-8, TBR-9: every item keeps its own size (it never shrinks, and a Button's label stays on one line). */
    ::slotted(*) {
      flex: none;
    }

    /* TBR-8: overflow scroll — items that need more length than the toolbar has scroll along its axis. Only then is the
       container a scroll container, so at rest nothing of an item — its target, its ring, an elevated Button's shadow —
       is clipped. */
    .container.scrolls {
      overflow-x: auto;
      overflow-y: hidden;
      overscroll-behavior: contain;
      scrollbar-width: none;
    }
    .container.scrolls::-webkit-scrollbar {
      display: none;
    }

    /* TBR-4, TBR-5: floating — at its own size where the layout places it, never wider than its container; the edge
       around the whole shape, rounded by the variant's corners eased by corner smoothing. */
    ${unsafeCSS(FLOATING)} .container {
      box-shadow: var(--_elevation), inset 0 0 0 ${t('outline-width')} var(--_edge);
    }

    /* TBR-6: vertical (inline and floating) — the items stacked top to bottom in the order given, whatever the direction
       (TBR-7), the paddings along the block axis, at least container.size wide, never taller than its container. */
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
    ${unsafeCSS(VERTICAL)} .container.scrolls {
      overflow-x: hidden;
      overflow-y: auto;
    }
    ${unsafeCSS(PACKED)} .container {
      --_tanrei-toolbar-grow: 0;
    }

    /* TBR-23: the line between two groups, or where a separator item stands — divider.thickness thick, divider.length
       long across the axis, centred, in divider.color, with group.gap on each side. A border, not a background: engines
       snap a border to whole device pixels, and forced colors keep it. Docked, the space it stands in grows with the
       other spaces, so that the items stay evenly spread. */
    .sep {
      flex: var(--_tanrei-toolbar-grow, 0) var(--_tanrei-toolbar-grow, 0) var(--_tanrei-toolbar-basis, auto);
      align-self: stretch;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: content-box;
      padding-inline: ${t('group-gap')};
      min-inline-size: ${t('divider-thickness')};
    }
    .sep::before {
      content: '';
      box-sizing: border-box;
      inline-size: 0;
      block-size: ${t('divider-length')};
      border-inline-start: ${t('divider-thickness')} solid ${t('divider-color')};
    }
    ${unsafeCSS(VERTICAL)} .sep {
      padding-inline: 0;
      padding-block: ${t('group-gap')};
      min-inline-size: 0;
      min-block-size: ${t('divider-thickness')};
    }
    ${unsafeCSS(VERTICAL)} .sep::before {
      inline-size: ${t('divider-length')};
      block-size: 0;
      border-inline-start: 0;
      border-block-start: ${t('divider-thickness')} solid ${t('divider-color')};
    }
    /* TBR-23: gap — twice group.gap of empty space and no line. */
    ${whenGap(
      '.container',
      (container) => `
    ${container} .sep {
      min-inline-size: 0;
      min-block-size: 0;
    }
    ${container} .sep::before {
      display: none;
    }`,
    )}

    /* TBR-24: a Menu anchored to an item is the product's, and is neither laid out nor counted: its host stands out of
       the line, and its surface is in the top layer. */
    .menus {
      position: absolute;
      inline-size: 0;
      block-size: 0;
    }

    /* TBR-4: corner smoothing, the shared rule, on the container (data-tanrei-shape). */
    ${shape}

    @media (forced-colors: active) {
      ${unsafeCSS(DOCKED)} .container {
        border-block-start: ${t('outline-width')} solid CanvasText;
      }
      ${unsafeCSS(FLOATING)} .container {
        border: ${t('outline-width')} solid CanvasText;
      }
      .sep::before {
        border-color: CanvasText;
      }
    }
  `,
];
