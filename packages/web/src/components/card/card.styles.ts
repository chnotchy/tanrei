import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusRing, minimumTarget, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/card.tokens.json). For each state an interactive card reads that state's
// tokens — it never computes how a state looks: hover, focus and press mix the variant's container with its
// `state-layer.color` in the default system, draw nothing in cupertino, and a disabled card dims as a whole, by value.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['elevated', 'filled', 'outlined'] as const;
const DEFAULT_VARIANT = 'outlined';
const STATES = { '': '', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
const PARTS = { c: 'container-color', l: 'content-color', o: 'outline-color', e: 'container-elevation' } as const;

const PREFIX = '--tanrei-comp-card';
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// Private custom properties (`--_c-h` = container, hovered) select the variant's tokens once per host.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([state, suffix]) => Object.entries(PARTS).map(([key, part]) => `  --_${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}${part}`, variant, fallback)};`))
    .join('\n')}\n}`;

/**
 * The open axis (CRD-7): a variant a layer added gets its block on demand, built by the same function as the
 * core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-${value}-container-color` },
];

/**
 * Everything a state paints except its container color: the content color (inherited by the slotted content, CRD-13),
 * the elevation, and the outline — which the `.outline` layer above the content draws from `--_outline` (CRD-12).
 */
const paintContent = (suffix: string) => `
    color: var(--_l${suffix});
    box-shadow: var(--_e${suffix});
    --_outline: var(--_o${suffix});`;
const paint = (suffix: string) => `
    background: var(--_c${suffix});${paintContent(suffix)}`;

// The pieces every control shares (src/primitives): the state rules and their precedence, the ripple, the focus
// indicator (ring or glow), the minimum target and the carrier of press-hold, plus the one corner rule
// (styles/shape.ts). A card answers states only while it is an action (role="button", CRD-11); it is not a
// native button, so its disabled condition is `aria-disabled` (CRD-2).
// CRD-19: a link card's container is an anchor, and answers every state as the element with the button role does, from
// the same tokens; ACTION names either, and weighs what `[role='button']` weighed.
const ACTION = ".container:is([role='button'], a)";
const on = (state: string) => `${ACTION}${state === ':disabled' ? "[aria-disabled='true']" : state}`;

export const styles = css`
  :host {
    display: block;
  }
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}

  .container {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple can sit above the container color and below the content. */
    isolation: isolate;
    display: block;
    /* CRD-12: no height of its own — it grows with its content. */
    ${unsafeCSS(cornerRadius('--tanrei-comp-card-container-shape'))}
    ${unsafeCSS(paint(''))}
    -webkit-tap-highlight-color: transparent;
    /* CRD-16: a state change of the colors, the elevation and the opacity is animated. */
    transition-property: background-color, color, box-shadow, opacity;
    transition-duration: var(--tanrei-comp-card-motion-state-duration);
    transition-timing-function: var(--tanrei-comp-card-motion-state-easing);
  }
  /* CRD-8: a press never selects the card's text nor starts a drag of it — one action, kept from selection as a button is. */
  ${unsafeCSS(ACTION)} {
    cursor: pointer;
    outline: none;
    -webkit-user-select: none;
    user-select: none;
  }
  /* CRD-19: the anchor of a link card is the card's shape and nothing of a text link — no underline, and the content
     color of its variant and state (above), never the browser's link or visited color. */
  a.container {
    text-decoration: none;
  }

  /* CRD-12: the content is clipped to the container's shape (a box of its own, so the focus ring and the target outside
     the container are not clipped with it) and inset by the padding on every side — logical, so RTL mirrors (CRD-17). */
  .clip {
    display: block;
    /* A stacking context of its own: content that stacks itself (z-index) stays under the outline, and the content is
       hit above the container's target (::before). */
    isolation: isolate;
    overflow: hidden;
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    corner-shape: inherit;
    padding: var(--tanrei-comp-card-container-padding);
  }
  :host([flush]) .clip {
    padding: 0;
  }

  /* CRD-12: the outlined variant's edge, above the content (media that reaches the edges does not cover it), inside the
     container, comp.card.outline.width wide. The other variants' outline color is transparent. */
  .outline {
    position: absolute;
    inset: 0;
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    corner-shape: inherit;
    box-shadow: inset 0 0 0 var(--tanrei-comp-card-outline-width) var(--_outline);
    pointer-events: none;
    transition: box-shadow var(--tanrei-comp-card-motion-state-duration) var(--tanrei-comp-card-motion-state-easing);
  }

  /* CRD-5: the hit area meets the minimum target without changing the visual size. */
  ${minimumTarget(ACTION)}

  /* CRD-3, CRD-6, CRD-8, CRD-9: each state paints from that state's tokens; pressed > focused > hovered, disabled over
     all. Pressed is data-pressed="<feedback>" (PressController): overlay paints the pressed tokens on the whole container;
     ripple and dim paint everything else from them while the container color stays with the state under the press
     (ripple adds the pressed color as a layer, dim adds none); none paints nothing. */
  ${stateRules(on, {
    hovered: `${paint('-h')}
    opacity: var(--tanrei-comp-card-hovered-opacity);`,
    focused: `${paint('-f')}
    opacity: var(--tanrei-comp-card-focused-opacity);`,
    pressed: `${paint('-p')}
    opacity: var(--tanrei-comp-card-pressed-opacity);`,
    pressedContent: `${paintContent('-p')}
    opacity: var(--tanrei-comp-card-pressed-opacity);`,
    disabled: `
    cursor: default;${paint('-d')}
    opacity: var(--tanrei-comp-card-disabled-opacity);`,
  })}

  /* CRD-8: the outline takes the pressed state without a transition in, as the container does. */
  .container[data-pressed]:not([data-pressed='none']) .outline {
    transition-duration: 0s;
  }

  /* CRD-9 ripple: grows over comp.card.motion.feedback-duration and fades over motion.state-duration, both with
     motion.state-easing, under the content and the outline. */
  ${rippleStyles({
    color: '--_c-p',
    grow: '--tanrei-comp-card-motion-feedback-duration',
    fade: '--tanrei-comp-card-motion-state-duration',
    easing: '--tanrei-comp-card-motion-state-easing',
  })}

  /* CRD-4 and CRD-10 focus-style: the ring (or the glow), never animated. */
  ${focusRing(on)}

  /* CRD-10, corner smoothing: the shared rule, on the container (data-tanrei-shape); the clip, the outline, the ripple
     and the ring are concentric with it and inherit its curve. */
  ${shape}

  /* CRD-8: the clip carries press-hold for PressController. */
  ${pressHold('.clip')}

  @media (prefers-reduced-motion: reduce) {
    .container,
    .outline {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .outline {
      border: var(--tanrei-comp-card-outline-width) solid CanvasText;
    }
    ${unsafeCSS(ACTION)} .outline {
      border-color: ButtonText;
    }
    .container[aria-disabled='true'] {
      color: GrayText;
    }
    .container[aria-disabled='true'] .outline {
      border-color: GrayText;
    }
  }
`;
