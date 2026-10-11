import { css, unsafeCSS } from 'lit';
import { iconGlyph, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/file-picker.tokens.json). One thing answers a pointer: the drop area
// (hovered and pressed; never focused — keyboard focus is on the trigger, FPK-15). It paints from that state's tokens;
// nothing here computes how a state looks. The trigger is the product's own Button and is given no style at all (FPK-5).
export const PREFIX = '--tanrei-comp-file-picker';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
/** A text role, used whole: the font shorthand and its letter spacing. */
const role = (part: string) => unsafeCSS(`font: ${T(`${part}-typescale-font`)};\n    letter-spacing: ${T(`${part}-typescale-letter-spacing`)};`);

/** Where each state of the drop area is read (FPK-15): on the area itself, a box with no role. */
const area = (state: string) => `.area${state}`;
/** FPK-15: what a state of the area paints — its ground, its edge (plain, and under the error condition), its glyph and its two texts, and the opacity. */
const paintArea = (state: string, container = true) => {
  const part = (name: string) => T(`standard-${state ? `${state}-` : ''}${name}`);
  return `${container ? `\n    background-color: ${part('container-color')};` : ''}
    --_edge-plain: ${part('outline-color')};
    --_edge-error: ${part('error-outline-color')};
    --_icon: ${part('icon-color')};
    --_label: ${part('label-color')};
    --_supporting: ${part('supporting-text-color')};${state ? `\n    opacity: ${T(`${state}-opacity`)};` : ''}`;
};

export const styles = css`
  /* FPK-1: a block as wide as its layout gives it and as tall as its parts; no container, fill or edge around the whole. */
  :host {
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
  .group {
    min-inline-size: 0;
  }

  /* ── The button layout (FPK-2) ── the trigger at the start edge at the size the product gave it, the text that says
     nothing is chosen after it on its line, centred on it and wrapping below it where the line is too short; the
     line of limits below that line. */
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${t('trigger-gap')};
    min-inline-size: 0;
  }
  /* FPK-22: a trigger alone on its line is never wider than that line: one that would be is given the line's width and
     no less, and then wraps its label as the Button says (the element tells it so). A trigger that fits is not touched. */
  ::slotted([slot='trigger']) {
    max-inline-size: 100%;
    min-inline-size: min-content;
  }
  .selection {
    ${role('selection-text')}
    color: ${t('standard-selection-text-color')};
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }
  .supporting {
    display: block;
    ${role('supporting-text')}
    color: ${t('standard-supporting-text-color')};
    margin-block-start: ${t('supporting-text-gap')};
    overflow-wrap: anywhere;
  }
  /* FPK-26: each text is text of its own direction, isolated; its lines are placed by the layout. */
  ${productText('.chooser:not(.area) .supporting', { align: 'start' })}
  ${productText('.selection')}
  ${productText('.area .label')}
  ${productText('.area .supporting')}
  /* FPK-19: disabled, the texts of the button layout are drawn from their disabled tokens. */
  .chooser[data-disabled] .selection {
    color: ${t('standard-disabled-selection-text-color')};
  }
  .chooser[data-disabled]:not(.area) .supporting {
    color: ${t('standard-disabled-supporting-text-color')};
  }

  /* ── The drop area (FPK-3) ── a container across the whole width with container.shape corners, its fill, and its
     edge inside its size; one centred column of the glyph, the prompt, the trigger and the line of limits,
     container.gap apart. As tall as its parts and paddings: it has no height of its own.
     The edge (FPK-4) is drawn one of two ways, and --_solid (0 or 1) says which: dashed, by the stroke of .outline —
     dashes of outline.dash-length with gaps of the same length, along the rounded corners; solid, by the border. The
     paddings give the border its room, so the content stands where it stood either way. */
  .area {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the fill and below the content. */
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${t('container-gap')};
    --_edge-width: ${t('outline-width')};
    --_style-solid: 0;
    --_solid: max(var(--_style-solid), var(--_eased, 0));
    --_drawn-edge: calc(var(--_edge-width) * var(--_solid));
    padding-block: calc(${t('container-padding-block')} - var(--_drawn-edge));
    padding-inline: calc(${t('container-padding-inline')} - var(--_drawn-edge));
    border: var(--_drawn-edge) solid var(--_edge);
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    ${unsafeCSS(paintArea(''))}
    --_edge: var(--_edge-plain);
    --_pressed-container: ${t('standard-pressed-container-color')};
    text-align: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, border-color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  /* FPK-16: the error condition changes the edge alone, in every state. */
  .area[data-error] {
    --_edge: var(--_edge-error);
  }
  /* FPK-4: outline.style is a choice of kind, read from the cascade — and, where style queries are
     missing, from data-outline, which the element writes when it renders. dashed is the first value: what an unknown
     name draws. */
  @container style(${unsafeCSS(PREFIX)}-outline-style: solid) {
    .area {
      --_style-solid: 1;
    }
  }
  .area[data-outline='solid'] {
    --_style-solid: 1;
  }
  /* FPK-4, FPK-11: a dashed edge cannot follow an eased corner — the stroke's corner is an arc of a circle — so where
     the corners are eased (the browser has corner-shape and the system's smoothing is above 0) the edge is drawn
     solid, by the border, which follows them. */
  @supports (corner-shape: superellipse(log(2, 2))) {
    .area {
      --_eased: min(1, calc(var(--_corner-smoothing) * 100000));
    }
  }
  .outline {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    pointer-events: none;
    opacity: calc(1 - var(--_solid));
  }
  .outline rect {
    x: calc(var(--_edge-width) / 2);
    y: calc(var(--_edge-width) / 2);
    width: calc(100% - var(--_edge-width));
    height: calc(100% - var(--_edge-width));
    rx: max(0px, calc(var(--tanrei-corner-radius) - var(--_edge-width) / 2));
    fill: none;
    stroke: var(--_edge);
    stroke-width: var(--_edge-width);
    stroke-dasharray: ${t('outline-dash-length')} ${t('outline-dash-length')};
    transition: stroke ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  /* FPK-4: the glyph at the top of the area — the icon set's upload glyph, or the product's — at icon.size in the
     state's icon color; FPK-26: iconGlyph() mirrors a glyph GlyphMirrorController marked. */
  ${iconGlyph('.icon', { size: `${PREFIX}-icon-size`, selected: ':not(*)' })}
  .icon {
    color: var(--_icon);
    transition: color ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  /* The slot is the glyph's ink for GlyphDrawnController: an inline block as wide as the name it holds. */
  .icon slot,
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  .icon ::slotted(svg),
  .icon ::slotted(img) {
    display: block;
    inline-size: var(--tanrei-icon-size);
    block-size: var(--tanrei-icon-size);
  }
  /* FPK-13: while the area refuses, the block glyph stands in the glyph's place, the product's included. */
  .icon.refusing slot {
    display: none;
  }
  /* FPK-29: nothing in a glyph's place until the icon set can draw it; the box keeps its size. */
  .icon:not([data-drawn]) {
    visibility: hidden;
  }
  .area .label {
    ${role('label')}
    color: var(--_label);
    max-inline-size: 100%;
    overflow-wrap: anywhere;
    transition: color ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  .area .line {
    justify-content: center;
    max-inline-size: 100%;
  }
  .area .supporting {
    margin-block-start: 0;
    color: var(--_supporting);
    max-inline-size: 100%;
    transition: color ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  /* The carrier of press-hold for PressController: in no flow, drawn nowhere. */
  .hold {
    position: absolute;
  }
  ${pressHold('.hold')}

  /* FPK-15: hovered and pressed, pressed over hovered. A box that is never focused matches no focused rule. */
  ${stateRules(area, {
    hovered: paintArea('hovered'),
    focused: '',
    pressed: paintArea('pressed'),
    pressedContent: paintArea('pressed', false),
    disabled: '',
  })}
  /* FPK-8: the pressed state appears without delay on every part of the area, not on its fill alone. */
  .area[data-pressed]:not([data-pressed='none']) :is(.icon, .label, .supporting, .outline rect) {
    transition-duration: 0s;
  }
  /* FPK-10 ripple: grows over motion.feedback-duration and fades over motion.state-duration. */
  ${rippleStyles({
    color: '--_pressed-container',
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}
  /* FPK-13: receiving and refusing win over hovered and pressed, and are drawn in the error edge's place (FPK-16).
     Refusing keeps the fill and the texts as at rest. */
  .area[data-drag='receiving'] {
    background-color: ${t('receiving-container-color')};
    --_edge: ${t('receiving-outline-color')};
    --_icon: ${t('receiving-content-color')};
    --_label: ${t('receiving-content-color')};
    --_supporting: ${t('receiving-content-color')};
    opacity: initial;
  }
  .area[data-drag='refusing'] {
    ${unsafeCSS(paintArea(''))}
    --_edge: ${t('refusing-outline-color')};
    --_icon: ${t('refusing-icon-color')};
    opacity: initial;
  }
  /* FPK-19: disabled wins over everything; the area answers nothing. */
  .area[data-disabled] {
    ${unsafeCSS(paintArea('disabled'))}
    cursor: default;
  }
  .area[data-disabled][data-error] {
    --_edge: var(--_edge-error);
  }
  ${shape}

  .picker {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .area,
    .outline rect,
    .icon,
    .area .label,
    .area .supporting {
      transition: none;
    }
  }

  /* FPK-23: forced colors remove every fill. The edge and the texts take the text color; a receiving area has an edge
     twice as wide, solid, in the highlight color, and a refusing one its block glyph, so neither rests on a fill;
     disabled parts take the disabled text color. */
  @media (forced-colors: active) {
    .area,
    .area[data-drag],
    .area[data-disabled] {
      background: none;
      border-color: CanvasText;
      opacity: initial;
    }
    .outline rect {
      forced-color-adjust: none;
      stroke: CanvasText;
    }
    .icon,
    .area .label,
    .area .supporting {
      color: CanvasText;
    }
    .area[data-drag='receiving'] {
      --_edge-width: calc(${t('outline-width')} * 2);
      --_solid: 1;
      border-color: Highlight;
    }
    .area[data-disabled] {
      border-color: GrayText;
    }
    .area[data-disabled] .outline rect {
      stroke: GrayText;
    }
    .area[data-disabled] :is(.icon, .label, .supporting),
    .chooser[data-disabled] .selection,
    .chooser[data-disabled]:not(.area) .supporting {
      color: GrayText;
    }
  }
`;
