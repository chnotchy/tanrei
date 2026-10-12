import { css } from 'lit';

// The copy button has no look of its own (CPY-1): it is drawn by the Button in its shadow root, from the
// Button's tokens in every state. What is here is what the behaviour needs — the three labels in one box, the live
// region, and the one token of its own, the time a confirmation is shown.
export const styles = css`
  /* A Button's place in a row: inline, on the baseline of the text beside it. */
  :host {
    display: inline-flex;
    position: relative;
    vertical-align: middle;
  }
  :host([hidden]) {
    display: none;
  }
  /* CPY-18: the Tooltip around the Button takes no room of its own: the Button is the copy button's whole box. */
  tanrei-tooltip {
    display: inline-flex;
    vertical-align: middle;
  }

  /* CPY-7, CPY-11: the three glyphs are drawn in one box — the Button's icon box, which this fills. While the icon
     set cannot draw a glyph yet (its font is loading) its name would be spelled in a text face: nothing is drawn in
     its place until it can (data-drawn, src/primitives/glyph.ts), and the box is kept. */
  .glyph {
    display: inline-block;
    inline-size: 100%;
    block-size: 100%;
  }
  .ink {
    display: inline-block;
  }
  .glyph:not([data-drawn]) {
    visibility: hidden;
  }

  /* CPY-7: the label's box is as wide as the widest of the three texts at all times — they share one cell, the two
     that are not shown hidden from sight and from assistive technology — and the shown text is at its start. */
  .labels {
    display: inline-grid;
    justify-items: start;
  }
  .labels > span {
    grid-area: 1 / 1;
  }
  .labels > span:not(.shown) {
    visibility: hidden;
  }

  /* CPY-5: the announcements — read, never drawn. */
  .live {
    position: absolute;
    overflow: hidden;
    inline-size: 1px;
    block-size: 1px;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* CPY-3: comp.copy-button.confirmation.duration is an expression; it is computed through a real property of this
     inert box and read from there (a duration token is never parsed). */
  .time {
    display: none;
    transition-property: none;
    transition-duration: var(--tanrei-comp-copy-button-confirmation-duration);
  }
`;
