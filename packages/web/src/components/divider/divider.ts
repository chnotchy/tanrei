import { LitElement, type PropertyDeclarations, type PropertyValues, html } from 'lit';
import { AvailabilityController, hostAria, report } from '../../primitives/index.js';
import { INSETS, LINE_CAPS, LINE_STYLES, ORIENTATIONS, styles } from './divider.styles.js';

/** `horizontal` separates stacked content; `vertical` separates content in a row. */
export type TanreiDividerOrientation = 'horizontal' | 'vertical';
/** `none` spans the full length; `start` leaves the inset at the start; `both` leaves it at both ends. */
export type TanreiDividerInset = 'none' | 'start' | 'both';
/** How the line is drawn: one stroke, a row of dots, a row of dashes, or a wave. */
export type TanreiDividerLineStyle = 'solid' | 'dotted' | 'dashed' | 'wavy';
/** How the line's ends, and every dot's and dash's ends, are drawn — always inside their lengths. */
export type TanreiDividerLineCap = 'butt' | 'round';

/** The six lengths a divider may be given, the custom property each one sets, and the styles that draw it (DIV-14). */
const LENGTHS = [
  { prop: 'thickness', given: '--_given-thickness', token: 'comp.divider.line.thickness', zero: false },
  { prop: 'insetLength', given: '--_given-inset', token: 'comp.divider.line.inset', zero: true },
  { prop: 'dashLength', given: '--_given-dash', token: 'comp.divider.line.dash.length', zero: false },
  { prop: 'gap', given: '--_given-gap', token: 'comp.divider.line.dot.gap or comp.divider.line.dash.gap', zero: true },
  { prop: 'amplitude', given: '--_given-amplitude', token: 'comp.divider.line.wave.amplitude', zero: true },
  { prop: 'wavelength', given: '--_given-wavelength', token: 'comp.divider.line.wave.wavelength', zero: false },
] as const;
type LengthProp = (typeof LENGTHS)[number]['prop'];

const px = (value: string) => Number.parseFloat(value) || 0;
const n = (value: number) => Number(value.toFixed(3));

/**
 * Square-ended dashes as one gradient, opaque across the whole line: drawn at any thickness, where an image mask is not
 * (Firefox and WebKit draw nothing from an image under a device pixel tall — a hairline thinner than one).
 */
function buttDashes(dashes: [number, number][], vertical: boolean) {
  const stops = dashes.flatMap(([a, b]) => [`transparent ${n(a)}px`, `black ${n(a)}px ${n(b)}px`, `transparent ${n(b)}px`]);
  return `linear-gradient(${vertical ? 'to bottom' : 'to right'}, ${stops.join(', ')})`;
}

/**
 * Round-ended dashes as an SVG image the size of the line: each a stroke with round caps, shortened by half the thickness
 * at each end so the caps stay inside its length (DIV-13); a dash no longer than the line is thick is one disc at its
 * center (a zero-length stroke). Used only where a cap spans a device pixel or more; below that it cannot be seen.
 */
function roundDashes(dashes: [number, number][], t: number, drawn: number, vertical: boolean) {
  const r = t / 2;
  const at = (along: number) => (vertical ? `${n(r)} ${n(along)}` : `${n(along)} ${n(r)}`);
  const d = dashes.map(([a, b]) => (b - a > t ? `M${at(a + r)}L${at(b - r)}` : `M${at((a + b) / 2)}l0 0`)).join('');
  const [w, h] = vertical ? [t, drawn] : [drawn, t];
  const image = `<svg xmlns="http://www.w3.org/2000/svg" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${n(w)} ${n(h)}" preserveAspectRatio="none"><path d="${d}" stroke="black" stroke-width="${n(t)}" stroke-linecap="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(image)}")`;
}

/**
 * Separates groups of content in a list, a layout or a toolbar with a thin line.
 *
 * Contract: specs/divider.spec.json. The line's color, thickness, inset and the lengths of its dots, dashes and wave are
 * `--tanrei-comp-divider-*` tokens; one divider may be given a thickness of its own (`thickness`, DIV-16), which also
 * scales the pattern lengths it takes from tokens, so a thicker dotted, dashed or wavy line keeps its proportions. The divider has no margin of its own (DIV-2): put the space around it in the layout
 * that places it. It spans its container's inline size when horizontal (in block flow, a flex column or a grid) and its
 * container's block size when vertical (in a flex row or a grid, which stretch it; elsewhere give it a block size).
 *
 * Not an `<hr>`: an hr is horizontal only and always a separator. Decorative (the default), the host is
 * `aria-hidden="true"`; with `decorative="false"` (or the property set to false) it is `role="separator"` with its
 * `aria-orientation`. It is never focusable.
 *
 * @tag tanrei-divider
 * @csspart line - The drawn line (the inset stretch is outside it): a bordered box for solid, dotted and dashed, an SVG for wavy.
 */
export class TanreiDivider extends LitElement {
  private readonly availability = new AvailabilityController(this, 'divider');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    orientation: { type: String, reflect: true },
    inset: { type: String, reflect: true },
    lineStyle: { type: String, reflect: true, attribute: 'line-style' },
    lineCap: { type: String, reflect: true, attribute: 'line-cap' },
    insetLength: { type: Number, attribute: 'inset-length' },
    thickness: { type: Number },
    dashLength: { type: Number, attribute: 'dash-length' },
    gap: { type: Number },
    amplitude: { type: Number },
    wavelength: { type: Number },
    decorative: {
      type: Boolean,
      // True unless the attribute says "false": a boolean that defaults to true cannot be turned off by absence.
      converter: { fromAttribute: (value: string | null) => value !== 'false' },
    },
  };

  /** Horizontal spans the container's width; vertical spans its height. */
  orientation: TanreiDividerOrientation = 'horizontal';

  /** Shortens the line by `insetLength` (else `comp.divider.line.inset`) at its start (`start`) or at both ends (`both`). */
  inset: TanreiDividerInset = 'none';

  /** Solid, dotted, dashed or wavy (`line-style`). */
  lineStyle: TanreiDividerLineStyle = 'solid';

  /** `butt` ends square at the length; `round` ends in a half-disc inside it (`line-cap`). Shows only on a line thicker than a hairline. */
  lineCap: TanreiDividerLineCap = 'butt';

  /** The inset's length in CSS px while `inset` is `start` or `both` (`inset-length`); null takes `comp.divider.line.inset`. */
  insetLength: number | null = null;

  /**
   * How thick this divider's line is, in CSS px; null takes `comp.divider.line.thickness`. It stands in for the token
   * wherever the line's thickness is read — the line, a dot's side, a dash's width and least length, the wave's stroke,
   * a round cap's diameter and the divider's own size across its axis — and the pattern lengths that come from tokens
   * (not from `dash-length`, `gap`, `amplitude` or `wavelength`) are scaled by it over the token, so the pattern keeps
   * its proportions (DIV-16). The inset is not scaled. 0, a negative number or a value that is not a number takes the token.
   */
  thickness: number | null = null;

  /** One dash's length in CSS px, round caps included (`dash-length`); null takes `comp.divider.line.dash.length`. Dashed only. */
  dashLength: number | null = null;

  /** The least space between two dots or dashes in CSS px; null takes `comp.divider.line.dot.gap` / `comp.divider.line.dash.gap`. Dotted and dashed only. */
  gap: number | null = null;

  /** A wave's crest from the midline to the stroke's center in CSS px; null takes `comp.divider.line.wave.amplitude`. Wavy only. */
  amplitude: number | null = null;

  /** One wave (a crest and a trough) in CSS px, before it is fitted to the line; null takes `comp.divider.line.wave.wavelength`. Wavy only. */
  wavelength: number | null = null;

  /** Hidden from assistive technology. Set to false (`decorative="false"`) only when the grouping is meaningful: the divider is then a separator. */
  decorative = true;

  /**
   * The lengths this divider was given, as `--_given-*` on the host, after the static styles (DIV-14) — a sheet of its
   * own, made when a length is first given: a divider given none, which nearly every one is, shares the static styles
   * and has no sheet.
   */
  private given: CSSStyleSheet | null = null;
  /** A pattern is laid out from the line's length, so a patterned divider follows its own size; a solid line follows nothing. */
  private resize$: ResizeObserver | null = null;
  private watching = false;

  private watch(on: boolean) {
    if (on === this.watching) return;
    this.watching = on;
    if (!on) return void this.resize$?.disconnect();
    if (typeof ResizeObserver === 'undefined') return;
    this.resize$ ??= new ResizeObserver(() => this.lay());
    this.resize$.observe(this);
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.watch(this.drawnStyle !== 'solid');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.watch(false);
  }

  /** The style drawn: an unknown one is solid (DIV-7). */
  private get drawnStyle(): TanreiDividerLineStyle {
    return (LINE_STYLES as readonly string[]).includes(this.lineStyle) ? this.lineStyle : 'solid';
  }

  /** Whether the current style and inset draw a length prop; one that is not drawn is ignored and not reported (DIV-14). */
  private draws(prop: LengthProp): boolean {
    const style = this.drawnStyle;
    switch (prop) {
      case 'thickness':
        return true;
      case 'insetLength':
        return this.inset === 'start' || this.inset === 'both';
      case 'dashLength':
        return style === 'dashed';
      case 'gap':
        return style === 'dotted' || style === 'dashed';
      default:
        return style === 'wavy';
    }
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // DIV-7: a value the divider does not define is drawn as the default (the styles only select the other values) and
    // reported in debug builds.
    if (changed.has('orientation') && !(ORIENTATIONS as readonly string[]).includes(this.orientation)) {
      report(this, 'DIV-7', `orientation "${this.orientation}" is not a value of the divider; it is drawn as "horizontal"`);
    }
    if (changed.has('inset') && !(INSETS as readonly string[]).includes(this.inset)) {
      report(this, 'DIV-7', `inset "${this.inset}" is not a value of the divider; it is drawn as "none"`);
    }
    if (changed.has('lineStyle') && !(LINE_STYLES as readonly string[]).includes(this.lineStyle)) {
      report(this, 'DIV-7', `lineStyle "${this.lineStyle}" is not a value of the divider; it is drawn as "solid"`);
    }
    if (changed.has('lineCap') && !(LINE_CAPS as readonly string[]).includes(this.lineCap)) {
      report(this, 'DIV-7', `lineCap "${this.lineCap}" is not a value of the divider; it is drawn as "butt"`);
    }
    // DIV-14: a length is used as given, in CSS px, not scaled by any dial; null, or a value that is not a finite
    // non-negative number (or a zero thickness, dash length or wavelength), takes the token — the latter reported
    // while drawn (the thickness is drawn by every style).
    const declarations: string[] = [];
    this.givenThickness = null;
    for (const { prop, given, token, zero } of LENGTHS) {
      const value = this[prop] as unknown;
      if (value === null || value === undefined) continue;
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && (zero || value > 0)) {
        declarations.push(`${given}: ${value}px;`);
        if (prop === 'thickness') this.givenThickness = value;
      } else if (this.draws(prop)) {
        report(this, 'DIV-14', `${prop} ${typeof value === 'number' ? String(value) : JSON.stringify(value)} is not a length the divider can draw; it takes ${token}`);
      }
    }
    this.declarations = declarations;
    this.writeGiven();
    // DIV-5 / DIV-6: never focusable; hidden, or a separator with its orientation and no name of its own.
    const vertical = this.orientation === 'vertical';
    hostAria(
      this,
      this.decorative
        ? { 'aria-hidden': 'true', role: null, 'aria-orientation': null }
        : { 'aria-hidden': null, role: 'separator', 'aria-orientation': vertical ? 'vertical' : 'horizontal' },
    );
  }

  protected override updated() {
    this.scale();
    this.lay();
    this.watch(this.isConnected && this.drawnStyle !== 'solid');
  }

  /** The valid thickness this divider was given, or null (DIV-14). */
  private givenThickness: number | null = null;
  /** The `--_given-*` declarations of the lengths given, and the scale of the token pattern lengths (DIV-16). */
  private declarations: string[] = [];
  private scaled = 1;

  private writeGiven() {
    const all = this.scaled === 1 ? this.declarations : [...this.declarations, `--_scale: ${this.scaled};`];
    if (!this.given) {
      const root = this.renderRoot;
      if (!all.length || typeof CSSStyleSheet === 'undefined' || !(root instanceof ShadowRoot) || !root.adoptedStyleSheets) return;
      this.given = new CSSStyleSheet();
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.given];
    }
    this.given.replaceSync(all.length ? `:host { ${all.join(' ')} }` : '');
  }

  /**
   * DIV-16: the pattern lengths taken from tokens are scaled by the thickness given over the token's. The quotient of
   * two lengths is not something CSS can compute in every engine, so it is taken here, from the token as the probe
   * resolves it, and handed to the styles as a number. A solid line has no pattern (and no probe).
   */
  private scale() {
    const probe = this.renderRoot.querySelector<HTMLElement>('.probe');
    const token = probe ? px(getComputedStyle(probe).marginLeft) : 0;
    const scaled = this.givenThickness !== null && token > 0 ? Number((this.givenThickness / token).toFixed(6)) : 1;
    if (scaled === this.scaled) return;
    this.scaled = scaled;
    this.writeGiven();
  }

  /** The lengths a pattern is laid out from, resolved in CSS px, and the host's length and cross size. */
  private measure() {
    const probe = this.renderRoot.querySelector<HTMLElement>('.probe');
    if (!probe) return null;
    const p = getComputedStyle(probe);
    const [amplitude, end, wavelength, start, thickness, dash, gap] = [p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft, p.marginTop, p.marginRight, p.marginBottom].map(px);
    const host = getComputedStyle(this);
    const vertical = this.orientation === 'vertical';
    const [length, cross] = vertical ? [px(host.height), px(host.width)] : [px(host.width), px(host.height)];
    return { amplitude, wavelength, thickness, dash, gap, start, end, vertical, cross, drawn: length - start - end, round: this.lineCap === 'round' };
  }

  /** Lays the current style's pattern out; a resize calls it again, without a render. */
  private lay() {
    const style = this.drawnStyle;
    if (style === 'wavy') this.layWave();
    else if (style === 'dotted' || style === 'dashed') this.layDashes(style === 'dotted');
  }

  /**
   * DIV-10, DIV-11, DIV-13: the dots or dashes over the drawn stretch, as the line's mask. As many as fit at least the
   * gap apart, the first at the start and the last at the end, every gap widened alike; one that fits alone is centered
   * and no longer than the stretch. A round cap is drawn inside each dash's length. The pattern is symmetric, so it
   * needs nothing for RTL (DIV-4).
   */
  private layDashes(dotted: boolean) {
    const line = this.renderRoot.querySelector<HTMLElement>('.line');
    const m = this.measure();
    if (!line || !m) return;
    const { thickness: t, gap, drawn, vertical, round } = m;
    const dash = dotted ? t : Math.max(m.dash, t);
    const count = drawn > 0 ? Math.floor((drawn + gap) / (dash + gap) + 1e-9) : 0;
    const dashes: [number, number][] = [];
    if (count >= 2) {
      const pitch = (drawn - dash) / (count - 1);
      for (let i = 0; i < count; i++) dashes.push([i * pitch, i * pitch + dash]);
    } else if (drawn > 0) {
      const one = Math.min(dash, drawn);
      dashes.push([(drawn - one) / 2, (drawn + one) / 2]);
    }
    line.style.setProperty('--_pattern', dashes.length ? (round && t * (window.devicePixelRatio || 1) >= 2 ? roundDashes(dashes, t, drawn, vertical) : buttDashes(dashes, vertical)) : null);
  }

  /**
   * DIV-12, DIV-13: the wave's path, in the host's CSS px, laid out along the logical start (CSS mirrors it in RTL,
   * DIV-4). Circular arcs of half the fitted wavelength each, alternating sides of the midline and meeting on it; the
   * first rises toward the top (horizontal) or the left (vertical). A round cap lies inside the length: the arcs are laid
   * out over the drawn stretch less half the thickness at each end.
   */
  private layWave() {
    const m = this.measure();
    if (!m) return;
    const { amplitude, wavelength, thickness, start, vertical, cross, round, drawn } = m;
    const stretch = drawn - (round ? thickness : 0);
    const from = start + (round ? thickness / 2 : 0);
    const mid = cross / 2;
    const at = (along: number, across: number) => (vertical ? `${n(across)} ${n(along)}` : `${n(along)} ${n(across)}`);
    let d = '';
    if (drawn > 0 && stretch <= 0) {
      // Only the caps fit: a zero-length stroke, which a round cap draws as one disc at the stretch's center.
      d = `M ${at(start + drawn / 2, mid)} l 0 0`;
    } else if (drawn > 0) {
      const waves = Math.max(1, Math.round(stretch / (wavelength > 0 ? wavelength : stretch)));
      const half = stretch / waves / 2;
      const sagitta = Math.min(Math.max(amplitude, 0), half / 2);
      d = `M ${at(from, mid)}`;
      if (sagitta <= 0) d += ` L ${at(from + stretch, mid)}`;
      else {
        const radius = ((half / 2) ** 2 + sagitta ** 2) / (2 * sagitta);
        for (let i = 0; i < waves * 2; i++) {
          // Screen coordinates run down: toward the top is clockwise going right; toward the left is counterclockwise going down.
          const sweep = (i % 2 === 0) !== vertical ? 1 : 0;
          d += ` A ${n(radius)} ${n(radius)} 0 0 ${sweep} ${at(from + (i + 1) * half, mid)}`;
        }
      }
    }
    // DIV-8: at least one device pixel thick. Written straight to the path: a resize lays the wave out again without a render.
    const path = this.renderRoot.querySelector('.wave path');
    if (!path) return;
    if (d) path.setAttribute('d', d);
    else path.removeAttribute('d');
    path.setAttribute('stroke-width', String(n(Math.max(thickness, 1 / (window.devicePixelRatio || 1)))));
  }

  protected override render() {
    const style = this.drawnStyle;
    if (style === 'solid') return html`<div part="line" class="line"></div>`;
    if (style !== 'wavy') return html`<span class="probe"></span><div part="line" class="line"></div>`;
    return html`<span class="probe"></span><svg part="line" class="wave" aria-hidden="true"><path></path></svg>`;
  }
}

if (!customElements.get('tanrei-divider')) customElements.define('tanrei-divider', TanreiDivider);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-divider': TanreiDivider;
  }
}
