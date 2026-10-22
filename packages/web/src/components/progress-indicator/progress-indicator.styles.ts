import { css, unsafeCSS } from 'lit';
import { RANGE_SIZES, RANGE_VARIANTS, rangeAxes, rangeTrackStyles } from '../../primitives/index.js';

/** The sizes every design system has; a layer may add more. The variant is not a token axis: the forms are drawn here. */
export const CORE_SIZES = RANGE_SIZES;
export const VARIANTS = RANGE_VARIANTS;
const PREFIX = '--tanrei-comp-progress-indicator';

/** PRG-12: a size a layer adds gets its block on demand; one the active system lacks draws medium and is reported. */
export const AXES = rangeAxes(PREFIX);

const T = (name: string) => `var(${PREFIX}-${name})`;

// Every visual value is a token (tokens/comp/progress-indicator.tokens.json). The determinate drawing — the bar and
// the ring, their sizes (PRG-3), colors and ends (PRG-4), the gap and the stop indicator (PRG-5), a value change
// (PRG-6), the separation (PRG-17) — is the one the meter draws too (src/primitives/range-track.ts). What follows is the
// progress indicator's own: the indeterminate motion (PRG-2), its reduced-motion form (PRG-7), its pause off screen
// (PRG-14) and its forced colors.
export const styles = [
  rangeTrackStyles(PREFIX),
  css`
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

    /* PRG-2, a ring: an arc a quarter of the circle long turns clockwise once per cycle at constant speed. */
    .ring.indeterminate circle.indicator {
      stroke-dasharray: max(0px, calc(var(--_c) / 4 - var(--_cap))) var(--_c);
    }
    .ring.indeterminate .spin {
      animation: ring-turn ${unsafeCSS(T('motion-cycle-duration'))} var(--tanrei-sys-motion-easing-linear) infinite;
    }

    /* PRG-7: under reduced motion (a value change shows at once: the shared drawing) the indeterminate form stands
       still — the indicator over the whole track, its opacity easing from 1 to 0 and back once per cycle, over a track
       that does not move. */
    @media (prefers-reduced-motion: reduce) {
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
  `,
];
