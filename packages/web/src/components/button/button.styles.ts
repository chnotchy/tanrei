import { css, unsafeCSS } from 'lit';
import { DISABLED, type OpenAxis, focusRing, groupItemStyles, iconGlyph, minimumTarget, pressHold, rippleStyles, stateRules, styledAsAnchorToo } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token. For each state the component reads that state's tokens — it never
// computes how a state looks. Whether hover is a state-layer mix, an explicit color, a dim, or
// nothing at all is decided by the active design system's values.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['filled', 'tonal', 'elevated', 'outlined', 'text'] as const;
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_VARIANT = 'filled';
const DEFAULT_SIZE = 'medium';
/**
 * BTN-12: the widths of an icon-only Button. A closed set: `default` is the height, `wide` a width of its size, and
 * `narrow` no width of its own: the glyph's box and an inset of its size on each side.
 */
export const WIDTHS = ['default', 'narrow', 'wide'] as const;
const STATES = { '': '', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
const PARTS = { c: 'container-color', l: 'label-color', i: 'icon-color', o: 'outline-color' } as const;
/**
 * The three looks of each variant (BTN-15): a plain button reads the variant's own parts, a toggle that is
 * off its `unselected.` parts, a toggle that is on its `selected.` parts. Elevation is the variant's in every look.
 */
const LOOKS = { plain: '', unselected: 'unselected-', selected: 'selected-' } as const;
/** The members of the size axis (tokens/comp/button.tokens.json, `dev.tanrei.axes`). */
const SIZE_MEMBERS = {
  height: 'container-height',
  'pad-start': 'container-padding-inline-start',
  'pad-start-icon': 'container-padding-inline-start-with-icon',
  'pad-end-icon': 'container-padding-inline-end-with-icon',
  'pad-end': 'container-padding-inline-end',
  'pad-block': 'container-padding-block',
  'pad-narrow': 'container-padding-inline-narrow',
  'width-wide': 'container-width-wide',
  font: 'label-typescale',
  icon: 'icon-size',
  'icon-alone': 'icon-size-without-label',
  gap: 'container-gap',
  'outline-width': 'outline-width',
} as const;

const PREFIX = '--tanrei-comp-button';
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// Per variant, every look's parts in every state, as private custom properties (`--_selected-c-h` = the selected look's
// container, hovered), and the elevation (`--_e-h`). The token of a state and a look is `<variant>-<state>-<look>-<part>`.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([state, suffix]) => [
      ...Object.entries(LOOKS).flatMap(([look, prefix]) =>
        Object.entries(PARTS).map(([key, part]) => `  --_${look}-${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}${prefix}${part}`, variant, fallback)};`),
      ),
      `  --_e${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}container-elevation`, variant, fallback)};`,
    ])
    .join('\n')}\n}`;

/**
 * Which look the container paints (BTN-15). It follows what assistive technology is told: `aria-pressed` is present only
 * on a toggle (BTN-14), and "true" only when it is selected — so the look and the announced state cannot disagree.
 */
const lookBlock = (look: keyof typeof LOOKS, selector: string) =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([, suffix]) => Object.keys(PARTS).map((key) => `  --_${key}${suffix}: var(--_${look}-${key}${suffix});`))
    .join('\n')}\n}`;

const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) =>
      member === 'label-typescale'
        ? [`  --_font: ${ref((v) => `${PREFIX}-${member}-${v}-font`, size, fallback)};`, `  --_tracking: ${ref((v) => `${PREFIX}-${member}-${v}-letter-spacing`, size, fallback)};`]
        : [`  --_${key}: ${ref((v) => `${PREFIX}-${member}-${v}`, size, fallback)};`],
    )
    .join('\n')}\n}`;

/**
 * The open axes (BTN-7): a size or variant a layer added gets its block on demand, built by the same functions
 * as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-${value}-container-color` },
];

/**
 * Everything a state paints except its container color. The border is an inset ring so it never changes the box size.
 * An icon beside a label takes the label's color; an icon alone takes the icon color (BTN-13). The state's shadows —
 * the outline's ring, then the elevation — are named (`--_shadow`) before they are drawn: joined to a neighbour in a
 * connected group the container leaves them to its `::after`, which is cut at the seam (`--_own-shadow`,
 * src/primitives/group-item.ts); anywhere else `--_own-shadow` is not set and the container draws them itself.
 */
const paintContent = (suffix: string) => `
    color: var(--_l${suffix});
    --_glyph-color: var(--_i${suffix});
    --_shadow: inset 0 0 0 var(--_outline-width) var(--_o${suffix}), var(--_e${suffix});
    box-shadow: var(--_own-shadow, var(--_shadow));`;
const paint = (suffix: string) => `
    background: var(--_c${suffix});${paintContent(suffix)}`;

// The pieces every control shares (src/primitives): the state rules and their precedence, the ripple, the focus
// indicator (ring or glow), the minimum target and the carrier of press-hold, plus the one corner rule
// (styles/shape.ts). Each takes this component's selectors and custom properties; nothing here is special.
// BTN-25: a disabled link is an anchor, which has no :disabled of its own (DISABLED names both forms' condition).
// BTN-36: a busy button carries aria-disabled too, and is drawn from its enabled tokens: neither hovered nor disabled.
// (:where() keeps each selector's weight, so the order of precedence among the states is as it was.)
const on = (state: string) => (state === ':disabled' ? `button${DISABLED}:where(:not(.busy))` : state === ':hover' ? 'button:hover:where(:not(.busy))' : `button${state}`);

const buttonStyles = css`
  :host {
    display: inline-flex;
    vertical-align: middle;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}
  /* DLG-20: without a variant attribute, the variant a dialog gives its action (src/primitives/group-item.ts). */
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host(:not([variant])) button[data-host-variant='${v}']`)).join('\n'))}
  ${unsafeCSS(lookBlock('plain', 'button'))}
  ${unsafeCSS(lookBlock('unselected', 'button[aria-pressed]'))}
  ${unsafeCSS(lookBlock('selected', "button[aria-pressed='true']"))}

  button {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple can sit above the container color and below the label. */
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--_gap);
    /* BTN-11: the padding of each side, which an icon on that side tightens (below). BTN-10: what a connected group adds
       to a side — the padding at a rounded outer end (src/primitives/group-item.ts) — is --_add-*; outside a connected
       group it is nothing. */
    --_pad-inline-start: var(--_pad-start);
    --_pad-inline-end: var(--_pad-end);
    --_add-start: 0px;
    --_add-end: 0px;
    --_add-top: 0px;
    --_add-bottom: 0px;
    min-block-size: calc(max(var(--_height), var(--_min-height)) + var(--_add-top) + var(--_add-bottom));
    padding-block: calc(var(--_pad-block) + var(--_add-top)) calc(var(--_pad-block) + var(--_add-bottom));
    padding-inline: calc(var(--_pad-inline-start) + var(--_add-start)) calc(var(--_pad-inline-end) + var(--_add-end));
    /* BGR-3: in a connected column an item is at least the target high; anywhere else there is no such minimum. */
    --_min-height: 0px;
    ${unsafeCSS(cornerRadius('--tanrei-comp-button-container-shape'))}
    ${unsafeCSS(paint(''))}
    font: var(--_font);
    letter-spacing: var(--_tracking);
    white-space: nowrap;
    -webkit-user-select: none;
    user-select: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, box-shadow, opacity, border-radius;
    transition-duration: var(--tanrei-comp-button-motion-state-duration);
    transition-timing-function: var(--tanrei-comp-button-motion-state-easing);
  }

  /* BTN-11: the padding on the icon's side is its own token (a step tighter in the default system). */
  button.with-icon {
    --_pad-inline-start: var(--_pad-start-icon);
  }
  /* BTN-11: a trailing icon follows the label in the reading direction, with the mirrored padding on its side. */
  button.with-trailing-icon {
    --_pad-inline-end: var(--_pad-end-icon);
  }
  button.with-trailing-icon .icon {
    order: 1;
  }
  /* BTN-12: an icon alone makes the button as wide as its width names — as wide as it is high by default, so corner.full
     draws a circle; its glyph's box (icon.size-without-label) and container.padding-inline-narrow on each side of it
     while narrow, or container.width-wide while wide, each of its size, which corner.full draws as a capsule (the
     browser caps a radius at half the shorter side) — the glyph centred. The narrow width is the glyph and that inset
     twice and nothing more: the button has no narrow width of its own, so it follows its glyph wherever a design system
     re-sizes it, and the container, its state layer, its ripple and its outline are a capsule of that width (28 / 32 /
     32 in the default system, whose inset is 4 at every size). The width is set, not padded: the inset is a term of
     the width and the container's own inline padding stays 0, so the glyph is centred at every width. Each term is a
     rem token, so the container grows with the root text size and keeps its proportion. BTN-21: the width is read here
     alone, so a labelled Button ignores it, and the hit area still reaches the target (minimumTarget, below). A
     connected group may widen it to the target (BGR-3) and adds its padding at an outer end (BGR-23): the glyph is then
     centred in what is left. */
  :host {
    --_width: var(--_height);
  }
  :host([width='narrow']) {
    --_width: calc(var(--_icon-alone) + 2 * var(--_pad-narrow));
  }
  :host([width='wide']) {
    --_width: var(--_width-wide);
  }
  button.icon-only {
    --_pad-inline-start: 0px;
    --_pad-inline-end: 0px;
    inline-size: calc(var(--_width) + var(--_add-start) + var(--_add-end));
    min-inline-size: calc(var(--_width) + var(--_add-start) + var(--_add-end));
  }
  /* BTN-39: full width — the host is as wide as its container and the container fills it, its content centred; a label
     that does not fit wraps, its lines centred, down to its longest word. An icon-only button centres its glyph and
     ignores width. Under the custom state \`placed\` a host lays the button out and gives it its width, so none of this
     applies (the button draws no full-width class then either). */
  :host([full-width]:not(:state(placed))) {
    display: flex;
    inline-size: 100%;
  }
  button.full-width {
    flex: 1 1 auto;
    white-space: normal;
    text-align: center;
  }
  button.full-width.icon-only {
    inline-size: auto;
  }
  button.icon-only .label,
  button:not(.has-icon) .icon {
    display: none;
  }

  /* BTN-5: the hit area meets the minimum target without changing the visual size. */
  ${minimumTarget('button')}

  /* BTN-3, BTN-6, BTN-8, BTN-9: each state paints from that state's tokens; pressed > focused > hovered, disabled over all.
     Pressed is data-pressed="<feedback>" (PressController): overlay paints the pressed tokens on the whole container;
     ripple and dim paint everything else from them while the container color stays with the state under the press
     (ripple adds the pressed color as a layer, dim adds none); none paints nothing. */
  ${stateRules(on, {
    hovered: `${paint('-h')}
    opacity: var(--tanrei-comp-button-hovered-opacity);${cornerRadius('--tanrei-comp-button-hovered-container-shape')}`,
    focused: `${paint('-f')}
    opacity: var(--tanrei-comp-button-focused-opacity);${cornerRadius('--tanrei-comp-button-focused-container-shape')}`,
    pressed: `${paint('-p')}
    opacity: var(--tanrei-comp-button-pressed-opacity);${cornerRadius('--tanrei-comp-button-pressed-container-shape')}`,
    pressedContent: `${paintContent('-p')}
    opacity: var(--tanrei-comp-button-pressed-opacity);${cornerRadius('--tanrei-comp-button-pressed-container-shape')}`,
    disabled: `
    cursor: default;${paint('-d')}
    opacity: var(--tanrei-comp-button-disabled-opacity);${cornerRadius('--tanrei-comp-button-disabled-container-shape')}`,
  })}

  /* BTN-9 ripple: grows over comp.button.motion.feedback-duration and fades over motion.state-duration, both with
     motion.state-easing, inside the outline. */
  ${rippleStyles({
    color: '--_c-p',
    inset: '--_outline-width',
    grow: '--tanrei-comp-button-motion-feedback-duration',
    fade: '--tanrei-comp-button-motion-state-duration',
    easing: '--tanrei-comp-button-motion-state-easing',
  })}

  /* BTN-4 and BTN-10 focus-style: the ring (or the glow), never animated. */
  ${focusRing(on)}

  /* BTN-10, corner smoothing: the shared rule, on the container (data-tanrei-shape) and, by inheritance, its ring. */
  ${shape}

  /* BTN-10, BGR-2…4: in a button group, the corners, width and hit area the group sets (src/primitives/group-item.ts). */
  ${groupItemStyles({ on: 'button', rippleInset: '--_outline-width' })}
  /* BGR-7: a group narrows its Buttons to fit its row, down to their longest word: the label wraps, centred. */
  button.joined {
    white-space: normal;
    text-align: center;
  }
  /* BGR-3: joined along a column, an item is at least the target high, its content centred. */
  button.connected {
    --_min-height: var(--tanrei-group-min-height, 0px);
  }
  /* BGR-12, BGR-17: an item fills the width its group gives it — a column's, a full-width share — its content centred;
     narrower than its content, its label wraps (down to its longest word). An icon-only item fills it around its
     centred glyph, and is never narrower than its own width (or the group's minimum, BGR-3). */
  button.stretch {
    flex: 1 1 auto;
  }
  button.icon-only.stretch {
    inline-size: auto;
  }
  button.icon-only.connected {
    min-inline-size: calc(max(var(--_width), var(--tanrei-group-min-width, 0px)) + var(--_add-start) + var(--_add-end));
  }

  /* BTN-8: the label carries press-hold for PressController. */
  ${pressHold('.label')}

  /* BTN-20: the label is text of its own direction — its first strong character's — isolated from what is around it, and
     still placed by the layout direction (the flex row) and centred where it wraps (BGR-7). */
  ${productText('.label')}

  /* BTN-13: the icon, drawn with the system's icon set — the family and fill of its selection (selected only on a toggle
     that is on: aria-pressed="true"), sys.icon.weight, and the optical size of its box — at icon.size beside a label and
     icon.size-without-label alone. BTN-19: iconGlyph() mirrors the slotted glyph GlyphMirrorController marked, in
     right-to-left, in its own box. */
  button {
    --_glyph: var(--_icon);
  }
  button.icon-only {
    --_glyph: var(--_icon-alone);
  }
  button.icon-only .icon {
    color: var(--_glyph-color);
  }
  ${iconGlyph('.icon', {
    size: '--_glyph',
    selected: "button[aria-pressed='true']",
    duration: '--tanrei-comp-button-motion-state-duration',
    easing: '--tanrei-comp-button-motion-state-easing',
  })}
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  /* A .tanrei-icon (icons.css) sizes its glyph from the box; an image or an SVG fills it. */
  ::slotted([slot='icon']) {
    inline-size: var(--_glyph);
    block-size: var(--_glyph);
    flex: none;
  }
  ::slotted(svg[slot='icon']),
  ::slotted(img[slot='icon']) {
    display: block;
  }

  /* BTN-8: an icon-only button's press-hold is carried by the icon slot (the icon box already transitions its fill). */
  ${pressHold('slot[name="icon"]')}

  /* BTN-24: the mark of a link that opens a new context — the icon set's open_in_new, drawn as BTN-11 draws a trailing
     icon: after the label (the row's gap from it), at icon.size, in the label color of the look and state (inherited),
     with the trailing icon's padding at the end edge. iconGlyph() mirrors it in right-to-left: the icon set marks its
     name, and GlyphMirrorController marks the box. */
  button.with-mark {
    --_pad-inline-end: var(--_pad-end-icon);
  }
  ${iconGlyph('.mark', {
    size: '--_icon',
    selected: "button[aria-pressed='true']",
    duration: '--tanrei-comp-button-motion-state-duration',
    easing: '--tanrei-comp-button-motion-state-easing',
  })}

  /* BTN-36: busy — the label and the icon keep their place and are not drawn, and the loading indicator's arc turns at
     the centre of the container, in the icon's box (beside a label, or alone), in the color its label (or its glyph)
     has, comp.button.busy.indicator.thickness thick, once per comp.button.motion.busy-cycle-duration. */
  button.busy {
    cursor: default;
  }
  /* (The label is transparent, not hidden: it is still the button's name.) */
  button.busy .label {
    opacity: 0;
  }
  button.busy .icon,
  button.busy .mark {
    visibility: hidden;
  }
  .busy-arc {
    --_ring: var(--_glyph);
    --_stroke: var(--tanrei-comp-button-busy-indicator-thickness);
    position: absolute;
    inset: 0;
    margin: auto;
    inline-size: var(--_ring);
    block-size: var(--_ring);
    pointer-events: none;
    animation: busy-turn var(--tanrei-comp-button-motion-busy-cycle-duration) var(--tanrei-sys-motion-easing-linear) infinite;
  }
  button.icon-only .busy-arc {
    color: var(--_glyph-color);
  }
  .busy-arc svg {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    transform: rotate(-90deg);
  }
  .busy-arc circle {
    --_c: calc(pi * (var(--_ring) - var(--_stroke)));
    cx: 50%;
    cy: 50%;
    r: calc(50% - var(--_stroke) / 2);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--_stroke);
    stroke-linecap: round;
    stroke-dasharray: max(0px, calc(var(--_c) / 4 - var(--_stroke))) var(--_c);
    stroke-dashoffset: calc(var(--_stroke) / -2);
  }
  @keyframes busy-turn {
    from {
      rotate: 0deg;
    }
    to {
      rotate: 360deg;
    }
  }
  @keyframes busy-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
  /* BTN-37: the polite region busyLabel is announced through, drawn nowhere. (Fixed to the window, so that the host
     needs no containing block of its own and the region widens no scroll box it stands in.) */
  .live {
    position: fixed;
    inset-block-start: 0;
    inset-inline-start: 0;
    overflow: hidden;
    inline-size: 1px;
    block-size: 1px;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
    /* BTN-36: LDG-4's form — the whole circle, its opacity easing once per cycle, not turning. */
    .busy-arc {
      animation: busy-pulse var(--tanrei-comp-button-motion-busy-cycle-duration) var(--tanrei-sys-motion-easing-standard) infinite;
    }
    .busy-arc circle {
      stroke-dasharray: none;
      stroke-dashoffset: 0;
    }
  }
  @media (forced-colors: active) {
    button {
      border: var(--_outline-width) solid ButtonText;
    }
    button${unsafeCSS(DISABLED)} {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;

/**
 * BTN-22: with a destination the container is an anchor, and it is the same styled part: every rule above that names
 * the native `button` names the anchor too, at the same weight (src/primitives/link.ts). Rules are written for
 * `button` alone, here and in what a button group adds (groupItemStyles); the link form follows them.
 */
export const styles = styledAsAnchorToo(buttonStyles, 'button');
