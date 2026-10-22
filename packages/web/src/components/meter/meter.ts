import { type PropertyDeclarations, type PropertyValues, html } from 'lit';
import {
  AvailabilityController,
  DIRECTION_PROBE,
  DirectionController,
  OpenAxesController,
  SEPARATION_VALUES,
  type SeparationProp,
  SystemWatchController,
  hostAria,
  rangeClasses,
  rangeOf,
  renderRangeBar,
  renderRangeRing,
  report,
  syncSeparation,
} from '../../primitives/index.js';
import type { TanreiMeterSizeRegistry } from '../../registry.js';
import { AXES, STATUSES, VARIANTS, styles } from './meter.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** `linear` is a bar that fills its layout's width; `circular` is a ring of a fixed size. Drawn by the component: a design system cannot add a form. */
export type TanreiMeterVariant = 'linear' | 'circular';
/** How the indicator is told from the rest of its track: `auto` takes the design system's answer. */
export type TanreiMeterSeparation = SeparationProp;
/** What the product says the value means; it changes the indicator's color only. */
export type TanreiMeterStatus = (typeof STATUSES)[number];
/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiMeterSize = keyof TanreiMeterSizeRegistry;

/**
 * Shows where a known value stands in a known range — storage used, a battery's charge, a quota, the strength of a
 * password — as a bar or a ring that looks like the progress indicator, without saying that anything is under way.
 *
 * Contract: specs/meter.spec.json. Drawn as the progress indicator's determinate form is (the two share the drawing,
 * `src/primitives/range-track.ts`), from `--tanrei-comp-meter-*` tokens, which by default are the progress
 * indicator's; the meter never runs an indeterminate animation. `status` (default, info, success, warning, error)
 * changes the indicator's color and nothing else: the meter has no thresholds of its own, and what the color means is
 * said in words by `value-text`, `label` or the text beside it (MTR-9).
 *
 * The host is the meter (`role="meter"`, `aria-label` from `label`, `aria-valuemin` / `-max` / `-now` and
 * `aria-valuetext` from `value-text`); never a progressbar, never busy, never focusable, never a live region. A change of
 * value or status moves the end and fades the color over `motion.value-duration`, from the second frame on; under
 * `prefers-reduced-motion: reduce` the end moves at once and the color still fades.
 *
 * @tag tanrei-meter
 * @csspart track - The whole range: the bar's track, or the ring's circle (the form the separation draws).
 * @csspart indicator - The part of the range up to the value, in the color of the status.
 * @csspart stop-indicator - The dot at the end of a bar's track (drawn when its size token is above 0, and not at max).
 */
export class TanreiMeter extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'meter');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    separation: { type: String, reflect: true },
    status: { type: String, reflect: true },
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    label: { type: String },
    valueText: { type: String, attribute: 'value-text' },
  };

  /** A bar (`linear`, the default) or a ring (`circular`). */
  variant: TanreiMeterVariant = 'linear';

  /** The bar's thickness or the ring's box — the progress indicator's three sizes by default (2 / 4 / 8 and 16 / 24 / 40). */
  size: TanreiMeterSize = 'medium';

  /**
   * How the indicator is told from the rest of its track. `divider`: drawn on the track, touching it. `gap`:
   * `track.gap` of empty space between them (on a ring at both ends of the arc). `auto` takes
   * `comp.meter.track.separation`, which follows the progress indicator's and so the design system's. Anything else
   * is `auto` (reported in debug builds, MTR-11).
   */
  separation: TanreiMeterSeparation = 'auto';

  /**
   * What the product says the value means, in the names the tag and the snackbar use: `default` draws the meter's own
   * indicator color, the others that status's. It changes the color only; say what it means in `value-text`. Anything
   * else is `default` (reported in debug builds, MTR-11).
   */
  status: TanreiMeterStatus = 'default';

  /** Where the measured quantity stands, between min and max. Always a number: not a finite number is drawn and exposed as min (MTR-10). */
  value = 0;

  /** The low end of the range. */
  min = 0;

  /** The high end of the range. */
  max = 1;

  /** The accessible name: what is measured ("Storage used"). Required. */
  label = '';

  /** How assistive technology reads the value when a percentage is not the natural reading ("12.4 GB of 15 GB"); the `value-text` attribute. */
  valueText = '';

  /** MTR-11: sizes a design system adds, and a size the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'meter', behavior: 'MTR-11', axes: AXES });

  /** MTR-4: where a browser has no style queries, the separation is read when it renders — again when the system is switched. */
  private readonly system = new SystemWatchController(this);

  /**
   * MTR-13: a change of direction is drawn at once. The bar's ends are logical insets, so a flip of direction moves a
   * physical inset from one value to another — which the value's transition would run (the track after a gap goes from
   * `right: 0` to its start). When the direction changes, before the frame is painted, the transitions it started are
   * finished.
   */
  private readonly direction = new DirectionController(this, () => {
    for (const animation of this.renderRoot.querySelector('.bar')?.getAnimations({ subtree: true }) ?? []) {
      if (animation instanceof CSSTransition) animation.finish();
    }
  });

  /** MTR-10: the value as drawn — min while it is not a finite number. */
  private get drawnValue(): number {
    const value = Number(this.value);
    return Number.isFinite(value) ? value : Number(this.min ?? 0);
  }

  /** MTR-10: the range and value as drawn and exposed — clamped, and 0 in 0…1 when max is not greater than min. */
  private get range() {
    return rangeOf(this.drawnValue, this.min, this.max);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // MTR-11: a variant, a separation or a status the meter does not define is drawn as the default.
    if (changed.has('variant') && !(VARIANTS as readonly string[]).includes(this.variant)) {
      report(this, 'MTR-11', `variant "${this.variant}" is not a value of the meter; it is drawn as "linear"`);
    }
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'MTR-11', `separation "${this.separation}" is not a value of the meter; it is drawn as "auto"`);
    }
    if (changed.has('status') && !(STATUSES as readonly string[]).includes(this.status)) {
      report(this, 'MTR-11', `status "${this.status}" is not a value of the meter; it is drawn as "default"`);
    }
    // MTR-10: what the value is drawn as, named in debug builds.
    if (changed.has('value') || changed.has('min') || changed.has('max')) {
      const [min, max, value] = [Number(this.min ?? 0), Number(this.max ?? 1), Number(this.value)];
      if (!(max > min)) report(this, 'MTR-10', `max ${max} is not greater than min ${min}; the track is drawn with no indicator, and 0 of 0…1 is exposed`);
      else if (!Number.isFinite(value)) report(this, 'MTR-10', `value ${this.value} is not a finite number; it is drawn and exposed as min, ${min}`);
      else if (value < min || value > max) report(this, 'MTR-10', `value ${value} is outside ${min}…${max}; it is drawn and exposed as ${Math.min(max, Math.max(min, value))}`);
    }
    // MTR-14: a bar alone is not a name.
    if (changed.has('label') && !this.label) report(this, 'MTR-14', 'label is empty, so the meter has no accessible name; give it a label');

    // MTR-7 / MTR-8: the host is the meter — never a progressbar, never busy, never focusable, never a live region.
    // MTR-9: nothing of status is exposed.
    const range = this.range;
    hostAria(this, {
      role: 'meter',
      'aria-label': this.label || null,
      'aria-valuemin': String(range.min),
      'aria-valuemax': String(range.max),
      'aria-valuenow': String(range.now),
      'aria-valuetext': this.valueText || null,
    });
  }

  protected override updated() {
    // MTR-4: without style queries, the name the cascade gives now is written for the styles to match.
    syncSeparation(this, this.renderRoot.querySelector<HTMLElement>('.bar, .ring'));
  }

  protected override render(): unknown {
    const fraction = this.range.fraction;
    const classes = rangeClasses(fraction);
    // MTR-11: only `circular` has rules of its own; anything else is the bar.
    return html`${this.variant === 'circular' ? renderRangeRing(classes, fraction) : renderRangeBar(classes, fraction, true)}${DIRECTION_PROBE}`;
  }
}

if (!customElements.get('tanrei-meter')) customElements.define('tanrei-meter', TanreiMeter);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-meter': TanreiMeter;
  }
}
