import { css, unsafeCSS } from 'lit';
import { type OpenAxis, conditionBlock, focusRing, iconGlyph, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';
import { scriptTracking } from '../../styles/script-tracking.js';

// Every visual value is a token (tokens/comp/navigation-drawer.tokens.json). The drawer paints its panel per variant
// (standard or modal: the color, elevation, end corners and end edge) and lays out its header, sections, groups and
// cells; each cell (a destination's, or a group's row) paints its item container (the state layer's box and the active
// indicator), icon indicator, icon, label, short label and trailing content from its condition and state:
// `unselected` and `selected` while the drawer is expanded, `collapsed-unselected` and `collapsed-selected` while it is
// collapsed (NVD-3).
//
// ONE LAYOUT FOR BOTH FORMS (NVD-31, NVD-35). Everything inside the drawer is laid out for the expanded drawer, at
// comp.navigation-drawer.container.width, whatever the form: the icon column is half of collapsed.container.width from
// the start edge in both, every cell has the same height in both, and the drawer's panel — whose width is the only thing
// that follows the form — clips what lies past its moving end edge. So no icon, header button or main action glyph ever
// moves. What changes with the form is drawn on top of that layout: each item container changes between the expanded
// row and the collapsed cell around the same icon line — in the default system the collapsed cell is the row cut after
// its icon, with the row's height and corners, so only its end edge moves; a system whose collapsed column is another
// design (Material's) gives it another size and corner by value — the labels, trailing content, headings' text and the
// header slot fade out (collapsing: the first half) or in (expanding: the second half), and the short labels, where
// collapsedLabels draws them, the other way.
//
// WHAT THE DRAWER IS (NVD-30, NVD-53). The host carries, as state attributes the element writes, what it is drawn as:
// `data-as` (standard or modal), `data-collapsible`, `data-open` and `collapsed`. For a drawer that is not responsive
// they repeat its props; for a responsive one they are what its presentation stands for (`presentation`: standard,
// column or modal), whatever `variant` and `open` say. The styles read these, never the props.
export const CORE_VARIANTS = ['standard', 'modal'] as const;
export const DEFAULT_VARIANT = 'standard';
const PREFIX = '--tanrei-comp-navigation-drawer';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: string, variant: string, fallback: string | null) => (fallback ? `var(${PREFIX}-${name}-${variant}, var(${PREFIX}-${name}-${fallback}))` : `var(${PREFIX}-${name}-${variant})`);

/** One variant's members (`dev.tanrei.axes.variant.members`) as private custom properties under `selector`. */
const variantBlock = (variant: string, selector: string, fallback: string | null = null) => `${selector} {
  --_bg: ${ref('container-color', variant, fallback)};
  --_elevation: ${ref('container-elevation', variant, fallback)};
  --_edge: ${ref('outline-color', variant, fallback)};
  --_shape: ${ref('container-shape', variant, fallback)};
  --_shape-pill: ${fallback ? `var(${PREFIX}-container-shape-${variant}-pill, var(${PREFIX}-container-shape-${fallback}-pill, 0))` : `var(${PREFIX}-container-shape-${variant}-pill, 0)`};
}`;

/**
 * The open axis (NVD-26): a variant a layer added gets its block on demand, built by the same function and
 * falling back to standard's tokens (and presented as a standard drawer); a value the active system lacks is reported.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-container-color-${value}` },
];

/** The icon column's width (the collapsed drawer's) and the drawer's inner padding. */
const COLUMN = T('collapsed-container-width');
const PAD_INLINE = T('container-padding-inline');
/** One line of the short label: its typescale's size times its line height (a number). */
const SHORT_LINE = `calc(${T('collapsed-item-label-typescale-font-size')} * ${T('collapsed-item-label-typescale-line-height')})`;
const EXPAND = T('motion-expand-duration');
const EXPAND_EASING = T('motion-expand-easing');
/** The first half of the change of form, and the second (NVD-35). */
const FIRST_HALF = `calc(${EXPAND} / 2) ${EXPAND_EASING} 0s`;
const SECOND_HALF = `calc(${EXPAND} / 2) ${EXPAND_EASING} calc(${EXPAND} / 2)`;
/** The change of form's own motion, for what only the form changes. */
const MORPH = `${EXPAND} ${EXPAND_EASING}`;

const ENTER = `${T('motion-enter-duration')} ${T('motion-enter-easing')}`;
const EXIT = `${T('motion-exit-duration')} ${T('motion-exit-easing')}`;

/**
 * The drawer (NVD-11, NVD-12, NVD-18, NVD-19, NVD-22, NVD-25, NVD-30, NVD-35, NVD-38, NVD-40). The panel is its form's
 * width (container.width expanded, collapsed.container.width collapsed) beside the start inset and the full height of
 * its parent (standard, or a collapsible modal drawer's column) or of the window (modal), on its variant's color and
 * elevation, its end corners rounded by its variant's shape and its start corners square, with its variant's end edge.
 * Inside it: the header, which stays in place, and then the items, which scroll. Logical, so right-to-left puts it at the
 * right edge, mirrored.
 */
export const drawerStyles = css`
  :host {
    display: block;
    --_inset-top: env(safe-area-inset-top, 0px);
    --_inset-bottom: env(safe-area-inset-bottom, 0px);
    --_inset-start: env(safe-area-inset-left, 0px);
    --_form-width: ${t('container-width')};
    --_width: calc(var(--_form-width) + var(--_inset-start));
    --_column-width: calc(${t('collapsed-container-width')} + var(--_inset-start));
  }
  :host(:dir(rtl)) {
    --_inset-start: env(safe-area-inset-right, 0px);
  }
  :host([collapsed]) {
    --_form-width: ${t('collapsed-container-width')};
  }
  /* NVD-35: while the drawer changes form, every part the form recolors cross-fades over the change's motion, and a
     group's items move with it (inherited by the cells, groups and sections). */
  :host([data-form-change]) {
    --_nvd-recolor-duration: ${t('motion-expand-duration')};
    --_nvd-recolor-easing: ${t('motion-expand-easing')};
    --_nvd-reveal-duration: ${t('motion-expand-duration')};
    --_nvd-reveal-easing: ${t('motion-expand-easing')};
  }
  /* NVD-62: until its first frame is drawn the drawer is what it was given, at once — a group that the product or
     revealSelected opens or closes, a selection that the page sets — without the motions of NVD-41 and NVD-44
     (inherited by the cells and groups, which read the same tokens). */
  :host([data-arriving]) {
    --_nvd-reveal-duration: 0s;
    --_nvd-recolor-duration: 0s;
    ${unsafeCSS(['disclosure', 'selection', 'state'].map((motion) => `${PREFIX}-motion-${motion}-duration: 0s;`).join('\n    '))}
  }
  /* NVD-54, NVD-55: a change of presentation is drawn at once — the motions of NVD-18, NVD-35 and NVD-40 take no time
     while it is drawn (inherited by the cells, groups and sections, which read the same tokens). */
  :host([data-instant]) {
    ${unsafeCSS(['expand', 'enter', 'exit', 'disclosure'].map((motion) => `${PREFIX}-motion-${motion}-duration: 0s;`).join('\n    '))}
  }
  /* …and what was already on its way stops where the new presentation puts it. */
  :host([data-instant]),
  :host([data-instant]) .drawer,
  :host([data-instant]) .title,
  :host([data-instant]) dialog.drawer::backdrop {
    transition: none !important;
  }
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([data-as='${v}'])`)).join('\n'))}
  /* NVD-40: a collapsible modal drawer's column, while it is closed, is drawn as a standard drawer's. */
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, '.column'))}
  :host([hidden]) {
    display: none;
  }

  .drawer {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    inline-size: var(--_width);
    margin: 0;
    border: 0;
    padding: 0;
    padding-block-start: var(--_inset-top);
    padding-block-end: var(--_inset-bottom);
    padding-inline-start: var(--_inset-start);
    background: var(--_bg);
    box-shadow: var(--_elevation);
    color: inherit;
    outline: none;
    /* NVD-35: what lies past the moving end edge is clipped there. */
    overflow: clip;
    --tanrei-corner-radius: var(--_shape);
    --tanrei-corner-pill: var(--_shape-pill);
    transition: inline-size ${unsafeCSS(MORPH)};
  }
  /* NVD-11: only the end corners are rounded. */
  .drawer[data-tanrei-shape] {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }
  /* NVD-11: the end edge, inside the panel. */
  .edge {
    position: absolute;
    z-index: 1;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: ${t('outline-width')};
    background: var(--_edge);
    pointer-events: none;
  }
  /* The modal drawer's navigation landmark: the dialog's whole content (a box of its own, so it is reached by focus). */
  .landmark {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
    position: relative;
  }

  /* NVD-38: the header, from the top — the header buttons stacked in the icon column, each centred on its centre line,
     header.item-gap apart; the header slot's content in the first one's row, item.gap after it (padding-inline from the
     start without a header button), vertically centred; and then the main action, header.item-gap below. It is laid out
     for the expanded drawer and clipped by the panel, so nothing in it moves between the forms. */
  .header {
    box-sizing: border-box;
    display: grid;
    flex: none;
    grid-template-columns: ${t('collapsed-container-width')} minmax(0, 1fr);
    align-items: center;
    row-gap: ${t('header-item-gap')};
    inline-size: ${t('container-width')};
    padding-block-start: ${t('container-padding-block')};
  }
  .header:not(.filled) {
    display: none;
  }
  ::slotted([slot='header-button']) {
    grid-column: 1;
    justify-self: center;
  }
  .title {
    grid-row: 1;
    grid-column: 2;
    min-inline-size: 0;
    /* --_lead: where the first header button ends, from the drawer's start (measured: the button is the product's). */
    margin-inline-start: calc(var(--_lead, calc(${t('collapsed-container-width')} / 2)) + ${t('item-gap')} - ${t('collapsed-container-width')});
    padding-inline-end: ${t('container-padding-inline')};
    opacity: 1;
    transition: opacity ${unsafeCSS(SECOND_HALF)};
  }
  .title:not(.filled) {
    display: none;
  }
  .header.no-buttons .title {
    grid-column: 1 / -1;
    margin-inline-start: ${t('container-padding-inline')};
  }
  :host([collapsed]) .title {
    opacity: 0;
    transition: opacity ${unsafeCSS(FIRST_HALF)};
  }
  /* NVD-52: the header's text is its own run, in the direction of its first strong character, aligned to the layout's
     start edge (src/styles/product-text.ts). */
  ${productText('.title', { align: 'start' })}
  /* NVD-39: the main action starts where its collapsed square is centred in the icon column, in both forms (--_main-size:
     its measured height, the side of that square). */
  ::slotted([slot='main-action']) {
    grid-column: 1 / -1;
    justify-self: start;
    margin-inline-start: calc((${t('collapsed-container-width')} - var(--_main-size, 0px)) / 2);
  }
  /* NVD-39: only the first main action is drawn. */
  ::slotted([data-tanrei-drawer-extra]) {
    display: none;
  }

  /* NVD-12: the items, header.gap below the header (padding-block below the top without one) and padding-block above
     the bottom, measured to the first and the last cell; container.gap between two cells; they scroll, the header stays. */
  .items {
    box-sizing: border-box;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: ${t('container-gap')};
    min-block-size: 0;
    overflow-x: hidden;
    overflow-y: auto;
    /* NVD-61: a scroll that reaches either end of the items does not go on to the page; and a write to the offset
       (scrollOffset, the selection brought into view — NVD-57) is drawn at once, whatever the page's own scrolling is. */
    overscroll-behavior: contain;
    scroll-behavior: auto;
    padding-block: ${t('container-padding-block')};
  }
  .header.filled + .items {
    padding-block-start: ${t('header-gap')};
  }
  /* The change of form's clock: its motion, read through a real property (a duration token is an expression). */
  .clock {
    display: none;
    transition-property: none;
    transition-delay: ${t('motion-expand-duration')};
  }

  /* NVD-18: a standard drawer takes its form's width in the layout while open and none while closed, sliding while the
     content beside it resizes; closed, it is hidden from assistive technology and focus (visibility, kept until the slide
     ends). A change of form moves its end edge over the change's motion (NVD-35). */
  :host(:not([data-as='modal'])) {
    position: relative;
    block-size: 100%;
    inline-size: var(--_width);
    overflow: hidden;
    transition:
      inline-size ${unsafeCSS(MORPH)},
      visibility 0s;
  }
  :host(:not([data-as='modal'])[data-sliding][data-open]) {
    transition:
      inline-size ${unsafeCSS(ENTER)},
      visibility 0s;
  }
  :host(:not([data-as='modal']):not([data-open])) {
    inline-size: 0;
    visibility: hidden;
    transition:
      inline-size ${unsafeCSS(EXIT)},
      visibility 0s linear ${t('motion-exit-duration')};
  }
  .standard {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    block-size: 100%;
  }

  /* NVD-40: a collapsible modal drawer keeps its column in the layout, closed or open (the open drawer widens over the
     content from it without resizing it). */
  :host([data-as='modal'][data-collapsible]) {
    position: relative;
    block-size: 100%;
    inline-size: var(--_column-width);
  }
  .column {
    block-size: 100%;
    inline-size: var(--_column-width);
  }

  /* NVD-19, NVD-22: a modal drawer is a native modal <dialog> in the top layer at the window's start edge, its full height,
     over ::backdrop (the scrim); it slides in from its start edge over the enter motion and out over the exit motion. */
  dialog.drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    inset-inline-end: auto;
    block-size: 100%;
    max-block-size: none;
    max-inline-size: 100%;
    translate: var(--_drag, 0px) 0;
    transition-property: translate, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  dialog.drawer:not([open]) {
    display: none;
    translate: var(--_away) 0;
  }
  :host {
    --_away: -100%;
  }
  :host(:dir(rtl)) {
    --_away: 100%;
  }
  dialog.drawer[open] {
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  dialog.drawer.dragging {
    transition: none;
  }
  @starting-style {
    dialog.drawer[open] {
      translate: var(--_away) 0;
    }
  }
  dialog.drawer::backdrop {
    background: ${t('scrim-color')};
    opacity: 0;
    transition-property: opacity, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  dialog.drawer[open]::backdrop {
    opacity: 1;
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog.drawer[open]::backdrop {
      opacity: 0;
    }
  }

  /* NVD-40: a collapsible modal drawer does not slide: it widens over the content from its column (placed over it: the
     column's box, measured when it opens) and narrows back to it, and its scrim fades, over the change's motion. */
  dialog.drawer.widening {
    inset-block: auto;
    inset-block-start: var(--_top, 0px);
    inset-inline-start: var(--_start, 0px);
    block-size: var(--_height, 100%);
    transition-property: inline-size, translate, display, overlay;
    transition-duration: ${t('motion-expand-duration')};
    transition-timing-function: ${t('motion-expand-easing')};
  }
  dialog.drawer.widening:not([open]) {
    display: none;
    translate: 0 0;
  }
  @starting-style {
    dialog.drawer.widening[open] {
      translate: 0 0;
      inline-size: var(--_column-width);
    }
  }
  dialog.drawer.widening.dragging {
    transition: none;
  }
  dialog.drawer.widening::backdrop,
  dialog.drawer.widening[open]::backdrop {
    transition-duration: ${t('motion-expand-duration')};
    transition-timing-function: ${t('motion-expand-easing')};
  }

  ${shape}

  @media (prefers-reduced-motion: reduce) {
    :host(:not([data-as='modal'])),
    :host(:not([data-as='modal'])[data-sliding][data-open]),
    :host(:not([data-as='modal']):not([data-open])),
    .drawer,
    .title,
    :host([collapsed]) .title,
    dialog.drawer,
    dialog.drawer[open],
    dialog.drawer.widening,
    dialog.drawer::backdrop,
    dialog.drawer[open]::backdrop,
    dialog.drawer.widening::backdrop,
    dialog.drawer.widening[open]::backdrop {
      transition-duration: 0s;
      transition-delay: 0s;
    }
    .clock {
      transition-delay: 0s;
    }
  }
  @media (forced-colors: active) {
    .drawer {
      border-inline-end: ${t('outline-width')} solid CanvasText;
    }
  }
`;

/**
 * A section (NVD-16, NVD-17): the divider component before it, across the drawer's inner width in either form; its
 * heading in heading.typescale and heading.color in a row at least heading.height, the text centred and starting where
 * the labels of destinations without an icon start; then its cells. Collapsed, the heading's row keeps its height and its
 * text fades and is clipped (NVD-35).
 */
export const sectionStyles = css`
  :host {
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: ${t('container-gap')};
  }
  tanrei-divider {
    align-self: stretch;
    margin-inline: ${t('container-padding-inline')};
  }
  .heading {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    min-block-size: ${t('heading-height')};
    margin: 0;
    overflow-x: clip;
  }
  .heading-text {
    box-sizing: border-box;
    flex: none;
    inline-size: ${t('container-width')};
    padding-inline: calc(${t('container-padding-inline')} + ${t('item-padding-inline')});
    font: ${t('heading-typescale-font')};
    letter-spacing: ${t('heading-typescale-letter-spacing')};
    color: ${t('heading-color')};
    opacity: 1;
    transition: opacity ${unsafeCSS(SECOND_HALF)};
  }
  /* NVD-16: the heading's letter-spacing follows its script (src/styles/script-tracking.ts). */
  ${unsafeCSS(scriptTracking('.heading-text', String(t('heading-typescale-letter-spacing'))))}
  /* NVD-52: the heading is its own run, in the direction of its first strong character, aligned to the layout's start. */
  ${productText('.heading-text', { align: 'start' })}
  .collapsed .heading-text {
    opacity: 0;
    transition: opacity ${unsafeCSS(FIRST_HALF)};
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: ${t('container-gap')};
  }
  @media (prefers-reduced-motion: reduce) {
    .heading-text,
    .collapsed .heading-text {
      transition: none;
    }
  }
`;

/**
 * The parts each condition colors in every state: the item container (the active indicator), the icon indicator, the
 * icon, the label (and the short label), the trailing text and the trailing glyph.
 */
const PARTS = { c: 'item-container-color', n: 'item-icon-indicator-color', i: 'item-icon-color', l: 'item-label-color', tt: 'item-trailing-text-color', ti: 'item-trailing-icon-color' } as const;
const set = (suffix: string, skip?: string) =>
  Object.keys(PARTS)
    .filter((key) => key !== skip)
    .map((key) => `\n    --_${key}: var(--_${key}${suffix});`)
    .join('');

/**
 * Where each state is read: hover and keyboard focus on the cell (the native button or link: the whole cell is the hit
 * area), press on the item container (`PressController` writes `data-pressed` there), disabled from `.d`. `:where()`
 * keeps every selector at the same specificity, so the order `stateRules()` writes them in is the precedence.
 */
const on = (state: string) => {
  if (state === ':hover') return '.cell:where(:hover)';
  if (state === ':focus-visible') return '.cell:where(:focus-visible)';
  if (state === ':disabled') return '.cell:where(.d)';
  return `.cell:where(:has(.container${state}))`;
};

/** From the row's start (the drawer's inner edge) to the icon column's centre line, at the cell's level of nesting. */
const ICON_LINE_X = `calc(${COLUMN} / 2 + var(--_level, 0) * ${T('item-nest-indent')} - ${PAD_INLINE})`;
/** From the row's start to the collapsed pill's start: the pill is centred in the icon column. */
const PILL_X = `calc(${COLUMN} / 2 - ${T('collapsed-item-container-width')} / 2 - ${PAD_INLINE})`;

/**
 * A cell — a destination's, or a group's row (NVD-4…10, NVD-13, NVD-14, NVD-27, NVD-31…35, NVD-41, NVD-43, NVD-44). The
 * cell is the native button or link: the drawer's full width (its current width, so its hit area follows the form) and
 * its height, with half of container.gap above and below it and at least the minimum target. In it, the row — laid out
 * for the expanded drawer, clipped by the cell: at least item.container.height, the icon on the icon column and the
 * cell's icon line (the row's centre), the label (wrapping) item.gap after it, the trailing content at its end — and,
 * placed around the same icon line, the item container (the row expanded; the pill collapsed) and the short label under
 * the icon.
 */
export const cellStyles = css`
  :host {
    display: block;
    outline: none;
  }
  :host([hidden]) {
    display: none;
  }
  ${unsafeCSS(conditionBlock(PREFIX, 'unselected', PARTS, '.cell'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'selected', PARTS, '.cell.selected'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'collapsed-unselected', PARTS, '.cell.collapsed'))}
  ${unsafeCSS(conditionBlock(PREFIX, 'collapsed-selected', PARTS, '.cell.collapsed.selected'))}

  .cell {
    all: unset;
    box-sizing: border-box;
    position: relative;
    display: block;
    inline-size: 100%;
    padding-inline-start: ${t('container-padding-inline')};
    /* NVD-35: the row, laid out for the expanded drawer, is clipped at the drawer's moving end edge. */
    overflow-x: clip;
    overflow-y: visible;
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    ${unsafeCSS(set('-r'))}
    /* A part the states, the selection and the form all recolor takes the state motion (NVD-41: a selection changes
       color in place, over it), and the change of form's while the form changes (the drawer's). */
    --_recolor-duration: var(--_nvd-recolor-duration, ${t('motion-state-duration')});
    --_recolor-easing: var(--_nvd-recolor-easing, ${t('motion-state-easing')});
    --_labels: calc(${t('collapsed-item-gap')} + ${unsafeCSS(SHORT_LINE)});
    transition: opacity ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  .cell.no-labels {
    --_labels: 0px;
  }
  /* NVD-31: while the drawer is collapsible, every cell has the same height and icon line in both forms: the icon line
     lies the larger of half the expanded row and collapsed padding-block plus half the icon indicator below the top, and
     the cell reaches the larger of half the expanded row and half the icon indicator, the short label's gap and line
     (unless collapsedLabels is never) and collapsed padding-block below it. The row is centred on that line. */
  .cell.collapsible {
    padding-block-start: max(0px, calc(${t('collapsed-item-container-padding-block')} + ${t('item-icon-indicator-height')} / 2 - ${t('item-container-height')} / 2));
    padding-block-end: max(0px, calc(${t('item-icon-indicator-height')} / 2 + var(--_labels) + ${t('collapsed-item-container-padding-block')} - ${t('item-container-height')} / 2));
  }
  /* Nothing inside the cell is hit-tested: a press anywhere in it lands on the native button or link itself. */
  .cell * {
    pointer-events: none;
  }
  .cell.d {
    cursor: default;
  }
  /* NVD-6: the hit area is the cell with half of container.gap above and below, and never below the minimum target. */
  .cell::before {
    content: '';
    position: absolute;
    inset-inline: 0;
    inset-block-start: 50%;
    block-size: max(calc(100% + ${t('container-gap')}), var(--tanrei-sys-target-pointer));
    transform: translateY(-50%);
  }
  @media (pointer: coarse) {
    .cell::before {
      block-size: max(calc(100% + ${t('container-gap')}), var(--tanrei-sys-target-touch));
    }
  }

  /* NVD-13: the expanded row, across the expanded drawer's inner width (whatever the form: the cell clips it). */
  .row {
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: ${t('item-gap')};
    inline-size: calc(${t('container-width')} - 2 * ${t('container-padding-inline')});
    min-block-size: ${t('item-container-height')};
    padding-inline-end: ${t('item-padding-inline')};
  }

  /* NVD-13, NVD-32, NVD-35: the item container — the expanded row, which starts item.nest-indent further in for each
     level of nesting (so a nested destination's fill, state layer and focus indicator hang under its group, and not
     its content alone), or the collapsed cell (collapsed.item.container.width, centred in the icon column, from collapsed
     padding-block above the icon indicator to collapsed padding-block below the short label, or below the icon indicator
     where the short label is not drawn) — one shape that changes size and corners around the same icon line over the
     change of form. Where the two forms give it the same height and corners, its end edge alone moves. */
  .container {
    box-sizing: border-box;
    position: absolute;
    z-index: -1;
    isolation: isolate;
    inset-block-start: 0;
    inset-inline-start: calc(var(--_level, 0) * ${t('item-nest-indent')});
    inline-size: calc(100% - var(--_level, 0) * ${t('item-nest-indent')});
    block-size: 100%;
    ${unsafeCSS(cornerRadius(`${PREFIX}-item-container-shape`))}
    transition:
      inset-block-start ${unsafeCSS(MORPH)},
      inset-inline-start ${unsafeCSS(MORPH)},
      inline-size ${unsafeCSS(MORPH)},
      block-size ${unsafeCSS(MORPH)},
      border-radius ${unsafeCSS(MORPH)};
  }
  .cell.collapsed .container {
    inset-block-start: calc(50% - ${t('item-icon-indicator-height')} / 2 - ${t('collapsed-item-container-padding-block')});
    inset-inline-start: ${unsafeCSS(PILL_X)};
    inline-size: ${t('collapsed-item-container-width')};
    block-size: calc(2 * ${t('collapsed-item-container-padding-block')} + ${t('item-icon-indicator-height')} + var(--_labels));
    ${unsafeCSS(cornerRadius(`${PREFIX}-collapsed-item-container-shape`))}
  }
  .cell.collapsed:not(.short-shown) .container {
    block-size: calc(2 * ${t('collapsed-item-container-padding-block')} + ${t('item-icon-indicator-height')});
  }
  /* NVD-41: a collapsed cell that gains or loses its short label (collapsedLabels selected) changes over the selection motion. */
  .cell[data-condition-change] .container {
    transition-duration: ${t('motion-selection-duration')};
    transition-timing-function: ${t('motion-selection-easing')};
  }
  /* The active indicator and the state layer: the item container's color in the current condition and state. NVD-41: a
     selection changes it in place, at its full size and shape, over the state motion — it never grows, shrinks or
     slides to show one. */
  .indicator {
    position: absolute;
    z-index: -2;
    inset: 0;
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    corner-shape: inherit;
    background: var(--_c);
    pointer-events: none;
    transition: background-color var(--_recolor-duration) var(--_recolor-easing);
  }

  /* NVD-13, NVD-14, NVD-32: the icon, centred on the icon column's centre line (and item.nest-indent further per level),
     the icon indicator centred behind it and taking no space. */
  .lead {
    position: relative;
    display: grid;
    flex: none;
    place-items: center;
    inline-size: ${t('item-icon-size')};
    block-size: ${t('item-icon-size')};
    margin-inline-start: calc(${unsafeCSS(ICON_LINE_X)} - ${t('item-icon-size')} / 2);
  }
  /* NVD-49: without an icon the icon indicator is still drawn, empty, on the icon column, taking no space. */
  .cell.no-icon .lead {
    position: absolute;
    inset-block-start: calc(50% - ${t('item-icon-size')} / 2);
    inset-inline-start: calc(${unsafeCSS(ICON_LINE_X)} - ${t('item-icon-size')} / 2);
    margin: 0;
  }
  .icon-indicator {
    position: absolute;
    z-index: -1;
    top: 50%;
    left: 50%;
    inline-size: ${t('item-icon-indicator-width')};
    block-size: ${t('item-icon-indicator-height')};
    translate: -50% -50%;
    ${unsafeCSS(cornerRadius(`${PREFIX}-item-icon-indicator-shape`))}
    background: var(--_n);
    /* NVD-41: the selection motion, read by the element through real properties (no animation is named here): the icon
       indicator grows in width from its centre on the newly selected cell, and fades out on the previous one. */
    animation-duration: ${t('motion-selection-duration')};
    animation-timing-function: ${t('motion-selection-easing')};
    transition: background-color var(--_recolor-duration) var(--_recolor-easing);
  }
  .cell[data-condition-change] .icon-indicator {
    transition: background-color ${t('motion-selection-duration')} ${t('motion-selection-easing')};
  }
  .cell.selected[data-condition-change] .icon-indicator {
    transition: none;
  }
  ${iconGlyph('.icon', { size: `${PREFIX}-item-icon-size`, selected: '.cell.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .icon {
    color: var(--_i);
    transition:
      color var(--_recolor-duration) var(--_recolor-easing),
      font-variation-settings var(--_recolor-duration) var(--_recolor-easing);
  }

  /* NVD-13: the label, item.gap after the icon — or item.padding-inline (and the nesting indent) from the row's start
     without one — wrapping rather than truncating; the row grows with it. NVD-35: it fades out over the first half of a
     collapse and in over the second half of an expansion, clipped at the moving edge. */
  .label {
    flex: 1 1 auto;
    min-inline-size: 0;
    padding-block: max(0px, calc((${t('item-container-height')} - 1lh) / 2));
    font: ${t('item-label-typescale-font')};
    letter-spacing: ${t('item-label-typescale-letter-spacing')};
    color: var(--_l);
    overflow-wrap: break-word;
    opacity: 1;
    transition:
      color var(--_recolor-duration) var(--_recolor-easing),
      opacity ${unsafeCSS(SECOND_HALF)};
  }
  .cell.no-icon .label {
    margin-inline-start: calc(${t('item-padding-inline')} + var(--_level, 0) * ${t('item-nest-indent')});
  }

  /* NVD-43: the trailing content at the row's end, item.gap after the label and item.padding-inline from the end: the
     trailing text on one line, never truncated, in trailing-text.typescale; a glyph in the trailing slot at
     trailing-icon.size (anything else as it draws itself); a group's chevron (NVD-44). Not interactive. NVD-51:
     iconGlyph() mirrors the icon and a glyph in the trailing slot that GlyphMirrorController marked, in right-to-left;
     the chevron (expand_more) is never marked. */
  .trailing {
    display: flex;
    flex: none;
    align-items: center;
    opacity: 1;
    transition: opacity ${unsafeCSS(SECOND_HALF)};
  }
  .trailing:not(.filled) {
    display: none;
  }
  .trailing-text {
    font: ${t('item-trailing-text-typescale-font')};
    letter-spacing: ${t('item-trailing-text-typescale-letter-spacing')};
    color: var(--_tt);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    transition: color var(--_recolor-duration) var(--_recolor-easing);
  }
  .trailing-slot:not(.filled) {
    display: none;
  }
  .trailing-slot {
    display: flex;
    align-items: center;
    color: var(--_ti);
    transition: color var(--_recolor-duration) var(--_recolor-easing);
  }
  ${iconGlyph('.trailing-slot.glyph', { size: `${PREFIX}-item-trailing-icon-size`, selected: '.cell.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .trailing-slot.glyph.filled {
    display: inline-flex;
    color: var(--_ti);
    transition: color var(--_recolor-duration) var(--_recolor-easing);
  }
  /* NVD-63: the mark of a link that opens a new context, drawn as a glyph of the trailing slot is. */
  ${iconGlyph('.link-mark', { size: `${PREFIX}-item-trailing-icon-size`, selected: '.cell.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .link-mark {
    color: var(--_ti);
    transition: color var(--_recolor-duration) var(--_recolor-easing);
  }
  ${iconGlyph('.chevron', { size: `${PREFIX}-item-trailing-icon-size`, selected: '.cell.selected', duration: `${PREFIX}-motion-disclosure-duration`, easing: `${PREFIX}-motion-disclosure-easing` })}
  .chevron {
    color: var(--_ti);
    transition:
      color var(--_recolor-duration) var(--_recolor-easing),
      rotate ${t('motion-disclosure-duration')} ${t('motion-disclosure-easing')};
  }
  .cell.open .chevron {
    rotate: 0.5turn;
  }
  .cell.collapsed :is(.label, .trailing) {
    opacity: 0;
    transition:
      color var(--_recolor-duration) var(--_recolor-easing),
      opacity ${unsafeCSS(FIRST_HALF)};
  }

  /* NVD-32, NVD-33, NVD-34: the short label, collapsed.item.gap under the icon indicator, centred on the icon column in
     one line of collapsed.item.label.typescale, cut with an ellipsis inside the collapsed padding-inline. It fades in
     over the second half of a collapse and out over the first half of an expansion (NVD-35), and with the selection
     over the selection motion (NVD-41). */
  .short {
    position: absolute;
    inset-block-start: calc(50% + ${t('item-icon-indicator-height')} / 2 + ${t('collapsed-item-gap')});
    inset-inline-start: calc(${unsafeCSS(PILL_X)} + ${t('collapsed-item-container-padding-inline')});
    inline-size: calc(${t('collapsed-item-container-width')} - 2 * ${t('collapsed-item-container-padding-inline')});
    overflow: hidden;
    text-align: center;
    white-space: nowrap;
    font: ${t('collapsed-item-label-typescale-font')};
    letter-spacing: ${t('collapsed-item-label-typescale-letter-spacing')};
    color: var(--_l);
    opacity: 0;
    transition:
      color var(--_recolor-duration) var(--_recolor-easing),
      opacity ${unsafeCSS(FIRST_HALF)};
  }
  /* NVD-52: each text of a row is its own run, in the direction of its first strong character, so a left-to-right name
     or a count with its unit keeps its order in a right-to-left drawer. The label's lines are still aligned to the
     layout's start edge; the trailing text is as wide as itself and stays at the row's end; the short label stays
     centred and, too long (NVD-32), loses the end of ITS direction — a left-to-right one its right end, never its
     beginning (src/styles/product-text.ts). */
  ${productText('.label', { align: 'start' })}
  ${productText(':is(.trailing-text, .short-text)')}
  /* The short label's text, in a box of its own inside the one the layout places (.short, whose inline-start inset is
     the layout's): the box that cuts it takes the text's direction (ownDirection()), so the ellipsis is drawn at the
     text's own end in every engine. */
  .short-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell.collapsed.short-shown .short {
    opacity: 1;
    transition:
      color var(--_recolor-duration) var(--_recolor-easing),
      opacity ${unsafeCSS(SECOND_HALF)};
  }
  .cell[data-condition-change] .short {
    transition:
      color var(--_recolor-duration) var(--_recolor-easing),
      opacity ${t('motion-selection-duration')} ${t('motion-selection-easing')};
  }

  /* NVD-56: the plain tooltip of a collapsed cell that draws no label lies over its item container, drawing nothing
     and answering no pointer itself (the cell is the one hit target): the cell opens it, beside the item container. */
  .tip {
    position: absolute;
    inset-block-start: calc(50% - ${t('item-icon-indicator-height')} / 2 - ${t('collapsed-item-container-padding-block')});
    inset-inline-start: ${unsafeCSS(PILL_X)};
    display: block;
    inline-size: ${t('collapsed-item-container-width')};
    block-size: calc(2 * ${t('collapsed-item-container-padding-block')} + ${t('item-icon-indicator-height')});
  }
  /* The tooltip's own waits, read through real properties (a duration token is an expression). */
  .tip-clock {
    display: none;
    transition-property: none;
    transition-delay: var(--tanrei-comp-tooltip-motion-show-delay);
    transition-duration: var(--tanrei-comp-tooltip-motion-hide-delay);
  }

  ${stateRules(on, {
    hovered: `${set('-h')}
    opacity: ${T('hovered-opacity')};`,
    focused: `${set('-f')}
    opacity: ${T('focused-opacity')};`,
    pressed: `${set('-p')}
    opacity: ${T('pressed-opacity')};`,
    pressedContent: `${set('-p', 'c')}
    opacity: ${T('pressed-opacity')};`,
    disabled: `
    cursor: default;${set('-d')}
    opacity: ${T('disabled-opacity')};`,
  })}
  .cell:where(:has(.container[data-pressed]:not([data-pressed='none']))) :is(.indicator, .icon-indicator, .icon, .label, .short, .trailing-text, .trailing-slot, .link-mark, .chevron) {
    transition-duration: 0s;
  }
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  /* NVD-5, NVD-10: the ring (or the glow) around the item container, never animated. */
  ${focusRing((focus) => `.cell${focus} .container`)}
  ${shape}
  ${pressHold('.hold')}
  .hold {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .cell,
    .container,
    .cell.collapsed .container,
    .indicator,
    .icon-indicator,
    .icon,
    .label,
    .trailing,
    .trailing-text,
    .trailing-slot,
    .link-mark,
    .chevron,
    .short,
    .cell.collapsed :is(.label, .trailing),
    .cell.collapsed.short-shown .short,
    .cell[data-condition-change] .short {
      transition: none;
    }
    .icon-indicator {
      animation-duration: 0s;
    }
  }
  @media (forced-colors: active) {
    .cell.selected .indicator {
      background: Highlight;
      forced-color-adjust: none;
    }
    .cell.selected :is(.icon, .label, .short, .trailing-text, .trailing-slot, .link-mark, .chevron) {
      color: HighlightText;
    }
    .cell.d :is(.icon, .label, .short, .trailing-text, .trailing-slot, .link-mark, .chevron) {
      color: GrayText;
    }
  }
`;

/**
 * A group (NVD-44…48): its row is a cell (above), and under it its items, revealed and hidden over the disclosure motion
 * while it opens and closes (and over the change of form's while the drawer collapses: the collapsed drawer draws none of
 * them, and the cells below move up), container.gap from its row and between them.
 */
export const groupStyles = css`
  .items {
    display: grid;
    grid-template-rows: 0fr;
    visibility: hidden;
    /* Clipped while partly shown; a focus ring on the first or last item still reaches past the edge. */
    overflow: clip;
    overflow-clip-margin: calc(var(--tanrei-sys-focus-offset) + var(--tanrei-sys-focus-inner-width) + var(--tanrei-sys-focus-outer-width));
    transition:
      grid-template-rows var(--_nvd-reveal-duration, ${t('motion-disclosure-duration')}) var(--_nvd-reveal-easing, ${t('motion-disclosure-easing')}),
      visibility 0s linear var(--_nvd-reveal-duration, ${t('motion-disclosure-duration')});
  }
  .items.shown {
    grid-template-rows: 1fr;
    visibility: visible;
    transition:
      grid-template-rows var(--_nvd-reveal-duration, ${t('motion-disclosure-duration')}) var(--_nvd-reveal-easing, ${t('motion-disclosure-easing')}),
      visibility 0s;
  }
  /* The row that folds to nothing: the list's own gap from the group's row is inside it, so a closed group takes no space. */
  .fold {
    min-block-size: 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: ${t('container-gap')};
    padding-block-start: ${t('container-gap')};
  }
  @media (prefers-reduced-motion: reduce) {
    .items,
    .items.shown {
      transition: none;
    }
  }
`;
