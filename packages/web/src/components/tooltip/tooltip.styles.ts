import { css, unsafeCSS } from 'lit';
import { arrowStyles, whenChosen } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';
import { productText } from '../../styles/product-text.js';

// Every visual value is a token (tokens/comp/tooltip.tokens.json). Plain and rich are two structures drawn by code, not a
// token axis (a system restyles both by value); the tooltip has no interaction states. Each form has two looks (TIP-26):
// inverse, or on a surface of the scheme. A plain tooltip's unprefixed tokens are its inverse look and `plain-surface-*`
// the other; a rich one's unprefixed tokens are its surface look and `rich-inverse-*` the other. Each look hands its
// tokens to the same private properties, so a look changes colors and elevation and nothing else.
const PREFIX = '--tanrei-comp-tooltip';
const t = (name: string) => unsafeCSS(`var(${PREFIX}-${name})`);

/** `comp.tooltip.arrow.visible` and each form's `container.inverse`: a choice's name. The first is what an unknown name is. */
export const CHOICE = ['off', 'on'] as const;
/** TIP-26: the look as the host carries it: its `inverse` attribute's, or — unset — its form's choice (the choice's NAME). */
export const INVERSE_PROPERTY = '--_tooltip-inverse';
/** TIP-25: whether an arrow is asked for, as the host carries it: its `arrow` attribute's, or — unset — the system's choice. */
export const ARROW_PROPERTY = '--_tooltip-arrow';

/** One look of both forms, as `--_fill`, `--_elevation`, `--_text`, `--_title` and `--_keys`. */
const look = (surface: string, inverse: boolean) => {
  const plain = inverse ? 'plain' : 'plain-surface';
  const rich = inverse ? 'rich-inverse' : 'rich';
  return `
  ${surface} {
    --_fill: var(${PREFIX}-${plain}-container-color);
    --_elevation: var(${PREFIX}-${plain}-container-elevation);
    --_text: var(${PREFIX}-${plain}-supporting-text-color);
    --_keys: var(${PREFIX}-${plain}-shortcut-color);
  }
  :host([variant='rich']) ${surface} {
    --_fill: var(${PREFIX}-${rich}-container-color);
    --_elevation: var(${PREFIX}-${rich}-container-elevation);
    --_title: var(${PREFIX}-${rich}-title-color);
    --_text: var(${PREFIX}-${rich}-supporting-text-color);
  }`;
};

/** One form's container and supporting text (TIP-10, TIP-11): what is the same in both looks. */
const form = (variant: 'plain' | 'rich') => `
  :host([variant='${variant}']) .bubble {
    padding-block: var(${PREFIX}-${variant}-container-padding-block);
    padding-inline: var(${PREFIX}-${variant}-container-padding-inline);
    max-inline-size: min(var(${PREFIX}-${variant}-container-max-width), calc(100vw - 2 * var(${PREFIX}-window-margin)));${cornerRadius(`${PREFIX}-${variant}-container-shape` as `--${string}`)}
  }
  :host([variant='${variant}']) .text {
    font: var(${PREFIX}-${variant}-supporting-text-typescale-font);
    letter-spacing: var(${PREFIX}-${variant}-supporting-text-typescale-letter-spacing);
  }`;

export const styles = css`
  :host {
    display: inline-block;
    vertical-align: middle;
    /* TIP-3: a long-press shows the tooltip, not the platform's callout. */
    -webkit-touch-callout: none;
    /* TIP-25, TIP-26: the system's choices (their NAMES, as the cascade gives them here)… */
    ${unsafeCSS(ARROW_PROPERTY)}: ${t('arrow-visible')};
    ${unsafeCSS(INVERSE_PROPERTY)}: ${t('plain-container-inverse')};
  }
  :host([variant='rich']) {
    ${unsafeCSS(INVERSE_PROPERTY)}: ${t('rich-container-inverse')};
  }
  /* …unless the tooltip says so itself: the attribute (true), or ="false". */
  :host([arrow]) {
    ${unsafeCSS(ARROW_PROPERTY)}: on;
  }
  :host([arrow='false' i]) {
    ${unsafeCSS(ARROW_PROPERTY)}: off;
  }
  :host([inverse]) {
    ${unsafeCSS(INVERSE_PROPERTY)}: on;
  }
  :host([inverse='false' i]) {
    ${unsafeCSS(INVERSE_PROPERTY)}: off;
  }

  /* The placed box: a popover in the top layer (TIP-13), placed by script (TIP-9), taking no focus and holding nothing
     focusable. Its own box: none of the browser's popover defaults. It paints nothing and is never transformed, so its
     box is the tooltip's at rest, whatever the motion inside it (TIP-15). */
  .surface {
    box-sizing: border-box;
    position: fixed;
    inset: auto;
    margin: 0;
    border: 0;
    padding: 0;
    background: none;
    color: inherit;
    overflow: visible;
    inline-size: max-content;
    -webkit-user-select: none;
    user-select: none;
    /* What is inside fades, grows and travels as it opens and closes: the box is drawn on a layer of its own from the
       start, so the picture at rest is the one the motion ends on. */
    will-change: opacity;
    /* The placement reads its lengths through real properties (a custom property holds an expression): the offset, the
       window margin, and the arrow's width, height and inset. */
    scroll-margin-block-start: ${t('offset')};
    scroll-margin-block-end: ${t('window-margin')};
    scroll-margin-inline-start: ${t('arrow-width')};
    scroll-margin-inline-end: ${t('arrow-height')};
    scroll-padding-block-start: ${t('arrow-inset')};
  }
  .surface:popover-open {
    display: block;
  }
  /* TIP-29: closed or leaving, it takes no pointer: a press reaches what lies under it, and the pointer on it is not hover. */
  .surface:not(.open) {
    pointer-events: none;
  }

  /* TIP-26: the look. On a surface of the scheme — the first value of the choice, and so what an unknown name is — and
     inverse by a style query on the host's choice, which follows the attribute, a layer and a system switched on any
     ancestor with no script, and by data-inverse where a browser has no style queries. */
  ${unsafeCSS(look('.surface', false))}
  ${whenChosen(INVERSE_PROPERTY, '.surface', 'inverse', 'on', (surface) => look(surface, true))}

  /* The container (TIP-10, TIP-11): the painted box, in its look's color and elevation. */
  .bubble {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: column;
    /* TIP-12: start-aligned by the layout direction, wrapping, and growing with enlarged text. */
    text-align: start;
    overflow-wrap: break-word;
    background: var(--_fill);
    box-shadow: var(--_elevation);
  }
  /* The default form is plain; any value other than rich is drawn as plain. */
  ${unsafeCSS(form('plain').replaceAll(":host([variant='plain'])", ':host'))}
  ${unsafeCSS(form('rich'))}
  .text {
    color: var(--_text);
  }
  /* TIP-10: a plain tooltip is at least its minimum height, its line centered in it. */
  :host(:not([variant='rich'])) .bubble {
    justify-content: center;
    min-block-size: ${t('plain-container-min-height')};
  }
  /* TIP-11: the title above the text, gap apart. */
  :host([variant='rich']) .bubble {
    gap: ${t('rich-container-gap')};
  }
  .title {
    font: ${t('rich-title-typescale-font')};
    letter-spacing: ${t('rich-title-typescale-letter-spacing')};
    color: var(--_title);
  }
  /* TIP-21: the title and the text are each a run of their own, in the direction of their first strong character, so a
     left-to-right name or a number with its unit keeps its order in a right-to-left tooltip; TIP-12, TIP-20: their lines
     are still start-aligned by the layout direction — at the right in right-to-left (src/styles/product-text.ts). */
  ${productText(':is(.title, .text)', { align: 'start' })}

  /* TIP-27: the shortcut after the text, a gap away and on the text's first line (its end side: the left in
     right-to-left, TIP-20); it stays whole on one line while the text wraps beside it. Hosted (KBS-13), its legends and
     separators take this element's text style and color. */
  .bubble.keyed {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    column-gap: ${t('plain-container-gap')};
    align-items: first baseline;
    align-content: center;
  }
  .shortcut {
    font: ${t('plain-supporting-text-typescale-font')};
    letter-spacing: ${t('plain-supporting-text-typescale-letter-spacing')};
    color: var(--_keys);
    white-space: nowrap;
  }

  /* TIP-25: the arrow — a triangle on the container's edge that faces the anchor, in the container's color, its tip
     where the script says (--_arrow-at, from the container's left or top edge). It reaches under the container by its own
     height, so no line shows between the two; the container is drawn over that part. The elevation is drawn round both
     as one shape by a filter, not by each one's own shadow (src/primitives/arrow.ts). */
  ${arrowStyles({ surface: '.surface', box: '.bubble', width: `var(${PREFIX}-arrow-width)`, height: `var(${PREFIX}-arrow-height)`, fill: 'var(--_fill)', elevation: 'var(--_elevation)' })}

  /* TIP-15: closed, it is clear, a little smaller and a little nearer the anchor; open, it is whole and in its place.
     Going to either takes that motion's own time and curve, and a motion that is turned round starts from where the
     other had got to (TIP-29). Only this wrapper moves: the placed box around it does not (TIP-9, TIP-1). */
  .motion {
    position: relative;
    opacity: 0;
    transform: translate(var(--_from-x, 0), var(--_from-y, 0)) scale(${t('motion-enter-scale')});
    transition:
      opacity ${t('motion-exit-duration')} ${t('motion-exit-easing')},
      transform ${t('motion-exit-duration')} ${t('motion-exit-easing')};
  }
  .surface.open .motion {
    opacity: 1;
    transform: none;
    transition:
      opacity ${t('motion-enter-duration')} ${t('motion-enter-easing')},
      transform ${t('motion-enter-duration')} ${t('motion-enter-easing')};
  }
  /* It comes out of the anchor's side: from below when it stands above the anchor, and so on round. */
  .surface[data-side='top'] {
    --_from-y: ${t('motion-enter-offset')};
  }
  .surface[data-side='bottom'] {
    --_from-y: calc(-1 * ${t('motion-enter-offset')});
  }
  .surface[data-side='left'] {
    --_from-x: ${t('motion-enter-offset')};
  }
  .surface[data-side='right'] {
    --_from-x: calc(-1 * ${t('motion-enter-offset')});
  }
  /* Where motion is reduced it fades, and neither grows nor travels. */
  @media (prefers-reduced-motion: reduce) {
    .motion {
      transform: none;
    }
  }

  /* TIP-1, TIP-3, TIP-28: the delays, the touch timeout and the warm time, read through real properties by script; this
     element draws nothing. */
  .timing {
    display: none;
    transition-property: none;
    transition-delay: ${t('motion-show-delay')};
    transition-duration: ${t('motion-hide-delay')};
    animation-duration: ${t('timeout-touch')};
    animation-delay: ${t('motion-warm-duration')};
  }

  /* TIP-12: corner smoothing on the container (data-tanrei-shape). */
  ${shape}

  @media (forced-colors: active) {
    .bubble {
      border: 1px solid CanvasText;
    }
    /* The arrow shows as the edge's color, and nothing is shaded. */
    .arrow {
      background: CanvasText;
    }
    .motion {
      filter: none !important;
    }
  }
`;
