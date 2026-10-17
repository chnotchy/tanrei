import { css, unsafeCSS } from 'lit';
import { focusRing, iconGlyph, minimumTarget, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/file-item.tokens.json). Three things answer a pointer: the body of a
// pressable file item (hovered, focused, pressed), and its two actions (the same three). Each paints from that state's
// tokens of its form — `row` or `tile`, the token axis `form` — and nothing here computes how a state looks. The name,
// the second line, the glyph, the picture and the bar have no state (FIT-14).
export const PREFIX = '--tanrei-comp-file-item';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
/** A text role, used whole: the font shorthand and its letter spacing. */
const role = (part: string) => unsafeCSS(`font: ${T(`${part}-typescale-font`)};\n    letter-spacing: ${T(`${part}-typescale-letter-spacing`)};`);
/** The height of one line of a text role, for the boxes that are centred on a row's lines (FIT-2). */
const line = (part: string) => `calc(${T(`${part}-typescale-line-height`)} * ${T(`${part}-typescale-font-size`)})`;
const FORMS = ['row', 'tile'] as const;
type Form = (typeof FORMS)[number];
const on = (form: Form) => `.item[data-form='${form}']`;

/** FIT-14: what a state of the body paints — the layer over the glyph or the picture and the texts, from the form's container color of that state. */
const paintBody = (form: Form, state: string) => `
    --_layer: ${T(`${form}-${state ? `${state}-` : ''}container-color`)};`;
/** FIT-14: what a state of an action paints — its container, its glyph and the opacity. */
const paintAction = (form: Form, state: string, container = true) => {
  const part = (name: string) => T(`${form}-${state ? `${state}-` : ''}action-${name}`);
  return `${container ? `\n    background-color: ${part('container-color')};` : ''}
    color: ${part('icon-color')};${state ? `\n    opacity: ${T(`${state}-opacity`)};` : ''}`;
};
const PROGRESS = '--tanrei-comp-progress-indicator';

/** What is drawn nowhere and still read: a tile's name behind its picture (FIT-8). It names its place, so it widens nothing (src/scroll-box.test.ts). */
const unseen = `
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 1px;
    block-size: 1px;
    margin: 0;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;`;

export const styles = css`
  /* FIT-1: one file; no container, fill or edge around the whole. FIT-2: a row is a block as wide as its layout gives
     it. FIT-3: a tile is exactly as wide as its box, and never wider than its layout. */
  :host {
    display: block;
    min-inline-size: 0;
    /* Its own stacking order: the z-index of a part below orders the component's parts only, and never reaches the
       page's (a sticky header of the product's). What stands over the page is drawn in the top layer. */
    isolation: isolate;
  }
  :host([data-tile]) {
    display: inline-block;
    vertical-align: top;
    max-inline-size: 100%;
  }
  ${hiddenHost}

  .item {
    position: relative;
    --_lines: calc(${unsafeCSS(line('headline'))} + ${unsafeCSS(line('supporting-text'))});
    /* FIT-18: what lies between this item and the next of a column; its holder says it, and alone nothing does. */
    --_between: 0px;
    --_layer: transparent;
    /* FIT-18: the minimum target in force, and the space between two actions side by side — action.gap, or twice what
       the target exceeds action.size by where that is more, so that each hit area reaches the target on its own half. */
    --_target: var(--tanrei-sys-target-pointer);
    --_action-gap: max(${t('action-gap')}, calc((var(--_target) - ${t('action-size')}) * 2));
  }
  @media (pointer: coarse) {
    .item {
      --_target: var(--tanrei-sys-target-touch);
    }
  }

  /* ── The row (FIT-2) ── the glyph or the picture's square, the texts taking the room that is left, the mark of a new
     context, the actions — row.container.gap apart. The glyph, the square and the actions are centred on the row's
     first two lines: each stands in a box as tall as a line of the name and a line of the second line together. The
     bar stands below the texts and as wide as them (FIT-10): it is no part of the body, so that a body that is a button
     does not hide it from assistive technology, and begins where the texts begin. */
  ${unsafeCSS(on('row'))} {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: ${t('row-container-gap')};
    --_glyph: ${t('row-icon-size')};
    --_lead: var(--_glyph);
  }
  ${unsafeCSS(on('row'))}[data-preview] {
    --_lead: ${t('row-media-height')};
  }
  ${unsafeCSS(on('row'))} .body {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    align-items: flex-start;
    gap: ${t('row-container-gap')};
    min-inline-size: 0;
  }
  /* FIT-22: read-only, the texts reach the end edge. */
  ${unsafeCSS(on('row'))}[data-read-only] .body,
  ${unsafeCSS(on('row'))}[data-read-only] .bar {
    grid-column: 1 / -1;
  }
  ${unsafeCSS(on('row'))} .lead,
  ${unsafeCSS(on('row'))} .end,
  ${unsafeCSS(on('row'))} .open {
    flex: none;
    display: flex;
    align-items: center;
    block-size: var(--_lines);
  }
  ${unsafeCSS(on('row'))} .end {
    grid-column: 2;
    grid-row: 1;
    position: relative;
    gap: var(--_action-gap);
  }
  /* FIT-24: where what stands beside the texts would leave them less than half the row (the item measures), the actions
     stand on a line of their own below the texts and the bar, at the row's end and in the same order, as tall as the
     minimum target in force; the texts and the bar take the whole width after the glyph. */
  ${unsafeCSS(on('row'))}[data-stacked] .body,
  ${unsafeCSS(on('row'))}[data-stacked] .bar {
    grid-column: 1 / -1;
  }
  ${unsafeCSS(on('row'))}[data-stacked] .end {
    grid-column: 1 / -1;
    grid-row: 3;
    justify-self: end;
    block-size: var(--_target);
  }
  ${unsafeCSS(on('row'))} .media {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* FIT-2: with preview, a square of row.media.height on row.media.shape and the ground media.color, holding the
     picture — or the glyph centred, so that a column's names stay aligned. */
  ${unsafeCSS(on('row'))}[data-preview] .media {
    position: relative;
    flex: none;
    /* An edge it is given (forced colors, FIT-25) is inside its size. */
    box-sizing: border-box;
    overflow: hidden;
    inline-size: ${t('row-media-height')};
    block-size: ${t('row-media-height')};
    background-color: ${t('media-color')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-row-media-shape`))}
  }
  ${unsafeCSS(on('row'))} .text {
    flex: 1 1 0;
    min-inline-size: 0;
  }
  ${unsafeCSS(on('row'))} .bar {
    grid-column: 1;
    grid-row: 2;
    min-inline-size: 0;
    margin-block-start: ${t('progress-gap')};
    margin-inline-start: calc(var(--_lead) + ${t('row-container-gap')});
  }
  /* FIT-2: the name, drawn whole — it wraps, breaking inside a word where it must, and is never cut. */
  .headline {
    ${role('headline')}
    color: ${t('headline-color')};
    overflow-wrap: anywhere;
  }
  /* FIT-4: the second line — the format, the size, then the status, or the error in the status's place; it wraps and is never cut. */
  .supporting {
    ${role('supporting-text')}
    color: ${t('supporting-text-color')};
    overflow-wrap: anywhere;
  }
  .supporting.failed {
    color: ${t('error-supporting-text-color')};
  }
  /* FIT-28: the name, the format, the size, the status and the error are each text of their own direction, isolated. */
  ${productText('.headline', { align: 'start' })}
  ${productText('.said')}
  .supporting {
    text-align: start;
  }

  /* FIT-5: the glyph of the file's format — or the product's — in one color whatever the format. */
  ${iconGlyph('.icon', { size: '--_glyph', selected: ':not(*)' })}
  .icon {
    color: ${t('icon-color')};
  }
  /* The slot is the glyph's ink for GlyphDrawnController: an inline block as wide as the name it holds. */
  .icon slot,
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  .icon ::slotted(svg),
  .icon ::slotted(img) {
    display: block;
    inline-size: var(--tanrei-icon-size);
    block-size: var(--tanrei-icon-size);
  }
  /* FIT-31: nothing in a glyph's place until the icon set can draw it; the box keeps its size. */
  .icon:not([data-drawn]),
  .glyph:not([data-drawn]),
  .mark:not([data-drawn]) {
    visibility: hidden;
  }
  /* FIT-6: the picture in the glyph's place, once it can be drawn: it fills the box as fit names, is never stretched
     and never larger than the box. Until then, and where it cannot be drawn, the glyph stands there. */
  .preview {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
    object-position: center;
    -webkit-user-select: none;
    user-select: none;
    -webkit-user-drag: none;
  }
  .item[data-fit='contain'] .preview {
    object-fit: contain;
  }
  .preview:not([data-drawn]) {
    visibility: hidden;
  }
  .media[data-pictured] .icon {
    visibility: hidden;
  }

  /* FIT-4: the mark before the words of a status that is done or failed — status.icon.size, status.icon.gap from the
     words, in the status's own color — standing on the words' first line and making it no taller. */
  ${iconGlyph('.mark.status', { size: `${PREFIX}-status-icon-size`, selected: ':not(*)' })}
  .mark.status {
    vertical-align: top;
    margin-block-start: calc((${unsafeCSS(line('supporting-text'))} - ${t('status-icon-size')}) / 2);
  }
  /* The gap is the words': a glyph's box is left-to-right in every layout (its ligature is spelled so), so an inline
     margin of its own would stand at its right in a right-to-left row — between the mark and the size, not the words
     (FIT-26). A mark with no words after it has no gap to keep. */
  .mark.status + .said {
    margin-inline-start: ${t('status-icon-gap')};
  }
  .item[data-status='done'] .mark.status {
    color: ${t('done-icon-color')};
  }
  .item[data-status='error'] .mark.status {
    color: ${t('error-icon-color')};
  }
  /* FIT-13: the mark of a new context after a row's texts, at action.icon.size in the glyph's color. */
  ${iconGlyph('.mark.new', { size: `${PREFIX}-action-icon-size`, selected: ':not(*)' })}
  .mark.new {
    color: ${t('icon-color')};
  }

  /* ── The tile (FIT-3) ── a box of the width and the height given — tile.media.height high and as wide as it is high
     where they are not — on tile.container.shape and the ground media.color, holding the picture clipped to its
     corners or the glyph centred at tile.icon.size; beneath it, tile.container.gap from it and as wide as it, the name
     on one line and the second line. The box is no narrower than both actions, the space between them and the inset on
     each side need, and no lower than one action and the inset above and below it; where its layout gives it less room
     than its width it is as wide as that room and keeps its proportion. */
  ${unsafeCSS(on('tile'))} {
    display: block;
    --_glyph: ${t('tile-icon-size')};
    --_box-width: ${t('tile-media-height')};
    --_box-ratio: 1;
    --_box-min-width: calc(${t('action-size')} * 2 + var(--_action-gap) + ${t('tile-action-inset')} * 2);
    --_box-min-height: calc(${t('action-size')} + ${t('tile-action-inset')} * 2);
    inline-size: max(var(--_box-min-width), var(--_box-width));
    max-inline-size: 100%;
    /* Three lengths a script can read in pixels — the token of the box's height, for the proportion of a box whose
       width alone is given, and the least width and height, for the report of a box given less (FIT-3). They move nothing. */
    scroll-margin-block-start: ${t('tile-media-height')};
    scroll-margin-inline-start: var(--_box-min-width);
    scroll-margin-block-end: var(--_box-min-height);
  }
  ${unsafeCSS(on('tile'))} .body {
    display: flex;
    flex-direction: column;
    gap: ${t('tile-container-gap')};
    inline-size: 100%;
    min-inline-size: 0;
  }
  ${unsafeCSS(on('tile'))} .lead {
    display: block;
  }
  ${unsafeCSS(on('tile'))} .media,
  ${unsafeCSS(on('tile'))} .over {
    box-sizing: border-box;
    inline-size: 100%;
    aspect-ratio: var(--_box-ratio);
    min-block-size: var(--_box-min-height);
    overflow: hidden;
    ${unsafeCSS(cornerRadius(`${PREFIX}-tile-container-shape`))}
  }
  ${unsafeCSS(on('tile'))} .media {
    position: relative;
    display: grid;
    place-items: center;
    background-color: ${t('media-color')};
  }
  /* FIT-10: a tile's bar lies along the bottom edge of the box, inside it and as wide as it, clipped by its corners.
     The box it lies in is drawn over the picture's and answers no pointer. */
  ${unsafeCSS(on('tile'))} .over {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    /* As high as the box by the padding that is a share of its width, not by a proportion of its own: WebKit widens a
       positioned box that has a proportion until its least height fits it, past a tile its layout made narrower. */
    aspect-ratio: auto;
    block-size: 0;
    padding-block-end: calc(100% / (var(--_box-ratio)));
    pointer-events: none;
  }
  ${unsafeCSS(on('tile'))} .over tanrei-progress-indicator {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    /* FIT-10: clipped by the box's corners and by nothing of its own. */
    ${unsafeCSS(PROGRESS)}-track-shape: 0px;
    ${unsafeCSS(PROGRESS)}-track-shape-pill: 0;
  }
  ${unsafeCSS(on('tile'))} .text {
    min-inline-size: 0;
  }
  /* FIT-8: a tile that draws neither its name nor a second line keeps no room beneath its box. */
  ${unsafeCSS(on('tile'))} .text.bare {
    display: contents;
  }
  /* FIT-9: a tile's name on one line, cut in the middle: the start gives way with an ellipsis and the ending stays. */
  ${unsafeCSS(on('tile'))} .headline {
    display: flex;
    white-space: pre;
    overflow-wrap: normal;
    min-inline-size: 0;
  }
  /* The name is one isolate of its own direction (FIT-28), and the line its two parts stand on: placed at the tile's
     start by the layout, its start and its ending in the order the name's own direction gives them. */
  ${unsafeCSS(on('tile'))} .headline .cut {
    flex: 0 1 auto;
    display: flex;
    min-inline-size: 0;
  }
  ${unsafeCSS(on('tile'))} .headline .start {
    flex: 0 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ${unsafeCSS(on('tile'))} .headline .ending {
    flex: none;
  }
  /* FIT-8, FIT-9: a name that is not drawn, and the whole of a name that is drawn cut, is still the name. */
  ${unsafeCSS(on('tile'))} .headline.unseen,
  ${unsafeCSS(on('tile'))} .headline .whole {${unsafeCSS(unseen)}
  }
  /* FIT-3: the actions inside the box at its top end corner, tile.action.inset from the top and from the end edge. */
  ${unsafeCSS(on('tile'))} .end {
    position: absolute;
    inset-block-start: ${t('tile-action-inset')};
    inset-inline-end: ${t('tile-action-inset')};
    display: flex;
    gap: var(--_action-gap);
  }

  /* ── The body (FIT-12, FIT-13) ── while the file item is pressable its body is a native button, or an anchor, with
     nothing of the browser's own look; the layer of its state is drawn over the glyph or the picture and the texts. */
  .body {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the layer and the ripple sit above its content and below nothing else. */
    isolation: isolate;
    -webkit-tap-highlight-color: transparent;
  }
  .body.pressable {
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
  }
  .body.pressable:is(:disabled, [aria-disabled='true']) {
    cursor: default;
  }
  /* FIT-14: the layer — in a row over the body's bounds grown by row.container.outset on every side, on
     row.container.shape, taking no room; in a tile over the box, with the box's corners. */
  .layer {
    position: absolute;
    isolation: isolate;
    overflow: hidden;
    pointer-events: none;
    background-color: var(--_layer);
    transition: background-color ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  /* A row's pressable body IS those bounds: it is grown by the outset on every side and takes it back as a margin, so
     its content stands where it stood and the row is no larger — and the layer, the focus ring around it (FIT-14) and
     the press that lands on it are one box. A body that is not pressable is left as it is. */
  ${unsafeCSS(on('row'))} .body.pressable {
    margin: calc(${t('row-container-outset')} * -1);
    padding: ${t('row-container-outset')};
  }
  .layer {
    inset: 0;
  }
  ${unsafeCSS(on('row'))} .layer {
    ${unsafeCSS(cornerRadius(`${PREFIX}-row-container-shape`))}
  }
  ${unsafeCSS(on('tile'))} .layer {
    ${unsafeCSS(cornerRadius(`${PREFIX}-tile-container-shape`))}
  }
  ${unsafeCSS(
    FORMS.map(
      (form) => `
  ${on(form)} .body {${paintBody(form, '')}
    --_pressed-container: ${T(`${form}-pressed-container-color`)};
  }
  ${stateRules((state) => `${on(form)} .body.pressable${state}`, {
    hovered: paintBody(form, 'hovered'),
    focused: paintBody(form, 'focused'),
    pressed: paintBody(form, 'pressed'),
    pressedContent: '',
    disabled: paintBody(form, 'disabled'),
  })}
  ${on(form)} .body.pressable[aria-disabled='true'] {${paintBody(form, 'disabled')}
  }`,
    ).join('\n'),
  )}
  /* FIT-15: the pressed state appears without delay. */
  .body[data-pressed]:not([data-pressed='none']) .layer {
    transition-duration: 0s;
  }
  /* FIT-18: the body's hit area reaches the minimum target without changing its visual size; an action stands above it. */
  ${minimumTarget('.body.pressable')}
  .end {
    z-index: 1;
  }
  /* FIT-14, FIT-17: the ring (or the glow) around a keyboard-focused body — around the layer's bounds in a row, around
     the whole body in a tile — never animated. */
  ${focusRing((focus) => `.body.pressable${focus}`)}
  ${unsafeCSS(on('row'))} .body.pressable {
    ${unsafeCSS(cornerRadius(`${PREFIX}-row-container-shape`))}
  }
  ${unsafeCSS(on('tile'))} .body.pressable {
    ${unsafeCSS(cornerRadius(`${PREFIX}-tile-container-shape`))}
  }

  /* FIT-10: the bar — the linear progress indicator's drawing (PRG-2, PRG-6, PRG-7, PRG-13, PRG-14), given this
     component's tokens in the place of its own: the thickness, the ends, the two colors and the two motions. Its bar
     has a track and an indicator only, so the stop indicator, which the progress indicator draws by its size alone, is
     given no size. */
  tanrei-progress-indicator {
    ${unsafeCSS(PROGRESS)}-stop-indicator-size: var(--tanrei-sys-space-space0);
    ${unsafeCSS(PROGRESS)}-linear-thickness-medium: ${t('progress-thickness')};
    ${unsafeCSS(PROGRESS)}-track-shape: ${t('progress-shape')};
    ${unsafeCSS(PROGRESS)}-track-shape-pill: ${t('progress-shape-pill')};
    ${unsafeCSS(PROGRESS)}-track-color: ${t('progress-track-color')};
    ${unsafeCSS(PROGRESS)}-indicator-color: ${t('progress-indicator-color')};
    ${unsafeCSS(PROGRESS)}-motion-value-duration: ${t('motion-progress-duration')};
    ${unsafeCSS(PROGRESS)}-motion-value-easing: ${t('motion-progress-easing')};
    ${unsafeCSS(PROGRESS)}-motion-cycle-duration: ${t('motion-cycle-duration')};
    ${unsafeCSS(PROGRESS)}-motion-cycle-easing: ${t('motion-cycle-easing')};
  }

  /* FIT-11: an action — an icon-only button, a square of action.size on action.shape, its glyph at action.icon.size,
     filled with the action container color of its form. */
  .action {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the glyph. */
    isolation: isolate;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: ${t('action-size')};
    block-size: ${t('action-size')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-action-shape`))}
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  ${iconGlyph('.glyph', { size: `${PREFIX}-action-icon-size`, selected: ':not(*)' })}

  /* FIT-18: the hit area reaches the minimum target on both axes without changing the visual size — and no further
     toward a neighbour than half of what lies between them: action.gap along the row; between two rows what their
     holder says lies between them and what the rows' two lines leave above and below an action; in a tile the inset
     around it. So two hit areas never overlap, a press on an action's visible bounds is that action's, and a press
     between two goes to the nearer one. */
  ${minimumTarget('.action')}
  .action::before {
    inline-size: min(max(100%, var(--_target)), calc(100% + var(--_action-gap)));
    block-size: min(max(100%, var(--_target)), calc(var(--_lines) + var(--_between)));
  }
  ${unsafeCSS(on('tile'))} .action::before {
    block-size: min(max(100%, var(--_target)), calc(100% + ${t('tile-action-inset')} * 2));
  }
  /* FIT-18, FIT-24: the hit area of the action at a file item's end reaches no further toward the end than the item's
     own edge — the row's end, which is the action's; in a tile the inset around it. A hit area that reached past it
     would widen whatever scrolls around the item, and a row at the edge of a narrow window would scroll the page
     sideways. What it lacks there it takes toward the start: as far as half of what lies between it and the action
     before it, or in a row as what lies between it and the texts. */
  .action:last-child::before {
    --_lacks: max(0px, var(--_target) - 100%);
    --_toward-end: 0px;
    --_toward-start: ${t('row-container-gap')};
    --_end: min(var(--_lacks) / 2, var(--_toward-end));
    inset-inline-start: calc(-1 * min(var(--_lacks) - var(--_end), var(--_toward-start)));
    inset-inline-end: calc(-1 * var(--_end));
    inline-size: auto;
  }
  /* FIT-18: the action before another reaches half of what it lacks toward the texts, as alone, and half the space
     between the two toward the action after it — which reaches the other half — so that a press between them goes to
     the nearer one and each reaches at least the minimum target. */
  .item .action:not(:last-child)::before {
    --_lacks: max(0px, var(--_target) - 100%);
    inset-inline-start: calc(-1 * var(--_lacks) / 2);
    inset-inline-end: calc(-1 * var(--_action-gap) / 2);
    inline-size: auto;
  }
  .action:last-child::before,
  :host(:dir(rtl)) .action:last-child::before,
  .item .action:not(:last-child)::before,
  :host(:dir(rtl)) .item .action:not(:last-child)::before {
    transform: translateY(-50%);
  }
  ${unsafeCSS(on('tile'))} .action:last-child::before {
    --_toward-end: ${t('tile-action-inset')};
    --_toward-start: var(--_lacks);
  }
  .item .action + .action:last-child::before {
    --_toward-start: calc(var(--_action-gap) / 2);
  }

  /* FIT-14, FIT-21: each state paints the action from that state's tokens of its form; pressed > focused > hovered, disabled over all. */
  ${unsafeCSS(
    FORMS.map(
      (form) => `
  ${on(form)} .action {${paintAction(form, '')}
    --_pressed-container: ${T(`${form}-pressed-action-container-color`)};
  }
  ${stateRules((state) => `${on(form)} .action${state}`, {
    hovered: paintAction(form, 'hovered'),
    focused: paintAction(form, 'focused'),
    pressed: paintAction(form, 'pressed'),
    pressedContent: paintAction(form, 'pressed', false),
    disabled: `${paintAction(form, 'disabled')}
    cursor: default;`,
  })}`,
    ).join('\n'),
  )}
  /* FIT-16 ripple: grows over motion.feedback-duration and fades over motion.state-duration. */
  ${rippleStyles({
    color: '--_pressed-container',
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}
  /* The body's ripple is drawn in its layer, over the picture and the texts. */
  .layer .ripple {
    z-index: auto;
  }
  /* FIT-14, FIT-17: the ring (or the glow) around a keyboard-focused action, never animated. */
  ${focusRing((focus) => `.action${focus}`)}
  /* FIT-17: corner smoothing on the box, the picture's square, the layer and the actions (data-tanrei-shape) — after the buttons' own reset. */
  ${shape}
  /* FIT-15: the carrier of press-hold for PressController. */
  ${pressHold('.hold')}

  @media (prefers-reduced-motion: reduce) {
    .action,
    .layer {
      transition: none;
    }
  }

  /* FIT-25: forced colors. The texts and the glyphs take the text color, a link's name the link color; the bar's
     indicator is the highlight color on a track edged in the text color; a tile's box and a row's picture box get an
     edge in the text color, since their ground is gone; a tile's action stands on the surface color with an edge; a
     disabled action takes the disabled text color. A picture is left as it is, and no color tells a failed file from
     another: its words and its mark's shape do. */
  @media (forced-colors: active) {
    .icon,
    .mark,
    .mark.new,
    .item[data-status] .mark.status,
    .headline,
    .supporting,
    .supporting.failed {
      color: CanvasText;
    }
    a.body .headline {
      color: LinkText;
    }
    .preview {
      forced-color-adjust: none;
    }
    ${unsafeCSS(on('tile'))} .media,
    ${unsafeCSS(on('row'))}[data-preview] .media {
      border: var(--tanrei-sys-border-hairline) solid CanvasText;
    }
    .layer {
      background-color: transparent;
    }
    tanrei-progress-indicator::part(track) {
      background: Canvas;
      outline: var(--tanrei-sys-border-hairline) solid CanvasText;
    }
    .action {
      border: var(--tanrei-sys-border-hairline) solid ButtonText;
      color: ButtonText;
      opacity: initial;
    }
    ${unsafeCSS(on('tile'))} .action {
      background-color: Canvas;
    }
    .action:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
