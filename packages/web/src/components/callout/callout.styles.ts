import { css, unsafeCSS } from 'lit';
import { type OpenAxis, iconGlyph } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';
import { scriptTracking } from '../../styles/script-tracking.js';

// Every visual value is a token (tokens/comp/callout.tokens.json). The callout itself has no state (CLO-10): what
// changes what it draws is its variant, its status and its size, each read from that form's own tokens. The close
// button is a small icon-only Tanrei Button, placed here and never restyled: the callout gives it its variant and, on a
// filled look, the body color of its form as its tone (callout.ts), and the Button draws everything else.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['tonal', 'outlined'] as const;
export const CORE_SIZES = ['medium', 'large'] as const;
/** The statuses besides `default`: a closed set (CLO-30), each a prefix before the callout's parts (CLO-3). */
export const STATUSES = ['info', 'warning', 'error', 'success'] as const;
const DEFAULT_VARIANT = 'tonal';
const DEFAULT_SIZE = 'medium';
/** The parts of a form (CLO-2, CLO-3): the fill, the title, the body and the glyph. */
const PARTS = { bg: 'container-color', title: 'title-color', body: 'body-color', icon: 'icon-color' } as const;

const PREFIX = '--tanrei-comp-callout';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);
/**
 * A part's color drawn at one of the component's opacities (CLO-5): the color mixed with transparent, never the
 * element's `opacity`, so nothing else fades with it. At 1 it is the color.
 */
const faded = (color: string, opacity: string) => unsafeCSS(`color-mix(in srgb, ${color} calc(${T(opacity)} * 100%), transparent)`);

// Per variant, the four parts with no status (`d`) and under each status, as private custom properties: `--_d-bg` (the
// fill with no status), `--_error-icon`. The part's token is `[<status>-]<part>-<variant>`.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${['', ...STATUSES]
    .flatMap((status) => {
      const key = status || 'd';
      return Object.entries(PARTS).map(([name, part]) => `  --_${key}-${name}: ${ref((v) => `${PREFIX}-${status ? `${status}-` : ''}${part}-${v}`, variant, fallback)};`);
    })
    .join('\n')}\n}`;

// Per size, the title's and the body's text roles, each used whole: the font shorthand and the letter
// spacing — and the height of one line of each, for a browser that does not know the `lh` unit.
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${(['title', 'body'] as const)
    .flatMap((part) => {
      const role = (member: string) => ref((v) => `${PREFIX}-${part}-typescale-${v}-${member}`, size, fallback);
      return [`  --_${part}-font: ${role('font')};`, `  --_${part}-tracking: ${role('letter-spacing')};`, `  --_${part}-line: calc(${role('line-height')} * ${role('font-size')});`];
    })
    .join('\n')}\n}`;

/** What a form paints (CLO-2, CLO-3): the same parts, from the variant's parts of that status. Colors only. */
const formBlock = (status: string, selector: string) => {
  const key = status || 'd';
  return `${selector} {
${Object.keys(PARTS)
  .map((name) => `    --_${name}: var(--_${key}-${name});`)
  .join('\n')}
  }`;
};

/**
 * The open axes (CLO-30): a size or variant a layer added gets its block on demand, built by the same
 * functions as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in
 * debug builds. A variant a layer adds has no edge: only `outlined` draws one (CLO-4).
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-body-typescale-${value}-font` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-container-color-${value}` },
];

export const styles = css`
  /* CLO-22: a block in the flow of its container — the whole inline size it is given, no outer space, no minimum, no
     maximum, no measure, nothing that floats, sticks or scrolls. It has no role of its own in the styles and takes no
     input: only the close button answers, as a Button (CLO-10). */
  :host {
    display: block;
  }
  /* CLO-13: not open, it draws nothing and takes no space; nothing in it is exposed or reachable. open="false" is how
     the property is spelled as an attribute (it defaults to true). */
  :host([open='false' i]),
  :host([hidden]) {
    display: none;
  }
  /* CLO-31: a callout with no title and no body draws nothing and takes no space. Its own rule: a browser without
     custom states drops only this one, and the empty callout is then a block of no height (.container[hidden]). */
  :host(:state(empty)) {
    display: none;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}

  /* CLO-1: the container — as wide as the host, as tall as its content, container.shape corners through the shared
     corner rule, no elevation; the paddings; and from the start the glyph, the column of text, and the close button.
     Everything is aligned to the top: any height beyond the content lies below it.
     CLO-2: the form's fill; its title, body and glyph colors go to the parts below. */
  .container {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    align-content: start;
    padding-block: ${t('container-padding-block')};
    padding-inline: ${t('container-padding-inline')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    background: var(--_bg);
    text-align: start;
    /* The first line of the text is the body's, or the title's where there is one: the glyph and the close button are
       centred on a line of this font (CLO-1). */
    --_first-font: var(--_body-font);
    --_first-line: var(--_body-line);
  }
  .container[hidden] {
    display: none;
  }
  .container.titled {
    --_first-font: var(--_title-font);
    --_first-line: var(--_title-line);
  }
  /* CLO-1: after the close button the end padding is the nearer one. */
  .container.closable {
    padding-inline-end: ${t('container-padding-inline-end-with-close')};
  }
  ${unsafeCSS(formBlock('', '.container'))}
  ${unsafeCSS(STATUSES.map((status) => formBlock(status, `:host([status='${status}']) .container`)).join('\n  '))}
  /* CLO-4: the outlined look's edge, inside the container's size and following its corners — an inset ring changes
     neither the box nor the place of its content. The system's one hairline, in every status. */
  :host([variant='outlined']) .container {
    box-shadow: inset 0 0 0 ${t('outline-width')} ${t('outline-color')};
  }

  /* CLO-1, CLO-5: the glyph's place — one line of the first line's font tall (the lh unit; the role's own line height
     where a browser does not know it), the glyph centred in it, icon.gap before the text. A box that holds nothing draws
     no room (CLO-5: without a status and without a glyph of the product's the text starts at the padding). */
  .lead,
  .end {
    display: flex;
    align-items: center;
    font: var(--_first-font);
    block-size: var(--_first-line);
    block-size: 1lh;
  }
  .lead {
    margin-inline-end: ${t('icon-gap')};
  }
  .container:not(.has-lead) .lead {
    display: none;
  }
  /* CLO-5, CLO-6: the status glyph, or the product's in its place — a box of icon.size, the form's icon color at
     icon.opacity (an opacity of the glyph alone), the icon set's unselected family and fill, sys.icon.weight, the
     optical size of the box, no transition. CLO-27: iconGlyph() mirrors the slotted glyph GlyphMirrorController marked. */
  ${iconGlyph('.icon', { size: `${PREFIX}-icon-size`, selected: ':not(*)' })}
  .icon {
    color: ${faded('var(--_icon)', 'icon-opacity')};
  }
  /* The slot is the glyph's ink for GlyphDrawnController: an inline block as wide as the name it holds. */
  .icon slot {
    display: inline-block;
    vertical-align: top;
  }
  .icon ::slotted(svg),
  .icon ::slotted(img) {
    display: block;
    inline-size: var(--tanrei-icon-size);
    block-size: var(--tanrei-icon-size);
  }
  /* CLO-29: nothing in a glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn); the box
     keeps its size. (The close button's glyph is the Button's, which does the same.) */
  .icon:not([data-drawn]) {
    visibility: hidden;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box. */
  .ink {
    display: inline-block;
    vertical-align: top;
  }

  /* CLO-1: the column that takes the remaining width: the title, the body, the actions. */
  .text {
    position: relative;
    grid-column: 2;
    min-inline-size: 0;
  }
  /* CLO-20: the status in words, read before the title and the body and never drawn. */
  .status-label,
  .announce {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  /* The two live regions are in no positioned box of the callout's (the callout itself is not positioned: CLO-22), so
     they are laid out against whatever is positioned above it — which may be outside a box the callout scrolls in,
     and that box then does not cut them. Left where they would have stood, far along a row the box scrolls, they
     widened the page itself, which scrolled sideways to reach one invisible pixel (src/scroll-box.test.ts). So they
     name their place: the start corner of what they are laid out against, inside it (no margin that would put the
     pixel past its edge — in a right-to-left part of a left-to-right page that edge is the page's). Nothing is drawn
     there, and what a live region says does not depend on where it is. */
  .announce {
    inset-block-start: 0;
    inset-inline-start: 0;
    margin: 0;
  }
  /* CLO-7: the title, in the text style of its size and the title color of its form; it wraps and is never cut. A
     heading the product gives in the slot is drawn as every other title is: its own margins and text style are taken
     off, its role and level are untouched. */
  .title {
    font: var(--_title-font);
    letter-spacing: var(--_title-tracking);
    color: var(--_title);
    overflow-wrap: break-word;
  }
  /* CLO-7: the title's letter-spacing follows its script (src/styles/script-tracking.ts); a title the product gives in the slot, by its own language. */
  ${unsafeCSS(scriptTracking('.title', 'var(--_title-tracking)', { shadow: true }))}
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
  /* CLO-7: a title the product gives in the slot follows its own language. */
  ${unsafeCSS(scriptTracking('', 'var(--_title-tracking)', { slotted: "[slot='title']" }))}
  /* CLO-28: a title given as text is text of its own direction, isolated, its lines aligned by the layout's. */
  ${productText('.headline', { align: 'start' })}
  .headline {
    display: block;
  }
  /* CLO-8: the body — the text style of its size and the body color of its form, inherited by what the product placed
     there, so bare text is styled and a component or a prose inside keeps its own. It wraps; nothing cuts it. */
  .body {
    font: var(--_body-font);
    letter-spacing: var(--_body-tracking);
    color: var(--_body);
    overflow-wrap: break-word;
  }
  .container:not(.has-body) .body {
    display: none;
  }
  /* CLO-7: title.gap between the title and the body. */
  .container.titled.has-body .body {
    margin-block-start: ${t('title-gap')};
  }
  /* CLO-9: the actions — a row below the text, actions.gap below it, starting at the text's start edge, item-gap
     between two along the row and between rows where they wrap. Nothing of an action is styled. */
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${t('actions-item-gap')};
    margin-block-start: ${t('actions-gap')};
  }
  .container:not(.has-actions) .actions {
    display: none;
  }
  /* CLO-9, CLO-23: an action alone on its line is never wider than that line. One that would be is given the line's
     width and no less: a Button then wraps its label, as it does when a button group narrows it (the element tells it
     so), and a link wraps as text does. An action that fits is not touched, and nothing of it is cut: one whose
     longest word does not fit the line keeps that word whole and is as wide as it needs (its box is what it draws). */
  ::slotted([slot='actions']) {
    max-inline-size: 100%;
    min-inline-size: min-content;
  }

  /* CLO-10: the close button at the end of the first row, container.gap after the text, centred on the first line: its
     box is one line tall and the Button, taller, overflows it above and below alike — it overlaps the padding rather
     than making the row taller. The Button is placed and never restyled: its variant and its tone are given through
     its own channel (callout.ts), and it keeps its own size, shape, states, focus ring and minimum target. */
  .end {
    grid-column: 3;
    margin-inline-start: ${t('container-gap')};
  }
  .close {
    flex: none;
  }

  /* CLO-1, CLO-19: corner smoothing on the container (data-tanrei-shape). */
  ${shape}

  /* CLO-24: forced colors remove every fill, so every look gains an edge in the text color, inside the container's
     size: a border the paddings give room for, so nothing moves. The title, the body and the glyph take the text color
     — the glyph whole; the close button is a Button, which draws itself in the platform's colors for a button. */
  @media (forced-colors: active) {
    .container {
      border: ${t('outline-width')} solid CanvasText;
      padding-block: calc(${t('container-padding-block')} - ${t('outline-width')});
      padding-inline: calc(${t('container-padding-inline')} - ${t('outline-width')});
    }
    .container.closable {
      padding-inline-end: calc(${t('container-padding-inline-end-with-close')} - ${t('outline-width')});
    }
    .title,
    .body,
    .icon {
      color: CanvasText;
    }
  }
`;
