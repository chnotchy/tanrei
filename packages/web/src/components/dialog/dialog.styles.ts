import { css, unsafeCSS } from 'lit';
import { actionBoxStyles, focusRing, iconGlyph, whenChosen as chosen } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';
import { scriptTracking } from '../../styles/script-tracking.js';

// Every visual value is a token (tokens/comp/dialog.tokens.json). The dialog answers no state; its actions are Tanrei
// Buttons with their own tokens, which it places (and, while they set none, gives its variant, DLG-20) and never restyles.
const PREFIX = '--tanrei-comp-dialog';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The window less the margin on each side and the safe area (and, below, the on-screen keyboard). */
const INLINE_ROOM = `calc(100% - 2 * ${T('container-margin')} - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))`;
const BLOCK_ROOM = `calc(100% - 2 * ${T('container-margin')} - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`;

/** A choice of kind of the dialog's, drawn on the `<dialog>` (src/primitives/actions.ts). */
const whenChosen = (token: string, attribute: string, value: string, rules: (dialog: string) => string) => chosen(`${PREFIX}-${token}`, 'dialog', attribute, value, rules);

export const styles = css`
  :host {
    display: contents;
  }

  /* DLG-17: the resolved compact.window-width, which the script matches the window against. */
  .probe {
    position: fixed;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: ${t('compact-window-width')};
    block-size: 0;
    visibility: hidden;
    pointer-events: none;
  }

  /* DLG-1, DLG-7: a native modal <dialog> in the top layer, centred in the window above the keyboard, as wide as its
     widest part (the actions' row at their own widths among them, --_row) between its bounds and never wider or taller
     than the window less the margins; its color, elevation and corners (eased by the smoothing). None of the browser's
     dialog box. */
  dialog {
    box-sizing: border-box;
    position: fixed;
    inset: 0 0 var(--_keyboard, 0px) 0;
    margin: auto;
    inline-size: fit-content;
    min-inline-size: min(max(${t('container-min-width')}, calc(var(--_row, 0px) + 2 * ${t('container-padding')})), ${t('container-max-width')}, ${unsafeCSS(INLINE_ROOM)});
    max-inline-size: min(${t('container-max-width')}, ${unsafeCSS(INLINE_ROOM)});
    block-size: fit-content;
    max-block-size: ${unsafeCSS(BLOCK_ROOM)};
    border: 0;
    padding: ${t('container-padding')};
    overflow: visible;
    flex-direction: column;
    background: ${t('container-color')};
    box-shadow: ${t('container-elevation')};
    ${unsafeCSS(cornerRadius('--tanrei-comp-dialog-container-shape'))}
    color: ${t('content-color')};
    text-align: start;
    outline: none;
    /* DLG-13, DLG-18: out, it fades over the exit motion — kept in the top layer and displayed until it has. */
    opacity: 0;
    transition-property: opacity, scale, translate, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  /* DLG-17: a compact window: at the bottom of the safe area, the margin above its bottom edge (or the keyboard) and from
     its sides, as wide as the window less those margins up to max-width, centred between the sides; all four corners
     stay the container's. */
  dialog.compact {
    inline-size: min(${t('container-max-width')}, ${unsafeCSS(INLINE_ROOM)});
    min-inline-size: 0;
    margin-block: auto calc(${t('container-margin')} + env(safe-area-inset-bottom, 0px));
  }
  /* DLG-18: out at the bottom, it also sinks by enter-offset. */
  dialog.compact:not([open]) {
    translate: 0 ${t('motion-enter-offset')};
  }
  dialog[open] {
    display: flex;
    opacity: 1;
    /* DLG-13: in, centred, it fades in and grows about its centre from enter-scale over the enter motion; DLG-18: at the
       bottom it rises by enter-offset instead, without growing. */
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog[open] {
      opacity: 0;
      scale: ${t('motion-enter-scale')};
    }
    dialog.compact[open] {
      scale: none;
      translate: 0 ${t('motion-enter-offset')};
    }
  }
  /* DLG-1: the scrim, over the whole window behind the dialog, fading with it. */
  dialog::backdrop {
    background: ${t('scrim-color')};
    opacity: 0;
    transition-property: opacity, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  dialog[open]::backdrop {
    opacity: 1;
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog[open]::backdrop {
      opacity: 0;
    }
  }
  /* DLG-13, DLG-18: where motion is reduced it only fades. */
  @media (prefers-reduced-motion: reduce) {
    dialog {
      transition-property: opacity, display, overlay;
    }
  }

  /* DLG-8: the parts, container.gap apart, the empty ones left out; the actions actions.margin-block-start below. */
  .scroll {
    display: flex;
    flex-direction: column;
    gap: ${t('container-gap')};
  }
  .head {
    display: flex;
    flex: none;
    align-items: flex-start;
    gap: ${t('header-gap')};
  }
  .middle {
    position: relative;
    display: flex;
    flex: 0 1 auto;
    flex-direction: column;
    min-block-size: 0;
  }
  .head:not([hidden]) + .middle {
    margin-block-start: ${t('container-gap')};
  }
  /* An empty part is not drawn, and takes no gap. */
  [hidden] {
    display: none !important;
  }
  /* DLG-11: the supporting text and the content scroll between the header and the actions. */
  .scroll {
    position: relative;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    /* The scrolled part runs to the container's edges, so its dividers cross the whole container. */
    margin-inline: calc(${t('container-padding')} * -1);
    padding-inline: ${t('container-padding')};
  }

  /* DLG-10: the actions as a full-width button group (fill): a row the actions share equally — each Button's container
     stretched across its share, its label centred — or, when a label does not fit its share, a column of actions as
     wide as the container. The order is the slots' (dismissive, neutral, confirming in a row; confirming first in a
     column), so focus and reading follow it; a row starts at the right in right-to-left (BGR-8). */
  ${actionBoxStyles('.actions', `${PREFIX}-actions-gap`)}
  .actions {
    margin-block-start: ${t('actions-margin-block-start')};
  }
  .head[hidden] + .middle[hidden] + .actions {
    margin-block-start: 0;
  }
  /* DLG-10, end: at their own widths, the row aligned to the end; a column as wide as its widest action, at the end. */
  ${whenChosen(
    'actions-arrangement',
    'arrangement',
    'end',
    (dialog) => `
  ${dialog} .actions {
    justify-content: flex-end;
  }
  ${dialog} .actions ::slotted(*) {
    flex: none;
  }
  ${dialog} .actions.stacked {
    align-self: flex-end;
    inline-size: max-content;
    max-inline-size: 100%;
  }`,
  )}

  /* DLG-11: a hairline below the header while the scrolled part is not at its top, and above the actions while more of
     it lies below; none while everything fits. */
  .middle::before,
  .middle::after {
    content: '';
    position: absolute;
    inset-inline: calc(${t('container-padding')} * -1);
    block-size: ${t('divider-width')};
    background: ${t('divider-color')};
    visibility: hidden;
    pointer-events: none;
  }
  .middle::before {
    inset-block-start: 0;
  }
  .middle::after {
    inset-block-end: 0;
  }
  .middle.above::before,
  .middle.below::after {
    visibility: visible;
  }

  /* DLG-12: no room left for the scrolled part: everything scrolls together. */
  dialog.whole {
    overflow-y: auto;
  }
  dialog.whole .middle {
    flex: none;
  }
  dialog.whole .scroll {
    overflow: visible;
  }
  dialog.whole .middle::before,
  dialog.whole .middle::after {
    visibility: hidden;
  }

  /* DLG-8: the headline and the supporting text in their roles and colors, the headline wrapping; the content gets the
     content color and, for plain text, the body role. */
  .headline {
    flex: 1 1 auto;
    min-inline-size: 0;
    margin: 0;
    font: ${t('headline-typescale-font')};
    letter-spacing: ${t('headline-typescale-letter-spacing')};
    color: ${t('headline-color')};
    overflow-wrap: break-word;
  }
  /* DLG-8: the headline's letter-spacing follows its script (src/styles/script-tracking.ts). */
  ${unsafeCSS(scriptTracking('.headline', String(t('headline-typescale-letter-spacing')), { shadow: true }))}
  .supporting {
    margin: 0;
    font: ${t('supporting-text-typescale-font')};
    letter-spacing: ${t('supporting-text-typescale-letter-spacing')};
    color: ${t('supporting-text-color')};
    overflow-wrap: break-word;
  }
  .content {
    font: var(--tanrei-sys-typescale-body-font);
    letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing);
    color: ${t('content-color')};
    overflow-wrap: break-word;
  }

  /* DLG-23: the headline and the supporting text are each a run of their own, in the direction of their first strong
     character — a left-to-right name or a number with its unit keeps its order in a right-to-left dialog — and are still
     aligned to the layout's start edge (DLG-16), or centred under an icon above (src/styles/product-text.ts). */
  ${productText(':is(.headline, .supporting)', { align: 'start' })}

  /* DLG-9: the icon, in its color at its size with the unselected family and fill. Inline (the default): at the header's
     start, header.gap before the headline, centred on the headline's first line (a box one headline line high). DLG-22:
     iconGlyph() mirrors the slotted glyph GlyphMirrorController marked, in right-to-left, in its own box. */
  ${iconGlyph('.icon', { size: `${PREFIX}-icon-size`, selected: ':not(*)', duration: '--tanrei-sys-motion-duration-short3', easing: '--tanrei-sys-motion-easing-standard' })}
  .icon {
    color: ${t('icon-color')};
  }
  .icon-line {
    display: flex;
    flex: none;
    align-items: center;
    font: ${t('headline-typescale-font')};
    block-size: 1lh;
  }
  /* DLG-9, above: the icon above the headline, container.gap apart, both centred — only while there is an icon. */
  ${whenChosen(
    'icon-placement',
    'icon-placement',
    'above',
    (dialog) => `
  ${dialog} .head.with-icon {
    flex-direction: column;
    align-items: center;
    gap: ${T('container-gap')};
  }
  ${dialog} .head.with-icon .icon-line {
    block-size: auto;
  }
  ${dialog} .head.with-icon .headline {
    align-self: stretch;
    text-align: center;
  }`,
  )}

  /* A scrolling part is a Tab stop: its keyboard focus is drawn inside it, which the dialog would otherwise clip — by
     a box over it that does not scroll with what it holds (a box of the scrolling part's own would move away with the
     content). */
  .scroll:focus-visible {
    outline: none;
  }
  .focus {
    position: absolute;
    inset-block: 0;
    inset-inline: calc(${t('container-padding')} * -1);
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
    pointer-events: none;
  }
  ${focusRing((focus) => `.scroll${focus} ~ .focus`, { inside: true })}

  /* DLG-7: corner smoothing on the container (data-tanrei-shape). */
  ${shape}

  @media (forced-colors: active) {
    dialog {
      border: 1px solid CanvasText;
    }
    .middle::before,
    .middle::after {
      background: CanvasText;
    }
  }
`;
