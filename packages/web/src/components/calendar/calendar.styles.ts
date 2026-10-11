import { css, unsafeCSS } from 'lit';
import { conditionBlock, conditionStates, focusRing, iconGlyph, minimumTarget, pressHold, rippleStyles } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/calendar.tokens.json). A day's or a year's five conditions — unselected,
// adjacent, today, selected and in-range — are the state variants: each colors the container, the label
// and the outline in every state, and the calendar only says which condition and which state's tokens are drawn. The
// view toggle draws with the unselected condition. The navigation Buttons keep their own tokens.
const PREFIX = '--tanrei-comp-calendar';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

const PARTS = { c: 'container-color', l: 'label-color', o: 'outline-color' } as const;

/**
 * CAL-29: the ONE progress every look between two months is drawn from, a custom property of `.pages` that the element
 * writes and no one registers — 0 at the first view the grid holds, 1 at the next (and 2 at a third, while a change
 * begins during another or a drag may go either way). A drag and a scroll write it in each frame; a button's, a key's
 * or a wheel's change writes it in each frame of the page motion, by a clock of the element's (calendar.ts, `travel`).
 * The rows' offset, a day's fade and the mix of a day's two conditions are `calc()`s of it — steps and clamps of it,
 * which no transition of a real property could follow — so a moment of a button's change and a drag held at that place
 * are one look, and nothing has a threshold. `.pages` holds it and the rows and the days inherit it.
 */
export const PROGRESS = '--_tanrei-calendar-progress';

/**
 * CAL-29: a day that is a neighbouring month's in one view and the month's own in another carries both conditions'
 * parts in the state it is in — `--_c0` the adjacent container, `--_c1` the unselected one — and is drawn at their mix.
 */
const side = (n: 0 | 1) => Object.fromEntries(Object.entries(PARTS).map(([key, part]) => [`${key}${n}`, part]));
const [ADJACENT, OWN] = [side(0), side(1)];
const mix = (key: string) => `color-mix(in srgb, var(--_${key}1) calc(var(--_mix) * 100%), var(--_${key}0))`;

/**
 * Where each state is read (CAL-18): hover and keyboard focus on the cell (a day's gridcell, a year's or the view
 * toggle's button), disabled as the day's `aria-disabled`, pressed as `data-pressed` on the container that answers the
 * press (`PressController`: a day's circle, or an in-range day's band). `:where()` keeps each selector at one class, so
 * the order `stateRules()` writes them in is the precedence.
 */
const on = (state: string) => {
  if (state === ':disabled') return ".cell:where([aria-disabled='true'])";
  if (state.startsWith('[')) return `.cell:where(:has(> .lane > ${state}))`;
  return `.cell:where(${state})`;
};

const STATE = `${T('motion-state-duration')} ${T('motion-state-easing')}`;
const PAGE = `${T('motion-page-duration')} ${T('motion-page-easing')}`;

export const styles = css`
  /* CAL-1, CAL-25: seven columns of cell.size — never smaller than the minimum target, since the cells are the days' hit
     areas and cannot reach over each other — and no surface or padding of its own. Never wider than the space it is
     given: there the columns narrow equally. */
  :host {
    --_target: var(--tanrei-sys-target-pointer);
    --_cell: max(${t('cell-size')}, var(--_target));
    position: relative;
    display: inline-block;
    vertical-align: top;
    box-sizing: border-box;
    inline-size: calc(7 * var(--_cell));
    max-inline-size: 100%;
    color: ${t('unselected-label-color')};
    text-align: start;
  }
  @media (pointer: coarse) {
    :host {
      --_target: var(--tanrei-sys-target-touch);
    }
  }
  :host([hidden]) {
    display: none;
  }
  .calendar {
    position: relative;
  }

  /* CAL-5: the navigation row, one cell tall: the view toggle at the start, the previous and next buttons at the end,
     navigation.gap apart; the buttons hidden in the year view. */
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-block-size: var(--_cell);
  }
  .arrows {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${t('navigation-gap')};
  }
  .arrows[data-off] {
    visibility: hidden;
  }

  /* CAL-1: the weekday row and six rows of seven equal columns (narrowed equally, CAL-25). */
  .views {
    position: relative;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
  /* CAL-4: the narrow weekday names, centred, one cell tall, taking no focus. */
  .weekday {
    display: grid;
    place-items: center;
    min-inline-size: 0;
    min-block-size: var(--_cell);
    font: ${t('weekday-typescale-font')};
    letter-spacing: ${t('weekday-typescale-letter-spacing')};
    color: ${t('weekday-color')};
    text-align: center;
  }
  /* CAL-14, CAL-30: a scroll or a drag along the axis moves the month, so the grid keeps the page's pan across it only. */
  .calendar[data-axis='vertical'] .day-view {
    touch-action: pan-x pinch-zoom;
  }
  .calendar[data-axis='horizontal'] .day-view {
    touch-action: pan-y pinch-zoom;
  }
  /* CAL-30: a press on the grid may become a drag, so nothing in it is selected as text. While a drag the calendar has
     taken lasts nothing in it is hit — no day is drawn hovered — and a fine pointer shows the grabbing cursor; the grid
     has captured the pointer and still hears it. */
  .day-view {
    /* (Safari reads the prefixed property only.) */
    -webkit-user-select: none;
    user-select: none;
  }
  .calendar[data-dragging] {
    cursor: grabbing;
  }
  .calendar[data-dragging] > * {
    pointer-events: none;
  }
  /* CAL-14, CAL-29: the days move inside the grid's own six rows; the weekday row and the navigation row stay. The
     progress is 0 at rest and travels over the page motion when a button, a key, a wheel or a release changes the
     month; a drag and a scroll hold it at the hand's place, in the frame it moves (CAL-30, CAL-33). */
  .pages {
    position: relative;
    display: grid;
    overflow: clip;
    ${unsafeCSS(PROGRESS)}: 0;
    --_dir: 1;
  }
  :host(:dir(rtl)) .pages {
    --_dir: -1;
  }
  .page {
    grid-area: 1 / 1;
  }
  /* CAL-29: on the vertical axis the days are ONE column of week rows — those of every view the grid holds — offset by
     the rows the progress has travelled (--_travel, of --_rows) and clipped to the grid's six: a week two views share is
     one row that travels. */
  .pages[data-moving='vertical'] .page {
    translate: 0 calc(var(--_travel) / var(--_rows) * -100%);
  }
  /* CAL-14, CAL-30: on the horizontal axis each month is a page, side by side in order (a later month toward the end:
     the left, right to left — CAL-26), and they travel together. */
  .pages[data-moving='horizontal'] .page {
    translate: calc((var(--_place) - var(${unsafeCSS(PROGRESS)})) * var(--_dir) * 100%) 0;
  }
  /* CAL-32: what is coming into view takes no press until its month is the displayed one. */
  .pages [inert] {
    pointer-events: none;
  }

  /* CAL-7, CAL-14: the year list in the space of the weekday row and the grid, in rows of three cells, scrolling; it and
     the day view cross-fade. */
  .years {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: minmax(var(--_cell), auto);
    align-content: start;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .day-view,
  .years {
    opacity: 1;
    visibility: visible;
    transition:
      opacity ${unsafeCSS(PAGE)},
      visibility 0s linear 0s;
  }
  .day-view[data-off],
  .years[data-off] {
    opacity: 0;
    visibility: hidden;
    transition:
      opacity ${unsafeCSS(PAGE)},
      visibility 0s linear ${t('motion-page-duration')};
  }
  @media (prefers-reduced-motion: reduce) {
    /* CAL-14, CAL-32: a month changes at once — the element starts no travel (calendar.ts) — and a drag still places
       the days, since it writes the progress itself. */
    .day-view,
    .years,
    .day-view[data-off],
    .years[data-off] {
      transition: none;
    }
  }

  /* CAL-2, CAL-3, CAL-6, CAL-7: every day, year and the view toggle is a cell holding a lane (the band's row) and a
     container. Each condition's parts in every state, as private properties; the view toggle is unselected. */
  ${unsafeCSS(conditionBlock(PREFIX, 'unselected', PARTS, '.cell'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'adjacent', PARTS, '.cell.adjacent'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'today', PARTS, '.cell.today'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'selected', PARTS, '.cell.selected'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'in-range', PARTS, '.cell.in-range'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'adjacent', ADJACENT, '.cell.between'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'unselected', OWN, '.cell.between'))}

  .cell {
    all: unset;
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 0;
    min-block-size: var(--_cell);
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    transition: opacity ${unsafeCSS(STATE)};
  }
  .cell.empty {
    cursor: default;
  }
  .lane {
    position: relative;
    display: flex;
    justify-content: center;
    inline-size: 100%;
  }
  /* CAL-3: the container, a circle of day.container.size (year.container.width × height for a year) centred in its
     cell, in its condition's color and label color, with an outline of outline.width in its outline color; it grows to
     hold enlarged text (CAL-25). */
  .box {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the number. */
    isolation: isolate;
    display: grid;
    place-items: center;
    max-inline-size: 100%;
    background: var(--_c);
    box-shadow: inset 0 0 0 ${t('outline-width')} var(--_o);
    color: var(--_l);
    text-align: center;
    white-space: nowrap;
    transition-property: background-color, box-shadow, color;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  .day .box {
    min-inline-size: min(${t('day-container-size')}, 100%);
    min-block-size: ${t('day-container-size')};
    font: ${t('day-label-typescale-font')};
    letter-spacing: ${t('day-label-typescale-letter-spacing')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-day-container-shape`))}
  }
  .year .box {
    min-inline-size: min(${t('year-container-width')}, 100%);
    min-block-size: ${t('year-container-height')};
    font: ${t('year-label-typescale-font')};
    letter-spacing: ${t('year-label-typescale-letter-spacing')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-year-container-shape`))}
  }
  /* CAL-3: an in-range day's container is the band: its whole cell at the container's height, joined with its
     neighbours', square at the ends of a row. A range's start and end draw the half of their cell toward the other,
     behind their own container, in the in-range container color. */
  .band {
    position: absolute;
    inset-block: 0;
    inset-inline: 0;
    isolation: isolate;
    --tanrei-corner-radius: 0px;
    transition-property: background-color;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  .cell.in-range .band {
    background: var(--_c);
  }
  .cell.in-range .box {
    background: transparent;
  }
  .cell.range-start .band {
    inset-inline-start: 50%;
    background: ${t('in-range-container-color')};
  }
  .cell.range-end .band {
    inset-inline-end: 50%;
    background: ${t('in-range-container-color')};
  }

  /* CAL-6: the view toggle — the month and year and the chevron, view-toggle.gap apart, padded at each end, in its
     label role, at least its height tall; its hit area reaches the minimum target. */
  .toggle {
    flex: 0 1 auto;
    min-block-size: 0;
  }
  .toggle .box {
    display: flex;
    align-items: center;
    gap: ${t('view-toggle-gap')};
    min-block-size: ${t('view-toggle-container-height')};
    padding-inline: ${t('view-toggle-container-padding-inline')};
    font: ${t('view-toggle-label-typescale-font')};
    letter-spacing: ${t('view-toggle-label-typescale-letter-spacing')};
    white-space: normal;
    ${unsafeCSS(cornerRadius(`${PREFIX}-view-toggle-container-shape`))}
  }
  ${minimumTarget('.toggle')}
  /* CAL-6: the chevron, an unselected glyph at view-toggle.icon.size, turned half a turn while the year view is shown. */
  ${iconGlyph('.chevron', { size: `${PREFIX}-view-toggle-icon-size`, selected: ':not(*)', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .chevron {
    transition:
      rotate ${unsafeCSS(STATE)},
      font-variation-settings ${unsafeCSS(STATE)};
  }
  .toggle[aria-expanded='true'] .chevron {
    rotate: 0.5turn;
  }

  /* CAL-18, CAL-21: each state paints from that state's tokens of the cell's condition; pressed > focused > hovered,
     disabled over all. Pressed is data-pressed="<feedback>" on the container (PressController): overlay paints the pressed
     tokens at once; ripple and dim paint everything else from them while the container color stays with the state under
     the press; none paints nothing. */
  ${unsafeCSS(conditionStates(PREFIX, PARTS, { container: 'c', root: '.cell', on }))}
  .cell:where(:has(> .lane > [data-pressed]:not([data-pressed='none']))) :is(.box, .band) {
    transition-duration: 0s;
  }
  /* CAL-29: a day between two conditions — a neighbouring month's in one view, the month's own in the other — paints
     the mix of the adjacent and the unselected tokens of the state it is in, by --_mix (0 adjacent, 1 unselected), which
     is the progress or its complement. The mix has no motion of its own: it follows the progress in the frame it changes. */
  ${unsafeCSS(conditionStates(PREFIX, ADJACENT, { container: 'c0', root: '.cell:where(.between)', on }))}
  ${unsafeCSS(conditionStates(PREFIX, OWN, { container: 'c1', root: '.cell:where(.between)', on }))}
  .cell.between {
    --_c: ${unsafeCSS(mix('c'))};
    --_l: ${unsafeCSS(mix('l'))};
    --_o: ${unsafeCSS(mix('o'))};
    --_c-p: ${unsafeCSS(`color-mix(in srgb, var(--_c1-p) calc(var(--_mix) * 100%), var(--_c0-p))`)};
  }
  .cell.between .box {
    transition: none;
  }
  .cell.empty {
    opacity: 1;
  }

  /* CAL-21 ripple: the pressed container color of the cell's condition, grown over motion.feedback-duration and faded
     over motion.state-duration, clipped to the container (the circle, or an in-range day's band). */
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* CAL-19, CAL-22: the ring (or the glow) around the circle — an in-range day's too — for keyboard focus only, never
     animated. */
  ${focusRing((focus) => `.cell${focus} .box`)}

  /* CAL-20: press-hold is carried by an element with no transition of its own. */
  .hold {
    display: none;
  }
  ${pressHold('.hold')}

  /* CAL-13: the polite announcement of a new month, read and never drawn. */
  .announce {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .cell,
    .box,
    .band,
    .chevron {
      transition: none;
    }
  }

  /* CAL-22: corner smoothing on the containers (data-tanrei-shape). */
  ${shape}

  @media (forced-colors: active) {
    .cell.selected .box {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
    }
    .cell.today .box {
      box-shadow: inset 0 0 0 ${t('outline-width')} CanvasText;
    }
    .cell.in-range .band,
    .cell.range-start .band,
    .cell.range-end .band {
      forced-color-adjust: none;
      background: Canvas;
      box-shadow:
        inset 0 ${t('outline-width')} 0 Highlight,
        inset 0 calc(-1 * ${t('outline-width')}) 0 Highlight;
    }
    .cell[aria-disabled='true'] .box {
      color: GrayText;
    }
  }
`;
