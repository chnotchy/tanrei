import { css, unsafeCSS } from 'lit';
import { conditionBlock, conditionStates, focusRing, minimumTarget, pressHold, rippleStyles } from '../../primitives/index.js';
import { iconGlyph } from '../../styles/icons.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/stepper.tokens.json). A step has four conditions — incomplete, current,
// complete and error — which are its state variants: each colors the container, the marker's fill, ring and content,
// the label and the description, in every state. How a state looks is the design system's decision: hover, focus and
// press mix the condition's container with its `state-layer.color` in the default system; the component only says
// which state's tokens are drawn, and only on a step that can be pressed (a native button).
export const PREFIX = '--tanrei-comp-stepper';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The four conditions (SPR-1), as the token names say them. */
export const CONDITIONS = ['incomplete', 'current', 'complete', 'error'] as const;
export type StepCondition = (typeof CONDITIONS)[number];

/** The parts each condition colors in every state. */
const PARTS = { c: 'container-color', m: 'marker-color', o: 'marker-outline-color', k: 'marker-content-color', l: 'label-color', d: 'description-color' } as const;

/**
 * Where each state is read (SPR-12): hover, keyboard focus, press (`data-pressed`, PressController) and disabled on the
 * step's native button — never on a step that cannot be pressed, which is a `div`. `:where()` keeps every selector at one
 * element and one class, so the order is the precedence.
 */
const on = (state: string) => `button.container:where(${state})`;

/** The transitions of a part the states and the conditions recolor (SPR-17). */
const RECOLOR = `${T('motion-state-duration')} ${T('motion-state-easing')}`;

/** The stepper: the row or column of its steps, or the compact form (SPR-4, SPR-5, SPR-6). */
export const stepperStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }
  :host([hidden]) {
    display: none;
  }
  ${shape}
  .steps {
    display: flex;
    min-inline-size: 0;
  }
  .steps[hidden] {
    display: none;
  }
  /* SPR-4: one row of equal columns. */
  .steps.horizontal ::slotted(*) {
    flex: 1 1 0;
    min-inline-size: 0;
  }
  /* SPR-5: one column. */
  .steps.vertical {
    flex-direction: column;
  }
  /* SPR-6: the measure of a column's least width, read by the element: a probe of no height in a box of no size, so that
     it never widens what holds the stepper. */
  .probe-box {
    position: absolute;
    inline-size: 0;
    block-size: 0;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
  }
  .probe {
    display: block;
    inline-size: ${t('step-min-width')};
    block-size: 0;
  }

  /* SPR-6: the compact form — the bar, then the position, then the current step's label. */
  .compact {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }
  .bar {
    display: flex;
    gap: ${t('bar-gap')};
  }
  .segment {
    flex: 1 1 0;
    min-inline-size: 0;
    block-size: ${t('bar-thickness')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-bar-shape`))}
    background: ${t('bar-color')};
    transition: background-color ${unsafeCSS(RECOLOR)};
  }
  .segment.filled {
    background: ${t('bar-filled-color')};
  }
  .position {
    margin-block-start: ${t('position-gap')};
    font: ${t('position-typescale-font')};
    letter-spacing: ${t('position-typescale-letter-spacing')};
    color: ${t('position-color')};
    overflow-wrap: anywhere;
  }
  ${productText('.position', { align: 'start' })}
  .current {
    display: flex;
    align-items: flex-start;
    gap: ${t('marker-gap')};
    font: ${t('label-typescale-font')};
    letter-spacing: ${t('label-typescale-letter-spacing')};
    color: ${t('current-label-color')};
  }
  .current.error {
    color: ${t('error-label-color')};
  }
  .current .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }
  ${productText('.current .label', { align: 'start' })}
  .current .glyph-line {
    display: flex;
    align-items: center;
    block-size: 1lh;
  }
  ${iconGlyph('.glyph', { size: `${PREFIX}-marker-icon-size`, selected: '.current', weight: `${PREFIX}-marker-icon-weight` })}
  .glyph {
    visibility: hidden;
  }
  .glyph[data-drawn] {
    visibility: visible;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  .status {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  @media (prefers-reduced-motion: reduce) {
    .segment {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .segment {
      forced-color-adjust: none;
      background: CanvasText;
    }
    .segment.filled {
      background: Highlight;
    }
    .position,
    .current,
    .current.error {
      color: CanvasText;
    }
  }
`;

/**
 * One step (SPR-2…5, SPR-8, SPR-9, SPR-11…18, SPR-22, SPR-23, SPR-25…27): its container — a native button while it can
 * be pressed, a `div` otherwise — holding the marker and the text, and the connector to the next step.
 */
export const stepStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    outline: none;
    /* SPR-18: a step's container is at least the minimum target. */
    --_target: var(--tanrei-sys-target-pointer);
    --_pad: ${t('container-padding')};
    --_marker: ${t('marker-size')};
    --_gap: ${t('connector-gap')};
    --_thick: ${t('connector-thickness')};
  }
  @media (pointer: coarse) {
    :host {
      --_target: var(--tanrei-sys-target-touch);
    }
  }
  :host([hidden]) {
    display: none;
  }

  ${unsafeCSS(CONDITIONS.map((condition) => conditionBlock(PREFIX, condition, PARTS, condition === 'incomplete' ? '.container' : `.container.${condition}`)).join('\n'))}

  .step {
    position: relative;
    display: flex;
    block-size: 100%;
    min-inline-size: 0;
  }
  .container {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the content. */
    isolation: isolate;
    display: flex;
    flex: 1 1 auto;
    min-inline-size: 0;
    min-block-size: var(--_target);
    padding: var(--_pad);
    ${unsafeCSS(cornerRadius('--_shape'))}
    background: var(--_c);
    color: var(--_l);
    font: ${t('label-typescale-font')};
    letter-spacing: ${t('label-typescale-letter-spacing')};
    text-align: start;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  button.container {
    cursor: pointer;
  }
  ${shape}
  /* SPR-4: the horizontal form — the marker at the start, the text under it. */
  .step.horizontal .container {
    flex-direction: column;
    align-items: flex-start;
    gap: ${t('marker-gap')};
    min-inline-size: var(--_target);
  }
  /* SPR-5: the vertical form — the marker at the start, the text beside it, the marker centred on the label's first line. */
  .step.vertical .container {
    flex-direction: row;
    align-items: flex-start;
    gap: ${t('marker-gap')};
  }
  .step.vertical .marker-cell {
    display: flex;
    flex: none;
    margin-block-start: max(0px, calc((1lh - var(--_marker)) / 2));
  }
  .step.vertical .text {
    padding-block-start: max(0px, calc((var(--_marker) - 1lh) / 2));
  }

  /* SPR-12, SPR-15: each state paints from that state's tokens of the step's condition; pressed > focused > hovered,
     disabled over all — on a native button only. */
  ${unsafeCSS(conditionStates(PREFIX, PARTS, { container: 'c', root: '.container', on }))}

  /* A press is shown without a transition in, on every part the pressed tokens color. */
  button.container[data-pressed]:not([data-pressed='none']) :is(.marker, .description) {
    transition-duration: 0s;
  }

  /* SPR-15 ripple: the pressed container color of the step's condition, grown over motion.feedback-duration and faded
     over motion.state-duration, both with motion.state-easing, clipped to the container's corners. */
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* SPR-13, SPR-16: the ring (or the glow) around the container, for keyboard focus only, never animated. */
  ${focusRing((focus) => `button.container${focus}`)}
  /* SPR-18: the hit area, never smaller than the container (which is already at least the target). */
  ${minimumTarget('button.container')}

  /* SPR-2: the marker — a circle at least marker.size, its fill, ring and content those of the step's condition. */
  .marker-cell {
    display: flex;
  }
  .marker {
    box-sizing: border-box;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--_marker);
    min-block-size: var(--_marker);
    ${unsafeCSS(cornerRadius(`${PREFIX}-marker-shape`))}
    background: var(--_m);
    border: ${t('marker-outline-width')} solid var(--_o);
    color: var(--_k);
    font: ${t('marker-label-typescale-font')};
    letter-spacing: ${t('marker-label-typescale-letter-spacing')};
    transition-property: background-color, border-color, color;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  /* The number is a left-to-right run, never reversed (SPR-2, SPR-25). */
  .number {
    direction: ltr;
    unicode-bidi: isolate;
  }
  ${iconGlyph('.glyph', { size: `${PREFIX}-marker-icon-size`, selected: '.marker', weight: `${PREFIX}-marker-icon-weight` })}
  /* SPR-27: nothing in the glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn). */
  .glyph {
    visibility: hidden;
  }
  .glyph[data-drawn] {
    visibility: visible;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* SPR-3: the label and the description, wrapping and never cut. */
  .text {
    display: flex;
    flex-direction: column;
    gap: ${t('description-gap')};
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  .step.horizontal .text {
    align-self: stretch;
  }
  .label {
    overflow-wrap: anywhere;
  }
  .description {
    font: ${t('description-typescale-font')};
    letter-spacing: ${t('description-typescale-letter-spacing')};
    color: var(--_d);
    overflow-wrap: anywhere;
    transition: color ${unsafeCSS(RECOLOR)};
  }
  ${productText('.label', { align: 'start' })}
  ${productText('.description', { align: 'start' })}
  /* SPR-19: the word for the step's condition, heard and not drawn. */
  .status {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* SPR-8: the connector, from comp.stepper.connector.gap after this marker to the same before the next one (which stands
     container.padding inside the next step), over every container. */
  .connector {
    position: absolute;
    z-index: 1;
    background: ${t('connector-color')};
    pointer-events: none;
    transition: background-color ${unsafeCSS(RECOLOR)};
  }
  .connector.complete {
    background: ${t('connector-complete-color')};
  }
  .step.horizontal .connector {
    block-size: var(--_thick);
    inset-block-start: calc(var(--_pad) + (var(--_marker) - var(--_thick)) / 2);
    inset-inline-start: calc(var(--_pad) + var(--_marker) + var(--_gap));
    inset-inline-end: calc(var(--_gap) - var(--_pad));
  }
  .step.vertical .connector {
    inline-size: var(--_thick);
    inset-inline-start: calc(var(--_pad) + (var(--_marker) - var(--_thick)) / 2);
    inset-block-start: calc(var(--_pad) + var(--_marker) + var(--_gap));
    inset-block-end: calc(var(--_gap) - var(--_pad));
  }

  /* SPR-14: an element that is always rendered carries press-hold for PressController. */
  ${pressHold('.hold')}
  .hold {
    display: none;
  }

  /* The first condition a step is told is drawn, not animated (until two frames after it connected). */
  .still,
  .still *,
  .still ~ .connector {
    transition: none !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .container,
    .marker,
    .label,
    .description,
    .connector {
      transition: none;
    }
  }
  /* SPR-23: forced colors. */
  @media (forced-colors: active) {
    .container,
    .label,
    .description,
    .marker,
    .glyph {
      color: CanvasText;
    }
    button.container .label {
      color: ButtonText;
    }
    .marker {
      forced-color-adjust: none;
      background: Canvas;
      border-color: CanvasText;
    }
    .container.current .marker {
      background: Highlight;
      border-color: Highlight;
      color: HighlightText;
    }
    .connector,
    .connector.complete {
      forced-color-adjust: none;
      background: CanvasText;
    }
    button.container:focus-visible {
      outline-color: Highlight;
    }
    button.container:disabled,
    button.container:disabled .label,
    button.container:disabled .description,
    button.container:disabled .marker {
      color: GrayText;
    }
  }
`;
