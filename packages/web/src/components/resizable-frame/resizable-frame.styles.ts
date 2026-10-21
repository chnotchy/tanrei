import { css, unsafeCSS } from 'lit';
import { heldShape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/resizable-frame.tokens.json); the handles are `<tanrei-handle>`, drawn by
// their own tokens. The element writes its sizes as custom properties on the box (`--_rsf-*`: the width and the height
// the frame gives, its least and its greatest), named for this element alone, since the content inherits them; it
// writes no token and reads none of the Handle's.
//
//   .room   the room the layout gives: the host's whole content box. The frame stands at its start, or at its end
//           while it is resized from its start edge alone (RSF-1).
//   .frame  a grid of the box and, while outlined, the tracks the handles stand in beyond its edges (RSF-3).
//   .box    the container: the content's room, clipped to its corners and edged while outlined (RSF-2).

/** The variants and the handles the component defines (RSF-16: anything else is drawn as outlined, or not drawn). */
export const VARIANTS = ['outlined', 'plain'] as const;
export const HANDLES = ['start', 'end', 'bottom', 'bottom-end'] as const;
export const SIZE_INDICATORS = ['none', 'active', 'always'] as const;

const PREFIX = '--tanrei-comp-resizable-frame';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

export const styles = css`
  :host {
    display: block;
    position: relative;
    box-sizing: border-box;
  }

  /* RSF-1: the room the layout gives. A height the layout gives (a row that stretches its items, a grid's cell) is
     passed down; where it gives none, the height is the content's. */
  .room {
    display: flex;
    justify-content: flex-start;
    align-items: stretch;
    box-sizing: border-box;
    inline-size: 100%;
    block-size: 100%;
    min-inline-size: 0;
  }
  .room.at-end {
    justify-content: flex-end;
  }

  /* RSF-3: the box and the handles' tracks. Outlined, each handle has a track of its own beyond the box's edge,
     handle.gap away, so it covers none of the content; plain, the handles stand in the box's own cell, centred on its
     edges, and take no room. */
  /* The z-indexes of the handles and the indicator order them within the frame only, never against the page. */
  .frame {
    isolation: isolate;
    display: grid;
    flex: 0 1 auto;
    min-inline-size: 0;
    max-inline-size: 100%;
    gap: ${t('handle-gap')};
  }
  .frame.fills {
    flex: 1 1 auto;
  }
  .frame.plain {
    gap: 0;
  }

  /* RSF-1, RSF-2: the box, as wide and as tall as the frame gives (the element writes the lengths), with no fill and no
     elevation of its own. A width of null fills the room; a height of null takes the room's or the content's. */
  .box {
    grid-area: box;
    position: relative;
    box-sizing: border-box;
    min-inline-size: 0;
    inline-size: var(--_rsf-w, auto);
    min-block-size: var(--_rsf-min-h);
    max-block-size: var(--_rsf-max-h, none);
    block-size: var(--_rsf-h, auto);
    background: none;
    box-shadow: none;
  }
  .frame.fills > .box {
    inline-size: auto;
  }
  /* RSF-2: outlined, the content is clipped to the box's corners and scrolls inside it where it is taller; the edge is
     drawn inside the box's size. */
  .frame.outlined > .box {
    overflow: auto;
    border: ${t('outline-width')} solid ${t('outline-color')};
  }
  ${unsafeCSS(heldShape('.frame.outlined > .box', T('container-shape'), `var(${PREFIX}-container-shape-pill, 0)`))}
  /* RSF-2: plain, nothing is clipped and the content fills the box: it draws its own surface and scrolls itself. */
  .frame.plain > .box {
    overflow: visible;
  }
  .content {
    display: block;
    min-inline-size: 0;
  }
  .frame.plain .content {
    block-size: 100%;
  }
  .frame.plain .content::slotted(*) {
    box-sizing: border-box;
    block-size: 100%;
  }
  .box:focus-visible {
    outline: none;
  }

  /* RSF-3: each handle centred along its edge — outlined, in its own track beyond the box; plain, on the edge itself,
     its centre on the line of the edge (on the corner for bottom-end), over what stands beside the frame. */
  tanrei-handle {
    position: relative;
    z-index: 2;
  }
  .frame.outlined > .handle-start {
    grid-area: hs;
    align-self: center;
    justify-self: end;
  }
  .frame.outlined > .handle-end {
    grid-area: he;
    align-self: center;
    justify-self: start;
  }
  .frame.outlined > .handle-bottom {
    grid-area: hb;
    align-self: start;
    justify-self: center;
  }
  .frame.outlined > .handle-bottom-end {
    grid-area: hc;
    align-self: start;
    justify-self: start;
  }
  .frame.plain > tanrei-handle {
    grid-area: box;
  }
  .frame.plain > .handle-start {
    align-self: center;
    justify-self: start;
    translate: -50% 0;
  }
  .frame.plain > .handle-end {
    align-self: center;
    justify-self: end;
    translate: 50% 0;
  }
  .frame.plain > .handle-bottom {
    align-self: end;
    justify-self: center;
    translate: 0 50%;
  }
  .frame.plain > .handle-bottom-end {
    align-self: end;
    justify-self: end;
    translate: 50% 50%;
  }
  /* RSF-13: right-to-left mirrors the inline offsets; the logical grid and self-alignment mirror by themselves. */
  :host(:dir(rtl)) .frame.plain > .handle-start {
    translate: 50% 0;
  }
  :host(:dir(rtl)) .frame.plain > .handle-end {
    translate: -50% 0;
  }
  :host(:dir(rtl)) .frame.plain > .handle-bottom-end {
    translate: -50% 50%;
  }

  /* RSF-10: the size indicator, inside the box at its top-end corner, over the content; it takes no input. RSF-11: it
     fades in and out by the hint's role. */
  .indicator {
    grid-area: box;
    align-self: start;
    justify-self: end;
    z-index: 3;
    margin-block-start: ${t('size-indicator-offset')};
    /* Both sides: the label is written left to right (dir), and its end in the box is the frame's end. */
    margin-inline: ${t('size-indicator-offset')};
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    block-size: ${t('size-indicator-container-height')};
    padding-inline: ${t('size-indicator-container-padding-inline')};
    border-radius: ${t('size-indicator-container-shape')};
    background-color: ${t('size-indicator-container-color')};
    color: ${t('size-indicator-label-color')};
    font: ${t('size-indicator-label-typescale-font')};
    letter-spacing: ${t('size-indicator-label-typescale-letter-spacing')};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
    user-select: none;
    opacity: 0;
    transition: opacity ${t('motion-indicator-exit-duration')} ${t('motion-indicator-exit-easing')};
  }
  .indicator.shown {
    opacity: 1;
    transition: opacity ${t('motion-indicator-enter-duration')} ${t('motion-indicator-enter-easing')};
  }
  .indicator.live {
    transition: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .indicator,
    .indicator.shown {
      transition: none;
    }
  }

  /* The least lengths the tokens give, measured where the element needs them as numbers (RSF-1, RSF-5, RSF-9). */
  .probe {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    visibility: hidden;
    pointer-events: none;
    block-size: 0;
  }
  .probe.min-width {
    inline-size: ${t('container-min-width')};
  }
  .probe.min-height {
    inline-size: ${t('container-min-height')};
  }
  .probe.snap {
    inline-size: ${t('snap-distance')};
  }

  /* RSF-15: forced colors draw the edge in the text color, and the indicator's text in it on the canvas, edged. */
  @media (forced-colors: active) {
    .frame.outlined > .box {
      border-color: CanvasText;
    }
    .indicator {
      forced-color-adjust: none;
      background-color: Canvas;
      color: CanvasText;
      border: ${t('outline-width')} solid CanvasText;
    }
  }
`;
