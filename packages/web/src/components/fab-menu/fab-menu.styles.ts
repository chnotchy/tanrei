import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusRing, iconGlyph, minimumTarget, pressHold, rippleStyles, rowTarget, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/fab-menu.tokens.json). Each variant has three looks: the
// closed toggle (its plain parts), the open toggle (`open.`) and the items (`item.`), each in every state. The component
// reads the tokens of the look and the state it is in — it never computes how a state looks.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['filled', 'tonal', 'surface'] as const;
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_VARIANT = 'filled';
const DEFAULT_SIZE = 'medium';
const STATES = { '': '', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
/**
 * The parts of a variant's three looks: private key → token part (after the state). The item's keys carry the
 * `fbm-` prefix because the items read them by inheritance: a `<tanrei-fab-menu-item>` is a child of the FAB menu, so
 * the custom properties the menu's host sets reach it through the flat tree, and an added variant colors its
 * items with no code in the item.
 */
const PARTS = {
  c: 'container-color',
  i: 'icon-color',
  e: 'container-elevation',
  oc: 'open-container-color',
  oi: 'open-icon-color',
  oe: 'open-container-elevation',
  'fbm-ic': 'item-container-color',
  'fbm-il': 'item-label-color',
  'fbm-ii': 'item-icon-color',
  'fbm-ie': 'item-container-elevation',
} as const;
/** The members of the size axis: the toggle's side, its corner and the icon box. */
const SIZE_MEMBERS = { size: 'container-size', shape: 'container-shape', icon: 'icon-size' } as const;

const PREFIX = '--tanrei-comp-fab-menu';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// Private custom properties (`--_oc-h` = the open toggle's container, hovered) select the variant's tokens once per host.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([state, suffix]) => Object.entries(PARTS).map(([key, part]) => `  --_${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}${part}`, variant, fallback)};`))
    .join('\n')}\n}`;

// The corner is a member of the size axis (FBM-11), so its pill mark (the emitter's `<token>-pill`) travels with it.
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) => {
      const line = `  --_${key}: ${ref((v) => `${PREFIX}-${member}-${v}`, size, fallback)};`;
      return member === 'container-shape' ? [line, `  --_${key}-pill: ${ref((v) => `${PREFIX}-${member}-${v}-pill`, size, fallback)};`] : [line];
    })
    .join('\n')}\n}`;

/**
 * The open axes (FBM-7): a size or variant a layer added gets its block on demand, built by the same functions
 * as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-size-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-${value}-container-color` },
];

/** The toggle's look: the closed parts, or the open ones (`.open`), under the names its state rules paint from. */
const toggleLook = (look: 'closed' | 'open') =>
  Object.values(STATES)
    .flatMap((s) => (['c', 'i', 'e'] as const).map((key) => `--_t${key}${s}: var(--_${look === 'open' ? 'o' : ''}${key}${s});`))
    .join('\n    ');

/** Everything a toggle state paints except its container color: the icon color and the elevation (FBM-3, FBM-21). */
const toggleContent = (s: string) => `
    color: var(--_ti${s});
    box-shadow: var(--_te${s});`;
const togglePaint = (s: string) => `
    background: var(--_tc${s});${toggleContent(s)}`;
const opacity = (state: string) => `
    opacity: ${T(`${state}-opacity`)};`;

/**
 * The FAB menu (FBM-1…23 on the toggle and the list): the toggle — a collapsed main action button of its variant and size that takes the open
 * look, round corners and the close glyph while open — and the list, a column presented in the top layer (or in place,
 * `inline`) above it.
 */
export const menuStyles = css`
  /* FBM-12: inline, at the toggle's size, where the layout puts it — the page positions it, never the element. */
  :host {
    display: inline-flex;
    vertical-align: middle;
  }
  /* In place (the fixtures), the list is drawn above the toggle without moving anything: the host is its reference. */
  :host([inline]) {
    position: relative;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}

  .toggle {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple can sit above the container color and below the icon. */
    isolation: isolate;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    /* FBM-11: a square at the size's side, with the size's corners while closed. */
    inline-size: var(--_size);
    block-size: var(--_size);
    ${unsafeCSS(cornerRadius('--_shape'))}
    ${unsafeCSS(toggleLook('closed'))}
    /* FBM-21: the elevation is a box-shadow on the container, cast outside it; nothing on the way to the page clips it. */
    ${unsafeCSS(togglePaint(''))}
    -webkit-user-select: none;
    user-select: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    /* FBM-21: a change of the colors or the elevation between states is animated. */
    transition-property: background-color, color, box-shadow, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
    /* FBM-19: the motion of the change between closed and open — closing's here, opening's below. The after-change
       style decides which one a transition takes. */
    --_turn-duration: ${t('motion-close-duration')};
    --_turn-easing: ${t('motion-close-easing')};
  }
  /* FBM-11, FBM-19: open, the toggle takes the variant's open look and container.shape-open — held to half its side, so
     that the corners move to round over the open motion instead of jumping at its first frame. */
  .toggle.open {
    --_shape-open: min(${t('container-shape-open')}, calc(var(--_size) / 2));
    --_shape-open-pill: var(${unsafeCSS(PREFIX)}-container-shape-open-pill, 0);
    ${unsafeCSS(cornerRadius('--_shape-open'))}
    ${unsafeCSS(toggleLook('open'))}
    --_turn-duration: ${t('motion-open-duration')};
    --_turn-easing: ${t('motion-open-easing')};
  }

  /* FBM-5: the hit area meets the minimum target without changing the visual size. */
  ${minimumTarget('.toggle')}

  /* FBM-3, FBM-6, FBM-8, FBM-9: each state paints from that state's tokens of the toggle's look; pressed > focused >
     hovered, disabled over all. Pressed is data-pressed="<feedback>" (PressController). */
  ${stateRules((state) => `.toggle${state}`, {
    hovered: `${togglePaint('-h')}${opacity('hovered')}`,
    focused: `${togglePaint('-f')}${opacity('focused')}`,
    pressed: `${togglePaint('-p')}${opacity('pressed')}`,
    pressedContent: `${toggleContent('-p')}${opacity('pressed')}`,
    disabled: `
    cursor: default;${togglePaint('-d')}${opacity('disabled')}`,
  })}

  /* FBM-19: while the toggle turns between closed and open, its colors, elevation and corners move over the open (or
     close) motion — a press held across the change included, whose own start was shown at once (FBM-8). */
  .toggle.turning,
  .toggle.turning[data-pressed]:not([data-pressed='none']) {
    transition-property: background-color, color, box-shadow, opacity, border-radius;
    transition-duration: var(--_turn-duration);
    transition-timing-function: var(--_turn-easing);
  }

  /* FBM-9 ripple: grows over motion.feedback-duration and fades over motion.state-duration, clipped to the toggle. */
  ${rippleStyles({
    color: '--_tc-p',
    grow: '--tanrei-comp-fab-menu-motion-feedback-duration',
    fade: '--tanrei-comp-fab-menu-motion-state-duration',
    easing: '--tanrei-comp-fab-menu-motion-state-easing',
  })}

  /* FBM-4, FBM-10: the ring (or the glow), never animated. */
  ${focusRing((focus) => `.toggle${focus}`)}

  /* FBM-10: corner smoothing, on the toggle (data-tanrei-shape) and, by inheritance, its ring. */
  ${shape}

  /* FBM-11: the glyph at the size's icon size, in the unselected family and fill, centered; the slot's glyph while
     closed and the icon set's close glyph while open, cross-faded (FBM-19). */
  ${iconGlyph('.icon', {
    size: '--_icon',
    selected: '.never-selected',
    duration: '--tanrei-comp-fab-menu-motion-state-duration',
    easing: '--tanrei-comp-fab-menu-motion-state-easing',
  })}
  .icon {
    display: inline-grid;
    /* One cell exactly the icon box, whatever a glyph's text measures (FBM-24 compares the close glyph's ink with it). */
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    place-items: center;
  }
  .glyph {
    grid-area: 1 / 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 100%;
    block-size: 100%;
    transition: opacity var(--_turn-duration) var(--_turn-easing);
  }
  .glyph.shut,
  .toggle.open .glyph.close {
    opacity: 1;
  }
  .glyph.close,
  .toggle.open .glyph.shut {
    opacity: 0;
  }
  /* FBM-24: nothing in the close glyph's place until the icon set can draw it (GlyphDrawnController sets data-drawn); the
     toggle keeps its size, colors, corners, name and expanded state meanwhile. FBM-11: it is never mirrored (the icon
     helper lays it out left to right). */
  .glyph.close {
    visibility: hidden;
  }
  .glyph.close[data-drawn] {
    visibility: visible;
  }
  /* The ligature's own width, which GlyphDrawnController compares with the glyph box (a flex item: never shrunk). */
  .ink {
    flex: none;
  }
  ::slotted(svg),
  ::slotted(img) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  /* FBM-8: the icon slot carries press-hold for PressController. */
  ${pressHold('slot')}

  /* FBM-13: the list — a column above the toggle, the first item at the top, every item's end edge on the toggle's end
     edge — draws nothing of its own. As a popover it is in the top layer, placed by script (the offset is read through a
     real property); in place (inline) it is above the host. Never a scrim, never clipping the items' elevation. */
  .list {
    box-sizing: border-box;
    position: fixed;
    inset: auto;
    margin: 0;
    border: 0;
    padding: 0;
    overflow: visible;
    background: transparent;
    color: inherit;
    display: none;
    flex-direction: column;
    align-items: end;
    gap: ${t('list-gap')};
    inline-size: max-content;
    max-inline-size: 100vw;
    scroll-margin-block-start: ${t('list-offset')};
  }
  .list:popover-open,
  .list.inline.presented {
    display: flex;
  }
  .list::backdrop {
    background: transparent;
  }
  .list.inline {
    position: absolute;
    inset-block-end: calc(100% + ${t('list-offset')});
    inset-inline-end: 0;
  }
  /* FBM-19: the items leave together. At once where motion is reduced. */
  .list.leaving {
    animation: fab-menu-leave ${t('motion-close-duration')} ${t('motion-close-easing')} forwards;
  }
  @keyframes fab-menu-leave {
    to {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle,
    .toggle.turning,
    .glyph {
      transition: none;
    }
    .list.leaving {
      animation: none;
    }
  }
  @media (forced-colors: active) {
    /* The shadow is dropped in forced colors: an edge keeps the square visible. */
    .toggle {
      border: 1px solid ButtonText;
    }
    .toggle:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;

/** Where each state of an item is read: its semantics and focus are its host's. Every selector has one specificity. */
const onItem = (state: string) => {
  if (state === ':focus-visible') return ':host(:focus-visible) .container';
  if (state === "[data-focus-style='glow']:focus-visible") return ":host([data-focus-style='glow']:focus-visible) .container";
  // An item has no disabled state (the spec leaves it out): its rule never matches.
  if (state === ':disabled') return '.container.p.never-disabled';
  return `.container.p${state}`;
};
/** Everything an item state paints except its container color: the label and icon colors, the elevation. */
const itemContent = (s: string) => `
    --_label: var(--_fbm-il${s});
    --_glyph: var(--_fbm-ii${s});
    box-shadow: var(--_fbm-ie${s});`;
const itemPaint = (s: string) => `
    background: var(--_fbm-ic${s});${itemContent(s)}`;

/**
 * An item (FBM-3…5, FBM-9, FBM-10, FBM-18, FBM-19, FBM-22): a raised container at least item.height tall and as wide as
 * its content, the icon and then the label, each state from the item parts of the menu's variant (inherited from the
 * menu), its own press, ring and corners; it grows in from its end edge when the menu opens.
 */
export const itemStyles = css`
  :host {
    display: block;
    /* The ring is drawn on the container, never around the host. */
    outline: none;
  }
  .container {
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple sits above the container color and below the content. */
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: ${t('item-gap')};
    /* FBM-18, FBM-22: logical paddings, so right-to-left mirrors them with the icon and the label. */
    padding-inline: ${t('item-padding-inline-start')} ${t('item-padding-inline-end')};
    ${unsafeCSS(cornerRadius('--tanrei-comp-fab-menu-item-shape'))}
    ${unsafeCSS(itemPaint(''))}
    color: var(--_label);
    font: ${t('item-label-typescale-font')};
    letter-spacing: ${t('item-label-typescale-letter-spacing')};
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    /* FBM-21: colors and elevation change over the state motion. */
    transition-property: background-color, color, box-shadow, opacity;
    transition-duration: ${t('motion-state-duration')};
    transition-timing-function: ${t('motion-state-easing')};
    /* FBM-19: an item grows in from its end edge. */
    transform-origin: right center;
  }
  :host(:dir(rtl)) .container {
    transform-origin: left center;
  }
  /* FBM-5: at least item.height and the minimum target tall — stacked items cannot extend a hit area over each other —
     and the whole container is the hit area. */
  ${rowTarget('.container', T('item-height'))}

  /* FBM-18: the label on one line while it fits, wrapping rather than truncating, the item growing with it. */
  .label {
    min-inline-size: 0;
    overflow-wrap: break-word;
  }
  /* FBM-27: the label is text of its own direction — its first strong character's — isolated from the glyph beside it;
     the layout direction still places it and aligns the lines it wraps to. */
  ${productText('.label', { align: 'start' })}
  /* FBM-26: iconGlyph() mirrors the glyph GlyphMirrorController marked, in right-to-left, in its own box. */
  ${iconGlyph('.icon', {
    size: '--tanrei-comp-fab-menu-item-icon-size',
    selected: '.never-selected',
    duration: '--tanrei-comp-fab-menu-motion-state-duration',
    easing: '--tanrei-comp-fab-menu-motion-state-easing',
  })}
  .icon {
    color: var(--_glyph);
    /* The icon's fill keeps its transition: this declaration replaces that one, so it carries both. */
    transition:
      color ${t('motion-state-duration')} ${t('motion-state-easing')},
      font-variation-settings ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  .icon.empty {
    display: none;
  }

  /* FBM-3, FBM-9: each state from the item parts of that state; pressed > focused > hovered. */
  ${stateRules(onItem, {
    hovered: `${itemPaint('-h')}${opacity('hovered')}`,
    focused: `${itemPaint('-f')}${opacity('focused')}`,
    pressed: `${itemPaint('-p')}${opacity('pressed')}`,
    pressedContent: `${itemContent('-p')}${opacity('pressed')}`,
    disabled: `${itemPaint('-d')}${opacity('disabled')}`,
  })}
  .container[data-pressed]:not([data-pressed='none']) .icon {
    transition-duration: 0s;
  }
  ${rippleStyles({
    color: '--_fbm-ic-p',
    grow: '--tanrei-comp-fab-menu-motion-feedback-duration',
    fade: '--tanrei-comp-fab-menu-motion-state-duration',
    easing: '--tanrei-comp-fab-menu-motion-state-easing',
  })}

  /* FBM-4, FBM-10: the ring (or the glow) around the item's own shape, for keyboard focus only, never animated. */
  ${focusRing((focus) => onItem(focus))}
  ${shape}

  /* FBM-8 for an item: the label carries press-hold for PressController; it has no transition of its own. */
  ${pressHold('.label')}

  /* FBM-19: fade and grow in from the end edge, the item nearest the toggle first, each next motion.stagger later. Only
     the delay holds the start value (backwards), so the item's own state paints are never held by the animation. */
  .container.entering {
    animation: fab-menu-item-in ${t('motion-open-duration')} ${t('motion-open-easing')} backwards;
    animation-delay: calc(var(--_order, 0) * ${t('motion-stagger')});
  }
  @keyframes fab-menu-item-in {
    from {
      opacity: 0;
      transform: scale(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .container,
    .icon {
      transition: none;
    }
    .container.entering {
      animation: none;
    }
  }
  @media (forced-colors: active) {
    .container {
      border: 1px solid CanvasText;
    }
  }
`;
