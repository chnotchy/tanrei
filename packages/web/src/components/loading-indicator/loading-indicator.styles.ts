import { css, unsafeCSS } from 'lit';
import { type OpenAxis, arcStyles } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

/** The sizes every design system has; a layer may add more. */
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_SIZE = 'medium';
const PREFIX = '--tanrei-comp-loading-indicator';
/** The members of the size axis (`dev.tanrei.axes.size.members`). */
const SIZE_MEMBERS = { ring: 'indicator-size', stroke: 'indicator-thickness', container: 'container-size' } as const;

const ref = (member: string, size: string, fallback: string | null) =>
  fallback ? `var(${PREFIX}-${member}-${size}, var(${PREFIX}-${member}-${fallback}))` : `var(${PREFIX}-${member}-${size})`;
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .map(([key, member]) => `  --_${key}: ${ref(member, size, fallback)};`)
    .join('\n')}\n}`;

/** LDG-9: a size a layer adds gets its block on demand; one the active system lacks draws medium and is reported. */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-indicator-size-${value}` },
];

const T = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);

// Every visual value is a token (tokens/comp/loading-indicator.tokens.json): per size the indicator's square, its
// stroke and the container's square; the indicator color on the surface, and — contained — the container's color,
// elevation and shape and the indicator color on it; the length of one turn; the show delay and the entrance's duration
// and curve (its kind is read by the element, loading-indicator.ts).
export const styles = css`
  :host {
    /* LDG-2: not contained, the component is exactly its indicator's square. */
    display: inline-block;
    position: relative;
    flex: none;
    vertical-align: middle;
    inline-size: var(--_ring);
    block-size: var(--_ring);
    --_color: ${T('indicator-color')};
  }
  :host([hidden]) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((s) => s !== DEFAULT_SIZE).map((s) => sizeBlock(s, `:host([size='${s}'])`)).join('\n'))}

  /* LDG-3: contained, a raised, filled container of the size's container square, the indicator centered in it. */
  :host([contained]) {
    inline-size: var(--_container);
    block-size: var(--_container);
    --_color: ${T('contained-indicator-color')};
  }
  .container {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  :host([contained]) .container {
    background: ${T('contained-container-color')};
    box-shadow: ${T('contained-container-elevation')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
  }
  ${shape}

  /* LDG-1: a quarter of the circle with round caps, whose outer edge touches the indicator's square, turning clockwise
     once per cycle at constant speed; no track. The dash is shortened by the caps and moved forward by half of them,
     so the arc as drawn — caps included — is a quarter. */
  .indicator {
    position: relative;
    inline-size: var(--_ring);
    block-size: var(--_ring);
    animation: ring-turn ${T('motion-cycle-duration')} var(--tanrei-sys-motion-easing-linear) infinite;
  }
  ${arcStyles}
  circle {
    stroke: var(--_color);
    stroke-linecap: round;
    stroke-dasharray: max(0px, calc(var(--_c) / 4 - var(--_stroke))) var(--_c);
    stroke-dashoffset: calc(var(--_stroke) / -2);
  }

  /* LDG-4: under reduced motion it does not turn — the whole circle, its opacity easing from 1 to 0 and back once per
     cycle with sys.motion.easing.standard; a container stays still and opaque. */
  @media (prefers-reduced-motion: reduce) {
    .indicator {
      animation: pulse ${T('motion-cycle-duration')} var(--tanrei-sys-motion-easing-standard) infinite;
    }
    circle {
      stroke-dasharray: none;
      stroke-dashoffset: 0;
    }
  }

  /* LDG-7: off screen, nothing runs. */
  :host .paused {
    animation-play-state: paused;
  }

  /* LDG-11: during the show delay the box is kept (the host's size) and nothing is drawn — no indicator, no container,
     no shadow — and nothing runs; the turn (or the pulse) starts from its beginning when it is shown (LDG-12). */
  .waiting {
    visibility: hidden;
  }
  .waiting .indicator {
    animation: none;
  }

  /* LDG-14: the tokens' show delay, enter duration and enter easing, computed through inert properties of a probe the
     element reads as it is inserted. */
  .timing {
    display: none;
    transition-property: none;
    transition-delay: ${T('motion-show-delay')};
    transition-duration: ${T('motion-enter-duration')};
    transition-timing-function: ${T('motion-enter-easing')};
  }

  @media (forced-colors: active) {
    circle {
      forced-color-adjust: none;
      stroke: CanvasText;
    }
    :host([contained]) .container {
      forced-color-adjust: none;
      background: Canvas;
      outline: var(--tanrei-sys-border-hairline) solid CanvasText;
    }
  }
`;
