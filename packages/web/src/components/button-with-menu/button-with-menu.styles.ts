import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusRing, groupItemReset, groupItemStyles, iconGlyph, minimumTarget, neighbourTarget, pressHold, rippleStyles, separationHost, stateRules, whenGap } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/button-with-menu.tokens.json). The button with menu owns its tokens:
// they carry Button's values by default but are its own, so a system can style its buttons with menu apart from its buttons.
// Both halves share one set of parts per variant, and each half reads them in ITS OWN state (SPB-4): how a state looks is
// the active design system's decision, not this component's.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['filled', 'tonal', 'elevated', 'outlined'] as const;
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_VARIANT = 'filled';
const DEFAULT_SIZE = 'medium';
/**
 * SPB-12, SPB-32: the widths of the trailing half. A closed set: each is a padding of its size around the chevron — and
 * `default` alone takes the outer padding at its round end.
 */
export const TRAILING_WIDTHS = ['default', 'narrow'] as const;
const STATES = { '': '', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
// SPB-26: the elevation is read as its `-inset-ring` companion (the emitter's): the same layers, the ring drawn inside.
// SPB-31: the divider's color is a part of the variant too, read at rest and when disabled.
const PARTS = { c: 'container-color', l: 'label-color', o: 'outline-color', e: 'container-elevation-inset-ring', d: 'divider-color' } as const;
/**
 * SPB-34: the parts a destructive button with menu reads from its variant's `destructive.` parts, in each state. Its
 * elevation stays the variant's.
 */
const DESTRUCTIVE_PARTS = { c: 'container-color', l: 'label-color', o: 'outline-color', d: 'divider-color' } as const;
/** The members of the size axis (`dev.tanrei.axes.size.members`). */
const SIZE_MEMBERS = {
  height: 'container-height',
  'pad-block': 'container-padding-block',
  gap: 'container-gap',
  'pad-start': 'leading-padding-inline-start',
  'pad-start-icon': 'leading-padding-inline-start-with-icon',
  'pad-end': 'leading-padding-inline-end',
  'pad-trailing': 'trailing-padding-inline',
  'pad-trailing-narrow': 'trailing-padding-inline-narrow',
  font: 'label-typescale',
  icon: 'icon-size',
  'outline-width': 'outline-width',
} as const;

const PREFIX = '--tanrei-comp-button-with-menu';
const P = unsafeCSS(PREFIX);
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// Private custom properties (`--_c-h` = container, hovered) select the variant's tokens once per host.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([state, suffix]) => Object.entries(PARTS).map(([key, part]) => `  --_${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}${part}`, variant, fallback)};`))
    .join('\n')}\n}`;

// SPB-34: a destructive host reads the same private properties from its variant's destructive parts
// (`<variant>-<state>-destructive-<part>`). Its selector is the variant's with [destructive], so it wins over it.
const destructiveBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([state, suffix]) =>
      Object.entries(DESTRUCTIVE_PARTS).map(([key, part]) => `  --_${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}destructive-${part}`, variant, fallback)};`),
    )
    .join('\n')}\n}`;
/** The selector of a variant's destructive look: the variant's own, with [destructive]. */
const destructiveOf = (selector: string) => selector.replace(/\)$/, '[destructive])');

// The label's text role is used whole.
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) =>
      member === 'label-typescale'
        ? [`  --_font: ${ref((v) => `${PREFIX}-${member}-${v}-font`, size, fallback)};`, `  --_tracking: ${ref((v) => `${PREFIX}-${member}-${v}-letter-spacing`, size, fallback)};`]
        : [`  --_${key}: ${ref((v) => `${PREFIX}-${member}-${v}`, size, fallback)};`],
    )
    .join('\n')}\n}`;

/**
 * The open axes (SPB-8): a size or variant a layer added gets its block on demand, built by the same functions
 * as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => `${variantBlock(value, selector, DEFAULT_VARIANT)}\n${destructiveBlock(value, destructiveOf(selector), DEFAULT_VARIANT)}`,
    probe: (value) => `${PREFIX}-${value}-container-color` },
];

/**
 * Everything a state paints except its container color. SPB-26: the outline and the elevation's ring are inset layers,
 * inside the half's own edge, the outline first (over the ring); only the elevation's blurred layers fall outside.
 * They are named (`--_shadow`) before they are drawn: a half leaves them to its `::after`, which is cut at the seam
 * where the halves touch (`--_own-shadow`, src/primitives/group-item.ts), and draws them itself while it has keyboard
 * focus.
 */
const paintContent = (suffix: string) => `
    color: var(--_l${suffix});
    --_shadow: inset 0 0 0 var(--_outline-width) var(--_o${suffix}), var(--_e${suffix});
    box-shadow: var(--_own-shadow, var(--_shadow));`;
const paint = (suffix: string) => `
    background: var(--_c${suffix});${paintContent(suffix)}`;

// A corner where the halves meet, held to half the half's measured height (`--_half-block`, written by the half's
// GroupItemController): a pill's 9999 px radius beside a small one would otherwise scale every corner of the box down
// together, and the small ones would vanish.
const held = (token: string) => `min(var(${token}), var(--_half-block, var(${token})))`;

// The pieces every control shares (src/primitives): the state rules and their precedence, the ripple, the focus
// indicator (ring or glow), the minimum target and its cap toward a neighbour, the joined corners of a
// connected item (the button group's, whose ring and ripple follow each corner), the carrier of press-hold and the icon
// glyph, plus the one corner rule (styles/shape.ts). Each takes this component's selectors: both halves are
// native buttons, and each is its own container.
const on = (state: string) => `button${state}`;

export const styles = css`
  :host {
    display: inline-flex;
    vertical-align: middle;
    max-inline-size: 100%;
    /* Its own stacking order: the z-index of a part below orders the component's parts only, and never reaches the
       page's (a sticky header of the product's). What stands over the page is drawn in the top layer. */
    isolation: isolate;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}
  /* SPB-34: a destructive button with menu draws both halves, and the divider, from its variant's destructive parts. The
     menu's items are the product's own elements, slotted into the menu: these private properties never reach them, so
     an item is drawn destructive by its own destructive alone. */
  ${unsafeCSS(destructiveBlock(DEFAULT_VARIANT, ':host([destructive])'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => destructiveBlock(v, destructiveOf(`:host([variant='${v}'])`))).join('\n'))}

  /* SPB-30: the separation it draws — its attribute's, else comp.button-with-menu.container.separation's. */
  ${separationHost(`${PREFIX}-container-separation`)}

  /* SPB-12, SPB-19, SPB-30: the two halves in one row, in the inline direction (the trailing half on the left in
     right-to-left), the trailing half as tall as the leading one; never stacked. This is the divider form (the first
     value of the choice, and so what an unknown name draws): the halves touch. It is no element of its own for assistive
     technology (SPB-17), and it is what the menu is placed against (SPB-15). */
  .row {
    display: flex;
    align-items: stretch;
    gap: 0;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  /* The menu's host holds nothing in the flow: its surface is in the top layer. */
  tanrei-menu {
    position: absolute;
  }

  button {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple can sit above the container color and below the content. */
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* SPB-12: at least the height of its size, padded above and below by at least padding-block. */
    min-block-size: var(--_height);
    ${unsafeCSS(cornerRadius(`${PREFIX}-container-shape`))}
    /* SPB-18, SPB-26: the elevation's blurred layers are cast outside the half, its ring inside; nothing on the way to
       the page clips them. */
    ${unsafeCSS(paint(''))}
    /* SPB-14: the label's text role, whole. */
    font: var(--_font);
    letter-spacing: var(--_tracking);
    -webkit-user-select: none;
    user-select: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    /* SPB-18: colors and elevation over the state motion. */
    transition-property: background-color, color, box-shadow, opacity;
    transition-duration: var(${P}-motion-state-duration);
    transition-timing-function: var(${P}-motion-state-easing);
    /* A button group sets these on its items; a button with menu is none, whatever its ancestors are. */
    ${unsafeCSS(groupItemReset)}
    /* SPB-13: under a divider the corners where the halves meet are square, open or not. */
    --_inner: 0px;
    --_inner-open: 0px;
    /* SPB-6: toward the other half, the hit area stops at the seam where they touch. */
    --_half-gap: 0px;
    /* SPB-12, SPB-32: what the joined halves add to a side — the padding at a rounded outer end
       (src/primitives/group-item.ts) — is --_add-*. */
    padding-block: calc(var(--_pad-block) + var(--_add-top)) calc(var(--_pad-block) + var(--_add-bottom));
  }
  /* SPB-12: the trailing half holds the chevron between trailing.padding-inline, or — narrow — between
     trailing.padding-inline-narrow, of its size. SPB-32: a narrow half keeps the outer padding at its round end (the
     .trailing rule below): a slim half's chevron is nearer the curve, so it needs the compensation as much as a wide
     one's — one outer padding wider than a narrow icon-only Button of its size where the two components' tokens agree. */
  :host([trailing-width='narrow']) .trailing {
    --_pad-chevron: var(--_pad-trailing-narrow);
  }

  /* SPB-12: the leading half — as wide as its content: the icon, when it has one, then the label, gap apart, padded at
     the start by the with-icon padding when it has an icon, at the end by its own padding. Logical, so RTL mirrors it. */
  /* SPB-26, SPB-31, SPB-32: under a divider the leading half's end edge is the seam — no outline and no ring along it —
     and its start is a rounded outer end, which takes container.outer-inset more padding, at either trailing width. */
  .leading {
    flex: 0 1 auto;
    min-inline-size: 0;
    gap: var(--_gap);
    --_pad-inline-start: var(--_pad-start);
    padding-inline: calc(var(--_pad-inline-start) + var(--_add-start)) calc(var(--_pad-end) + var(--_add-end));
    --tanrei-group-start-radius: initial;
    --tanrei-group-end-radius: var(--_inner);
    --tanrei-group-seam-end: 1;
    --tanrei-group-outer-start: var(${P}-container-outer-inset);
    --_cap-start: initial;
    --_cap-end: var(--_half-gap);
  }
  /* SPB-12: with an icon, the start padding is its own token (a step tighter in the default system, as Button's). */
  .leading.with-icon {
    --_pad-inline-start: var(--_pad-start-icon);
  }
  /* SPB-12, SPB-32: the trailing half — the chevron centred between its padding on each side, then, at either
     width, container.outer-inset more at its end, the other rounded outer end: the chevron sits half of it nearer the
     seam. Its start edge is the seam under a divider. */
  .trailing {
    flex: none;
    --_pad-chevron: var(--_pad-trailing);
    padding-inline: calc(var(--_pad-chevron) + var(--_add-start)) calc(var(--_pad-chevron) + var(--_add-end));
    --tanrei-group-start-radius: var(--_inner);
    --tanrei-group-end-radius: initial;
    --tanrei-group-seam-start: 1;
    --tanrei-group-outer-end: var(${P}-container-outer-inset);
    --_cap-start: var(--_half-gap);
    --_cap-end: initial;
  }
  /* SPB-13: while open, the trailing half's inner corners are inner-shape-open — the same corners as closed where the
     token has inner-shape's value, as in the default system: the trailing half then keeps its shape and the chevron
     alone shows that the menu is open. */
  .trailing.open {
    --tanrei-group-start-radius: var(--_inner-open);
  }

  /* SPB-31: the divider — one line on the seam, divider.thickness thick in the variant's divider color, centred on the
     seam, over the halves' fills and state layers, from divider.inset below the top of the seam to as far above its
     bottom. It takes no space (an empty box between the halves), no press and no semantics, keeps its resting color
     whatever state a half is in, and takes the disabled color while disabled. */
  .divider {
    position: relative;
    z-index: 1;
    flex: none;
    inline-size: 0;
    pointer-events: none;
  }
  .divider::before {
    content: '';
    position: absolute;
    inset-block: var(${P}-divider-inset);
    inset-inline-start: calc(var(${P}-divider-thickness) / -2);
    inline-size: var(${P}-divider-thickness);
    background: var(--_d);
    transition: background-color var(${P}-motion-state-duration) var(${P}-motion-state-easing);
  }
  :host([disabled]) .divider::before {
    background: var(--_d-d);
  }
  /* SPB-30: the gap form — the halves container.inner-gap apart with nothing drawn between them, container.inner-shape
     where they face each other (inner-shape-open for the open trailing half), each half's outline and ring inside its
     own edge again (SPB-26), and the hit areas meeting at the middle of the gap (SPB-6). */
  ${whenGap(
    '.row',
    (row) => `
  ${row} {
    gap: var(${PREFIX}-container-inner-gap);
  }
  ${row} .divider {
    display: none;
  }
  ${row} button {
    --_inner: ${held(`${PREFIX}-container-inner-shape`)};
    --_inner-open: ${held(`${PREFIX}-container-inner-shape-open`)};
    --_half-gap: calc(var(${PREFIX}-container-inner-gap) / 2);
  }
  ${row} .leading {
    --tanrei-group-seam-end: initial;
  }
  ${row} .trailing {
    --tanrei-group-seam-start: initial;
  }`,
  )}

  /* SPB-14: never truncated — one line while it fits, wrapping when the layout gives it less width. */
  .label {
    white-space: normal;
    overflow-wrap: break-word;
    text-align: center;
  }
  /* SPB-29: the label is text of its own direction — its first strong character's — isolated from the icon and the
     trailing half beside it; where it is placed, and that its lines are centred, stays the layout's. */
  ${productText('.label')}

  /* SPB-6: the hit area meets the minimum target on both axes without changing the visual size — outward past the start
     edge for the leading half and past the end edge for the trailing half — and toward the other half no further than
     the middle of the gap between them. */
  ${minimumTarget('button')}
  ${neighbourTarget('button')}
  /* SPB-6: what a half cannot reach toward the other half it reaches outward, so a narrow trailing half still has its
     whole target without being drawn wider. */
  button::before {
    --_outward: max(0px, calc(var(--_target) - 100% - min(max(0px, calc((var(--_target) - 100%) / 2)), var(--_half-gap))));
  }
  .leading::before {
    inset-inline-start: calc(-1 * var(--_outward));
  }
  .trailing::before {
    inset-inline-end: calc(-1 * var(--_outward));
  }

  /* SPB-4, SPB-7, SPB-9, SPB-10: each half paints from its own state's tokens; pressed > focused > hovered, disabled over
     all. Pressed is data-pressed="<feedback>" (PressController): overlay paints the pressed tokens on the whole half;
     ripple and dim paint everything else from them while the container color stays with the state under the press
     (ripple adds the pressed color as a layer, dim adds none); none paints nothing. */
  ${stateRules(on, {
    hovered: `${paint('-h')}
    opacity: var(${PREFIX}-hovered-opacity);${cornerRadius(`${PREFIX}-hovered-container-shape`)}`,
    focused: `${paint('-f')}
    opacity: var(${PREFIX}-focused-opacity);${cornerRadius(`${PREFIX}-focused-container-shape`)}`,
    pressed: `${paint('-p')}
    opacity: var(${PREFIX}-pressed-opacity);${cornerRadius(`${PREFIX}-pressed-container-shape`)}`,
    pressedContent: `${paintContent('-p')}
    opacity: var(${PREFIX}-pressed-opacity);${cornerRadius(`${PREFIX}-pressed-container-shape`)}`,
    disabled: `
    cursor: default;${paint('-d')}
    opacity: var(${PREFIX}-disabled-opacity);${cornerRadius(`${PREFIX}-disabled-container-shape`)}`,
  })}

  /* SPB-10 ripple: grows over comp.button-with-menu.motion.feedback-duration and fades over motion.state-duration, both with
     motion.state-easing, inside the outline, clipped to the half's own shape. */
  ${rippleStyles({
    color: '--_c-p',
    inset: '--_outline-width',
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}

  /* SPB-5 and SPB-11 focus-style: the ring (or the glow) around the focused half's own shape, never animated. */
  ${focusRing(on)}

  /* SPB-11, corner smoothing: the shared rule, on each half (data-tanrei-shape) and, by inheritance, its ring. */
  ${shape}

  /* SPB-13: the outer corners are the state's container shape, the corners where the halves meet the inner shape — each
     corner of the fill, the ripple and the ring (or the glow), concentric — through the joined corners of a connected
     item (src/primitives/group-item.ts). They change at once, except when open changes (below). */
  ${groupItemStyles({ on: 'button', rippleInset: '--_outline-width' })}

  /* SPB-13: when open changes, the trailing half's corners move over the open motion (the chevron turns with them), and
     a press does not stop them. Only then: nothing else animates a corner. */
  button.trailing.turning {
    transition-property: background-color, color, box-shadow, opacity, border-radius;
    transition-duration:
      var(${P}-motion-state-duration), var(${P}-motion-state-duration), var(${P}-motion-state-duration),
      var(${P}-motion-state-duration), var(${P}-motion-open-duration);
    transition-timing-function:
      var(${P}-motion-state-easing), var(${P}-motion-state-easing), var(${P}-motion-state-easing),
      var(${P}-motion-state-easing), var(${P}-motion-open-easing);
  }
  button.trailing.turning[data-pressed]:not([data-pressed='none']) {
    transition-duration: 0s, 0s, 0s, 0s, var(${P}-motion-open-duration);
  }

  /* SPB-9: the leading half's label carries press-hold for both halves' PressControllers. */
  ${pressHold('.label')}

  /* SPB-14: the icon and the chevron, each in the label color of its own half's state, drawn with the system's icon set —
     the family and fill of an unselected icon, sys.icon.weight, and the optical size of its box, clamped to
     sys.icon.optical-size — at the size's icon size. */
  ${iconGlyph('.icon', { size: '--_icon', selected: '.never-selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  ${iconGlyph('.chevron', { size: '--_icon', selected: '.never-selected', duration: `${PREFIX}-motion-state-duration`, easing: `${PREFIX}-motion-state-easing` })}
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .leading:not(.with-icon) .icon {
    display: none;
  }
  /* An image or an SVG given as the icon fills the icon box. */
  ::slotted(svg),
  ::slotted(img) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }
  /* SPB-13, SPB-21, SPB-19: the closed glyph (the chevron slot's, or expand_more) points down, and is turned half a turn
     while open; with a chevron-open glyph the two cross-fade instead, neither turning. Both over the open motion.
     expand_more is never mirrored; a glyph the product put in a chevron slot is mirrored by iconGlyph() in its own
     box (SPB-28), inside the box that turns, so a mirrored chevron turns as an unmirrored one does. */
  .chevrons {
    display: inline-grid;
    flex: none;
    place-items: center;
  }
  .turn,
  .glyph-open {
    grid-area: 1 / 1;
    display: inline-flex;
  }
  .turn {
    transition-property: transform, opacity;
    transition-duration: var(${P}-motion-open-duration);
    transition-timing-function: var(${P}-motion-open-easing);
  }
  .trailing.open:not(.swap) .turn {
    transform: rotate(180deg);
  }
  .glyph-open {
    opacity: 0;
    transition-property: opacity;
    transition-duration: var(${P}-motion-open-duration);
    transition-timing-function: var(${P}-motion-open-easing);
  }
  .trailing:not(.swap) .glyph-open {
    display: none;
  }
  .trailing.swap.open .turn {
    opacity: 0;
  }
  .trailing.swap.open .glyph-open {
    opacity: 1;
  }

  /* SPB-22, SPB-23: the hover delays, read through real properties by script; this element draws nothing. */
  .timing {
    display: none;
    transition-property: none;
    transition-delay: var(${P}-motion-hover-open-delay);
    transition-duration: var(${P}-motion-hover-close-delay);
  }

  @media (prefers-reduced-motion: reduce) {
    button,
    .turn,
    .glyph-open,
    .divider::before {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .divider::before,
    :host([disabled]) .divider::before {
      background: ButtonText;
    }
    button {
      border: var(--_outline-width) solid ButtonText;
    }
    button:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
