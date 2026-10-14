import { css, unsafeCSS } from 'lit';
import { type OpenAxis, actionBoxStyles, cornerRadius, dividerVisibilityHost, focusRing, shape, whenChosen, whenScroll } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { scriptTracking } from '../../styles/script-tracking.js';

// Every visual value is a token (tokens/comp/side-sheet.tokens.json). The sheet paints its panel per variant (standard or
// modal: the color, elevation, start corners and start edge — `dev.tanrei.axes.variant.members`) and lays out its header,
// content and actions. It answers no state of its own: its close button is an icon-only Button and its actions are
// Tanrei Buttons, each reading its own tokens in the variant the sheet gives it while it sets none (SSH-5, SSH-17).
export const CORE_VARIANTS = ['standard', 'modal'] as const;
export const DEFAULT_VARIANT = 'standard';
const PREFIX = '--tanrei-comp-side-sheet';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: string, variant: string, fallback: string | null) => (fallback ? `var(${PREFIX}-${name}-${variant}, var(${PREFIX}-${name}-${fallback}))` : `var(${PREFIX}-${name}-${variant})`);

/** One variant's members as private custom properties under `selector` (SSH-7). */
const variantBlock = (variant: string, selector: string, fallback: string | null = null) => `${selector} {
  --_bg: ${ref('container-color', variant, fallback)};
  --_elevation: ${ref('container-elevation', variant, fallback)};
  --_edge: ${ref('outline-color', variant, fallback)};
  --_shape: ${ref('container-shape', variant, fallback)};
  --_shape-pill: ${fallback ? `var(${PREFIX}-container-shape-${variant}-pill, var(${PREFIX}-container-shape-${fallback}-pill, 0))` : `var(${PREFIX}-container-shape-${variant}-pill, 0)`};
}`;

/**
 * The open axis (SSH-13): a variant a layer added gets its block on demand, built by the same function and
 * falling back to standard's tokens (and laid out as a standard sheet); a value the active system lacks is reported.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-container-color-${value}` },
];

const ENTER = `${T('motion-enter-duration')} ${T('motion-enter-easing')}`;
const EXIT = `${T('motion-exit-duration')} ${T('motion-exit-easing')}`;
/** Far enough to let a shadow show on the sides that are not clipped (a clip-path inset needs a length). */
const FAR = '100vmax';

export const styles = css`
  :host {
    display: block;
    --_inset-top: env(safe-area-inset-top, 0px);
    --_inset-bottom: env(safe-area-inset-bottom, 0px);
    --_inset-end: env(safe-area-inset-right, 0px);
    /* SSH-7: container.width beside the end system inset, which the color reaches under. */
    --_width: calc(${t('container-width')} + var(--_inset-end));
    /* Toward the end edge, in the direction of the text: where the sheet slides out to. */
    --_away: 100%;
  }
  :host(:dir(rtl)) {
    --_inset-end: env(safe-area-inset-left, 0px);
    --_away: -100%;
  }
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}
  :host([hidden]) {
    display: none;
  }

  /* SSH-7, SSH-8: the panel — its variant's color and elevation, its start corners rounded by its variant's shape (eased
     by the smoothing) and its end corners square; its color reaches under the end, top and bottom insets, and the
     header, content and actions stay inside them. Everything is logical, so right-to-left mirrors it. */
  .sheet {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    inline-size: var(--_width);
    max-inline-size: none;
    margin: 0;
    border: 0;
    /* SSH-20: the on-screen keyboard (--_keyboard, the part of the sheet it covers) lifts the actions above it. */
    padding-block: var(--_inset-top) max(var(--_inset-bottom), var(--_keyboard, 0px));
    padding-inline: 0 var(--_inset-end);
    overflow: hidden;
    background: var(--_bg);
    box-shadow: var(--_elevation);
    /* SSH-10: the content color, handed down as the inherited color. */
    color: ${t('content-color')};
    text-align: start;
    outline: none;
    --tanrei-corner-radius: var(--_shape);
    --tanrei-corner-pill: var(--_shape-pill);
  }
  .sheet[data-tanrei-shape] {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }
  /* SSH-7: the start edge, outline.width of the variant's outline color, following the start corners. */
  .edge {
    position: absolute;
    z-index: 1;
    inset: 0;
    border-inline-start: ${t('outline-width')} solid var(--_edge);
    border-radius: inherit;
    corner-shape: inherit;
    pointer-events: none;
  }

  /* SSH-8, SSH-9, SSH-14: the header — a row at least header.height high, the headline from container.padding-inline
     after the start edge and, while closable, the close button ending header.padding-inline-end before the end edge,
     header.gap after the headline, both centred in the row; it grows with a headline that wraps. */
  .header {
    box-sizing: border-box;
    position: relative;
    z-index: 1;
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('header-gap')};
    min-block-size: ${t('header-height')};
    padding-inline: ${t('container-padding-inline')};
  }
  .header.closable {
    padding-inline-end: ${t('header-padding-inline-end')};
  }
  .headline {
    flex: 1 1 auto;
    min-inline-size: 0;
    margin: 0;
    font: ${t('headline-typescale-font')};
    letter-spacing: ${t('headline-typescale-letter-spacing')};
    color: ${t('headline-color')};
    overflow-wrap: break-word;
  }
  /* SSH-9: the headline's letter-spacing follows its script (src/styles/script-tracking.ts). */
  ${unsafeCSS(scriptTracking('.headline', String(t('headline-typescale-letter-spacing')), { shadow: true }))}
  /* SSH-22: the headline is its own run, in the direction of its first strong character, so a left-to-right name keeps
     its order in a right-to-left sheet; its lines are still aligned to the layout's start edge
     (src/styles/product-text.ts). */
  ${productText('.headline', { align: 'start' })}
  /* SSH-5: the icon-only Button, placed and never restyled (its variant is given, SSH-17's channel). */
  .close {
    flex: none;
    margin-inline-start: auto;
  }

  /* SSH-8, SSH-10: the content — inset by container.padding-inline from the start and end edges, directly below the
     header (or container.padding-block below the top without one), container.padding-block above the bottom without
     actions; in the body role; scrolling between the header and the actions. */
  .middle {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
  }
  .content {
    box-sizing: border-box;
    position: relative;
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-inline: ${t('container-padding-inline')};
    font: var(--tanrei-sys-typescale-body-font);
    letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing);
    overflow-wrap: break-word;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
  }
  .content.top {
    padding-block-start: ${t('container-padding-block')};
  }
  .content.bottom {
    padding-block-end: ${t('container-padding-block')};
  }
  .inner {
    display: flow-root;
  }
  /* A scrolling content is a Tab stop (SSH-10); its keyboard focus is drawn inside it, which the panel would clip — by
     a box over it that does not scroll with what it holds (a box of the content's own would move away with it). */
  .content:focus-visible {
    outline: none;
  }
  .focus {
    position: absolute;
    inset: 0;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
    pointer-events: none;
  }
  ${focusRing((focus) => `.content${focus} ~ .focus`, { inside: true })}

  /* SSH-11, SSH-19: the dividers, divider.width hairlines in divider.color across the sheet's full width. */
  .divider {
    block-size: ${t('divider-width')};
    background: ${t('divider-color')};
  }
  /* SSH-19: below the header (over the content's top edge). SSH-23, always: whenever the header is drawn, as the divider
     above the actions is. */
  ${dividerVisibilityHost(`${PREFIX}-divider-visibility`)}
  .divider.below-header {
    position: absolute;
    inset-block-start: 100%;
    inset-inline: 0;
    pointer-events: none;
  }
  /* SSH-23, scroll: only while the content is scrolled from its top; shown and hidden at once. */
  ${whenScroll(
    '.header',
    (header) => `
  ${header} .divider.below-header {
    visibility: hidden;
  }
  ${header}.scrolled .divider.below-header {
    visibility: visible;
  }`,
  )}

  /* SSH-11: while the sheet has an action, the divider above the actions (whether or not the content scrolls), then the
     actions container.padding-inline from each side, actions.gap apart, actions.padding-block above and below: fill, a
     full-width Button group, the actions sharing the row equally or each as wide as the column; the order is the slots'
     (dismissive, unflagged, confirming in a row; confirming on top of a column), so focus and reading follow it; a row
     starts at the right in right-to-left (BGR-8). */
  .footer {
    flex: none;
  }
  .footer[hidden] {
    display: none;
  }
  ${actionBoxStyles('.actions', `${PREFIX}-actions-gap`)}
  .actions {
    box-sizing: border-box;
    padding: ${t('actions-padding-block')} ${t('container-padding-inline')};
  }
  /* SSH-11, start (a system choice): at their own widths, the row aligned to the start edge; a column as wide as its
     widest action, aligned to the start. */
  ${whenChosen(
    `${PREFIX}-actions-arrangement`,
    '.sheet',
    'arrangement',
    'start',
    (sheet) => `
  ${sheet} .actions {
    justify-content: flex-start;
  }
  ${sheet} .actions ::slotted(*) {
    flex: none;
  }
  ${sheet} .actions.stacked {
    inline-size: max-content;
    max-inline-size: 100%;
  }`,
  )}

  /* SSH-1: a standard sheet is a layout region at the end of the product's row: its width in the layout while open and
     none while closed, sliding in or out at the end edge (the panel is anchored at the width's start, so it leaves past
     the end) while the content beside it resizes. Closed, it is hidden from assistive technology and focus (inert, then
     visibility, kept until the slide ends). Only the end side is clipped, so an elevation still shows toward the
     content. */
  :host(:not([variant='modal'])) {
    position: relative;
    flex: none;
    block-size: 100%;
    inline-size: var(--_width);
    clip-path: inset(-${unsafeCSS(FAR)} 0 -${unsafeCSS(FAR)} -${unsafeCSS(FAR)});
    transition:
      inline-size ${unsafeCSS(EXIT)},
      visibility 0s linear ${t('motion-exit-duration')};
  }
  :host(:not([variant='modal']):dir(rtl)) {
    clip-path: inset(-${unsafeCSS(FAR)} -${unsafeCSS(FAR)} -${unsafeCSS(FAR)} 0);
  }
  :host(:not([variant='modal'])[open]) {
    transition:
      inline-size ${unsafeCSS(ENTER)},
      visibility 0s;
  }
  :host(:not([variant='modal']):not([open])) {
    inline-size: 0;
    visibility: hidden;
  }
  .sheet.standard {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    block-size: 100%;
  }

  /* SSH-2, SSH-7: a modal sheet is a native modal <dialog> in the top layer at the window's end edge, its full height,
     never wider than the window less sys.target.touch (a strip of scrim stays pressable), over ::backdrop (the scrim).
     It slides in from the end edge over the enter motion and out to it over the exit motion, from wherever it is (a
     drag's offset is --_drag); the scrim fades with it. */
  dialog.sheet {
    position: fixed;
    inset-block: 0;
    inset-inline: auto 0;
    inline-size: min(var(--_width), calc(100% - var(--tanrei-sys-target-touch)));
    block-size: 100%;
    max-block-size: none;
    translate: var(--_drag, 0px) 0;
    touch-action: pan-y;
    transition-property: translate, opacity, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  dialog.sheet:not([open]) {
    display: none;
    translate: var(--_away) 0;
  }
  dialog.sheet[open] {
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog.sheet[open] {
      translate: var(--_away) 0;
    }
  }
  dialog.sheet::backdrop {
    background: ${t('scrim-color')};
    backdrop-filter: blur(${t('scrim-blur')});
    opacity: 0;
    transition-property: opacity, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  dialog.sheet[open]::backdrop {
    opacity: 1;
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog.sheet[open]::backdrop {
      opacity: 0;
    }
  }
  /* SSH-4: while the sheet follows a drag, nothing transitions; mounted open, it appears in place. */
  dialog.sheet.dragging {
    transition: none;
    user-select: none;
    -webkit-user-select: none;
  }
  dialog.sheet.instant,
  dialog.sheet.instant::backdrop {
    transition: none;
  }

  /* SSH-1, SSH-2, SSH-4: where motion is reduced, a standard sheet opens and closes at once, and a modal one fades in and
     out in place without sliding (from wherever a drag left it); a released drag goes back at once. */
  @media (prefers-reduced-motion: reduce) {
    :host(:not([variant='modal'])),
    :host(:not([variant='modal'])[open]) {
      transition-duration: 0s;
      transition-delay: 0s;
    }
    dialog.sheet {
      transition-property: opacity, display, overlay;
    }
    dialog.sheet:not([open]) {
      translate: var(--_drag, 0px) 0;
      opacity: 0;
    }
    @starting-style {
      dialog.sheet[open] {
        translate: 0px 0;
        opacity: 0;
      }
    }
  }

  ${shape}

  @media (forced-colors: active) {
    .edge {
      border-inline-start-color: CanvasText;
    }
    .divider {
      background: CanvasText;
    }
  }
`;
