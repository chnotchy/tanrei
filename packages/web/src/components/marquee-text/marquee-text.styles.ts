import { css, unsafeCSS } from 'lit';
import { directionProbeStyles } from '../../primitives/index.js';
import { hiddenHost } from '../../primitives/hidden.js';

/** The `trigger` prop, the default first (MRQ-3, MRQ-15). */
export const TRIGGERS = ['hover-or-focus', 'hover', 'focus', 'always'] as const;
/** The `loop` prop, the default first (MRQ-4, MRQ-5, MRQ-15). */
export const LOOPS = ['repeat', 'bounce'] as const;

const PREFIX = '--tanrei-comp-marquee-text';
const T = (name: string) => `var(${PREFIX}-${name})`;
/** The component token of the speed, in pixels per second, read by the script (MRQ-4). */
export const SPEED = `${PREFIX}-speed`;
/** The component token of the fade's depth, read by the script for the fade's keyframes (MRQ-6). */
export const FADE = `${PREFIX}-fade-extent`;
/** The component token of the copy's gap, read by the script for the distance of a pass (MRQ-4). */
export const GAP = `${PREFIX}-gap`;

// Every visual value is a token (tokens/comp/marquee-text.tokens.json). The line has no type style and no color of its
// own: it is drawn in the text style, color and direction of where it stands (MRQ-1).
//
//   :host            an inline flex row as wide as its place: the viewport, then the playback control at its end
//   .viewport        one line high, clipping the text; its mask is the fade while the text plays (MRQ-6). Its `dir`
//                    is the text's own direction (MRQ-7), so the text rests at the start edge of that direction
//   .track           at rest the cut line with its ellipsis (MRQ-2); while it plays a row as wide as the text and its
//                    copy, moved by the motion (MRQ-4, MRQ-5)
//   .copy            the copy that follows the text a gap behind, while it repeats; hidden from assistive technology
//   .control         the playback control, a small text Button (MRQ-10)
//   .timing          probes whose transition timing the script reads the duration tokens through
export const styles = [
  directionProbeStyles,
  css`
    :host {
      display: flex;
      align-items: center;
      min-inline-size: 0;
      max-inline-size: 100%;
      gap: ${unsafeCSS(T('playback-gap'))};
      /* The fade's mask: the line's own box, widened by the fade's depth beyond each edge where no text lies hidden. */
      --_fade: ${unsafeCSS(T('fade-extent'))};
    }

    /* MRQ-1: one line high, as wide as its place, clipping the text. */
    .viewport {
      flex: 1 1 auto;
      min-inline-size: 0;
      overflow: hidden;
      white-space: nowrap;
    }

    /* MRQ-2: at rest, the line cut with the platform's ellipsis at the end of the text's direction. */
    .track {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* MRQ-4, MRQ-5: while it plays, the text and its copy on one row as wide as they are, which the motion moves. */
    .viewport[data-playing] .track {
      display: flex;
      inline-size: max-content;
      overflow: visible;
      text-overflow: clip;
    }
    .text {
      white-space: nowrap;
    }
    .copy {
      white-space: nowrap;
      margin-inline-start: ${unsafeCSS(T('gap'))};
    }

    /* MRQ-6: the fade of the edges behind which text lies hidden. One mask layer, the line's box with a band of the
       fade's depth at each side: widened past a side (and moved) where no text lies hidden there, so that side shows
       no fade. The script's keyframes move it with the text; at rest there is none. Without them — before the run's
       animation exists, or where it is cancelled — the line looks as it does resting at its start: only the end edge
       of the text's direction fades. */
    .viewport[data-playing] {
      mask-image: linear-gradient(to right, transparent 0, black var(--_fade), black calc(100% - var(--_fade)), transparent 100%);
      mask-repeat: no-repeat;
      mask-size: calc(100% + var(--_fade)) 100%;
      mask-position: calc(-1 * var(--_fade)) 0;
    }
    .viewport[data-playing][dir='rtl'] {
      mask-position: 0 0;
    }

    .copy[hidden],
    .control[hidden] {
      display: none;
    }

    .timing {
      position: absolute;
      inline-size: 0;
      block-size: 0;
      overflow: hidden;
      visibility: hidden;
      pointer-events: none;
      transition-property: opacity;
      transition-duration: 0s;
    }
    .timing.start-pause {
      transition-delay: ${unsafeCSS(T('motion-start-pause'))};
    }
    .timing.end-pause {
      transition-delay: ${unsafeCSS(T('motion-end-pause'))};
    }
    .timing.start-delay {
      transition-delay: ${unsafeCSS(T('motion-start-delay'))};
    }
    .timing.pass {
      transition-timing-function: ${unsafeCSS(T('motion-easing'))};
    }
    .timing.return {
      transition-delay: ${unsafeCSS(T('motion-return-duration'))};
      transition-timing-function: ${unsafeCSS(T('motion-return-easing'))};
    }
    /* MRQ-13: the browser's default text size, against which an enlarged text size is measured. */
    .timing.medium {
      font-size: medium;
    }

    /* MRQ-18: in forced colors there is no fade; the text is clipped at the viewport's edge. Important, so that it holds
       over the fade's keyframes. */
    @media (forced-colors: active) {
      .viewport,
      .viewport[data-playing] {
        mask-image: none !important;
      }
    }
  `,
  hiddenHost,
];
