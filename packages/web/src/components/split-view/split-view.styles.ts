import { css, unsafeCSS } from 'lit';
import { reducedMotion } from '../../styles/motion.js';

// Every visual value is a token (tokens/comp/split-view.tokens.json); the handle is a `<tanrei-handle>`, drawn by its
// own tokens. The element writes the primary pane's share as `--_spv-share` on that pane's box (a number of percent),
// named for this element alone, since the content inherits it; it writes no token and reads none of the Handle's.
//
//   .split    the region the layout gives: the host's whole content box, a flex row (a column while axis is vertical)
//             of the start pane, the divider and the end pane (SPV-1).
//   .pane     a pane's box, clipped to its size. The primary one is its share of the region less the divider; the
//             other takes the rest. A motion moves the primary box's size in the layout (AnimatedSize, SPV-10).
//   .content  what the pane holds: the slot, the pane's whole size; folded away it is out of sight (SPV-8).
//   .divider  the hairline between the panes, and the place the Handle is centred on (SPV-2).

/** The axes and the primary panes the component defines (SPV-15: anything else is the first). */
export const AXES = ['horizontal', 'vertical'] as const;
export const PRIMARIES = ['start', 'end'] as const;

const PREFIX = '--tanrei-comp-split-view';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

export const styles = css`
  /* The Handle's z-index orders it over the panes within the split view only, never against the page. */
  :host {
    display: block;
    position: relative;
    box-sizing: border-box;
    isolation: isolate;
  }

  /* SPV-1: the region. A height the layout gives is passed down; while the panes stand side by side and the layout gives
     none, the height is the taller pane's content. */
  .split {
    display: flex;
    flex-direction: row;
    box-sizing: border-box;
    inline-size: 100%;
    block-size: 100%;
    min-inline-size: 0;
    min-block-size: 0;
  }
  .split.vertical {
    flex-direction: column;
  }

  /* SPV-1: each pane clips its content to its own box (clip: no scroll container, so nothing scrolls it to bring a part
     into view, SPV-10) and draws nothing of its own. */
  .pane {
    position: relative;
    box-sizing: border-box;
    min-inline-size: 0;
    min-block-size: 0;
    overflow: clip;
    background: none;
  }
  .pane.primary {
    flex: none;
    inline-size: calc((100% - ${t('divider-width')}) * var(--_spv-share, 50) / 100);
  }
  .vertical > .pane.primary {
    inline-size: auto;
    block-size: calc((100% - ${t('divider-width')}) * var(--_spv-share, 50) / 100);
  }
  .pane.rest {
    flex: 1 1 0;
  }
  /* SPV-10: the content is laid out to the size then shown, fixed to the pane's start edge. */
  .content {
    display: block;
    box-sizing: border-box;
    inline-size: 100%;
    block-size: 100%;
  }
  .content::slotted(*) {
    box-sizing: border-box;
  }
  /* SPV-8: a folded pane draws nothing: its content goes out of sight once the fold's motion has ended (its box is inert
     at once, so nothing in it is reached meanwhile), and comes back into sight at once when it is restored. */
  .pane.folded > .content {
    visibility: hidden;
    transition: visibility 0s linear var(--_spv-hide-after, 0s);
  }
  ${reducedMotion(css`
    .pane.folded > .content {
      transition: none;
    }
  `)}

  /* SPV-1: the divider, divider.width thick across the whole region, in divider.color. */
  .divider {
    position: relative;
    flex: none;
    inline-size: ${t('divider-width')};
    background-color: ${t('divider-color')};
  }
  .vertical > .divider {
    inline-size: auto;
    block-size: ${t('divider-width')};
  }

  /* SPV-2: the Handle centred on the divider, over both panes; its target reaches beyond its box without moving them. */
  tanrei-handle {
    position: absolute;
    z-index: 1;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
  }

  /* SPV-14: forced colors draw the divider in the text color; the Handle draws itself (HDL-16). */
  @media (forced-colors: active) {
    .divider {
      forced-color-adjust: none;
      background-color: CanvasText;
    }
  }
`;
