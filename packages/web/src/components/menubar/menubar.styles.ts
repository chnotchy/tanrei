import { type CSSResult, css, unsafeCSS } from 'lit';
import { conditionBlock, conditionStates, focusRing, iconGlyph, pressHold, rippleStyles } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/menubar.tokens.json): the bar's fill, paddings and gap; a title's height,
// padding, corners and text style; the size of the overflow item's glyph and of a link item's mark, and the gap between
// that mark and its label, and the size of the indicator a menu's title ends in while the bar mixes menus with bar items;
// a title's three conditions — unselected, selected (the current link item) and expanded while its menu is open — which
// are its state variants, each coloring the container, the label and the glyph in every state; and the motion of a state
// change and of the press. The surfaces the titles open are
// Menus, drawn from comp.menu.* by the menu itself: nothing here restyles them.
const PREFIX = '--tanrei-comp-menubar';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The parts each condition colors in every state: the container, the label, the overflow item's glyph. */
const PARTS = { c: 'container-color', l: 'label-color', i: 'icon-color' } as const;

/** MBR-17: the minimum target of the pointer in use — sys.target.pointer, and sys.target.touch where it is coarse. */
const TARGET = 'var(--_target)';

/**
 * A title (MBR-2 … MBR-8, MBR-17, MBR-28, MBR-29) — a menu's, the overflow item's, and the copies the bar measures —
 * as three boxes:
 *
 *   .title      the room the title takes in the row and everything of it that answers a pointer: at least the minimum
 *               target long, and by its `::before` as tall as the target and half the gap further toward each
 *               neighbour, so that two hit areas meet in the middle of the gap and never overlap (MBR-17)
 *   .container  what is drawn and what carries the states: the title's height, paddings and corners, centred in .title
 *   .content    the label, or the overflow item's glyph; a bar item's label and, for a link item that opens a new
 *               context, the mark after it (MBR-37)
 *
 * A bar item (MBR-32) is a title in all of this: the same three boxes, the same rules, always unselected. Its link
 * form is the product's own anchor, slotted into `.label` (`itemStyles` below gives the anchor the title's box).
 *
 * `focused` names where keyboard focus is read, given the condition: the element that takes the title's focus is the
 * menu's host, and for the overflow item its own box in the bar's shadow root. Every state selector has the same
 * specificity, so the order `stateRules()` writes them in is the precedence (MBR-4).
 */
export function titleStyles(focused: (focus: string) => string): CSSResult {
  const on = (state: string) => {
    // MBR-4: focus the pointer gave (`.pf`) is not the focused state.
    if (state.endsWith(':focus-visible')) return `${focused(state)} .title:where(:not(.pf)) > .container`;
    if (state === ':disabled') return '.title.p.d > .container';
    if (state === ':hover') return '.title.p:hover > .container';
    return `.title.p > .container${state}`;
  };
  const motion = `${T('motion-state-duration')} ${T('motion-state-easing')}`;
  return unsafeCSS(`
  .title {
    --_target: var(--tanrei-sys-target-pointer);
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    /* MBR-17: a title narrower than the target keeps the target's length in the row, so its neighbours stand apart. */
    min-inline-size: ${TARGET};
    -webkit-tap-highlight-color: transparent;
  }
  .title.p {
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }
  .title.p.d {
    cursor: default;
  }
  @media (pointer: coarse) {
    .title {
      --_target: var(--tanrei-sys-target-touch);
    }
  }
  /* MBR-17: the hit area — the target's height, centred, and half the gap toward each neighbour. */
  .title.p::before {
    content: '';
    position: absolute;
    inset-block-start: 50%;
    inset-inline: calc(${T('bar-gap')} / -2);
    block-size: max(100%, ${TARGET});
    transform: translateY(-50%);
  }

  ${conditionBlock(PREFIX, 'unselected', PARTS, '.container')}
  ${conditionBlock(PREFIX, 'selected', PARTS, '.title.current > .container')}
  ${conditionBlock(PREFIX, 'expanded', PARTS, '.title.expanded > .container')}

  /* MBR-2, MBR-3: at least container.height tall, as wide as its label and the padding on each side, its corners the
     state's shape eased by the smoothing, the fill of its condition over the bar. MBR-27: the height is a minimum. */
  .container {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the content. */
    isolation: isolate;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    min-block-size: ${T('container-height')};
    padding-inline: ${T('container-padding-inline')};
    ${cornerRadius('--_shape')}
    background: var(--_c);
    transition-property: background-color, opacity, border-radius;
    transition-duration: ${T('motion-state-duration')};
    transition-timing-function: ${T('motion-state-easing')};
  }
  /* MBR-21: the overflow item's container is at least as wide as it is tall, around the glyph alone. */
  .container.glyph {
    min-inline-size: ${T('container-height')};
    padding-inline: 0;
  }
  /* MBR-37: a link item's mark stands container.gap after its label; a title and the overflow item hold one thing. */
  .content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${T('container-gap')};
  }
  /* MBR-2: one line, never wrapped, shrunk or cut. */
  .label {
    font: ${T('label-typescale-font')};
    letter-spacing: ${T('label-typescale-letter-spacing')};
    white-space: nowrap;
    color: var(--_l);
    transition: color ${motion};
  }
  /* MBR-26: the label is text of its own direction, isolated; the title is still placed by the layout's. */
  ${productText('.label')}
  /* MBR-21: the glyph more_horiz, through the icon helper: the unselected family and fill, sys.icon.weight, the optical
     size clamped. MBR-25: mirrored by the helper where the icon set marks its name. */
  ${iconGlyph('.icon', { size: `${PREFIX}-icon-size`, selected: ':not(*)', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .icon {
    color: var(--_i);
    transition:
      color ${motion},
      font-variation-settings ${motion};
  }
  /* The ink is the glyph's name at its own width, which GlyphDrawnController compares with the glyph box: until the icon
     set can draw the glyph nothing is drawn in its place — never its name. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  .icon:not([data-drawn]) {
    visibility: hidden;
  }
  /* MBR-47: while the bar mixes menus with bar items, a menu's title ends in expand_more at indicator.size, container.gap
     after its label (the content's gap), in the condition's icon color; never mirrored, never turned. */
  ${iconGlyph('.indicator', { size: `${PREFIX}-indicator-size`, selected: ':not(*)', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .indicator {
    color: var(--_i);
    transition:
      color ${motion},
      font-variation-settings ${motion};
  }
  .indicator:not([data-drawn]) {
    visibility: hidden;
  }

  /* MBR-4, MBR-6, MBR-7, MBR-18: the states and their precedence — pressed over focused over hovered, disabled over all. */
  ${conditionStates(PREFIX, PARTS, { container: 'c', root: '.container', on })}
  .container[data-pressed]:not([data-pressed='none']) :is(.label, .icon, .indicator) {
    transition-duration: 0s;
  }
  ${pressHold('.content')}
  ${rippleStyles({ color: '--_c-p', grow: `${PREFIX}-motion-feedback-duration`, fade: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* MBR-5, MBR-8: the system's focus indicator around the container, never animated, never for pointer focus. */
  ${focusRing((focus) => `${focused(focus)} .title:where(:not(.pf)) > .container`)}

  /* MBR-29: at once where motion is reduced. */
  @media (prefers-reduced-motion: reduce) {
    .container,
    .label,
    .icon,
    .indicator {
      transition: none;
    }
  }

  /* MBR-28: the person's own colors. The label and the glyph in the button text color, a disabled title in the disabled
     text color; the open title in the highlight colors; a hovered or pressed title by a line of sys.border.hairline
     inside its container's edge — never by a fill the platform may remove. The focus ring is the highlight color. */
  @media (forced-colors: active) {
    .title > .container {
      forced-color-adjust: none;
      background: transparent;
    }
    .title .label,
    .title .icon,
    .title .indicator {
      color: ButtonText;
    }
    .title .ripple {
      display: none;
    }
    .title.p:hover > .container,
    .title.p > .container[data-pressed] {
      box-shadow: inset 0 0 0 var(--tanrei-sys-border-hairline) ButtonText;
    }
    .title.expanded > .container {
      background: Highlight;
    }
    .title.expanded .label,
    .title.expanded .icon,
    .title.expanded .indicator {
      color: HighlightText;
    }
    /* MBR-46: the mode removes the fill of the current link item; a line of sys.border.thick inside its container, in
       the person's link color, marks it instead, under the pointer and the press too. */
    .title.current.p > .container,
    .title.current.p:hover > .container,
    .title.current.p > .container[data-pressed] {
      box-shadow: inset 0 0 0 var(--tanrei-sys-border-thick) LinkText;
    }
    /* MBR-46: a link item's label and mark in the person's link color (a disabled one in the disabled text color, below). */
    .title.link .label,
    .title.link .icon {
      color: LinkText;
    }
    .title.d > .container {
      box-shadow: none;
    }
    .title.d .label,
    .title.d .icon {
      color: GrayText;
    }
    ${focused(':focus-visible')} .title > .container {
      outline-color: Highlight;
    }
  }
`);
}

/**
 * A menu of the bar (MBR-2, MBR-9): its title in the row, and — at no size of its own — the Menu it opens. Folded into
 * the overflow item (MBR-22) it has no box: the submenu item it draws is a row of the overflow item's menu.
 */
export const menuStyles = css`
  :host {
    position: relative;
    display: flex;
    flex: none;
    /* The ring is drawn around the container, never around the host. */
    outline: none;
  }
  :host([hidden]) {
    display: none;
  }
  :host([data-tanrei-folded]) {
    display: contents;
  }
  ${titleStyles((focus) => `:host(${focus})`)}
  /* MBR-9: the menu is a popover in the top layer, placed by script against the container. Drawn in place (the bar's
     inline, for tests), it stands below the title, comp.menu.surface.offset from it, their start edges together. */
  .menu {
    position: absolute;
    inset-block-start: 100%;
    inset-inline-start: 0;
  }
  .menu[inline] {
    margin-block-start: var(--tanrei-comp-menu-surface-offset);
  }
  ${shape}
`;

/** MBR-17: the length a title's hit area has on an axis its container is `100%` long on — the container, or the target where that is longer. */
const REACH = `max(100%, ${TARGET})`;

/**
 * A bar item (MBR-32): a title in the row, drawn by the title's rules; folded (MBR-43), a row of the overflow item's
 * menu that it draws of itself, with no box of its own.
 *
 * Its link form (MBR-35) is the product's own anchor, in the document, slotted into the label. The anchor is drawn as
 * the label is — the title's text style and the color of its state, no underline, no look of its own for a link or for
 * a visited one — and by its `::before` it is given the whole of the title's hit area (MBR-17: the target's height and,
 * on each side, half the gap beyond the room the title keeps), above the mark, so that every press on the title is a
 * press on the link and what a browser gives a link it gives anywhere on it. The focus ring is the container's, as for
 * every title: the anchor draws none. A product's own rule for its anchor wins over these, as over any slotted rule.
 */
export const itemStyles = css`
  :host {
    position: relative;
    display: flex;
    flex: none;
    /* The ring is drawn around the container, never around the host. */
    outline: none;
  }
  :host([data-tanrei-folded]) {
    display: contents;
  }
  /* MBR-8: keyboard focus is the host's for an action; for a link item it is its anchor's, which the element marks on the host. */
  ${titleStyles((focus) => `:host(${focus.replace(':focus-visible', ':is(:focus-visible, [data-tanrei-focus])')})`)}
  ::slotted(a) {
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
    text-decoration: none;
    cursor: inherit;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  ::slotted(a)::before {
    content: '';
    position: absolute;
    z-index: 1;
    inset-block: calc((100% - ${unsafeCSS(REACH)}) / 2);
    inset-inline: calc((100% - ${unsafeCSS(REACH)}) / 2 - ${t('bar-gap')} / 2);
  }
  /* MBR-43, MBR-45: folded, the product's anchor stays in the document and is not displayed. */
  .kept {
    display: none;
  }
  ${shape}
`;

/**
 * The bar (MBR-1, MBR-21): one row across the inline size its parent gives it, the bar's fill behind it, the titles
 * from the start edge a gap apart inside the paddings; the overflow item, a title of the bar's own, at the end of the
 * row; and the copies the fold is measured from.
 */
export const barStyles = css`
  :host {
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
  /* MBR-1: no position, no edge, no elevation. Nothing is clipped: a title's focus ring has room (MBR-5). MBR-21: the
     row gives the bar no inline size of its own — what the bar could be at most, and must be at least, is the copies'
     (below), so that a bar in a place sized by its content is as long as its titles and one that folds does not shrink
     its place with every title it folds. */
  .bar {
    box-sizing: border-box;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: ${t('bar-gap')};
    padding-block: ${t('bar-padding-block')};
    padding-inline: ${t('bar-padding-inline')};
    background: ${t('bar-color')};
    contain: inline-size;
  }
  /* MBR-2, MBR-21: every title keeps its own size. */
  ::slotted(*) {
    flex: none;
  }
  .overflow {
    position: relative;
    display: flex;
    flex: none;
    outline: none;
  }
  ${titleStyles((focus) => `.overflow${focus} >`)}
  .menu {
    position: absolute;
    inset-block-start: 100%;
    inset-inline-start: 0;
  }
  .menu[inline] {
    margin-block-start: var(--tanrei-comp-menu-surface-offset);
  }

  /* MBR-21: what fits is measured from copies of every title, the overflow item and the gap — never drawn, never hit,
     nothing to assistive technology — laid out as the row would be with nothing folded, on lines of their own so that
     the bar is at least as long as its longest title and at most as long as all of them. They take no block size and
     nothing of them shows or scrolls. */
  .ruler {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 0 ${t('bar-gap')};
    block-size: 0;
    padding-inline: ${t('bar-padding-inline')};
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
  }
  .ruler > .apart {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
  }
  .ruler > .gap {
    inline-size: ${t('bar-gap')};
    block-size: 0;
  }

  @media (forced-colors: active) {
    /* MBR-28: no fill for the bar. */
    .bar {
      background: none;
    }
  }
  ${shape}
`;
