import { css, unsafeCSS } from 'lit';
import { RANGE_SIZES, RANGE_VARIANTS, directionProbeStyles, rangeAxes, rangeTrackStyles } from '../../primitives/index.js';

/** The sizes every design system has; a layer may add more. The variant is not a token axis: the forms are drawn here. */
export const CORE_SIZES = RANGE_SIZES;
export const VARIANTS = RANGE_VARIANTS;
/** What the product says the value means (MTR-3, MTR-9): `default` draws the meter's own indicator color. */
export const STATUSES = ['default', 'info', 'success', 'warning', 'error'] as const;
const PREFIX = '--tanrei-comp-meter';

/** MTR-11: a size a layer adds gets its block on demand; one the active system lacks draws medium and is reported. */
export const AXES = rangeAxes(PREFIX);

const T = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);

// Every visual value is a token (tokens/comp/meter.tokens.json), which by default are the progress indicator's: the
// bar and the ring are the same drawing (src/primitives/range-track.ts — MTR-1…5, MTR-12), always determinate. What
// follows is the meter's own: the indicator color of its status (MTR-3), the change of it (MTR-6) and its forced colors
// (MTR-15).
export const styles = [
  rangeTrackStyles(PREFIX, 'var(--_indicator)'),
  directionProbeStyles,
  css`
    /* MTR-3: the indicator (and the stop indicator) in the color of the status; default — and a status the meter does
       not define (MTR-11) — in comp.meter.indicator.color. */
    :host {
      --_indicator: ${T('indicator-color')};
    }
    ${unsafeCSS(
      STATUSES.filter((status) => status !== 'default')
        .map((status) => `:host([status='${status}']) {\n      --_indicator: var(${PREFIX}-${status}-indicator-color);\n    }`)
        .join('\n    '),
    )}

    /* MTR-6: a change of value moves the end, and a change of status changes the color, over value-duration with
       value-easing — after the first frame only (a transition has nothing to run from on the first). Under reduced
       motion the end moves at once and the color still fades. */
    .determinate .indicator {
      transition-property: inset-inline-start, inline-size, stroke-dasharray, stroke-dashoffset, background-color, stroke;
    }
    .determinate .stop {
      transition-property: background-color;
      transition-duration: ${T('motion-value-duration')};
      transition-timing-function: ${T('motion-value-easing')};
    }
    @media (prefers-reduced-motion: reduce) {
      .determinate .indicator,
      .determinate .stop {
        transition: background-color ${T('motion-value-duration')} ${T('motion-value-easing')}, stroke ${T('motion-value-duration')} ${T('motion-value-easing')};
      }
    }

    /* MTR-15: with a person's own forced colors, the track is an edge sys.border.hairline wide and the indicator is
       filled, both in the text color, whatever the status — the value is still read where the indicator ends. */
    @media (forced-colors: active) {
      .bar .track,
      .bar .indicator,
      .bar .stop,
      circle {
        forced-color-adjust: none;
      }
      .bar .track {
        background: Canvas;
        box-shadow: inset 0 0 0 var(--tanrei-sys-border-hairline) CanvasText;
      }
      .bar .indicator,
      .bar .stop {
        background: CanvasText;
      }
      circle.track {
        stroke: CanvasText;
        stroke-width: var(--tanrei-sys-border-hairline);
      }
      circle.indicator {
        stroke: CanvasText;
      }
    }
  `,
];
