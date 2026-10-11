import { css, unsafeCSS } from 'lit';
import { DISABLED, type OpenAxis, focusRing, iconGlyph, minimumTarget, pressHold, recolorTiming, rippleStyles, stateRules } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/chip.tokens.json). For each state the chip reads that state's tokens of its
// current look — it never computes how a state looks: hover, focus and press mix the look's container with its
// `state-layer.color` (and the remove action's round container with `remove.state-layer.color`, or
// `destructive-remove.state-layer.color` while destructiveRemove is true) in the default system,
// and draw nothing at all in cupertino, by value.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['outlined', 'elevated'] as const;
export const CORE_SIZES = ['small', 'medium'] as const;
const DEFAULT_VARIANT = 'outlined';
const DEFAULT_SIZE = 'medium';
const STATES = { '': '', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;
/** The parts of a look (CHP-12): the plain look reads the variant's own parts, a filter chip that is on its `selected.` parts. */
const PARTS = { c: 'container-color', o: 'outline-color', l: 'label-color', i: 'icon-color', e: 'container-elevation' } as const;
const LOOKS = { plain: '', selected: 'selected-' } as const;
/** The remove action's parts: its round container and its glyph, in its own states (CHP-20). */
const REMOVE_PARTS = { rc: 'container-color', ri: 'icon-color' } as const;
/** The remove action's looks (CHP-27): the `destructive-remove.` parts while destructiveRemove is true, the `remove.` parts otherwise. */
const REMOVE_LOOKS = { plain: 'remove-', destructive: 'destructive-remove-' } as const;
/** The members of the size axis (`dev.tanrei.axes.size.members`). */
const SIZE_MEMBERS = {
  height: 'container-height',
  pad: 'container-padding-inline',
  'pad-icon': 'container-padding-inline-with-icon',
  'pad-avatar': 'container-padding-inline-with-avatar',
  'pad-remove': 'container-padding-inline-with-remove',
  'pad-block': 'container-padding-block',
  gap: 'container-gap',
  font: 'label-typescale',
  icon: 'icon-size',
  avatar: 'avatar-size',
  remove: 'remove-container-size',
} as const;

const PREFIX = '--tanrei-comp-chip';
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);
const stateOf = (state: string) => (state ? `${state}-` : '');

// Per variant, every look's parts and the remove action's in every state, as private custom properties
// (`--_selected-c-h` = the selected look's container, hovered; `--_destructive-rc-h` = the destructive remove action's
// round container, hovered). The token is `<variant>-<state>-<look><part>`.
const variantBlock = (variant: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${[
    ...Object.entries(LOOKS).flatMap(([look, prefix]) =>
      Object.entries(STATES).flatMap(([state, suffix]) =>
        Object.entries(PARTS).map(([key, part]) => `  --_${look}-${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${stateOf(state)}${prefix}${part}`, variant, fallback)};`),
      ),
    ),
    ...Object.entries(REMOVE_LOOKS).flatMap(([look, prefix]) =>
      Object.entries(STATES).flatMap(([state, suffix]) =>
        Object.entries(REMOVE_PARTS).map(([key, part]) => `  --_${look}-${key}${suffix}: ${ref((v) => `${PREFIX}-${v}-${stateOf(state)}${prefix}${part}`, variant, fallback)};`),
      ),
    ),
  ].join('\n')}\n}`;

const sizeBlock = (size: string, selector: string, fallback: string | null = null) =>
  `${selector} {\n${Object.entries(SIZE_MEMBERS)
    .flatMap(([key, member]) =>
      member === 'label-typescale'
        ? [`  --_font: ${ref((v) => `${PREFIX}-${member}-${v}-font`, size, fallback)};`, `  --_tracking: ${ref((v) => `${PREFIX}-${member}-${v}-letter-spacing`, size, fallback)};`]
        : [`  --_${key}: ${ref((v) => `${PREFIX}-${member}-${v}`, size, fallback)};`],
    )
    .join('\n')}\n}`;

/** Which look the container paints (CHP-12): it follows `aria-pressed`, so what is drawn and what is announced agree. */
const lookBlock = (look: keyof typeof LOOKS, selector: string) =>
  `${selector} {\n${Object.values(STATES)
    .flatMap((suffix) => Object.keys(PARTS).map((key) => `  --_${key}${suffix}: var(--_${look}-${key}${suffix});`))
    .join('\n')}\n}`;

/** Which parts the remove action paints (CHP-27): it follows the `destructive` class the element sets from destructiveRemove. */
const removeLookBlock = (look: keyof typeof REMOVE_LOOKS, selector: string) =>
  `${selector} {\n${Object.values(STATES)
    .flatMap((suffix) => Object.keys(REMOVE_PARTS).map((key) => `  --_${key}${suffix}: var(--_${look}-${key}${suffix});`))
    .join('\n')}\n}`;

/**
 * The open axes (CHP-7): a size or variant a layer added gets its block on demand, built by the same functions
 * as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in debug builds.
 */
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: (value) => `${PREFIX}-container-height-${value}` },
  { name: 'variant', core: CORE_VARIANTS, default: DEFAULT_VARIANT, rules: (value, selector) => variantBlock(value, selector, DEFAULT_VARIANT), probe: (value) => `${PREFIX}-${value}-container-color` },
];

/**
 * Everything a state paints on the chip except its container color: the label color (inherited by the label), the icon
 * color (the icon and the check), and the outline — an inset ring inside the edge, so it never changes the box — with
 * the elevation outside it.
 */
const paintContent = (suffix: string) => `
    color: var(--_l${suffix});
    --_icon-color: var(--_i${suffix});
    box-shadow: inset 0 0 0 var(--tanrei-comp-chip-outline-width) var(--_o${suffix}), var(--_e${suffix});`;
const paint = (suffix: string) => `
    background: var(--_c${suffix});${paintContent(suffix)}`;
const removePaint = (suffix: string) => `
    background: var(--_rc${suffix});
    color: var(--_ri${suffix});`;

// The pieces every control shares (src/primitives): the state rules and their precedence, the ripple, the focus
// indicator (ring or glow), the minimum target, the carrier of press-hold, the icon glyph and the selection
// motion of a condition change, plus the one corner rule (styles/shape.ts). The chip and its remove action
// are two sibling buttons, each with its own states (CHP-20).
// CHP-36: the chip's container is a native button or, as a link, an anchor, which has no :disabled of its own (DISABLED
// names both forms' condition, src/primitives/link.ts).
const chip = (state: string) => `.container${state === ':disabled' ? DISABLED : state}`;
const remove = (state: string) => `.remove${state}`;
const SELECTION = `var(${PREFIX}-motion-selection-duration) var(${PREFIX}-motion-selection-easing)`;

export const styles = css`
  :host {
    display: inline-flex;
    vertical-align: middle;
    max-inline-size: 100%;
  }
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(variantBlock(DEFAULT_VARIANT, ':host'))}
  ${unsafeCSS(CORE_VARIANTS.filter((v) => v !== DEFAULT_VARIANT).map((v) => variantBlock(v, `:host([variant='${v}'])`)).join('\n'))}
  ${unsafeCSS(lookBlock('plain', '.container'))}
  ${unsafeCSS(lookBlock('selected', ".container[aria-pressed='true']"))}
  ${unsafeCSS(removeLookBlock('plain', '.remove'))}
  ${unsafeCSS(removeLookBlock('destructive', '.root.destructive .remove'))}

  /* CHP-13, CHP-24: a part that both the states and the condition recolor takes the state motion, and the selection
     motion while the condition changes (data-condition-change on .root, src/primitives/selection.ts). */
  ${recolorTiming(PREFIX)}

  .root {
    position: relative;
    display: inline-flex;
    flex: 0 1 auto;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  /* CHP-16: the chip — at least the size's height, one row, the label's ends padded by padding-inline. A glyph or an
     avatar at an end brings that end nearer (its own padding) through the leading box and the trailing room below. */
  .container {
    all: unset;
    box-sizing: border-box;
    position: relative;
    /* Its own stacking context, so the ripple can sit above the container color and below the content. */
    isolation: isolate;
    display: inline-flex;
    flex: 0 1 auto;
    min-inline-size: 0;
    align-items: center;
    min-block-size: var(--_height);
    padding-block: var(--_pad-block);
    padding-inline: var(--_pad);
    ${unsafeCSS(cornerRadius('--tanrei-comp-chip-container-shape'))}
    ${unsafeCSS(paint(''))}
    --_ripple: var(--_c-p);
    --_ripple-inset: var(--tanrei-comp-chip-outline-width);
    font: var(--_font);
    letter-spacing: var(--_tracking);
    -webkit-user-select: none;
    user-select: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, box-shadow, opacity;
    transition-duration: var(--_recolor-duration), var(--_recolor-duration), var(--_recolor-duration), var(--tanrei-comp-chip-motion-state-duration);
    transition-timing-function: var(--_recolor-easing), var(--_recolor-easing), var(--_recolor-easing), var(--tanrei-comp-chip-motion-state-easing);
  }

  /* The leading element (icon, check or avatar) sits in a one-column grid that opens (0fr → 1fr) when there is one, so
     a filter chip without an icon grows with its check over the selection motion (CHP-13). The column also brings the
     start nearer: its margin is the difference between the glyph's (or avatar's) padding and the text's, and the gap
     after it is inside it. */
  .lead {
    display: grid;
    grid-template-columns: 0fr;
    flex: none;
    align-self: center;
    opacity: 0;
    transition:
      grid-template-columns ${unsafeCSS(SELECTION)},
      opacity ${unsafeCSS(SELECTION)};
  }
  .root.has-lead .lead {
    grid-template-columns: 1fr;
    opacity: 1;
  }
  .lead-clip {
    display: flex;
    min-inline-size: 0;
    overflow: hidden;
    margin-inline-start: calc(var(--_pad-icon) - var(--_pad));
  }
  .root.lead-avatar .lead-clip {
    margin-inline-start: calc(var(--_pad-avatar) - var(--_pad));
  }
  .lead-item {
    display: flex;
    align-items: center;
    padding-inline-end: var(--_gap);
  }
  /* The icon and the check share one cell: the check shows in place of the icon (CHP-13). */
  .glyphs {
    display: grid;
  }
  .glyphs > * {
    grid-area: 1 / 1;
    color: var(--_icon-color);
    transition:
      opacity ${unsafeCSS(SELECTION)},
      color var(--_recolor-duration) var(--_recolor-easing);
  }
  .check,
  .root.checked .icon {
    opacity: 0;
  }
  .root.checked .check {
    opacity: 1;
  }
  .avatar,
  .root.lead-avatar .glyphs {
    display: none;
  }
  .root.lead-avatar .avatar {
    display: block;
  }

  /* CHP-15: the avatar, an image of the size's avatar size clipped to comp.chip.avatar.shape. */
  .avatar {
    position: relative;
    overflow: hidden;
    inline-size: var(--_avatar);
    block-size: var(--_avatar);
    ${unsafeCSS(cornerRadius('--tanrei-comp-chip-avatar-shape'))}
  }
  ::slotted([slot='avatar']) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }
  /* CHP-6: a disabled chip draws its avatar at the disabled content opacity. */
  .container${unsafeCSS(DISABLED)} .avatar {
    opacity: var(--tanrei-sys-state-disabled-content-opacity);
  }

  /* CHP-17: one line, truncated with an ellipsis only when the layout gives less width than the label needs. */
  .label {
    flex: 0 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* CHP-31: the label is text of its own direction — its first strong character's — isolated from the glyphs beside it,
     and it is cut at the end of ITS direction: a left-to-right label in a right-to-left layout loses its right end. The
     layout direction still places it (the flex row). */
  ${productText('.label')}

  /* CHP-16, CHP-18: an input chip keeps room at its end for the remove glyph — the gap and the glyph's box, at the
     remove end's own padding (padding-inline-with-remove), so the box counts toward the row's tallest item — which the
     sibling button draws over it. The round container around the glyph is larger and takes no part in this. */
  .trail {
    display: none;
    flex: none;
    inline-size: calc(var(--_gap) + var(--_icon));
    block-size: var(--_icon);
    margin-inline-end: calc(var(--_pad-remove) - var(--_pad));
  }
  .root.input .trail {
    display: block;
  }
  /* CHP-35: a link chip that opens a new context draws its mark — the icon set's open_in_new — in that room, where an
     input chip's remove glyph is laid out: container.gap after the label, at icon.size, the end padded by
     padding-inline-with-icon (an end that holds a glyph with no round shape of its own behind it), in the icon color of
     the look and state. iconGlyph() mirrors it in right-to-left: the icon set marks its name. */
  .root.link-new .trail {
    display: flex;
    justify-content: flex-end;
    margin-inline-end: calc(var(--_pad-icon) - var(--_pad));
  }
  .trail .mark {
    color: var(--_icon-color);
    transition: color var(--_recolor-duration) var(--_recolor-easing);
  }

  /* CHP-5: the chip's hit area meets the minimum target without changing its size. */
  ${minimumTarget('.container')}
  /* TGR-5: in a set (a tag group), the hit area ends at the middle of the gap to a neighbour, along the line and between
     two lines, so that two chips' areas meet there and neither lies over the other. The set hands its two distances
     down as --tanrei-set-gap and --tanrei-set-row-gap (an internal contract between Tanrei elements, not a styling
     API); a chip that stands alone has neither, and each bound is then the target itself — the same area as above. */
  .container::before {
    --_target: var(--tanrei-sys-target-pointer);
    inline-size: min(max(100%, var(--_target)), calc(100% + var(--tanrei-set-gap, var(--_target))));
    block-size: min(max(100%, var(--_target)), calc(100% + var(--tanrei-set-row-gap, var(--_target))));
  }
  @media (pointer: coarse) {
    .container::before {
      --_target: var(--tanrei-sys-target-touch);
    }
  }

  /* CHP-3, CHP-6, CHP-8, CHP-9, CHP-12: each state paints from that state's tokens of the current look; pressed > focused
     > hovered, disabled over all. Pressed is data-pressed="<feedback>" (PressController). */
  ${stateRules(chip, {
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

  /* CHP-18: the remove action — the cancel glyph on a round container of the size's remove size, centered on the glyph
     at the inline end, over the chip's trailing room. The container is out of flow: it reaches into the gap and the end
     padding without changing the chip's size. A sibling of the chip, so its states are its own (CHP-20).
     CHP-32: where it lies — on the chip's midline, and from the chip's inline end the remove end's padding less half
     of what it exceeds the glyph by, never less than nothing. The default system's values make that the same as its
     distance from the chip's top and bottom (2, 2 and 2 at medium; the round end itself at small), so its center is
     the center of the chip's round end and the two curves are concentric. */
  .remove {
    all: unset;
    box-sizing: border-box;
    position: absolute;
    z-index: 1;
    isolation: isolate;
    display: none;
    align-items: center;
    justify-content: center;
    inset-block: 0;
    inset-inline-end: max(0px, calc(var(--_pad-remove) - (var(--_remove) - var(--_icon)) / 2));
    margin-block: auto;
    inline-size: var(--_remove);
    block-size: var(--_remove);
    ${unsafeCSS(cornerRadius('--tanrei-comp-chip-remove-container-shape'))}
    ${unsafeCSS(removePaint(''))}
    --_ripple: var(--_rc-p);
    --_ripple-inset: 0px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, opacity;
    transition-duration: var(--tanrei-comp-chip-motion-state-duration);
    transition-timing-function: var(--tanrei-comp-chip-motion-state-easing);
  }
  .root.input .remove {
    display: inline-flex;
  }
  /* CHP-21: the remove action's hit area — at least the minimum target on both axes around its glyph; toward the label
     it reaches no further than the gap before the glyph, and it extends outward, past the chip's edge, as far as it
     needs. It is above the chip's own, so the rest of the chip's hit area activates the chip. */
  .remove::before {
    --_toward-label: calc(var(--_gap) - (var(--_remove) - var(--_icon)) / 2);
    content: '';
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: calc(var(--_toward-label) * -1);
    inline-size: max(var(--tanrei-sys-target-pointer), calc(var(--_remove) + var(--_toward-label)));
    block-size: max(100%, var(--tanrei-sys-target-pointer));
    transform: translateY(-50%);
  }
  @media (pointer: coarse) {
    .remove::before {
      inline-size: max(var(--tanrei-sys-target-touch), calc(var(--_remove) + var(--_toward-label)));
      block-size: max(100%, var(--tanrei-sys-target-touch));
    }
  }
  /* TGR-5: in a set, the remove action's hit area too ends at the middle of the gap: outward, half the gap past the
     chip's edge (--_past-end is how far the round container stands from that edge), and above and below, half the
     distance between two lines past the chip. Without a set each bound is beyond the target, and nothing changes. */
  .remove::before {
    --_target: var(--tanrei-sys-target-pointer);
    --_past-end: max(0px, calc(var(--_pad-remove) - (var(--_remove) - var(--_icon)) / 2));
    inline-size: min(
      max(var(--_target), calc(var(--_remove) + var(--_toward-label))),
      calc(var(--_remove) + var(--_toward-label) + var(--_past-end) + var(--tanrei-set-gap, calc(2 * var(--_target))) / 2)
    );
    block-size: min(max(100%, var(--_target)), calc(var(--_height) + var(--tanrei-set-row-gap, var(--_target))));
  }
  @media (pointer: coarse) {
    .remove::before {
      --_target: var(--tanrei-sys-target-touch);
    }
  }

  /* CHP-20, CHP-27: the remove action's own states, from its remove (or destructive-remove) parts, with CHP-3's
     precedence and CHP-8 / CHP-9's press. */
  ${stateRules(remove, {
    hovered: removePaint('-h'),
    focused: removePaint('-f'),
    pressed: `${removePaint('-p')}
    opacity: var(${PREFIX}-pressed-opacity);`,
    pressedContent: `
    color: var(--_ri-p);
    opacity: var(${PREFIX}-pressed-opacity);`,
    disabled: `
    cursor: default;${removePaint('-d')}`,
  })}
  /* CHP-9 dim: a press of the chip dims the whole control, its remove action with it. */
  .root:has(.container[data-pressed='dim']) .remove {
    transition-duration: 0s;
    opacity: var(${unsafeCSS(PREFIX)}-pressed-opacity);
  }

  /* CHP-9 ripple (the chip's, inside its outline, and the remove action's, inside its round container): grows over
     comp.chip.motion.feedback-duration and fades over motion.state-duration, both with motion.state-easing. */
  ${rippleStyles({
    color: '--_ripple',
    inset: '--_ripple-inset',
    grow: '--tanrei-comp-chip-motion-feedback-duration',
    fade: '--tanrei-comp-chip-motion-state-duration',
    easing: '--tanrei-comp-chip-motion-state-easing',
  })}

  /* CHP-4, CHP-10, CHP-20: the ring (or the glow) around whichever has keyboard focus, never animated. */
  ${focusRing(chip)}
  ${focusRing(remove)}

  /* CHP-10, corner smoothing: the shared rule, on the chip, the remove action and the avatar (data-tanrei-shape). */
  ${shape}

  /* CHP-14: the icon, the check and the remove glyph at the size's icon size, sys.icon.weight, and the optical size of
     the box, clamped to sys.icon.optical-size; the icon and the check in the family and fill of the chip's selection (selected only on a filter chip that
     is on: aria-pressed="true"), the remove glyph always in the selected family and fill. CHP-30: iconGlyph() mirrors the
     slotted glyph GlyphMirrorController marked, in right-to-left, in its own box; the check and the remove glyph never. */
  ${iconGlyph('.glyph', {
    size: '--_icon',
    selected: ".container[aria-pressed='true']",
    duration: '--tanrei-comp-chip-motion-selection-duration',
    easing: '--tanrei-comp-chip-motion-selection-easing',
  })}
  .remove .glyph {
    --tanrei-icon-fill: var(--tanrei-sys-icon-fill-selected);
    --tanrei-icon-family: var(--tanrei-sys-icon-family-selected);
  }
  .glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  ::slotted(svg),
  ::slotted(img:not([slot='avatar'])) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  /* CHP-8: the label and the remove glyph carry press-hold for their PressControllers. */
  ${pressHold('.label')}
  ${pressHold('.remove .hold')}

  @media (prefers-reduced-motion: reduce) {
    .container,
    .remove,
    .lead,
    .trail .mark,
    .glyphs > * {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .container {
      border: var(--tanrei-comp-chip-outline-width) solid ButtonText;
    }
    .container[aria-pressed='true'] {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
      --_icon-color: HighlightText;
    }
    .container${unsafeCSS(DISABLED)} {
      border-color: GrayText;
      color: GrayText;
      --_icon-color: GrayText;
    }
    .remove {
      color: ButtonText;
    }
  }
`;
