import { css, unsafeCSS } from 'lit';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/badge.tokens.json). The host wraps the anchor and is exactly its size (an
// inline flex box around one item); the badge itself is absolutely positioned on the anchor's top-end corner, so it
// takes no space and never moves the anchor (BDG-7). Its placement is logical — inline-end, block-start — so a
// right-to-left layout takes the top-left corner and grows the pill to the left without a rule of its own (BDG-11).
//
// Placement (BDG-1, BDG-3): `.corner` is a zero-size box at the point the spec names — `offset` inside the anchor's
// top-end corner on both axes — and a flex container that centers the badge on that point vertically, whatever its
// height (text can make the pill taller). Along the line, the badge starts half its leading circle before the point:
// the dot is centered on it, and the pill's leading circle (a container.height square at its start) is too, so a
// longer count grows toward the end, away from the anchor.
export const styles = css`
  :host {
    display: inline-flex;
    position: relative;
    flex: none;
  }
  :host([hidden]) {
    display: none;
  }

  .corner {
    position: absolute;
    inset-block-start: var(--_offset);
    inset-inline-start: calc(100% - var(--_offset));
    inline-size: 0;
    block-size: 0;
    display: flex;
    align-items: center;
    /* BDG-7: input over the badge reaches the anchor. */
    pointer-events: none;
  }
  .corner.dot {
    --_offset: var(--tanrei-comp-badge-dot-offset);
  }
  .corner.count {
    --_offset: var(--tanrei-comp-badge-container-offset);
  }
  .corner[hidden] {
    display: none;
  }

  .container {
    flex: none;
    box-sizing: border-box;
    background: var(--tanrei-comp-badge-container-color);
    /* BDG-6: the outline is outside the edge — a spread shadow follows the shape and changes neither size nor place. */
    box-shadow: 0 0 0 var(--tanrei-comp-badge-outline-width) var(--tanrei-comp-badge-outline-color);
  }

  /* BDG-1: the dot, a circle of diameter dot.size whatever corners the container has. */
  .dot .container {
    inline-size: var(--tanrei-comp-badge-dot-size);
    block-size: var(--tanrei-comp-badge-dot-size);
    margin-inline-start: calc(var(--tanrei-comp-badge-dot-size) / -2);
    border-radius: 50%;
  }

  /* BDG-2: the pill — at least container.height high and as wide as it is high, padding-inline on each side of the
     label, container.shape corners (the shared corner rule: round caps for the full step). BDG-3 / BDG-13: its leading
     circle is a square of its DRAWN height, so it starts half that height before the corner point — the component
     measures the height into --_lead (container.height until the first measurement), and the minimums let the pill
     grow with its text. */
  .count .container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--tanrei-comp-badge-container-height);
    min-block-size: var(--tanrei-comp-badge-container-height);
    padding-inline: var(--tanrei-comp-badge-container-padding-inline);
    margin-inline-start: calc(var(--_lead, var(--tanrei-comp-badge-container-height)) / -2);
    ${unsafeCSS(cornerRadius('--tanrei-comp-badge-container-shape'))}
  }
  ${shape}

  .label {
    color: var(--tanrei-comp-badge-label-color);
    font: var(--tanrei-comp-badge-label-typescale-font);
    letter-spacing: var(--tanrei-comp-badge-label-typescale-letter-spacing);
    /* BDG-12: digits of equal width, where the font has them, so a changing count does not shift its neighbours. */
    font-variant-numeric: tabular-nums;
    /* BDG-2: the pill's width is the tokens' — max(container.height, label + 2 × padding-inline) — measured with the
       font's own advances. Without this, Chromium on Linux (no subpixel positioning) hints each glyph advance to a
       whole pixel: Inter's 7.78px tabular digit at label-small becomes 8px, and with the letter-spacing a single digit
       outgrows the 16px circle the tokens draw on macOS, in Firefox, WebKit and on every native platform. */
    text-rendering: geometricPrecision;
    white-space: nowrap;
    /* BDG-11: isolated from the surrounding direction, so a capped count keeps its plus sign after the digits. */
    direction: ltr;
    unicode-bidi: isolate;
  }

  @media (forced-colors: active) {
    /* A fill is dropped in forced colors: the badge is drawn in the system's text color instead, its number reversed. */
    .container {
      forced-color-adjust: none;
      background: CanvasText;
      box-shadow: 0 0 0 var(--tanrei-comp-badge-outline-width) Canvas;
    }
    .label {
      color: Canvas;
    }
  }
`;
