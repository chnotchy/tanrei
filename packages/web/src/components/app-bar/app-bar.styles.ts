import { css, unsafeCSS } from 'lit';
import type { OpenAxis } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';

// Every visual value is a token (tokens/comp/app-bar.tokens.json). The bar has no interaction states: its navigation and
// action items are the product's icon buttons, which paint themselves from their own tokens (APB-11). What the bar paints
// is its condition (flat or scrolled: the container color, its elevation and the bottom edge) and its size (the heights
// and the title's and subtitle's text roles).
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_SIZES = ['small', 'large'] as const;
export const DEFAULT_SIZE = 'small';
const PREFIX = '--tanrei-comp-app-bar';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

/** The members of the size axis (`dev.tanrei.axes.size.members`), as private custom properties. */
const SIZE_MEMBERS = {
  h: (v: string) => `${PREFIX}-container-height-${v}`,
  'title-font': (v: string) => `${PREFIX}-title-typescale-${v}-font`,
  'title-ls': (v: string) => `${PREFIX}-title-typescale-${v}-letter-spacing`,
  'subtitle-font': (v: string) => `${PREFIX}-subtitle-typescale-${v}-font`,
  'subtitle-ls': (v: string) => `${PREFIX}-subtitle-typescale-${v}-letter-spacing`,
} as const;

/** One size's members under `selector`: `--_h` is its height, `--_title-font` its title's text role, and so on. */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .map(([key, name]) => `  --_${key}: ${ref(name, size, fallback)};`)
    .join('\n')}\n}`;

/**
 * The open axis (APB-14): a size a layer added (Material's `medium`) gets its block on demand, built by the
 * same function and falling back to `small`'s tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
];

/** The token a size's height is read from: a size the active system defines has it (the element checks, APB-14). */
export const heightProbe = (size: string) => `${PREFIX}-container-height-${size}`;

/** The condition's parts (APB-1, APB-2): the container color, its elevation and the bottom edge's color. */
const condition = (name: 'flat' | 'scrolled') => `
    --_c: ${T(`${name}-container-color`)};
    --_e: ${T(`${name}-container-elevation`)};
    --_o: ${T(`${name}-outline-color`)};`;

const CONDITION_MOTION = `${T('motion-condition-duration')} ${T('motion-condition-easing')}`;

/** One line of text, truncated at the end with an ellipsis (APB-5, APB-7, APB-15). */
const oneLine = `
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;`;

export const styles = css`
  :host {
    display: block;
    /* APB-10: the system insets the bar reaches under and keeps its content out of (0 where the platform has none). */
    --_inset-top: env(safe-area-inset-top, 0px);
    --_inset-left: env(safe-area-inset-left, 0px);
    --_inset-right: env(safe-area-inset-right, 0px);
    ${unsafeCSS(condition('flat'))}
  }
  :host([scrolled]) {
    ${unsafeCSS(condition('scrolled'))}
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  :host([hidden]) {
    display: none;
  }

  /* APB-1, APB-2, APB-4, APB-10: the parent's full width; the condition's color, elevation and bottom edge; the color
     reaches under the top inset and the side insets while the content stays inside them. */
  .container {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    padding-block-start: var(--_inset-top);
    padding-left: var(--_inset-left);
    padding-right: var(--_inset-right);
    background: var(--_c);
    box-shadow: var(--_e);
    /* APB-3: a change of condition moves over the condition motion. */
    transition-property: background-color, box-shadow;
    transition-duration: ${t('motion-condition-duration')};
    transition-timing-function: ${t('motion-condition-easing')};
  }
  /* APB-1, APB-2: the bottom edge, inside the bar (it never changes the bar's height). */
  .outline {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: ${t('outline-width')};
    background: var(--_o);
    pointer-events: none;
    transition: background-color ${unsafeCSS(CONDITION_MOTION)};
  }

  /* APB-4: the top row — at least the small bar's height (a large bar's top row is always the small height); the
     navigation item padding-inline from the start edge, the title block, the actions padding-inline from the end edge,
     container.gap between them, each centred in the row. Logical, so right-to-left mirrors the order. */
  .row {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: ${t('container-gap')};
    min-block-size: ${t('container-height-small')};
    padding-inline: ${t('container-padding-inline')};
  }
  /* APB-4: without a navigation item the title block starts title.inset from the start edge; without actions it ends
     title.inset from the end edge. */
  .row:not(.has-navigation) {
    padding-inline-start: ${t('title-inset')};
  }
  .row:not(.has-actions) {
    padding-inline-end: ${t('title-inset')};
  }
  .navigation,
  .actions {
    display: flex;
    flex: none;
    align-items: center;
  }
  .row:not(.has-navigation) .navigation,
  .row:not(.has-actions) .actions {
    display: none;
  }
  /* APB-4: comp.app-bar.actions.gap between two actions. */
  .actions {
    gap: ${t('actions-gap')};
  }
  /* APB-11: the items are laid out, never restyled — each keeps its own box, centred in a cell as large as the minimum
     target it answers to (BTN-5), so a neighbour's target never overlaps it and the row is at least that high. */
  ::slotted(*) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--tanrei-sys-target-pointer);
    min-block-size: var(--tanrei-sys-target-pointer);
  }
  @media (pointer: coarse) {
    ::slotted(*) {
      min-inline-size: var(--tanrei-sys-target-touch);
      min-block-size: var(--tanrei-sys-target-touch);
    }
  }

  /* APB-5, APB-6: the title block — the title, and the subtitle under it, centred in the row as a block; at the start
     after the navigation slot, or (center) centred on the bar's full width, narrowed equally on both sides by the
     element's measured balance so it never runs under either slot. */
  .title-area {
    box-sizing: border-box;
    flex: 1 1 0;
    min-inline-size: 0;
  }
  .row.center .title-area {
    padding-inline-start: var(--_balance-start, 0px);
    padding-inline-end: var(--_balance-end, 0px);
    text-align: center;
  }
  .title-block {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-inline-size: 0;
  }
  .title {
    margin: 0;
    font: ${t('title-typescale-small-font')};
    letter-spacing: ${t('title-typescale-small-letter-spacing')};
    color: ${t('title-color')};${unsafeCSS(oneLine)}
  }
  .subtitle {
    font: ${t('subtitle-typescale-small-font')};
    letter-spacing: ${t('subtitle-typescale-small-letter-spacing')};
    color: ${t('subtitle-color')};${unsafeCSS(oneLine)}
  }
  /* APB-17: the title and the subtitle are each a run of their own, in the direction of their first strong character: a
     left-to-right title in a right-to-left bar keeps its order and loses its right end when it is cut (APB-5, APB-7),
     never its beginning. Their lines are still placed by the layout: at its start edge, or centred (APB-6)
     (src/styles/product-text.ts). */
  ${productText(':is(.title, .subtitle)', { align: 'start' })}
  .row.center :is(.title, .subtitle) {
    text-align: center;
  }

  /* APB-7, APB-8: a large bar's own title row under the top row — at least the size's height less the top row's, its
     block ending padding-block-end above the bottom edge, starting (and ending) title.inset from the edges. It collapses
     by moving up under the top row: the element pulls the block up by the scrolled distance and this row clips it. */
  .expanded {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .block {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex: none;
    flex-direction: column;
    justify-content: flex-end;
    min-block-size: calc(var(--_h) - ${t('container-height-small')});
    margin-block-start: calc(-1 * var(--_collapse, 0px));
    padding-inline: ${t('title-inset')};
    padding-block-end: ${t('container-padding-block-end')};
  }
  .block .title {
    font: var(--_title-font);
    letter-spacing: var(--_title-ls);
  }
  .block .subtitle {
    font: var(--_subtitle-font);
    letter-spacing: var(--_subtitle-ls);
  }

  @media (prefers-reduced-motion: reduce) {
    .container,
    .outline {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    :host([scrolled]) .outline {
      background: CanvasText;
    }
  }
`;
