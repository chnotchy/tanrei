import { css } from 'lit';

/** Which of its sizes follows the content (SZT-12): the first is what an unknown name follows (SZT-13). */
export const AXES = ['block', 'inline', 'both'] as const;
/** The edge that stays still (SZT-4): the first is what an unknown name keeps (SZT-13). */
export const ANCHORS = ['start', 'end', 'center'] as const;

// The size transition draws nothing of its own (SZT-12): no color, edge, corner or padding. Its motion's tokens
// (tokens/comp/size-transition.tokens.json) are read by the script, through `.timing`.
//
//   :host        a block (axis block), or an inline block whose width is its content's (axis inline, both)
//   .box         the box whose size moves (`AnimatedSize`, src/primitives/motion.ts): a flex container that justifies
//                the content to the anchor's edge, so that while the box is smaller than its content the content
//                overflows — clipped — at the edge that moves, and stands still at the one that does not (SZT-4)
//   .content     the slot, laid out at its own size: what the resize observer measures
//   .timing      never drawn: the durations and the distance step as the tokens resolve now
export const styles = css`
  :host {
    display: block;
  }
  :host([axis='inline']),
  :host([axis='both']) {
    display: inline-block;
    max-inline-size: 100%;
  }
  :host([hidden]) {
    display: none;
  }

  /* SZT-4: the block axis is the box's main axis (column), its inline size the layout's (stretched). */
  .box {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .box > .content {
    flex: none;
    min-inline-size: 0;
  }
  :host([anchor='end']) .box {
    justify-content: flex-end;
  }
  :host([anchor='center']) .box {
    justify-content: center;
  }

  /* The inline axis is the main axis (row): the content may be narrower than its text where the layout is (it wraps), and
     keeps its width while the box moves (it overflows the edge that moves). With both axes, the block axis is the cross
     axis, aligned to the same edge. Justification and alignment follow the direction: right to left, start is the right. */
  :host([axis='inline']) .box,
  :host([axis='both']) .box {
    flex-direction: row;
    align-items: flex-start;
  }
  :host([axis='inline']) .box > .content,
  :host([axis='both']) .box > .content {
    flex: 0 1 auto;
  }
  :host([axis='inline']) .box[data-resizing] > .content,
  :host([axis='both']) .box[data-resizing] > .content {
    flex-shrink: 0;
  }
  :host([axis='both'][anchor='end']) .box {
    align-items: flex-end;
  }
  :host([axis='both'][anchor='center']) .box {
    align-items: center;
  }

  /* SZT-3: never drawn. Its computed transition durations are the three durations, its inline size the distance step. */
  .timing {
    display: none;
    transition-duration: var(--tanrei-comp-size-transition-motion-duration), var(--tanrei-comp-size-transition-motion-duration-step), var(--tanrei-comp-size-transition-motion-duration-max);
    inline-size: var(--tanrei-comp-size-transition-motion-distance-step);
  }
`;
