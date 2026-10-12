import { css, unsafeCSS } from 'lit';
import { type OpenAxis, arcStyles, separationHost, whenGap } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

/** The sizes every design system has; a layer may add more. The variant is not a token axis: the forms are drawn here. */
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
export const VARIANTS = ['linear', 'circular'] as const;
const DEFAULT_SIZE = 'medium';
const PREFIX = '--tanrei-comp-progress-indicator';
/** The members of the size axis (`dev.tanrei.axes.size.members`). */
const SIZE_MEMBERS = { bar: 'linear-thickness', ring: 'circular-size', stroke: 'circular-thickness' } as const;

const ref = (member: string, size: string, fallback: string | null) =>
  fallback ? `var(${PREFIX}-${member}-${size}, var(${PREFIX}-${member}-${fallback}))` : `var(${PREFIX}-${member}-${size})`;
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .map(([key, member]) => `  --_${key}: ${ref(member, size, fallback)};`)
    .join('\n')}\n}`;

/** PRG-12: a size a layer adds gets its block on demand; one the active system lacks draws medium and is reported. */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-linear-thickness-${value}` },
];

const T = (name: string) => `var(${PREFIX}-${name})`;

// Every visual value is a token (tokens/comp/progress-indicator.tokens.json). The component writes one private input
// on its drawing (`.bar` / `.ring`): `--_f`, the fraction done (0–1, clamped), and the class `between` while the value
// lies strictly between min and max. The styles derive `--_gap` from them: the track gap under a gap separation while
// `between` (PRG-5), and 0 otherwise.
//
// The track is two elements. `.under` is the divider form: the whole track, with the indicator drawn on it (no notch
// where the round end of the indicator meets the track). `.after` is the gap form: what is left of the track after the
// indicator and the gap. One of them is shown, by the separation (PRG-17) — so a change of separation shows the other
// form at once, with no value transition to run. In `.after` a gap of 0 (nothing done, all done) still means "the track
// runs on under the indicator": its geometry uses `min(<with the gap>, var(--_gap) * 100000)`, which is 0 when the gap
// is 0 and the gapped value otherwise, with no script reading a token.
export const styles = css`
  :host {
    /* PRG-3, linear (the default, and what an unknown variant draws — PRG-12): a bar of the size's thickness across the
       full inline size its layout gives it, in block flow, a flex column or a grid. */
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
  /* PRG-17: the separation it draws — its attribute's, else comp.progress-indicator.track.separation's. */
  ${separationHost(`${PREFIX}-track-separation`)}
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((s) => s !== DEFAULT_SIZE).map((s) => sizeBlock(s, `:host([size='${s}'])`)).join('\n'))}
  /* PRG-3, circular: a ring whose outer edge fills the size's square. */
  :host([variant='circular']) {
    display: inline-block;
    vertical-align: middle;
    align-self: auto;
    justify-self: auto;
    inline-size: var(--_ring);
    block-size: var(--_ring);
  }

  /* ── The bar ─────────────────────────────────────────────────────────────────────────────────────────── */
  /* PRG-5, PRG-17: the divider form (the first value of the choice, and so what an unknown name draws) — no gap, the
     whole track under the indicator. The gap form is at the end of this sheet. */
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
    ${unsafeCSS(cornerRadius(`${PREFIX}-track-shape`))}
  }
  /* PRG-4: the ends of the track and of the indicator are rounded by track.shape; the browser clamps a radius to half
     the thickness. Along the inline axis, so RTL fills from the right (PRG-13). */
  .bar .track,
  .bar .indicator {
    position: absolute;
    inset-block: 0;
    ${unsafeCSS(cornerRadius(`${PREFIX}-track-shape`))}
  }
  .bar .track {
    background: ${unsafeCSS(T('track-color'))};
    inset-inline-start: min(calc(var(--_f) * 100% + var(--_gap)), calc(var(--_gap) * 100000));
    inset-inline-end: 0;
  }
  .bar .indicator {
    background: ${unsafeCSS(T('indicator-color'))};
    inset-inline-start: 0;
    inline-size: calc(var(--_f) * 100%);
  }
  /* PRG-6: a value change moves the indicator's end (and the gap after it) over value-duration with value-easing. */
  .determinate .track,
  .determinate .indicator {
    transition-property: inset-inline-start, inline-size, stroke-dasharray, stroke-dashoffset;
    transition-duration: ${unsafeCSS(T('motion-value-duration'))};
    transition-timing-function: ${unsafeCSS(T('motion-value-easing'))};
  }
  /* PRG-5: the stop indicator, a dot in the indicator color at the track's end, concentric with its rounded end, and
     never larger than the bar is thick — under either separation, so its size alone decides whether it shows (0 draws
     none). At max the indicator covers it, and it is not drawn. */
  .bar .stop {
    --_stop: min(${unsafeCSS(T('stop-indicator-size'))}, var(--_bar));
    position: absolute;
    inset-block-start: calc(50% - var(--_stop) / 2);
    inset-inline-end: calc(var(--_bar) / 2 - var(--_stop) / 2);
    inline-size: var(--_stop);
    block-size: var(--_stop);
    border-radius: 50%;
    background: ${unsafeCSS(T('indicator-color'))};
  }
  .bar.full .stop {
    display: none;
  }
  /* PRG-2, a bar: a segment two fifths of the track long crosses from beyond its start to beyond its end once per
     cycle, clipped to the track. It is moved by a transform alone — its own length back (two fifths of the track) to
     two and a half of its lengths on (the whole track) — so no frame of it lays anything out: an inset would be laid
     out sixty times a second for as long as the bar is shown. --_way is the inline direction (PRG-13). */
  .bar.indeterminate {
    overflow: hidden;
    --_way: 1;
  }
  :host(:dir(rtl)) .bar.indeterminate {
    --_way: -1;
  }
  .bar.indeterminate .track {
    inset-inline-start: 0;
  }
  .bar.indeterminate .indicator {
    inline-size: 40%;
    animation: bar-cross ${unsafeCSS(T('motion-cycle-duration'))} ${unsafeCSS(T('motion-cycle-easing'))} infinite;
  }
  @keyframes bar-cross {
    from {
      transform: translateX(calc(var(--_way) * -100%));
    }
    to {
      transform: translateX(calc(var(--_way) * 250%));
    }
  }

  /* ── The ring ────────────────────────────────────────────────────────────────────────────────────────── */
  /* The circumference of the stroke's center line, and how far a round cap reaches past a dash's end on both ends
     together: the stroke width — or 0 where track.shape is sys.shape.corner.none (PRG-4: square caps). */
  /* How far a round cap reaches past a dash's end, on both ends together: the stroke width — or 0 where track.shape is
     sys.shape.corner.none (PRG-4: square caps). The circle's geometry and --_c, its circumference, are arcStyles'. */
  .ring {
    --_cap: min(var(--_stroke), calc(${unsafeCSS(T('track-shape'))} * 100000));
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
    inline-size: min(100%, calc(${unsafeCSS(T('track-shape'))} * 100000));
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
     exactly its arc. PRG-5: on a ring the track leaves the gap at both ends of the indicator's arc. */
  circle.track {
    stroke: ${unsafeCSS(T('track-color'))};
    stroke-dasharray: max(0px, calc(var(--_c) - var(--_f) * var(--_c) - 2 * var(--_gap) - var(--_cap)), calc(var(--_c) - var(--_gap) * 100000)) var(--_c);
    stroke-dashoffset: calc(-1 * min(calc(var(--_f) * var(--_c) + var(--_gap) + var(--_cap) / 2), calc(var(--_gap) * 100000)));
  }
  circle.indicator {
    stroke: ${unsafeCSS(T('indicator-color'))};
    stroke-dasharray: max(0px, calc(var(--_f) * var(--_c) - var(--_cap))) var(--_c);
    stroke-dashoffset: calc(var(--_cap) / -2);
  }
  /* All done: the indicator is the whole circle, its ends overlapping at the top — shortened by its caps, the two
     antialiased ends would meet there and leave a seam. */
  .ring.full {
    --_cap: 0px;
  }
  /* Nothing done draws no indicator (a zero-length dash would still draw its round caps). */
  .empty circle.indicator,
  .empty .indicator {
    visibility: hidden;
  }
  /* PRG-2, a ring: an arc a quarter of the circle long turns clockwise once per cycle at constant speed. */
  .ring.indeterminate circle.indicator {
    stroke-dasharray: max(0px, calc(var(--_c) / 4 - var(--_cap))) var(--_c);
  }
  .ring.indeterminate .spin {
    animation: ring-turn ${unsafeCSS(T('motion-cycle-duration'))} var(--tanrei-sys-motion-easing-linear) infinite;
  }
  .spin {
    position: absolute;
    inset: 0;
  }

  ${shape}

  /* PRG-5, PRG-17: the gap form — while determinate, track.gap of empty space between the indicator and the rest of the
     track while the value lies strictly between min and max (on a ring at both ends of the arc: the track's dashes
     above). An indeterminate indicator is drawn the same under either separation. */
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
    --_gap: ${T('track-gap')};
  }`,
  )}

  /* PRG-7: under reduced motion a value change shows at once, and the indeterminate form stands still — the indicator
     over the whole track, its opacity easing from 1 to 0 and back once per cycle, over a track that does not move. */
  @media (prefers-reduced-motion: reduce) {
    .determinate .track,
    .determinate .indicator {
      transition: none;
    }
    .bar.indeterminate .indicator {
      inset-inline-start: 0;
      inline-size: 100%;
    }
    .ring.indeterminate circle.indicator {
      stroke-dasharray: none;
      stroke-dashoffset: 0;
    }
    .bar.indeterminate .indicator,
    .ring.indeterminate circle.indicator {
      animation: pulse ${unsafeCSS(T('motion-cycle-duration'))} ${unsafeCSS(T('motion-cycle-easing'))} infinite;
    }
    .ring.indeterminate .spin {
      animation: none;
    }
  }

  /* PRG-14: off screen, nothing runs — over every animation above, the reduced-motion pulse included. */
  :host .paused .indicator,
  :host .paused .spin {
    animation-play-state: paused;
  }

  @media (forced-colors: active) {
    .bar .track,
    .bar .indicator,
    .bar .stop,
    circle {
      forced-color-adjust: none;
    }
    .bar .track {
      background: GrayText;
    }
    .bar .indicator,
    .bar .stop {
      background: Highlight;
    }
    circle.track {
      stroke: GrayText;
    }
    circle.indicator {
      stroke: Highlight;
    }
  }
`;
