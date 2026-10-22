import { type CSSResult, unsafeCSS } from 'lit';

type Property = `--${string}`;

/**
 * The mark of a glyph that is drawn mirrored in a right-to-left layout: an attribute without a value on
 * the element that holds the glyph's name. Script writes it — `GlyphMirrorController` for a component's own glyphs and
 * the glyphs in its slots, `observeIcons()` for a bare `.tanrei-icon` (src/primitives/glyph-mirror.ts) — because a
 * stylesheet cannot read a name from text; the styles below do the rest, so a change of direction needs no script.
 */
export const MIRRORED = 'data-tanrei-mirrored';

/** The product's word for one use: `data-mirror="auto | always | never"` on the glyph's element. */
export const MIRROR = 'data-mirror';

/**
 * The compound a mirrored glyph's element matches, wherever it is: marked by script or forced by the product, not
 * forbidden by the product, in a right-to-left layout. `:dir()` reads the `dir` the element inherits (HTML's rule,
 * across shadow roots), not the `direction` the glyph box sets for its ligature.
 */
export const MIRRORED_GLYPH = `:is([${MIRRORED}], [${MIRROR}='always']):not([${MIRROR}='never']):dir(rtl)`;

/** What mirrors it: left to right, in its own box, its place unchanged. */
const MIRROR_DECLARATION = 'transform: scaleX(-1);';

/**
 * The mirroring `iconGlyph()` includes for its box `on`: the box itself when it holds a name the component wrote, and
 * the element in a slot inside it (or `on` itself being the slot) when the product placed the glyph. A slotted `<span>`
 * is an inline box, which cannot be transformed, so a mirrored one is an inline block. Each selector is its own rule: a
 * selector a browser rejects must not take the others with it.
 */
const mirrorRules = (on: string) => `
  ${on}${MIRRORED_GLYPH} {
    ${MIRROR_DECLARATION}
  }
  ${on} ::slotted(${MIRRORED_GLYPH}) {
    display: inline-block;
    ${MIRROR_DECLARATION}
  }
  ${on}::slotted(${MIRRORED_GLYPH}) {
    display: inline-block;
    ${MIRROR_DECLARATION}
  }`;

/**
 * How a glyph of the system's icon set is drawn — the one source for `icons.css` (`.tanrei-icon` in the
 * light DOM) and for a component that draws its own icon in its shadow root (`iconGlyph()`), the way `shape.ts` is for
 * corners. Every value is a token or a custom property that holds one; the glyph itself belongs to the product.
 *
 * The optical size is the box's, clamped to `sys.icon.optical-size.min/max` (ICB-13), and written into
 * `font-variation-settings` by hand: `font-optical-sizing: auto` alone is not drawn by every engine — WebKit on Linux
 * (its Skia font path) ignores it and draws the font's default opsz (24 for Material Symbols) at every size. The box
 * size becomes a number through `tan(atan2(<length>, 1px))`, which every current engine evaluates, never through
 * `calc(<length> / 1px)`: where that is missing (Firefox) the WHOLE declaration is invalid at computed-value time and
 * fill and weight would be lost with it. The axis is written only where the engine parses that arithmetic
 * (`@supports`); elsewhere `font-optical-sizing: auto` stays the browser's own reading. The grade is left at 0.
 *
 * The weight is `sys.icon.weight` unless the caller names another: a control's own mark is drawn at the weight its
 * component token holds, which changes the stroke and nothing of the box.
 *
 * Every declaration is inherited, so text slotted into the element that carries them — `favorite`, a ligature — is
 * drawn by them too.
 */
const glyph = (o: { size: string; fill: string; family: string; weight?: string; duration?: string; easing?: string }) => `
    overflow: hidden;
    font-family: ${o.family};
    font-size: ${o.size};
    font-style: normal;
    font-weight: normal;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-user-select: none;
    user-select: none;
    font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    font-optical-sizing: auto;
    font-variation-settings: ${axes(o)};${o.duration && o.easing ? `\n    transition: font-variation-settings ${o.duration} ${o.easing};` : ''}`;

/** The glyph's axes: fill and weight (sys.icon.weight unless the caller names another), and — with `opticalSize` — the box's optical size, clamped to sys.icon.optical-size. */
const axes = (o: { size: string; fill: string; weight?: string }, opticalSize = false) =>
  `'FILL' ${o.fill}, 'wght' ${o.weight ?? 'var(--tanrei-sys-icon-weight)'}, 'GRAD' 0${opticalSize ? `, 'opsz' clamp(var(--tanrei-sys-icon-optical-size-min), tan(atan2(${o.size}, 1px)), var(--tanrei-sys-icon-optical-size-max))` : ''}`;

/**
 * The optical size, set by hand on `selector` wherever the engine can turn the box size into a number (see above). One
 * rule after the glyph's, so an engine that cannot keeps the whole declaration without the axis.
 */
const OPTICAL_SIZE_WRITTEN = `(font-variation-settings: 'opsz' tan(atan2(1em, 1px)))`;
const opticalSize = (selector: string, o: { size: string; fill: string; weight?: string }, indent = '  ') => `
${indent}@supports ${OPTICAL_SIZE_WRITTEN} {
${indent}  ${selector} {
${indent}    font-variation-settings: ${axes(o, true)};
${indent}  }
${indent}}`;

/**
 * The same axis for a stylesheet that draws a glyph of the icon set in a box of its own — a generated box (a chevron, an
 * arrow, a check), which cannot carry `.tanrei-icon` — and so writes the glyph's declarations by hand. Such a sheet
 * names the box's size after its glyph rule and leaves the arithmetic and the condition to this one source:
 *
 *   @supports glyph-optical-size {
 *     <the glyph rule's selector> {
 *       font-variation-settings: glyph-axes(<size>);            the unselected fill, sys.icon.weight
 *       font-variation-settings: glyph-axes(<size>, selected);  the selected fill
 *     }
 *   }
 *
 * scripts/build.js writes the condition and the axes in place (`writeGlyphAxes()`), so what reaches dist/ is the rule
 * `iconGlyph()` and `.tanrei-icon` carry. The source as it stands is a rule no engine reads: unbuilt, the glyph keeps
 * `font-optical-sizing: auto`.
 */
export function writeGlyphAxes(css: string): string {
  return css
    .replaceAll('@supports glyph-optical-size {', `@supports ${OPTICAL_SIZE_WRITTEN} {`)
    .replace(/glyph-axes\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*?)(,\s*selected)?\)/g, (_, size: string, selected: string | undefined) =>
      axes({ size: size.trim(), fill: `var(--tanrei-sys-icon-fill-${selected ? 'selected' : 'unselected'})` }, true),
    );
}

/**
 * The icon of a component, drawn in its shadow root: `on` is the box that holds the glyph (the slot's
 * parent), at the component's icon size token; `selected` is a selector for an ancestor of `on` that is true when the
 * icon stands for something selected — the component's own `[aria-pressed='true']` — which switches BOTH the family and
 * the fill of the selection (a static icon set is two families, a variable one uses the FILL axis). The fill changes
 * over the component's state duration and easing; a component whose icon never stands for a selection and that has no
 * motion of its own (a tag, TAG-12) leaves `duration` and `easing` out, and the glyph is drawn without a transition.
 *
 * `weight` is the token of the glyph's weight, as `size` is of its box. Left out, the glyph is drawn at
 * `sys.icon.weight`, as every icon is; a control's own mark — the check of a checkbox, the glyph on a
 * switch's handle — names its component token. The weight is the stroke only: the box stays `size`.
 *
 * The box passes its size and selection on as `--tanrei-icon-size`, `--tanrei-icon-fill` and `--tanrei-icon-family`, so
 * a `.tanrei-icon` slotted into it (whose own `icons.css` rules cannot see a shadow root's `aria-pressed`) follows them.
 *
 * In a right-to-left layout it draws mirrored the glyph that carries `data-tanrei-mirrored`: `on` itself,
 * or the element in a slot inside `on`. The component's `GlyphMirrorController` writes that mark, by the glyph's name.
 */
export function iconGlyph(on: string, tokens: { size: Property; selected: string; weight?: Property; duration?: Property; easing?: Property }): CSSResult {
  const moves = !!tokens.duration && !!tokens.easing;
  return unsafeCSS(`
  ${on} {
    --tanrei-icon-size: var(${tokens.size});
    --tanrei-icon-fill: var(--tanrei-sys-icon-fill-unselected);
    --tanrei-icon-family: var(--tanrei-sys-icon-family-unselected);
    display: inline-block;
    flex: none;
    inline-size: var(--tanrei-icon-size);
    block-size: var(--tanrei-icon-size);${glyph({ size: 'var(--tanrei-icon-size)', fill: 'var(--tanrei-icon-fill)', family: 'var(--tanrei-icon-family)', ...(tokens.weight ? { weight: `var(${tokens.weight})` } : {}), ...(moves ? { duration: `var(${tokens.duration})`, easing: `var(${tokens.easing})` } : {}) })}
  }${opticalSize(on, { size: 'var(--tanrei-icon-size)', fill: 'var(--tanrei-icon-fill)', ...(tokens.weight ? { weight: `var(${tokens.weight})` } : {}) })}
  ${tokens.selected} ${on} {
    --tanrei-icon-fill: var(--tanrei-sys-icon-fill-selected);
    --tanrei-icon-family: var(--tanrei-sys-icon-family-selected);
  }${mirrorRules(on)}${
    moves
      ? `
  @media (prefers-reduced-motion: reduce) {
    ${on} {
      transition: none;
    }
  }`
      : ''
  }
`);
}

/** `@tanrei/web/icons.css`, written to dist/ by scripts/build.js. */
export const ICONS_CSS = `/*
 * Tanrei icons on the web. Token-driven; no icon is bundled.
 *
 * The default design system draws icons with Material Symbols Rounded at weight 300. Load that font in your
 * product (it is referenced by name, like the text faces; \`tanrei build\` lists the families a system names), then:
 *
 *   <span class="tanrei-icon" aria-hidden="true">favorite</span>
 *
 * THE SIZE. A bare icon is drawn at sys.icon.medium, the default size; data-size="extra-small" | "small" |
 * "medium" | "large" picks a step of sys.icon.
 *
 * THE FILL RULE. An icon that stands for something UNSELECTED is outlined (FILL 0); the same icon in its
 * SELECTED state is filled (FILL 1). You never choose the fill by hand: it follows the state of the control the
 * icon sits in — aria-pressed, aria-selected, aria-checked, aria-current — or \`data-selected\` on the icon or
 * any ancestor. Inside <tanrei-button slot="icon"> it takes the button's icon size; inside a component that draws
 * the selection in its shadow root (<tanrei-button toggle selected>) it takes that component's size, family
 * and fill (--tanrei-icon-size, --tanrei-icon-fill, --tanrei-icon-family, inherited).
 *
 * THE ICON SET belongs to the design system: \`sys.icon.family.unselected\` and \`.selected\`. A variable
 * font (Material Symbols) is one family and the FILL axis tells the two states apart; a static set (Material Icons
 * Outlined / Material Icons) is two families, and the axes below are harmless to it. A selected icon therefore
 * always switches BOTH the family and the fill.
 *
 * RIGHT TO LEFT. A glyph that shows a direction along the line — arrow_back, chevron_right, send, undo — is
 * drawn mirrored in a right-to-left layout (the \`dir\` it inherits), in its own box; a check mark, a magnifier or a
 * play arrow is not. Which names mirror is a fact about the icon set (Google's autoMirrored flag for Material
 * Symbols), so it is resolved by script: Tanrei's components do it for the glyphs in their slots, and
 * \`@tanrei/web\` (or \`@tanrei/web/icons\` alone) does it for every bare .tanrei-icon of the document. Say
 * otherwise for one use with \`data-mirror\`:
 *
 *   <span class="tanrei-icon" data-mirror="never">format_align_left</span>   a physical direction: never mirrored
 *   <span class="tanrei-icon" data-mirror="always">my_arrow</span>           mirrored, whatever the list says
 *
 * WITH NO SCRIPT AT ALL nothing reads the names: write data-mirror="always" yourself on each glyph that shows a
 * direction. An image or an SVG is never mirrored for you.
 *
 * GENERATED from src/styles/icons.ts by scripts/build.js (one source with the components' own icons).
 */
@layer tanrei.components {
  /* Says that this stylesheet is loaded, to a stylesheet that draws a glyph only where it is (prose.css's task marks, PRS-10). */
  :root {
    --tanrei-icons: 1;
  }

  .tanrei-icon {
    --_size: var(--tanrei-icon-size, var(--tanrei-sys-icon-medium));
    --_fill: var(--tanrei-icon-fill, var(--tanrei-sys-icon-fill-unselected));
    --_family: var(--tanrei-icon-family, var(--tanrei-sys-icon-family-unselected));
    display: inline-block;
    flex: none;
    inline-size: var(--_size);
    block-size: var(--_size);${glyph({ size: 'var(--_size)', fill: 'var(--_fill)', family: 'var(--_family)', duration: 'var(--tanrei-sys-motion-duration-short3)', easing: 'var(--tanrei-sys-motion-easing-standard)' })}
    vertical-align: middle;
  }
${opticalSize('.tanrei-icon', { size: 'var(--_size)', fill: 'var(--_fill)' })}

  .tanrei-icon[data-size='extra-small'] { --tanrei-icon-size: var(--tanrei-sys-icon-extra-small); }
  .tanrei-icon[data-size='small'] { --tanrei-icon-size: var(--tanrei-sys-icon-small); }
  .tanrei-icon[data-size='medium'] { --tanrei-icon-size: var(--tanrei-sys-icon-medium); }
  .tanrei-icon[data-size='large'] { --tanrei-icon-size: var(--tanrei-sys-icon-large); }

  /* Selected → the selected family, filled. One rule, everywhere. */
  /* :where() keeps these at the specificity of one class, so the opt-out below always wins. A Tanrei control moves the
     product's aria-* on it to data-aria-* (src/primitives/delegated-aria.ts), so both names are read. */
  :where([aria-pressed='true'], [aria-selected='true'], [aria-checked='true'], [aria-current]:not([aria-current='false']), [data-aria-pressed='true'], [data-aria-selected='true'], [data-aria-checked='true'], [data-aria-current]:not([data-aria-current='false']), [data-selected]:not([data-selected='false'])) .tanrei-icon,
  .tanrei-icon:where([data-selected]:not([data-selected='false'])) {
    --_fill: var(--tanrei-sys-icon-fill-selected);
    --_family: var(--tanrei-sys-icon-family-selected);
  }
  /* An explicitly unselected icon inside a selected region stays outlined. */
  .tanrei-icon[data-selected='false'] {
    --_fill: var(--tanrei-sys-icon-fill-unselected);
    --_family: var(--tanrei-sys-icon-family-unselected);
  }

  /* Right to left: a glyph the icon set flags (marked by script) or the product forces, unless the product forbids it. */
  .tanrei-icon${MIRRORED_GLYPH} { ${MIRROR_DECLARATION} }

  @media (prefers-reduced-motion: reduce) {
    .tanrei-icon { transition: none; }
  }

  /* Hidden: the icon's own display is an author's rule, and beats the browser's for the attribute. */
  .tanrei-icon[hidden]:not([hidden='until-found' i]) { display: none; }
}
`;
