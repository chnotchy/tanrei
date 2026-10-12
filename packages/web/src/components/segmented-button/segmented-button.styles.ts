import { css, unsafeCSS } from 'lit';
import {
  type OpenAxis,
  conditionBlock,
  conditionStates,
  focusRing,
  iconGlyph,
  minimumTarget,
  pressHold,
  recolorTiming,
  rippleStyles,
  selectionContainerShape,
} from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/segmented-button.tokens.json). A segment has two conditions — unselected
// and selected — which are its state variants: each colors the container, label and icon (the check too)
// and raises the container, in every state. How a state looks is the design system's decision: hover, focus and press
// mix the condition's container with its `state-layer.color` in the default system and draw nothing in cupertino, by
// value; the component only says which state's tokens are drawn.
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_SIZE = 'medium';
const PREFIX = '--tanrei-comp-segmented-button';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The members of the size axis (`dev.tanrei.axes.size.members`), as the private properties the set gives its segments. */
const SIZE_MEMBERS = {
  height: 'container-height',
  'pad-inline': 'container-padding-inline',
  'pad-block': 'container-padding-block',
  gap: 'container-gap',
  font: 'label-typescale',
  icon: 'icon-size',
  check: 'check-size',
} as const;

// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (size: string) => string, size: string, fallback: string | null) => (fallback ? `var(${name(size)}, var(${name(fallback)}))` : `var(${name(size)})`);

/**
 * One size's members as private properties on the set (`--_size-height`, `--_size-font`…). They are inherited through
 * the flat tree, so the set's segments — slotted into it — read the set's size.
 */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) =>
      member === 'label-typescale'
        ? [`  --_size-font: ${ref((v) => `${PREFIX}-${member}-${v}-font`, size, fallback)};`, `  --_size-tracking: ${ref((v) => `${PREFIX}-${member}-${v}-letter-spacing`, size, fallback)};`]
        : [`  --_size-${key}: ${ref((v) => `${PREFIX}-${member}-${v}`, size, fallback)};`],
    )
    .join('\n')}\n}`;

/**
 * SEG-8: a size a layer added gets its block on demand, built by the same function and falling back to the default's
 * tokens; a value the active system lacks is reported in debug builds (src/primitives/axes.ts).
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
];

/**
 * The set (SEG-6, SEG-13, SEG-14, SEG-17): one row of equal columns — each the widest segment's width, at least the
 * minimum target wide, dividing more room equally and less room equally too (labels wrap) — `divider.width` apart, inset
 * by `set.padding`, over the set's fill and under its outline, at least the size's height tall.
 */
export const setStyles = css`
  :host {
    display: inline-flex;
    vertical-align: middle;
    max-inline-size: 100%;
    /* SEG-6: neighbouring segments cannot reach over each other, so each is at least the target wide. */
    --_target: var(--tanrei-sys-target-pointer);
  }
  @media (pointer: coarse) {
    :host {
      --_target: var(--tanrei-sys-target-touch);
    }
  }
  :host([hidden]) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}

  ${shape}

  /* SEG-13, SEG-14: the row. Equal columns (minmax(target, 1fr) sizes every column to the widest segment's content, and
     shares any other width equally), the dividers' width between them, the segments stretched to the tallest. */
  .set {
    box-sizing: border-box;
    position: relative;
    /* The set's own stacking context: a selected segment rises above its neighbours, the outline above both, and a
       keyboard-focused segment — its ring drawn inside it — above the outline (SEG-5, SEG-24). */
    isolation: isolate;
    display: grid;
    flex: 1 1 auto;
    grid-auto-flow: column;
    grid-auto-columns: minmax(var(--_target), 1fr);
    column-gap: ${t('divider-width')};
    min-inline-size: 0;
    min-block-size: var(--_size-height);
    padding: ${t('set-padding')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-set-shape`))}
    background: ${t('set-color')};
  }
  /* SEG-13: the outline, inside the set's edge, over the segments; SEG-7, SEG-17: it never takes a segment's state. */
  .set::after {
    content: '';
    position: absolute;
    z-index: 2;
    inset: 0;
    box-sizing: border-box;
    border: ${t('outline-width')} solid ${t('outline-color')};
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    pointer-events: none;
  }
  /* SEG-16: the size's check size, measured, so that the set knows whether a check is drawn (0: none, and no room). */
  .probe {
    position: absolute;
    inline-size: var(--_size-check);
    block-size: 0;
    visibility: hidden;
    pointer-events: none;
  }
  @media (forced-colors: active) {
    .set::after {
      border-color: CanvasText;
    }
  }
`;

/** The parts each condition colors in every state: the container, its elevation, the label, the icon (and the check). */
const PARTS = { c: 'container-color', e: 'container-elevation', l: 'label-color', i: 'icon-color' } as const;

/**
 * Where each state is read (SEG-4): hover, keyboard focus, press (`data-pressed`, PressController) and disabled on the
 * segment's native button. `:where()` keeps every selector at one class, so the order is the precedence.
 */
const on = (state: string) => `.container:where(${state})`;
const SELECTION = `${T('motion-selection-duration')} ${T('motion-selection-easing')}`;
const RECOLOR = 'var(--_recolor-duration) var(--_recolor-easing)';
/** The radius of a corner of the segment, scaled with the corner smoothing. */
const corner = (radius: string) => `calc(var(${radius}) * var(--_corner-scale))`;
/** Each of the four corners from `--_rs` (the inline-start corners) and `--_re` (the inline-end corners), less `less`. */
const corners = (less?: string) =>
  ['start-start', 'end-start', 'start-end', 'end-end']
    .map((c) => {
      const radius = corner(c.endsWith('-start') ? '--_rs' : '--_re');
      return `border-${c}-radius: ${less ? `max(0px, calc(${radius} - ${less}))` : radius};`;
    })
    .join('\n    ');

/**
 * One segment (SEG-4…7, SEG-9…11, SEG-13…17, SEG-21, SEG-23, SEG-24): its native button — the container that answers
 * the states, clips its fill and ripple to its corners and draws the ring inside itself — the content centred in it
 * (the leading glyph, then the label), and the divider in the gap before it.
 */
export const segmentStyles = css`
  :host {
    position: relative;
    display: flex;
    min-inline-size: 0;
    outline: none;
  }
  :host([hidden]) {
    display: none;
  }
  /* SEG-24: a selected segment's elevation is cast above its neighbours; SEG-5: a keyboard-focused segment is above the
     set's outline, so that the ring inside it is never covered. */
  :host(:state(selected)) {
    z-index: 1;
  }
  :host(:state(focus-visible)) {
    z-index: 3;
  }

  ${unsafeCSS(conditionBlock(PREFIX, 'unselected', PARTS, '.container'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'selected', PARTS, '.container.selected'))}
  /* SEG-16, SEG-23: a part that both the states and the selection recolor takes the state motion, and the selection motion
     while the condition changes (data-condition-change on .root, src/primitives/selection.ts). */
  ${recolorTiming(PREFIX)}

  /* SEG-13, SEG-14, SEG-15: the container fills the segment; its content is centred, padded by the size's paddings,
     in the size's label style. The first and last segments' outer corners are the set's less its padding (concentric),
     every other corner the state's container shape. */
  .container {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the content. */
    isolation: isolate;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-inline-size: 0;
    padding-block: var(--_size-pad-block);
    padding-inline: var(--_size-pad-inline);
    ${unsafeCSS(selectionContainerShape)}
    --_outer: max(0px, calc(${t('set-shape')} - ${t('set-padding')}));
    --_rs: var(--tanrei-corner-radius);
    --_re: var(--tanrei-corner-radius);
    background: var(--_c);
    box-shadow: var(--_e);
    color: var(--_l);
    font: var(--_size-font);
    letter-spacing: var(--_size-tracking);
    text-align: center;
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, box-shadow, color, opacity;
    transition-duration: var(--_recolor-duration), var(--_recolor-duration), var(--_recolor-duration), ${t('motion-state-duration')};
    transition-timing-function: var(--_recolor-easing), var(--_recolor-easing), var(--_recolor-easing), ${t('motion-state-easing')};
  }
  /* SEG-11: the one corner rule, after the container's reset (all: unset) and before its corners. */
  ${shape}
  /* The first segment's first corner in the inline direction (the right one in right-to-left) and the last one's last
     are the set's less its padding. */
  .container.first {
    --_rs: var(--_outer);
  }
  .container.last {
    --_re: var(--_outer);
  }
  /* A set drawn as a pill (m3-like) rounds its end segments' outer corners as caps, whatever the smoothing. */
  .container:is(.first, .last) {
    --tanrei-corner-pill: max(${t('set-shape-pill, 0')}, var(--_shape-pill, 0));
  }
  .container {
    ${unsafeCSS(corners())}
  }

  /* SEG-6: the hit area reaches the minimum target above and below the set, without changing the visual size (each
     segment is already at least the target wide: the set's columns). */
  ${minimumTarget('.container')}

  /* SEG-4, SEG-7, SEG-10: each state paints from that state's tokens of the segment's condition; pressed > focused >
     hovered, disabled over all. Pressed is data-pressed="<feedback>" (PressController): overlay paints the pressed tokens
     on the whole container; ripple and dim paint everything else from them while the container color stays with the
     state under the press; none paints nothing. */
  ${unsafeCSS(conditionStates(PREFIX, PARTS, { container: 'c', root: '.container', on }))}
  .container[data-pressed]:not([data-pressed='none']) .glyphs > * {
    transition-duration: 0s;
  }

  /* SEG-10 ripple: the pressed container color of the segment's condition, grown over motion.feedback-duration and faded
     over motion.state-duration, both with motion.state-easing, clipped to the segment's corners. */
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .ripple {
    ${unsafeCSS(corners())}
  }

  /* SEG-5, SEG-11: the ring (or the glow) inside the segment, for keyboard focus only, never animated; its corners follow
     each of the segment's own, concentric. */
  ${focusRing((focus) => `.container${focus}`, { inside: true })}
  .container:focus-visible::after,
  .container[data-focus-style]:focus-visible::after {
    ${unsafeCSS(corners('var(--_glow-inset, var(--tanrei-sys-focus-outer-width))'))}
  }

  /* SEG-15, SEG-21: the content — the leading glyph, then the label — centred in the segment, in the inline direction
     (mirrored in right-to-left). The glyph is centred on the label's first line (the container carries the label's
     style, so 1lh is its line). */
  .content {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  /* SEG-16: the leading glyph sits in a one-column grid that opens (0fr → 1fr) when there is one, so the content
     re-centres over the selection motion as a check comes and goes. The gap after it is inside it. */
  .lead {
    display: grid;
    flex: none;
    grid-template-columns: 0fr;
    align-items: center;
    min-block-size: 1lh;
    opacity: 0;
    transition:
      grid-template-columns ${unsafeCSS(SELECTION)},
      opacity ${unsafeCSS(SELECTION)};
  }
  .container.lead-open .lead {
    grid-template-columns: 1fr;
    opacity: 1;
  }
  .lead-clip {
    display: flex;
    min-inline-size: 0;
    overflow: hidden;
  }
  .lead-item {
    display: flex;
    align-items: center;
    padding-inline-end: var(--_size-gap);
  }
  .container.icon-only .lead-item {
    padding-inline-end: 0;
  }
  /* The icon and the check share one cell: the check shows in place of the icon (SEG-16). */
  .glyphs {
    display: grid;
    place-items: center;
  }
  .label {
    min-inline-size: 0;
    overflow-wrap: break-word;
  }
  /* SEG-28: the label is text of its own direction — its first strong character's — isolated from the glyph beside it;
     where it is placed, and that its lines are centred, stays the layout's. */
  ${productText('.label')}

  /* SEG-14: a segment's width is measured as if it were selected — its leading glyph (its icon, or the check where one
     would be drawn), the gap and its label on one line — so that selecting it never changes a width. The sizer has that
     width and no height. */
  .sizer {
    display: flex;
    max-inline-size: 100%;
    block-size: 0;
    overflow: hidden;
    visibility: hidden;
    white-space: nowrap;
  }
  .sizer-glyph {
    flex: none;
    inline-size: max(var(--_size-icon), var(--_size-check));
    margin-inline-end: var(--_size-gap);
  }
  .container.no-icon .sizer-glyph {
    inline-size: var(--_size-check);
  }

  /* SEG-15, SEG-16: the icon at the size's icon size and the check at its check size, in the icon color of the
     condition and state; the icon in the family and fill of the segment's condition (selected: .container.selected),
     the check — the icon set's \`check\`, never mirrored — always in the selected ones. SEG-27: iconGlyph() mirrors the
     icon GlyphMirrorController marked, in right-to-left, in its own box. The icon is drawn at sys.icon.weight, the check
     — a control's own mark — at comp.segmented-button.check.weight. */
  ${iconGlyph('.icon', { size: '--_size-icon', selected: '.container.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  ${iconGlyph('.check', { size: '--_size-check', selected: '.glyphs', weight: `${PREFIX}-check-weight`, duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .glyphs > * {
    grid-area: 1 / 1;
    color: var(--_i);
    transition:
      opacity ${unsafeCSS(SELECTION)},
      color ${unsafeCSS(RECOLOR)},
      font-variation-settings ${unsafeCSS(RECOLOR)};
  }
  .check,
  .container.checked .icon {
    opacity: 0;
  }
  .container.checked .check {
    opacity: 1;
  }
  /* SEG-25: nothing in the check's place until the icon set can draw it (GlyphDrawnController sets data-drawn); its box
     keeps the room SEG-14 measured, so no width changes when the font arrives. */
  .check {
    visibility: hidden;
  }
  .check[data-drawn] {
    visibility: visible;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* SEG-17: the line in the gap before the segment, from the set's top padding to its bottom padding, in its own color
     at full opacity whatever the state or condition of either segment (it is outside the container, whose opacity the
     states change). */
  .divider {
    position: absolute;
    inset-block: 0;
    inset-inline-start: calc(${t('divider-width')} * -1);
    inline-size: ${t('divider-width')};
    background: ${t('divider-color')};
    pointer-events: none;
  }

  /* SEG-9: an element that is always rendered carries press-hold for PressController. */
  ${pressHold('.hold')}
  .hold {
    display: none;
  }

  /* The first condition a segment is told is drawn, not animated (until two frames after it connected). */
  .container.still,
  .container.still .lead,
  .container.still .glyphs > * {
    transition: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .container,
    .lead,
    .glyphs > * {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .container.selected {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
    }
    .container.selected .glyphs > * {
      color: HighlightText;
    }
    .container:disabled,
    .container:disabled .glyphs > * {
      color: GrayText;
    }
    .divider {
      background: CanvasText;
    }
  }
`;
