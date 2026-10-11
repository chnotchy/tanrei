import { css, unsafeCSS } from 'lit';
import {
  conditionBlock,
  focusRing,
  iconGlyph,
  minimumTarget,
  pressHold,
  rippleStyles,
  selectionContainerShape,
  selectionLabel,
  selectionStates,
} from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/checkbox.tokens.json). The conditions are the checkbox's state variants:
// each has its own container, box, mark, outline and label color in every state, and the component only
// says which condition and which state's tokens are drawn — never how a state looks. Hover, focus and press show on the
// container, the round state layer behind the box; in the default system that is a mix with each
// condition's `state-layer.color`, in cupertino nothing at all, by value.
const PREFIX = '--tanrei-comp-checkbox';
const PARTS = { c: 'container-color', b: 'box-color', m: 'mark-color', o: 'outline-color', l: 'label-color' } as const;

/**
 * CHK-4: the condition drawn follows what the native input says, so what is drawn and what is announced cannot disagree:
 * indeterminate wins over checked, and `error` prefixes whichever applies. Later and more specific blocks win.
 */
export const CONDITIONS = {
  unselected: '.root',
  selected: '.root:has(input:checked)',
  indeterminate: '.root:has(input:indeterminate)',
  // `data-error`: the checkbox's own `error`, or the error condition a field or a field group put it in (FLD-8, FGR-8).
  // `:host` keeps each selector at the specificity it had as `:host([error]) .root`.
  'error-unselected': ':host .root[data-error]',
  'error-selected': ':host .root[data-error]:has(input:checked)',
  'error-indeterminate': ':host .root[data-error]:has(input:indeterminate)',
} as const;

const selection = `var(${PREFIX}-motion-selection-duration) var(${PREFIX}-motion-selection-easing)`;
const state = `var(${PREFIX}-motion-state-duration) var(${PREFIX}-motion-state-easing)`;

export const styles = css`
  ${unsafeCSS(Object.entries(CONDITIONS).map(([condition, selector]) => conditionBlock(PREFIX, condition, PARTS, selector)).join('\n'))}

  /* CHK-15: the control, then the label at its inline end, comp.checkbox.label.gap away, wrapping. */
  ${selectionLabel(PREFIX, `var(--tanrei-comp-checkbox-container-size)`)}
  /* CHK-21: the label is text of its own direction — its first strong character's — isolated from what is around it; the
     layout direction still puts it at the control's inline end and aligns the lines it wraps to. */
  ${productText('.label', { align: 'start' })}

  /* CHK-12: the round container, comp.checkbox.container.size across, with the box centered in it. */
  .control {
    display: grid;
    place-items: center;
    inline-size: var(--tanrei-comp-checkbox-container-size);
    block-size: var(--tanrei-comp-checkbox-container-size);
  }
  .container,
  .box {
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
    transition-duration: var(--tanrei-comp-checkbox-motion-state-duration);
    transition-timing-function: var(--tanrei-comp-checkbox-motion-state-easing);
  }

  /* CHK-12: the box, its outline inside its edge, and its fill inside the outline — never under it. */
  .box {
    position: relative;
    /* CHK-22: the group the outline and the fill are added in — nothing outside the box takes part in the sum. */
    isolation: isolate;
    box-sizing: border-box;
    inline-size: var(--tanrei-comp-checkbox-box-size);
    block-size: var(--tanrei-comp-checkbox-box-size);
    padding: var(--tanrei-comp-checkbox-outline-width);
    ${unsafeCSS(cornerRadius(`--tanrei-comp-checkbox-box-shape`))}
    pointer-events: none;
    transition: border-radius ${unsafeCSS(state)};
  }
  /* CHK-22: the outline and the fill are ONE shape. They are two layers of the same box with the same padding of
     outline.width, each painted over the whole box and cut by a mask along the same edge, the box's content box: the
     outline (::before) is everything BUT the content box, the fill (.fill) is the content box. On a pixel that edge
     crosses, the outline covers a share and the fill exactly the rest, and the fill is ADDED to the outline
     (plus-lighter, inside the box's isolated group) instead of composited over it: the two shares sum to the whole —
     for opaque and translucent colors alike, with nothing behind the box showing between them and neither painted over
     the other (CHK-12), at any zoom or position. What this replaces — an inset shadow over a content-box background,
     two paints antialiased apart — let up to a quarter of the background through that edge.
     Both are cut by a mask of two layers, and by nothing else, because that is the one way all three engines cut the
     two from the same rasterized edge (measured in Chromium, Firefox and WebKit at device pixel ratios 1 to 3, on and
     off the pixel grid): a fill clipped by background-clip overlaps the masked outline in Chromium, which snaps a
     background to the pixel grid and not a mask; a fill behind a mask of one layer leaves a seam in Firefox. */
  .box::before,
  .fill {
    position: absolute;
    /* Under the marks. */
    z-index: -1;
    inset: 0;
    box-sizing: border-box;
    padding: inherit;
    border-radius: inherit;
    corner-shape: inherit;
    /* CHK-5, CHK-13: the state motion when a state recolors the box, the selection motion when the condition does. */
    transition: background-color var(--_recolor-duration) var(--_recolor-easing);
  }
  /* A mask is alpha, not a color: #000 is "all of it", transparent "none of it". "All" is not clipped to the box
     (no-clip): the box's round outer edge is cut once, by the background. The fill's mask is the content box alone;
     its second layer is empty and changes nothing (x XOR nothing is x) but the way the engine cuts it — as a mask of
     several layers, the way it cuts the outline's. A mask of one layer is a clip in Firefox, rasterized on its own. */
  .box::before {
    content: '';
    background: var(--_o);
    mask:
      linear-gradient(#000 0 0) content-box exclude,
      linear-gradient(#000 0 0) no-clip;
  }
  .fill {
    background: var(--_b);
    mask:
      linear-gradient(#000 0 0) content-box exclude,
      linear-gradient(transparent 0 0) no-clip;
    mix-blend-mode: plus-lighter;
  }

  /* CHK-12: the mark is the icon set's check (selected) or remove (indeterminate), a glyph box of comp.checkbox.mark.size
     centered on the box and not clipped by it, in the selected family and fill at comp.checkbox.mark.weight (the mark's own weight, not
     sys.icon.weight: it changes the stroke, never the glyph box); the font clamps the optical size to its range
     (src/styles/icons.ts). Both glyphs are always laid out, so either can fade in or out. */
  ${iconGlyph('.mark', {
    size: '--tanrei-comp-checkbox-mark-size',
    weight: '--tanrei-comp-checkbox-mark-weight',
    selected: ':host',
    duration: '--tanrei-comp-checkbox-motion-selection-duration',
    easing: '--tanrei-comp-checkbox-motion-selection-easing',
  })}
  .mark {
    position: absolute;
    inset-block-start: var(--_mark-inset);
    inset-inline-start: var(--_mark-inset);
    color: var(--_m);
    /* CHK-13: a glyph that is not the condition's is faded out and shrunk to mark-enter-scale about the box's center. */
    opacity: 0;
    scale: var(--tanrei-comp-checkbox-motion-mark-enter-scale);
    /* CHK-19: nothing in the glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn). */
    visibility: hidden;
    transition:
      opacity ${unsafeCSS(selection)},
      scale var(--tanrei-comp-checkbox-motion-mark-scale-duration) var(--tanrei-comp-checkbox-motion-mark-scale-easing),
      color var(--_recolor-duration) var(--_recolor-easing);
  }
  .box {
    --_mark-inset: calc((var(--tanrei-comp-checkbox-box-size) - var(--tanrei-comp-checkbox-mark-size)) / 2);
  }
  .mark[data-drawn] {
    visibility: visible;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
  }
  .root:has(input:checked:not(:indeterminate)) .check,
  .root:has(input:indeterminate) .dash {
    opacity: 1;
    scale: 1;
  }

  /* CHK-7: the hit area meets the minimum target around the container, without changing its size; the label is in it
     too, because the whole root is the <label>. */
  ${minimumTarget('.control')}

  /* CHK-5, CHK-8, CHK-9, CHK-10: each state paints from that state's tokens of the current condition; pressed > focused >
     hovered, disabled over all (src/primitives/selection.ts). */
  ${selectionStates(PREFIX, PARTS, 'c')}

  /* CHK-10 ripple: the pressed container color of the condition, grown over comp.checkbox.motion.feedback-duration. */
  ${rippleStyles({
    color: '--_c-p',
    grow: `--tanrei-comp-checkbox-motion-feedback-duration`,
    fade: `--tanrei-comp-checkbox-motion-state-duration`,
    easing: `--tanrei-comp-checkbox-motion-state-easing`,
  })}

  /* CHK-6, CHK-11: the ring (or the glow) around the box, never animated, for keyboard focus only. */
  ${focusRing((focus) => `input${focus} ~ .box`)}

  /* CHK-11: corner smoothing on the container and the box (data-tanrei-shape); the ring follows the box. */
  ${shape}

  /* CHK-9: the control carries press-hold for PressController; it has no transition of its own. */
  ${pressHold('.control')}

  /* CHK-17: where motion is reduced the new condition is drawn whole in the first frame after the change, and a motion
     still running ends there (removing a transition ends it at its end value). */
  @media (prefers-reduced-motion: reduce) {
    .container,
    .box,
    .box::before,
    .fill,
    .mark {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    /* The outline is a border and the fill a background here: one opaque system color beside another, nothing to add. */
    .box::before,
    .fill {
      display: none;
    }
    .box {
      /* The fill is a system color of its own (Highlight when on), not the one the mode would force. */
      forced-color-adjust: none;
      background: Canvas;
      padding: 0;
      border: var(--tanrei-comp-checkbox-outline-width) solid CanvasText;
    }
    .root:has(input:checked) .box,
    .root:has(input:indeterminate) .box {
      background: Highlight;
      border-color: Highlight;
    }
    .mark {
      color: HighlightText;
    }
    .root:has(input:disabled) .box {
      border-color: GrayText;
    }
    .root:has(input:disabled:checked) .box,
    .root:has(input:disabled:indeterminate) .box {
      background: GrayText;
    }
  }
`;
