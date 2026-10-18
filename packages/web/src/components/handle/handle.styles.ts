import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusRing, minimumTarget, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/handle.tokens.json). The box (`.container`) carries the states, as
// Button's does; the line is the capsule (`.capsule`, a box with round ends) or the arc (`.arc`, an SVG circle drawn a
// quarter of the way round by its dash). What a state changes is written as custom properties on the box and read by the
// line: `--_c` the box's color, `--_l` the line's, `--_l-len` / `--_l-thk` its length and thickness, `--_shown` whether
// it is in sight.

/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_SIZES = ['small', 'medium'] as const;
const DEFAULT_SIZE = 'medium';
/** The axes and the corners the component defines (HDL-20: anything else is drawn as the first). */
export const AXES_OF_RESIZE = ['vertical', 'horizontal', 'both'] as const;
export const CORNERS = ['bottom-end', 'bottom-start', 'top-end', 'top-start'] as const;

const PREFIX = '--tanrei-comp-handle';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: string, size: string, fallback: string | null) => (fallback ? `var(${PREFIX}-${name}-${size}, var(${PREFIX}-${name}-${fallback}))` : `var(${PREFIX}-${name}-${size})`);

/** Per size (HDL-1 to HDL-3): the box, the line at rest and while it is used, and the arc's radius. */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) => `${selector} {
  --_box-len: ${ref('container-length', size, fallback)};
  --_box-br: ${ref('container-breadth', size, fallback)};
  --_len: ${ref('line-length', size, fallback)};
  --_thk: ${ref('line-thickness', size, fallback)};
  --_len-a: ${ref('line-active-length', size, fallback)};
  --_thk-a: ${ref('line-active-thickness', size, fallback)};
  --_radius: ${ref('arc-radius', size, fallback)};
}`;

/** HDL-20: a size a layer added gets its block on demand; one the active system lacks is drawn as medium and reported. */
export const AXES: readonly OpenAxis[] = [{ name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-length-${value}` }];

/** The box's and the line's colors in every state, as `--_c-h` (box, hovered), `--_l-p` (line, pressed)… */
const STATES = { '': '-r', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
const stateColors = Object.entries(STATES)
  .flatMap(([state, suffix]) => [`  --_c${suffix}: var(${PREFIX}-standard-${state ? `${state}-` : ''}container-color);`, `  --_l${suffix}: var(${PREFIX}-standard-${state ? `${state}-` : ''}line-color);`])
  .join('\n');

/** Where each state is read: on the box while it takes input. A disabled box answers nothing (HDL-15). */
const on = (state: string) => `.container:not(.disabled)${state}`;
/** What a state paints: the box (unless the press answer keeps it), the line's color, and, while used, its larger form. */
const paint = (suffix: string, { box = true, active = false } = {}) => `${box ? `\n    --_c: var(--_c${suffix});` : ''}
    --_l: var(--_l${suffix});${active ? '\n    --_l-len: var(--_len-a);\n    --_l-thk: var(--_thk-a);' : ''}`;

const STATE_MOTION = `${T('motion-state-duration')} ${T('motion-state-easing')}`;

export const styles = css`
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}

  /* HDL-3: the handle takes no room but its box's; the component it stands on, or the product, places it. HDL-6: nothing
     of it is ever selected as text. */
  :host {
    display: inline-block;
    vertical-align: top;
    -webkit-user-select: none;
    user-select: none;
  }
  :host([hidden]) {
    display: none;
  }

  /* HDL-3: the box — a pill of container.length × container.breadth across the line, turned for a width, a square of
     container.breadth at its corner for an arc — in the box color of its state (clear at rest), corners eased by the
     smoothing (HDL-13), no elevation. HDL-6: a press on it never pans or zooms the page. */
  .container {
    ${unsafeCSS(stateColors)}
    --_c: var(--_c-r);
    --_l: var(--_l-r);
    --_l-len: var(--_len);
    --_l-thk: var(--_thk);
    --_shown: 1;
    all: unset;
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--_box-len);
    block-size: var(--_box-br);
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    background-color: var(--_c);
    opacity: 1;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  .container.horizontal {
    inline-size: var(--_box-br);
    block-size: var(--_box-len);
  }
  .container.both {
    inline-size: var(--_box-br);
    block-size: var(--_box-br);
  }

  /* HDL-5: the platform's resize cursor for the axis — the diagonal one through the corner, mirrored in right-to-left
     (HDL-17) — over the whole target; none while disabled. */
  .container.vertical {
    cursor: ns-resize;
  }
  .container.horizontal {
    cursor: ew-resize;
  }
  .container.both:is(.bottom-end, .top-start) {
    cursor: nwse-resize;
  }
  .container.both:is(.bottom-start, .top-end) {
    cursor: nesw-resize;
  }
  :host(:dir(rtl)) .container.both:is(.bottom-end, .top-start) {
    cursor: nesw-resize;
  }
  :host(:dir(rtl)) .container.both:is(.bottom-start, .top-end) {
    cursor: nwse-resize;
  }
  .container.disabled {
    cursor: default;
  }

  /* HDL-1: the capsule, centred in the box, lying across the axis it resizes, with round ends whatever the smoothing.
     HDL-4: it grows about its centre. */
  .capsule {
    display: block;
    flex: none;
    inline-size: var(--_l-len);
    block-size: var(--_l-thk);
    --tanrei-corner-radius: var(--tanrei-sys-shape-corner-full);
    --tanrei-corner-pill: 1;
    background-color: var(--_l);
    opacity: var(--_shown);
    pointer-events: none;
    transition-property: inline-size, block-size, background-color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  .horizontal .capsule {
    inline-size: var(--_l-thk);
    block-size: var(--_l-len);
  }

  /* HDL-2: the arc — a quarter of a circle of arc.radius with round ends, bowed toward its corner, its centre arc.radius
     plus inset in from that corner's two edges. It is drawn for the bottom-end corner of a left-to-right layout (the
     circle's first quarter runs from its right to its bottom) and turned to the others by mirroring the drawing (HDL-17:
     the end corners are at the left in right-to-left). HDL-4: it grows only thicker, at the same radius. */
  .arc {
    --_sx: 1;
    --_sy: 1;
    --_dir: 1;
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    opacity: var(--_shown);
    pointer-events: none;
    transform: scale(calc(var(--_sx) * var(--_dir)), var(--_sy));
    transition: opacity ${unsafeCSS(STATE_MOTION)};
  }
  .bottom-start .arc,
  .top-start .arc {
    --_sx: -1;
  }
  .top-end .arc,
  .top-start .arc {
    --_sy: -1;
  }
  :host(:dir(rtl)) .arc {
    --_dir: -1;
  }
  .arc circle {
    --_from-edge: calc(var(--_box-br) - var(--_radius) - ${t('inset')});
    cx: var(--_from-edge);
    cy: var(--_from-edge);
    r: var(--_radius);
    fill: none;
    stroke: var(--_l);
    stroke-width: var(--_l-thk);
    stroke-linecap: round;
    stroke-dasharray: calc(pi * var(--_radius) / 2) calc(pi * var(--_radius) * 2);
    transition-property: stroke-width, stroke;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }

  /* HDL-5: the target reaches sys.target.pointer for a fine pointer and sys.target.touch for a coarse one, centred on the
     box, without changing what is drawn. */
  ${minimumTarget('.container')}

  /* HDL-4, HDL-12: each state paints the box, the line and the opacity from that state's tokens, pressed over focused
     over hovered; under a fine pointer and a press the line takes its larger form. */
  ${stateRules(on, {
    hovered: `${paint('-h', { active: true })}
    opacity: ${T('hovered-opacity')};`,
    focused: `${paint('-f')}
    opacity: ${T('focused-opacity')};`,
    pressed: `${paint('-p', { active: true })}
    opacity: ${T('pressed-opacity')};`,
    pressedContent: `${paint('-p', { box: false, active: true })}
    opacity: ${T('pressed-opacity')};`,
    disabled: '',
  })}
  /* HDL-11: the pressed form appears without delay. */
  .container[data-pressed]:not([data-pressed='none']) :is(.capsule, .arc, .arc circle) {
    transition-duration: 0s;
  }
  /* HDL-15: disabled draws from the disabled tokens and answers nothing. */
  .container.disabled {
    --_c: var(--_c-d);
    --_l: var(--_l-d);
    opacity: ${t('disabled-opacity')};
  }

  /* HDL-23, HDL-25: out of sight at rest where the primary pointer hovers and revealed is false; in sight while a fine
     pointer is over it, while it has keyboard focus and while a press (held for press-hold) or a drag holds it. */
  @media (hover: hover) {
    .container:not(.revealed) {
      --_shown: 0;
    }
    .container:not(.revealed):is(:not(.disabled):hover, :focus-visible, [data-pressed], .dragging) {
      --_shown: 1;
    }
  }

  /* HDL-12: the ripple grows over motion.feedback-duration and fades over motion.state-duration. */
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  /* HDL-13, HDL-14: the ring (or the glow) around the box, sys.focus.offset outside it, never animated. */
  ${focusRing(on)}
  ${pressHold('.hold')}
  .hold {
    display: none;
  }
  ${shape}

  @media (prefers-reduced-motion: reduce) {
    .container,
    .capsule,
    .arc,
    .arc circle {
      transition: none;
    }
  }

  /* HDL-16: the person's colors — the line in ButtonText, Highlight under a fine pointer and a press, GrayText while
     disabled; no fill in the box; the focus indicator in Highlight. */
  @media (forced-colors: active) {
    .container {
      --_c: transparent;
      background-color: transparent;
    }
    .capsule,
    .arc {
      forced-color-adjust: none;
      --_l: ButtonText;
    }
    @media (hover: hover) {
      .container:not(.disabled):hover :is(.capsule, .arc) {
        --_l: Highlight;
      }
    }
    .container:not(.disabled)[data-pressed] :is(.capsule, .arc),
    .container.dragging :is(.capsule, .arc) {
      --_l: Highlight;
    }
    .container.disabled :is(.capsule, .arc) {
      --_l: GrayText;
    }
    .container:focus-visible {
      outline-color: Highlight;
    }
  }
`;
