import { css, unsafeCSS } from 'lit';
import { type OpenAxis, focusRing, iconGlyph, minimumTarget, pressHold, rippleStyles, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/main-action-button.tokens.json). For each state the component reads that
// state's tokens — it never computes how a state looks: hover, focus and press mix each variant's container with its
// `state-layer.color` in the default system and draw nothing at all in cupertino, and the elevation of each state is a
// token too (the default system raises it under hover), by value. One corner per size serves both forms:
// full in the default system, so the collapsed form is a circle and the extended one a pill.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['filled', 'tonal', 'surface'] as const;
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
const DEFAULT_VARIANT = 'filled';
const DEFAULT_SIZE = 'medium';
const STATES = { '': '', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
const PARTS = { c: 'container-color', l: 'label-color', e: 'container-elevation' } as const;
/** The members of the size axis (`dev.tanrei.axes.size.members`): Button's geometry, with a tighter padding beside the icon at either end. */
const SIZE_MEMBERS = {
  height: 'container-height',
  shape: 'container-shape',
  'pad-start': 'container-padding-inline-start',
  'pad-start-icon': 'container-padding-inline-start-with-icon',
  'pad-end': 'container-padding-inline-end',
  'pad-end-icon': 'container-padding-inline-end-with-icon',
  'pad-block': 'container-padding-block',
  gap: 'container-gap',
  font: 'label-typescale',
  icon: 'icon-size',
} as const;

const PREFIX = '--tanrei-comp-main-action-button';
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

// Private custom properties (`--_c-h` = container, hovered) select the variant's tokens once per host.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(STATES)
    .flatMap(([state, suffix]) => Object.entries(PARTS).map(([key, part]) => `  --_${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${state ? `${state}-` : ''}${part}`, variant, fallback)};`))
    .join('\n')}\n}`;

// The corner is a member of the size axis (MAB-11, MAB-13), so its pill mark (the emitter's `<token>-pill`) travels with
// it: `cornerRadius('--_shape')` reads `--_shape` and `--_shape-pill`. The label's text role is used whole.
const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) => {
      if (member === 'label-typescale') {
        return [`  --_font: ${ref((v) => `${PREFIX}-${member}-${v}-font`, size, fallback)};`, `  --_tracking: ${ref((v) => `${PREFIX}-${member}-${v}-letter-spacing`, size, fallback)};`];
      }
      const line = `  --_${key}: ${ref((v) => `${PREFIX}-${member}-${v}`, size, fallback)};`;
      return member === 'container-shape' ? [line, `  --_${key}-pill: ${ref((v) => `${PREFIX}-${member}-${v}-pill`, size, fallback)};`] : [line];
    })
    .join('\n')}\n}`;

/**
 * The open axes (MAB-7): a size or variant a layer added gets its block on demand, built by the same functions
 * as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-${value}-container-color` },
];

/** Everything a state paints except its container color: the label color (the icon takes it too, MAB-12) and the elevation (MAB-17). */
const paintContent = (suffix: string) => `
    color: var(--_l${suffix});
    box-shadow: var(--_e${suffix});`;
const paint = (suffix: string) => `
    background: var(--_c${suffix});${paintContent(suffix)}`;

// The pieces every control shares (src/primitives): the state rules and their precedence, the ripple, the focus
// indicator (ring or glow), the minimum target, the carrier of press-hold and the icon glyph, plus the one
// corner rule (styles/shape.ts). Each takes this component's selectors and custom properties.
const on = (state: string) => `button${state}`;

const P = unsafeCSS(PREFIX);
const RESIZE = `var(${PREFIX}-motion-resize-duration) var(${PREFIX}-motion-resize-easing)`;

export const styles = css`
  /* MAB-18: inline, at its own size, where the layout puts it — the page positions it, never the element. */
  :host {
    display: inline-flex;
    vertical-align: middle;
    max-inline-size: 100%;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}

  button {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple can sit above the container color and below the content. */
    isolation: isolate;
    display: inline-flex;
    flex: 0 1 auto;
    min-inline-size: 0;
    max-inline-size: 100%;
    align-items: center;
    /* MAB-11: at least the size's height, padded by Button's names — the icon's side by its with-icon padding — and as
       wide as the content. Logical, so RTL mirrors (MAB-19). */
    min-block-size: var(--_height);
    padding-block: var(--_pad-block);
    padding-inline: var(--_pad-start) var(--_pad-end);
    ${unsafeCSS(cornerRadius('--_shape'))}
    /* MAB-17: the elevation is a box-shadow on the container, cast outside it; nothing on the way to the page clips it. */
    ${unsafeCSS(paint(''))}
    /* MAB-12: the label's text role, whole; 1lh on the icon's box is this line's height. */
    font: var(--_font);
    letter-spacing: var(--_tracking);
    /* WebKit keeps the text selectable until its own name says so: a selection of the page swept over the button took
       its label (and the icon's name) with it, and a press held on that selection became the engine's drag of the
       text — no pointerup or pointercancel reached the button, which stayed pressed (MAB-8). */
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    /* MAB-17: colors and elevation over the state motion. */
    transition-property: background-color, color, box-shadow, opacity;
    transition-duration: var(${P}-motion-state-duration);
    transition-timing-function: var(${P}-motion-state-easing);
  }
  /* MAB-14: while it changes form (and only then — a change of direction moves the physical paddings, and that is not
     a resize), the paddings move over the resize motion too. */
  button[data-resizing] {
    transition-property: background-color, color, box-shadow, opacity, padding-inline-start, padding-inline-end;
    transition-duration:
      var(${P}-motion-state-duration), var(${P}-motion-state-duration), var(${P}-motion-state-duration),
      var(${P}-motion-state-duration), var(${P}-motion-resize-duration), var(${P}-motion-resize-duration);
    transition-timing-function:
      var(${P}-motion-state-easing), var(${P}-motion-state-easing), var(${P}-motion-state-easing),
      var(${P}-motion-state-easing), var(${P}-motion-resize-easing), var(${P}-motion-resize-easing);
  }
  button.leading {
    padding-inline-start: var(--_pad-start-icon);
  }
  button.trailing {
    padding-inline-end: var(--_pad-end-icon);
  }

  /* The content in one row: the icon on the side iconPosition names, and the label. The row is aligned at its start, so
     a label that wraps keeps the icon on its first line (the icon box is one line high), and the button centers the
     row. The order follows the reading direction (MAB-19). */
  .content {
    display: flex;
    align-items: flex-start;
    min-inline-size: 0;
  }
  .icon-box {
    display: none;
    flex: none;
    align-items: center;
    justify-content: center;
    block-size: 1lh;
  }
  .leading .icon-box,
  .trailing .icon-box {
    display: flex;
  }
  .trailing .icon-box {
    order: 1;
  }

  /* MAB-12, MAB-14: the label sits in a one-column grid whose column collapses (1fr → 0fr) and fades; the gap is inside
     it, so it collapses too. It wraps rather than truncating while it is shown and still; while it resizes or is
     collapsed it keeps one line, so the narrowing column clips it instead of breaking it into a tall column of words. */
  .label-box {
    display: grid;
    grid-template-columns: 1fr;
    min-inline-size: 0;
    transition:
      grid-template-columns ${unsafeCSS(RESIZE)},
      opacity ${unsafeCSS(RESIZE)};
  }
  .label-clip {
    min-inline-size: 0;
  }
  .label {
    display: block;
    overflow-wrap: break-word;
  }
  /* MAB-23: the label is text of its own direction — its first strong character's — isolated from the icon beside it;
     the layout direction still places it and aligns the lines it wraps to. */
  ${productText('.label', { align: 'start' })}
  /* The gap is the label's margin, not its padding: WebKit lays a paragraph whose direction is its own (plaintext)
     against the padding of the paragraph's start, so a left-to-right label in a right-to-left layout was drawn over
     its gap, against the icon, with the space on its far side. A box without padding has no side to mistake. */
  .leading .label {
    margin-inline-start: var(--_gap);
  }
  .trailing .label {
    margin-inline-end: var(--_gap);
  }
  button.collapsed .label-clip,
  button[data-resizing] .label-clip {
    overflow: hidden;
    white-space: nowrap;
  }

  /* MAB-13: collapsed, the button is a square of the size's height with its icon centered, whichever side it is on: the
     label's column is gone and both paddings are half of what the icon's box leaves. The label is still there for
     assistive technology. With no icon and no label (MAB-16) the icon's box stays, empty, so the square keeps its side. */
  button.collapsed {
    padding-inline: calc((var(--_height) - var(--_icon)) / 2);
  }
  button.collapsed .icon-box {
    display: flex;
  }
  button.collapsed .label-box {
    grid-template-columns: 0fr;
    opacity: 0;
  }

  /* MAB-5: the hit area meets the minimum target without changing the visual size. */
  ${minimumTarget('button')}

  /* MAB-3, MAB-6, MAB-8, MAB-9: each state paints from that state's tokens; pressed > focused > hovered, disabled over
     all. Pressed is data-pressed="<feedback>" (PressController): overlay paints the pressed tokens on the whole
     container; ripple and dim paint everything else (label, icon, elevation, opacity) from them while the container
     color stays with the state under the press (ripple adds the pressed color as a layer, dim adds none); none paints
     nothing. */
  ${stateRules(on, {
    hovered: `${paint('-h')}
    opacity: var(${PREFIX}-hovered-opacity);`,
    focused: `${paint('-f')}
    opacity: var(${PREFIX}-focused-opacity);`,
    pressed: `${paint('-p')}
    opacity: var(${PREFIX}-pressed-opacity);`,
    pressedContent: `${paintContent('-p')}
    opacity: var(${PREFIX}-pressed-opacity);`,
    disabled: `
    cursor: default;${paint('-d')}
    opacity: var(${PREFIX}-disabled-opacity);`,
  })}

  /* MAB-9 ripple: grows over comp.main-action-button.motion.feedback-duration and fades over motion.state-duration, both
     with motion.state-easing, clipped to the container. */
  ${rippleStyles({
    color: '--_c-p',
    grow: `${PREFIX}-motion-feedback-duration`,
    fade: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}

  /* MAB-4 and MAB-10 focus-style: the ring (or the glow), never animated. */
  ${focusRing(on)}

  /* MAB-10, corner smoothing: the shared rule, on the container (data-tanrei-shape) and, by inheritance, its ring. */
  ${shape}

  /* MAB-12: the icon, in the label color, drawn with the system's icon set — the family and fill of an unselected icon,
     sys.icon.weight, and the optical size of its box, clamped to sys.icon.optical-size — at the size's icon size.
     MAB-19, MAB-22: the button mirrors no glyph itself; iconGlyph() mirrors the slotted glyph GlyphMirrorController
     marked, in right-to-left, in its own box. */
  ${iconGlyph('.icon', {
    size: '--_icon',
    selected: '.never-selected',
    duration: `${PREFIX}-motion-state-duration`,
    easing: `${PREFIX}-motion-state-easing`,
  })}
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  /* An image or an SVG given as the icon fills the icon box. */
  ::slotted(svg),
  ::slotted(img) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  /* MAB-8: the label carries press-hold for PressController (the label box's own transition is the resize). */
  ${pressHold('.label')}

  @media (prefers-reduced-motion: reduce) {
    button,
    .label-box {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    /* The shadow is dropped in forced colors: an edge keeps the container visible. */
    button {
      border: 1px solid ButtonText;
    }
    button:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
