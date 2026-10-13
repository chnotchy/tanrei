import { css, unsafeCSS } from 'lit';
import { focusRing, iconGlyph, minimumTarget, pressHold, rippleStyles, stateRules, whenChosen } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';
import { scriptTracking } from '../../styles/script-tracking.js';

// Every visual value is a token (tokens/comp/snackbar.tokens.json). The action and the close button are the two values
// of the snackbar's control axis: each has its container and content colors per state, and they share the
// geometry under `controls.*`; the expand button reads the close button's tokens. The bar itself answers no state.
//
// A snackbar has ten forms (SNK-21, SNK-30): its status (default, info, warning, error, success), on a surface of the
// scheme or drawn inverse. A form is a condition written as a one-word prefix — none, `<status>`, `inverse`,
// `inverse-<status>` — inside each control value (`action-hovered-inverse-info-container-color`) and before the bar's
// own parts (`inverse-info-container-color`, `inverse-info-focus-ring-color`). Each form's block hands its tokens to the
// same private properties, so being drawn inverse changes colors and nothing else.
const PREFIX = '--tanrei-comp-snackbar';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
/**
 * A part's color drawn at one of the component's opacities (SNK-21, SNK-31, SNK-32, SNK-33): the color mixed with
 * transparent, never the element's `opacity`, so nothing else in or around that part fades with it — the focus
 * indicator, a ripple, a child, the bar. At 1 it is the color; at 0 it draws nothing.
 */
const faded = (color: string, opacity: string) => unsafeCSS(`color-mix(in srgb, ${color} calc(${T(opacity)} * 100%), transparent)`);

export const STATUSES = ['info', 'warning', 'error', 'success'] as const;
const STATES = { '': '-r', hovered: '-h', focused: '-f', pressed: '-p' } as const;
/** `comp.snackbar.container.inverse`, the system's choice (SNK-30). The first value is the default, and what an unknown name is. */
export const INVERSE = ['off', 'on'] as const;
/** The choice as the host carries it: its `inverse` attribute's, or — unset — the component token's (the choice's NAME). */
export const INVERSE_PROPERTY = '--_inverse';
/** The component token itself: the system's choice as the cascade gives it to the host, whatever its attribute says. */
export const INVERSE_TOKEN = `${PREFIX}-container-inverse`;
/** One control's colors in every state, as `--_c-h` (container, hovered), `--_o-p` (content, pressed)… in one form. */
const controlBlock = (control: 'action' | 'close', selector: string, form = '') =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([state, suffix]) => {
      const name = [control, state, form].filter(Boolean).join('-');
      return [`  --_c${suffix}: var(${PREFIX}-${name}-container-color);`, `  --_o${suffix}: var(${PREFIX}-${name}-content-color);`];
    })
    .join('\n')}\n}`;
/**
 * The bar's own colors in one form, as `--_bar`, `--_title`, `--_text`, `--_icon` (a status form's glyph), `--_edge` (a
 * status form's edge, SNK-31) and `--_focus` (the outer stroke of the focus indicator drawn on this bar, SNK-3).
 */
const barBlock = (selector: string, form: string, glyph: boolean) => {
  const part = (name: string) => `var(${PREFIX}-${form ? `${form}-` : ''}${name})`;
  return `${selector} {
  --_bar: ${part('container-color')};
  --_title: ${part('title-color')};
  --_text: ${part('supporting-text-color')};${glyph ? `\n  --_icon: ${part('icon-color')};\n  --_edge: ${part('outline-color')};` : ''}
  --_focus: ${part('focus-ring-color')};
}`;
};
/** The five forms of `bar` on a surface (`inverse` false) or drawn inverse: each status's block, the default's first. */
const formBlocks = (bar: string, inverse: boolean) =>
  (['default', ...STATUSES] as const)
    .map((status) => {
      const form = [inverse ? 'inverse' : '', status === 'default' ? '' : status].filter(Boolean).join('-');
      const of = `${bar}[data-status='${status}']`;
      return `${barBlock(of, form, status !== 'default')}
${controlBlock('action', `${of} .action`, form)}
${controlBlock('close', `${of} :is(.close, .expand)`, form)}`;
    })
    .join('\n');

/** Where each state is read (SNK-2): on the control (a native button). */
const on = (state: string) => `.control${state}`;
const paint = (suffix: string, container = true) => `${container ? `\n    background: var(--_c${suffix});` : ''}
    color: var(--_o${suffix});`;
/** A line of the message, and of the title: the controls and the glyph are centred on the text's first line (SNK-29). */
const lineOf = (text: string) => `calc(${T(`${text}-typescale-line-height`)} * ${T(`${text}-typescale-font-size`)})`;

export const styles = css`
  :host {
    /* One row that shrinks to the height it is given (SNK-19, SNK-25), so the bar's own height is definite. */
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    /* The bar is as wide as its content between its bounds, never wider than the space it has (SNK-14); in place, the
       height it is given stands for its host's area (SNK-19). */
    max-inline-size: 100%;
    max-block-size: 100%;
    /* SNK-30: whether it is drawn inverse — the system's choice (its NAME, as the cascade gives it here)… */
    ${unsafeCSS(INVERSE_PROPERTY)}: ${t('container-inverse')};
  }
  /* …unless the snackbar says so itself: the inverse attribute (true), or inverse="false". */
  :host([inverse]) {
    ${unsafeCSS(INVERSE_PROPERTY)}: on;
  }
  :host([inverse='false' i]) {
    ${unsafeCSS(INVERSE_PROPERTY)}: off;
  }
  /* SNK-13: shown by its host as a manual popover — in the top layer, at the bottom of the window, centred, the margin
     above the bottom edge (and the keyboard, and the safe area) and from the sides. None of the browser's popover box. */
  :host([popover]) {
    box-sizing: border-box;
    position: fixed;
    inset: auto 0 calc(${t('container-margin')} + env(safe-area-inset-bottom, 0px) + var(--tanrei-snackbar-keyboard, 0px)) 0;
    inline-size: fit-content;
    max-inline-size: calc(100% - 2 * ${t('container-margin')});
    /* SNK-25: the host's area — the window less the margin above and below, inside the safe area, above the keyboard. */
    max-block-size: calc(100dvh - 2 * ${t('container-margin')} - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - var(--tanrei-snackbar-keyboard, 0px));
    margin: 0 auto;
    border: 0;
    padding: 0;
    overflow: visible;
    background: transparent;
    color: inherit;
  }
  /* In the window, "the space it has" is the window less the margin on each side. */
  :host([popover]) .bar {
    min-inline-size: min(${t('container-min-width')}, 100vw - 2 * ${t('container-margin')});
    max-inline-size: min(${t('container-max-width')}, 100vw - 2 * ${t('container-margin')});
  }
  :host([popover]:not(:popover-open)) {
    display: none;
  }

  /* SNK-15: a control — the action's label, or a glyph in a square — at least controls.height tall, on its corners. */
  /* SNK-21, SNK-30: the five forms on a surface, then the five drawn inverse — by a style query on the host's choice,
     which follows the attribute, a layer and a system switched on any ancestor with no script, and by data-inverse
     (written by the element) in a browser without style queries. */
  ${unsafeCSS(formBlocks('.bar', false))}
  ${whenChosen(INVERSE_PROPERTY, '.bar', 'inverse', 'on', (bar) => formBlocks(bar, true))}
  .control {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the content. */
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: ${t('controls-height')};
    ${unsafeCSS(cornerRadius('--tanrei-comp-snackbar-controls-shape'))}
    ${unsafeCSS(paint('-r'))}
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  /* SNK-14, SNK-15, SNK-21: the bar — a grid of the status glyph, the text and the controls — at least its minimum
     height, as wide as its content between its bounds, on its form's color, elevation and corners.
     SNK-29: its content is aligned to the top. The first line of the text is centred half of the minimum height below
     the top edge — or lower where the padding plus half that line is more (enlarged text) — by the padding above it;
     the glyph and the first row's controls are centred on that line; every height the bar has beyond its content lies
     below it. Nothing here depends on the bar's height, so nothing of the first row moves while the bar grows or
     shrinks (SNK-24). */
  .bar {
    --_line: ${unsafeCSS(lineOf('supporting-text'))};
    box-sizing: border-box;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto auto;
    grid-template-areas: 'icon text action expand close';
    align-content: start;
    inline-size: fit-content;
    /* SNK-19: outside a host it is centred across the width it is given, as SNK-13 centres it in a host (where the
       host's box is as wide as the bar, so this does nothing). */
    margin-inline: auto;
    min-inline-size: min(${t('container-min-width')}, 100%);
    max-inline-size: min(${t('container-max-width')}, 100%);
    min-block-size: ${t('container-min-height')};
    max-block-size: 100%;
    padding-block: max(${t('container-padding-block')}, calc((${t('container-min-height')} - var(--_line)) / 2)) ${t('container-padding-block')};
    padding-inline: ${t('container-padding-inline-start')} ${t('container-padding-inline-end')};
    background: var(--_bar);
    box-shadow: ${t('container-elevation')};
    ${unsafeCSS(cornerRadius('--tanrei-comp-snackbar-container-shape'))}
    text-align: start;
  }
  /* SNK-31: a status form's edge — a layer of its own before the elevation's (so over its ring and above its shadows),
     outline.width wide outside the bar's bounds and on its corners, where that ring lies: a shadow takes no room, so the
     bar's box and everything in and around it stay where they are, and a control's focus indicator, a child's, is drawn
     above it. The form's outline color at outline.opacity, which is an opacity of that color alone. The default and the
     inverse form have no rule here: the ring of their elevation shows alone. */
  .bar:not([data-status='default']) {
    box-shadow:
      0 0 0 ${t('outline-width')} ${faded('var(--_edge)', 'outline-opacity')},
      ${t('container-elevation')};
  }
  /* The text's first line is the title's when there is one. */
  .bar.titled {
    --_line: ${unsafeCSS(lineOf('title'))};
  }
  .bar.controls {
    padding-inline-end: ${t('container-padding-inline-end-with-controls')};
  }

  /* SNK-21: the status glyph, icon.gap before the text, centred on its first line, never mirrored (the glyph box is
     left-to-right whatever the direction); hidden from assistive technology. */
  .status {
    grid-area: icon;
    align-self: start;
    margin-block: calc((var(--_line) - ${t('icon-size')}) / 2);
    /* The form's icon color at icon.opacity: of the glyph alone. */
    color: ${faded('var(--_icon)', 'icon-opacity')};
  }
  /* SNK-18: the gap is the text's, on the glyph's side: the glyph box is left-to-right in every direction, so a logical
     margin of its own would stay on its right in a right-to-left layout — away from the text. */
  .status + .text {
    margin-inline-start: ${t('icon-gap')};
  }
  ${iconGlyph('.status', { size: `${PREFIX}-icon-size`, selected: ':not(*)', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* The text: the status in words for assistive technology, the title, then the message (SNK-21, SNK-22). */
  .text {
    grid-area: text;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: ${t('title-gap')};
    align-self: start;
    min-inline-size: 0;
    min-block-size: 0;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
  }
  .status-label {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  .title {
    font: ${t('title-typescale-font')};
    letter-spacing: ${t('title-typescale-letter-spacing')};
    color: var(--_title);
    overflow-wrap: break-word;
  }
  /* SNK-22: the title's letter-spacing follows its script (src/styles/script-tracking.ts). */
  ${unsafeCSS(scriptTracking('.title', String(t('title-typescale-letter-spacing')), { shadow: true }))}
  .message {
    font: ${t('supporting-text-typescale-font')};
    letter-spacing: ${t('supporting-text-typescale-letter-spacing')};
    color: var(--_text);
    overflow-wrap: break-word;
  }
  /* SNK-32: under a title the message is the description, drawn at supporting-text.under-title.opacity of its form's
     message color — the text alone, collapsed and expanded; the title, and a message without one, are drawn whole. */
  .bar.titled .message {
    color: ${faded('var(--_text)', 'supporting-text-under-title-opacity')};
  }
  /* SNK-23: collapsed, the title and the message each end with an ellipsis at their line limit; the whole of both is
     still in the accessibility tree. */
  .title {
    --_max-lines: ${t('title-max-lines')};
  }
  .message {
    --_max-lines: ${t('supporting-text-max-lines')};
  }
  .bar:not(.expanded) :is(.title, .message) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--_max-lines);
    overflow: hidden;
  }
  .title,
  .message {
    flex: none;
  }
  /* SNK-28: the title and the message are each a run of their own, in the direction of their first strong character — a
     left-to-right name or a number with its unit keeps its order in a right-to-left snackbar, and a text cut at its line
     limit (SNK-23) loses the end of its own direction — and their lines are still aligned to the layout's start edge.
     The action's label is isolated the same way, centred in its button (src/styles/product-text.ts). */
  ${productText(':is(.title, .message)', { align: 'start' })}
  /* A text that IS cut at its line limit is aligned by its own direction instead: Chromium draws a line clamp's ellipsis
     past the box (and clips it, with the last letter) on a left-to-right line that is aligned to the right, so a cut
     left-to-right text in a right-to-left snackbar keeps its ellipsis and starts at its own left. */
  .bar.cut :is(.title, .message) {
    text-align: start;
  }
  ${productText('.action .hold')}
  /* SNK-25: expanded and taller than it may be (the host's area, or the height it is given in place), the bar takes that
     height and the text scrolls inside it; the glyph, the controls and an action on its own row stay. */
  .bar.expanded {
    grid-template-rows: minmax(0, 1fr);
  }
  .bar.expanded.stacked {
    grid-template-rows: minmax(0, 1fr) auto;
  }
  .bar.expanded .text {
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  /* SNK-3: the indicator inside the scrolling text, its outer stroke in the form's focus color — drawn by a box over
     the text, in its place in the bar, that does not scroll with it (a box of the text's own would move away with what
     scrolls). */
  .text:focus-visible {
    outline: none;
  }
  .focus {
    grid-area: text;
    position: relative;
    align-self: stretch;
    min-inline-size: 0;
    min-block-size: 0;
    ${unsafeCSS(cornerRadius('--tanrei-sys-shape-corner-none'))}
    pointer-events: none;
  }
  .status + .text + .focus {
    margin-inline-start: ${t('icon-gap')};
  }
  ${focusRing((focus) => `.text${focus} ~ .focus`, { inside: true, color: 'var(--_focus)' })}

  /* The first control is container.gap after the text, the next ones controls.gap after the one before; each is
     centred on the text's first line, overlapping the padding rather than growing the row. */
  .control {
    align-self: start;
    margin-block: calc((var(--_line) - ${t('controls-height')}) / 2);
    margin-inline-start: ${t('container-gap')};
  }
  .control + .control {
    margin-inline-start: ${t('controls-gap')};
  }
  .action {
    grid-area: action;
  }
  .expand {
    grid-area: expand;
  }
  .close {
    grid-area: close;
  }
  /* SNK-16: the action on its own row below the text, end-aligned, container.gap below the text, with the controls' end
     inset below it; the expand and close buttons stay at the end of the first row.
     SNK-29: the text's row takes whatever height the bar has beyond the action's row — none at rest, where the bar is as
     tall as its content — so that while the bar grows or shrinks the action keeps its distance from the bottom edge. */
  .bar.stacked {
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      'icon text expand close'
      'action action action action';
    padding-block-end: ${t('container-padding-inline-end-with-controls')};
  }
  .bar.stacked .action {
    justify-self: end;
    margin-block: ${t('container-gap')} 0;
    margin-inline-start: 0;
  }
  .bar.stacked .action + .control {
    margin-inline-start: ${t('container-gap')};
  }
  /* Expanded, the text fills its row, which holds it to the height the bar may take (SNK-25). */
  .bar.expanded .text {
    align-self: stretch;
  }

  .action {
    padding-inline: ${t('controls-padding-inline')};
    font: ${t('controls-label-typescale-font')};
    letter-spacing: ${t('controls-label-typescale-letter-spacing')};
    /* SNK-16: the label never wraps or is cut. */
    white-space: nowrap;
  }
  /* SNK-33: the action's tonal layer — its content color of the form and the state it is in (the color the label is
     drawn in, so it follows every state and its transition) at action.tonal-layer.opacity, filling the container to its
     corners, in every state. It is the label's own layer under the label: above the container color of the state and,
     later in the same stacking order, above a ripple (the control's first child); it takes no press and no room. Not on
     the expand or the close button. At 0 it is transparent: the action is its container alone. */
  .action .hold {
    corner-shape: inherit;
  }
  .action .hold::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: 0;
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    corner-shape: inherit;
    background: ${faded('currentColor', 'action-tonal-layer-opacity')};
    pointer-events: none;
  }
  .close,
  .expand {
    inline-size: ${t('controls-height')};
    block-size: ${t('controls-height')};
  }
  ${iconGlyph('.icon', { size: `${PREFIX}-controls-icon-size`, selected: ':not(*)', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  /* SNK-26: nothing in a glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn); the box keeps
     its size. */
  .status:not([data-drawn]),
  .icon:not([data-drawn]) {
    visibility: hidden;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* SNK-4: each control's hit area meets the minimum target without changing its visual size. */
  ${minimumTarget('.control')}

  /* SNK-2, SNK-5, SNK-6: each state paints the control from that state's tokens; pressed > focused > hovered. */
  ${stateRules(on, {
    hovered: `${paint('-h')}
    opacity: ${T('hovered-opacity')};`,
    focused: `${paint('-f')}
    opacity: ${T('focused-opacity')};`,
    pressed: `${paint('-p')}
    opacity: ${T('pressed-opacity')};`,
    pressedContent: `${paint('-p', false)}
    opacity: ${T('pressed-opacity')};`,
    disabled: '',
  })}

  /* SNK-6 ripple: grows over comp.snackbar.motion.feedback-duration and fades over motion.state-duration. */
  ${rippleStyles({
    color: '--_c-p',
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}

  /* SNK-3, SNK-7: the ring (or the glow) around the focused control, never animated, its outer stroke in the form's
     focus color: the indicator is drawn on the bar, so the bar decides what shows on it. */
  ${focusRing(on, { color: 'var(--_focus)' })}

  /* SNK-7: corner smoothing on the bar and the controls (data-tanrei-shape). */
  ${shape}

  /* SNK-5: the label and the glyph carry press-hold for PressController. */
  ${pressHold('.hold')}

  /* SNK-24: while the bar grows or shrinks, what is outside its new height is clipped — and the text, held to a row
     shorter than itself for the length of the motion, is cut there rather than given a scrollbar. */
  .bar.resizing {
    overflow: clip;
  }
  .bar.resizing .text {
    overflow-y: hidden;
  }

  /* SNK-17: in, it rises from below the bottom edge by its own height plus its margin while fading in; out, it fades in
     place. Where motion is reduced it only fades. */
  :host(.entering) {
    animation: snackbar-in ${t('motion-enter-duration')} ${t('motion-enter-easing')} both;
  }
  :host(.leaving) {
    animation: snackbar-out ${t('motion-exit-duration')} ${t('motion-exit-easing')} both;
  }
  @keyframes snackbar-in {
    from {
      opacity: 0;
      translate: 0 calc(100% + ${t('container-margin')});
    }
  }
  @keyframes snackbar-out {
    to {
      opacity: 0;
    }
  }
  @keyframes snackbar-fade-in {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :host(.entering) {
      animation-name: snackbar-fade-in;
    }
    .control {
      transition: none;
    }
  }

  /* SNK-8, SNK-24: the timeouts and the expand motion, read through real properties by script; these draw nothing. */
  .timing {
    display: none;
    transition-property: none;
    transition-delay: ${t('timeout-short')};
    transition-duration: ${t('timeout-long')};
  }
  .expand-timing {
    display: none;
    transition-property: none;
    transition-duration: ${t('motion-expand-duration')};
    transition-timing-function: ${t('motion-expand-easing')};
  }

  @media (forced-colors: active) {
    .bar {
      border: 1px solid CanvasText;
    }
    .control {
      border: 1px solid ButtonText;
    }
    /* The system's colors, whole: no layer of the component's own over them. */
    .action .hold::before {
      display: none;
    }
  }
`;

/** The host: the two live regions (SNK-10), drawn nowhere; its snackbars are in the top layer. */
export const hostStyles = css`
  :host {
    display: block;
  }
  .announce {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
`;
