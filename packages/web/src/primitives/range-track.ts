import { type CSSResult, type TemplateResult, css, html, nothing, svg, unsafeCSS } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { cornerRadius, shape } from '../styles/shape.js';
import { arcStyles } from './arc.js';
import type { OpenAxis } from './axes.js';
import { separationHost, whenGap } from './separation.js';

// A value on a track, drawn as a bar or a ring: the progress indicator's determinate form (PRG-1, PRG-3…6, PRG-11,
// PRG-13, PRG-17) and the meter (MTR-1…6, MTR-10, MTR-12). Each component names its own tokens — the same members
// under its own prefix (`--tanrei-comp-<name>-linear-thickness-<size>`, `-track-color`, `-track-gap`, …) — and keeps
// what is its own: the progress indicator its indeterminate motion and its forced colors, the meter its statuses.
//
// The component writes one private input on its drawing (`.bar` / `.ring`): `--_f`, the fraction (0–1, clamped), and
// the class `between` while the value lies strictly between min and max. The styles derive `--_gap` from them: the
// track gap under a gap separation while `between`, and 0 otherwise.
//
// The track is two elements. `.under` is the divider form: the whole track, with the indicator drawn on it (no notch
// where the round end of the indicator meets the track). `.after` is the gap form: what is left of the track after the
// indicator and the gap. One of them is shown, by the separation — so a change of separation shows the other form at
// once, with no value transition to run. In `.after` a gap of 0 (nothing done, all done) still means "the track runs
// on under the indicator": its geometry uses `min(<with the gap>, var(--_gap) * 100000)`, which is 0 when the gap is 0
// and the gapped value otherwise, with no script reading a token.

/** The sizes every design system has; a layer may add more. The variant is not a token axis: the forms are drawn here. */
export const RANGE_SIZES = ['small', 'medium', 'large'] as const;
export const RANGE_VARIANTS = ['linear', 'circular'] as const;
const DEFAULT_SIZE = 'medium';
/** The members of the size axis (`dev.tanrei.axes.size.members`). */
const SIZE_MEMBERS = { bar: 'linear-thickness', ring: 'circular-size', stroke: 'circular-thickness' } as const;

const sizeBlock = (prefix: string, size: string, selector: string, fallback: string | null = null) => {
  const ref = (member: string) => (fallback ? `var(${prefix}-${member}-${size}, var(${prefix}-${member}-${fallback}))` : `var(${prefix}-${member}-${size})`);
  return `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .map(([key, member]) => `  --_${key}: ${ref(member)};`)
    .join('\n')}\n}`;
};

/** The size axis of a component drawn by `rangeTrackStyles()`: a size a layer adds gets its block on demand; one the active system lacks draws medium. */
export const rangeAxes = (prefix: `--${string}`): readonly OpenAxis[] => [
  { name: 'size', core: RANGE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(prefix, value, selector, DEFAULT_SIZE), probe: (value) => `${prefix}-linear-thickness-${value}` },
];

/** The range and value as drawn and exposed — clamped, and 0 in 0…1 when max is not greater than min. */
export function rangeOf(value: number, min: unknown, max: unknown): { min: number; max: number; now: number; fraction: number } {
  const [low, high] = [Number(min ?? 0), Number(max ?? 1)];
  if (!(high > low)) return { min: 0, max: 1, now: 0, fraction: 0 };
  const now = Math.min(high, Math.max(low, value));
  return { min: low, max: high, now, fraction: (now - low) / (high - low) };
}

/** The classes of a drawing at a fraction; the component adds its own (`indeterminate`, `paused`). */
export const rangeClasses = (fraction: number, determinate = true) => ({
  determinate,
  // The gap is left only while the value lies strictly between min and max (and the separation is gap).
  between: determinate && fraction > 0 && fraction < 1,
  empty: determinate && fraction === 0,
  full: determinate && fraction === 1,
});

/** The bar: the track twice (both forms), the indicator and — when `stop` — the stop indicator. */
export function renderRangeBar(classes: Record<string, boolean>, fraction: number, stop: boolean): TemplateResult {
  return html`
    <div class=${classMap({ bar: true, ...classes })} style=${styleMap({ '--_f': String(fraction) })} data-tanrei-shape>
      <div part="track" class="track under" data-tanrei-shape></div>
      <div part="track" class="track after" data-tanrei-shape></div>
      <div part="indicator" class="indicator" data-tanrei-shape></div>
      ${stop ? html`<div part="stop-indicator" class="stop"></div>` : nothing}
    </div>
  `;
}

/**
 * The ring. The track is drawn twice — whole, under the indicator (divider), and after the gap (gap) — and the styles
 * show one, so that a change of separation shows the other form at once, with nothing to move from.
 */
export function renderRangeRing(classes: Record<string, boolean>, fraction: number): TemplateResult {
  const circles = svg`<circle part="track" class="track under"></circle><circle part="track" class="track after"></circle><circle part="indicator" class="indicator"></circle>`;
  return html`
    <div class=${classMap({ ring: true, ...classes })} style=${styleMap({ '--_f': String(fraction) })}>
      <div class="spin">
        <svg aria-hidden="true" focusable="false">${circles}</svg>
        <div class="caps"><svg aria-hidden="true" focusable="false">${circles}</svg></div>
      </div>
    </div>
  `;
}

/**
 * The drawing of a value on a track, from the component's tokens under `prefix`. `indicator` is the color the
 * indicator and the stop indicator are drawn in (the component's `indicator-color`, unless it has a choice of its own).
 * The component's own rules follow these in its sheet.
 */
export function rangeTrackStyles(prefix: `--${string}`, indicator = `var(${prefix}-indicator-color)`): CSSResult {
  const T = (name: string) => unsafeCSS(`var(${prefix}-${name})`);
  const color = unsafeCSS(indicator);
  return css`
    :host {
      /* A bar (linear, the default, and what an unknown variant draws) of the size's thickness across the full inline
         size its layout gives it, in block flow, a flex column or a grid. */
      display: block;
      position: relative;
      box-sizing: border-box;
      align-self: stretch;
      justify-self: stretch;
      block-size: var(--_bar);
    }
    :host([hidden]) {
      display: none;
    }
    /* The separation it draws — its attribute's, else the component's track.separation's. */
    ${separationHost(`${prefix}-track-separation`)}
    ${unsafeCSS(sizeBlock(prefix, DEFAULT_SIZE, ':host'))}
    ${unsafeCSS(RANGE_SIZES.filter((s) => s !== DEFAULT_SIZE).map((s) => sizeBlock(prefix, s, `:host([size='${s}'])`)).join('\n'))}
    /* Circular: a ring whose outer edge fills the size's square. */
    :host([variant='circular']) {
      display: inline-block;
      vertical-align: middle;
      align-self: auto;
      justify-self: auto;
      inline-size: var(--_ring);
      block-size: var(--_ring);
    }

    /* ── The bar ─────────────────────────────────────────────────────────────────────────────────────────── */
    /* The divider form (the first value of the choice, and so what an unknown name draws) — no gap, the whole track
       under the indicator. The gap form is at the end of this sheet. */
    .bar,
    .ring {
      --_gap: 0px;
    }
    .track.after {
      display: none;
    }
    .bar {
      position: relative;
      inline-size: 100%;
      block-size: 100%;
      ${unsafeCSS(cornerRadius(`${prefix}-track-shape`))}
    }
    /* The ends of the track and of the indicator are rounded by track.shape; the browser clamps a radius to half the
       thickness. Along the inline axis, so RTL fills from the right. */
    .bar .track,
    .bar .indicator {
      position: absolute;
      inset-block: 0;
      ${unsafeCSS(cornerRadius(`${prefix}-track-shape`))}
    }
    .bar .track {
      background: ${T('track-color')};
      inset-inline-start: min(calc(var(--_f) * 100% + var(--_gap)), calc(var(--_gap) * 100000));
      inset-inline-end: 0;
    }
    .bar .indicator {
      background: ${color};
      inset-inline-start: 0;
      inline-size: calc(var(--_f) * 100%);
    }
    /* A value change moves the indicator's end (and the gap after it) over value-duration with value-easing. */
    .determinate .track,
    .determinate .indicator {
      transition-property: inset-inline-start, inline-size, stroke-dasharray, stroke-dashoffset;
      transition-duration: ${T('motion-value-duration')};
      transition-timing-function: ${T('motion-value-easing')};
    }
    /* The stop indicator, a dot in the indicator color at the track's end, concentric with its rounded end, and never
       larger than the bar is thick — under either separation, so its size alone decides whether it shows (0 draws
       none). At max the indicator covers it, and it is not drawn. */
    .bar .stop {
      --_stop: min(${T('stop-indicator-size')}, var(--_bar));
      position: absolute;
      inset-block-start: calc(50% - var(--_stop) / 2);
      inset-inline-end: calc(var(--_bar) / 2 - var(--_stop) / 2);
      inline-size: var(--_stop);
      block-size: var(--_stop);
      border-radius: 50%;
      background: ${color};
    }
    .bar.full .stop {
      display: none;
    }

    /* ── The ring ────────────────────────────────────────────────────────────────────────────────────────── */
    /* How far a round cap reaches past a dash's end, on both ends together: the stroke width — or 0 where track.shape
       is sys.shape.corner.none (square caps). The circle's geometry and --_c, its circumference, are arcStyles'. */
    .ring {
      --_cap: min(var(--_stroke), calc(${T('track-shape')} * 100000));
      position: absolute;
      inset: 0;
    }
    ${arcStyles}
    /* Round caps are a second drawing of the same dashes, shown only where track.shape is not none: the square-capped
       drawing underneath is what remains when it is. */
    .ring .caps {
      position: absolute;
      inset-block-start: 0;
      inset-inline-start: 0;
      block-size: 100%;
      inline-size: min(100%, calc(${T('track-shape')} * 100000));
      overflow: hidden;
    }
    .ring .caps svg {
      inline-size: var(--_ring);
      block-size: var(--_ring);
    }
    .ring .caps circle {
      stroke-linecap: round;
    }
    /* A dash is shortened by the caps and moved forward by half of them, so what is drawn — caps included — covers
       exactly its arc. On a ring the track leaves the gap at both ends of the indicator's arc. */
    circle.track {
      stroke: ${T('track-color')};
      stroke-dasharray: max(0px, calc(var(--_c) - var(--_f) * var(--_c) - 2 * var(--_gap) - var(--_cap)), calc(var(--_c) - var(--_gap) * 100000)) var(--_c);
      stroke-dashoffset: calc(-1 * min(calc(var(--_f) * var(--_c) + var(--_gap) + var(--_cap) / 2), calc(var(--_gap) * 100000)));
    }
    circle.indicator {
      stroke: ${color};
      stroke-dasharray: max(0px, calc(var(--_f) * var(--_c) - var(--_cap))) var(--_c);
      stroke-dashoffset: calc(var(--_cap) / -2);
    }
    /* All of the range: the indicator is the whole circle, its ends overlapping at the top — shortened by its caps,
       the two antialiased ends would meet there and leave a seam. */
    .ring.full {
      --_cap: 0px;
    }
    /* Nothing of it draws no indicator (a zero-length dash would still draw its round caps). */
    .empty circle.indicator,
    .empty .indicator {
      visibility: hidden;
    }
    .spin {
      position: absolute;
      inset: 0;
    }

    ${shape}

    /* The gap form — while determinate, track.gap of empty space between the indicator and the rest of the track
       while the value lies strictly between min and max (on a ring at both ends of the arc: the track's dashes above). */
    ${whenGap(
      ':is(.bar, .ring)',
      (drawing) => `
    ${drawing}.determinate .track.under {
      display: none;
    }
    ${drawing}.determinate .track.after {
      display: block;
    }
    ${drawing}.between {
      --_gap: var(${prefix}-track-gap);
    }`,
    )}

    /* Under reduced motion a value change shows at once. */
    @media (prefers-reduced-motion: reduce) {
      .determinate .track,
      .determinate .indicator {
        transition: none;
      }
    }
  `;
}
