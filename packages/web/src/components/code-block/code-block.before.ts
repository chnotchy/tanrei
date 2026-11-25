// The code block before its element is defined (specs/code-block.spec.json): the rules of
// `tanrei-code-block:not(:defined)`. Only `@tanrei/web/code.css` carries them (scripts/build.js writes them before the
// rules of code-block.light.ts): once the element is defined no such block is left in the page, so the element does
// not import this module and the sheet it adopts has none of these rules.
//
// THE RULE THEY KEEP: a block that is not upgraded is drawn where the element will draw it, so that nothing moves when
// the element is defined. Every length the element's shadow root decides from an attribute (code-block.styles.ts) is
// decided here from the same attribute; a change there is a change here, and the test "nothing moves when the element
// is defined" (code-block.test.ts) holds the two together for every fixture, in both layout directions.

import { CORE_SIZES, CORE_VARIANTS, DEFAULT_SIZE, DEFAULT_VARIANT, T, layered, layoutBlock, sizeBlock, variantBlock } from './code-block.light.js';
import { typefaceOf } from '../../styles/type.js';

const HOST = 'tanrei-code-block';
const FALLBACK = `${HOST}:not(:defined)`;
/** The copy button is a small Button (COD-9): its height — which is its width, icon-only — is the Button's own token. */
const BUTTON = 'var(--tanrei-comp-button-container-height-small)';
/** Attribute selectors for what the element reads as "there is one": a string that is not empty. */
const has = (attribute: string) => `[${attribute}]:not([${attribute}=''])`;
/** COD-8: the header's words — a title or a language label. */
const WORDS = `:is(${has('headline')}, ${has('language-label')})`;
/**
 * COD-10: code of one line, counted as the element counts it — the lines written where the page was made, one box
 * each. Code that is text cannot be counted by a stylesheet: it is drawn as code of more than one line.
 */
const ONE_LINE = `:has(> pre > code > [data-line]:only-child)`;
/** COD-8, COD-10: the block has a header — words, or a copy button over code of more than one line. */
const HEADED = `:is(${WORDS}, [copy]:not(${ONE_LINE}))`;
/** COD-10: a copy button at the end of the one line's row, and no header. */
const BESIDE_LINE = `[copy]:not(${WORDS})${ONE_LINE}`;
/** Code that is not in the element's lines: text, or lines without a box for their code (see below). */
const LOOSE = `:not(:has([data-line-code]))`;

/** COD-6: the most lines a stylesheet can count to where the browser does not read an attribute as a number. */
const COUNTED_LINES = 50;

/** The rules of a block that is not upgraded, without their layer. */
const BEFORE = `
/* ── A block that is not upgraded (no script yet, or none at all) is drawn where the element will draw it, so that
   NOTHING MOVES WHEN THE ELEMENT IS DEFINED: the fill, the corners, the paddings and the face (COD-1 to COD-4); the
   header's row, with the title and the language label drawn from their attributes (COD-8); the room of the copy
   button, at the end of the header or of a one-line block's line, on the side the layout direction puts it (COD-9,
   COD-10, COD-20); and the lines. The copy button itself, and the focus stop of a body that scrolls, need the element.

   What stands beside a line — its number, its sign, its prompt, its mark — is drawn by the rules of "Lines" below,
   which do not ask whether the element is defined: lines written where the page was made (highlightToHtml or
   highlightToNodes with the block's props as \`lines\`) are whole before any script runs. Code that is text, or lines
   without a box for their code, cannot be given them by a stylesheet (a line's generated content cannot read the
   block's attribute, and a number's column is as wide as the last number): there the room is kept as nearly as an
   attribute can say — a prompt of one character, numbers of one digit, a sign — and the marks arrive with the
   element. ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
${sizeBlock(DEFAULT_SIZE, FALLBACK)}
${CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `${FALLBACK}[size='${size}']`)).join('\n')}
${variantBlock(DEFAULT_VARIANT, FALLBACK)}
${CORE_VARIANTS.filter((variant) => variant !== DEFAULT_VARIANT).map((variant) => variantBlock(variant, `${FALLBACK}[variant='${variant}']`)).join('\n')}
${layoutBlock(FALLBACK)}
${FALLBACK} {
  display: block;
  min-inline-size: 0;
  max-inline-size: 100%;
  border-radius: ${T('container-shape')};
  background: var(--_code-block-container);
}
${FALLBACK}[hidden] {
  display: none;
}
${FALLBACK}[variant='outlined'] {
  box-shadow: inset 0 0 0 ${T('outline-width')} ${T('outline-color')};
}
/* COD-9: at least as tall as the copy button and its inset above and below. */
${FALLBACK}[copy] {
  min-block-size: calc(${BUTTON} + ${T('copy-button-inset')} * 2);
}
/* COD-8: the header's row, kept and drawn — the title at the start, cut with an ellipsis in its own direction, and
   the language label at the end, each in its text style and centred in a row that begins copy-button.inset from the
   top and is as tall as the tallest of them and of the copy button; the code begins header.padding-block-end below
   it. Two columns: the title's, which takes what is left, and the end's — the gap after the title's space, the
   label, and the room of the copy button copy-button.inset from the end edge. A block with copy, no words and more
   than one line has the row too, with the button's room alone in it (COD-10). */
${FALLBACK}${HEADED} {
  --_code-block-pad-top: ${T('header-padding-block-end')};
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-content: start;
  align-items: center;
  column-gap: ${T('header-gap')};
  --_code-block-code-area: 2 / 1 / auto / -1;
}
${FALLBACK}${has('headline')}::before {
  content: attr(headline);
  grid-area: 1 / 1;
  justify-self: start;
  overflow: hidden;
  box-sizing: border-box;
  max-inline-size: 100%;
  margin-block-start: ${T('copy-button-inset')};
  padding-inline-start: var(--_code-block-pad-inline);
  ${typefaceOf(T, 'title-typescale')}
  letter-spacing: ${T('title-typescale-letter-spacing')};
  color: ${T('title-color')};
  text-overflow: ellipsis;
  white-space: nowrap;
  unicode-bidi: plaintext;
}
${FALLBACK}${HEADED}::after {
  content: attr(language-label);
  grid-area: 1 / 2;
  display: flex;
  align-items: center;
  margin-block-start: ${T('copy-button-inset')};
  margin-inline-end: var(--_code-block-pad-inline);
  ${typefaceOf(T, 'language-typescale')}
  letter-spacing: ${T('language-typescale-letter-spacing')};
  color: ${T('language-color')};
  white-space: nowrap;
}
${FALLBACK}${HEADED}:is([copy], ${has('language-label')})::after {
  padding-inline-start: ${T('header-gap')};
}
${FALLBACK}${HEADED}[copy]::after {
  min-block-size: ${BUTTON};
  margin-inline-end: ${T('copy-button-inset')};
  padding-inline-end: ${BUTTON};
}
${FALLBACK}${has('language-label')}[copy]::after {
  padding-inline-end: calc(${T('header-gap')} + ${BUTTON});
}
/* COD-10: code of one line with no words has no header: the line and the copy button's room share one row, centred on
   each other — the line's scroll area takes what is left, header.gap before the room, which ends copy-button.inset
   from the end edge. */
${FALLBACK}${BESIDE_LINE} {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: ${T('header-gap')};
  --_code-block-code-area: 1 / 1;
}
${FALLBACK}${BESIDE_LINE}::after {
  content: '';
  grid-area: 1 / 2;
  inline-size: ${BUTTON};
  block-size: ${BUTTON};
  margin-inline-end: ${T('copy-button-inset')};
}
/* COD-4: a line that does not fit scrolls inside the block; what scrolls is as wide as its longest line, so a line's
   band reaches the end of it. COD-5: wrapped, as wide as the block. The code's cell of the header's grid (COD-8) or of
   the one line's row (COD-10) is set on the block, where :has() asks, and inherited: a rule of the document asks :has()
   of the element it styles (has.test.ts). */
${FALLBACK} > pre {
  grid-area: var(--_code-block-code-area, auto);
  min-inline-size: 0;
  overflow-x: auto;
}
${FALLBACK}:not([wrap]) > pre > code {
  inline-size: max-content;
  min-inline-size: 100%;
}
${FALLBACK}[wrap] > pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
/* Code that is not in the element's lines: the paddings are the pre's, and a line a highlighter wrote without a box
   for its code is its text and nothing else. Before the first character of each line, the room of what the element
   will draw there, as nearly as the attributes say it: a prompt of one character and its space (COD-17); a gutter of
   one-digit numbers, of signs, or of both, and the gap after it (COD-13, COD-16). */
${FALLBACK} {
  --_code-block-room-prompt: 0px;
  --_code-block-room-gutter: 0px;
}
${FALLBACK}${has('prompt')} {
  --_code-block-room-prompt: 2ch;
}
${FALLBACK}:is([line-numbers], ${has('added-lines')}, ${has('removed-lines')}) {
  --_code-block-room-gutter: calc(1ch + ${T('line-number-gap')});
}
${FALLBACK}[line-numbers]:is(${has('added-lines')}, ${has('removed-lines')}) {
  --_code-block-room-gutter: calc(3ch + ${T('line-number-gap')});
}
${FALLBACK} > pre${LOOSE} {
  padding-inline: calc(var(--_code-block-pad-start) + var(--_code-block-room-gutter) + var(--_code-block-room-prompt)) var(--_code-block-pad-end);
}
${FALLBACK} [data-line]${LOOSE} {
  position: static;
  display: inline;
  padding: 0;
  background: none;
}
/* COD-6: no more than max-lines lines of the code's text style and the paddings; more scroll up and down inside the
   block. The number is the attribute's, read as a number where the browser can (any number, rounded down) and
   counted otherwise (1 to ${COUNTED_LINES}); a value neither gives, or one below 1, shows every line, as the element does for a
   value it cannot use. */
${FALLBACK}[max-lines] > pre {
  max-block-size: calc(var(--_code-block-max-lines) * 1lh + var(--_code-block-pad-top) + var(--_code-block-pad-block));
}
${Array.from({ length: COUNTED_LINES }, (_, index) => `${FALLBACK}[max-lines='${index + 1}'] { --_code-block-max-lines: ${index + 1}; }`).join('\n')}
@supports (x: attr(x type(*))) {
  ${FALLBACK}[max-lines] {
    --_code-block-max-lines: round(down, attr(max-lines type(<number>)), 1);
  }
  ${FALLBACK}:is([max-lines='0'], [max-lines^='0.'], [max-lines^='-'], [max-lines='']) {
    --_code-block-max-lines: initial;
  }
}
/* COD-23: forced colors remove every fill, so every look gains the edge, in the platform's text color — inside the
   block's size, so that nothing moves for it. */
@media (forced-colors: active) {
  ${FALLBACK} {
    outline: ${T('outline-width')} solid CanvasText;
    outline-offset: calc(${T('outline-width')} * -1);
    box-shadow: none;
  }
}`;

/** The stylesheet text of a block that is not upgraded, in the components' layer: `code.css` alone carries it, first. */
export const CODE_BLOCK_BEFORE_CSS = layered(BEFORE);
