import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { AvailabilityController, OpenAxesController, hostAria, report } from '../../primitives/index.js';
import type { TanreiSwatchShapeRegistry, TanreiSwatchSizeRegistry } from '../../registry.js';
import { AXES, styles } from './swatch.styles.js';

/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiSwatchSize = keyof TanreiSwatchSizeRegistry;
/** The core shapes (square, circle), plus any a design system's generated `.d.ts` registers. */
export type TanreiSwatchShape = keyof TanreiSwatchShapeRegistry;

/** SWC-6: the notation every platform reads — a number sign and three, four, six or eight hexadecimal digits. */
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * SWC-6: the color as drawn — the value without the white space around it, where it reads as a color: the hexadecimal
 * notation, or (the web's own idiom) any CSS color the browser accepts, a custom property reference included, which is
 * resolved where the swatch stands. `''` for no color.
 */
function readColor(value: string): { color: string; refused: boolean } {
  const color = (value ?? '').trim();
  if (color === '') return { color: '', refused: false };
  if (HEX.test(color)) return { color, refused: false };
  const supported = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' ? CSS.supports('color', color) : false;
  return supported ? { color, refused: false } : { color: '', refused: true };
}

/**
 * Shows a color as a sample with its name beside it: a small square or dot of exactly that color, over a checkerboard
 * where the color lets what is behind it through, edged so that a color close to the surface still shows where it
 * ends. A sample to look at, never a control and never a picker.
 *
 * Contract: specs/swatch.spec.json. `<tanrei-swatch color="#0f766e" label="Teal 700" supporting-text="#0f766e">`. The
 * name is drawn beside the sample by default, because a color is never told by its sample alone; `label-hidden` draws
 * the sample alone and makes the name its accessible name, and `decorative` hides a swatch that stands beside the same
 * name in visible text. `color` takes the hexadecimal notation every platform reads (`#0f766e`, `#0f766e80` with an
 * alpha) and any CSS color, `var(--tanrei-sys-color-primary)` included. Every visual value is a `--tanrei-comp-swatch-*`
 * token; how far its corners ease is the system's amount (`--tanrei-sys-shape-corner-smoothing`).
 *
 * It takes no input and no focus and emits no event: a swatch that leads somewhere is inside a link, one that does
 * something inside a Button, and a set of swatches of which one is chosen is a picker, not this element.
 *
 * @tag tanrei-swatch
 * @csspart sample - The sample: its side, its corners, the color over the checkerboard, and its edge.
 * @csspart label - The color's name, beside the sample.
 * @csspart supporting-text - The line under the name.
 */
export class TanreiSwatch extends LitElement {
  private readonly availability = new AvailabilityController(this, 'swatch');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    color: { type: String },
    label: { type: String },
    supportingText: { type: String, attribute: 'supporting-text' },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    decorative: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    shape: { type: String, reflect: true },
  };

  /** The color the sample shows: `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` in sRGB, or any CSS color (`var(--tanrei-sys-color-primary)`). Empty shows no color: the edge alone. */
  color = '';

  /** The color's name ("Teal 700", "Primary"). Drawn beside the sample, and what assistive technology reads; with `label-hidden` it is the sample's accessible name. */
  label = '';

  /** A line under the name: the color's value ("#0f766e"), the token it comes from, or where it is used. With `label-hidden` it is the sample's accessible description. */
  supportingText = '';

  /** True draws the sample alone, for a place with no room for text; the label becomes its accessible name. Prefer a visible label. */
  labelHidden = false;

  /** True draws the sample alone and hides the swatch from assistive technology, for a swatch beside the same name in visible text. */
  decorative = false;

  /** Small (16) beside small text, medium (24) beside body text, large (32) where the color itself is looked at. */
  size: TanreiSwatchSize = 'medium';

  /** Square, a slightly rounded square, is a tile of the color; circle is a dot. */
  shape: TanreiSwatchShape = 'square';

  /** SWC-19: sizes and shapes a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'swatch', behavior: 'SWC-19', axes: AXES });

  private get name(): string {
    return (this.label ?? '').trim();
  }

  private get supporting(): string {
    return (this.supportingText ?? '').trim();
  }

  /** SWC-7, SWC-8: whether the text is drawn beside the sample. */
  private get texted(): boolean {
    return !this.labelHidden && !this.decorative && (this.name !== '' || this.supporting !== '');
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // SWC-6: a value that reads as no color is drawn as empty, and a debug build names it.
    if (changed.has('color') && readColor(this.color).refused) report(this, 'SWC-6', `color "${this.color}" reads as no color; the swatch is drawn as empty`, { once: false });
  }

  protected override updated(changed: PropertyValues<this>) {
    const [name, supporting] = [this.name, this.supporting];
    const nameless = name === '' && supporting === '';
    // SWC-9: with its text drawn, the swatch is that text (the sample is hidden in the template). SWC-10: with the
    // label hidden, one image named by label (supportingText where there is none) and described by supportingText.
    // SWC-11, SWC-12: decorative, or with no name, it exposes nothing.
    const image = this.labelHidden && !this.decorative && !nameless;
    const hidden = this.decorative || nameless;
    hostAria(this, {
      role: image ? 'img' : null,
      'aria-label': image ? name || supporting : null,
      'aria-description': image && name && supporting ? supporting : null,
      'aria-hidden': hidden ? 'true' : null,
    });
    if ((changed.has('label') || changed.has('supportingText') || changed.has('decorative')) && nameless && !this.decorative) {
      report(this, 'SWC-12', 'a color is shown without a name, so the swatch exposes nothing; give it a label, or set decorative beside that name in text');
    }
  }

  protected override render() {
    const { color } = readColor(this.color);
    const texted = this.texted;
    // SWC-2: the color is a custom property set through the style API, so any CSS color resolves where the swatch
    // stands and a value that is not one cannot reach any other declaration.
    return html`
      <span part="sample" class="sample ${color ? '' : 'empty'}" data-tanrei-shape aria-hidden="true" style=${styleMap({ '--_color': color || null })}></span>
      ${texted
        ? html`<span class="text">
            ${this.name ? html`<span part="label" class="label">${this.name}</span>` : nothing}
            ${this.supporting ? html`<span part="supporting-text" class="supporting">${this.supporting}</span>` : nothing}
          </span>`
        : nothing}
    `;
  }
}

if (!customElements.get('tanrei-swatch')) customElements.define('tanrei-swatch', TanreiSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-swatch': TanreiSwatch;
  }
}
