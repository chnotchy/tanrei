import { css, unsafeCSS } from 'lit';
import { type OpenAxis, iconGlyph } from '../../primitives/index.js';
import { productText } from '../../styles/product-text.js';
import { cornerRadius, shape } from '../../styles/shape.js';

// Every visual value is a token (tokens/comp/avatar.tokens.json). An avatar has no state (AVT-7): what changes what it
// draws is its size and its shape, each read from that value's own tokens, and whether it stands in a group.
/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_SIZES = ['small', 'medium', 'large'] as const;
export const CORE_SHAPES = ['circle', 'square'] as const;
const DEFAULT_SIZE = 'medium';
const DEFAULT_SHAPE = 'circle';

const PREFIX = '--tanrei-comp-avatar';
const T = (name: string) => `var(${PREFIX}-${name})`;
const t = (name: string) => unsafeCSS(T(name));
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

/**
 * Per size (AVT-1, AVT-5, AVT-6, AVT-16): the side of the box, the initials' text role used whole, the
 * glyph's box and how far the boxes of a group overlap.
 */
const sizeBlock = (size: string, selector: string, fallback: string | null = null) => {
  const role = (member: string) => ref((v) => `${PREFIX}-label-typescale-${v}-${member}`, size, fallback);
  return `${selector} {
  --_side: ${ref((v) => `${PREFIX}-container-size-${v}`, size, fallback)};
  --_font: ${role('font')};
  --_font-size: ${role('font-size')};
  --_tracking: ${role('letter-spacing')};
  --_icon: ${ref((v) => `${PREFIX}-icon-size-${v}`, size, fallback)};
  --_overlap: ${ref((v) => `${PREFIX}-group-overlap-${v}`, size, fallback)};
}`;
};

/** Per shape (AVT-1): the corners, and whether that token is the full step — a circle whatever the smoothing. */
const shapeBlock = (name: string, selector: string, fallback: string | null = null) => `${selector} {
  --_shape: ${ref((v) => `${PREFIX}-container-shape-${v}`, name, fallback)};
  --_shape-pill: ${ref((v) => `${PREFIX}-container-shape-${v}-pill`, name, fallback)};
}`;

/**
 * AVT-16: each box of a group lies over the end of the one before it by the overlap of the group's size. The rule is on
 * the member, so it names the token itself: a rule on `::slotted()` reads the member's cascade, not the group's.
 */
const overlapBlock = (size: string, selector: string, fallback: string | null = null) => `${selector} ::slotted(tanrei-avatar) {
  margin-inline-start: calc(-1 * ${ref((v) => `${PREFIX}-group-overlap-${v}`, size, fallback)});
}`;

/**
 * The open axes (AVT-22): a size or a shape a layer added gets its block on demand, built by the same
 * functions as the core blocks and falling back to the default's tokens; a value the active system lacks is reported in
 * debug builds.
 */
const probes = {
  size: (value: string) => `${PREFIX}-container-size-${value}` as const,
  shape: (value: string) => `${PREFIX}-container-shape-${value}` as const,
};
export const AXES: readonly OpenAxis[] = [
  { name: 'size', core: CORE_SIZES, default: DEFAULT_SIZE, rules: (value, selector) => sizeBlock(value, selector, DEFAULT_SIZE), probe: probes.size },
  { name: 'shape', core: CORE_SHAPES, default: DEFAULT_SHAPE, rules: (value, selector) => shapeBlock(value, selector, DEFAULT_SHAPE), probe: probes.shape },
];
/** The group's: the same two, and the members' overlap with the size. */
export const GROUP_AXES: readonly OpenAxis[] = [
  { ...AXES[0], rules: (value, selector) => `${sizeBlock(value, selector, DEFAULT_SIZE)}\n${overlapBlock(value, selector, DEFAULT_SIZE)}` },
  AXES[1],
];

const forms = css`
  ${unsafeCSS(sizeBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => sizeBlock(size, `:host([size='${size}'])`)).join('\n'))}
  ${unsafeCSS(shapeBlock(DEFAULT_SHAPE, ':host'))}
  ${unsafeCSS(CORE_SHAPES.filter((name) => name !== DEFAULT_SHAPE).map((name) => shapeBlock(name, `:host([shape='${name}'])`)).join('\n'))}
`;

/**
 * The box (AVT-1) and the initials (AVT-5), which an avatar and a group's overflow box (AVT-17) draw alike.
 */
const box = css`
  /* AVT-1: a square of the size's side with the shape's corners through the shared corner rule (a radius is never more
     than half the side: the browser clamps it, and the full step is a circle whatever the smoothing), the quiet fill,
     and everything it draws clipped to that shape. No edge, no elevation. AVT-7: nothing here answers a pointer, a press
     or focus — there is no state rule, no ripple and no focus indicator in this stylesheet. */
  .container {
    box-sizing: border-box;
    position: relative;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--_side);
    block-size: var(--_side);
    ${unsafeCSS(cornerRadius('--_shape'))}
    background: ${t('container-color')};
    overflow: hidden;
    /* A picture of a name, not text: a selection drawn across a byline does not take the initials with it. */
    user-select: none;
    -webkit-user-select: none;
  }
  /* AVT-16: the gap around each box of a group, outside its edge and following its shape: a spread shadow takes no room
     in the layout and moves nothing. */
  .container.member {
    box-shadow: 0 0 0 ${t('group-outline-width')} ${t('group-outline-color')};
  }

  /* AVT-5: the initials (and a group's count, AVT-17) — one line at the centre, the text role of the size used whole,
     in label.color. AVT-11: an avatar is a picture and does not grow with enlarged text; its box and its glyph are
     lengths of the size dial and stay, and the initials, whose role does grow with the text dial, are held to the
     glyph's box of the same size, so that two letters still stand inside the avatar. */
  .label {
    flex: none;
    font: var(--_font);
    font-size: min(var(--_font-size), var(--_icon));
    letter-spacing: var(--_tracking);
    color: ${t('label-color')};
    white-space: nowrap;
  }
  ${shape}

  /* AVT-13: forced colors remove the fill, so a fallback gains an edge of the system's hairline in the text color,
     inside the box and following its shape, and its content takes that color. */
  @media (forced-colors: active) {
    .container:not(.pictured) {
      border: var(--tanrei-sys-border-hairline) solid CanvasText;
    }
    .label,
    .icon {
      color: CanvasText;
    }
  }
`;

export const styles = css`
  /* AVT-1: inline with the text or the row it is placed in, one unbreakable box that a layout neither stretches nor
     shrinks: the host has the box's own side on both axes, so a flex or a grid container that stretches what has no
     size of its own leaves it alone, and where it is aligned stays the container's to say. AVT-8: pointer events are
     left as they are — there is no listener here, so a press over an avatar inside a link or a Button reaches that
     element. */
  :host {
    display: inline-block;
    flex: none;
    vertical-align: middle;
    inline-size: var(--_side);
    block-size: var(--_side);
  }
  :host([hidden]) {
    display: none;
  }
  ${forms}
  ${box}

  /* AVT-5: the initials are text of their own direction, isolated from the text around the avatar. */
  ${productText('.label')}

  /* AVT-6: the glyph — the product's, or the system's for the shape — in a box of the size's icon size at the centre,
     in icon.color, the icon set's unselected family and fill, sys.icon.weight, the optical size of the box, no
     transition. AVT-15: iconGlyph() mirrors the slotted glyph GlyphMirrorController marked; the avatar mirrors nothing. */
  ${iconGlyph('.icon', { size: '--_icon', selected: ':not(*)' })}
  .icon {
    color: ${t('icon-color')};
  }
  .icon[hidden] {
    display: none;
  }
  /* The slot is the glyph's ink for GlyphDrawnController: an inline block as wide as the name it holds. */
  .icon slot,
  .ink {
    display: inline-block;
    vertical-align: top;
  }
  .icon ::slotted(svg),
  .icon ::slotted(img) {
    display: block;
    inline-size: var(--tanrei-icon-size);
    block-size: var(--tanrei-icon-size);
  }
  /* Nothing in a glyph's place until the icon set can draw it — never the glyph's name spelled out (AVT-2); the box
     keeps its size. */
  .icon:not([data-drawn]) {
    visibility: hidden;
  }

  /* AVT-3, AVT-4: the picture lies over the whole box, out of the flow, so that neither its arrival nor its failure
     moves anything; it covers the box with its proportions kept and its centre on the box's centre, and is clipped by
     the container. Until it has loaded it has its box (a lazy picture is asked for when that box nears the window) and
     draws nothing — no broken-picture mark, no alternative text, no address. It is never mirrored or tinted, and
     forced colors leave it alone (AVT-13). */
  .image {
    position: absolute;
    inset: 0;
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
    object-position: center;
    visibility: hidden;
    forced-color-adjust: none;
    /* The picture is not a second thing to drag or to press inside a link (AVT-8). */
    -webkit-user-drag: none;
    -webkit-touch-callout: none;
  }
  .image.loaded {
    visibility: visible;
  }
`;

export const groupStyles = css`
  /* AVT-16: one row that does not wrap, as wide as its boxes less their overlaps and as high as one box, inline with
     what it stands beside. The direction is inherited, so a right-to-left layout starts the row at the right and each
     following box lies over the left end of the one before it (AVT-20). */
  :host {
    display: inline-flex;
    flex: none;
    vertical-align: middle;
    /* Its own size on both axes, so a container that stretches what has none leaves it alone. */
    inline-size: max-content;
    block-size: var(--_side);
  }
  :host([hidden]) {
    display: none;
  }
  /* AVT-23: a group without members draws nothing and takes no space. Its own rule: a browser without custom states
     drops only this one, and the empty group is then a row of no size. */
  :host(:state(empty)) {
    display: none;
  }
  ${forms}
  ${unsafeCSS(overlapBlock(DEFAULT_SIZE, ':host'))}
  ${unsafeCSS(CORE_SIZES.filter((size) => size !== DEFAULT_SIZE).map((size) => overlapBlock(size, `:host([size='${size}'])`)).join('\n'))}

  /* Every box, the first too, is drawn back by the overlap, and the row starts that far in: the first stands at the
     row's start edge, and a box later in the document is painted above the one before it. */
  .row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    padding-inline-start: var(--_overlap);
  }
  .row[hidden] {
    display: none;
  }
  ${box}
  /* AVT-17: the overflow box — placed and surrounded as a member is. It takes no input: there is no listener and no
     state here. */
  .overflow {
    margin-inline-start: calc(-1 * var(--_overlap));
  }
  /* AVT-18: the sign and the number are one left-to-right run, isolated, so the plus sign stays before the digits in a
     right-to-left layout; digits of equal width where the font has them. */
  .count {
    direction: ltr;
    unicode-bidi: isolate;
    font-variant-numeric: tabular-nums;
  }
  /* AVT-19: what assistive technology reads for the overflow box, never drawn. It is inside the box, which is
     positioned and clips, so it widens nothing around the group. */
  .spoken {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`;
