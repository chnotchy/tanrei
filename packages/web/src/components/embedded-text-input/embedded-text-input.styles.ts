import { css, unsafeCSS } from 'lit';

// The embedded text input draws the typing alone (ETI-1): the text, its placeholder, the caret and the selection, from
// `comp.embedded-text-input` (tokens/comp/embedded-text-input.tokens.json). It has no container, fill, edge, corner,
// shadow or padding and no focus indication, in any state — there is no token for one — and what its holder draws
// behind it shows through.
const PREFIX = '--tanrei-comp-embedded-text-input';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);

export const styles = css`
  /* ETI-1: as wide as its layout gives it, and exactly as tall as its lines. The positioning container of its hit
     area and of the copy of its placeholder, neither of which takes room. */
  :host {
    display: block;
    position: relative;
    min-inline-size: 0;
    /* One line of the text style, as a length (a typescale's line height is a ratio of its size): what minRows and
       maxRows count in (ETI-7), and the height of a single line. It grows with the text size (ETI-24). */
    --_line: calc(${t('input-typescale-line-height')} * ${t('input-typescale-font-size')});
  }

  /* ETI-12: a press in an area at least a touch target high (a pointer target for a fine pointer) — the lines, and
     equally above the first and below the last where they are shorter — is a press on the text. The area is the
     host's own, takes no room and is as wide as the input: beside the text the room is its holder's. A disabled
     input takes no press. */
  :host::before {
    content: '';
    position: absolute;
    inset-inline: 0;
    inset-block-start: 50%;
    block-size: max(100%, var(--tanrei-sys-target-pointer));
    transform: translateY(-50%);
    cursor: text;
  }
  @media (pointer: coarse) {
    :host::before {
      block-size: max(100%, var(--tanrei-sys-target-touch));
    }
  }
  :host([disabled])::before {
    display: none;
  }

  /* ETI-10: the box whose block size is the animated one (src/primitives/auto-height.ts) — at rest as tall as the
     native element, and the height the host has at every frame of a motion. It clips only while it moves: the native
     element has its end height at once, and the box uncovers it. */
  .box {
    position: relative;
    display: block;
    min-inline-size: 0;
  }
  .box[data-resizing] {
    overflow: hidden;
    transition: block-size ${t('motion-resize-duration')} ${t('motion-resize-easing')};
  }
  /* ETI-9: where motion is reduced the height changes at once (the routine starts no motion either). */
  @media (prefers-reduced-motion: reduce) {
    .box[data-resizing] {
      transition: none;
    }
  }

  /* ETI-1: the platform's own text element with no box of the platform's or of Tanrei's. */
  .input {
    appearance: none;
    display: block;
    box-sizing: content-box;
    inline-size: 100%;
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    outline: 0;
    box-shadow: none;
    background: none;
    resize: none;
    font: ${t('input-typescale-font')};
    letter-spacing: ${t('input-typescale-letter-spacing')};
    line-height: var(--_line);
    color: ${t('standard-input-color')};
    -webkit-text-fill-color: currentcolor;
    caret-color: ${t('standard-caret-color')};
    text-align: start;
    opacity: 1;
  }
  /* ETI-11: no focus indication of its own, whatever the focus style is: the box around it is its holder's. */
  .input:focus,
  .input:focus-visible {
    outline: 0;
    box-shadow: none;
  }
  /* ETI-5: one line that never wraps and scrolls sideways inside itself. */
  input.input {
    block-size: var(--_line);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
  }
  /* What a browser draws inside its own search element is not drawn: the typing alone. */
  .input::-webkit-search-cancel-button,
  .input::-webkit-search-decoration,
  .input::-webkit-search-results-button,
  .input::-webkit-search-results-decoration {
    appearance: none;
    display: none;
  }
  /* ETI-5, ETI-7: lines that wrap at the input's own width — a run with no space between any two characters — as tall
     as --_rows lines, which the routine writes (the fewest, until it has measured). It scrolls only while the text has
     more lines than maxRows (data-overflows), and never sideways. */
  textarea.input {
    block-size: calc(var(--_rows, var(--_rows-min, 1)) * var(--_line));
    overflow-x: hidden;
    overflow-y: hidden;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: normal;
    scrollbar-gutter: auto;
  }
  textarea.input[data-overflows] {
    overflow-y: auto;
  }
  /* ETI-20: in a multi-line input each paragraph takes the direction and the alignment of its own first strong
     character; an empty one keeps the layout's (the element writes dir="auto" once the value has a letter). */
  textarea.input[dir='auto'] {
    unicode-bidi: plaintext;
  }
  /* ETI-20: an address or a number is laid out left to right and still stands at the start edge of the layout. */
  :host(:dir(rtl)) .input[dir='ltr'] {
    text-align: right;
  }

  /* ETI-1: the selection, in every state. */
  .input::selection {
    background: ${t('selection-color')};
    color: ${t('selection-content-color')};
    -webkit-text-fill-color: ${t('selection-content-color')};
  }
  /* ETI-22, ETI-20: the placeholder, in the text's own style, as a run of its own direction at the start edge. */
  .input::placeholder {
    color: ${t('standard-placeholder-color')};
    -webkit-text-fill-color: ${t('standard-placeholder-color')};
    opacity: 1;
    unicode-bidi: plaintext;
    text-align: left;
  }
  :host(:dir(rtl)) .input::placeholder {
    text-align: right;
  }
  input.input::placeholder {
    text-overflow: clip;
  }

  /* ETI-15: a disabled input's value and placeholder read as disabled content. Nothing else changes: the look of a
     disabled box is its holder's. */
  .input:disabled {
    color: ${t('standard-disabled-input-color')};
    caret-color: ${t('standard-disabled-caret-color')};
    opacity: 1;
  }
  .input:disabled::placeholder {
    color: ${t('standard-disabled-placeholder-color')};
    -webkit-text-fill-color: ${t('standard-disabled-placeholder-color')};
  }

  /* ETI-22: the placeholder's lines, measured: a copy laid out as the text area lays its text out, in its width and
     its text style, of no height and drawn nowhere. It names its place, so it widens nothing. */
  .hint {
    position: absolute;
    inset-block-start: 0;
    inset-inline: 0;
    block-size: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
    font: ${t('input-typescale-font')};
    letter-spacing: ${t('input-typescale-letter-spacing')};
    line-height: var(--_line);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* ETI-23: with a person's own colors, the platform's: text, text that is not available, the highlight, and a caret
     as the platform draws one. Nothing else is drawn, as everywhere. */
  @media (forced-colors: active) {
    .input {
      color: CanvasText;
      caret-color: auto;
      forced-color-adjust: none;
    }
    .input::selection {
      background: Highlight;
      color: HighlightText;
      -webkit-text-fill-color: HighlightText;
    }
    .input::placeholder,
    .input:disabled,
    .input:disabled::placeholder {
      color: GrayText;
      -webkit-text-fill-color: GrayText;
    }
  }
`;
