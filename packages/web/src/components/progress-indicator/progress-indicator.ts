import { LitElement, type PropertyDeclarations, type PropertyValues, type TemplateResult, html, nothing, svg } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { keyed } from 'lit/directives/keyed.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  AvailabilityController,
  OpenAxesController,
  SEPARATION_VALUES,
  type SeparationProp,
  SystemWatchController,
  VisibilityController,
  hostAria,
  report,
  syncSeparation,
} from '../../primitives/index.js';
import type { TanreiProgressIndicatorSizeRegistry } from '../../registry.js';
import { AXES, VARIANTS, styles } from './progress-indicator.styles.js';

/** `linear` is a bar that fills its layout's width; `circular` is a ring of a fixed size. Drawn by the component: a design system cannot add a form. */
export type TanreiProgressIndicatorVariant = 'linear' | 'circular';
/** How a determinate indicator is told from the rest of its track: `auto` takes the design system's answer. */
export type TanreiProgressIndicatorSeparation = SeparationProp;
/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiProgressIndicatorSize = keyof TanreiProgressIndicatorSizeRegistry;

/**
 * Shows how far a task has come, or that it is under way when how far is unknown, as a bar or a ring.
 *
 * Contract: specs/progress-indicator.spec.json. As a native `<progress>`: no `value` attribute (or removing it, or
 * `value = null`) is indeterminate. Every visual value is a `--tanrei-comp-progress-indicator-*` token — the bar's
 * thickness and the ring's size and stroke per size, the track and indicator colors, the ends' shape, the gap after the
 * indicator, the stop indicator, and the motion of a value change and of the indeterminate cycle. Whether the gap and
 * the stop indicator are drawn at all is `separation` (PRG-17): `auto` follows
 * `comp.progress-indicator.track.separation`, and so the design system's `sys.behavior.separation`.
 *
 * The host is the progressbar (`role="progressbar"`, `aria-label` from `label`, `aria-valuemin` / `-max` / `-now` and
 * `aria-valuetext` from `value-text` while determinate; `aria-busy="true"` and no value while indeterminate). It is
 * never focusable and never announces a change by itself. Under `prefers-reduced-motion: reduce` a value change shows
 * at once and the indeterminate form pulses in place; off screen, its animation is paused.
 *
 * @tag tanrei-progress-indicator
 * @csspart track - The whole of the task: the bar's track, or the ring's circle (the form the separation draws).
 * @csspart indicator - The part done, or the moving segment or arc.
 * @csspart stop-indicator - The dot at the end of a determinate bar's track (drawn under `gap`, when its size token is above 0).
 */
export class TanreiProgressIndicator extends LitElement {
  private readonly availability = new AvailabilityController(this, 'progress-indicator');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    separation: { type: String, reflect: true },
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    label: { type: String },
    valueText: { type: String, attribute: 'value-text' },
  };

  /** A bar (`linear`, the default) or a ring (`circular`). */
  variant: TanreiProgressIndicatorVariant = 'linear';

  /** The bar's thickness (2 / 4 / 8 in the default system) or the ring's box (16 / 24 / 40). */
  size: TanreiProgressIndicatorSize = 'medium';

  /**
   * How a determinate indicator is told from the rest of its track. `divider`: the indicator is drawn on the track,
   * touching it — the edge where its color ends divides them. `gap`: `track.gap` of empty space is left between them
   * (on a ring at both ends of the arc), and a bar draws the stop indicator at its track's end. `auto` takes
   * `comp.progress-indicator.track.separation`, the design system's answer (divider in the default system). An
   * indeterminate indicator is drawn the same under either. Anything else is `auto` (reported in debug builds, PRG-12).
   */
  separation: TanreiProgressIndicatorSeparation = 'auto';

  /** How far the task has come, between min and max. Null (no attribute) is indeterminate. */
  value: number | null = null;

  /** The value at which nothing is done. */
  min = 0;

  /** The value at which the task is done. */
  max = 1;

  /** The accessible name: what is in progress ("Uploading report.pdf"). Required. */
  label = '';

  /** How assistive technology reads the value when a percentage is not the natural reading ("3 of 10 files"); the `value-text` attribute. */
  valueText = '';

  /** PRG-12: sizes a design system adds, and a size the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'progress-indicator', behavior: 'PRG-12', axes: AXES });

  /** PRG-17: where a browser has no style queries, the separation is read when it renders — again when the system is switched. */
  private readonly system = new SystemWatchController(this);

  /** PRG-14: the indeterminate animation runs only while the indicator can be seen. */
  private readonly visibility = new VisibilityController(this);

  private get determinate() {
    return typeof this.value === 'number' && !Number.isNaN(this.value);
  }

  /** PRG-11: the range and value as drawn and exposed — clamped, and 0 in 0…1 when max is not greater than min. */
  private get range(): { min: number; max: number; now: number; fraction: number } {
    const [min, max] = [Number(this.min ?? 0), Number(this.max ?? 1)];
    if (!(max > min)) return { min: 0, max: 1, now: 0, fraction: 0 };
    const now = Math.min(max, Math.max(min, this.value as number));
    return { min, max, now, fraction: (now - min) / (max - min) };
  }

  private get circular() {
    return this.variant === 'circular';
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // PRG-12: a variant the component does not define is drawn as linear (only `circular` has rules of its own).
    if (changed.has('variant') && !(VARIANTS as readonly string[]).includes(this.variant)) {
      report(this, 'PRG-12', `variant "${this.variant}" is not a value of the progress indicator; it is drawn as "linear"`);
    }
    // PRG-12: a separation the component does not define is drawn as auto (no rule matches it).
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'PRG-12', `separation "${this.separation}" is not a value of the progress indicator; it is drawn as "auto"`);
    }
    // PRG-11: what the value is drawn as, named in debug builds.
    if ((changed.has('value') || changed.has('min') || changed.has('max')) && this.determinate) {
      const [min, max, value] = [Number(this.min ?? 0), Number(this.max ?? 1), this.value as number];
      if (!(max > min)) report(this, 'PRG-11', `max ${max} is not greater than min ${min}; the track is drawn with no indicator, and 0 of 0…1 is exposed`);
      else if (value < min || value > max) report(this, 'PRG-11', `value ${value} is outside ${min}…${max}; it is drawn and exposed as ${Math.min(max, Math.max(min, value))}`);
    }
    // PRG-15: a bar alone is not a name.
    if (changed.has('label') && !this.label) report(this, 'PRG-15', 'label is empty, so the progress indicator has no accessible name; give it a label');

    // PRG-8 / PRG-9 / PRG-10: the host is the progressbar; never focusable, never a live region.
    const range = this.determinate ? this.range : null;
    hostAria(this, {
      role: 'progressbar',
      'aria-label': this.label || null,
      'aria-valuemin': range ? String(range.min) : null,
      'aria-valuemax': range ? String(range.max) : null,
      'aria-valuenow': range ? String(range.now) : null,
      'aria-valuetext': range && this.valueText ? this.valueText : null,
      'aria-busy': range ? null : 'true',
    });
  }

  protected override updated() {
    // PRG-17: without style queries, the name the cascade gives now is written for the styles to match.
    syncSeparation(this, this.renderRoot.querySelector<HTMLElement>('.bar, .ring'));
  }

  protected override render(): unknown {
    const determinate = this.determinate;
    const fraction = determinate ? this.range.fraction : 0;
    const classes = {
      determinate,
      indeterminate: !determinate,
      // PRG-5: the gap is left only while the value lies strictly between min and max (and the separation is gap).
      between: determinate && fraction > 0 && fraction < 1,
      empty: determinate && fraction === 0,
      full: determinate && fraction === 1,
      paused: !this.visibility.visible,
    };
    const inputs = styleMap({ '--_f': String(fraction) });
    // PRG-6: switching between determinate and indeterminate takes effect at once — a new drawing, with nothing to
    // transition from. Within one mode the same elements stay, so a value change transitions.
    const mode = `${this.circular ? 'circular' : 'linear'}-${determinate ? 'determinate' : 'indeterminate'}`;
    return keyed(mode, this.circular ? this.renderRing(classes, inputs) : this.renderBar(classes, inputs, determinate));
  }

  private renderBar(classes: Record<string, boolean>, inputs: ReturnType<typeof styleMap>, determinate: boolean): TemplateResult {
    return html`
      <div class=${classMap({ bar: true, ...classes })} style=${inputs} data-tanrei-shape>
        <div part="track" class="track under" data-tanrei-shape></div>
        <div part="track" class="track after" data-tanrei-shape></div>
        <div part="indicator" class="indicator" data-tanrei-shape></div>
        ${determinate ? html`<div part="stop-indicator" class="stop"></div>` : nothing}
      </div>
    `;
  }

  private renderRing(classes: Record<string, boolean>, inputs: ReturnType<typeof styleMap>): TemplateResult {
    // PRG-17: the track is drawn twice — whole, under the indicator (divider), and after the gap (gap) — and the styles
    // show one, so that a change of separation shows the other form at once, with nothing to move from.
    const circles = svg`<circle part="track" class="track under"></circle><circle part="track" class="track after"></circle><circle part="indicator" class="indicator"></circle>`;
    return html`
      <div class=${classMap({ ring: true, ...classes })} style=${inputs}>
        <div class="spin">
          <svg aria-hidden="true" focusable="false">${circles}</svg>
          <div class="caps"><svg aria-hidden="true" focusable="false">${circles}</svg></div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('tanrei-progress-indicator')) customElements.define('tanrei-progress-indicator', TanreiProgressIndicator);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-progress-indicator': TanreiProgressIndicator;
  }
}
