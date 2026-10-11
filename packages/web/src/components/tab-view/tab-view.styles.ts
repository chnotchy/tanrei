import { css, unsafeCSS } from 'lit';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/tab-view.tokens.json). The Tab view draws nothing of its own: it holds its
// panels in one place, clips them to its corners and moves, fades and blurs two of them while a switch runs.
const PREFIX = '--tanrei-comp-tab-view';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);

/**
 * The view (TBV-11) is a column: its own row (TBV-16), slotted at the top across its whole width at the row's own
 * height, and the container directly below it with no space between them. The row is outside the container, so no
 * switch moves, fades, blurs or clips it (TBV-5), and the container's touch-action does not reach it (TBV-3).
 *
 * The container (TBV-5, TBV-11): every panel in the same grid cell, so the view is as tall as its row plus the panel it
 * shows — and the taller of two while a switch draws both — or, when the product sizes the view, the container fills
 * what the row leaves and each panel scrolls inside it. It clips the panels to its corners (comp.tab-view.container.shape), so neither the travel nor the blur is
 * drawn outside it. While a swipe is possible its touch-action leaves only vertical panning (and zoom) to the browser,
 * so a sideways drag reaches the view's pointer events (TBV-3).
 *
 * The probe draws nothing: the view reads the switch's look and timing through its real properties when a switch or a
 * drag starts (TBV-4…7) — the travel's distance as a width, the blur as a height, the share of the width as a flex
 * factor, the opacity as itself, the motion as a transition that names no property — so a token is never parsed, and
 * a bare `0` a layer writes for a dimension reads as 0. Where motion is reduced the distance, its share and the blur are
 * 0 and the motion is the fade's (TBV-7). The fade's own motion is read through the probe's animation, which names no
 * animation: it is what a view whose transition is fade switches over (TBV-22).
 */
export const tabViewStyles = css`
  :host {
    display: flex;
    flex-direction: column;
  }
  :host([hidden]) {
    display: none;
  }
  ::slotted([slot='tabs']) {
    flex: none;
  }
  .container {
    position: relative;
    display: grid;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    flex: 1 1 auto;
    min-block-size: 0;
    overflow: clip;
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
  }
  .container.swipe {
    touch-action: pan-y pinch-zoom;
  }
  .container > slot::slotted(*) {
    grid-area: 1 / 1;
    min-inline-size: 0;
    min-block-size: 0;
  }
  /* TBV-11: a panel of a view the product sizes fills it and scrolls up and down inside it. */
  .container > slot::slotted(tanrei-tab-panel) {
    overflow-x: hidden;
    overflow-y: auto;
  }
  .probe {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    visibility: hidden;
    pointer-events: none;
    inline-size: ${t('transition-distance')};
    block-size: ${t('transition-blur')};
    flex-grow: ${t('transition-distance-fraction')};
    opacity: ${t('transition-opacity')};
    transition-property: none;
    transition-duration: ${t('motion-switch-duration')};
    transition-timing-function: ${t('motion-switch-easing')};
    animation-duration: ${t('motion-fade-duration')};
    animation-timing-function: ${t('motion-fade-easing')};
  }
  @media (prefers-reduced-motion: reduce) {
    .probe {
      inline-size: 0;
      block-size: 0;
      flex-grow: 0;
      transition-duration: ${t('motion-fade-duration')};
      transition-timing-function: ${t('motion-fade-easing')};
    }
  }
  ${shape}
`;
