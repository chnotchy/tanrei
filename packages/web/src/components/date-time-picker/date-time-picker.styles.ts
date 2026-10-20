import { css, unsafeCSS } from 'lit';
import { SCRIM_FILTER, conditionBlock, focusRing, minimumTarget, pressHold, rippleStyles, scrimFilter, stateRules } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';
import { scriptTracking } from '../../styles/script-tracking.js';

// Every visual value is a token (tokens/comp/date-time-picker.tokens.json). The selectors have two conditions —
// unselected and selected — which are their state variants: each colors the container, the label and the
// outline in every state. A range field reads the same condition tokens (DTM-15): selected is the end being set, as it
// is the unit being set — and a wheel that a number is typed into reads the selected ones at rest (DTM-43). How a state looks is the design system's decision; the picker only says which
// state's tokens are drawn. The components it places — the calendar, the tabs, Cancel and OK — keep their own tokens.
const PREFIX = '--tanrei-comp-date-time-picker';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The window less the safe area and the margins on each side (DTM-1): what a modal picker is centred in. */
const INLINE_ROOM = `calc(100% - 2 * ${T('modal-container-margin')} - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))`;
const BLOCK_ROOM = `calc(100% - 2 * ${T('modal-container-margin')} - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`;

/** What each condition colors in every state, as private properties (`--_c-h`: the container, hovered). */
const SELECTOR_PARTS = { c: 'selector-container-color', l: 'selector-label-color', o: 'selector-outline-color', w: 'selector-outline-width' } as const;

/**
 * DTM-27, DTM-30: each state sets, on the selector, the current value of every part from that state's tokens of its
 * condition, and the picker's opacity for that state; pressed > focused > hovered. Under ripple and dim everything but
 * the container color comes from the pressed tokens; under none nothing changes.
 */
function conditionRules(on: string, parts: Record<string, string>): string {
  const set = (suffix: string, skip?: string) =>
    Object.keys(parts)
      .filter((key) => key !== skip)
      .map((key) => `\n    --_${key}: var(--_${key}${suffix});`)
      .join('');
  const opacity = (state: string) => `\n    opacity: var(${PREFIX}-${state}-opacity);`;
  const where = (state: string) => `${on}:where(${state})`;
  return `
  ${on} {${set('-r')}
  }
  ${stateRules(where, {
    hovered: `${set('-h')}${opacity('hovered')}`,
    focused: `${set('-f')}${opacity('focused')}`,
    pressed: `${set('-p')}${opacity('pressed')}`,
    pressedContent: `${set('-p', 'c')}${opacity('pressed')}`,
    disabled: '',
  })}`;
}

const WHEEL = `${T('motion-wheel-duration')} ${T('motion-wheel-easing')}`;
const STATE = `${T('motion-state-duration')} ${T('motion-state-easing')}`;

/** What is drawn from the selector's condition tokens: a selector of the time display, and a range field (DTM-15, DTM-27). */
const FIELD = ':is(.selector, .range-field)';
/** The focus condition of a control whose keyboard focus the picker tracks itself (`data-ring`): focus, however the browser reads it. */
const ownFocus = (focus: string) => focus.replace(':focus-visible', ':focus');

export const styles = css`
  :host {
    display: contents;
    /* DTM-32: the selectors sit side by side, and a wheel's rows one above the other, so each is at least the target. */
    --_target: var(--tanrei-sys-target-pointer);
  }
  @media (pointer: coarse) {
    :host {
      --_target: var(--tanrei-sys-target-touch);
    }
  }

  .surface {
    box-sizing: border-box;
    flex-direction: column;
    margin: 0;
    border: 0;
    padding: 0;
    overflow: hidden;
    color: ${t('separator-color')};
    text-align: start;
    outline: none;
  }

  /* DTM-1: a native modal <dialog> in the top layer, centred in the window above the keyboard, at least modal.margin
     from every edge; its color, elevation and corners (eased by the smoothing). */
  .surface.modal {
    position: fixed;
    inset: 0 0 var(--_keyboard, 0px) 0;
    margin: auto;
    inline-size: fit-content;
    max-inline-size: ${unsafeCSS(INLINE_ROOM)};
    block-size: fit-content;
    max-block-size: ${unsafeCSS(BLOCK_ROOM)};
    background: ${t('modal-container-color')};
    box-shadow: ${t('modal-container-elevation')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-modal-container-shape`))}
    /* DTM-35: out, it fades over the close motion — kept in the top layer and displayed until it has. */
    opacity: 0;
    transition-property: opacity, scale, display, overlay;
    transition-duration: ${t('modal-motion-close-duration')};
    transition-timing-function: ${t('modal-motion-close-easing')};
    transition-behavior: allow-discrete;
  }
  .surface.modal[open] {
    display: flex;
    opacity: 1;
    /* DTM-35: in, it fades in and grows about its centre from enter-scale over the open motion. */
    transition-duration: ${t('modal-motion-open-duration')};
    transition-timing-function: ${t('modal-motion-open-easing')};
  }
  @starting-style {
    .surface.modal[open] {
      opacity: 0;
      scale: ${t('modal-motion-enter-scale')};
    }
  }
  /* DTM-1, MDL-1: the modal layer's scrim, over the whole window behind the picker (its color and blur), fading with it. */
  ${scrimFilter('.surface.modal', T('modal-scrim-blur'))}
  .surface.modal::backdrop {
    background: ${t('modal-scrim-color')};
    backdrop-filter: ${SCRIM_FILTER};
    opacity: 0;
    transition-property: opacity, display, overlay;
    transition-duration: ${t('modal-motion-close-duration')};
    transition-timing-function: ${t('modal-motion-close-easing')};
    transition-behavior: allow-discrete;
  }
  .surface.modal[open]::backdrop {
    opacity: 1;
    transition-duration: ${t('modal-motion-open-duration')};
    transition-timing-function: ${t('modal-motion-open-easing')};
  }
  @starting-style {
    .surface.modal[open]::backdrop {
      opacity: 0;
    }
  }
  /* DTM-35: where motion is reduced a modal picker only fades. */
  @media (prefers-reduced-motion: reduce) {
    .surface.modal {
      transition-property: opacity, display, overlay;
    }
  }

  /* DTM-2: a docked picker is a manual popover in the top layer, placed by script below its anchor; its color,
     elevation and corners. Its placement reads its two lengths through real properties. */
  .surface.docked {
    position: fixed;
    inset: auto;
    inline-size: fit-content;
    max-inline-size: 100vw;
    background: ${t('docked-container-color')};
    box-shadow: ${t('docked-container-elevation')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-docked-container-shape`))}
    scroll-margin-block-start: ${t('docked-offset')};
    scroll-margin-block-end: ${t('docked-viewport-margin')};
  }
  .surface.docked:popover-open,
  .surface.inline {
    display: flex;
  }
  /* In place (the inline test attribute): at its natural size where it stands, without the overlay. */
  .surface.inline {
    position: relative;
    inset: auto;
    opacity: 1;
    max-block-size: none;
  }
  /* DTM-35: a docked picker fades in and grows from the edge that faces the anchor; it fades out. At once where motion is reduced. */
  .surface.docked.entering {
    transform-origin: top;
    animation: docked-open ${t('docked-motion-open-duration')} ${t('docked-motion-open-easing')} both;
  }
  .surface.docked.entering.side-top {
    transform-origin: bottom;
  }
  .surface.docked.leaving {
    animation: docked-close ${t('docked-motion-close-duration')} ${t('docked-motion-close-easing')} both;
  }
  @keyframes docked-open {
    from {
      opacity: 0;
      transform: scaleY(0);
    }
  }
  @keyframes docked-close {
    to {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .surface.docked.entering,
    .surface.docked.leaving {
      animation: none;
    }
  }

  /* DTM-10: the title row — the label at the start, the entry-mode tabs at the end — and, in a modal picker with a date,
     the pending value below it, header.gap apart, and the divider below the header. It grows with enlarged text; the
     value wraps. */
  .header {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: ${t('header-gap')};
    padding-block: ${t('header-padding-block')};
    padding-inline: ${t('header-padding-inline-start')} ${t('header-padding-inline-end')};
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: ${t('header-gap')};
  }
  .title {
    flex: 1 1 auto;
    min-inline-size: 0;
    font: ${t('header-label-typescale-font')};
    letter-spacing: ${t('header-label-typescale-letter-spacing')};
    color: ${t('header-label-color')};
    overflow-wrap: break-word;
  }
  .entry-tabs {
    flex: none;
    max-inline-size: 100%;
  }
  /* (The header's value alone: a selector's and a range field's text carry the same class, in their own roles.) */
  .header > .value {
    font: ${t('header-value-typescale-font')};
    letter-spacing: ${t('header-value-typescale-letter-spacing')};
    color: ${t('header-value-color')};
    overflow-wrap: break-word;
  }
  /* DTM-10: the header's value's letter-spacing follows its script (src/styles/script-tracking.ts). */
  ${unsafeCSS(scriptTracking('.header > .value', String(t('header-value-typescale-letter-spacing')), { shadow: true }))}
  .placeholder {
    color: ${t('header-placeholder-color')};
  }
  .divider {
    flex: none;
    block-size: ${t('divider-width')};
    background: ${t('divider-color')};
  }

  /* DTM-9: the body — the calendar above the time section (vertical) or beside it (horizontal), container.gap apart,
     inset by the padding. DTM-36: the header and the actions stay; the body scrolls between them; with no room left for
     them, everything scrolls together. */
  .body {
    --_line: max(${t('wheel-row-height')}, var(--_target));
    display: flex;
    flex: 0 1 auto;
    flex-direction: column;
    align-items: center;
    gap: ${t('container-gap')};
    min-block-size: 0;
    padding-block: ${t('container-padding-block')};
    padding-inline: ${t('container-padding-inline')};
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .surface[data-layout='horizontal'] .body {
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
  }
  .surface.whole {
    overflow-y: auto;
  }
  .surface.whole .body {
    flex: none;
    overflow: visible;
  }
  .calendar {
    flex: none;
    max-inline-size: 100%;
  }

  /* DTM-12: the time section — the range display across its whole width, then the time display and the wheels or the
     dial, each centred, container.gap apart; the time display is the row next to the dial. No row of tabs. */
  .time {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: ${t('container-gap')};
    max-inline-size: 100%;
    /* Never narrower than the dial (as wheel.height is the dial's diameter). */
    min-inline-size: ${t('dial-container-size')};
  }
  .surface.mode-date-time[data-layout='vertical'] .time {
    align-self: stretch;
  }
  /* DTM-12: what the other entry mode needs of the width — its rows, measured and never drawn (no height, nothing
     shown, no gap of its own) — so that the section is as wide in the one mode as in the other. */
  .other-mode {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    block-size: 0;
    margin-block-start: calc(-1 * ${t('container-gap')});
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
  }
  .other-mode .dial-room {
    flex: none;
    inline-size: ${t('dial-container-size')};
  }
  /* DTM-9: mode time, horizontal, the dial mode — the range display across both columns, and below it the time display
     in a start column and the dial in an end column, each centred on the other. The wheels mode has one row below the
     range display and is drawn as the vertical layout is — as wide as the dial mode's two columns (DTM-12). */
  .surface.mode-time[data-layout='horizontal'] .time.by-dial {
    display: grid;
    grid-template-columns: auto auto;
    column-gap: ${t('container-gap')};
    row-gap: ${t('container-gap')};
    align-items: center;
    justify-items: center;
    align-content: center;
  }
  .surface.mode-time[data-layout='horizontal'] .time.by-dial > .display {
    grid-column: 1;
  }
  .surface.mode-time[data-layout='horizontal'] .time.by-dial > .dial {
    grid-column: 2;
  }
  .surface.mode-time[data-layout='horizontal'] .time.by-dial > .other-mode {
    display: none;
  }
  .surface.mode-time[data-layout='horizontal'] .other-mode {
    flex-direction: row;
    gap: ${t('container-gap')};
  }

  /* DTM-15, DTM-36, DTM-39: the range display — the start's range field, an en dash and the end's, in reading order (the
     start at the right of the dash, right to left), range-field.gap apart, across the whole width of the time section
     (both columns of mode time's horizontal layout): it is the first branch. The two fields are equally wide — never
     less than the wider one needs — so the dash is at the middle; in a narrow section they narrow equally and their
     text wraps. */
  .range-display {
    display: grid;
    flex: none;
    align-self: stretch;
    justify-self: stretch;
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: ${t('range-field-gap')};
    max-inline-size: 100%;
  }
  /* DTM-15, DTM-32: a range field — at least its height (and the target in each dimension: the two sit side by side),
     padded at each end, its time centred in its role, on the selector's shape. Its colors are the selector's, below. */
  .range-field {
    all: unset;
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--_target);
    min-block-size: max(${t('range-field-container-height')}, var(--_target));
    padding-inline: ${t('range-field-container-padding-inline')};
    font: ${t('range-field-label-typescale-font')};
    letter-spacing: ${t('range-field-label-typescale-letter-spacing')};
    text-align: center;
    overflow-wrap: anywhere;
    ${unsafeCSS(cornerRadius(`${PREFIX}-selector-container-shape`))}
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }
  /* DTM-15: the dash, in the range field's role and the separator's color; hidden from assistive technology. */
  .range-separator {
    font: ${t('range-field-label-typescale-font')};
    letter-spacing: ${t('range-field-label-typescale-letter-spacing')};
    color: ${t('separator-color')};
    -webkit-user-select: none;
    user-select: none;
  }

  /* DTM-18, DTM-39: the wheels — the hour wheel, the separator and the minute wheel, wheel.gap apart, always left to
     right (.digits) — and, with the 12-hour clock, the period wheel period.gap from them, at the side the locale and
     the layout direction give (DTM-14, DTM-46). Each wheel's chosen value stands on a selection container of its own,
     behind its middle row (wheel.selection.span: each); where the span is joined, one band lies behind every middle
     row and the separator. */
  .wheels {
    --_row: max(${t('wheel-row-height')}, var(--_target));
    position: relative;
    isolation: isolate;
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('period-gap')};
  }
  .wheels > .digits {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('wheel-gap')};
  }
  .wheels > .band,
  .wheel > .ground {
    position: absolute;
    z-index: -1;
    inset-inline: 0;
    inset-block-start: calc(50% - var(--_row) / 2);
    block-size: var(--_row);
    box-sizing: border-box;
    ${unsafeCSS(cornerRadius(`${PREFIX}-wheel-selection-container-shape`))}
  }
  .wheels[data-span='joined'] > .band,
  .wheels[data-span='each'] .wheel > .ground {
    background: ${t('wheel-selection-container-color')};
  }
  /* DTM-43, DTM-27: while a number is typed into a wheel, its selection container — its own part of a joined one — its
     value and its outline are the selected selector's, changing over the state motion. */
  .wheel > .ground {
    box-shadow: inset 0 0 0 ${t('selected-selector-outline-width')} transparent;
    transition:
      background-color ${unsafeCSS(STATE)},
      box-shadow ${unsafeCSS(STATE)};
  }
  .wheels .wheel.typing > .ground {
    background: ${t('selected-selector-container-color')};
    box-shadow: inset 0 0 0 ${t('selected-selector-outline-width')} ${t('selected-selector-outline-color')};
  }
  .wheel {
    position: relative;
    /* Its own stacking context: the selection container lies behind the rows, above what is behind the wheel. */
    isolation: isolate;
    flex: none;
    inline-size: ${t('wheel-width')};
    block-size: max(${t('wheel-height')}, var(--_row));
    overflow: hidden;
    font: ${t('wheel-label-typescale-font')};
    letter-spacing: ${t('wheel-label-typescale-letter-spacing')};
    cursor: grab;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }
  .wheel.following {
    cursor: grabbing;
  }
  /* DTM-46: the period wheel — at least period.container.width (and the target) wide, growing with a longer name, as
     tall as the others, its two names in period.label.typescale. The names are measured in the flow (.measure, never
     drawn); the rows are placed as any wheel's. */
  .wheel.period {
    display: grid;
    inline-size: auto;
    min-inline-size: max(${t('period-container-width')}, var(--_target));
    font: ${t('period-label-typescale-font')};
    letter-spacing: ${t('period-label-typescale-letter-spacing')};
  }
  .measure {
    display: grid;
    block-size: 0;
    overflow: hidden;
    visibility: hidden;
    white-space: nowrap;
  }
  /* DTM-14, DTM-46: the two names share one place, so the period is as wide as the wider needs whichever it shows. */
  .name {
    grid-area: 1 / 1;
    text-align: center;
  }
  .name[data-off] {
    visibility: hidden;
  }
  /* DTM-19: .rows carries the wheel motion's duration for the script (how far a fling carries on, when a settled value
     is taken) as an inert transition-delay: with no transition-property it moves nothing. The script reads it when a
     drag ends or a scroll stops, while .following still turns each .row's transition off — which is why the carrier is
     not a .row. Nothing else may set its transition-delay: a rule that turns transitions off where it reaches .rows
     names transition-property, never the transition shorthand, which resets the delay to 0s. */
  .rows {
    position: absolute;
    inset: 0;
    transition-property: none;
    transition-delay: ${t('motion-wheel-duration')};
  }
  /* DTM-19: each row at its place from the band; a settle, a key and a tab move them over the wheel motion. */
  .row {
    position: absolute;
    inset-inline: 0;
    inset-block-start: calc(50% - var(--_row) / 2);
    display: grid;
    place-items: center;
    block-size: var(--_row);
    translate: 0 calc(var(--_at) * var(--_row));
    color: ${t('wheel-label-color')};
    white-space: nowrap;
    transition:
      translate ${unsafeCSS(WHEEL)},
      color ${unsafeCSS(WHEEL)};
  }
  .row.on {
    color: ${t('wheel-selected-label-color')};
  }
  /* DTM-50: an hour, a minute or a period outside min and max keeps its place on the wheel, faded. */
  .row[data-unavailable] {
    opacity: ${t('time-unavailable-opacity')};
  }
  .wheel.typing .row.on {
    color: ${t('selected-selector-label-color')};
  }
  /* DTM-44: what has been typed stands on the middle row in place of the value. */
  .wheel.typed .row.on {
    visibility: hidden;
  }
  .wheel.following .row {
    transition: none;
  }
  /* DTM-20, DTM-43: the wheel's control is its middle row — a native input that is a spin button, read-only until a
     number is typed into it (so that a drag raises no on-screen keyboard), showing only the digits typed. No caret and
     no selection: an entry is two digits at most. */
  .entry {
    all: unset;
    box-sizing: border-box;
    position: absolute;
    inset-inline: 0;
    inset-block-start: calc(50% - var(--_row) / 2);
    inline-size: 100%;
    block-size: var(--_row);
    font: inherit;
    letter-spacing: inherit;
    color: ${t('selected-selector-label-color')};
    text-align: center;
    caret-color: transparent;
    cursor: inherit;
    /* Unprefixed on purpose: Safari reads only the prefixed property, and an input it applies to takes no text. */
    user-select: none;
    touch-action: none;
  }
  .entry::selection {
    background: transparent;
  }
  /* DTM-20: the keyboard focus is drawn around the wheel's selection container (its part of a joined one). */
  .wheel .ring {
    position: absolute;
    inset-inline: 0;
    inset-block-start: calc(50% - var(--_row) / 2);
    block-size: var(--_row);
    pointer-events: none;
    ${unsafeCSS(cornerRadius(`${PREFIX}-wheel-selection-container-shape`))}
  }
  /* The picker says which wheel's focus is keyboard focus (data-ring): the hour's and the minute's control is an input,
     which matches :focus-visible however it was focused, and the period's is not one, whose match after a press and a
     key is each browser's guess (DTM-47). So the condition is focus, and the ring is the picker's to show. */
  ${focusRing((focus) => `.wheel[data-ring]:has(> .entry${ownFocus(focus)}) .ring`, { inside: true })}

  /* DTM-21, DTM-39: the time display — the hour selector, the separator and the minute selector, always left to right
     (.digits) — and, with the 12-hour clock, the period selector period.gap from them, at the side the locale and the
     layout direction give (DTM-14). */
  .display {
    display: flex;
    flex: none;
    align-items: stretch;
    gap: ${t('period-gap')};
    max-inline-size: 100%;
  }
  .display > .digits {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('selector-gap')};
  }
  .separator {
    flex: none;
    font: ${t('separator-typescale-font')};
    letter-spacing: ${t('separator-typescale-letter-spacing')};
    color: ${t('separator-color')};
    -webkit-user-select: none;
    user-select: none;
  }
  .wheels .separator {
    font: ${t('wheel-label-typescale-font')};
    letter-spacing: ${t('wheel-label-typescale-letter-spacing')};
  }

  /* DTM-21, DTM-27, DTM-32: a selector — at least its width and height (and the target), its corners eased by the
     smoothing, its condition's container, label and outline in each state, the value centred in its role. The outline is
     drawn inside its edge, so that its width never moves anything. */
  ${unsafeCSS(conditionBlock(PREFIX, 'unselected', SELECTOR_PARTS, FIELD))}
  ${unsafeCSS(conditionBlock(PREFIX, 'selected', SELECTOR_PARTS, `${FIELD}.selected`))}
  .selector {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context: the ripple sits above the container color and below the value. */
    isolation: isolate;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    min-inline-size: max(${t('selector-container-width')}, var(--_target));
    min-block-size: max(${t('selector-container-height')}, var(--_target));
    font: ${t('selector-label-typescale-font')};
    letter-spacing: ${t('selector-label-typescale-letter-spacing')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-selector-container-shape`))}
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }
  /* DTM-14: the period selector — at least period.container.width (and the target) wide, as tall as the selectors, its
     name in period.label.typescale. It is a selector of the unselected condition in every state: nothing here colors it. */
  .selector.period {
    min-inline-size: max(${t('period-container-width')}, var(--_target));
    font: ${t('period-label-typescale-font')};
    letter-spacing: ${t('period-label-typescale-letter-spacing')};
  }
  .selector.period > .value {
    display: grid;
    white-space: nowrap;
  }
  /* DTM-15, DTM-27: a selector and a range field paint their condition's container, label and outline. */
  ${unsafeCSS(FIELD)} {
    background: var(--_c);
    color: var(--_l);
    box-shadow: inset 0 0 0 var(--_w) var(--_o);
    /* DTM-27: the colors change over the state motion, between states and between conditions. */
    transition-property: background-color, color, box-shadow, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  ${unsafeCSS(conditionRules(FIELD, SELECTOR_PARTS))}
  /* DTM-29, DTM-30: pressed is data-pressed (PressController), held for press-hold; its carrier is the value. */
  ${pressHold('.value')}
  .value {
    pointer-events: none;
  }
  .hold {
    display: none;
  }
  /* DTM-30 ripple: the pressed container color of the selector's condition, grown over motion.feedback-duration and
     faded over motion.state-duration, inside its outline, clipped to its corners. */
  ${rippleStyles({ color: '--_c-p', inset: '--_w', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  /* DTM-28, DTM-31: the ring (or the glow) around a selector or a range field for keyboard focus only, never animated. */
  /* DTM-47: the period selector's ring is the picker's to show too (data-ring), as the period wheel's is; and a range
     field's, which a key pressed after a press of the pointer must show in every engine. */
  ${focusRing((focus) => `:is(.selector:not(.period)${focus}, :is(.selector.period, .range-field)[data-ring]${ownFocus(focus)})`)}
  ${minimumTarget('.selector')}

  /* DTM-23, DTM-24: the dial — a circle of dial.container.size, running clockwise in every direction; its numbers on
     two rings; the handle over the pending value joined to the centre by the track; the part of a number under the handle
     in selected-label.color (a copy of the numbers inside the handle, turned back so that it lies over the dial). */
  .dial {
    --_size: ${t('dial-container-size')};
    --_handle: ${t('dial-handle-size')};
    --_outer: calc(var(--_size) / 2 - ${t('dial-padding')} - var(--_handle) / 2);
    --_inner: calc(var(--_outer) - var(--_handle));
    --_radius: var(--_outer);
    --_move: ${t('motion-dial-duration')} ${t('motion-dial-easing')};
    position: relative;
    flex: none;
    direction: ltr;
    inline-size: var(--_size);
    block-size: var(--_size);
    border-radius: 50%;
    overflow: clip;
    background: ${t('dial-container-color')};
    cursor: pointer;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .dial[data-ring='inner'] {
    --_radius: var(--_inner);
  }
  .numbers {
    position: absolute;
    inset: 0;
    transition: opacity var(--_move);
  }
  .numbers.faded {
    opacity: 0;
  }
  .number {
    position: absolute;
    left: calc(50% + var(--_r) * var(--_x));
    top: calc(50% + var(--_r) * var(--_y));
    translate: -50% -50%;
    font: ${t('dial-label-typescale-font')};
    letter-spacing: ${t('dial-label-typescale-letter-spacing')};
    color: ${t('dial-label-color')};
    white-space: nowrap;
    pointer-events: none;
  }
  .number.outer {
    --_r: var(--_outer);
  }
  .number.inner {
    --_r: var(--_inner);
  }
  /* DTM-50: a number outside min and max keeps its place on the dial, faded. */
  .number[data-unavailable] {
    opacity: ${t('time-unavailable-opacity')};
  }
  .center {
    position: absolute;
    left: 50%;
    top: 50%;
    inline-size: ${t('dial-center-size')};
    block-size: ${t('dial-center-size')};
    translate: -50% -50%;
    border-radius: 50%;
    background: ${t('dial-track-color')};
    pointer-events: none;
  }
  /* DTM-26: the arm turns to the value's angle (along the shorter arc: the element keeps the angle continuous) and the
     handle moves between the rings over the dial motion; the copy inside the handle turns back by as much. */
  .arm {
    position: absolute;
    inset: 0;
    rotate: var(--_angle, 0deg);
    transition: rotate var(--_move);
    pointer-events: none;
  }
  .track {
    position: absolute;
    left: calc(50% - ${t('dial-track-width')} / 2);
    top: calc(50% - var(--_radius));
    inline-size: ${t('dial-track-width')};
    block-size: var(--_radius);
    background: ${t('dial-track-color')};
    transition:
      top var(--_move),
      block-size var(--_move);
  }
  .handle {
    position: absolute;
    left: calc(50% - var(--_handle) / 2);
    top: calc(50% - var(--_radius) - var(--_handle) / 2);
    inline-size: var(--_handle);
    block-size: var(--_handle);
    border-radius: 50%;
    overflow: hidden;
    background: ${t('dial-handle-color')};
    transition: top var(--_move);
  }
  .copy {
    position: absolute;
    left: calc(var(--_handle) / 2 - var(--_size) / 2);
    top: calc(var(--_radius) + var(--_handle) / 2 - var(--_size) / 2);
    inline-size: var(--_size);
    block-size: var(--_size);
    rotate: calc(var(--_angle, 0deg) * -1);
    transition:
      rotate var(--_move),
      top var(--_move);
  }
  .copy .number {
    color: ${t('dial-selected-label-color')};
  }
  .between {
    position: absolute;
    left: 50%;
    top: 50%;
    inline-size: ${t('dial-center-size')};
    block-size: ${t('dial-center-size')};
    translate: -50% -50%;
    border-radius: 50%;
    background: ${t('dial-selected-label-color')};
  }
  /* DTM-25: a press or a drag moves the handle without animation. */
  .dial[data-instant] :is(.arm, .track, .handle, .copy) {
    transition: none;
  }

  /* DTM-33: the error line, set as a field's supporting text. */
  .error {
    flex: none;
    padding-inline: ${t('container-padding-inline')};
    font: ${t('error-typescale-font')};
    letter-spacing: ${t('error-typescale-letter-spacing')};
    color: ${t('error-color')};
    overflow-wrap: break-word;
  }

  /* DTM-34: Cancel and OK as a full-width Button group places them (fill): a row they share equally — each Button's
     container stretched across its share — or, when a label does not fit its share, a column (OK on top) as wide as the
     container; actions.gap apart, actions.padding-block above and below. end: at their own widths, aligned to the end. */
  .actions {
    display: flex;
    flex: none;
    gap: ${t('actions-gap')};
    padding-block: ${t('actions-padding-block')};
    padding-inline: ${t('container-padding-inline')};
  }
  .actions > * {
    display: grid;
    flex: 1 1 0;
    min-inline-size: 0;
  }
  .actions.stacked {
    flex-direction: column;
  }
  .actions.stacked > *,
  .actions.measuring > * {
    flex: none;
  }
  .surface[data-arrangement='end'] .actions {
    justify-content: flex-end;
  }
  .surface[data-arrangement='end'] .actions > * {
    flex: none;
  }
  .surface[data-arrangement='end'] .actions.stacked {
    align-items: flex-end;
  }

  /* DTM-33: the polite announcement of the error line, read and never drawn. */
  .announce {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* DTM-19, DTM-26, DTM-27, DTM-35: where motion is reduced every change is made at once (a modal surface still fades). */
  @media (prefers-reduced-motion: reduce) {
    .dial *,
    .selector,
    .range-field,
    .ground,
    .row {
      transition: none !important;
    }
  }

  /* DTM-31: corner smoothing on the surface, the selectors, the range fields and the wheels' selection containers (data-tanrei-shape). */
  ${shape}

  @media (forced-colors: active) {
    .surface {
      border: ${t('divider-width')} solid CanvasText;
    }
    .divider {
      background: CanvasText;
    }
    .selector,
    .range-field {
      border: ${t('divider-width')} solid CanvasText;
    }
    .selector.selected,
    .range-field.selected,
    .wheel.typing > .ground {
      border: ${t('divider-width')} solid Highlight;
    }
    .wheels[data-span='joined'] > .band,
    .wheels[data-span='each'] .wheel > .ground {
      border-block: ${t('divider-width')} solid Highlight;
    }
    .dial {
      border: ${t('divider-width')} solid CanvasText;
    }
    .handle,
    .track,
    .center {
      background: Highlight;
    }
    .copy .number {
      color: HighlightText;
    }
  }
`;
