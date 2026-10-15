import { css, unsafeCSS } from 'lit';
import { directionProbeStyles, focusRing, iconGlyph, minimumTarget, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/carousel.tokens.json). An item reads, per state, its content color,
// opacity and corner shape, and its state layer — `item.state-layer.color` of the state at the system's state-layer
// opacity — which it draws OVER its content (CRL-16): a product's content is usually an image that covers the item, so
// a layer mixed into the container underneath would never be seen. The container under the content keeps the resting
// fill. The indicator and the playback control are the part axis' other two values: each has its container and content
// colors per state, and they share the geometry under `controls.*`. How a state looks is the design system's decision;
// nothing here computes it.

const PREFIX = '--tanrei-comp-carousel';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
/** The spec's states with the sys.state opacity each one's layer is drawn at. */
const LAYER_OPACITY = { hovered: 'hover', focused: 'focus', pressed: 'pressed' } as const;

/** Everything a state paints except its state layer: the content color, the opacity and the corner shape (CRL-2). */
const paintContent = (state: keyof typeof LAYER_OPACITY) => `
    color: var(${PREFIX}-item-${state}-content-color);
    opacity: var(${PREFIX}-${state}-opacity);${cornerRadius(`${PREFIX}-${state}-container-shape`)}`;
/** The state layer of a state (CRL-16): its color and the sys.state opacity it is drawn at. */
const paintLayer = (state: keyof typeof LAYER_OPACITY) => `
    --_layer: var(${PREFIX}-item-${state}-state-layer-color);
    --_layer-opacity: var(--tanrei-sys-state-${LAYER_OPACITY[state]}-state-layer-opacity);`;
const paint = (state: keyof typeof LAYER_OPACITY) => `${paintContent(state)}${paintLayer(state)}`;

// The pieces every control shares (src/primitives): the state rules and their precedence, the ripple, the focus
// indicator (ring or glow, drawn inside: the row would clip one outside, CRL-3), the minimum target and the
// carrier of press-hold, plus the one corner rule (styles/shape.ts).
const on = (state: string) => `.container${state}`;

/** One item: `<tanrei-carousel-item>`, placed by its carousel. */
export const itemStyles = css`
  /* CRL-8, CRL-12, CRL-40: the carousel places the item — the drawn container's start and width along the row (after any
     scale: the gap to its neighbours is between these edges), as tall as the row. */
  :host {
    position: absolute;
    inset-block: 0;
    inset-inline-start: var(--_x, 0px);
    inline-size: var(--_w, 0px);
    display: block;
    box-sizing: border-box;
  }

  /* CRL-26: the container is as wide as the item's box — the carousel already gave that box the scaled slot's width, so
     nothing shrinks inside it and the gap stays (CRL-40) — and as tall as the row times the item's scale (1 unless the
     carousel scales the others), centred on the row's height; the ring inside it keeps its own width, and the hit area
     follows it. */
  .container {
    box-sizing: border-box;
    position: absolute;
    inset: 0;
    margin-block: auto;
    block-size: calc(100% * var(--_scale, 1));
    /* Its own stacking context: the content, the state layer, the ripple and the ring stack inside it. */
    isolation: isolate;
    display: block;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    /* CRL-16: the resting fill under the content, in every state; the content's inherited color. */
    background: ${t('item-container-color')};
    color: ${t('item-content-color')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    /* At rest there is no state layer: nothing is drawn over the content. */
    --_layer: ${t('item-state-layer-color')};
    --_layer-opacity: 0;
    /* CRL-6: the ripple is the pressed state layer. */
    --_ripple: ${t('item-pressed-state-layer-color')};
    /* CRL-22: a change of the colors and the opacity is animated. */
    transition-property: color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }

  /* CRL-15: the content is clipped to the container's corners (concentric with it) and laid out at the hero's width and
     the row's height; the carousel writes where it sits in the container — centred, or toward the hero — physically, so
     a right-to-left row does not mirror it (CRL-23). CRL-26: it is drawn at the item's scale. The content is
     presentational: a press anywhere on the item is the item's (CRL-20). */
  .clip {
    position: absolute;
    inset: 0;
    /* clip, not hidden: a box that hides overflow is a scroll container, which a right-to-left engine may scroll to its
       own start and so shift the content (WebKit, by a pixel). */
    overflow: clip;
    isolation: isolate;
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    corner-shape: inherit;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .content {
    position: absolute;
    top: 0;
    left: var(--_content-left, 0px);
    inline-size: var(--_content, 100%);
    block-size: calc(100% / var(--_scale, 1));
    scale: var(--_scale, none);
    transform-origin: 0 0;
    display: grid;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  }

  /* CRL-16: the state layer, over the content, clipped to the container's corners. */
  .state-layer {
    position: absolute;
    z-index: 1;
    inset: 0;
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    corner-shape: inherit;
    background: var(--_layer);
    opacity: var(--_layer-opacity);
    pointer-events: none;
    transition-property: background-color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }

  /* CRL-4: the hit area is the drawn container with half the gap on each side — sys.target.touch for the narrowest small
     item with the default tokens — and, for an item that fills a slot, never less than the target (pointer, or touch for
     a coarse pointer) on either axis. An item on its way to or from an edge slot is narrower than any slot: the carousel
     takes the floor away (--_hit-floor), so its hit area never covers its neighbour's. */
  ${minimumTarget('.container')}
  .container::before {
    inline-size: max(calc(100% + ${t('layout-gap')}), var(--_hit-floor, var(--tanrei-sys-target-pointer)));
  }
  @media (pointer: coarse) {
    .container::before {
      inline-size: max(calc(100% + ${t('layout-gap')}), var(--_hit-floor, var(--tanrei-sys-target-touch)));
    }
  }

  /* CRL-2, CRL-5, CRL-6: each state paints from that state's tokens; pressed > focused > hovered. Pressed is
     data-pressed="<feedback>" (PressController): overlay paints the pressed tokens, its state layer included; ripple and
     dim paint everything else from them while the state layer stays with the state under the press (the ripple adds the
     pressed layer from the point of contact, dim none); none paints nothing. */
  ${stateRules(on, {
    hovered: paint('hovered'),
    focused: paint('focused'),
    pressed: paint('pressed'),
    pressedContent: paintContent('pressed'),
    disabled: '',
  })}

  /* CRL-5: the state layer takes the pressed state without a transition in, as the container does. */
  .container[data-pressed]:not([data-pressed='none']) .state-layer {
    transition-duration: 0s;
  }

  /* CRL-6 ripple: the pressed state layer, grown from the point of contact over motion.feedback-duration and faded over
     motion.state-duration once the press and press-hold are over — over the content, under the ring (CRL-16). */
  ${rippleStyles({
    color: '--_ripple',
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}
  .ripple {
    z-index: 2;
    opacity: var(--tanrei-sys-state-pressed-state-layer-opacity);
  }

  /* CRL-3, CRL-7 focus-style: the ring (or the glow) inside the container, over the content; never animated. */
  ${focusRing(on, { inside: true })}
  .container::after {
    z-index: 3;
  }

  /* CRL-7, corner smoothing: the shared rule, on the container (data-tanrei-shape); the clip, the state layer, the
     ripple and the ring are concentric with it and inherit its curve. */
  ${shape}

  /* CRL-5: the clip carries press-hold for PressController. */
  ${pressHold('.clip')}

  @media (prefers-reduced-motion: reduce) {
    .container,
    .state-layer {
      transition: none;
    }
  }
`;

const STATES = { '': '-r', hovered: '-h', focused: '-f', pressed: '-p' } as const;
/** One control's colors in every state, as `--_c-h` (container, hovered), `--_o-p` (content, pressed)… */
const controlBlock = (control: 'indicator' | 'playback', selector: string) =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([state, suffix]) => [
      `  --_c${suffix}: var(${PREFIX}-${control}-${state ? `${state}-` : ''}container-color);`,
      `  --_o${suffix}: var(${PREFIX}-${control}-${state ? `${state}-` : ''}content-color);`,
    ])
    .join('\n')}\n}`;
/** Where a control's state is read (CRL-2): on the control (the slider, the native button). */
const onControl = (state: string) => `.control${state}`;
const paintControl = (suffix: string, state: keyof typeof LAYER_OPACITY, container = true) => `${container ? `\n    background: var(--_c${suffix});` : ''}
    color: var(--_o${suffix});
    opacity: ${T(`${state}-opacity`)};`;

/** The carousel: `<tanrei-carousel>` — the row, and the controls row below it. */
export const carouselStyles = css`
  /* CRL-8: as wide as its parent; the row of items comp.carousel.layout.height tall and the controls row (CRL-28) below
     it, unless the product sizes the carousel, when the row takes that height less the controls row. CRL-4: never less
     tall than the target. */
  :host {
    display: flex;
    flex-direction: column;
    position: relative;
    min-block-size: var(--tanrei-sys-target-pointer);
  }
  @media (pointer: coarse) {
    :host {
      min-block-size: var(--tanrei-sys-target-touch);
    }
  }

  /* The row and the controls drawn over its ends (CRL-41): it takes the row's place in the carousel's column, and
     shrinks with it when the product sizes the carousel (CRL-8). */
  .viewport {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    position: relative;
    min-block-size: 0;
  }

  /* CRL-41: the previous control's start edge at the inner start edge and the next control's end edge at the inner end
     edge, centred on the row's height, over the items. They are Buttons, drawn by their own tokens. */
  .navigation {
    position: absolute;
    z-index: 1;
    inset-block-start: 50%;
    translate: 0 -50%;
    transition-property: opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  .navigation.previous {
    inset-inline-start: ${t('layout-padding-inline')};
  }
  .navigation.next {
    inset-inline-end: ${t('layout-padding-inline')};
  }
  /* CRL-41, CRL-42: auto draws them only for a primary pointer that is fine and can hover, and shows them while the
     carousel is hovered or holds focus; hidden, they keep their place in the Tab order, and focus shows them. */
  @media not all and (hover: hover) and (pointer: fine) {
    .navigation.auto {
      display: none;
    }
  }
  .navigation.auto {
    opacity: 0;
  }
  :host(:hover) .navigation.auto,
  :host(:focus-within) .navigation.auto {
    opacity: 1;
  }

  /* CRL-14: a native horizontal scroller (wheel, trackpad, touch and pen scroll as the platform does), without a scroll
     bar. Its inert animation timing carries comp.carousel.motion.scroll-*, read by the settle, the scroll into place and
     a dot's move. */
  .scroller {
    box-sizing: border-box;
    flex: 1 1 auto;
    /* CRL-8: the carousel is as wide as its parent, and where its parent is as wide as its content — a table cell, an
       inline block, a flex item that is not stretched — it has a width of its own that no item changes: one hero and
       the padding on each side. Without this the row's own content would be that width — the track, which is the
       carousel's width plus the scroll range — so every arrangement would widen the carousel it had just measured,
       without end. */
    contain: inline-size;
    contain-intrinsic-inline-size: calc(var(--_hero, ${t('container-large-width')}) + 2 * ${t('layout-padding-inline')});
    block-size: ${t('layout-height')};
    min-block-size: var(--tanrei-sys-target-pointer);
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    animation-duration: ${t('motion-scroll-duration')};
    animation-timing-function: ${t('motion-scroll-easing')};
  }
  @media (pointer: coarse) {
    .scroller {
      min-block-size: var(--tanrei-sys-target-touch);
    }
  }
  /* CRL-14: while a fling's settle runs, the browser's own momentum stops and a pan cannot start; the offset is still
     set by the settle. */
  .scroller.held {
    overflow-x: hidden;
  }
  .scroller::-webkit-scrollbar {
    display: none;
  }

  /* The track is as long as the scroll range (CRL-12, CRL-13, CRL-27); the carousel sets its length. */
  .track {
    position: relative;
    block-size: 100%;
    inline-size: var(--_track, 100%);
  }

  /* CRL-8, CRL-12, CRL-19: the items lie on a stage that stays in view, as wide as the carousel, and clips them at its
     edges; it is the list the items belong to. */
  .stage {
    position: sticky;
    inset-inline-start: 0;
    block-size: 100%;
    inline-size: var(--_view, 100%);
    overflow: clip;
  }

  /* CRL-28: the controls row, directly below the items, as wide as the carousel; the indicator centred on its width. */
  .controls {
    flex: none;
    display: grid;
    grid-template: 100% / 100%;
    place-items: center;
    block-size: ${t('controls-height')};
  }

  ${unsafeCSS(controlBlock('indicator', '.indicator'))}
  ${unsafeCSS(controlBlock('playback', '.playback'))}
  /* CRL-2, CRL-7, CRL-22: a control's container and content colors at rest, on controls.shape corners. */
  .control {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the content. */
    isolation: isolate;
    ${unsafeCSS(cornerRadius(`${PREFIX}-controls-shape`))}
    background: var(--_c-r);
    color: var(--_o-r);
    cursor: pointer;
    outline: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    --_ripple: var(--_c-p);
    transition-property: background-color, color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }

  /* CRL-29: the dots in reading order, dot.gap apart, inside a container controls.button-size tall that reaches
     controls.indicator-padding-inline beyond the first and last dot. The current dot's fill is the content color. */
  .indicator {
    display: flex;
    align-items: center;
    gap: ${t('dot-gap')};
    block-size: ${t('controls-button-size')};
    padding-inline: ${t('controls-indicator-padding-inline')};
    /* CRL-30: a horizontal drag along the dots is the indicator's; a vertical one still scrolls the page. */
    touch-action: pan-y;
  }
  /* CRL-37: the indicator's hit area is as tall as the controls row and as wide as its container, at least
     sys.target.touch wide. */
  .indicator::before {
    content: '';
    position: absolute;
    inset-block: calc((${t('controls-button-size')} - ${t('controls-height')}) / 2);
    inset-inline: min(0px, calc((100% - var(--tanrei-sys-target-touch)) / 2));
  }
  /* CRL-29: each dot dot.size tall with round ends, stretched toward dot.active-width by its closeness w to the
     indicator's position (--_w, written by the carousel as the row scrolls), in dot.color with the content color over it
     at opacity w. */
  .dot {
    position: relative;
    flex: none;
    overflow: clip;
    inline-size: calc(${t('dot-size')} + (${t('dot-active-width')} - ${t('dot-size')}) * var(--_w, 0));
    block-size: ${t('dot-size')};
    border-radius: ${t('dot-size')};
    background: ${t('dot-color')};
  }
  .fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: 100%;
    background: currentColor;
    opacity: var(--_w, 0);
  }
  /* CRL-36: with the progress drawn, only the dot the row last came to rest at fills, from its start edge across the
     part of the interval that has passed, fading as the dot narrows. The part is the fill's scale along the row, which
     one animation of the interval's length runs (carousel.ts, drawProgress): nothing is laid out and no script runs
     while it fills. */
  .indicator.progress .fill {
    opacity: 0;
  }
  .indicator.progress .dot.timed .fill {
    transform: scaleX(0);
    transform-origin: 0 50%;
    opacity: var(--_w, 0);
  }
  :host(:dir(rtl)) .indicator.progress .dot.timed .fill {
    transform-origin: 100% 50%;
  }
  .indicator .hold {
    display: none;
  }

  /* CRL-28, CRL-35: the playback control at the controls row's inline end, its end edge at the inner end edge, centred on
     the row's height: an icon-only button, a controls.button-size square. It comes first in the tree (the first Tab stop,
     CRL-17), so it is placed against the carousel's bottom edge. */
  .playback {
    all: unset;
    box-sizing: border-box;
    position: absolute;
    z-index: 1;
    inset-inline-end: ${t('layout-padding-inline')};
    inset-block-end: calc((${t('controls-height')} - ${t('controls-button-size')}) / 2);
    display: grid;
    place-items: center;
    inline-size: ${t('controls-button-size')};
    block-size: ${t('controls-button-size')};
    ${unsafeCSS(cornerRadius(`${PREFIX}-controls-shape`))}
    background: var(--_c-r);
    color: var(--_o-r);
    cursor: pointer;
    isolation: isolate;
    -webkit-tap-highlight-color: transparent;
    --_ripple: var(--_c-p);
    transition-property: background-color, color, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
  }
  /* CRL-35, CRL-23: the pause and play_arrow glyphs of the icon set, unselected, at controls.icon.size; never mirrored. */
  ${iconGlyph('.icon', { size: `${PREFIX}-controls-icon-size`, selected: ':not(*)', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  /* CRL-38: until the icon set can draw the glyph, its box stays and shows nothing. */
  .icon.loading {
    visibility: hidden;
  }
  /* CRL-37: the playback control's hit area meets the target without changing its visual size. */
  ${minimumTarget('.playback')}

  /* CRL-2, CRL-5, CRL-6: each state paints the control from that state's tokens; pressed > focused > hovered. The other
     dots keep dot.color in every state. */
  ${stateRules(onControl, {
    hovered: paintControl('-h', 'hovered'),
    focused: paintControl('-f', 'focused'),
    pressed: paintControl('-p', 'pressed'),
    pressedContent: paintControl('-p', 'pressed', false),
    disabled: '',
  })}

  /* CRL-6 ripple: grows over motion.feedback-duration and fades over motion.state-duration. */
  ${rippleStyles({
    color: '--_ripple',
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}

  /* CRL-3, CRL-7 focus-style: the ring (or the glow) around the focused control, never animated. */
  ${focusRing(onControl)}

  /* CRL-7: corner smoothing on the controls (data-tanrei-shape). */
  ${shape}

  /* CRL-5: the glyph and the indicator's hidden carrier hold press-hold for PressController. */
  ${pressHold('.hold')}

  /* The tokens the arrangement is computed from, measured through real properties: padding, gap, the large width and
     the least and greatest small width; the dots, the indicator's padding and the touch target (CRL-29's fit); the
     least scale (CRL-26), a number, through flex-grow. */
  .probe {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 0;
    block-size: 0;
    visibility: hidden;
    pointer-events: none;
    padding-left: ${t('layout-padding-inline')};
    padding-right: ${t('layout-gap')};
    padding-top: ${t('container-large-width')};
    padding-bottom: ${t('container-small-min-width')};
    margin-left: ${t('container-small-max-width')};
  }
  /* CRL-23: what tells the script that the direction it inherits changed (primitives/direction.ts). */
  ${directionProbeStyles}
  .probe-controls {
    padding-left: ${t('dot-size')};
    padding-right: ${t('dot-active-width')};
    padding-top: ${t('dot-gap')};
    padding-bottom: ${t('controls-indicator-padding-inline')};
    margin-left: var(--tanrei-sys-target-touch);
    flex-grow: ${t('container-min-scale')};
  }
  /* CRL-32: the interval, and the motion of an advance, read through real properties by script; this element draws
     nothing. The interval is a reading time: reduced motion does not touch it (autoplay does not run there at all). */
  .timing {
    display: none;
    transition-property: none;
    transition-delay: ${t('autoplay-interval')};
    animation-duration: ${t('motion-autoplay-duration')};
    animation-timing-function: ${t('motion-autoplay-easing')};
  }

  /* CRL-14, CRL-18, CRL-22, CRL-30: at once where motion is reduced. */
  @media (prefers-reduced-motion: reduce) {
    .scroller {
      animation-duration: 0s;
    }
    .control,
    .playback,
    .navigation {
      transition: none;
    }
  }

  @media (forced-colors: active) {
    .control,
    .playback {
      border: 1px solid ButtonText;
    }
    .dot {
      background: GrayText;
    }
    .fill {
      background: CanvasText;
    }
  }
`;
