import { css, unsafeCSS } from 'lit';

// Every visual value is a token (tokens/comp/modal-layer.tokens.json). The layer draws its scrim and nothing else: its
// container has no color, edge, shadow, shape or padding of its own (MDL-11), and the content is the product's.
const PREFIX = '--tanrei-comp-modal-layer';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

/** The window's safe area less the on-screen keyboard (MDL-11): the room the container is laid out in. */
const INLINE_ROOM = 'calc(100% - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))';
const BLOCK_ROOM = 'calc(100% - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - var(--_keyboard, 0px))';

export const styles = css`
  :host {
    display: contents;
  }

  /* MDL-1, MDL-11: a native modal <dialog> in the top layer, at the size of its content, centred in the window's safe
     area above the keyboard and never larger than it (the content scrolls inside it where it is larger). It draws
     nothing: none of the browser's dialog box, and the color and type of the page around it. A product places or
     sizes it with ::part(container). */
  dialog {
    box-sizing: border-box;
    position: fixed;
    inset: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) calc(env(safe-area-inset-bottom, 0px) + var(--_keyboard, 0px))
      env(safe-area-inset-left, 0px);
    margin: auto;
    inline-size: fit-content;
    max-inline-size: ${unsafeCSS(INLINE_ROOM)};
    block-size: fit-content;
    max-block-size: ${unsafeCSS(BLOCK_ROOM)};
    border: 0;
    padding: 0;
    overflow: auto;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    outline: none;
    /* MDL-7: out, it fades over the exit motion — kept in the top layer and displayed until it has. */
    opacity: 0;
    transition-property: opacity, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  dialog[open] {
    opacity: 1;
    /* MDL-7: in, it fades in over the enter motion. */
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog[open] {
      opacity: 0;
    }
  }

  /* MDL-1, MDL-7: the scrim over the whole window behind the container, its color (alpha included) and its blur of what
     lies behind, fading with the container. Opacity is all that moves, so reduced motion changes nothing here. */
  dialog::backdrop {
    background: ${t('scrim-color')};
    backdrop-filter: blur(${t('scrim-blur')});
    opacity: 0;
    transition-property: opacity, display, overlay;
    transition-duration: ${t('motion-exit-duration')};
    transition-timing-function: ${t('motion-exit-easing')};
    transition-behavior: allow-discrete;
  }
  dialog[open]::backdrop {
    opacity: 1;
    transition-duration: ${t('motion-enter-duration')};
    transition-timing-function: ${t('motion-enter-easing')};
  }
  @starting-style {
    dialog[open]::backdrop {
      opacity: 0;
    }
  }
  /* MDL-1: without the scrim the backdrop is drawn as nothing — and still takes every press behind the container. */
  :host([no-scrim]) dialog::backdrop {
    background: transparent;
    backdrop-filter: none;
  }
`;
