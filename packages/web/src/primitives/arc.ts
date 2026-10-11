import { css } from 'lit';

/**
 * A ring drawn with SVG circles (PRG-1…3 and LDG-1: the progress indicator's ring and the loading indicator's arc). The
 * component sets two private lengths on an ancestor of its `<svg>`: `--_ring`, the square the ring's OUTER edge fills,
 * and `--_stroke`, the stroke width; this gives every `circle` in the shadow root its center, its radius
 * (`(ring − stroke) / 2`) and its stroke, and `--_c`, the circumference of the stroke's center line, for dashes.
 *
 * An `<svg>` is turned back a quarter, so a circle's path — which starts at three o'clock and runs clockwise — starts
 * at the top. SVG is never mirrored by the direction: a ring turns clockwise in every language (PRG-13, LDG-8).
 *
 * Two keyframes: `ring-turn`, one clockwise turn (run it with `sys.motion.easing.linear` for constant speed), and
 * `pulse`, the reduced-motion form — opacity from 1 to 0 and back to 1 (LDG-4, PRG-7).
 */
export const arcStyles = css`
  svg {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    transform: rotate(-90deg);
  }
  circle {
    --_c: calc(pi * (var(--_ring) - var(--_stroke)));
    cx: 50%;
    cy: 50%;
    r: calc(50% - var(--_stroke) / 2);
    fill: none;
    stroke-width: var(--_stroke);
  }
  @keyframes ring-turn {
    from {
      rotate: 0deg;
    }
    to {
      rotate: 360deg;
    }
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
`;
