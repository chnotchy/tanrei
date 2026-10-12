import { css, unsafeCSS } from 'lit';
import { type OpenAxis, iconGlyph } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { scriptTracking } from '../../styles/script-tracking.js';

// Every visual value is a token (tokens/comp/empty-state.tokens.json). The empty state has no state (EMP-7): what
// changes what it draws is its size and its alignment. It draws no fill, no edge and no elevation (EMP-1), so there is
// no shape, no state layer, no focus indicator and no motion here.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_SIZES = ['medium', 'large'] as const;
const DEFAULT_SIZE = 'medium';
/** EMP-2: where the parts stand. A closed set; anything else is `center` (EMP-17). */
export const ALIGNMENTS = ['center', 'start'] as const;

const PREFIX = '--tanrei-comp-empty-state';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
// A size the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// Per size (the axis' members): the room above and below, the glyph's box, and the title's and the description's text
// roles, each used whole — the font shorthand and the letter spacing.
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {
  --_pad-block: ${ref((v) => `${PREFIX}-container-padding-block-${v}`, size, fallback)};
  --_media-size: ${ref((v) => `${PREFIX}-media-size-${v}`, size, fallback)};
${(['title', 'description'] as const)
  .flatMap((part) => {
    const role = (member: string) => ref((v) => `${PREFIX}-${part}-typescale-${v}-${member}`, size, fallback);
    return [`  --_${part}-font: ${role('font')};`, `  --_${part}-tracking: ${role('letter-spacing')};`];
  })
  .join('\n')}
}`;

/**
 * The open axis (EMP-17): a size a layer added gets its block on demand, built by the same function as the
 * core blocks and falling back to medium's tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-padding-block-${value}` },
];

export const styles = css`
  /* EMP-1: a block that takes the whole inline size of the region it is placed in and is as tall as its content and
     its padding — no outer space, no height of its own, nothing that scrolls. It has no role in the styles and takes
     no input (EMP-7): nothing here answers a pointer, a press or focus. */
  :host {
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
  /* EMP-18: with no title and no description it draws nothing and takes no space. Its own rule: a browser without
     custom states drops only this one, and the empty state is then a block of no height (.container[hidden]). */
  :host(:state(empty)) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}

  /* EMP-1: one column — the media, the title, the description, the actions, those it has — padded above the first and
     below the last by the block padding of its size and at the start and the end by container.padding-inline. No fill,
     no edge, no elevation: it is drawn on the surface of the region whose content is missing.
     EMP-2: centred on the inline axis, its lines centred. (It is positioned for one thing: the live region below is
     laid out inside it, wherever the block stands.) */
  .container {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-block: var(--_pad-block);
    padding-inline: ${t('container-padding-inline')};
    text-align: center;
  }
  .container[hidden] {
    display: none;
  }
  /* EMP-2, EMP-13: at the start edge, inside the inline padding, its lines aligned to the start — the right in a
     right-to-left layout. Any other value of align is the centre (EMP-17). The element says so with a class: HTML
     compares the value of an attribute called align without regard to case, and START is not a value of this one. */
  .container.start {
    align-items: flex-start;
    text-align: start;
  }

  /* EMP-3: the media, first, media.gap above the title. Nothing is drawn where the product gave none. */
  .media {
    flex: none;
    margin-block-end: ${t('media-gap')};
  }
  .container:not(.has-media) .media {
    display: none;
  }
  /* EMP-3: a glyph of the icon set — a box of the media size of its size, in media.color, the icon set's unselected
     family and fill, sys.icon.weight, the optical size of its box, no transition. EMP-15: iconGlyph() mirrors the
     slotted glyph GlyphMirrorController marked, in its own box. */
  ${iconGlyph('.media.glyph', { size: '--_media-size', selected: ':not(*)' })}
  .media.glyph {
    color: ${t('media-color')};
  }
  /* The slot is the glyph's ink for GlyphDrawnController: an inline block as wide as the name it holds. */
  .media.glyph slot {
    display: inline-block;
    vertical-align: top;
  }
  /* Nothing in a glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn): its name is never
     spelled out. The box keeps its size. */
  .media.glyph:not([data-drawn]) {
    visibility: hidden;
  }
  /* EMP-3: a picture or a view of the product's own — at its own size, never wider than the container less its inline
     padding, its proportions kept (a replaced element's height follows its width); not colored, clipped or mirrored. */
  .media.picture {
    display: block;
    max-inline-size: 100%;
  }
  .media.picture ::slotted(*) {
    display: block;
    max-inline-size: 100%;
  }
  .media.picture ::slotted(:is(img, svg, video, canvas)) {
    block-size: auto;
  }

  /* EMP-2: the text — no wider than content.measure times the description's font size (this box carries it, so the
     measure grows with the text: EMP-11), and no wider than the container less its inline padding.
     EMP-5: the description's text style, inherited by what the product placed there, so bare text is styled. */
  .text {
    min-inline-size: 0;
    max-inline-size: min(100%, calc(${t('content-measure')} * 1em));
    font: var(--_description-font);
    letter-spacing: var(--_description-tracking);
  }
  /* EMP-4: the title, in the text style of its size and in title.color; it wraps and is never cut. A heading the
     product gives in the slot is drawn as every other title is: its own margins and text style are taken off, its
     role and its level are untouched. */
  .title {
    font: var(--_title-font);
    letter-spacing: var(--_title-tracking);
    color: ${t('title-color')};
    overflow-wrap: break-word;
  }
  /* EMP-4: the title's letter-spacing follows its script (src/styles/script-tracking.ts); a title the product gives in the slot, by its own language. */
  ${unsafeCSS(scriptTracking('.title', 'var(--_title-tracking)'))}
  .container:not(.titled) .title {
    display: none;
  }
  ::slotted([slot='title']) {
    display: block;
    margin: 0;
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
  }
  /* EMP-4: what the title slot holds. */
  ${unsafeCSS(scriptTracking("slot[name='title']", 'var(--_title-tracking)', { slotted: true }))}
  /* EMP-16: a title given as text is text of its own direction, isolated; its lines are still centred, or — align
     start — aligned by the layout's direction, not by the text's own. */
  ${productText('.headline')}
  ${productText('.start .headline', { align: 'start' })}
  .headline {
    display: block;
  }
  /* EMP-5: the description, title.gap below the title, in description.color; it wraps, and nothing cuts it or limits
     its lines. A link in it is the product's own. */
  .description {
    color: ${t('description-color')};
    overflow-wrap: break-word;
  }
  .container:not(.has-description) .description {
    display: none;
  }
  .container.titled.has-description .description {
    margin-block-start: ${t('title-gap')};
  }

  /* EMP-6: the actions — one row actions.gap below the text, in the order given from the start, item-gap apart,
     centred or at the start as align says; a row that does not fit wraps, item-gap between its lines. Nothing of an
     action is styled. */
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: ${t('actions-item-gap')};
    max-inline-size: 100%;
    margin-block-start: ${t('actions-gap')};
  }
  .start .actions {
    justify-content: flex-start;
  }
  .container:not(.has-actions) .actions {
    display: none;
  }
  /* EMP-6, EMP-11: an action alone on its line is never wider than that line. One that would be is given the line's
     width and no less: a Button then wraps its label, as it does when a button group narrows it (the element tells it
     so), and a link wraps as text does. An action that fits is not touched. */
  ::slotted([slot='actions']) {
    max-inline-size: 100%;
  }

  /* EMP-9: the live region, read and never drawn. It lies inside the container, at its start corner, so that no box
     that scrolls is widened by it (src/scroll-box.test.ts). */
  .announce {
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
    border: 0;
  }

  /* EMP-12: forced colors — the glyph, the title and the description take the platform's text color; links, Buttons
     and a picture of the product's own are left to themselves. Nothing here relies on a fill. */
  @media (forced-colors: active) {
    .title,
    .description,
    .media.glyph {
      color: CanvasText;
    }
  }
`;
