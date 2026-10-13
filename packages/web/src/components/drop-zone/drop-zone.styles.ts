import { css, unsafeCSS } from 'lit';
import { productText } from '../../styles/product-text.js';
import { iconGlyph } from '../../styles/icons.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/drop-zone.tokens.json). At rest nothing here is drawn (DRZ-1): the slot
// passes the product's content through, and the overlay is laid out but hidden, so that its glyph is measured before a
// drag ever comes (DRZ-21) and appears without a frame of its name.
export const PREFIX = '--tanrei-comp-drop-zone';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));

export const styles = css`
  /* DRZ-1: a box of the size its layout gives it; the product lays its content out by styling the host. DRZ-6: the
     host is the overlay's containing block and one stacking context of its own, so the overlay — last, at the greatest
     z-index — stands above everything the content stacks, and inside the host's box. */
  :host {
    display: block;
    position: relative;
    isolation: isolate;
  }
  :host([hidden]) {
    display: none;
  }

  /* DRZ-4, DRZ-6: one layer over the host's padding box: the scrim. It takes no press, pointer, wheel or scroll — they
     reach the content beneath it — and follows the host's own corners. DRZ-16: it fades in and out; visibility follows
     the fade out, so it is hidden only once it has faded. */
  .overlay {
    position: absolute;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    border-radius: inherit;
    overflow: hidden;
    background-color: ${t('scrim-color')};
    visibility: hidden;
    opacity: 0;
    transition:
      opacity ${t('motion-duration')} ${t('motion-easing')},
      visibility 0s linear ${t('motion-duration')};
    --_edge: ${t('outline-color')};
    --_icon: ${t('icon-color')};
  }
  .overlay[data-drag] {
    visibility: visible;
    opacity: 1;
    transition:
      opacity ${t('motion-duration')} ${t('motion-easing')},
      visibility 0s;
  }
  /* DRZ-5: refusing changes the edge and the glyph alone. */
  .overlay[data-drag='refusing'] {
    --_edge: ${t('refusing-outline-color')};
    --_icon: ${t('refusing-icon-color')};
  }
  /* DRZ-4: the edge, solid, drawn inside the box. */
  .edge {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border: ${t('outline-width')} solid var(--_edge);
    border-radius: inherit;
    transition: border-color ${t('motion-duration')} ${t('motion-easing')};
  }
  /* DRZ-6: the part of the box that is in view, written by the element on each drag event (the whole box until then);
     the panel is centred in it, panel.margin from its edges, and clipped by it where it is the smaller. */
  .view {
    position: absolute;
    box-sizing: border-box;
    /* Physical: the element measures the part in view on the screen's axes. */
    top: var(--_view-top, 0px);
    left: var(--_view-left, 0px);
    width: var(--_view-width, 100%);
    height: var(--_view-height, 100%);
    padding: ${t('panel-margin')};
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  /* DRZ-4: the panel — its fill, lift and eased corners, its paddings, one centred column of the glyph and the message. */
  .panel {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${t('panel-gap')};
    max-inline-size: min(100%, ${t('panel-max-width')});
    max-block-size: 100%;
    padding-block: ${t('panel-padding-block')};
    padding-inline: ${t('panel-padding-inline')};
    background-color: ${t('panel-container-color')};
    box-shadow: ${t('panel-elevation')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-panel-shape`))}
    text-align: center;
  }
  ${iconGlyph('.icon', { size: `${PREFIX}-icon-size`, selected: ':not(*)' })}
  .icon {
    color: var(--_icon);
    transition: color ${t('motion-duration')} ${t('motion-easing')};
  }
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  /* DRZ-21: nothing in the glyph's place until the icon set can draw it; the box keeps its size. */
  .icon:not([data-drawn]) {
    visibility: hidden;
  }
  /* DRZ-4, DRZ-18: the message, centred, on as many lines as it needs and never cut. */
  .label {
    font: ${t('label-typescale-font')};
    letter-spacing: ${t('label-typescale-letter-spacing')};
    color: ${t('label-color')};
    max-inline-size: 100%;
    overflow-wrap: anywhere;
  }
  /* DRZ-19: the message is text of its own direction, isolated; its lines are centred in either direction. */
  ${productText('.label')}
  ${shape}

  /* DRZ-11: the one live region, read and never seen. */
  .announcer {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  /* DRZ-16: where motion is reduced, the overlay is shown and hidden at once. */
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .overlay[data-drag],
    .edge,
    .icon {
      transition: none;
    }
  }
  /* DRZ-17: forced colors remove the scrim and the panel's fill and lift. The edge is drawn twice as wide, solid, in
     the highlight color; the panel on the background color with an edge in the text color; the message in the text
     color. Refusing keeps its block glyph. */
  @media (forced-colors: active) {
    .edge {
      border-width: calc(${t('outline-width')} * 2);
      border-color: Highlight;
    }
    .panel {
      background-color: Canvas;
      border: ${t('outline-width')} solid CanvasText;
    }
    .label,
    .icon {
      color: CanvasText;
    }
  }
`;
