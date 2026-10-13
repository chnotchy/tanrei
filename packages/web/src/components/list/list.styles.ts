import { css, unsafeCSS } from 'lit';
import { focusRing, iconGlyph, itemRowStyles, keptLength, pressHold, rowTarget } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/list.tokens.json). An item's two conditions, unselected and selected, are
// its state variants: each colors the row and every part in every state, and the item only says which
// condition and which state's tokens are drawn — never how a state looks. Hover, focus and press show on the row (the
// container): in the default system a mix with each condition's `state-layer.color`, in cupertino a dim.
const PREFIX = '--tanrei-comp-list';
const T = (name: string) => `var(${PREFIX}-${name})`;

/** The parts each condition colors in every state (private key → token part). */
const PARTS = {
  c: 'container-color',
  h: 'headline-color',
  o: 'overline-color',
  s: 'supporting-text-color',
  t: 'trailing-text-color',
  li: 'leading-icon-color',
  ti: 'trailing-icon-color',
  m: 'mark-color',
} as const;

/**
 * Where each state is read (LST-3): an item answers states only while it is an action or an option (`.p`). An
 * interactive item's row is its own button, so its focus is the row's; an option's semantics and focus are its host's.
 * Every selector has the same specificity, so the order `stateRules()` writes them in is the precedence.
 */
const on = (state: string) => {
  if (state === ':focus-visible') return '.row.p:focus-visible, :host(:focus-visible) .row';
  if (state === ':disabled') return '.row.p.d';
  return `.row.p${state}`;
};

/** The list itself: a column that draws nothing and adds no space around its items. */
export const listStyles = css`
  :host {
    display: block;
  }
  /* LST-42: what is announced is drawn nowhere; its box is placed in a box of the list's own that takes no room, so
     that no scrolling ancestor is widened by it. */
  .quiet {
    position: relative;
    display: block;
    block-size: 0;
  }
  /* LST-41, LST-43: it also carries the time and the curve of the reorder motion as the cascade computes them, for the
     script that moves the items and waits for the product's order (a duration token is an expression: it is computed
     through a real property, here one that moves nothing). */
  .announcer {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
    transition-property: none;
    transition-duration: ${unsafeCSS(T('motion-reorder-duration'))};
    transition-timing-function: ${unsafeCSS(T('motion-reorder-easing'))};
  }
`;

export const itemStyles = css`
  :host {
    display: block;
    position: relative;
    /* LST-4: the ring is drawn inside the row, never around the host. */
    outline: none;
  }

  /* LST-19: the glyphs, at their sizes, in the family and fill of the item's condition. LST-29: iconGlyph() mirrors the
     glyph GlyphMirrorController marked, in right-to-left, in its own box. */
  ${iconGlyph('.leading-icon', { size: '--tanrei-comp-list-leading-icon-size', selected: '.row.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  ${iconGlyph('.trailing-icon', { size: '--tanrei-comp-list-trailing-icon-size', selected: '.row.selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}

  /* LST-3, LST-6, LST-8, LST-9, LST-25, LST-26: the conditions, the states and their precedence, the paints, the ripple
     and the state motion (src/primitives/item-row.ts). */
  ${itemRowStyles({
    prefix: PREFIX,
    parts: PARTS,
    conditions: { unselected: '.row', selected: '.row.selected' },
    on,
    paints: { '.overline': 'o', '.headline': 'h', '.supporting': 's', '.trailing-text': 't', '.leading-icon': 'li', '.trailing-icon': 'ti' },
  })}

  /* LST-16, LST-17: one row — the padding at each end (logical, so RTL mirrors), the gap between its elements, the minimum
     height of its lines, its content padded above and below; it grows with its content, never clipping it. The leading
     and trailing elements are centered on the text column in a one- or two-line item, aligned with its top in a taller one. */
  .row {
    --_height: ${unsafeCSS(T('container-height-one-line'))};
    display: flex;
    align-items: center;
    gap: ${unsafeCSS(T('container-gap'))};
    min-block-size: var(--_height);
    padding-block: ${unsafeCSS(T('container-padding-block'))};
    padding-inline: ${unsafeCSS(T('container-padding-inline-start'))} ${unsafeCSS(T('container-padding-inline-end'))};
  }
  .row.lines-2 {
    --_height: ${unsafeCSS(T('container-height-two-line'))};
  }
  .row.lines-3 {
    --_height: ${unsafeCSS(T('container-height-three-line'))};
    align-items: flex-start;
  }
  /* LST-31: a link item's row is an anchor, and it is the row and nothing of a text link — no underline, and each text
     in the color of its part (itemRowStyles), never the browser's link or visited color. */
  a.row {
    color: inherit;
    text-decoration: none;
  }
  /* LST-5: an action or an option is at least the minimum target tall. */
  ${rowTarget('.row.p', 'var(--_height)')}

  /* LST-18: the text column takes the remaining width; its texts wrap rather than truncate, in their own roles. */
  .text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-inline-size: 0;
  }
  .overline,
  .headline,
  .supporting,
  .trailing-text {
    overflow-wrap: break-word;
  }
  .overline {
    font: ${unsafeCSS(T('overline-typescale-font'))};
    letter-spacing: ${unsafeCSS(T('overline-typescale-letter-spacing'))};
  }
  .headline {
    font: ${unsafeCSS(T('headline-typescale-font'))};
    letter-spacing: ${unsafeCSS(T('headline-typescale-letter-spacing'))};
  }
  .supporting {
    font: ${unsafeCSS(T('supporting-text-typescale-font'))};
    letter-spacing: ${unsafeCSS(T('supporting-text-typescale-letter-spacing'))};
  }
  /* supportingMaxLines: an ellipsis after that many lines (the full text is still the item's description). */
  .supporting.clamped {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--_max-lines);
    overflow: hidden;
  }
  .trailing-text {
    flex: 0 1 auto;
    font: ${unsafeCSS(T('trailing-text-typescale-font'))};
    letter-spacing: ${unsafeCSS(T('trailing-text-typescale-letter-spacing'))};
  }
  /* LST-16, LST-37: the controls of an item of a reorderable list, after the trailing icon — the two move buttons, the
     one that moves up first in reading order (in a right-to-left layout the row runs the other way, so it is at the
     right of the other), then the product's control of the trailing slot — container.gap apart, centred as LST-17
     places a trailing element. Each move button is a Button — its own tokens, press answer, target, states and focus
     ring — which the list only places. */
  .controls {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${unsafeCSS(T('container-gap'))};
  }
  .moves {
    display: flex;
    flex: none;
    align-items: center;
  }
  .move {
    flex: none;
  }
  /* LST-37: the two stand move-buttons.gap apart, or as much further as each needs to keep the touch target's length
     along the row that the other's does not reach into (src/primitives/kept-length.ts; the item measures them). */
  ${keptLength('.move', { gap: `var(${PREFIX}-move-buttons-gap)` })}
  /* Until the icon set can draw a glyph nothing stands in its place — never its name — and its box is kept. */
  .move-glyph {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
  }
  .move-glyph:not([data-drawn]) {
    visibility: hidden;
  }
  /* LST-51: where the controls would leave the text narrower than reorder.text-min-width (the list measures, and says
     so for every item at once), they stand on a line of their own below the text column, at the row's end and in the same order,
     container.padding-block below the text; the row grows with them. The text column takes what the first line has
     left, and wraps there. */
  /* The least width of the text column, computed by a property that draws nothing on a row that does not scroll —
     the script reads it back as a length, grown with the text. */
  .row {
    scroll-padding-top: ${unsafeCSS(T('reorder-text-min-width'))};
  }
  .row.stacked {
    flex-wrap: wrap;
    row-gap: ${unsafeCSS(T('container-padding-block'))};
  }
  .row.stacked .text {
    flex-basis: 0;
  }
  /* Where even that line is too short for them (320 wide at 200% text, with a trailing control), the trailing control
     goes to a line of its own below the move buttons, at the row's end as well: nothing reaches into the padding. */
  .row.stacked .controls {
    flex-basis: 100%;
    flex-wrap: wrap;
    justify-content: flex-end;
    row-gap: ${unsafeCSS(T('container-padding-block'))};
    min-inline-size: 0;
  }

  /* LST-30: each text is its own run, in the direction of its first strong character — a left-to-right name keeps its
     order in a right-to-left list and is cut (supportingMaxLines) at its own end — and is still aligned by the layout:
     the column to the start edge, the trailing text to the end edge (src/styles/product-text.ts). */
  ${productText(':is(.overline, .headline, .supporting)', { align: 'start' })}
  /* A supporting text limited by supportingMaxLines is aligned by its own direction instead: Chromium draws a line
     clamp's ellipsis past the box (and clips it, with the last letter) on a left-to-right line that is aligned to the
     right, so a left-to-right text in a right-to-left list keeps its ellipsis and starts at its own left. And its box
     takes the text's direction (the item gives it dir="auto", ownDirection()): WebKit and Firefox place a clamp's
     ellipsis by the box's direction, and cut a text of the other direction at its beginning. */
  .text .supporting.clamped {
    text-align: start;
  }
  ${productText('.trailing-text')}
  /* The layout's end edge, written physically: under plaintext, end would be the end of the text's own direction. */
  .trailing-text {
    text-align: right;
  }
  .trailing-text:dir(rtl) {
    text-align: left;
  }

  /* LST-20: the avatar (a round box) or the image (a rounded square), filled behind its content and handing it the media
     content color; a monogram is set in the headline's style, centred. The whole item's opacity reaches it. */
  .media {
    display: grid;
    flex: none;
    place-items: center;
    position: relative;
    overflow: hidden;
    background: ${unsafeCSS(T('media-container-color'))};
    color: ${unsafeCSS(T('media-content-color'))};
    font: ${unsafeCSS(T('headline-typescale-font'))};
    letter-spacing: ${unsafeCSS(T('headline-typescale-letter-spacing'))};
    text-align: center;
  }
  .media.avatar {
    inline-size: ${unsafeCSS(T('avatar-size'))};
    block-size: ${unsafeCSS(T('avatar-size'))};
    ${unsafeCSS(cornerRadius('--tanrei-comp-list-avatar-shape'))}
  }
  .media.image {
    inline-size: ${unsafeCSS(T('image-size'))};
    block-size: ${unsafeCSS(T('image-size'))};
    ${unsafeCSS(cornerRadius('--tanrei-comp-list-image-shape'))}
  }
  .media ::slotted(img),
  .media ::slotted(picture),
  .media ::slotted(video),
  .media ::slotted(svg) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  /* LST-21: the check's box is reserved at the end of every option, so the texts line up. The check is the icon set's
     \`check\` glyph, always in the selected family and fill, in the mark color of the condition, never mirrored (the icon
     helper draws it left to right); it fades in or out over the state motion, never moved or scaled, and at once where
     motion is reduced. */
  ${iconGlyph('.mark', { size: '--tanrei-comp-list-mark-size', selected: '.row', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .mark {
    color: var(--_m);
    opacity: 0;
    /* LST-27: nothing in the glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn); the
       box keeps its size meanwhile. */
    visibility: hidden;
    transition:
      opacity ${unsafeCSS(T('motion-state-duration'))} ${unsafeCSS(T('motion-state-easing'))},
      color ${unsafeCSS(T('motion-state-duration'))} ${unsafeCSS(T('motion-state-easing'))},
      font-variation-settings ${unsafeCSS(T('motion-state-duration'))} ${unsafeCSS(T('motion-state-easing'))};
  }
  .row.selected .mark {
    opacity: 1;
  }
  .mark[data-drawn] {
    visibility: visible;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  @media (prefers-reduced-motion: reduce) {
    .mark {
      transition: none;
    }
  }

  /* LST-22: a hairline along the bottom edge, inside the item's height, from the start of the text column to the row's
     end. It is the row's sibling, so it keeps its color and its full opacity in every state and condition. */
  .divider {
    --_lead: 0px;
    position: absolute;
    inset-block-end: 0;
    inset-inline-start: calc(${unsafeCSS(T('container-padding-inline-start'))} + var(--_lead));
    inset-inline-end: 0;
    block-size: ${unsafeCSS(T('divider-thickness'))};
    background: ${unsafeCSS(T('divider-color'))};
    pointer-events: none;
  }
  .divider.lead-icon {
    --_lead: calc(${unsafeCSS(T('leading-icon-size'))} + ${unsafeCSS(T('container-gap'))});
  }
  .divider.lead-avatar {
    --_lead: calc(${unsafeCSS(T('avatar-size'))} + ${unsafeCSS(T('container-gap'))});
  }
  .divider.lead-image {
    --_lead: calc(${unsafeCSS(T('image-size'))} + ${unsafeCSS(T('container-gap'))});
  }

  /* LST-4, LST-10: the ring (or the glow) inside the row — a scrolling ancestor cannot clip it — never animated, for
     keyboard focus only: on the row of an interactive item, or on the host of an option. */
  ${focusRing((focus) => `.row.p${focus}`, { inside: true })}
  ${focusRing((focus) => `:host(${focus}) .row`, { inside: true })}

  /* LST-10: corner smoothing on the row and the media boxes (data-tanrei-shape). */
  ${shape}

  /* LST-8: the text column carries press-hold for PressController; it has no transition of its own. */
  ${pressHold('.text')}

  @media (forced-colors: active) {
    .row.p.d {
      color: GrayText;
    }
    .divider {
      background: CanvasText;
    }
  }
`;
