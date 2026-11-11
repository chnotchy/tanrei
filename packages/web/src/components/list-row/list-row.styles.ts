import { css, unsafeCSS } from 'lit';
import type { OpenAxis } from '../../primitives/index.js';
import { iconGlyph } from '../../primitives/index.js';

// Every visual value is a token (tokens/comp/list-row.tokens.json). A row has no state of its own: what changes what it
// draws is its size, its number of lines (LRW-3) and what the list item it is in tells it (LRW-8, LRW-9).
/** The sizes every design system has. A layer may add more; those get their rules on demand (LRW-14). */
export const CORE_SIZES = ['small', 'medium'] as const;
const DEFAULT_SIZE = 'medium';

const PREFIX = '--tanrei-comp-list-row';
const T = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (member: string, size: string, fallback: string | null) =>
  fallback ? `var(${PREFIX}-${member}-${size}, var(${PREFIX}-${member}-${fallback}))` : `var(${PREFIX}-${member}-${size})`;

/**
 * Per size (LRW-1, LRW-3): the least height of one, two and three lines, and the space above and below the text.
 * Written on the row's box, under the custom state that carries the size it draws (LRW-17): its own, or the one its
 * nearest container sets.
 */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) => `${selector} {
  --_h1: ${ref('container-height-one-line', size, fallback)};
  --_h2: ${ref('container-height-two-line', size, fallback)};
  --_h3: ${ref('container-height-three-line', size, fallback)};
  --_pb: ${ref('container-padding-block', size, fallback)};
}`;
/** LRW-17: the selector of the size the row draws (`size-<name>`, a custom state the row sets). */
const drawnAt = (size: string) => `:host(:state(size-${size})) .row`;

/** LRW-14: a size a layer added gets its block on demand, falling back to the default's tokens. */
export const AXES: readonly OpenAxis[] = [
  {
    name: 'size',
    core: CORE_SIZES,
    default: DEFAULT_SIZE,
    rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE),
    probe: (value) => `${PREFIX}-container-padding-block-${value}` as const,
    // LRW-17: the size it draws — its own, else the one its nearest container sets — carried by a custom state.
    drawn: { read: (host) => String((host as HTMLElement & { drawnSize: string }).drawnSize ?? ''), selector: drawnAt },
  },
];

/** A text role used whole: the font shorthand and its tracking. */
const role = (part: string) => unsafeCSS(`font: var(${PREFIX}-${part}-typescale-font);\n    letter-spacing: var(${PREFIX}-${part}-typescale-letter-spacing);`);

export const styles = css`
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, '.row'))}
  ${unsafeCSS(
    CORE_SIZES.filter((size) => size !== DEFAULT_SIZE)
      .map((size) => sizeBlock(size, drawnAt(size)))
      .join('\n'),
  )}

  /* LRW-1: a block as wide as its layout gives it; inside a box that sizes it to its content, as wide as its parts. */
  :host {
    display: block;
    min-inline-size: 0;
    box-sizing: border-box;
  }
  :host([hidden]) {
    display: none;
  }

  /* LRW-1, LRW-3: the row's box — its paddings and its least height by its lines; the parts centred in the height it
     has. LRW-8: inside an action, a link or an option the item's paddings are the row's, and the row keeps its height
     less the item's own padding above and below. It draws no fill, edge or state, and sets no color of its own: the
     color it inherits is what a selected option hands it (LRW-9). */
  .row {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    --_h: var(--_h1);
    min-block-size: var(--_h);
    padding-block: var(--_pb);
    padding-inline: ${T('container-padding-inline-start')} ${T('container-padding-inline-end')};
  }
  .row.two {
    --_h: var(--_h2);
  }
  .row.three {
    --_h: var(--_h3);
  }
  /* LST-48: after the handle of a reorderable list the item's gap is the space before the row's first part. */
  .row.handled {
    padding-inline-start: 0;
  }
  /* LRW-8: the padding the item draws is the one of the size its list draws, which the list sets on its host for its
     items (LST-51) and which reaches the row through them. */
  .row.boxed {
    padding: 0;
    min-block-size: calc(var(--_h) - 2 * var(--_lst-padding-block, var(--tanrei-comp-list-container-padding-block-medium)));
  }

  /* LRW-1: leading, text, trailing text, trailing slot, trailing glyph, the gap apart; an absent part takes no room.
     LRW-3: centred on the text while one or two lines, at the top of the text while three. */
  .parts {
    display: flex;
    align-items: center;
    gap: ${T('container-gap')};
    min-inline-size: 0;
  }
  .row.three .parts {
    align-items: flex-start;
  }
  .leading,
  .trailing {
    display: flex;
    flex: none;
    align-items: center;
  }
  .leading:not(.has),
  .trailing:not(.has) {
    display: none;
  }
  /* LRW-16: the room of a leading glyph the row does not draw, kept where the List asks for it (LST-50): the glyph's
     box, drawing nothing, the parts' gap after it. */
  .leading-room {
    flex: none;
    inline-size: ${T('leading-icon-size')};
    block-size: ${T('leading-icon-size')};
  }

  /* LRW-2: the text takes the width that is left; its lines follow one another with no space between them. */
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
    display: block;
    min-inline-size: 0;
    overflow: hidden;
    text-align: start;
  }
  /* LRW-2: the overline and the headline are one line each, cut with an ellipsis. */
  .overline,
  .headline,
  .trailing-text {
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .overline {
    ${role('overline')}
    color: ${T('overline-color')};
  }
  .headline {
    ${role('headline')}
    color: ${T('headline-color')};
  }
  /* LRW-2: the supporting text wraps at its spaces onto as many lines as supportingLines says, and is cut with an
     ellipsis at the end of the last. */
  .supporting {
    ${role('supporting-text')}
    color: ${T('supporting-text-color')};
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--_lines, 1);
    line-clamp: var(--_lines, 1);
    overflow-wrap: anywhere;
  }
  /* LRW-6: the trailing text on one line, never more than half of the row's inner width, cut beyond it. */
  .trailing-text {
    flex: none;
    max-inline-size: 50%;
    ${role('trailing-text')}
    color: ${T('trailing-text-color')};
  }
  /* LRW-12: each text in its own direction, isolated from the text around it, placed and aligned by the layout's. */
  bdi {
    unicode-bidi: isolate;
  }

  /* LRW-4, LRW-6: the glyphs of the system's icon set, decorative, drawn once the icon set can draw them. */
  ${iconGlyph('.leading-icon', { size: `${PREFIX}-leading-icon-size`, selected: ':not(*)' })}
  ${iconGlyph('.trailing-icon', { size: `${PREFIX}-trailing-icon-size`, selected: ':not(*)' })}
  .leading-icon {
    color: ${T('leading-icon-color')};
  }
  .trailing-icon {
    flex: none;
    color: ${T('trailing-icon-color')};
  }
  .leading-icon:not([data-drawn]),
  .trailing-icon:not([data-drawn]) {
    visibility: hidden;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* LRW-9: in a selected option every text and glyph is the content color the item hands its content. */
  .row.selected :is(.overline, .headline, .supporting, .trailing-text, .leading-icon, .trailing-icon) {
    color: inherit;
  }

  /* LRW-7: the tooltip of a cut headline or supporting text stands over the text; a press reaches the row under it, and
     the tooltip's own box takes the pointer, so that it can be hovered. Its waits are read through a transition that
     moves nothing (a duration token is an expression). */
  .text {
    position: relative;
  }
  .cut-tip {
    position: absolute;
    inset: 0;
    display: block;
    pointer-events: none;
  }
  .cut-tip::part(container) {
    pointer-events: auto;
  }
  .tip-clock {
    display: none;
    transition-property: none;
    transition-delay: var(--tanrei-comp-tooltip-motion-show-delay);
    transition-duration: var(--tanrei-comp-tooltip-motion-hide-delay);
  }

  /* LRW-15: in forced colors the texts and glyphs are the system's text color, and its disabled color in a disabled item. */
  @media (forced-colors: active) {
    .row :is(.overline, .headline, .supporting, .trailing-text, .leading-icon, .trailing-icon) {
      color: CanvasText;
    }
    .row.disabled :is(.overline, .headline, .supporting, .trailing-text, .leading-icon, .trailing-icon) {
      color: GrayText;
    }
  }
`;
