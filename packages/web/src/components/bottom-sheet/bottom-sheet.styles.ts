import { css, unsafeCSS } from 'lit';
import { dividerVisibilityHost, focusRing, pressHold, rippleStyles, stateRules, whenScroll } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { scriptTracking } from '../../styles/script-tracking.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/bottom-sheet.tokens.json). Both forms read the same container tokens: the
// scrim (a modal sheet's ::backdrop) and the behaviour set them apart. The one pressable part, the drag handle, is the
// `drag-handle` control: its box, grip and state layer per state; its geometry is `handle.*`.
const PREFIX = '--tanrei-comp-bottom-sheet';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/**
 * BSH-6: the area the sheet covers, as a length at the place it is used: the height of the element's containing block
 * less `top` (the top system inset, for a modal sheet) and the on-screen keyboard. A modal sheet's containing block is the
 * window, a standard sheet's the host, which fills the parent the product placed it in.
 */
const area = (top: string) => `(100% - ${top} - var(--_keyboard, 0px))`;
/** BSH-6: at partial, the partial fraction of the area (never above the full height). */
const partialCap = (of: string) => `min(calc(${of} * ${T('container-partial-fraction')}), max(0px, calc(${of} - ${T('container-margin-block-start')})))`;
/** BSH-6: at full, the area less the top margin. */
const fullCap = (of: string) => `max(0px, calc(${of} - ${T('container-margin-block-start')}))`;

/** The drag handle's colors in every state, as `--_c-h` (box, hovered), `--_g-p` (grip, pressed)… */
const STATES = { '': '-r', hovered: '-h', focused: '-f', pressed: '-p' } as const;
const handleBlock = Object.entries(STATES)
  .flatMap(([state, suffix]) => [
    `  --_c${suffix}: var(${PREFIX}-drag-handle-${state ? `${state}-` : ''}container-color);`,
    `  --_g${suffix}: var(${PREFIX}-drag-handle-${state ? `${state}-` : ''}grip-color);`,
  ])
  .join('\n');
/** Where each state is read (BSH-13): on the interactive handle only (a native button); a handle at rest answers nothing. */
const on = (state: string) => `button.handle${state}`;
const paint = (suffix: string, container = true) => `${container ? `\n    background-color: var(--_c${suffix});` : ''}
    --_g: var(--_g${suffix});`;

const ENTER = `${T('motion-enter-duration')} ${T('motion-enter-easing')}`;

export const styles = css`
  :host {
    display: block;
    --_inset-top: env(safe-area-inset-top, 0px);
    --_inset-bottom: env(safe-area-inset-bottom, 0px);
  }
  :host([hidden]) {
    display: none;
  }

  /* BSH-7: the container — at the bottom edge of the area, as wide as the area but no wider than container.max-width and
     centred, on container.color raised by container.elevation, its top corners rounded by container.shape (eased by the
     smoothing) and its bottom corners square; its color reaches under the bottom inset and its content stays above it. */
  .sheet {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    inline-size: min(100%, ${t('container-max-width')});
    max-inline-size: none;
    min-block-size: 0;
    margin: 0 auto;
    border: 0;
    padding: 0 0 var(--_inset-bottom);
    overflow: visible;
    background: ${t('container-color')};
    box-shadow: ${t('container-elevation')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    /* BSH-8: the content color, handed down as the inherited color. */
    color: ${t('content-color')};
    text-align: start;
    outline: none;
    touch-action: none;
    translate: 0 var(--_drag, 0px);
    --_row: 0px;
  }
  .sheet[data-tanrei-shape] {
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }
  /* BSH-7: over the keyboard, nothing is under the bottom inset. */
  .sheet.keyboard {
    padding-block-end: 0;
  }
  /* BSH-6: as tall as the handle's row and the content, but no taller than its detent allows. */
  .sheet[data-detent='partial'] {
    max-block-size: ${unsafeCSS(partialCap(`calc${area('var(--_area-top)')}`))};
  }
  .sheet[data-detent='full'] {
    max-block-size: ${unsafeCSS(fullCap(`calc${area('var(--_area-top)')}`))};
  }
  .sheet.dragging {
    user-select: none;
    -webkit-user-select: none;
  }
  /* While the sheet follows a drag, or settles by script (BSH-9), no transition runs on it. */
  .sheet.dragging,
  .sheet.settling,
  .sheet.instant,
  .sheet.instant::backdrop {
    transition: none;
  }

  /* BSH-6: the area, measured by script (which height is lower, whether there are two); drawn nowhere. The caps are the
     same expressions as the sheet's, in the area itself. */
  .area {
    position: fixed;
    inset-inline: 0;
    inset-block: var(--_inset-top) var(--_keyboard, 0px);
    visibility: hidden;
    pointer-events: none;
  }
  .cap {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
  }
  .cap.partial {
    block-size: ${unsafeCSS(partialCap('100%'))};
  }
  .cap.full {
    block-size: ${unsafeCSS(fullCap('100%'))};
  }

  /* BSH-9, BSH-11, BSH-21: the enter motion, which also settles the sheet and moves it between heights, read by script
     through real properties; drawn nowhere. */
  .timing {
    display: none;
    transition-property: none;
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }

  /* BSH-2, BSH-1: a modal sheet is a native modal <dialog> in the top layer, docked to the window's bottom edge (above the
     keyboard) over ::backdrop, the scrim. It slides up from below the bottom edge over the enter motion and down out of
     view over the exit motion; the scrim fades with it. */
  dialog.sheet {
    position: fixed;
    inset-inline: 0;
    inset-block: auto var(--_keyboard, 0px);
    --_area-top: var(--_inset-top);
    transition-property: translate, opacity, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  dialog.sheet:not([open]) {
    display: none;
    translate: 0 100%;
  }
  dialog.sheet[open] {
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog.sheet[open] {
      translate: 0 100%;
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

  /* BSH-4: a standard sheet is a layout region over the bottom of the parent that holds it and the content: the host
     fills that parent (which the product positions) and lets every press reach the content; the sheet is docked to its
     bottom edge, above the keyboard. Closed, it slides down out of view and is hidden (inert, then visibility). */
  :host([variant='standard']) {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  :host([variant='standard']) .area {
    position: absolute;
    inset-block-start: 0;
  }
  .sheet.standard {
    position: absolute;
    inset-inline: 0;
    inset-block-end: var(--_keyboard, 0px);
    pointer-events: auto;
    --_area-top: 0px;
    transition:
      translate ${t('motion-exit-duration')} ${t('motion-exit-easing')},
      opacity ${t('motion-exit-duration')} ${t('motion-exit-easing')},
      visibility 0s linear ${t('motion-exit-duration')};
  }
  :host([open]) .sheet.standard {
    transition:
      translate ${unsafeCSS(ENTER)},
      opacity ${unsafeCSS(ENTER)},
      visibility 0s;
  }
  :host(:not([open])) .sheet.standard {
    translate: 0 100%;
    visibility: hidden;
  }

  /* BSH-1: where motion is reduced the sheet fades in and out in place, without sliding. */
  @media (prefers-reduced-motion: reduce) {
    dialog.sheet:not([open]),
    :host(:not([open])) .sheet.standard {
      translate: 0 var(--_drag, 0px);
      opacity: 0;
    }
    @starting-style {
      dialog.sheet[open] {
        translate: 0 var(--_drag, 0px);
        opacity: 0;
      }
    }
  }

  /* BSH-12: the drag handle's row — the box centred across the sheet, handle.margin-block above and below it; it stays
     in place while the content scrolls, and a drag on it is always the sheet's. */
  .row {
    display: flex;
    flex: none;
    justify-content: center;
    padding-block: ${t('handle-margin-block')};
    touch-action: none;
  }
  .sheet.has-handle {
    --_row: calc(${t('handle-container-height')} + 2 * ${t('handle-margin-block')});
  }
  .handle {
    ${unsafeCSS(handleBlock)}
    all: unset;
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    inline-size: ${t('handle-container-width')};
    block-size: ${t('handle-container-height')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-handle-container-shape`))}
    ${unsafeCSS(paint('-r'))}
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  button.handle {
    cursor: pointer;
  }
  /* BSH-12: the grip, centred in the box; decorative. */
  .grip {
    display: block;
    flex: none;
    inline-size: ${t('handle-grip-width')};
    block-size: ${t('handle-grip-height')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-handle-grip-shape`))}
    background-color: var(--_g);
    pointer-events: none;
    transition: background-color ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  /* BSH-15: the hit area is the handle's whole row across its box, and at least sys.target.pointer (a fine pointer) or
     sys.target.touch (a coarse one) wide and high, without changing the drawn box. */
  button.handle::before {
    content: '';
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    inline-size: max(100%, var(--tanrei-sys-target-pointer));
    block-size: max(calc(100% + 2 * ${t('handle-margin-block')}), var(--tanrei-sys-target-pointer));
    transform: translate(-50%, -50%);
  }
  @media (pointer: coarse) {
    button.handle::before {
      inline-size: max(100%, var(--tanrei-sys-target-touch));
      block-size: max(calc(100% + 2 * ${t('handle-margin-block')}), var(--tanrei-sys-target-touch));
    }
  }
  :host(:dir(rtl)) button.handle::before {
    transform: translate(50%, -50%);
  }

  /* BSH-13, BSH-16, BSH-17: each state paints the handle's box, grip and opacity from that state's tokens; pressed >
     focused > hovered. */
  ${stateRules(on, {
    hovered: `${paint('-h')}
    opacity: ${T('hovered-opacity')};`,
    focused: `${paint('-f')}
    opacity: ${T('focused-opacity')};`,
    pressed: `${paint('-p')}
    opacity: ${T('pressed-opacity')};`,
    pressedContent: `${paint('-p', false)}
    opacity: ${T('pressed-opacity')};`,
    disabled: '',
  })}
  button.handle[data-pressed]:not([data-pressed='none']) .grip {
    transition-duration: 0s;
  }
  /* BSH-17 ripple: grows over motion.feedback-duration, fades over motion.state-duration. */
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  /* BSH-14, BSH-18: the ring (or the glow) around the handle's box, never animated. */
  ${focusRing(on)}
  ${pressHold('.hold')}
  .hold {
    display: none;
  }

  /* BSH-28: the header — below the handle's row (or at the top without one), a row at least header.height high: the
     headline from container.padding after the start edge and, while closable, the close button ending
     header.padding-inline-end before the end edge, header.gap after the headline, both centred in the row; it grows with
     a headline that wraps, stays while the content scrolls, and a drag on it is the sheet's. */
  .header {
    box-sizing: border-box;
    position: relative;
    z-index: 1;
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('header-gap')};
    min-block-size: ${t('header-height')};
    padding-inline: ${t('container-padding')};
    touch-action: none;
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
  /* The headline's letter-spacing follows its script, as every title's does (src/styles/script-tracking.ts); it is its
     own run, in the direction of its first strong character, its lines aligned to the layout's start edge. */
  ${unsafeCSS(scriptTracking('.headline', T('headline-typescale-letter-spacing'), { shadow: true }))}
  ${productText('.headline', { align: 'start' })}
  /* BSH-29: the icon-only Button, placed and never restyled (its variant is given through the Button's channel). */
  .close {
    flex: none;
    margin-inline-start: auto;
  }
  /* BSH-28: the divider below the header, a divider.width hairline in divider.color across the sheet's full width (over
     the content's top edge). always: whenever the header is drawn; scroll: only while the content is scrolled from its
     top. Shown and hidden at once. */
  ${dividerVisibilityHost(`${PREFIX}-divider-visibility`)}
  .divider {
    position: absolute;
    inset-block-start: 100%;
    inset-inline: 0;
    block-size: ${t('divider-width')};
    background: ${t('divider-color')};
    pointer-events: none;
  }
  ${whenScroll(
    '.header',
    (header) => `
  ${header} .divider {
    visibility: hidden;
  }
  ${header}.scrolled .divider {
    visibility: visible;
  }`,
  )}

  /* BSH-8, BSH-10: the content, below the handle's row — inset by container.padding from the start, end and bottom (and
     the top, without a handle) unless flush; clipped to the container's shape; in the body role; scrolling inside the
     container when it is taller than the room the sheet gives it. */
  .middle {
    position: relative;
    display: flex;
    flex: 0 1 auto;
    flex-direction: column;
    min-block-size: 0;
  }
  .content {
    box-sizing: border-box;
    position: relative;
    flex: 0 1 auto;
    min-block-size: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    font: var(--tanrei-sys-typescale-body-font);
    letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing);
    overflow-wrap: break-word;
    touch-action: pan-x;
  }
  .content,
  .focus {
    --tanrei-corner-radius: max(0px, calc(${t('container-shape')} - var(--_row)));
    --tanrei-corner-pill: 0;
  }
  .inner {
    display: flow-root;
  }
  :is(.content, .focus)[data-tanrei-shape] {
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }
  .content.inset {
    padding: 0 ${t('container-padding')} ${t('container-padding')};
  }
  .sheet:not(.has-handle):not(.has-header) .content.inset {
    padding-block-start: ${t('container-padding')};
  }
  /* Below a header the content's top corners meet the header, not the container's. */
  .sheet.has-header :is(.content, .focus) {
    --tanrei-corner-radius: 0px;
  }
  /* BSH-10: a drag on the content is the sheet's until the sheet is at its full height, then the content's to scroll —
     up at once; down once it is at its top (read by script at each scroll). */
  .content[data-touch='pan-down'] {
    touch-action: pan-x pan-down;
  }
  .content[data-touch='scroll'] {
    touch-action: auto;
  }
  /* A scrolling content is a Tab stop (BSH-10); its keyboard focus is drawn inside it, which the container would clip —
     by a box over it, of its shape, that does not scroll with what it holds (a box of the content's own would move away
     with it). */
  .content:focus-visible {
    outline: none;
  }
  .focus {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  ${focusRing((focus) => `.content${focus} ~ .focus`, { inside: true })}

  /* BSH-18: corner smoothing on the container and the handle's box (data-tanrei-shape). */
  ${shape}

  @media (prefers-reduced-motion: reduce) {
    .handle,
    .grip {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .sheet {
      border: 1px solid CanvasText;
      border-block-end: 0;
    }
    .grip {
      forced-color-adjust: none;
      background-color: CanvasText;
    }
    .divider {
      background: CanvasText;
    }
  }
`;
