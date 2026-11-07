import { css, unsafeCSS } from 'lit';

// The file upload draws nothing of its own (FUP-1): it arranges its two members — its file picker above, its file
// items below — and the only values it reads are its own distance (tokens/comp/file-upload.tokens.json) and, for the
// room above the rows that comes and goes with them, the List's resize motion, which its rows move by (FUP-29).
// Nothing here writes a custom property.
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

  /* ── The list (FUP-17) ── a List, list.gap below the file picker: vertical for rows, horizontal and wrapping for
     tiles, comp.list.gap.small apart along both directions (the List's small gap). With no
     row there is no list and no room for one. What is not a file item is assigned to no slot and so not drawn (FUP-41). */
  .list {
    margin-block-start: ${t('list-gap')};
  }
  /* FUP-17, FUP-29: the rows arrive and leave as the List's items do (LST-41), and the room above them opens with the
     first and closes with the last, over the List's resize motion: a list that holds no row is empty, so it takes no
     room once that room has closed. At once where motion is reduced, and in the first frames. */
  .list[data-empty] {
    margin-block-start: 0;
  }
  /* The list carries the time and the curve of that motion for the script that moves the room (moveRoom: a duration
     token is an expression, computed through a real property), and starts no transition. */
  .list {
    transition-property: none;
    transition-duration: var(--tanrei-comp-list-motion-resize-duration);
    transition-timing-function: var(--tanrei-comp-list-motion-resize-easing);
  }
  /* A file item is given a font size again — a length of the root's — and not for its drawing: every text of a file
     item sets its own role. It is for WebKit, which does not follow a change of the root's font size into the shadow
     tree of an element slotted into a box whose own font size does not change with it, unless the slotted element's
     own font size does: without it a row drawn before a reader enlarges the text keeps every rem length it had. */
  .list tanrei-file-item,
  ::slotted(tanrei-file-item) {
    font-size: var(--tanrei-sys-typescale-body-font-size);
  }
  /* FIT-3: a tile is never wider than its layout — the file upload's width. */
  .list[data-form='tile'] tanrei-file-item,
  .list[data-form='tile'] ::slotted(tanrei-file-item) {
    max-inline-size: 100%;
  }
  .announce {${unsafeCSS(unseen)}
  }
`;
