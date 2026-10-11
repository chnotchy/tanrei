import { css, unsafeCSS } from 'lit';
import {
  conditionBlock,
  focusRing,
  minimumTarget,
  pressHold,
  rippleStyles,
  selectionContainerShape,
  selectionLabel,
  selectionStates,
} from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/radio-button.tokens.json). The two conditions, unselected and selected,
// and their error forms (RAD-26) are the radio button's state variants: each has its own container, ring,
// fill and label color in every state. An error form recolors and changes nothing else: the stroke's weight says the
// selection in every form. Hover, focus and press show on the container, the round state layer behind the ring.
const PREFIX = '--tanrei-comp-radio-button';
const PARTS = { c: 'container-color', r: 'ring-color', f: 'fill-color', l: 'label-color' } as const;

/** The condition drawn follows what the native radio says, so what is drawn and what is announced cannot disagree. */
export const CONDITIONS = {
  unselected: '.root',
  selected: '.root:has(input:checked)',
  // RAD-26: `data-error` — the radio button's own `error`, or the error condition a field, a field group or a radio
  // group put it in (FLD-8, FGR-8, RGP-8). `:host` puts each selector above both plain conditions. A disabled option
  // reads the error form's disabled tokens, which resolve to the plain form's: disabled wins, by value.
  'error-unselected': ':host .root[data-error]',
  'error-selected': ':host .root[data-error]:has(input:checked)',
} as const;

const recolor = 'var(--_recolor-duration) var(--_recolor-easing)';

export const styles = css`
  ${unsafeCSS(Object.entries(CONDITIONS).map(([condition, selector]) => conditionBlock(PREFIX, condition, PARTS, selector)).join('\n'))}

  /* RAD-14: the ring's stroke, ring.width while unselected; while selected, ring.selected-width-share of the radius, or
     ring.width where that is wider. */
  .root {
    --_stroke: var(--tanrei-comp-radio-button-ring-width);
  }
  .root:has(input:checked) {
    --_stroke: max(
      var(--tanrei-comp-radio-button-ring-width),
      calc(var(--tanrei-comp-radio-button-ring-selected-width-share) * var(--tanrei-comp-radio-button-ring-size) / 2)
    );
  }

  /* RAD-17: the control, then the label at its inline end, comp.radio-button.label.gap away, wrapping. */
  ${selectionLabel(PREFIX, 'var(--tanrei-comp-radio-button-container-size)')}
  /* RAD-23: the label is text of its own direction — its first strong character's — isolated from what is around it; the
     layout direction still puts it at the control's inline end and aligns the lines it wraps to. */
  ${productText('.label', { align: 'start' })}

  /* RAD-21: each option takes at least option.min-height in layout, the container centered in it (on the label's first
     line, when the label wraps); a token below the container's size leaves the container's own height. */
  .root {
    padding-block: max(0px, calc((var(--tanrei-comp-radio-button-option-min-height) - var(--tanrei-comp-radio-button-container-size)) / 2));
  }

  /* RAD-14: the round container, comp.radio-button.container.size across, with the ring centered in it. */
  .control {
    display: grid;
    place-items: center;
    inline-size: var(--tanrei-comp-radio-button-container-size);
    block-size: var(--tanrei-comp-radio-button-container-size);
  }
  .container,
  .ring {
    grid-area: 1 / 1;
  }
  .container {
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color. */
    isolation: isolate;
    inline-size: 100%;
    block-size: 100%;
    ${unsafeCSS(selectionContainerShape)}
    background: var(--_c);
    transition-property: background-color, border-radius;
    transition-duration: var(--tanrei-comp-radio-button-motion-state-duration);
    transition-timing-function: var(--tanrei-comp-radio-button-motion-state-easing);
  }

  /* RAD-14: the ring, of outer diameter ring.size in both conditions, its stroke drawn inward from that diameter; a
     circle, so its radius is half its size (a pill: round whatever the corner smoothing, and the focus ring around it
     is round too). It draws no dot: what is inside it is the fill (RAD-19).
     RAD-24: the ring and the fill are ONE shape — two layers of this one box with one padding, the stroke, each painted
     over the whole box and cut by a mask along the same circle, the content box's edge: the ring (::before) is
     everything BUT the content box, the fill (.fill) is the content box. On a pixel that circle crosses, the ring
     covers a share and the fill exactly the rest, and the fill is ADDED to the ring (plus-lighter, inside the box's
     isolated group) instead of composited beside it: the shares sum to the whole, nothing behind shows between them and
     neither is over the other, at any zoom or position. (What this replaces — an inset shadow and a separately placed
     disc — was antialiased and snapped apart, and the page showed through all round. Both are cut by a mask of two
     layers because that is the one way Chromium, Firefox and WebKit all cut the two from the same rasterized edge,
     measured at device pixel ratios 1 to 3: a fill clipped by background-clip, or behind a mask of one layer, leaves a
     seam or an overlap in one engine or another.) */
  .ring {
    position: relative;
    /* The group the two layers are added in: nothing outside the ring takes part in the sum. */
    isolation: isolate;
    box-sizing: border-box;
    inline-size: var(--tanrei-comp-radio-button-ring-size);
    block-size: var(--tanrei-comp-radio-button-ring-size);
    --tanrei-corner-radius: calc(var(--tanrei-comp-radio-button-ring-size) / 2);
    --tanrei-corner-pill: 1;
    pointer-events: none;
  }
  /* RAD-7, RAD-15, RAD-20: the state motion when a state recolors the ring; the selection motion, stroke and color
     together, when the condition changes. A transition interrupted turns back from where it is. ONE property, the
     padding, moves the edge the two layers share, with one timing: they cannot drift apart in any frame (RAD-24). */
  .ring::before,
  .fill {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    padding: var(--_stroke);
    border-radius: inherit;
    corner-shape: inherit;
    transition:
      padding ${unsafeCSS(recolor)},
      background-color ${unsafeCSS(recolor)};
  }
  /* A mask is alpha, not a color: #000 is "all of it", transparent "none of it". "All" is not clipped to the box
     (no-clip): the box's round outer edge is cut once, by the background. The fill's mask is the content box alone;
     its second layer is empty and changes nothing (x XOR nothing is x) but the way the engine cuts it — as a mask of
     several layers, the way it cuts the ring's. A mask of one layer is a clip in Firefox, rasterized on its own. */
  .ring::before {
    content: '';
    background: var(--_r);
    mask:
      linear-gradient(#000 0 0) content-box exclude,
      linear-gradient(#000 0 0) no-clip;
  }

  /* RAD-19: the fill, in both conditions: the disc inside the ring's inner edge at that moment, less fill.inset all
     round (never under the ring), in its condition's fill color at fill.opacity. Its edge follows the stroke over the
     same motion (RAD-15), so it never grows from or shrinks to the center; only its color changes with the condition,
     from the unselected fill color (fading from none) to the selected one, and back. An inset that leaves nothing draws
     nothing (a content box of no size, so a mask of none). fill.inset is a margin of the fill's layer alone, not a
     calc() term: a zero length may arrive unitless; above 0 the two no longer touch, the space between them shows what
     is behind (RAD-24), and the sum changes nothing. */
  .fill {
    margin: var(--tanrei-comp-radio-button-fill-inset);
    background-color: color-mix(in srgb, var(--_f) calc(var(--tanrei-comp-radio-button-fill-opacity) * 100%), transparent);
    mask:
      linear-gradient(#000 0 0) content-box exclude,
      linear-gradient(transparent 0 0) no-clip;
    mix-blend-mode: plus-lighter;
  }

  /* RAD-9: the hit area meets the minimum target around the container; the label is in it too (the root is the <label>). */
  ${minimumTarget('.control')}

  /* RAD-7, RAD-10, RAD-11, RAD-12: each state paints from that state's tokens of the current condition. */
  ${selectionStates(PREFIX, PARTS, 'c')}

  /* RAD-12 ripple: the pressed container color of the condition, grown over comp.radio-button.motion.feedback-duration. */
  ${rippleStyles({
    color: '--_c-p',
    grow: '--tanrei-comp-radio-button-motion-feedback-duration',
    fade: '--tanrei-comp-radio-button-motion-state-duration',
    easing: '--tanrei-comp-radio-button-motion-state-easing',
  })}

  /* RAD-8, RAD-13: the ring (or the glow) around the ring, never animated, for keyboard focus only. */
  ${focusRing((focus) => `input${focus} ~ .ring`)}

  /* RAD-13: corner smoothing on the container (data-tanrei-shape); a round container is unchanged by any amount. */
  ${shape}

  /* RAD-11: the control carries press-hold for PressController; it has no transition of its own. */
  ${pressHold('.control')}

  /* RAD-15: where motion is reduced the new condition shows at once and in full. */
  @media (prefers-reduced-motion: reduce) {
    .container,
    .ring::before,
    .fill {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    /* The ring is drawn in system colors of its own: the stroke's weight carries the selection, as it does in every
       mode; the fill, which never carries it, is not drawn. RAD-27: the error forms are drawn exactly as the same
       condition out of error — these rules ask no condition's color — and the group says the error (RGP-14). */
    .ring::before {
      forced-color-adjust: none;
      background: CanvasText;
    }
    .root:has(input:checked) .ring::before {
      background: Highlight;
    }
    .root:has(input:disabled) .ring::before {
      background: GrayText;
    }
    .fill {
      background-color: transparent;
    }
  }
`;
