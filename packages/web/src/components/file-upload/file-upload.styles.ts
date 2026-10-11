import { css, unsafeCSS } from 'lit';

// The file upload draws nothing of its own (FUP-1): it arranges its two members — its file picker above, its file
// items below — and the only values it reads are its own two distances (tokens/comp/file-upload.tokens.json). Nothing
// here reads a token of a member or writes a custom property.
const PREFIX = '--tanrei-comp-file-upload';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);

/** What is drawn nowhere and still read: the live region (FUP-26). It names its place, so it widens nothing (src/scroll-box.test.ts). */
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
  /* The positioning container of the live region, which is drawn nowhere. */
  .group {
    position: relative;
    min-inline-size: 0;
  }
  /* FPK-22, as the file picker has it for a trigger of its own: a trigger alone on its line is never wider than that
     line, and then wraps its label as the Button says. Said again here because the trigger reaches the file picker
     through a slot that is passed on (W9), and a rule on what is slotted stops at that slot. */
  ::slotted([slot='trigger']) {
    max-inline-size: 100%;
    min-inline-size: min-content;
  }

  /* ── The list (FUP-17) ── the rows, list.gap below the file picker: a column, list.item-gap apart; or, of tiles, a
     strip from the start edge that wraps, list.item-gap apart along both directions, the tiles of one line aligned at
     their tops. With no row there is no list and no room for one. Only a file item is drawn: .rows is drawn for
     nothing and has no font, and a file item makes itself visible, so text or another element among the rows takes no
     room and is not read (FUP-41). */
  .list {
    margin-block-start: ${t('list-gap')};
  }
  .list[hidden] {
    display: none;
  }
  .rows {
    visibility: hidden;
    font-size: 0;
    line-height: 0;
  }
  /* A file item is given a font size again — a length of the root's — and not for its drawing: every text of a file
     item sets its own role and the row's line height stays nothing. It is for WebKit, which does not follow a change
     of the root's font size into the shadow tree of an element slotted into a box whose own font size does not change
     with it (.rows, above; a page of plain elements does the same), unless the slotted element's own font size does:
     without it a row drawn before a reader enlarges the text keeps every rem length it had. */
  ::slotted(tanrei-file-item),
  .rows > tanrei-file-item {
    visibility: visible;
    font-size: var(--tanrei-sys-typescale-body-font-size);
  }
  ::slotted(tanrei-file-item:not(:first-of-type)),
  .rows > tanrei-file-item:not(:first-of-type) {
    margin-block-start: ${t('list-item-gap')};
  }
  /* The strip's distances are each tile's own margins toward the start and the top, and the strip reaches one
     distance further those two ways (where nothing scrolls) — not a gap of the strip: a text the product left between
     two tiles is an item of the strip too, as wide as nothing, and a gap would be counted on both of its sides
     (FUP-41: it takes no room). The list is a formatting context of its own, so it begins where the first line does. */
  .list[data-form='tile']:not([hidden]) {
    display: flow-root;
  }
  .list[data-form='tile'] .rows {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    margin-block-start: calc(-1 * ${t('list-item-gap')});
    margin-inline-start: calc(-1 * ${t('list-item-gap')});
  }
  .list[data-form='tile'] ::slotted(tanrei-file-item),
  .list[data-form='tile'] .rows > tanrei-file-item {
    margin-block-start: ${t('list-item-gap')};
    margin-inline-start: ${t('list-item-gap')};
    /* FIT-3: never wider than its layout — the file upload's width, which the strip exceeds by one distance. */
    max-inline-size: calc(100% - ${t('list-item-gap')});
  }
  ::slotted(:not(tanrei-file-item, [slot])) {
    display: none;
  }
  .announce {${unsafeCSS(unseen)}
  }
`;
