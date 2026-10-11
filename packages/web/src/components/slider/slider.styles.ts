import { css, unsafeCSS } from 'lit';
import { type OpenAxis, conditionBlock, directionProbeStyles, focusRing, minimumTarget, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

/** The sizes every design system has; a layer may add more. */
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_SIZE = 'small';
const PREFIX = '--tanrei-comp-slider';
const T = (name: string) => `var(${PREFIX}-${name})`;

/**
 * The members of the size axis (`dev.tanrei.axes.size.members`): the track's thickness and corners, the handle's height
 * and the stop dots' size.
 */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) => {
  const ref = (member: string, suffix = '') =>
    fallback ? `var(${PREFIX}-${member}-${size}${suffix}, var(${PREFIX}-${member}-${fallback}${suffix}))` : `var(${PREFIX}-${member}-${size}${suffix})`;
  return `${selector} {
  --_th: ${ref('track-thickness')};
  --_ts: ${ref('track-shape')};
  --_ts-pill: ${fallback ? `var(${PREFIX}-track-shape-${size}-pill, var(${PREFIX}-track-shape-${fallback}-pill, 0))` : `var(${PREFIX}-track-shape-${size}-pill, 0)`};
  --_hh: ${ref('handle-height')};
  --_dot: ${ref('stop-indicator-size')};
}`;
};

/** SLD-23: a size a layer adds gets its block on demand; one the active system lacks draws small and is reported. */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-track-thickness-${value}` },
];

/**
 * The one condition's parts (`standard`) in every state, as `--_<key><suffix>` (`--_c-h` is the container,
 * hovered). A handle paints its container, its fill, outline, width and elevation from ITS state; the tracks, the stop
 * dots and the opacity follow the highest state of any handle (SLD-11).
 */
const PARTS = {
  c: 'container-color',
  h: 'handle-color',
  ho: 'handle-outline-color',
  hw: 'handle-width',
  he: 'handle-elevation',
  t: 'track-color',
  a: 'active-track-color',
  s: 'stop-indicator-color',
  as: 'active-stop-indicator-color',
} as const;
const SUFFIX = { rest: '-r', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
type Suffix = (typeof SUFFIX)[keyof typeof SUFFIX];

/** Keyboard focus on a handle: focus the pointer gave it is not keyboard focus (SLD-11, SLD-12). */
const KEYBOARD_FOCUS = ':focus-visible:not([data-pointer-focus])';

/**
 * Where each state is read (for `stateRules()`), relative to `scope` — the thumb whose state it is, or `.thumb` for
 * any handle. Hover is the handle a press would move (`data-hovered`, written for a fine pointer), focus the handle's
 * keyboard focus, pressed its container's `data-pressed` (PressController), disabled the root's. Each selector keeps the
 * specificity of its resting rule, so the order stateRules writes them in is the precedence.
 */
const rootState = (scope: string) => (state: string) => {
  if (state === ':hover') return `.root:where(:has(${scope}[data-hovered]))`;
  if (state === ':focus-visible') return `.root:where(:has(${scope} .handle${KEYBOARD_FOCUS}))`;
  if (state === ':disabled') return '.root:where([data-disabled])';
  return `.root:where(:has(${scope} .container${state}))`;
};
const knobState = (state: string) => {
  if (state === ':hover') return ':where(.thumb[data-hovered]) .knob';
  if (state === ':focus-visible') return `.knob:where(:has(> .handle${KEYBOARD_FOCUS}))`;
  if (state === ':disabled') return ':where(.root[data-disabled]) .knob';
  return `.knob:where(:has(> .container${state}))`;
};

const handlePaint = (suffix: Suffix, container = true) =>
  `${container ? `\n    --_c: var(--_c${suffix});` : ''}
    --_h: var(--_h${suffix});
    --_ho: var(--_ho${suffix});
    --_hw: var(--_hw${suffix});
    --_he: var(--_he${suffix});`;
const sliderPaint = (suffix: Suffix, state?: string) => `
    --_t: var(--_t${suffix});
    --_a: var(--_a${suffix});
    --_s: var(--_s${suffix});
    --_as: var(--_as${suffix});${state ? `\n    opacity: var(${PREFIX}-${state}-opacity);` : ''}`;
const widthPaint = (id: string, suffix: Suffix) => `\n    --_hw-${id}: var(--_hw${suffix});`;

const HANDLE_STATES = stateRules(knobState, {
  hovered: handlePaint(SUFFIX.hovered),
  focused: handlePaint(SUFFIX.focused),
  pressed: handlePaint(SUFFIX.pressed),
  pressedContent: handlePaint(SUFFIX.pressed, false),
  disabled: handlePaint(SUFFIX.disabled),
});
const SLIDER_STATES = stateRules(rootState('.thumb'), {
  hovered: sliderPaint(SUFFIX.hovered, 'hovered'),
  focused: sliderPaint(SUFFIX.focused, 'focused'),
  pressed: sliderPaint(SUFFIX.pressed, 'pressed'),
  pressedContent: sliderPaint(SUFFIX.pressed, 'pressed'),
  disabled: `\n    cursor: default;${sliderPaint(SUFFIX.disabled, 'disabled')}`,
});
/** Each handle's width in its own state, on the root, where the tracks are cut around it (SLD-8). */
const WIDTH_STATES = unsafeCSS(
  (['start', 'end'] as const)
    .map(
      (id) =>
        stateRules(rootState(`.thumb[data-handle='${id}']`), {
          hovered: widthPaint(id, SUFFIX.hovered),
          focused: widthPaint(id, SUFFIX.focused),
          pressed: widthPaint(id, SUFFIX.pressed),
          pressedContent: widthPaint(id, SUFFIX.pressed),
          disabled: widthPaint(id, SUFFIX.disabled),
        }).cssText,
    )
    .join('\n'),
);

/**
 * The axis-dependent geometry (SLD-7, SLD-21): along the axis a horizontal slider runs from the inline start (RTL
 * mirrors it through the logical properties) and a vertical one from the bottom; everything else is the same turned a
 * quarter turn. `from` / `to` name each end's two corners.
 */
const AXIS = {
  horizontal: {
    start: 'inset-inline-start',
    end: 'inset-inline-end',
    cross: 'inset-block-start',
    crossBoth: 'inset-block',
    alongBoth: 'inset-inline',
    along: 'inline-size',
    across: 'block-size',
    from: ['border-start-start-radius', 'border-end-start-radius'],
    to: ['border-start-end-radius', 'border-end-end-radius'],
    touch: 'pan-y',
  },
  vertical: {
    start: 'inset-block-end',
    end: 'inset-block-start',
    cross: 'inset-inline-start',
    crossBoth: 'inset-inline',
    alongBoth: 'inset-block',
    along: 'block-size',
    across: 'inline-size',
    from: ['border-end-start-radius', 'border-end-end-radius'],
    to: ['border-start-start-radius', 'border-start-end-radius'],
    touch: 'pan-x',
  },
} as const;

/** A piece's two ends along the travel, as insets of a box the travel's size (see `.dots`), and its corners at each. */
const FROM = 'calc(var(--_from) * 100% + var(--_from-off))';
const TO = 'calc((1 - var(--_to)) * 100% - var(--_to-off))';
const CLIP = {
  horizontal: `inset(0 ${TO} 0 ${FROM} round var(--_from-r) var(--_to-r) var(--_to-r) var(--_from-r))`,
  rtl: `inset(0 ${FROM} 0 ${TO} round var(--_to-r) var(--_from-r) var(--_from-r) var(--_to-r))`,
  vertical: `inset(${TO} 0 ${FROM} 0 round var(--_to-r) var(--_to-r) var(--_from-r) var(--_from-r))`,
};

const geometry = (orientation: keyof typeof AXIS) => {
  const a = AXIS[orientation];
  const on = `.root[data-orientation='${orientation}']`;
  const value = `var(--_vt) ${T('motion-value-easing')}`;
  const state = `var(--_st) ${T('motion-state-easing')}`;
  const dot = 'var(--_dot)';
  return `
  /* SLD-7: the hit area; a press that moves across the track is left to the page's scroll (SLD-2). */
  ${on} {
    touch-action: ${a.touch};
  }
  /* SLD-7: the travel of a handle's center — the track, inset by half the container size from each end of the slider,
     less half the track's thickness at each end, so that a handle is concentric with the track's rounded end at min and
     max. The tracks are drawn in it, and the handles ride on its midline (the rail). */
  ${on} :is(.travel, .rail) {
    ${a.alongBoth}: calc(${T('container-size')} / 2 + var(--_th) / 2);
  }
  ${on} .travel {
    ${a.cross}: calc(50% - var(--_th) / 2);
    ${a.across}: var(--_th);
  }
  ${on} .rail {
    ${a.cross}: 50%;
    ${a.across}: 0;
  }
  /* SLD-6, SLD-8: a piece of the tracks, from one point of the travel to another — a fraction of it (--_from, --_to) and
     an offset (--_from-off, --_to-off): half the thickness past an end of the travel is the track's end, a handle's
     half width and gap before or after it is where it cuts the track. Each end's corners are its own (--_from-r,
     --_to-r): rounded by track.shape at the track's ends, square where two pieces meet. */
  ${on} .piece {
    ${a.crossBoth}: 0;
    ${a.start}: ${FROM};
    ${a.end}: ${TO};
    ${a.from.map((p) => `${p}: calc(var(--_from-r) * var(--_corner-scale));`).join('\n    ')}
    ${a.to.map((p) => `${p}: calc(var(--_to-r) * var(--_corner-scale));`).join('\n    ')}
    transition:
      ${a.start} ${value},
      ${a.end} ${value},
      background-color ${state};
  }
  /* SLD-9: a piece's dots lie along the whole travel and are clipped to the piece — the same two ends, in percentages of
     the same box — so a dot stays where it is while its piece moves (and when the slider's length changes), and is drawn
     only where the piece is. */
  ${on} .dots {
    clip-path: ${orientation === 'horizontal' ? CLIP.horizontal : CLIP.vertical};
    transition: clip-path ${value};
  }${
    orientation === 'horizontal'
      ? `
  :host(:dir(rtl)) ${on} .dots {
    clip-path: ${CLIP.rtl};
  }`
      : ''
  }
  ${on} .dot {
    ${a.start}: calc(var(--_at) * 100% - ${dot} / 2);
    ${a.cross}: calc(50% - ${dot} / 2);
  }
  /* SLD-16: a handle's center at its fraction of the travel, moved over the value motion. */
  ${on} .thumb {
    ${a.start}: calc(var(--_f) * 100%);
    ${a.cross}: 0;
    transition: ${a.start} ${value};
  }
  /* SLD-8: the handle, handle.width along the axis and handle.height across it, centered on the thumb. */
  ${on} .handle {
    ${a.along}: var(--_hw);
    ${a.across}: var(--_hh);
    ${orientation === 'horizontal' ? 'inset-inline-start: calc(var(--_hw) / -2);\n    inset-block-start: calc(var(--_hh) / -2);' : 'inset-inline-start: calc(var(--_hh) / -2);\n    inset-block-start: calc(var(--_hw) / -2);'}
  }`;
};

// Every visual value is a token (tokens/comp/slider.tokens.json). The element writes each point along the travel as a
// fraction (0–1) and an offset in tokens; the rest is here.
export const styles = css`
  ${unsafeCSS(conditionBlock(PREFIX, 'standard', PARTS, ':host'))}
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((s) => s !== DEFAULT_SIZE).map((s) => sizeBlock(s, `:host([size='${s}'])`)).join('\n'))}

  /* SLD-7: as long as the layout gives it and, across its axis, as thick as the larger of the container and the handle. */
  :host {
    --_across: max(${unsafeCSS(T('container-size'))}, var(--_hh));
    display: block;
    position: relative;
    box-sizing: border-box;
    block-size: var(--_across);
    -webkit-tap-highlight-color: transparent;
  }
  /* SLD-17: what tells the script that the direction it inherits changed (primitives/direction.ts). */
  ${directionProbeStyles}
  /* SLD-21: a vertical slider is as tall as its layout gives it. */
  :host([orientation='vertical']) {
    display: inline-block;
    vertical-align: middle;
    inline-size: var(--_across);
    block-size: 100%;
  }
  :host([hidden]) {
    display: none;
  }

  .root {
    /* The timing of every part: the value motion (none while a press drags, SLD-16) and the state motion (none into a
       press, SLD-13). */
    --_vt: ${unsafeCSS(T('motion-value-duration'))};
    --_st: ${unsafeCSS(T('motion-state-duration'))};
    --_t: var(--_t-r);
    --_a: var(--_a-r);
    --_s: var(--_s-r);
    --_as: var(--_as-r);
    --_hw-start: var(--_hw-r);
    --_hw-end: var(--_hw-r);
    /* SLD-8: where the tracks stop around a handle, from its center. While track.gap is 0 they run under the handle and
       meet at its center (0); above 0 they stop the gap beyond its edge — its half width in its own state, then the gap
       (gap × 100000 is 0 exactly when the gap is, and past the half width at any gap a layout can draw). */
    --_cut-start: calc(min(var(--_hw-start) / 2, var(--_gap) * 100000) + var(--_gap));
    --_cut-end: calc(min(var(--_hw-end) / 2, var(--_gap) * 100000) + var(--_gap));
    --_gap: ${unsafeCSS(T('track-gap'))};
    position: absolute;
    inset: 0;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    transition: opacity var(--_st) ${unsafeCSS(T('motion-state-easing'))};
  }
  .root[data-inert] {
    cursor: default;
  }
  .root[data-dragging] {
    --_vt: 0s;
  }
  .root:where(:has(.container[data-pressed]:not([data-pressed='none']))) {
    --_st: 0s;
  }
  /* SLD-7: the whole slider is the hit area, reaching sys.target across its axis (touch for a coarse pointer). */
  ${minimumTarget('.root')}

  .travel,
  .rail {
    position: absolute;
    pointer-events: none;
  }
  .piece {
    position: absolute;
    ${unsafeCSS(cornerRadius('--_ts'))}
    background: var(--_t);
  }
  .piece.active {
    background: var(--_a);
  }
  .dots {
    position: absolute;
    inset: 0;
  }
  /* SLD-9: a dot of the size's stop-indicator.size in the color of the piece it lies on; a size of 0 draws none. */
  .dot {
    position: absolute;
    inline-size: var(--_dot);
    block-size: var(--_dot);
    border-radius: 50%;
    background: var(--_s);
    transition: background-color var(--_st) ${unsafeCSS(T('motion-state-easing'))};
  }
  .dots.active .dot {
    background: var(--_as);
  }

  .thumb,
  .knob {
    position: absolute;
    inline-size: 0;
    block-size: 0;
  }
  .knob {
    inset: 0;
    --_c: var(--_c-r);
    --_h: var(--_h-r);
    --_ho: var(--_ho-r);
    --_hw: var(--_hw-r);
    --_he: var(--_he-r);
  }
  /* SLD-10: the round state layer, container.size on each side, centered on the handle and moving with it, behind it
     and above the tracks; it may reach beyond the track and takes no room. */
  .container {
    position: absolute;
    inset-inline-start: calc(${unsafeCSS(T('container-size'))} / -2);
    inset-block-start: calc(${unsafeCSS(T('container-size'))} / -2);
    inline-size: ${unsafeCSS(T('container-size'))};
    block-size: ${unsafeCSS(T('container-size'))};
    /* Its own stacking context, so the ripple sits above the container color. */
    isolation: isolate;
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    background: var(--_c);
    transition: background-color var(--_st) ${unsafeCSS(T('motion-state-easing'))};
  }
  /* SLD-8, SLD-24: the handle, rounded by handle.shape (a box clamps it to half its smaller side), above the tracks and
     its container: its fill is its background, under the outline, and its elevation its shadow, each in its state.
     The fill stops a quarter of the outline's width inside the edge (padding, background-clip: content-box): a fill
     reaching the edge is anti-aliased there with the outline, and shows through the outline's soft outer edge as a
     light seam where the active track meets the handle. Without an outline it reaches the edge (a bare 0 width makes
     the padding invalid, which is 0). It is the element the keyboard focuses and assistive technology reads (role
     slider); the press lands on the root around it. */
  .handle {
    position: absolute;
    box-sizing: border-box;
    ${unsafeCSS(cornerRadius(`${PREFIX}-handle-shape`))}
    padding: calc(${unsafeCSS(T('handle-outline-width'))} / 4);
    background: var(--_h);
    background-clip: content-box;
    box-shadow: var(--_he);
    outline: none;
    transition-property: background-color, box-shadow, inline-size, block-size, inset-inline-start, inset-block-start;
    transition-duration: var(--_st);
    transition-timing-function: ${unsafeCSS(T('motion-state-easing'))};
  }
  /* SLD-24: the outline, a border of handle-outline.width over the fill, inside the handle's edge, so it never changes
     the handle's size (0 draws none). It is the handle's ::before, not its own border: the focus ring's ::after is placed
     from the handle's padding box, and the width is never put in a calc() (a layer may write it as a bare 0). */
  .handle::before {
    content: '';
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border: ${unsafeCSS(T('handle-outline-width'))} solid var(--_ho);
    border-radius: inherit;
    pointer-events: none;
    transition: border-color var(--_st) ${unsafeCSS(T('motion-state-easing'))};
  }

  ${unsafeCSS(geometry('horizontal'))}
  ${unsafeCSS(geometry('vertical'))}

  /* SLD-11, SLD-13, SLD-14, SLD-20: each handle from its own state; the tracks, dots and opacity from the highest state
     of any handle. Pressed beats focused beats hovered; disabled is over all. */
  ${HANDLE_STATES}
  ${WIDTH_STATES}
  ${SLIDER_STATES}

  /* SLD-14 ripple: the pressed container color, grown from the pressed handle's center over motion.feedback-duration. */
  ${rippleStyles({
    color: '--_c-p',
    grow: '--tanrei-comp-slider-motion-feedback-duration',
    fade: '--tanrei-comp-slider-motion-state-duration',
    easing: '--tanrei-comp-slider-motion-state-easing',
  })}

  /* SLD-12, SLD-15: the ring (or the glow) around the handle with keyboard focus, never animated. */
  ${focusRing((focus) => `.handle${focus}:not([data-pointer-focus])`)}

  /* SLD-15: corner smoothing on the tracks, the container, the handle and the value indicator (data-tanrei-shape). */
  ${shape}

  /* SLD-13: the rail carries press-hold for PressController; it has no transition of its own. */
  ${pressHold('.rail')}

  /* SLD-17: the value indicator — value-indicator.offset beyond the handle's outer edge across the axis, half the
     handle's height from the midline (the top of a round handle, its outline included: the outline is inside the edge),
     above a horizontal slider's handle and at the inline start of a vertical one's; centered on the handle and shifted
     to stay inside the window (--_shift, set by the element). A read overlay: no focus, no input, hidden from assistive
     technology, drawn above the handle, its container and its neighbours, and not clipped by the slider. */
  .value-indicator {
    position: absolute;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-block-size: ${unsafeCSS(T('value-indicator-container-height'))};
    min-inline-size: ${unsafeCSS(T('value-indicator-container-height'))};
    padding-inline: ${unsafeCSS(T('value-indicator-container-padding-inline'))};
    ${unsafeCSS(cornerRadius(`${PREFIX}-value-indicator-container-shape`))}
    background: ${unsafeCSS(T('value-indicator-container-color'))};
    color: ${unsafeCSS(T('value-indicator-label-color'))};
    font: ${unsafeCSS(T('value-indicator-label-typescale-font'))};
    letter-spacing: ${unsafeCSS(T('value-indicator-label-typescale-letter-spacing'))};
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity ${unsafeCSS(T('motion-state-duration'))} ${unsafeCSS(T('motion-state-easing'))},
      visibility 0s linear ${unsafeCSS(T('motion-state-duration'))};
  }
  /* SLD-26: the value text is text of its own direction — its first strong character's, and left to right where it has
     none — isolated from what is around it, so "40 %", "−5" and "1,000 km" keep their order in right-to-left. It is
     one line, centred in the indicator, and the indicator is placed by the handle (SLD-17). */
  ${productText('.value-text')}
  .root[data-orientation='horizontal'] .value-indicator {
    left: 0;
    inset-block-end: calc(var(--_hh) / 2 + ${unsafeCSS(T('value-indicator-offset'))});
    translate: calc(-50% + var(--_shift, 0px)) 0;
  }
  .root[data-orientation='vertical'] .value-indicator {
    top: 0;
    inset-inline-end: calc(var(--_hh) / 2 + ${unsafeCSS(T('value-indicator-offset'))});
    translate: 0 calc(-50% + var(--_shift, 0px));
  }
  .root[data-value-indicator='always'] .value-indicator,
  .root[data-value-indicator='active'] .knob:where(:has(> .container[data-pressed]), :has(> .handle${unsafeCSS(KEYBOARD_FOCUS)})) .value-indicator {
    opacity: 1;
    visibility: visible;
    transition:
      opacity ${unsafeCSS(T('motion-state-duration'))} ${unsafeCSS(T('motion-state-easing'))},
      visibility 0s;
  }

  /* SLD-11, SLD-14, SLD-16, SLD-17: where motion is reduced every change shows at once. */
  @media (prefers-reduced-motion: reduce) {
    .root {
      --_vt: 0s;
      --_st: 0s;
    }
    .value-indicator,
    .root[data-value-indicator] .value-indicator {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .piece,
    .dot,
    .handle,
    .value-indicator {
      forced-color-adjust: none;
    }
    .piece {
      background: CanvasText;
    }
    .piece.active,
    .handle {
      background: Highlight;
    }
    .handle::before {
      border-color: Highlight;
    }
    .dot,
    .dots.active .dot {
      background: Canvas;
    }
    .value-indicator {
      background: CanvasText;
      color: Canvas;
    }
    .root[data-disabled] :is(.piece, .handle) {
      background: GrayText;
    }
    .root[data-disabled] .handle::before {
      border-color: GrayText;
    }
  }
`;
