import { css, unsafeCSS } from 'lit';
import {
  actionBoxStyles,
  anchoredSurfaceStyles,
  arrowOutlineStyles,
  arrowStyles,
  compactProbeStyles,
  cornerRadius,
  dividerVisibilityHost,
  focusRing,
  quietFocus,
  shape,
  sheetLookStyles,
  whenChosen,
  whenScroll,
} from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { scriptTracking } from '../../styles/script-tracking.js';

// Every visual value is a token (tokens/comp/popover.tokens.json). The popover paints one container — it has no
// variants and answers no state of its own (POP-6) — and lays out a header, the content and the actions in it. Its
// close button is an icon-only Button and its actions are Tanrei Buttons, each reading its own tokens in the variant
// the popover gives it while it sets none (POP-13, POP-16). Where the surface stands, how it is limited to the window
// and how it opens and closes is the shared anchored surface (src/primitives/anchored.ts); the arrow is the shared one
// (src/primitives/arrow.ts).
export const PREFIX = '--tanrei-comp-popover';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** `comp.popover.arrow.visible`: a choice's name. The first is what an unknown name is. */
export const CHOICE = ['off', 'on'] as const;
/** POP-10: whether an arrow is asked for, as the host carries it: its `arrow` attribute's, or — unset — the system's choice. */
export const ARROW_PROPERTY = '--_popover-arrow';
/** POP-15: how the actions sit (`dev.tanrei.enum`): the first is the fallback. */
export const ARRANGEMENTS = ['fill', 'end'] as const;

/** The most the container may be now: what the placement allows (the window less its margins, or the room its side leaves). */
const MAX_INLINE = 'var(--_anchored-max-inline, 100vw)';
const MAX_BLOCK = 'var(--_anchored-max-block, 100vh)';

export const styles = css`
  /* POP-27: closed, it takes no room in the layout — the element has no box of its own, and its surface is in the top
     layer while it is shown. */
  :host {
    display: contents;
    /* POP-10: the system's choice (its NAME, as the cascade gives it here)… */
    ${unsafeCSS(ARROW_PROPERTY)}: ${t('arrow-visible')};
  }
  /* …unless the popover says so itself: the attribute (true), or ="false". */
  :host([arrow]) {
    ${unsafeCSS(ARROW_PROPERTY)}: on;
  }
  :host([arrow='false' i]) {
    ${unsafeCSS(ARROW_PROPERTY)}: off;
  }

  /* POP-1, POP-5, POP-26, POP-27: the placed box and its motion. */
  ${anchoredSurfaceStyles({
    surface: '.surface',
    motion: '.motion',
    offset: T('offset'),
    margin: T('window-margin'),
    arrow: { width: T('arrow-width'), height: T('arrow-height'), inset: T('arrow-inset') },
    enter: { duration: T('motion-open-duration'), easing: T('motion-open-easing') },
    exit: { duration: T('motion-close-duration'), easing: T('motion-close-easing') },
  })}

  /* POP-6, POP-7, POP-8: the container — its color, its elevation and its corners (eased by the smoothing); as wide as
     its widest part between its least and greatest width, never wider than the window allows (it narrows below the
     least width where the window asks); as tall as its parts, up to its greatest height and the room its side leaves.
     It answers no pointer and no press itself. POP-14: the content color, handed down as the inherited color. */
  .container {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: column;
    /* --_actions-row: the width of the actions in one row at their own widths, as the script measured it (POP-7). */
    min-inline-size: min(max(${t('container-min-width')}, var(--_actions-row, 0px)), ${t('container-max-width')}, ${unsafeCSS(MAX_INLINE)});
    max-inline-size: min(${t('container-max-width')}, ${unsafeCSS(MAX_INLINE)});
    max-block-size: min(${t('container-max-height')}, ${unsafeCSS(MAX_BLOCK)});
    background: ${t('container-color')};
    box-shadow: ${t('container-elevation')};
    color: ${t('content-color')};
    text-align: start;
    outline: none;
    ${unsafeCSS(cornerRadius('--tanrei-comp-popover-container-shape'))}
  }
  /* POP-7, width anchor: as wide as the anchor, at least the least width, the greatest width not applying. */
  :host([width='anchor']) .container {
    inline-size: var(--_anchored-anchor-inline, auto);
    min-inline-size: min(${t('container-min-width')}, ${unsafeCSS(MAX_INLINE)});
    max-inline-size: ${unsafeCSS(MAX_INLINE)};
  }
  /* POP-19: the container takes focus when the popover opens; its indicator shows only for the keyboard. */
  ${focusRing((focus) => `.container${focus}`)}
  ${quietFocus('.container')}

  /* POP-6: the header, the content and the actions are clipped to the container's shape. (A box of its own, so that
     the container's focus indicator, drawn outside it, is not.) */
  .clip {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
    overflow: hidden;
    outline: none;
    ${unsafeCSS(cornerRadius('--tanrei-comp-popover-container-shape'))}
  }
  /* POP-8: where the header and the actions alone leave no room for the content, everything scrolls together. */
  .clip.crowded {
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .clip.crowded > *,
  .clip.crowded .content {
    flex: none;
  }
  .clip.crowded .content {
    overflow: visible;
  }

  /* POP-9, POP-11: the header — one row inside the container's paddings: the headline, taking the width the close
     button leaves, and the close button at the row's end, header.gap after the headline, both on the row's first line.
     It grows with a headline that wraps and stays in place while the content scrolls. */
  .header {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex: none;
    align-items: flex-start;
    gap: ${t('header-gap')};
    padding-block-start: ${t('container-padding-block')};
    padding-inline: ${t('container-padding-inline')};
    /* The row's first line is the headline's: the close button is centred on a line of this height. */
    font: ${t('headline-typescale-font')};
  }
  /* A header with nothing below it ends the container. */
  .header.last {
    padding-block-end: ${t('container-padding-block')};
  }
  /* POP-12: the headline, wrapping rather than truncating. */
  .headline {
    flex: 1 1 auto;
    min-inline-size: 0;
    margin: 0;
    font: ${t('headline-typescale-font')};
    letter-spacing: ${t('headline-typescale-letter-spacing')};
    color: ${t('headline-color')};
    overflow-wrap: break-word;
  }
  /* POP-12: the headline's letter-spacing follows its script (src/styles/script-tracking.ts). */
  ${unsafeCSS(scriptTracking('.headline', String(t('headline-typescale-letter-spacing')), { shadow: true }))}
  /* POP-11: beside a close button taller than its line, the headline's first line is centred on the button. */
  .header.closable .headline {
    padding-block: max(0px, calc((var(--tanrei-comp-button-container-height-small) - 1lh) / 2));
  }
  /* POP-35: the headline is its own run, in the direction of its first strong character, so a left-to-right name keeps
     its order in a right-to-left popover; its lines are still aligned to the layout's start edge
     (src/styles/product-text.ts). */
  ${productText('.headline', { align: 'start' })}
  /* POP-13: the icon-only Button, placed and never restyled (its variant is given through the Button's own channel). */
  .close-box {
    display: flex;
    flex: none;
    align-items: center;
    min-block-size: 1lh;
    margin-inline-start: auto;
  }

  /* POP-9, POP-14: the content — inset by the container's paddings, container.gap below the header (or the block
     padding below the top edge without one), the block padding above the bottom edge without actions; plain text in
     the body role; scrolling between the header and the actions (POP-8). */
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
    padding-block-start: ${t('container-gap')};
    padding-inline: ${t('container-padding-inline')};
    font: var(--tanrei-sys-typescale-body-font);
    letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing);
    overflow-wrap: break-word;
    outline: none;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
  }
  .content.top {
    padding-block-start: ${t('container-padding-block')};
  }
  .content.bottom {
    padding-block-end: ${t('container-padding-block')};
  }
  .middle.empty {
    display: none;
  }
  /* POP-9, inset false: the content reaches the container's start and end edges, and its top and bottom edges where no
     header or no action stands there; the header and the actions keep their insets. */
  :host([no-inset]) .content {
    padding-inline: 0;
  }
  :host([no-inset]) .content.top {
    padding-block-start: 0;
  }
  :host([no-inset]) .content.bottom {
    padding-block-end: 0;
  }
  .inner {
    display: flow-root;
  }
  /* A content that scrolls is a Tab stop (POP-8); its keyboard focus is drawn inside it, which the container clips — by
     a box over it that does not scroll with what it holds (a box of the scrolling part's own would move away with it):
     over the content, square; over everything where everything scrolls together, of the container's shape. */
  .focus {
    position: absolute;
    inset: 0;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
    pointer-events: none;
  }
  .focus.whole {
    ${unsafeCSS(cornerRadius('--tanrei-comp-popover-container-shape'))}
  }
  ${focusRing((focus) => `.content${focus} ~ .focus`, { inside: true })}
  ${focusRing((focus) => `.clip.crowded${focus} ~ .focus`, { inside: true })}

  /* POP-8: the dividers, divider.width hairlines in divider.color across the container, below the header and above the
     actions while the content scrolls. They take no room, so they show and hide at once and move nothing. POP-38, always:
     both for as long as the content scrolls, at its top included. */
  ${dividerVisibilityHost(`${PREFIX}-divider-visibility`)}
  .divider {
    position: absolute;
    inset-inline: 0;
    block-size: ${t('divider-width')};
    background: ${t('divider-color')};
    visibility: hidden;
    pointer-events: none;
  }
  .divider.below-header {
    inset-block-start: 100%;
  }
  .divider.above-actions {
    inset-block-end: 100%;
  }
  .clip[data-scrolls] .divider {
    visibility: visible;
  }
  /* POP-38, scroll: below the header while the content is scrolled away from its top, above the actions while more of it
     lies below. */
  ${whenScroll(
    '.clip',
    (clip) => `
  ${clip}[data-scrolls] .divider {
    visibility: hidden;
  }
  ${clip}[data-scrolled] .divider.below-header,
  ${clip}[data-more] .divider.above-actions {
    visibility: visible;
  }`,
  )}

  /* POP-9, POP-15: the actions — actions.margin-block-start below the content (or the header), the container's paddings
     at the sides and below, actions.gap apart: fill, a full-width Button group, the actions sharing the row equally or
     each as wide as the column; the order is the slots' (dismissive, unflagged, confirming in a row; confirming on top
     of a column), so focus and reading follow it; a row starts at the right in right-to-left (BGR-8). */
  .footer {
    position: relative;
    flex: none;
  }
  .footer[hidden] {
    display: none;
  }
  ${actionBoxStyles('.actions', `${PREFIX}-actions-gap`)}
  .actions {
    box-sizing: border-box;
    padding: ${t('actions-margin-block-start')} ${t('container-padding-inline')} ${t('container-padding-block')};
  }
  /* POP-15, end (a system choice): at their own widths, the row aligned to the end edge; a column as wide as its widest
     action, aligned to the end. */
  ${whenChosen(
    `${PREFIX}-actions-arrangement`,
    '.container',
    'arrangement',
    'end',
    (container) => `
  ${container} .actions {
    justify-content: flex-end;
  }
  ${container} .actions ::slotted(*) {
    flex: none;
  }
  ${container} .actions.stacked {
    inline-size: max-content;
    max-inline-size: 100%;
    margin-inline-start: auto;
  }`,
  )}

  /* POP-10: the arrow — a triangle on the container's edge that faces the anchor, in the container's color, its tip
     where the placement says. The elevation is drawn round the container and the arrow as one shape. */
  ${arrowStyles({ surface: '.surface', box: '.container', width: T('arrow-width'), height: T('arrow-height'), fill: T('container-color'), elevation: T('container-elevation') })}

  /* POP-39: the resolved compact.window-width, which the script matches the window against. */
  ${compactProbeStyles('.probe', `${PREFIX}-compact-window-width`)}

  /* POP-39, POP-40, POP-41: in a compact window, the bottom sheet's appearance — docked to the window's bottom edge (over
     the keyboard), as wide as the window up to the bottom sheet's greatest width, its color, elevation and top corners,
     square at the bottom — over the bottom sheet's scrim, sliding up and down with its motion (src/primitives/
     compact-sheet.ts). Its parts keep their own tokens and layout; none of the browser's dialog box. (The host's
     selector outweighs the anchored container's width rules, which a sheet ignores.) */
  :host dialog.container.sheet {
    border: 0;
    padding: 0;
    overflow: visible;
    color: ${t('content-color')};
  }
  ${sheetLookStyles({ sheet: ':host dialog.container.sheet' })}
  :host dialog.container.sheet:not([open]) {
    display: none;
  }
  :host dialog.container.sheet[open] {
    display: flex;
  }
  :host dialog.container.sheet.instant,
  :host dialog.container.sheet.instant::backdrop {
    transition: none;
  }
  .container.sheet .clip,
  .container.sheet .focus.whole {
    ${unsafeCSS(cornerRadius('--tanrei-comp-bottom-sheet-container-shape'))}
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }

  /* POP-5: the least width, read by the placement through a real property of an element that draws nothing. */
  .shade {
    scroll-margin-block-start: ${t('container-min-width')};
  }

  /* POP-6: corner smoothing on the container (data-tanrei-shape). */
  ${shape}

  /* POP-32: forced colors remove the shadow and may give the container the page's color: an edge sys.border.hairline
     wide in the text color round the container, continued round the arrow as one outline; the headline and plain text
     take the text color. */
  @media (forced-colors: active) {
    .container {
      border: var(--tanrei-sys-border-hairline) solid CanvasText;
      color: CanvasText;
    }
    .headline {
      color: CanvasText;
    }
    .divider {
      background: CanvasText;
    }
    .surface {
      filter: none !important;
    }
  }
  ${arrowOutlineStyles({ surface: '.surface', edge: 'calc(var(--tanrei-sys-border-hairline) * 1.5)' })}
`;
