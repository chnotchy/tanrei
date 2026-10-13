import { css, unsafeCSS } from 'lit';
import { focusRing, iconGlyph, itemRowStyles, pressHold, rowTarget, separationHost, whenGap } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/menu.tokens.json). An item's four conditions — unselected, selected (a
// checked checkbox or radio item), destructive and expanded (a submenu item whose submenu is open) — are its state
// variants: each colors the row and every part in every state, and the item only says which condition and
// which state's tokens are drawn.
const PREFIX = '--tanrei-comp-menu';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

const PARTS = {
  c: 'container-color',
  l: 'label-color',
  s: 'supporting-text-color',
  t: 'trailing-text-color',
  li: 'leading-icon-color',
  ti: 'trailing-icon-color',
  m: 'mark-color',
  // MNU-39, MNU-40: the box and the ring of a control look, and the check on a checked box.
  k: 'control-color',
  km: 'control-mark-color',
} as const;

/**
 * Where each state is read (MNU-10): an item's semantics and focus are its host's — or, for a link item (MNU-53), its
 * row's, which is then the anchor. Focus the pointer moved there (MNU-8, `.pf`) is not the focused state, and an item
 * the pointer crosses on its way to an open submenu (MNU-45, `data-nh`) is not hovered. Every selector has the same
 * specificity (`:where()` adds none), so the order is the precedence.
 */
const on = (state: string) => {
  if (state === ':focus-visible') return ':host(:focus-visible) .row:where(:not(.pf)), .row.p:focus-visible:where(:not(.pf))';
  if (state === ':disabled') return '.row.p.d';
  if (state === ':hover') return '.row.p:hover:where(:not([data-nh]))';
  return `.row.p${state}`;
};

/**
 * A surface (MNU-3) — the menu's own and each submenu's (MNU-50), from the same tokens: its color, corners (eased by the
 * smoothing), elevation, width bounds and padding, the box that scrolls its items, and what parts its groups — the
 * divider (MNU-23) or, where the separation is gap, empty space (MNU-36).
 */
const surface = css`
  .surface {
    box-sizing: border-box;
    flex-direction: column;
    /* A popover's own box: none of the browser's defaults. */
    position: fixed;
    inset: auto;
    margin: 0;
    border: 0;
    padding: 0;
    color: inherit;
    /* MNU-3: as wide as its widest item within the bounds; clipped to its shape; its color and elevation. MNU-2: never
       wider than the window less its margins — which bounds the minimum too, since a minimum wins over a maximum, and
       the minimum grows with the text while a narrow window does not. */
    inline-size: max-content;
    min-inline-size: min(${t('surface-min-width')}, calc(100vw - 2 * ${t('surface-viewport-margin')}));
    max-inline-size: min(${t('surface-max-width')}, calc(100vw - 2 * ${t('surface-viewport-margin')}));
    overflow: hidden;
    background: ${t('surface-color')};
    box-shadow: ${t('surface-elevation')};
    ${unsafeCSS(cornerRadius('--tanrei-comp-menu-surface-shape'))}
  }
  .surface:popover-open,
  .surface.inline {
    display: flex;
  }
  /* MNU-2: taller than the room left, the items scroll inside the padding. */
  .scroll {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-block: ${t('surface-padding-block')};
    padding-inline: ${t('surface-padding-inline')};
  }
  /* MNU-19's verify: drawn in place, a surface shows the submenu that is drawn beside it. */
  .surface.inline.cascading,
  .surface.inline.cascading > .scroll {
    overflow: visible;
  }
  /* MNU-23: a line across the inner width, inside the surface's padding, with space above and below. */
  .divider {
    flex: none;
    block-size: ${t('divider-thickness')};
    margin-block: ${t('divider-space')};
    background: ${t('divider-color')};
  }
  /* MNU-36: a group, or a run of items outside any group, is a tile: under divider a box with no look of its own. */
  .tile {
    display: contents;
  }
  /* MNU-36: under gap, each tile is a sheet of its own — the surface's color, corners (eased by the smoothing),
     elevation (its ring inside the tile's edge, so that the box that scrolls does not cut it) and padding — and
     comp.menu.group.gap of empty space stands between two tiles in the divider's place, where what is under the menu
     shows: the surface draws no sheet, edge or elevation of its own around them. No line, and no separator: the divider
     is not rendered, so it is nothing to assistive technology either. MNU-35: the cascade answers which form is drawn
     (the attribute over the component token), so a change of either is followed at once, without a render. */
  .gap {
    display: none;
    flex: none;
    block-size: ${t('group-gap')};
  }
  ${whenGap(
    '.scroll',
    (scroll) => `
  ${scroll} > .divider {
    display: none;
  }
  ${scroll} > .gap {
    display: block;
  }
  .surface:has(> ${scroll}) {
    background: none;
    box-shadow: none;
  }
  ${scroll} {
    padding: 0;
  }
  ${scroll} > .tile {
    box-sizing: border-box;
    display: flex;
    flex: none;
    flex-direction: column;
    padding-block: ${T('surface-padding-block')};
    padding-inline: ${T('surface-padding-inline')};
    background: ${T('surface-color')};
    box-shadow: ${T('surface-elevation-inset-ring')};
    ${cornerRadius('--tanrei-comp-menu-surface-shape')}
  }
  @media (forced-colors: active) {
    .surface:has(> ${scroll}) {
      border: 0;
    }
    ${scroll} > .tile {
      border: 1px solid CanvasText;
    }
  }`,
  )}
  @media (prefers-reduced-motion: reduce) {
    .surface.entering,
    .surface.leaving {
      animation: none;
    }
  }
  @media (forced-colors: active) {
    .surface {
      border: 1px solid CanvasText;
    }
    .divider {
      background: CanvasText;
    }
  }
`;

/**
 * The menu (MNU-1…4, MNU-23, MNU-35, MNU-36): the surface — in the top layer as a popover, or in place with `inline` —
 * what parts its groups, and the open and close motion.
 */
export const menuStyles = css`
  :host {
    display: block;
  }
  /* MNU-35: the separation this menu draws — its attribute's, else comp.menu.separation's; every submenu inherits it. */
  ${separationHost(`${PREFIX}-separation`)}
  ${surface}
  .surface {
    /* The placement reads its two lengths through real properties (a custom property holds an expression). */
    scroll-margin-block-start: ${t('surface-offset')};
    scroll-margin-block-end: ${t('surface-viewport-margin')};
  }
  .surface.inline {
    position: relative;
  }
  /* MNU-44: the delay a resting pointer opens a submenu after, read through a real property; nothing here transitions. */
  .scroll {
    transition-property: none;
    transition-delay: ${t('motion-submenu-delay')};
  }

  /* MNU-4: in, it fades and grows from the edge that faces the anchor; out, it fades. At once where motion is reduced. */
  .surface.entering {
    transform-origin: top;
    animation: menu-open ${t('motion-open-duration')} ${t('motion-open-easing')} both;
  }
  .surface.entering.side-top {
    transform-origin: bottom;
  }
  .surface.leaving {
    animation: menu-close ${t('motion-close-duration')} ${t('motion-close-easing')} both;
  }
  @keyframes menu-open {
    from {
      opacity: 0;
      transform: scaleY(0);
    }
  }
  @keyframes menu-close {
    to {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .surface.entering,
    .surface.leaving {
      animation: none;
    }
  }

  ${shape}
`;

/**
 * A submenu item's own surface (MNU-46, MNU-50): the menu's surface again, in the top layer beside the surface that
 * holds the item — or, while the menu is drawn in place, beside the item's row — growing in from the edge that faces
 * the item. The item's row is drawn by the item styles.
 */
export const submenuStyles = css`
  :host {
    /* The surface drawn in place is placed against the row. */
    position: relative;
  }
  ${surface}
  .surface {
    /* The placement reads its lengths through real properties: the distance from the surface that holds the item, the
       viewport's margin, what stays uncovered of that surface where the two overlap (MNU-47), and the narrowest it gets. */
    scroll-margin-block-start: ${t('submenu-offset')};
    scroll-margin-block-end: ${t('surface-viewport-margin')};
    scroll-margin-inline-start: var(--tanrei-sys-target-touch);
    scroll-margin-inline-end: ${t('surface-min-width')};
    cursor: auto;
  }
  /* MNU-19's verify, MNU-46: in place, comp.menu.submenu.offset from the inline-end edge of the surface that holds the
     row (the row ends that surface's inline padding short of it), its first row level with the row. */
  .surface.inline {
    position: absolute;
    z-index: 1;
    inset-block-start: calc(${t('surface-padding-block')} * -1);
    inset-inline-start: calc(100% + ${t('surface-padding-inline')} + ${t('submenu-offset')});
  }
  /* MNU-50: the open and close motion of MNU-4, growing from the edge that faces the submenu's item. */
  .surface.entering {
    transform-origin: left;
    animation: submenu-open ${t('motion-open-duration')} ${t('motion-open-easing')} both;
  }
  .surface.entering.side-left {
    transform-origin: right;
  }
  .surface.leaving {
    animation: submenu-close ${t('motion-close-duration')} ${t('motion-close-easing')} both;
  }
  @keyframes submenu-open {
    from {
      opacity: 0;
      transform: scaleX(0);
    }
  }
  @keyframes submenu-close {
    to {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .surface.entering,
    .surface.leaving {
      animation: none;
    }
  }
`;

/**
 * A group (MNU-24, MNU-28): its items, and its title inset from the rows' edges by its own token — at the default values
 * where each row's first column starts, whichever columns the menu draws.
 */
export const groupStyles = css`
  :host {
    display: block;
  }
  .title {
    display: block;
    padding-block: ${t('container-padding-block')};
    padding-inline: ${t('group-title-padding-inline')};
    font: ${t('group-title-typescale-font')};
    letter-spacing: ${t('group-title-typescale-letter-spacing')};
    color: ${t('group-title-color')};
    overflow-wrap: break-word;
  }
  /* MNU-34: the title is its own run, in the direction of its first strong character, aligned to the layout's start. */
  ${productText('.title', { align: 'start' })}
`;

/** An item of any kind (MNU-10…22, MNU-27, MNU-37…42): the row, its columns, its texts, its mark and the submenu indicator. */
export const itemStyles = css`
  :host {
    display: block;
    /* MNU-11: the ring is drawn inside the row, never around the host. */
    outline: none;
  }

  /* MNU-21: the glyphs, at their sizes, in the family and fill of the item's condition. MNU-22: the check, always in the
     selected family and fill (its column is the ancestor that says so). MNU-33: iconGlyph() mirrors the leading and
     trailing glyphs GlyphMirrorController marked, in right-to-left, in their own boxes; the check is never marked. */
  ${iconGlyph('.leading-icon', { size: '--tanrei-comp-menu-leading-icon-size', selected: '.row.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  ${iconGlyph('.check', { size: '--tanrei-comp-menu-mark-size', selected: '.mark', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  /* MNU-39: the check in the box of the checkbox look is a control's own mark, drawn at comp.menu.control.mark.weight
     (not sys.icon.weight, which the check of the glyph look keeps, MNU-22) in a glyph box of control.mark.size. It
     names no motion here: the transition is .check's own, below. */
  ${iconGlyph('.check.box-check', { size: '--tanrei-comp-menu-control-mark-size', weight: '--tanrei-comp-menu-control-mark-weight', selected: '.mark' })}
  ${iconGlyph('.trailing-icon', { size: '--tanrei-comp-menu-trailing-icon-size', selected: '.row.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* MNU-10, MNU-13, MNU-15, MNU-16, MNU-18, MNU-27: the conditions, the states and their precedence, the paints, the
     ripple and the state motion (src/primitives/item-row.ts). */
  ${itemRowStyles({
    prefix: PREFIX,
    parts: PARTS,
    conditions: { unselected: '.row', selected: '.row.selected', destructive: '.row.destructive', expanded: '.row.expanded' },
    on,
    paints: { '.label': 'l', '.supporting': 's', '.trailing-text': 't', '.shortcut': 't', '.leading-icon': 'li', '.trailing-icon': 'ti' },
  })}
  /* MNU-53: a link item's row is an anchor, drawn exactly as an action's row: nothing of a link's own look. */
  a.row {
    color: inherit;
    text-decoration: none;
    /* The browser's own offset for a focused link; the ring's rules set theirs (MNU-11). */
    outline-offset: 0;
  }

  /* MNU-19, MNU-20: one row — the padding at each end (logical, so RTL mirrors), at least container.height tall and
     padded above and below; it grows with its content, never clipping it. */
  .row {
    display: flex;
    align-items: center;
    padding-block: ${t('container-padding-block')};
    padding-inline: ${t('container-padding-inline')};
  }
  /* MNU-12: at least the minimum target tall — stacked items cannot extend a hit area over each other. */
  ${rowTarget('.row', T('container-height'))}

  /* The columns — mark, leading icon, the text, the shortcut or trailing text, trailing icon — each a gap apart. Every
     column is centered on the label's FIRST line (a wrapping label keeps its check and icon beside its first line):
     --_first is the height of that line's box, the taller of the label's line and the glyphs, and each column is moved
     down by half of what it is shorter than that. They carry the label's style, so 1lh is the label's line. */
  .content {
    --_first: max(1lh, ${t('mark-size')}, ${t('leading-icon-size')}, ${t('trailing-icon-size')});
    display: flex;
    flex: 1 1 auto;
    align-items: flex-start;
    gap: ${t('container-gap')};
    min-inline-size: 0;
    font: ${t('label-typescale-font')};
    letter-spacing: ${t('label-typescale-letter-spacing')};
  }
  .column {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
  }
  .column.mark {
    position: relative;
    inline-size: ${t('mark-size')};
    block-size: ${t('mark-size')};
    margin-block-start: calc((var(--_first) - ${t('mark-size')}) / 2);
  }
  .column.leading {
    margin-block-start: calc((var(--_first) - ${t('leading-icon-size')}) / 2);
  }
  .column.trailing-icon-column {
    margin-block-start: calc((var(--_first) - ${t('trailing-icon-size')}) / 2);
  }
  .column.trailing {
    min-block-size: 1lh;
    margin-block-start: calc((var(--_first) - 1lh) / 2);
  }
  /* The leading icon's column keeps its width in an item without one, so that labels align; the trailing icon's too, so
     that a row with a shortcut and a row with the submenu indicator align (MNU-19, MNU-42). */
  .leading-icon.empty,
  .trailing-icon.empty {
    visibility: hidden;
  }
  /* The reserved trailing column keeps its width only: it gives the row no height, so a row without a trailing icon is
     laid out as it is in a surface that has none. */
  .trailing-icon-column.reserved {
    block-size: 0;
    margin-block-start: 0;
    overflow: hidden;
  }

  /* MNU-20: the label and the supporting text below it take the remaining width and wrap, in their own roles. */
  .text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-inline-size: 0;
    padding-block-start: calc((var(--_first) - 1lh) / 2);
  }
  .label,
  .supporting,
  .trailing-text {
    overflow-wrap: break-word;
  }
  .supporting {
    font: ${t('supporting-text-typescale-font')};
    letter-spacing: ${t('supporting-text-typescale-letter-spacing')};
  }
  .trailing-text {
    font: ${t('trailing-text-typescale-font')};
    letter-spacing: ${t('trailing-text-typescale-letter-spacing')};
  }
  /* MNU-34: each text is its own run, in the direction of its first strong character, so a left-to-right name or a number
     with its unit keeps its order in a right-to-left menu; the label and the supporting text are still aligned to the
     layout's start edge, and the trailing text, as wide as itself, stays where its column is
     (src/styles/product-text.ts). */
  ${productText(':is(.label, .supporting)', { align: 'start' })}
  ${productText('.trailing-text')}
  /* MNU-31, KBS-13: the shortcut is hosted — its legends and separators inherit the trailing text's role and the
     trailing-text color of the condition and state (painted above); its caps keep the keyboard shortcut's own tokens. */
  .shortcut {
    font: ${t('trailing-text-typescale-font')};
    letter-spacing: ${t('trailing-text-typescale-letter-spacing')};
  }

  /* MNU-22: a glyph mark — the icon set's check, or the glyph a mark-icon names — in the mark color of the condition,
     faded in and out over the state motion — never moved or scaled — and at once where motion is reduced. While the item
     is not checked nothing is drawn in its place: it is hidden once it has faded. Unlike the painted parts it keeps its
     fade while the row is pressed: a Space checks the item during its press-hold. MNU-30: until the icon set can draw the
     glyph (GlyphDrawnController sets data-drawn) nothing is drawn in its place either — never its name — and once it can
     the glyph appears without the fade. */
  .check {
    color: var(--_m);
    opacity: 0;
    visibility: hidden;
    transition:
      opacity ${t('motion-state-duration')} ${t('motion-state-easing')},
      visibility ${t('motion-state-duration')} ${t('motion-state-easing')},
      color ${t('motion-state-duration')} ${t('motion-state-easing')},
      font-variation-settings ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  .row.checked .check {
    opacity: 1;
  }
  .row.checked .check[data-drawn] {
    visibility: visible;
  }
  .check:not([data-drawn]) {
    transition: none;
  }
  /* The ink is the glyph's name, at its own width, which GlyphDrawnController compares with the glyph box. */
  .check-ink,
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  /* MNU-30, MNU-42: the submenu indicator likewise — nothing in its place until the icon set can draw it. */
  .submenu-indicator:not([data-drawn]),
  .link-mark:not([data-drawn]) {
    visibility: hidden;
  }

  /* MNU-38: which mark the design system chooses for a kind of item — the control look (the first value, and what an
     unknown name draws) or the icon set's check. The column holds both; the cascade answers which is drawn: a style
     query on the choice token, and data-mark, written by the item, where a browser has no style queries. A glyph the
     item or its group names is the only thing in the column. */
  .mark > .check.system {
    display: none;
  }
  ${unsafeCSS(
    (['checkbox', 'radio'] as const)
      .map((kind) => {
        const rules = (mark: string) => `
  ${mark} > .control {
    display: none;
  }
  ${mark} > .check.system {
    display: inline-block;
  }`;
        return `@container style(${PREFIX}-${kind}-item-mark: check) {${rules(`.mark.${kind}`)}
  }${rules(`.mark.${kind}[data-mark='check']`)}`;
      })
      .join('\n  '),
  )}

  /* MNU-39: the checkbox look — a box of control.box.size in both conditions, its outline inside its edge in the control
     color; checked, filled in the same color (outline and fill one shape: the fill ends where the outline begins) with
     the icon set's check centered on it at control.mark.size, not clipped by the box, in the control-mark color. No
     round state layer behind it: the row is the item's container. MNU-41: outline, fill and check change over the state
     motion; the box never moves or resizes. */
  .control {
    flex: none;
    pointer-events: none;
  }
  .box {
    --_fill: transparent;
    --_check-inset: calc((${t('control-box-size')} - ${t('control-mark-size')}) / 2);
    position: relative;
    box-sizing: border-box;
    inline-size: ${t('control-box-size')};
    block-size: ${t('control-box-size')};
    padding: ${t('control-outline-width')};
    ${unsafeCSS(cornerRadius('--tanrei-comp-menu-control-box-shape'))}
    background: var(--_fill) content-box;
    box-shadow: inset 0 0 0 ${t('control-outline-width')} var(--_k);
    transition:
      background-color ${t('motion-state-duration')} ${t('motion-state-easing')},
      box-shadow ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  .row.checked .box {
    --_fill: var(--_k);
  }
  .check.box-check {
    --tanrei-icon-size: ${t('control-mark-size')};
    position: absolute;
    inset-block-start: var(--_check-inset);
    inset-inline-start: var(--_check-inset);
    color: var(--_km);
  }

  /* MNU-40: the radio look — a ring of outer diameter control.ring.size in both conditions, stroked inward: at
     control.ring.width while the item is not checked; checked, at control.ring.selected-width-share of its radius (or
     control.ring.width where that is wider), and what the ring leaves inside it, less control.fill.inset all round,
     filled in the same color at control.fill.opacity (never under the ring; an inset that leaves nothing draws
     nothing). No dot and no round state layer. MNU-41: the stroke grows and thins inward, and the fill follows its
     inner edge, over the state motion. fill.inset is a margin, not a calc() term: a zero length may arrive unitless. */
  .mark {
    --_stroke: ${t('control-ring-width')};
  }
  .row.checked .mark {
    --_stroke: max(${t('control-ring-width')}, calc(${t('control-ring-selected-width-share')} * ${t('control-ring-size')} / 2));
  }
  .ring {
    position: relative;
    box-sizing: border-box;
    inline-size: ${t('control-ring-size')};
    block-size: ${t('control-ring-size')};
    --tanrei-corner-radius: calc(${t('control-ring-size')} / 2);
    --tanrei-corner-pill: 1;
    box-shadow: inset 0 0 0 var(--_stroke) var(--_k);
    transition: box-shadow ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  .fill {
    position: absolute;
    inset: var(--_stroke);
    margin: ${t('control-fill-inset')};
    border-radius: inherit;
    corner-shape: inherit;
    background-color: transparent;
    transition:
      inset ${t('motion-state-duration')} ${t('motion-state-easing')},
      background-color ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  .row.checked .fill {
    background-color: color-mix(in srgb, var(--_k) calc(${t('control-fill-opacity')} * 100%), transparent);
  }
  @media (prefers-reduced-motion: reduce) {
    .check,
    .box,
    .ring,
    .fill {
      transition: none;
    }
  }

  /* MNU-11, MNU-17: the ring (or the glow) inside the row, which the surface would otherwise clip, never animated, for
     keyboard focus only — not for focus the pointer moved there (MNU-8). */
  ${focusRing((focus) => `:host(${focus}) .row:where(:not(.pf))`, { inside: true })}
  /* MNU-53: a link item's focus is its row's — the anchor — and is drawn the same. */
  ${focusRing((focus) => `.row.p${focus}:where(:not(.pf))`, { inside: true })}

  /* MNU-17: corner smoothing on the row (data-tanrei-shape). */
  ${shape}

  /* MNU-15: the text column carries press-hold for PressController; it has no transition of its own. */
  ${pressHold('.text')}

  @media (forced-colors: active) {
    /* MNU-53: the mode draws everything inside a link in the person's own link color, whatever a stylesheet says; a
       link item's content is left to it, as a link's is everywhere in the mode. A disabled link item has no address,
       so it is no link to the mode and reads as disabled like any row. */
    /* MNU-13: the painted parts name their own colors, so each is given the mode's disabled color itself — the row's
       would not reach them. */
    .row.p.d,
    .row.p.d :where(.label, .supporting, .trailing-text, .shortcut, .leading-icon, .trailing-icon) {
      color: GrayText;
    }
    /* MNU-58: the mode removes the fill that marks the current link item, so a line of sys.border.thick inside its row,
       in the person's link color, marks it instead (::before: the focus ring is the row's ::after). */
    .row.current::before {
      content: '';
      position: absolute;
      inset: 0;
      border: var(--tanrei-sys-border-thick) solid LinkText;
      border-radius: inherit;
      pointer-events: none;
    }
    /* The box and the ring are drawn in system colors of their own (the mode would drop a box-shadow): the filled box
       and the ring's weight carry the choice, as they do in every mode; the ring's fill, which never carries it, is not
       drawn. */
    .box {
      forced-color-adjust: none;
      padding: 0;
      border: ${t('control-outline-width')} solid CanvasText;
      background: Canvas;
      box-shadow: none;
    }
    .row.checked .box {
      border-color: Highlight;
      background: Highlight;
    }
    .check.box-check {
      inset-block-start: calc(var(--_check-inset) - ${t('control-outline-width')});
      inset-inline-start: calc(var(--_check-inset) - ${t('control-outline-width')});
      color: HighlightText;
    }
    .ring {
      forced-color-adjust: none;
      box-shadow: inset 0 0 0 var(--_stroke) CanvasText;
    }
    .row.checked .ring {
      box-shadow: inset 0 0 0 var(--_stroke) Highlight;
    }
    .row.p.d .box {
      border-color: GrayText;
    }
    .row.p.d.checked .box {
      background: GrayText;
    }
    .row.p.d .ring {
      box-shadow: inset 0 0 0 var(--_stroke) GrayText;
    }
    .fill {
      background-color: transparent;
    }
  }
`;
