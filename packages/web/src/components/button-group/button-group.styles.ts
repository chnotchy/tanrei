import { css, unsafeCSS } from 'lit';
import { groupItemReset, separationHost, whenGap } from '../../primitives/index.js';

const PREFIX = '--tanrei-comp-button-group';
const T = (name: string) => `var(${PREFIX}-${name})`;

const CONNECTED = ":host([variant='connected'])";
/** A connected row: horizontal is the default, and what an unknown orientation draws (BGR-9). */
const ROW = ":host([variant='connected']:not([orientation='vertical']))";
const COLUMN = ":host([variant='connected'][orientation='vertical'])";

// BGR-21: the gap form of a connected group, in a row and in a column — the items connected.gap apart, nothing drawn
// between them, connected.inner-shape where they face each other, and no seam: each item draws its outline and its
// ring inside its own edge again. `row` is the group's row (the element the separation is asked on).
const gapForm = (row: string) => `
  ${CONNECTED} ${row} {
    gap: ${T('connected-gap')};
  }
  ${CONNECTED} ${row} .divider {
    display: none;
  }
  ${ROW} ${row} slot:not(.first)::slotted(*) {
    --tanrei-group-start-radius: ${T('connected-inner-shape')};
    --tanrei-group-seam-start: initial;
  }
  ${ROW} ${row} slot:not(.last)::slotted(*) {
    --tanrei-group-end-radius: ${T('connected-inner-shape')};
    --tanrei-group-seam-end: initial;
  }
  ${COLUMN} ${row} slot:not(.first)::slotted(*) {
    --tanrei-group-top-radius: ${T('connected-inner-shape')};
    --tanrei-group-seam-top: initial;
  }
  ${COLUMN} ${row} slot:not(.last)::slotted(*) {
    --tanrei-group-bottom-radius: ${T('connected-inner-shape')};
    --tanrei-group-seam-bottom: initial;
  }`;

// Every value is a token (tokens/comp/button-group.tokens.json): the gap of each variant, the connected corners, the
// divider and the padding at a joined row's outer ends. The group draws nothing of its own but the dividers — no fill,
// no state — and its items keep their own tokens (BGR-5).
export const styles = css`
  /* BGR-1, BGR-7: at the group's natural width and never wider than its container; it never wraps or scrolls. */
  :host {
    display: inline-flex;
    vertical-align: middle;
    max-inline-size: 100%;
    /* Its own stacking order: the z-index of a part below orders the component's parts only, and never reaches the
       page's (a sticky header of the product's). What stands over the page is drawn in the top layer. */
    isolation: isolate;
    /* BGR-3: joined items cannot extend a hit area over each other, so each is at least the target along the join. */
    --_join-target: var(--tanrei-sys-target-pointer);
  }
  @media (pointer: coarse) {
    :host {
      --_join-target: var(--tanrei-sys-target-touch);
    }
  }
  :host([hidden]) {
    display: none;
  }
  /* BGR-17: the whole width its container gives it. */
  :host([full-width]) {
    display: flex;
    inline-size: 100%;
  }

  /* BGR-21: the separation this group draws — its attribute's, else comp.button-group.connected.separation's. */
  ${separationHost(`${PREFIX}-connected-separation`)}

  /* BGR-1, BGR-8, BGR-13: one row, in the placed order (from the right in right-to-left, the flex row's inline
     direction), each item at its own size, centred on the row's middle and standard.gap apart. */
  .row {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    align-items: center;
    gap: ${unsafeCSS(T('standard-gap'))};
    min-inline-size: 0;
  }
  /* BGR-12, BGR-14: one column, top to bottom in the placed order in either layout direction, every item as wide as the
     column: the widest item's width, or the container's while full-width. */
  :host([orientation='vertical']) .row {
    flex-direction: column;
    align-items: stretch;
  }

  /* BGR-7: a row that does not fit narrows its Buttons in proportion to their widths (each shrinks by its share of its
     own width), down to their longest word — their labels wrap (src/primitives/group-item.ts) — and keeps its icon-only
     Buttons at their size (their own minimum width). A standard group sets no corner, no size, no seam and no padding
     (BGR-2): nothing reaches its items from a group around it either. */
  ::slotted(*) {
    flex: 0 1 auto;
    ${unsafeCSS(groupItemReset)}
  }
  /* BGR-17: equal shares of the row, one per item, whatever each holds; an item that cannot be as narrow as its share
     keeps its minimum (its longest word, an icon-only Button's width) and the others share the rest. The item's
     container fills its share (the item is a flex box whose one child grows: src/primitives/group-item.ts, \`stretch\`),
     its content centred. */
  :host([full-width]) ::slotted(*) {
    display: flex;
    flex: 1 1 0;
  }
  /* BGR-12: in a column every item's container is as wide as the column; a column narrower than its widest item gives
     every item that width, and the labels wrap. */
  :host([orientation='vertical']) ::slotted(*) {
    display: flex;
    flex: none;
  }
  /* BGR-1, BGR-21: connected — joined. This is the divider form (the first value of the choice, and so what an unknown
     name draws): the items touch, and every item is stretched to the tallest. */
  ${unsafeCSS(CONNECTED)} .row {
    align-items: stretch;
    gap: 0;
  }

  /* BGR-2, BGR-3, BGR-11, BGR-22, BGR-23: a connected row. The first item's start corners and the last one's end corners
     take connected.horizontal.outer-shape (held to half the item's height by the item), and each of those two items the
     padding connected.horizontal.outer-inset on that side; every corner that faces a neighbour is square, and the edge
     there is a seam, along which the item draws no outline and no ring; every item is at least the target wide. By the
     slot's place, so an item that comes, goes or moves changes its neighbours at once. Logical sides, so right-to-left
     mirrors them (BGR-8). A single item keeps every corner as it draws it and gets no padding (BGR-10). */
  ${unsafeCSS(ROW)} ::slotted(*) {
    --tanrei-group-min-width: var(--_join-target);
    --tanrei-group-pill: 0;
  }
  ${unsafeCSS(ROW)} slot:not(.first)::slotted(*) {
    --tanrei-group-start-radius: 0px;
    --tanrei-group-seam-start: 1;
  }
  ${unsafeCSS(ROW)} slot:not(.last)::slotted(*) {
    --tanrei-group-end-radius: 0px;
    --tanrei-group-seam-end: 1;
  }
  ${unsafeCSS(ROW)} slot.first:not(.last)::slotted(*) {
    --tanrei-group-start-radius: ${unsafeCSS(T('connected-horizontal-outer-shape'))};
    --tanrei-group-pill: var(${unsafeCSS(PREFIX)}-connected-horizontal-outer-shape-pill, 0);
    --tanrei-group-outer-start: ${unsafeCSS(T('connected-horizontal-outer-inset'))};
  }
  ${unsafeCSS(ROW)} slot.last:not(.first)::slotted(*) {
    --tanrei-group-end-radius: ${unsafeCSS(T('connected-horizontal-outer-shape'))};
    --tanrei-group-pill: var(${unsafeCSS(PREFIX)}-connected-horizontal-outer-shape-pill, 0);
    --tanrei-group-outer-end: ${unsafeCSS(T('connected-horizontal-outer-inset'))};
  }

  /* BGR-3, BGR-16: a connected column. The first item's top corners and the last one's bottom corners take
     connected.vertical.outer-shape; every other corner is square, and the edge between two items is a seam; every item
     is at least the target high. No padding is added: a column's ends are not full (BGR-23). */
  ${unsafeCSS(COLUMN)} ::slotted(*) {
    --tanrei-group-min-height: var(--_join-target);
    --tanrei-group-pill: 0;
  }
  ${unsafeCSS(COLUMN)} slot:not(.first)::slotted(*) {
    --tanrei-group-top-radius: 0px;
    --tanrei-group-seam-top: 1;
  }
  ${unsafeCSS(COLUMN)} slot:not(.last)::slotted(*) {
    --tanrei-group-bottom-radius: 0px;
    --tanrei-group-seam-bottom: 1;
  }
  ${unsafeCSS(COLUMN)} slot.first:not(.last)::slotted(*) {
    --tanrei-group-top-radius: ${unsafeCSS(T('connected-vertical-outer-shape'))};
    --tanrei-group-pill: var(${unsafeCSS(PREFIX)}-connected-vertical-outer-shape-pill, 0);
  }
  ${unsafeCSS(COLUMN)} slot.last:not(.first)::slotted(*) {
    --tanrei-group-bottom-radius: ${unsafeCSS(T('connected-vertical-outer-shape'))};
    --tanrei-group-pill: var(${unsafeCSS(PREFIX)}-connected-vertical-outer-shape-pill, 0);
  }
  /* BGR-10: a single item keeps every corner, and its smoothing, as it draws them. */
  ${unsafeCSS(CONNECTED)} slot.first.last::slotted(*) {
    --tanrei-group-pill: initial;
  }

  /* BGR-22: the divider — one line on each seam, connected.divider.thickness thick in connected.divider.color, centred
     on the seam, over the items' fills and state layers, stopping connected.divider.inset short of each end. It takes
     no space (an empty box between two items), no press and no semantics, and keeps its color whatever the states of
     the items beside it. In a row it runs top to bottom; in a column from start to end. */
  .divider {
    position: relative;
    z-index: 1;
    flex: none;
    align-self: stretch;
    inline-size: 0;
    pointer-events: none;
  }
  .divider::before {
    content: '';
    position: absolute;
    inset-block: ${unsafeCSS(T('connected-divider-inset'))};
    inset-inline-start: calc(${unsafeCSS(T('connected-divider-thickness'))} / -2);
    inline-size: ${unsafeCSS(T('connected-divider-thickness'))};
    background: ${unsafeCSS(T('connected-divider-color'))};
  }
  /* BGR-24: a seam carries the line only while its two items rest on the same fill (the element writes data-line): none
     where the fills differ, and between two emphasis fills — filled Buttons, selected toggles — the line a strong fill
     can show, connected.divider.on-fill.color. Neither follows a state. */
  .divider[data-line='none']::before {
    display: none;
  }
  .divider[data-line='on-fill']::before {
    background: ${unsafeCSS(T('connected-divider-on-fill-color'))};
  }
  /* BGR-24: where a resting color is resolved; never drawn. */
  .probe {
    display: none;
  }
  :host([orientation='vertical']) .divider {
    inline-size: auto;
    block-size: 0;
  }
  :host([orientation='vertical']) .divider::before {
    inset-block: calc(${unsafeCSS(T('connected-divider-thickness'))} / -2) auto;
    inset-inline: ${unsafeCSS(T('connected-divider-inset'))};
    inline-size: auto;
    block-size: ${unsafeCSS(T('connected-divider-thickness'))};
  }
  /* BGR-21: the gap form, where the group's separation is gap. */
  ${whenGap('.row', gapForm)}

  @media (forced-colors: active) {
    .divider::before,
    .divider[data-line='on-fill']::before {
      background: ButtonText;
    }
  }
`;
