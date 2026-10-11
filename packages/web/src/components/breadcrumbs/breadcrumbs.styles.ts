import { css, unsafeCSS } from 'lit';
import { directionProbeStyles, focusRing, iconGlyph, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// What the shadow root draws: the navigation landmark, the ordered list, the separators and the overflow button
// (tokens/comp/breadcrumbs.tokens.json). The levels themselves — the product's own anchors — are drawn by
// src/styles/breadcrumbs.css, in the document. Every visual value is a token; for each state the overflow button reads
// that state's tokens of the overflow part and never computes how a state looks.

const PREFIX = '--tanrei-comp-breadcrumbs';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);
/** One line of the trail's text, as a length (the glyphs' own font is the icon set's). */
const LINE = unsafeCSS(`calc(var(${PREFIX}-label-typescale-font-size) * var(${PREFIX}-label-typescale-line-height))`);
/** BRC-23: along the trail a hit area reaches halfway to the entry beside it — half a separator and its gap. */
const HALFWAY = unsafeCSS(`calc((var(${PREFIX}-separator-size) / 2 + var(${PREFIX}-separator-gap)) * -1)`);

const on = (state: string) => `.overflow${state}`;
const paintContent = (state: string) => `
    color: var(${PREFIX}-overflow-${state}content-color);`;
const paint = (state: string) => `
    background-color: var(${PREFIX}-overflow-${state}container-color);${paintContent(state)}`;
const stateShape = (state: string) => cornerRadius(`${PREFIX}-${state}container-shape`);

export const styles = css`
  /* BRC-8: as wide as its entries need and no wider than its layout gives it; no fill, no edge, no padding. */
  :host {
    display: block;
    box-sizing: border-box;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  /* BRC-1: no level — nothing is drawn, no room is taken, no landmark is exposed. */
  :host([hidden]),
  :host([data-empty]) {
    display: none;
  }
  nav {
    position: relative;
    display: block;
    min-inline-size: 0;
  }

  /* ── The list (BRC-1, BRC-8, BRC-15): one line, or as many as it needs ──────────────────────────────────────── */
  /* The list is as wide as the element and asks for no width of its own: the width the trail needs is the sizer's
     to say (below), so that it is the same whether levels are out of the trail or not. */
  ol {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    box-sizing: border-box;
    inline-size: 0;
    min-inline-size: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* BRC-15: a line breaks only between two entries, and a separator is the end of its entry: it never begins a line. */
  ol.wrap {
    flex-wrap: wrap;
    row-gap: ${t('row-gap')};
  }
  li {
    display: flex;
    flex: none;
    align-items: flex-start;
    min-inline-size: 0;
  }
  ol.wrap li {
    flex: 0 1 auto;
  }
  /* BRC-8: each label on one line. (A rule on a slotted element reads that element's own cascade: only tokens.) */
  ol.collapse ::slotted(*) {
    white-space: nowrap;
  }
  /* BRC-13: a level taken out is not drawn; its anchor is still in the document. BRC-10: no level out, no button. */
  li.out,
  li.more.none {
    display: none;
  }
  /* BRC-14: the last level, cut at the end of its own direction (the element gives it dir="auto"). Only the line is
     clipped: the block axis stays open, for the hit area above and below it. */
  li.cut {
    flex: 0 1 auto;
  }
  li.cut ::slotted(*) {
    overflow-x: clip;
    text-overflow: ellipsis;
  }
  /* BRC-9, BRC-12: measured with every entry at its own width — in one task, never painted. */
  ol.measure li.level,
  ol.measure li.more {
    display: flex;
    flex: none;
  }
  ol.measure li.cut ::slotted(*) {
    overflow-x: visible;
  }
  ol.measure ::slotted(*) {
    white-space: nowrap;
  }

  /* ── A separator (BRC-6): chevron_right after every entry but the last, on the entry's last line ────────────── */
  ${iconGlyph('.separator', { size: `${PREFIX}-separator-size`, selected: ':not(*)' })}
  .separator {
    align-self: flex-end;
    margin-block-end: calc((${LINE} - ${t('separator-size')}) / 2);
    margin-inline: ${t('separator-gap')};
    color: ${t('separator-color')};
    pointer-events: none;
  }
  /* Nothing in its place until the icon set can draw it (GlyphDrawnController sets data-drawn); the box is kept. */
  .separator:not([data-drawn]),
  .more-glyph:not([data-drawn]) {
    visibility: hidden;
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* ── The overflow button (BRC-10): more_horiz in a square one line of the trail's text high ─────────────────── */
  .overflow {
    all: unset;
    --_target: var(--tanrei-sys-target-pointer);
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple can sit above the container color and below the glyph. */
    isolation: isolate;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    inline-size: ${LINE};
    block-size: ${LINE};
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    ${unsafeCSS(paint(''))}
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  @media (pointer: coarse) {
    .overflow {
      --_target: var(--tanrei-sys-target-touch);
    }
  }
  /* BRC-23: the minimum target above and below the line, and along the trail halfway to the entry beside it. */
  .overflow::before {
    content: '';
    position: absolute;
    inset-block: min(0px, calc((100% - var(--_target)) / 2));
    inset-inline: ${HALFWAY};
  }
  /* The button begins the trail (the first level is out): no entry stands before it, and its hit area ends with it. */
  li.level.out + li.more .overflow::before {
    inset-inline-start: 0;
  }
  ${iconGlyph('.more-glyph', { size: `${PREFIX}-icon-size`, selected: ':not(*)' })}

  /* BRC-16, BRC-18, BRC-19: each state paints the button from that state's tokens of the overflow part; pressed over
     focused over hovered. Pressed is data-pressed="<feedback>" (PressController). */
  ${stateRules(on, {
    hovered: `${paint('hovered-')}
    opacity: var(${PREFIX}-hovered-opacity);${stateShape('hovered-')}`,
    focused: `${paint('focused-')}
    opacity: var(${PREFIX}-focused-opacity);${stateShape('focused-')}`,
    pressed: `${paint('pressed-')}
    opacity: var(${PREFIX}-pressed-opacity);${stateShape('pressed-')}`,
    pressedContent: `${paintContent('pressed-')}
    opacity: var(${PREFIX}-pressed-opacity);${stateShape('pressed-')}`,
    disabled: '',
  })}
  ${rippleStyles({
    color: `${PREFIX}-overflow-pressed-container-color`,
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}
  /* BRC-17, BRC-20: the focus indicator around the button — the ring, or the glow — never animated. */
  ${focusRing(on)}
  /* BRC-20, corner smoothing: the shared rule, on the button (data-tanrei-shape). */
  ${shape}
  /* BRC-18: the glyph's ink carries press-hold for PressController. */
  ${pressHold('.more-glyph .ink')}

  /* ── What is measured and watched, never drawn ──────────────────────────────────────────────────────────────── */
  /* BRC-8: the width the whole trail needs on one line, as the element's own widest size — whether levels are out
     of it or not, so that a layout which gives the element the width of its content gives the room back when there
     is room again. A replaced box that is never wider than its line: where there is no room it asks for none, and an
     ancestor that keeps the least width of its content is not held open by the trail. */
  .sizer {
    display: block;
    block-size: 0;
    max-inline-size: 100%;
  }
  /* BRC-12, BRC-25: a line of the trail's text; its size changes when the text size, the text style or its face does. */
  .text-probe {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    font: ${t('label-typescale-font')};
    letter-spacing: ${t('label-typescale-letter-spacing')};
    white-space: nowrap;
    visibility: hidden;
    pointer-events: none;
  }
  /* BRC-12, BRC-26: the direction it inherits, watched. */
  ${directionProbeStyles}

  @media (prefers-reduced-motion: reduce) {
    .overflow {
      transition: none;
    }
  }
  /* BRC-24: the separators in the text color, the button's glyph in the button text color, focus in the highlight. */
  @media (forced-colors: active) {
    .separator {
      color: CanvasText;
    }
    .overflow {
      color: ButtonText;
    }
    .overflow:focus-visible {
      outline-color: Highlight;
    }
  }
`;
