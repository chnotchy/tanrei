import { css, unsafeCSS } from 'lit';
import type { OpenAxis } from '../../primitives/index.js';
import { SCRIM_FILTER, conditionBlock, focusGlow, focusRing, iconGlyph, keptSpaces, minimumTarget, pressHold, rippleStyles, rowTarget, scrimFilter, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/search.tokens.json). The search has one condition, `standard`, whose state
// tokens color the bar's parts and a suggestion row's parts; the outline width and the opacity are the component's per
// state. How a state looks is the active design system's decision: the search reads that state's tokens and never
// computes an effect (the bar shows focus by its focused outline, not by a ring).
const PREFIX = '--tanrei-comp-search';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The densities every design system has (SRC-53). A layer may add more; those get their rules on demand. */
export const CORE_DENSITIES = ['regular', 'compact'] as const;
const DEFAULT_DENSITY = 'regular';
/** The members of the density axis (`dev.tanrei.axes.density.members`), as the view's rows read them. */
const DENSITY_MEMBERS = ['suggestion-container-height', 'suggestion-container-padding-block', 'suggestion-container-padding-inline', 'suggestion-container-gap', 'suggestion-leading-icon-size'] as const;
type DensityMember = (typeof DENSITY_MEMBERS)[number];
const ref = (member: string, density: string, fallback: string | null) =>
  fallback ? `var(${PREFIX}-${member}-${density}, var(${PREFIX}-${member}-${fallback}))` : `var(${PREFIX}-${member}-${density})`;
/**
 * SRC-53: the search's density, set on its host as private switches that its suggestions, results and result groups —
 * its descendants — inherit. SRC-16: a fine pointer's row is held to the pointer target, except in the compact density.
 */
const densityBlock = (density: string, selector: string, fallback: string | null = null) => `${selector} {
  ${DENSITY_MEMBERS.map((member) => `--_src-${member}: ${ref(member, density, fallback)};`).join('\n  ')}
  --_src-pointer-target: ${density === 'compact' ? '0px' : 'var(--tanrei-sys-target-pointer)'};
}`;
/** What a row reads: the search's density, or the regular one where it stands outside a search. */
const D = (member: DensityMember) => `var(--_src-${member}, var(${PREFIX}-${member}-${DEFAULT_DENSITY}))`;
const d = (member: DensityMember) => unsafeCSS(D(member));
const POINTER = 'var(--_src-pointer-target, var(--tanrei-sys-target-pointer))';
/** The rows' measures that no density changes (the status row, the product's content, a group's title: SRC-53). */
const R = (member: DensityMember) => unsafeCSS(`var(${PREFIX}-${member}-${DEFAULT_DENSITY})`);

/** SRC-53: a density a layer added gets its block on demand, falling back to the default's tokens. */
export const AXES: readonly OpenAxis[] = [
  {
    name: 'density',
    core: CORE_DENSITIES,
    default: DEFAULT_DENSITY,
    rules: (value, selector) => densityBlock(value, selector, DEFAULT_DENSITY),
    probe: (value) => `${PREFIX}-suggestion-container-height-${value}` as const,
  },
];
const MOTION = `${T('motion-state-duration')} ${T('motion-state-easing')}`;

/** The bar's parts every state recolors: private key → token part (`--_c-h` is the container, hovered). */
const BAR = {
  c: 'container-color',
  e: 'container-elevation',
  o: 'outline-color',
  g: 'leading-icon-color',
  n: 'input-color',
  h: 'placeholder-color',
  r: 'caret-color',
} as const;
/** A suggestion row's parts every state recolors (prefixed, as a navigation bar's item parts are). */
const ROW = {
  sc: 'suggestion-container-color',
  si: 'suggestion-leading-icon-color',
  sh: 'suggestion-headline-color',
  ss: 'suggestion-supporting-text-color',
} as const;

/** One state's value of every part of `parts` (skipping `skip`), and the component's outline width and opacity for the bar. */
const paint = (parts: Record<string, string>, suffix: string, state: string, { skip, outline = false }: { skip?: string; outline?: boolean } = {}) =>
  `${Object.keys(parts)
    .filter((key) => key !== skip)
    .map((key) => `\n    --_${key}: var(--_${key}${suffix});`)
    .join('')}${outline ? `\n    --_ow: var(${PREFIX}-${state ? `${state}-` : ''}outline-width);` : ''}${state ? `\n    opacity: var(${PREFIX}-${state}-opacity);` : ''}`;

/**
 * Where the bar's states are read (SRC-18): hover is the bar's, focus is the input's — gained by pointer or by keyboard
 * alike, since a field shows where typing will go however it was focused — pressed is `data-pressed` on the bar
 * (PressController) and disabled is the input's. `:where()` keeps every rule at the resting rule's specificity, so the
 * order `stateRules()` writes them in is the precedence: pressed over focused over hovered, disabled over all.
 */
const onBar = (state: string) =>
  state === ':hover'
    ? '.bar:where(:hover)'
    : state === ':focus-visible'
      ? '.bar:where(:has(.input:focus))'
      : state === ':disabled'
        ? '.bar:where(:has(.input:disabled))'
        : `.bar:where(${state})`;

/**
 * Where a suggestion's states are read (SRC-17): hover is the row's, the active suggestion (the input's active
 * descendant) takes the focused tokens, pressed is `data-pressed` on the row. A suggestion is never disabled.
 */
const onRow = (state: string) =>
  state === ':hover' ? '.option:where(:hover)' : state === ':focus-visible' ? '.option:where([data-active])' : state === ':disabled' ? '.option:where(.never)' : `.option:where(${state})`;

/**
 * Where the button trigger's states are read (SRC-36): it is a native button, so hover, keyboard focus — never focus by
 * pointer, as for a Button — `data-pressed` (PressController) and `:disabled` are its own.
 */
const onTrigger = (state: string) => `.trigger:where(${state})`;

/**
 * Where a result's states are read (SRC-42): the row is the result's own anchor (or button), so hover, keyboard focus —
 * which stands where a suggestion's active state stands — and `data-pressed` (the search's PressController) are its
 * own. The result current while focus stays in the search's input (`data-current`, SRC-49) is drawn as the focused
 * one. A result is never disabled.
 */
const onResult = (state: string) =>
  state === ':disabled' ? '.row:where(.never)' : state === ':focus-visible' ? '.row:where(:focus-visible, [data-current])' : `.row:where(${state})`;

/** SRC-42, SRC-49: the focused result's row and the current one take the focus ring inside the row (ring or glow). */
const onResultFocus = (focus: string) =>
  focus === ':focus-visible' ? '.row:is(:focus-visible, [data-current])' : ".row[data-focus-style='glow']:is(:focus-visible, [data-current])";

/** The input's text: the value and the placeholder in input.typescale, their colors, the caret and the selection (SRC-3). */
const inputStyles = `
  .input {
    all: unset;
    box-sizing: border-box;
    position: relative;
    display: block;
    flex: 1 1 auto;
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    font: ${T('input-typescale-font')};
    letter-spacing: ${T('input-typescale-letter-spacing')};
    line-height: ${T('input-typescale-line-height')};
    color: var(--_n);
    caret-color: var(--_r);
    -webkit-text-fill-color: currentcolor;
    text-align: start;
    white-space: nowrap;
    cursor: inherit;
    transition:
      color ${MOTION},
      caret-color ${MOTION};
  }
  .input:focus {
    outline: none;
  }
  .input::placeholder {
    color: var(--_h);
    -webkit-text-fill-color: var(--_h);
    opacity: 1;
    /* SRC-33: the placeholder is its own run, in the direction of its first strong character, at the field's start edge. */
    unicode-bidi: plaintext;
    text-align: left;
  }
  :host(:dir(rtl)) .input::placeholder {
    text-align: right;
  }
  /* SRC-3: the product's one selection pair for text entry, the text field's: the highlight and the text on it. */
  .input::selection {
    background: var(--tanrei-comp-input-box-selection-color);
    color: var(--tanrei-comp-input-box-selection-content-color);
    -webkit-text-fill-color: var(--tanrei-comp-input-box-selection-content-color);
  }
  /* SRC-4: the browser's own cancel button and decoration are hidden; the search draws its own clear button. */
  .input::-webkit-search-cancel-button,
  .input::-webkit-search-decoration {
    appearance: none;
    display: none;
  }
  .input::-ms-clear {
    display: none;
  }`;

export const styles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }
  ${unsafeCSS(densityBlock(DEFAULT_DENSITY, ':host'))}
  :host {
    /* SRC-53: the glyph's box of the density, as a property the glyph rules name. */
    --_src-glyph: var(--_src-suggestion-leading-icon-size);
  }
  ${unsafeCSS(
    CORE_DENSITIES.filter((density) => density !== DEFAULT_DENSITY)
      .map((density) => densityBlock(density, `:host([density='${density}'])`))
      .join('\n'),
  )}
  :host([hidden]) {
    display: none;
  }
  /* SRC-35: an icon trigger is as large as its Button, as an icon button in an app bar is. */
  :host([bar='icon']) {
    display: inline-block;
  }
  /* For tests and documentation: a modal view drawn in place fills the element, which stands for the window. */
  :host([inline]) {
    position: relative;
  }
  :host([inline][expanded]) {
    display: block;
  }
  /* The condition's parts in every state, for the bar and for the rows. */
  ${unsafeCSS(conditionBlock(PREFIX, 'standard', { ...BAR, ...ROW }, ':host'))}

  /* SRC-1: one row as wide as the layout gives it and at least container.height high, on its color, elevation and
     corners (eased by the smoothing); each element vertically centred and container.gap from the next — its action
     buttons container.button-gap from one another (SRC-34, below); the search glyph
     (or the leading slot's icon button) padding-inline (padding-inline-with-button) from the start edge, the last element
     padding-inline-with-button from the end edge when it is an icon button and padding-inline when it is the input.
     Logical, so right-to-left mirrors the row. */
  .bar {
    ${unsafeCSS(paint(BAR, '-r', '', { outline: true }))}
    --_start: ${t('container-padding-inline')};
    --_end: ${t('container-padding-inline')};
    --_ripple: var(--_c-p);
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context: the ripple sits above the fill and below the content. */
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: ${t('container-gap')};
    min-block-size: ${t('container-height')};
    padding-inline: var(--_start) var(--_end);
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    background: var(--_c);
    box-shadow: var(--_e);
    cursor: text;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color ${unsafeCSS(MOTION)},
      box-shadow ${unsafeCSS(MOTION)},
      opacity ${unsafeCSS(MOTION)};
  }
  .bar[data-leading] {
    --_start: ${t('container-padding-inline-with-button')};
  }
  .bar[data-end-button] {
    --_end: ${t('container-padding-inline-with-button')};
  }
  .bar[hidden] {
    display: none;
  }

  /* SRC-18, SRC-20, SRC-26: each state sets every part from that state's tokens; under ripple and dim the container
     color stays with the state under the press. */
  ${stateRules(onBar, {
    hovered: paint(BAR, '-h', 'hovered', { outline: true }),
    focused: paint(BAR, '-f', 'focused', { outline: true }),
    pressed: paint(BAR, '-p', 'pressed', { outline: true }),
    pressedContent: paint(BAR, '-p', 'pressed', { outline: true, skip: 'c' }),
    disabled: `\n    cursor: default;${paint(BAR, '-d', 'disabled', { outline: true })}`,
  })}
  .bar[data-pressed]:not([data-pressed='none']) :is(.outline, .glyph, .input) {
    transition-duration: 0s;
  }

  /* SRC-18: the bar's edge — clear at rest in the default system — drawn inside the bar in the state's outline color and
     width; it is the bar's focus indicator. */
  .outline {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border: var(--_ow) solid var(--_o);
    border-radius: inherit;
    corner-shape: inherit;
    pointer-events: none;
    transition:
      border-color ${unsafeCSS(MOTION)},
      border-width ${unsafeCSS(MOTION)};
  }

  /* SRC-22: the hit area meets the minimum target vertically, without changing the visual size. The content stacks above it. */
  ${minimumTarget('.bar')}
  .glyph,
  .leading,
  .trailing,
  .clear,
  .hint,
  .trigger-text {
    position: relative;
  }

  /* SRC-2: the search glyph at leading-icon.size in the unselected family and fill, hidden from assistive technology. */
  ${iconGlyph('.glyph', { size: `${PREFIX}-leading-icon-size`, selected: '.never-selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .glyph {
    color: var(--_g);
    transition:
      color ${unsafeCSS(MOTION)},
      font-variation-settings ${unsafeCSS(MOTION)};
  }
  /* SRC-30: until the icon set can draw a glyph — the search glyph, or the close and back arrow inside the clear and back
     Buttons — nothing is drawn in its place (GlyphDrawnController sets data-drawn); every box keeps its size, so the
     bar's layout does not change, and the Buttons stay operable and named. The button's glyph box is the Button's icon
     box (its ::slotted rule sizes it, and it inherits the Button's icon family, fill and size). */
  .glyph,
  .button-glyph {
    visibility: hidden;
  }
  .glyph[data-drawn],
  .button-glyph[data-drawn] {
    visibility: visible;
  }
  .button-glyph {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* SRC-25: the slots' icon buttons keep their own tokens; the search only places them. */
  .leading,
  .trailing {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('container-gap')};
  }
  .leading[hidden],
  .trailing[hidden] {
    display: none;
  }
  .clear {
    flex: none;
  }
  /* SRC-1, SRC-34: the bar's action buttons — the clear button, then the trailing slot's — stand container.button-gap
     from one another between their visible bounds (0 in the default system), and two of them further apart only as far
     as each needs to keep sys.target.touch of length along the row, centred on itself, that its neighbour's does not
     reach into: a button at least that wide touches its neighbour, a narrower one stands half of what it lacks away
     (src/primitives/kept-length.ts; the element measures the buttons). The space before each of the trailing slot's
     buttons is an element of the trailing box's own, never a margin on the product's button, which a page's reset
     (\`* { margin: 0 }\`) would take away; so the row's own gap is none between them: the trailing box takes the bar's
     gap back after the clear button. The first action button still stands container.gap after the input and the last
     padding-inline-with-button from the end edge; no button is widened or restyled (SRC-25), whatever the pointer. */
  .clear + .trailing {
    margin-inline-start: calc(-1 * ${t('container-gap')});
  }
  ${keptSpaces('.trailing', { gap: T('container-button-gap') })}

  ${unsafeCSS(inputStyles)}

  /* SRC-18: where the focus style is glow, the glow around the bar while its input is focused (never a ring). */
  ${focusGlow((focus) => (focus === ':focus-visible' ? '.bar:has(.input:focus)' : ".bar[data-focus-style='glow']:has(.input:focus)"))}

  /* SRC-37: the shortcut hint — the keyboard shortcut component, hosted (KBS-13): in its plain form: a line of text in
     shortcut.typescale and shortcut.color, with no cap, fill or edge. In the bar it follows the input, container.gap
     from it, only while the value is empty (the element hides it otherwise) and the input does not have focus. A press on
     it is a press on the bar or the trigger: it takes none itself. */
  .hint {
    flex: none;
    font: ${t('shortcut-typescale-font')};
    letter-spacing: ${t('shortcut-typescale-letter-spacing')};
    color: ${t('shortcut-color')};
    pointer-events: none;
  }
  .hint[hidden],
  .bar:has(.input:focus) .hint {
    display: none;
  }

  /* SRC-35: the button trigger — one button as wide as its layout and at least trigger.container.height high, filled,
     raised and rounded as the bar is; in one row, vertically centred and trigger.container.gap apart: the search glyph at
     trigger.leading-icon.size, trigger.container.padding-inline from the start edge, the placeholder (or the label) on
     one line taking the remaining width, then the hint, the last ending trigger.container.padding-inline from the end
     edge. Logical, so right-to-left mirrors the row. */
  .trigger {
    ${unsafeCSS(paint(BAR, '-r', '', { outline: true }))}
    --_ripple: var(--_c-p);
    appearance: none;
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: ${t('trigger-container-gap')};
    inline-size: 100%;
    min-block-size: ${t('trigger-container-height')};
    margin: 0;
    border: 0;
    padding-block: 0;
    padding-inline: ${t('trigger-container-padding-inline')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    background: var(--_c);
    box-shadow: var(--_e);
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
    outline: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color ${unsafeCSS(MOTION)},
      box-shadow ${unsafeCSS(MOTION)},
      opacity ${unsafeCSS(MOTION)};
  }
  .trigger[hidden],
  .trigger-icon[hidden] {
    display: none;
  }
  /* SRC-36: hovered, keyboard-focused and pressed from the bar's tokens of that state, in that precedence; disabled
     from the disabled ones. Focus is shown by the focused outline, as the bar's (SRC-18). */
  ${stateRules(onTrigger, {
    hovered: paint(BAR, '-h', 'hovered', { outline: true }),
    focused: paint(BAR, '-f', 'focused', { outline: true }),
    pressed: paint(BAR, '-p', 'pressed', { outline: true }),
    pressedContent: paint(BAR, '-p', 'pressed', { outline: true, skip: 'c' }),
    disabled: `\n    cursor: default;${paint(BAR, '-d', 'disabled', { outline: true })}`,
  })}
  .trigger[data-pressed]:not([data-pressed='none']) :is(.outline, .glyph, .trigger-text) {
    transition-duration: 0s;
  }
  /* SRC-36, SRC-22: its hit area meets the minimum target on both axes. */
  ${minimumTarget('.trigger')}
  .trigger .glyph {
    --tanrei-icon-size: ${t('trigger-leading-icon-size')};
  }
  /* SRC-35: the trigger's text in trigger.label.typescale and the placeholder color, on one line, cut at its own end
     where it does not fit (SRC-33: a run of its own direction, placed by the layout's). */
  .trigger-text {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    font: ${t('trigger-label-typescale-font')};
    letter-spacing: ${t('trigger-label-typescale-letter-spacing')};
    color: var(--_h);
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color ${unsafeCSS(MOTION)};
  }
  ${productText('.trigger-text', { align: 'start' })}
  /* SRC-36: where the focus style is glow, the glow around the trigger while it has keyboard focus. */
  ${focusGlow((focus) => `.trigger${focus}`)}

  /* SRC-19, SRC-20: press-hold is carried by an element with no transition of its own. */
  .hold {
    display: none;
  }
  ${pressHold('.hold')}

  /* SRC-20: the ripple, in the pressed container color of whatever was pressed (the bar or a row). */
  ${rippleStyles({ color: '--_ripple', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* SRC-7: the docked view — a popover in the top layer placed under the bar by script, or in place with inline — as wide
     as the bar, on its color, elevation and corners (eased), its content clipped to that shape and inset by the padding. */
  .view {
    box-sizing: border-box;
    position: fixed;
    inset: auto;
    margin: 0;
    border: 0;
    padding: 0;
    color: inherit;
    flex-direction: column;
    overflow: hidden;
    background: ${t('view-container-color')};
    box-shadow: ${t('view-container-elevation')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-view-container-shape`))}
    /* The placement reads its two lengths through real properties (a custom property holds an expression). */
    scroll-margin-block-start: ${t('view-offset')};
    scroll-margin-block-end: ${t('view-viewport-margin')};
  }
  .view:popover-open,
  .view.inline {
    display: flex;
  }
  .view.inline {
    position: relative;
    margin-block-start: ${t('view-offset')};
  }
  .scroll {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-block: ${t('view-padding-block')};
    padding-inline: ${t('view-padding-inline')};
  }

  /* SRC-23: in, the docked view fades and grows from its edge that faces the bar; out, it fades. At once where motion is reduced. */
  .view.entering {
    transform-origin: top;
    animation: view-open ${t('motion-open-duration')} ${t('motion-open-easing')} both;
  }
  .view.entering.side-top {
    transform-origin: bottom;
  }
  .view.leaving {
    animation: view-close ${t('motion-close-duration')} ${t('motion-close-easing')} both;
  }
  @keyframes view-open {
    from {
      opacity: 0;
      transform: scaleY(0);
    }
  }
  @keyframes view-close {
    to {
      opacity: 0;
    }
  }

  /* SRC-9: the full-screen view — a modal <dialog> over the whole window — filled with the view's color to every edge,
     under every inset; its content inside the safe area and above the on-screen keyboard. With inline it is drawn in
     place, filling the element. */
  .full {
    box-sizing: border-box;
    position: fixed;
    inset: 0;
    margin: 0;
    inline-size: 100%;
    block-size: 100%;
    max-inline-size: none;
    max-block-size: none;
    border: 0;
    padding: 0;
    overflow: hidden;
    flex-direction: column;
    background: ${t('view-container-color')};
    color: inherit;
    outline: none;
    /* SRC-23: out, it fades over the close motion — kept in the top layer and displayed until it has. */
    opacity: 0;
    transition-property: opacity, display, overlay;
    transition-duration: ${t('motion-close-duration')};
    transition-timing-function: ${t('motion-close-easing')};
    transition-behavior: allow-discrete;
  }
  .full[open] {
    display: flex;
    opacity: 1;
    /* SRC-23: in, it fades in over the open motion. */
    transition-duration: ${t('motion-open-duration')};
    transition-timing-function: ${t('motion-open-easing')};
  }
  @starting-style {
    .full[open] {
      opacity: 0;
    }
  }
  .full::backdrop {
    background: transparent;
  }
  .full.inline {
    position: relative;
    inset: auto;
  }
  /* SRC-9: the header — the back button, the input and the clear button — at least header.height high, header.padding-inline
     from the window's edges (and inside the safe area), container.gap apart and vertically centred, in the resting colors. */
  .header {
    ${unsafeCSS(paint(BAR, '-r', ''))}
    box-sizing: border-box;
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('container-gap')};
    min-block-size: calc(${t('header-height')} + env(safe-area-inset-top, 0px));
    padding-block-start: env(safe-area-inset-top, 0px);
    padding-left: calc(${t('header-padding-inline')} + env(safe-area-inset-left, 0px));
    padding-right: calc(${t('header-padding-inline')} + env(safe-area-inset-right, 0px));
    cursor: text;
  }
  .header .back,
  .header .clear {
    flex: none;
  }
  /* SRC-11: the back arrow points to the start edge in right-to-left by the icon helper's own mirroring — arrow_back is
     flagged by the icon set, and the back Button marks and mirrors its glyph (BTN-19, SRC-32). Nothing here mirrors it. */
  /* SRC-9: a line of divider.thickness across the window under the header. */
  .divider {
    flex: none;
    block-size: ${t('divider-thickness')};
    background: ${t('divider-color')};
  }
  .full .scroll {
    padding-left: calc(${t('view-padding-inline')} + env(safe-area-inset-left, 0px));
    padding-right: calc(${t('view-padding-inline')} + env(safe-area-inset-right, 0px));
    padding-block-end: calc(${t('view-padding-block')} + max(env(safe-area-inset-bottom, 0px), var(--_keyboard, 0px)));
  }

  /* SRC-40: the dialog view — the same modal <dialog>, hung from the top of the window: centred between the side
     edges, its top view.dialog.offset below the top of the safe area, as wide as the window allows up to
     view.dialog.max-width while keeping view.viewport-margin from each side, and as tall as its content up to the room
     left above view.viewport-margin from the bottom of the safe area or the on-screen keyboard. Where the window is too
     short for the offset and one row of content, the offset gives way, down to view.viewport-margin. On the view's
     color, elevation and corners (eased), its content clipped to that shape. Its top never moves with its content.
     Percentages are of the window (of the element, drawn in place). */
  .full.hung {
    --_margin: ${t('view-viewport-margin')};
    --_room: calc(100% - max(env(safe-area-inset-bottom, 0px), var(--_keyboard, 0px)));
    --_one-row: calc(${t('header-height')} + ${t('divider-thickness')} + 2 * ${t('view-padding-block')} + ${d('suggestion-container-height')});
    --_top: max(var(--_margin), min(calc(${t('view-dialog-offset')} + env(safe-area-inset-top, 0px)), calc(var(--_room) - var(--_margin) - var(--_one-row))));
    inset: auto;
    inset-block-start: var(--_top);
    inset-inline: 0;
    margin-inline: auto;
    inline-size: min(${t('view-dialog-max-width')}, calc(100% - 2 * var(--_margin)));
    block-size: auto;
    max-block-size: calc(var(--_room) - var(--_top) - var(--_margin));
    box-shadow: ${t('view-container-elevation')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-view-container-shape`))}
  }
  .full.hung.inline {
    position: absolute;
    inset-block-start: var(--_top);
    inset-inline: 0;
  }
  /* SRC-40, SRC-41: the scrim over the whole window behind it, fading with it — the dialog's backdrop, or an element
     of its own where the view is drawn in place. */
  ${scrimFilter('.full.hung', T('view-scrim-blur'))}
  .full.hung::backdrop {
    background: ${t('view-scrim-color')};
    backdrop-filter: ${SCRIM_FILTER};
    opacity: 0;
    transition-property: opacity, display, overlay;
    transition-duration: ${t('motion-close-duration')};
    transition-timing-function: ${t('motion-close-easing')};
    transition-behavior: allow-discrete;
  }
  .full.hung[open]::backdrop {
    opacity: 1;
    transition-duration: ${t('motion-open-duration')};
    transition-timing-function: ${t('motion-open-easing')};
  }
  @starting-style {
    .full.hung[open]::backdrop {
      opacity: 0;
    }
  }
  ${scrimFilter('.scrim', T('view-scrim-blur'))}
  .scrim {
    position: absolute;
    inset: 0;
    background: ${t('view-scrim-color')};
    backdrop-filter: ${SCRIM_FILTER};
  }
  /* SRC-40: its header — the back button header.padding-inline from the start edge (as the full-screen header has it,
     in the search glyph's place), the input and the clear button, container.gap apart, the last ending
     header.padding-inline from the end edge when it is the clear button and container.padding-inline when it is the
     input. No search glyph. */
  .hung .header {
    min-block-size: ${t('header-height')};
    padding-block-start: 0;
    padding-inline: ${t('header-padding-inline')} ${t('container-padding-inline')};
  }
  .hung .header[data-end-button] {
    padding-inline-end: ${t('header-padding-inline')};
  }
  .hung .scroll {
    padding-block: ${t('view-padding-block')};
    padding-inline: ${t('view-padding-inline')};
  }
  /* SRC-40: with nothing under the header the view is the header alone. */
  .hung .scroll.empty {
    padding-block: 0;
  }

  /* SRC-47: the status row, between the suggestions and the results — inset as a suggestion's row is, taking no input
     and no state: statusText, wrapping, in status.typescale and status.color (status.error.color while the query
     failed), or the loading indicator at the row's start; one line of text high whether or not the indicator shows yet.
     SRC-48: its two live regions exist from the moment the view opens, so the row itself is always there and takes no
     room until it has something to show. */
  .status {
    display: flex;
    flex: none;
    align-items: center;
    font: ${t('status-typescale-font')};
    letter-spacing: ${t('status-typescale-letter-spacing')};
    color: ${t('status-color')};
  }
  .status[data-shown] {
    padding-block: ${R('suggestion-container-padding-block')};
    padding-inline: ${R('suggestion-container-padding-inline')};
  }
  /* One line of the status text, whatever the row holds. */
  .status[data-shown]::before {
    content: '\\200b';
    flex: none;
    inline-size: 0;
  }
  .status.error {
    color: ${t('status-error-color')};
  }
  .said {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }
  .spinner {
    flex: none;
  }
  ${productText('.said', { align: 'start' })}

  /* SRC-46, SRC-50: the results and result groups, in the product's order, after the status row: one list. */
  .results {
    display: flex;
    flex: none;
    flex-direction: column;
  }
  .results[hidden] {
    display: none;
  }

  /* SRC-16: each suggestion one row, at least suggestion.container.height tall and the minimum target for its pointer,
     padding-inline from each edge and padding-block above and below; the leading icon column (kept in every row while
     any suggestion has an icon), then the headline over the supporting text, gap after the icon column. Its highlight is
     rounded by suggestion.container.shape (eased). Logical, so right-to-left mirrors the row; the whole row is the hit area. */
  .listbox {
    display: flex;
    flex-direction: column;
  }
  .option {
    ${unsafeCSS(paint(ROW, '-r', ''))}
    --_ripple: var(--_sc-p);
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    display: flex;
    flex: none;
    align-items: center;
    gap: ${d('suggestion-container-gap')};
    padding-block: ${d('suggestion-container-padding-block')};
    padding-inline: ${d('suggestion-container-padding-inline')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-suggestion-container-shape`))}
    background: var(--_sc);
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color ${unsafeCSS(MOTION)},
      opacity ${unsafeCSS(MOTION)};
  }
  ${rowTarget('.option', D('suggestion-container-height'), POINTER)}
  /* SRC-17, SRC-20: hovered, active (the focused tokens) and pressed, in that precedence. */
  ${stateRules(onRow, {
    hovered: paint(ROW, '-h', 'hovered'),
    focused: paint(ROW, '-f', 'focused'),
    pressed: paint(ROW, '-p', 'pressed'),
    pressedContent: paint(ROW, '-p', 'pressed', { skip: 'sc' }),
    disabled: '',
  })}
  .option[data-pressed]:not([data-pressed='none']) :is(.option-icon, .headline, .supporting) {
    transition-duration: 0s;
  }
  /* SRC-17: the focus ring inside the active suggestion's row, never animated (ring or glow, SRC-21). */
  ${focusRing((focus) => (focus === ':focus-visible' ? '.option[data-active]' : ".option[data-active][data-focus-style='glow']"), { inside: true })}

  /* SRC-32: iconGlyph() mirrors a suggestion's leading glyph that GlyphMirrorController marked, in right-to-left. */
  ${iconGlyph('.option-icon', { size: '--_src-glyph', selected: '.never-selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .option-icon {
    color: var(--_si);
    transition:
      color ${unsafeCSS(MOTION)},
      font-variation-settings ${unsafeCSS(MOTION)};
  }
  .option-icon.empty {
    visibility: hidden;
  }
  .text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-inline-size: 0;
  }
  /* SRC-16: both texts wrap and grow the row rather than being cut. */
  .headline {
    font: ${t('suggestion-headline-typescale-font')};
    letter-spacing: ${t('suggestion-headline-typescale-letter-spacing')};
    color: var(--_sh);
    overflow-wrap: anywhere;
    transition: color ${unsafeCSS(MOTION)};
  }
  .supporting {
    font: ${t('suggestion-supporting-text-typescale-font')};
    letter-spacing: ${t('suggestion-supporting-text-typescale-letter-spacing')};
    color: var(--_ss);
    overflow-wrap: anywhere;
    transition: color ${unsafeCSS(MOTION)};
  }

  /* SRC-33: a suggestion's headline and supporting text are each a run of their own, in the direction of their first
     strong character, so a left-to-right name or a number with its unit keeps its order in a right-to-left list; their
     lines are still aligned to the layout's start edge (src/styles/product-text.ts). */
  ${productText(':is(.headline, .supporting)', { align: 'start' })}

  /* SRC-29: the product's own content in the view, after the suggestions, in the headline color as its inherited
     foreground, inset by the suggestion padding at the sides; plain text in sys.typescale.body. */
  .content {
    padding-inline: ${R('suggestion-container-padding-inline')};
    color: ${t('standard-suggestion-headline-color')};
    font: var(--tanrei-sys-typescale-body-font);
    letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing);
  }
  .content[hidden] {
    display: none;
  }

  /* SRC-21: corner smoothing, the shared rule, on the bar, the docked view and the rows. */
  ${shape}

  /* SRC-18, SRC-23: where motion is reduced, the states change and the view appears and disappears at once. */
  @media (prefers-reduced-motion: reduce) {
    .bar,
    .outline,
    .glyph,
    .input,
    .option,
    .option-icon,
    .headline,
    .supporting,
    .trigger,
    .trigger-text,
    .full,
    .full::backdrop {
      transition: none !important;
    }
    .view.entering,
    .view.leaving {
      animation: none;
    }
  }
  @media (forced-colors: active) {
    .bar {
      border: 1px solid FieldText;
    }
    .bar:has(.input:focus) {
      outline: 2px solid Highlight;
    }
    .trigger {
      border: 1px solid ButtonText;
    }
    .trigger:focus-visible {
      outline: 2px solid Highlight;
    }
    .trigger:disabled {
      border-color: GrayText;
    }
    .full.hung {
      border: 1px solid CanvasText;
    }
    .status.error {
      color: CanvasText;
    }
    .view {
      border: 1px solid CanvasText;
    }
    .option[data-active] {
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }
    .divider {
      background: CanvasText;
    }
  }
`;

/** A suggestion element is data, as an `<option>` in a `<datalist>`: the search draws the row. */
export const suggestionStyles = css`
  :host {
    display: none !important;
  }
`;

/**
 * A result's row (SRC-42): a suggestion's row, from the suggestion tokens — the same geometry, colors, states, focus
 * ring and press answer — drawn by the result itself, because the row is its own anchor. A linked group heading is the
 * same row (SRC-44).
 */
export const rowStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    /* SRC-53: the glyph's box of the search's density. */
    --_src-glyph: ${d('suggestion-leading-icon-size')};
  }
  :host([hidden]) {
    display: none;
  }
  ${unsafeCSS(conditionBlock(PREFIX, 'standard', ROW, ':host'))}

  /* SRC-42, SRC-16: one row, at least suggestion.container.height tall and the minimum target for its pointer,
     padding-inline from each edge and padding-block above and below; the leading icon column (kept in every row of the
     view while any suggestion or result has an icon), then the headline over the excerpt. The whole row is the hit area. */
  .row {
    ${unsafeCSS(paint(ROW, '-r', ''))}
    --_ripple: var(--_sc-p);
    appearance: none;
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: ${d('suggestion-container-gap')};
    inline-size: 100%;
    margin: 0;
    border: 0;
    padding-block: ${d('suggestion-container-padding-block')};
    padding-inline: ${d('suggestion-container-padding-inline')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-suggestion-container-shape`))}
    background: var(--_sc);
    color: inherit;
    font: inherit;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color ${unsafeCSS(MOTION)},
      opacity ${unsafeCSS(MOTION)};
  }
  ${rowTarget('.row', D('suggestion-container-height'), POINTER)}
  /* SRC-42: hovered, focused (where a suggestion is active) and pressed, in that precedence (SRC-17, SRC-20). */
  ${stateRules(onResult, {
    hovered: paint(ROW, '-h', 'hovered'),
    focused: paint(ROW, '-f', 'focused'),
    pressed: paint(ROW, '-p', 'pressed'),
    pressedContent: paint(ROW, '-p', 'pressed', { skip: 'sc' }),
    disabled: '',
  })}
  .row[data-pressed]:not([data-pressed='none']) :is(.icon, .headline, .excerpt) {
    transition-duration: 0s;
  }
  /* SRC-42, SRC-49: the focus ring inside the focused or current result's row, never animated (ring or glow, SRC-21). */
  ${focusRing(onResultFocus, { inside: true })}

  /* SRC-32: iconGlyph() mirrors a leading glyph the element marked, in right-to-left. */
  ${iconGlyph('.icon', { size: '--_src-glyph', selected: '.never-selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .icon {
    color: var(--_si);
    transition:
      color ${unsafeCSS(MOTION)},
      font-variation-settings ${unsafeCSS(MOTION)};
  }
  .icon.empty {
    visibility: hidden;
  }
  .text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-inline-size: 0;
  }
  .headline {
    font: ${t('suggestion-headline-typescale-font')};
    letter-spacing: ${t('suggestion-headline-typescale-letter-spacing')};
    color: var(--_sh);
    overflow-wrap: anywhere;
    transition: color ${unsafeCSS(MOTION)};
  }
  /* SRC-43: the excerpt — one continuous text that wraps as one, in the supporting text's style and color. */
  .excerpt {
    display: block;
    font: ${t('suggestion-supporting-text-typescale-font')};
    letter-spacing: ${t('suggestion-supporting-text-typescale-letter-spacing')};
    color: var(--_ss);
    overflow-wrap: anywhere;
    transition: color ${unsafeCSS(MOTION)};
  }
  /* SRC-43: a match — in result.mark.color, its weight raised by result.mark.emphasis, over a fill of
     result.mark.container.color that covers its own line boxes: square, unpadded, so it moves no text. The runs the
     element writes are <mark>s of its own; the product's are its child content. */
  mark,
  ::slotted(mark) {
    margin: 0;
    border-radius: 0;
    padding: 0;
    background-color: ${t('result-mark-container-color')};
    color: ${t('result-mark-color')};
    font-weight: calc(${t('suggestion-supporting-text-typescale-font-weight')} + ${t('result-mark-emphasis')});
  }
  /* SRC-43, SRC-33: the headline and the whole excerpt are each text of their own direction, aligned by the layout's. */
  ${productText(':is(.headline, .excerpt)', { align: 'start' })}

  /* SRC-20: the ripple, in the pressed container color. */
  ${rippleStyles({ color: '--_ripple', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* SRC-21: corner smoothing, the shared rule. */
  ${shape}

  @media (prefers-reduced-motion: reduce) {
    .row,
    .icon,
    .headline,
    .excerpt {
      transition: none !important;
    }
  }
  @media (forced-colors: active) {
    .row:is(:focus-visible, [data-current]) {
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }
    mark,
    ::slotted(mark) {
      background-color: Mark;
      color: MarkText;
    }
  }
`;

/**
 * A result group (SRC-44): its heading — a quiet title, or a result's row while it has a destination — then its
 * results, group.gap from what stands above and below it in the view; under a linked heading they step in by
 * group.indent, hit areas and highlights with them.
 */
export const groupStyles = css`
  .group.before {
    padding-block-start: ${t('group-gap')};
  }
  .group.after {
    padding-block-end: ${t('group-gap')};
  }
  .title {
    padding-block: ${R('suggestion-container-padding-block')};
    padding-inline: ${R('suggestion-container-padding-inline')};
    font: ${t('group-title-typescale-font')};
    letter-spacing: ${t('group-title-typescale-letter-spacing')};
    color: ${t('group-title-color')};
    overflow-wrap: anywhere;
  }
  ${productText('.title', { align: 'start' })}
  .list {
    display: flex;
    flex-direction: column;
  }
  .group.linked .list {
    padding-inline-start: ${t('group-indent')};
  }
`;
