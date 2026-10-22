import { css, unsafeCSS } from 'lit';
import {
  conditionBlock,
  conditionStates,
  focusRing,
  iconGlyph,
  minimumTarget,
  pressHold,
  rippleStyles,
  selectionContainerShape,
  selectionLabel,
  selectionState,
  selectionStates,
} from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/switch.tokens.json). The two conditions, unselected and selected, are the
// switch's state variants: each has its own container, track, outline, handle (color, size, elevation),
// icon and label in every state. Hover, focus and press show on the container, the round state layer centered on the
// handle that moves with it.
//
// SWT-13, SWT-19: the switch is drawn from ONE progress, 0 (off) to 1 (on) — `PROGRESS`, a custom property of `.root`
// that no one registers. Both conditions' tokens of the current state are on `.root` at once (`--_t0` is the unselected
// track, `--_t1` the selected one), and every part that differs between them is drawn at the progress by REAL
// properties, each linear in it:
//
//   - the handle's place is a `translate` of it;
//   - a part's color is two layers, one per condition, each painted in its own condition's color: the unselected one
//     at an opacity of 1 − progress and the selected one at an opacity of progress, added to it (`plus-lighter`, in a
//     group of their own). That sum IS the linear interpolation of the two colors, premultiplied, in sRGB — what
//     `color-mix(in srgb, …)` computes — whatever their alphas. The two are added only while the progress is between
//     its ends (`BETWEEN`: a drag holds the handle, or the element has marked a travel — switch.ts): at rest one layer
//     is drawn whole and the other not at all, by nothing but itself, so a switch at rest is painted exactly as one
//     element with that color would be, and asks the browser for no group to blend in;
//   - the two elevations and the two glyphs are layers likewise, each with its own condition's value;
//   - the handle's size is the sum of two boxes: one as wide as the unselected size times (1 − progress), one as wide
//     as the selected size times progress (`.sizer`, below).
//
// A tap changes the progress in one step, and each of those real properties transitions over the selection motion — all
// with one duration and one curve, so every frame is one progress. A drag writes the progress on `.root` in each frame,
// with that duration at zero (switch.ts). A state changes a layer's own color, or a ruler's own length, over the state
// motion. The two motions are on different properties, so one never restarts the other: a moment of a tap's transition,
// under whatever state, and a drag held at that place are one look, and nothing has a threshold.
//
// Why no registered custom property: one in the
// document makes every element that starts a transition cost Chromium 0.7 ms a restyle on a page that carries the
// tokens, and a switch is on many pages.
const PREFIX = '--tanrei-comp-switch';
const PARTS = {
  c: 'container-color',
  t: 'track-color',
  o: 'outline-color',
  h: 'handle-color',
  hs: 'handle-size',
  he: 'handle-elevation',
  i: 'icon-color',
  l: 'label-color',
} as const;

/** The handle's progress from its unselected position (0) to its selected one (1): what a drag writes on `.root`. */
export const PROGRESS = '--_tanrei-switch-progress';

/** One condition's parts under the keys `<key>0` (unselected) or `<key>1` (selected). */
const side = (n: 0 | 1) => Object.fromEntries(Object.entries(PARTS).map(([key, part]) => [`${key}${n}`, part]));
const [OFF, ON] = [side(0), side(1)];

const p = `var(${PROGRESS})`;
/** The state motion: a press sets its duration to zero (SWT-18), so what a state changes is then drawn at once. */
const state = `var(--_state-duration) var(${PREFIX}-motion-state-easing)`;
/** The selection motion: a drag sets its duration to zero (SWT-19), so the progress is then drawn in the frame it is written. */
const travel = `var(--_travel-duration) var(${PREFIX}-motion-selection-easing)`;
const PRESSED = `.root:where(:has(.container[data-pressed]:not([data-pressed='none'])))`;
/** While the progress is, or may be, between its two ends: a drag holds the handle, or a travel is under way (switch.ts marks it). */
const BETWEEN = `.root:where([data-drag], [data-between])`;

/**
 * The two layers of a part — `<selector>.off` and `<selector>.on` — in a parent that is their group
 * (`isolation: isolate`): each fills the parent, `paint(n)` is what its condition draws, and the progress crossfades
 * them so that the sum is the linear interpolation of the two (see the top of the file).
 */
const layers = (selector: string, paint: (n: 0 | 1) => string, properties: string[]) => `
  ${selector} {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    corner-shape: inherit;
    pointer-events: none;
    transition: ${[...properties.map((property) => `${property} ${state}`), `opacity ${travel}`].join(', ')};
  }
  ${selector}.off {
    ${paint(0)}
    opacity: calc(1 - ${p});
  }
  ${selector}.on {
    ${paint(1)}
    opacity: ${p};
  }
  ${BETWEEN} ${selector}.on {
    mix-blend-mode: plus-lighter;
  }`;

export const styles = css`
  /* Both conditions' parts in every state, on the root: --_t0-h is the unselected track, hovered. */
  ${unsafeCSS(conditionBlock(PREFIX, 'unselected', OFF, '.root'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'selected', ON, '.root'))}

  /* SWT-15: the track, then the label at its inline end, comp.switch.label.gap away, wrapping. */
  ${selectionLabel(PREFIX, 'var(--tanrei-comp-switch-track-height)')}
  /* SWT-24: the label is text of its own direction — its first strong character's — isolated from what is around it; the
     layout direction still puts it at the track's inline end and aligns the lines it wraps to. */
  ${productText('.label', { align: 'start' })}

  :host {
    /* SWT-11: the handle travels towards the inline end, which is the left in RTL. */
    --_travel-direction: 1;
  }
  :host(:dir(rtl)) {
    --_travel-direction: -1;
  }

  /* SWT-10: the layout box is the track, comp.switch.track.width by comp.switch.track.height. SWT-19: a drag along the
     track is the switch's; one that goes up or down first stays the page's. */
  .control {
    inline-size: var(--tanrei-comp-switch-track-width);
    block-size: var(--tanrei-comp-switch-track-height);
    touch-action: pan-y;
  }

  /* SWT-10: the track. Its two layers (.fill) draw it: the outline inside its edge and the fill inside the outline —
     never under it — each layer in its own condition's colors. */
  .track {
    position: absolute;
    inset: 0;
    isolation: isolate;
    ${unsafeCSS(cornerRadius('--tanrei-comp-switch-track-shape'))}
    pointer-events: none;
  }
  ${unsafeCSS(
    layers(
      '.fill',
      (n) => `box-sizing: border-box;
    padding: var(--tanrei-comp-switch-outline-width);
    background: var(--_t${n}) content-box;
    box-shadow: inset 0 0 0 var(--tanrei-comp-switch-outline-width) var(--_o${n});`,
      ['background-color', 'box-shadow'],
    ),
  )}

  /* SWT-10, SWT-11, SWT-13, SWT-19: the handle's center, on the track's midline half the track height from the
     inline-start end at progress 0 and from the inline-end end at 1 (mirrored in RTL). */
  .thumb {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: calc(var(--tanrei-comp-switch-track-height) / 2);
    inline-size: 0;
    block-size: 0;
    /* The handle's row (.sizer) is centered on it, by layout: a row wider than nothing reaches as far on either side. */
    display: flex;
    justify-content: center;
    translate: calc((var(--tanrei-comp-switch-track-width) - var(--tanrei-comp-switch-track-height)) * var(--_travel-direction) * ${unsafeCSS(p)}) 0;
    transition: translate ${unsafeCSS(travel)};
  }

  /* SWT-10: the round container, comp.switch.container.size across, centered on the handle; it may reach beyond the
     track and takes no room in the layout. Its color is its two layers (.tint), under the ripple. */
  .container {
    position: absolute;
    inset-inline-start: calc(var(--tanrei-comp-switch-container-size) / -2);
    inset-block-start: calc(var(--tanrei-comp-switch-container-size) / -2);
    /* Its own stacking context, so the ripple sits above the container color — and the group its layers are added in. */
    isolation: isolate;
    inline-size: var(--tanrei-comp-switch-container-size);
    block-size: var(--tanrei-comp-switch-container-size);
    ${unsafeCSS(selectionContainerShape)}
    transition: border-radius ${unsafeCSS(state)};
  }
  ${unsafeCSS(layers('.tint', (n) => `z-index: -2;\n    background-color: var(--_c${n});`, ['background-color']))}

  /* SWT-3, SWT-12, SWT-18, SWT-19: the handle's size — the unselected size and, by the progress, what the selected
     size is more or less than it — with no arithmetic that a transition would have to redo. Two rulers stand side by
     side, out of sight: one as tall as the selected size is MORE than the unselected one (nothing where it is not),
     one as tall as it is LESS — lengths, which a state changes over the state motion. In each stands a square whose
     height is a share of its ruler's, which the selection motion moves: (1 + progress) of the first, (2 − progress) of
     the second — kept above zero for a progress that a spring carries past either end. So the row (.sizer) is
     more × (1 + p) + less × (2 − p) wide, and the handle and its elevations reach past it at each end by half of
     (unselected − more − 2 × less): they are unselected + (selected − unselected) × p wide, and as tall. Where the
     two sizes are one — under a press, in the default system — the rulers are nothing and the size is that length
     itself. The row is centered on the thumb, and what it holds is placed by layout alone: no transform of its own
     stands between a part and the pixels it is drawn on. */
  .sizer {
    position: relative;
    flex: none;
    display: flex;
    align-items: flex-start;
    block-size: 0;
    pointer-events: none;
    --_more: max(0px, var(--_size1) - var(--_size0));
    --_less: max(0px, var(--_size0) - var(--_size1));
    /* The state motion as an inert transition, whatever the state: a drag's catch-up reads it here (switch.ts). */
    transition: none var(${unsafeCSS(PREFIX)}-motion-state-duration) var(${unsafeCSS(PREFIX)}-motion-state-easing);
  }
  .ruler {
    display: block;
    flex: none;
    visibility: hidden;
    transition: block-size ${unsafeCSS(state)};
  }
  .ruler.more {
    block-size: var(--_more);
  }
  .ruler.less {
    block-size: var(--_less);
  }
  .ruler > span {
    display: block;
    aspect-ratio: 1;
    transition: block-size ${unsafeCSS(travel)};
  }
  .ruler.more > span {
    block-size: calc((1 + ${unsafeCSS(p)}) * 100%);
  }
  .ruler.less > span {
    block-size: calc((2 - ${unsafeCSS(p)}) * 100%);
  }

  /* SWT-3, SWT-10, SWT-12, SWT-18: the handle — a circle whose diameter is its size, centered on the thumb, so it grows
     and shrinks about its center — and its two elevations, each a layer of the handle's box under it. */
  .handle,
  .elevation {
    position: absolute;
    left: calc((var(--_more) + 2 * var(--_less) - var(--_size0)) / 2);
    right: calc((var(--_more) + 2 * var(--_less) - var(--_size0)) / 2);
    /* As tall as it is wide — whatever it holds: a glyph of the other condition is no minimum — and centered on the row, which has no height. */
    top: 0;
    bottom: 0;
    aspect-ratio: 1;
    min-block-size: 0;
    margin-block: auto;
    border-radius: 50%;
    /* The press lands on the container around it, which takes the ripple. */
    pointer-events: none;
    transition:
      left ${unsafeCSS(state)},
      right ${unsafeCSS(state)};
  }
  /* The handle's color is its two layers (.paint), under the glyphs. */
  .handle {
    display: grid;
    place-items: center;
    isolation: isolate;
  }
  ${unsafeCSS(layers('.paint', (n) => `z-index: -1;\n    background-color: var(--_h${n});`, ['background-color']))}
  /* SWT-19: the elevation between the two conditions' — the unselected one fading out as the selected one fades in. */
  .elevation {
    transition:
      left ${unsafeCSS(state)},
      right ${unsafeCSS(state)},
      box-shadow ${unsafeCSS(state)},
      opacity ${unsafeCSS(travel)};
  }
  .elevation.off {
    box-shadow: var(--_he0);
    opacity: calc(1 - ${unsafeCSS(p)});
  }
  .elevation.on {
    box-shadow: var(--_he1);
    opacity: ${unsafeCSS(p)};
  }

  /* SWT-12, SWT-19: the icon set's glyph each prop names — no mark of the switch's own — centered in the handle at
     comp.switch.icon.size, each in its OWN condition's color, family and fill, both at comp.switch.icon.weight (the
     glyph's own weight, not sys.icon.weight: it changes the stroke, never the glyph box), at the optical size of its
     box, clamped to sys.icon.optical-size. The unselected glyph is drawn at 1 − progress under the selected one at progress, so
     at rest only the condition's glyph shows. Hidden from assistive technology. */
  ${iconGlyph('.icon', {
    size: '--tanrei-comp-switch-icon-size',
    weight: '--tanrei-comp-switch-icon-weight',
    selected: '.glyph.on',
    duration: '--tanrei-comp-switch-motion-state-duration',
    easing: '--tanrei-comp-switch-motion-state-easing',
  })}
  .glyph {
    display: grid;
    grid-area: 1 / 1;
  }
  .glyph.off {
    color: var(--_i0);
    opacity: calc(1 - ${unsafeCSS(p)});
  }
  .glyph.on {
    color: var(--_i1);
    opacity: ${unsafeCSS(p)};
  }
  .glyph {
    transition:
      color ${unsafeCSS(state)},
      opacity ${unsafeCSS(travel)};
  }
  .icon {
    /* A glyph's family and fill are its condition's and never change, so nothing of the glyph's own is transitioned. */
    transition: none;
    /* SWT-17: nothing in the glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn); the
       handle keeps its size with an icon meanwhile. */
    visibility: hidden;
  }
  .icon[data-drawn] {
    visibility: visible;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
  }

  /* SWT-5: the hit area meets the minimum target around the track — the whole track is in it — and the label too. */
  ${minimumTarget('.control')}

  /* SWT-3, SWT-6, SWT-7, SWT-8: each state paints from that state's tokens — of both conditions, which the progress
     crossfades. Under ripple and dim each condition's container color stays with the state under the press. */
  ${selectionStates(PREFIX, OFF, 'c0')}
  ${unsafeCSS(conditionStates(PREFIX, ON, { container: 'c1', root: '.root', on: selectionState }))}

  /* SWT-13, SWT-19, SWT-20: the progress is 0 while unselected and 1 while selected; every part is drawn at it, and a
     change of it is carried by the parts' own properties over the selection motion. SWT-3, SWT-18: a layer or a ruler
     takes a new state's value over the state motion, and a press at once; the selection motion keeps its duration
     under a press, which is when a tap switches it. */
  .root {
    ${unsafeCSS(PROGRESS)}: 0;
    --_travel-duration: var(${unsafeCSS(PREFIX)}-motion-selection-duration);
    --_state-duration: var(${unsafeCSS(PREFIX)}-motion-state-duration);
    --_size0: var(--_hs0);
    --_size1: var(--_hs1);
    /* The label's color at the progress. It is one element, so one property carries both motions (below). */
    --_l: color-mix(in srgb, var(--_l1) calc(${unsafeCSS(p)} * 100%), var(--_l0));
  }
  .root:has(input:checked) {
    ${unsafeCSS(PROGRESS)}: 1;
  }
  /* SWT-12: a handle that shows a glyph in a condition is at least handle.size-with-icon in that condition. */
  .root[data-unchecked-icon] {
    --_size0: max(var(--_hs0), var(--tanrei-comp-switch-handle-size-with-icon));
  }
  .root[data-checked-icon] {
    --_size1: max(var(--_hs1), var(--tanrei-comp-switch-handle-size-with-icon));
  }
  ${unsafeCSS(PRESSED)} {
    --_state-duration: 0s;
    transition-duration: 0s;
  }
  /* SWT-19: while a drag holds the handle the progress is the pointer's place, in the frame it moves. */
  .root[data-drag] {
    --_travel-duration: 0s;
    --_recolor-duration: 0s;
  }
  /* The label is one element, whose color both the states and the condition change: over the state motion, and over
     the selection motion while the element marks a change of condition (markConditionChange(), as the checkbox's and
     the radio button's label does); at once under a press, unless the condition changes under it. In every system
     the package ships the two conditions' labels are one color, and nothing of this is seen. */
  ${unsafeCSS(PRESSED)}:where(:not([data-condition-change])) .label {
    transition-duration: 0s;
  }

  /* SWT-8 ripple: the pressed container color, grown over comp.switch.motion.feedback-duration — of both conditions,
     at the progress: two layers in the ripple's own group, as the container's own color is. */
  ${rippleStyles({
    color: '--_c0-p',
    grow: '--tanrei-comp-switch-motion-feedback-duration',
    fade: '--tanrei-comp-switch-motion-state-duration',
    easing: '--tanrei-comp-switch-motion-state-easing',
  })}
  .ripple {
    isolation: isolate;
    background: none;
  }
  .ripple::before,
  .ripple::after {
    content: '';
    position: absolute;
    inset: 0;
    transition: opacity ${unsafeCSS(travel)};
  }
  .ripple::before {
    background-color: var(--_c0-p);
    opacity: calc(1 - ${unsafeCSS(p)});
  }
  .ripple::after {
    background-color: var(--_c1-p);
    opacity: ${unsafeCSS(p)};
  }
  ${unsafeCSS(BETWEEN)} .ripple::after {
    mix-blend-mode: plus-lighter;
  }

  /* SWT-4, SWT-9: the ring (or the glow) around the track, never animated, for keyboard focus only. */
  ${focusRing((focus) => `input${focus} ~ .track`)}

  /* SWT-9: corner smoothing on the container and the track (data-tanrei-shape); a pill or a circle is unchanged. */
  ${shape}

  /* SWT-7: the control carries press-hold for PressController; it has no transition of its own. */
  ${pressHold('.control')}

  /* SWT-13, SWT-18, SWT-21: where motion is reduced the new condition shows at once — no travel, no growth, no fade —
     the pressed handle returns at once, and a drag still places the handle, since it writes the progress itself. */
  @media (prefers-reduced-motion: reduce) {
    .root,
    .thumb,
    .container,
    .fill,
    .tint,
    .paint,
    .ruler,
    .ruler > span,
    .handle,
    .elevation,
    .glyph,
    .ripple::before,
    .ripple::after {
      transition: none;
    }
    .sizer {
      transition-duration: 0s;
    }
  }
  @media (forced-colors: active) {
    .track,
    .handle {
      forced-color-adjust: none;
    }
    /* The system's colors are drawn by the track and the handle themselves: a condition is one or the other. */
    .fill,
    .paint {
      display: none;
    }
    .track {
      box-sizing: border-box;
      background: Canvas;
      border: var(--tanrei-comp-switch-outline-width) solid CanvasText;
    }
    .handle {
      background: CanvasText;
    }
    .glyph {
      color: Canvas;
    }
    .root:has(input:checked) .track {
      background: Highlight;
      border-color: Highlight;
    }
    .root:has(input:checked) .handle {
      background: HighlightText;
    }
    .root:has(input:checked) .glyph {
      color: Highlight;
    }
    .root:has(input:disabled) .track {
      border-color: GrayText;
    }
    .root:has(input:disabled) .handle {
      background: GrayText;
    }
  }
`;
