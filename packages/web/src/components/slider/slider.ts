import { LitElement, type PropertyDeclarations, type PropertyValues, type TemplateResult, html, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { AvailabilityController, DIRECTION_PROBE, DirectionController, FieldControlController, OpenAxesController, PressController, layoutSize, report, syncFocusStyle } from '../../primitives/index.js';
import type { TanreiSliderSizeRegistry } from '../../registry.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { FormSays } from '../../primitives/form-says.js';
import { AXES, styles } from './slider.styles.js';
import { FocusedStop, disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiSliderSize = keyof TanreiSliderSizeRegistry;
/** Horizontal runs from the inline start (min) to the inline end (max); vertical from the bottom (min) to the top (max). */
export type TanreiSliderOrientation = 'horizontal' | 'vertical';
/** Whether a handle shows its value beside it: never, while it is pressed or has keyboard focus, or all the time. */
export type TanreiSliderValueIndicator = 'none' | 'active' | 'always';

/** What `input` and `change` carry: the values after the change (`startValue` only for a range). */
export interface TanreiSliderChangeDetail {
  value: number;
  startValue?: number;
}

const ORIENTATIONS: readonly string[] = ['horizontal', 'vertical'] satisfies TanreiSliderOrientation[];
const INDICATORS: readonly string[] = ['none', 'active', 'always'] satisfies TanreiSliderValueIndicator[];

/**
 * How far a touch travels along the track before it is a drag, or across it before it is left to the page's scroll
 * (SLD-2: "the platform's touch slop"). The web does not expose the platform's value; this is Android's
 * `ViewConfiguration` default, as React Native's slider uses. A behaviour of the platform, not a design value.
 */
export const TOUCH_SLOP = 8;

type HandleId = 'start' | 'end';
type Values = Record<HandleId, number>;

/** Rounds away floating-point noise (0.1 + 0.2), so that a snapped value compares equal to its step. */
const tidy = (value: number) => Math.round(value * 1e10) / 1e10;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
/** Fraction digits of a number, as written (at most 10). */
const decimals = (value: number) => {
  const text = String(tidy(Math.abs(value)));
  return text.includes('e-') ? 10 : (text.split('.')[1] ?? '').length;
};

/**
 * The slider's numbers (SLD-1, SLD-3, SLD-22): the range, the keyboard step, and the snap of a value — clamped between
 * `low` and `high` (min and max by default), and while step is above 0 on min plus a whole multiple of step, the nearest.
 */
export function sliderScale(min: number, max: number, step: number) {
  const valid = Number.isFinite(min) && Number.isFinite(max) && max > min;
  const stepping = Number.isFinite(step) && step > 0 ? step : 0;
  const keyStep = stepping > 0 ? stepping : valid ? (max - min) / 100 : 0;
  const snap = (value: number, low = min, high = max): number => {
    if (!valid) return Number.isFinite(min) ? min : 0;
    let next = clamp(Number.isFinite(value) ? value : low, low, high);
    if (stepping > 0) {
      next = min + Math.round((next - min) / stepping) * stepping;
      if (next > high + 1e-9) next -= stepping;
      if (next < low - 1e-9) next += stepping;
      next = clamp(next, low, high);
    }
    return tidy(next);
  };
  const fraction = (value: number) => (valid ? clamp((value - min) / (max - min), 0, 1) : 0);
  // SLD-18: as many fraction digits as the keyboard step has, at most two.
  const digits = Math.min(2, decimals(keyStep));
  return { valid, step: stepping, keyStep, snap, fraction, digits };
}
type Scale = ReturnType<typeof sliderScale>;

/** A point of the travel for a piece of the tracks: a fraction of it, an offset past that, and the corners of that end. */
interface End {
  f: number;
  off: string;
  r: string;
}
const TRACK_START: End = { f: 0, off: 'calc(var(--_th) / -2)', r: 'var(--_ts)' };
const TRACK_END: End = { f: 1, off: 'calc(var(--_th) / 2)', r: 'var(--_ts)' };
/**
 * SLD-8: where a piece stops at a handle (`--_cut-<id>`, from its center: see the styles). With a gap it stops that far
 * beyond the handle's edge, rounded like any end of the tracks; without one the two pieces run under the handle and
 * meet square at its center, hidden by its fill (`gap × 100000` is 0 exactly when the gap is).
 */
const AT_HANDLE = 'min(var(--_ts), var(--tanrei-comp-slider-track-gap) * 100000)';
const beforeHandle = (f: number, id: HandleId): End => ({ f, off: `calc(-1 * var(--_cut-${id}))`, r: AT_HANDLE });
const afterHandle = (f: number, id: HandleId): End => ({ f, off: `var(--_cut-${id})`, r: AT_HANDLE });
/** SLD-6: the origin; at an end of the travel the active track takes the track's rounded end, elsewhere the two meet square. */
const originPoint = (f: number): End => (f <= 0 ? TRACK_START : f >= 1 ? TRACK_END : { f, off: '0px', r: '0px' });

/**
 * Lets people choose a value, or a range of values, from a continuous or stepped scale by dragging a handle along a
 * track.
 *
 * Contract: specs/slider.spec.json. Every visual value is a `--tanrei-comp-slider-*` token: per size the track's
 * thickness and corners, the handle's height and the stop dots' size; the round state layer, the handle's width, fill,
 * outline color and elevation, the track, active track and stop-dot colors in each state; the outline's width, the gap,
 * the value indicator and the motion. The handle is its fill with its outline drawn over it, inside its edge (SLD-24).
 *
 * Each handle is an element with `role="slider"` in the shadow root (its own Tab stop, the start handle first), named by
 * `label` (a range's start handle by `start-label`), with `aria-valuemin` / `-max` (bounded by the other handle in a
 * range), `aria-valuenow`, `aria-valuetext` (`value-text`, or what `formatValue` writes, or the value in the page's
 * locale) and `aria-orientation`. `formatValue` is a function the product gives once, as a property, from a value to
 * its words (`slider.formatValue = (value) => percent.format(value / 100)`): it is asked for each handle at every
 * change of a value. `shownValueText` (and `shownStartValueText`) is the value text of a handle as it is spoken now,
 * read-only: what a product that frames the slider by hand gives its Field's `value-text` at each `input`.
 * The whole slider is the hit area: a press moves the nearer handle there and a drag follows it; the arrow keys, Page
 * Up / Down, Home and End move the focused handle. It sets its own `value` (and `startValue`) before it fires `input`
 * (every change) and `change` (a finished change). A value the product sets fires neither and moves over the value
 * motion.
 *
 * Form-associated: it submits `value` under `name` (a range submits `start-value`, then `value`, under the same name),
 * resets to its attributes and follows a disabled `<fieldset>`.
 *
 * @tag tanrei-slider
 * @csspart track - A piece of the track outside the active part (there are two).
 * @csspart active-track - The active part of the track: from the origin to the value, or between a range's handles.
 * @csspart stop-indicator - A stop dot.
 * @csspart container - A handle's round state layer (hover, focus, press).
 * @csspart handle - A handle: the element with role slider. Its background is the fill; its `::before` draws the outline.
 * @csspart value-indicator - A handle's value indicator.
 * @attr {string} form - The id of the form the slider belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires {CustomEvent<TanreiSliderChangeDetail>} input - The person changed a value; the element's `value` (and `startValue`) is already the new one.
 * @fires {CustomEvent<TanreiSliderChangeDetail>} change - The person finished changing a value (the press ended, or a key was pressed); always after its input.
 */
export class TanreiSlider extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'slider');
  /** Disabled under the focus it holds, its stop keeps its `tabindex` for one frame, as the platform's own control keeps focus (src/primitives/disabled-while-focused.ts). */
  private readonly stop = new FocusedStop(this);
  static override styles = styles;

  static formAssociated = true;

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['track', 'active-track', 'stop-indicator', 'container', 'handle', 'value-indicator'];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    size: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    value: { type: Number },
    startValue: { type: Number, attribute: 'start-value' },
    range: { type: Boolean, reflect: true },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    origin: { type: Number },
    stops: { type: Boolean, reflect: true },
    valueIndicator: { type: String, attribute: 'value-indicator', reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    startLabel: { type: String, attribute: 'start-label' },
    valueText: { type: String, attribute: 'value-text' },
    startValueText: { type: String, attribute: 'start-value-text' },
    formatValue: { attribute: false },
    name: { type: String, reflect: true },
    hovered: { state: true },
    dragging: { state: true },
    formDisabled: { state: true },
  };

  /** The track's weight: small (the default), medium or large, or a size the design system adds. Anything else draws small (SLD-23). */
  size: TanreiSliderSize = 'small';

  /** `horizontal` (the default) or `vertical`. Anything else draws horizontal (SLD-23). */
  orientation: TanreiSliderOrientation = 'horizontal';

  /** The value of the only handle, or of a range's end handle. The `value` attribute is what a form reset returns to. */
  value = 0;

  /** The value of a range's start handle (the `start-value` attribute). Ignored while `range` is false. */
  startValue = 0;

  /** Two handles, choosing the range from `startValue` to `value`. */
  range = false;

  /** The lowest value, at the track's start. */
  min = 0;

  /** The highest value, at the track's end. */
  max = 100;

  /** 0 is continuous; above 0 the values are `min` plus whole multiples of `step`, up to `max`. */
  step = 0;

  /** Where the active track starts: null (no attribute) starts it at `min`; a value inside the range makes a centered slider. Ignored for a range. */
  origin: number | null = null;

  /** A stop dot at every value a discrete slider can take. Ignored while `step` is 0. */
  stops = false;

  /** `none` (the default), `active` (while a handle is pressed or has keyboard focus) or `always` (the `value-indicator` attribute). */
  valueIndicator: TanreiSliderValueIndicator = 'none';

  /** Prevents interaction and removes the handles from the focus order. */
  disabled = false;

  /** Names the slider (a range's end handle) for assistive technology. Never drawn: put your visible label beside it, in the same words. Required. */
  label = '';

  /** Names a range's start handle ("Minimum price"; the `start-label` attribute). Required while `range` is true. */
  startLabel = '';

  /** The value as words ("40 %"), spoken and shown by the value indicator in place of the number (the `value-text` attribute). For a range, the end handle's. */
  valueText = '';

  /** The start handle's value text, for a range (the `start-value-text` attribute). */
  startValueText = '';

  /** The product's function from a value to its words (`(value) => percent.format(value / 100)`), asked for each handle at every change of a value and when it is set. A property, never an attribute. `valueText` and `startValueText` win over it; an empty answer is no answer, and the value is then written as a number in the page's locale. */
  formatValue: ((value: number) => string) | null = null;

  /** Web only: the name it is submitted under. */
  name = '';

  /** The handle a fine pointer over the slider would move (SLD-11). */
  private hovered: HandleId | null = null;

  /** A press is dragging a handle: it follows without the value motion (SLD-16). */
  private dragging = false;

  /** Set by an ancestor `<fieldset disabled>`. */
  private formDisabled = false;

  private readonly internals = this.attachInternals();

  /** What it tells its form, said where an element composed around it hears it (src/primitives/form-says.ts). */
  private readonly says = new FormSays(this, this.internals);

  /** SLD-23: sizes a design system adds, and a size the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'slider', behavior: 'SLD-23', axes: AXES });

  /** SLD-13 / SLD-14: each handle's pressed state, press-hold and ripple — grown from the handle's center, where the press moves it. */
  private readonly presses: Record<HandleId, PressController> = { start: this.pressOf('start'), end: this.pressOf('end') };

  /** The press being answered: the pointer, the handle it moves, where it began and whether it has become a drag. */
  private gesture: { pointer: number; handle: HandleId; touch: boolean; x: number; y: number; dragging: boolean; before: Values } | null = null;

  private readonly resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.placeIndicators());
  /**
   * SLD-17, SLD-21, SLD-25: a change of the direction it inherits moves the handles and the tracks to the other side. It
   * is no change of value, so it is drawn at once: the value motion the new insets started (a piece's two ends are
   * physical lengths the browser can interpolate) is ended in the frame it began, before it is painted, and the value
   * indicators are placed again.
   */
  private readonly direction = new DirectionController(this, () => {
    for (const part of this.renderRoot.querySelectorAll('.piece, .dots, .thumb')) {
      // The state motion (a color) is not the direction's and runs on.
      for (const motion of part.getAnimations()) if (!(motion instanceof CSSTransition) || motion.transitionProperty !== 'background-color') motion.finish();
    }
    this.placeIndicators();
  });

  /**
   * What a field around the slider gives it (src/primitives/field.ts): the name while it has no `label` of its own, the
   * description, the invalid state and `disabled` (FLD-8, FLD-10, FLD-11, FLD-14). The slider's role has no required
   * state, so a required slider says so in its description.
   */
  private readonly field: FieldControlController = new FieldControlController(this, {
    requiredState: false,
    // A range's `label` names its end handle, not the pair: under a field's label the pair is the field's to name.
    named: () => !!this.label.trim() && !(this.range && !!this.field.label),
  });

  private pressOf(id: HandleId) {
    return new PressController(this, {
      container: () => this.inThumb(id, '.container'),
      holdCarrier: () => this.renderRoot.querySelector('.rail'),
      disabled: () => !this.interactive,
      keys: [],
      origin: () => null,
    });
  }

  private inThumb<E extends HTMLElement = HTMLElement>(id: HandleId, selector: string): E | null {
    return this.renderRoot.querySelector<E>(`.thumb[data-handle='${id}'] ${selector}`);
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The element's validity. A slider always has a value on its scale, so it is always valid: the platform's own members of a form control, as an element composed around it has them. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  private get scale(): Scale {
    return sliderScale(Number(this.min), Number(this.max), Number(this.step));
  }

  private get isDisabled() {
    return this.disabled || this.formDisabled || this.field.disabled;
  }

  /** SLD-20, SLD-22: a disabled slider, or one whose max is not above its min, takes no input. */
  private get interactive() {
    return !this.isDisabled && this.scale.valid;
  }

  private get axis(): TanreiSliderOrientation {
    return ORIENTATIONS.includes(this.orientation) ? this.orientation : 'horizontal';
  }

  private get indicator(): TanreiSliderValueIndicator {
    return INDICATORS.includes(this.valueIndicator) ? this.valueIndicator : 'none';
  }

  private get handles(): HandleId[] {
    return this.range ? ['start', 'end'] : ['end'];
  }

  /** SLD-1, SLD-22: the values as drawn and exposed — clamped, snapped, and a range's start never past its end. */
  private get values(): Values {
    const scale = this.scale;
    const end = scale.snap(Number(this.value));
    return { end, start: this.range ? Math.min(scale.snap(Number(this.startValue)), end) : scale.snap(Number(this.min)) };
  }

  /** SLD-5: in a range each handle stops at the other's value. */
  private bounds(values: Values, id: HandleId): [number, number] {
    const [min, max] = [Number(this.min), Number(this.max)];
    if (!this.range) return [min, max];
    return id === 'start' ? [min, values.end] : [values.start, max];
  }

  private get rtl() {
    return this.direction.rtl;
  }

  // ─── Form ─────────────────────────────────────────────────────────────────────────────────────────────────────

  formResetCallback() {
    const read = (name: string, fallback: number) => (this.hasAttribute(name) ? Number(this.getAttribute(name)) : fallback);
    this.value = read('value', 0);
    this.startValue = read('start-value', 0);
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    const [start, end] = (typeof state === 'string' ? state : '').split(' ').map(Number);
    if (Number.isFinite(end)) this.value = end;
    if (Number.isFinite(start)) this.startValue = start;
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────

  override connectedCallback() {
    super.connectedCallback();
    this.resize?.observe(this);
    window.addEventListener('resize', this.placeIndicators);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resize?.disconnect();
    window.removeEventListener('resize', this.placeIndicators);
    this.gesture = null;
    this.dragging = false;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // SLD-23: orientation and valueIndicator are the component's own values; size is an open axis (above).
    if (changed.has('orientation') && !ORIENTATIONS.includes(this.orientation)) {
      report(this, 'SLD-23', `orientation "${this.orientation}" is not a value of the slider; it is drawn as "horizontal"`);
    }
    if (changed.has('valueIndicator') && !INDICATORS.includes(this.valueIndicator)) {
      report(this, 'SLD-23', `valueIndicator "${this.valueIndicator}" is not a value of the slider; it is drawn as "none"`);
    }
    if (['value', 'startValue', 'min', 'max', 'step', 'origin', 'range'].some((key) => changed.has(key as keyof TanreiSlider))) this.reportValues();
    // SLD-19: a slider without a name still renders; a debug build says what is missing.
    if (changed.has('label') && !this.label.trim() && !this.field.label) report(this, 'SLD-19', 'label is empty, so the slider has no accessible name; give it a label');
    if ((changed.has('startLabel') || changed.has('range')) && this.range && !this.startLabel.trim()) {
      report(this, 'SLD-19', 'startLabel is empty, so the range’s start handle has no accessible name; give it a start-label');
    }
    // A handle that is no longer drawn is no longer hovered or pressed.
    if (changed.has('range') && !this.range && this.hovered === 'start') this.hovered = null;
    if (changed.has('disabled') && this.isDisabled) this.hovered = null;
  }

  /** SLD-22: what a value outside the scale is drawn and exposed as, named in debug builds. */
  private reportValues() {
    const [min, max, step] = [Number(this.min), Number(this.max), Number(this.step)];
    const scale = this.scale;
    if (step < 0) report(this, 'SLD-22', `step ${step} is below 0; it is treated as 0`);
    if (!scale.valid) {
      report(this, 'SLD-22', `max ${max} is not greater than min ${min}; the handles are drawn at the track's start and it takes no input`);
      return;
    }
    const check = (name: string, value: number) => {
      const drawn = scale.snap(value);
      if (tidy(value) !== drawn) report(this, 'SLD-22', `${name} ${value} is outside ${min}…${max} or off a step; it is drawn and exposed as ${drawn}`);
    };
    check('value', Number(this.value));
    if (this.range) {
      check('startValue', Number(this.startValue));
      if (scale.snap(Number(this.startValue)) > scale.snap(Number(this.value))) {
        report(this, 'SLD-22', `startValue ${this.startValue} is greater than value ${this.value}; both handles are drawn at ${scale.snap(Number(this.value))}`);
      }
    } else if (this.origin !== null && this.origin !== undefined) {
      check('origin', Number(this.origin));
    }
  }

  protected override updated() {
    const { start, end } = this.values;
    // A range submits both values under one name; a single value is submitted under the element's name.
    if (this.range) {
      const data = new FormData();
      if (this.name) {
        data.append(this.name, String(start));
        data.append(this.name, String(end));
      }
      // Disabled, it submits nothing: said here too, since its attribute waits a frame where it holds focus.
      this.says.value(this.name && !this.isDisabled ? data : null, `${start} ${end}`);
    } else {
      this.says.value(this.isDisabled ? null : String(end), `${start} ${end}`);
    }
    this.placeIndicators();
  }

  // ─── Changes by the person (SLD-2, SLD-3, SLD-4) ────────────────────────────────────────────────────────────

  /** Sets one handle to `target`, snapped within its bounds, and emits input when that changes it. True when it did. */
  private move(id: HandleId, target: number): boolean {
    const values = this.values;
    const [low, high] = this.bounds(values, id);
    const next = this.scale.snap(target, low, high);
    if (next === values[id]) return false;
    // The element takes the new value before anyone hears of it, as a native control does.
    if (id === 'start') this.startValue = next;
    else this.value = next;
    this.emit('input');
    return true;
  }

  private emit(type: 'input' | 'change') {
    const { start, end } = this.values;
    const detail: TanreiSliderChangeDetail = this.range ? { value: end, startValue: start } : { value: end };
    // Each event dispatched under its literal name, so the manifest (and the React wrapper made from it) sees `input` and
    // `change` rather than an event called `type`. Both are composed: they leave the shadow root of an element
    // composed around the slider with that element as their target (src/primitives/composed.ts, W5).
    if (type === 'input') this.dispatchEvent(new CustomEvent<TanreiSliderChangeDetail>('input', { bubbles: true, composed: true, detail }));
    else this.dispatchEvent(new CustomEvent<TanreiSliderChangeDetail>('change', { bubbles: true, composed: true, detail }));
  }

  /** A position in the viewport → the value under it along the travel (null before layout). */
  private valueAt(x: number, y: number): number | null {
    const rail = this.renderRoot.querySelector('.rail')?.getBoundingClientRect();
    if (!rail) return null;
    const vertical = this.axis === 'vertical';
    const length = vertical ? rail.height : rail.width;
    if (!(length > 0)) return null;
    // SLD-21: a vertical slider runs from the bottom up; a right-to-left horizontal one from the right.
    const along = vertical ? rail.bottom - y : this.rtl ? rail.right - x : x - rail.left;
    const [min, max] = [Number(this.min), Number(this.max)];
    return min + clamp(along / length, 0, 1) * (max - min);
  }

  /** SLD-2: the handle a press at `target` moves — the nearer one; where the two meet, the one that can move toward it. */
  private nearer(target: number | null): HandleId {
    if (!this.range || target === null) return 'end';
    const { start, end } = this.values;
    if (start === end) return target < start ? 'start' : 'end';
    return Math.abs(target - start) < Math.abs(target - end) ? 'start' : 'end';
  }

  /** Focus that a press gives a handle is not keyboard focus: no ring, no focused state (SLD-11, SLD-12). */
  private focusHandle(id: HandleId) {
    const handle = this.inThumb(id, '.handle');
    if (!handle) return;
    handle.dataset.pointerFocus = '';
    if ((this.renderRoot as ShadowRoot).activeElement !== handle) handle.focus({ preventScroll: true });
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.interactive || this.gesture) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // No text selection, and no focus from the press itself: the pressed handle is focused below.
    event.preventDefault();
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      // A synthetic pointer cannot be captured; the press is still followed while it stays over the slider.
    }
    const target = this.valueAt(event.clientX, event.clientY);
    const handle = this.nearer(target);
    const touch = event.pointerType === 'touch';
    this.gesture = { pointer: event.pointerId, handle, touch, x: event.clientX, y: event.clientY, dragging: false, before: this.values };
    if (!touch) this.hovered = handle;
    // SLD-13: the pressed state of the handle the press moves, without delay.
    this.presses[handle].press({ x: event.clientX, y: event.clientY });
    // SLD-2: a pointer moves the handle at once (over the value motion, SLD-16); a touch waits for the slop or its end.
    if (!touch) {
      this.focusHandle(handle);
      if (target !== null) this.move(handle, target);
    }
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture) {
      this.hover(event);
      return;
    }
    if (event.pointerId !== gesture.pointer) return;
    if (!gesture.dragging) {
      if (gesture.touch) {
        const vertical = this.axis === 'vertical';
        const [along, across] = vertical ? [event.clientY - gesture.y, event.clientX - gesture.x] : [event.clientX - gesture.x, event.clientY - gesture.y];
        // SLD-2: a touch that first travels across the track is the page's scroll; it changes nothing.
        if (Math.abs(across) >= TOUCH_SLOP && Math.abs(across) > Math.abs(along)) {
          this.endGesture();
          return;
        }
        if (Math.abs(along) < TOUCH_SLOP) return;
        this.focusHandle(gesture.handle);
      }
      gesture.dragging = true;
      this.dragging = true;
    }
    const target = this.valueAt(event.clientX, event.clientY);
    if (target !== null) this.move(gesture.handle, target);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointer) return;
    // SLD-2: a touch that did not move moves the handle to where it was pressed when it ends.
    if (gesture.touch && !gesture.dragging) {
      this.focusHandle(gesture.handle);
      const target = this.valueAt(gesture.x, gesture.y);
      if (target !== null) this.move(gesture.handle, target);
    }
    this.endGesture();
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    if (this.gesture && event.pointerId === this.gesture.pointer) this.endGesture();
  };

  /** The press is over: press-hold runs out, the value motion is back, and a change is emitted when the values moved. */
  private endGesture() {
    const gesture = this.gesture;
    if (!gesture) return;
    this.gesture = null;
    this.presses[gesture.handle].release('pointer');
    this.dragging = false;
    const now = this.values;
    if (now.start !== gesture.before.start || now.end !== gesture.before.end) this.emit('change');
  }

  /** SLD-11: a fine pointer over the slider hovers the handle a press there would move. */
  private hover(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || !this.interactive) return;
    const next = this.nearer(this.valueAt(event.clientX, event.clientY));
    if (next !== this.hovered) this.hovered = next;
  }

  private readonly onPointerLeave = (event: PointerEvent) => {
    if (!this.gesture && event.pointerType === 'mouse') this.hovered = null;
  };

  /** A mouse press never focuses on its own (the pointer's press has already been handled). */
  private readonly onMouseDown = (event: MouseEvent) => {
    event.preventDefault();
  };

  /** SLD-3, SLD-4 (assistive technology on the web adjusts a slider with these keys): one change, input then change. */
  private onKeyDown(id: HandleId, event: KeyboardEvent) {
    const step = this.scale.keyStep;
    // SLD-3 / SLD-21: Right and Left are swapped in a right-to-left horizontal slider; Up always increases.
    const mirrored = this.axis === 'horizontal' && this.rtl;
    const [forward, backward] = mirrored ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft'];
    let to: ((current: number, low: number, high: number) => number) | null = null;
    if (event.key === forward || event.key === 'ArrowUp') to = (current) => current + step;
    else if (event.key === backward || event.key === 'ArrowDown') to = (current) => current - step;
    else if (event.key === 'PageUp') to = (current) => current + 10 * step;
    else if (event.key === 'PageDown') to = (current) => current - 10 * step;
    else if (event.key === 'Home') to = (_current, low) => low;
    else if (event.key === 'End') to = (_current, _low, high) => high;
    if (!to) return;
    event.preventDefault();
    // A key that operates the slider makes its focus keyboard focus, as the browser's own heuristic does.
    delete (event.currentTarget as HTMLElement).dataset.pointerFocus;
    if (!this.interactive) return;
    const values = this.values;
    const [low, high] = this.bounds(values, id);
    if (this.move(id, to(values[id], low, high))) this.emit('change');
  }

  /** SLD-15: where style queries are missing, the focus style is read when focus arrives. */
  private onFocus(event: FocusEvent) {
    syncFocusStyle(this, event.currentTarget as HTMLElement);
  }

  private onBlur(event: FocusEvent) {
    delete (event.currentTarget as HTMLElement).dataset.pointerFocus;
  }

  // ─── The value indicator's place (SLD-17) ───────────────────────────────────────────────────────────────────

  /** Shifts each value indicator along the axis so it stays inside the window, from its handle's settled place. */
  private readonly placeIndicators = () => {
    if (this.indicator === 'none' || !this.isConnected) return;
    const rail = this.renderRoot.querySelector('.rail')?.getBoundingClientRect();
    if (!rail) return;
    const vertical = this.axis === 'vertical';
    const rtl = !vertical && this.rtl;
    const values = this.values;
    const scale = this.scale;
    const view = document.documentElement;
    for (const id of this.handles) {
      const indicator = this.inThumb(id, '.value-indicator');
      if (!indicator) continue;
      // Watch the indicator's own size too: new value text, or a web font that arrives late, changes its width without
      // resizing the slider. (Setting --_shift moves it by `translate`, which is no resize, so this cannot loop.)
      this.resize?.observe(indicator);
      const f = scale.fraction(values[id]);
      // The box's exact, fractional size, in the same viewport pixels as the rail. offsetWidth/offsetHeight round it to
      // whole pixels (and a computed width is serialized to three decimals), while text is rarely a whole number of
      // pixels wide: from a rounded-down size the clamp left the indicator a fraction of a pixel outside the window.
      // Its own `translate` only moves the box, so the shift already applied does not change this size.
      const box = indicator.getBoundingClientRect();
      const size = vertical ? box.height : box.width;
      const center = vertical ? rail.bottom - f * rail.height : rtl ? rail.right - f * rail.width : rail.left + f * rail.width;
      const limit = vertical ? view.clientHeight : view.clientWidth;
      const start = center - size / 2;
      const shift = start < 0 ? -start : start + size > limit ? limit - (start + size) : 0;
      // The shift is measured in the window's pixels and applied by `translate` in the indicator's own: inside a scaled
      // ancestor (a `transform`, a `zoom`) one of its pixels is not one of the window's, so the shift is turned into
      // its own by what the box is drawn at over what it is laid out at.
      const laid = layoutSize(indicator);
      const own = vertical ? laid.height : laid.width;
      // (A laid-out size is serialized to three decimals: a ratio that near 1 is no scale at all.)
      const ratio = own > 0 && size > 0 ? size / own : 1;
      const drawn = Math.abs(ratio - 1) < 0.001 ? 1 : ratio;
      indicator.style.setProperty('--_shift', `${shift / drawn}px`);
    }
  };

  // ─── Rendering ────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * SLD-18: the value text of the only handle, or of a range's end handle, as it is spoken and shown now — `valueText`,
   * else what `formatValue` writes, else the value as a number in the page's locale. Read-only, and new with every
   * change of the value: a product that frames the slider by hand gives it to its Field's `valueText` in its own
   * `input` listener, and `<tanrei-slider-field>` does so by itself.
   */
  get shownValueText(): string {
    return this.words('end', this.values.end);
  }

  /** SLD-18: the value text of a range's start handle, as `shownValueText` is the end handle's; empty while `range` is false. */
  get shownStartValueText(): string {
    return this.range ? this.words('start', this.values.start) : '';
  }

  /** The language of the place the slider stands in: the nearest `lang`, through the shadow roots it is inside. */
  private get language(): string | undefined {
    for (let at: Element | null = this; at; ) {
      const lang = at.closest('[lang]')?.getAttribute('lang');
      if (lang) return lang;
      const root = at.getRootNode();
      at = root instanceof ShadowRoot ? root.host : null;
    }
    return undefined;
  }

  /** SLD-18: a handle's value text — the product's words, or what its function writes, or the value in the page's locale. */
  private words(id: HandleId, value: number): string {
    const given = (id === 'start' ? this.startValueText : this.valueText)?.trim();
    if (given) return given;
    // An empty answer is no answer; so is one that is no text.
    const written = typeof this.formatValue === 'function' ? this.formatValue(value) : '';
    if (typeof written === 'string' && written.trim()) return written.trim();
    const digits = this.scale.digits;
    const locale = this.language;
    try {
      return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
    } catch {
      return value.toFixed(digits);
    }
  }

  /** SLD-6, SLD-8: the three pieces of the tracks — the track, the active track, the track — between their ends. */
  private pieces(values: Values): [End, End][] {
    const scale = this.scale;
    const f = { start: scale.fraction(values.start), end: scale.fraction(values.end) };
    if (this.range) {
      return [
        [TRACK_START, beforeHandle(f.start, 'start')],
        [afterHandle(f.start, 'start'), beforeHandle(f.end, 'end')],
        [afterHandle(f.end, 'end'), TRACK_END],
      ];
    }
    const origin = this.origin === null || this.origin === undefined || !scale.valid ? 0 : scale.fraction(scale.snap(Number(this.origin)));
    const at = originPoint(origin);
    return f.end >= origin
      ? [
          [TRACK_START, at],
          [at, beforeHandle(f.end, 'end')],
          [afterHandle(f.end, 'end'), TRACK_END],
        ]
      : [
          [TRACK_START, beforeHandle(f.end, 'end')],
          [afterHandle(f.end, 'end'), at],
          [at, TRACK_END],
        ];
  }

  /**
   * SLD-9: the dots each kind of piece holds, as fractions of the travel. The track holds the travel's two ends; with
   * `stops` every piece holds every value. A dot is drawn only where its piece is — so not where it lies on the active
   * track (an end), and not in a handle's gap; while the gap is 0 a dot under a handle lies under its fill (SLD-24).
   */
  private dots(): { track: number[]; active: number[] } {
    const scale = this.scale;
    if (!scale.valid) return { track: [], active: [] };
    const every: number[] = [];
    if (this.stops && scale.step > 0) {
      const [min, max] = [Number(this.min), Number(this.max)];
      for (let at = min; at <= max + 1e-9; at = tidy(at + scale.step)) every.push(tidy(scale.fraction(at)));
    }
    return { track: [...new Set([0, 1, ...every])], active: every };
  }

  /** A piece of the tracks, and its stop dots: a layer the travel's size, clipped to the piece. */
  private renderPiece([from, to]: [End, End], active: boolean, dots: number[]): TemplateResult {
    const place = styleMap({
      '--_from': String(from.f),
      '--_from-off': from.off,
      '--_from-r': from.r,
      '--_to': String(to.f),
      '--_to-off': to.off,
      '--_to-r': to.r,
    });
    return html`<div part=${active ? 'active-track' : 'track'} class=${active ? 'piece active' : 'piece'} data-tanrei-shape style=${place}></div>
      ${dots.length
        ? html`<div class=${active ? 'dots active' : 'dots'} style=${place}>
            ${dots.map((at) => html`<span part="stop-indicator" class="dot" style=${styleMap({ '--_at': String(at) })}></span>`)}
          </div>`
        : nothing}`;
  }

  private renderHandle(id: HandleId, values: Values): TemplateResult {
    const scale = this.scale;
    const [low, high] = this.bounds(values, id).map((bound) => scale.snap(bound));
    const words = this.words(id, values[id]);
    const label = this.field.name(id === 'start' ? this.startLabel : this.label);
    const description = this.field.description();
    // Disabled under the focus it holds, a handle stays a stop for one frame (src/primitives/disabled-while-focused.ts).
    const focusable = this.stop.keeps(this.isDisabled) || !this.isDisabled;
    return html`
      <div class="thumb" data-handle=${id} ?data-hovered=${this.hovered === id} style=${styleMap({ '--_f': String(scale.fraction(values[id])) })}>
        <div class="knob">
          <div part="container" class="container" data-tanrei-shape aria-hidden="true"></div>
          <div
            part="handle"
            class="handle"
            data-tanrei-shape
            role="slider"
            tabindex=${focusable ? '0' : nothing}
            aria-label=${label || nothing}
            aria-description=${description || nothing}
            aria-invalid=${this.field.invalid ? 'true' : nothing}
            aria-valuemin=${String(low)}
            aria-valuemax=${String(high)}
            aria-valuenow=${String(values[id])}
            aria-valuetext=${words}
            aria-orientation=${this.axis}
            aria-disabled=${this.isDisabled ? 'true' : nothing}
            @keydown=${(event: KeyboardEvent) => this.onKeyDown(id, event)}
            @focus=${this.onFocus}
            @blur=${this.onBlur}
          ></div>
          <div part="value-indicator" class="value-indicator" data-tanrei-shape aria-hidden="true"><span class="value-text">${words}</span></div>
        </div>
      </div>
    `;
  }

  protected override render() {
    const values = this.values;
    const [before, active, after] = this.pieces(values);
    const dots = this.dots();
    // SLD-17 / SLD-20: a disabled slider (or one that takes no input) shows no value indicator.
    const indicator = this.interactive ? this.indicator : 'none';
    return html`
      <div
        class="root"
        data-orientation=${this.axis}
        data-value-indicator=${indicator}
        ?data-disabled=${this.isDisabled}
        ?data-inert=${!this.interactive}
        ?data-dragging=${this.dragging}
        @pointerdown=${this.onPointerDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerCancel}
        @lostpointercapture=${this.onPointerCancel}
        @pointerleave=${this.onPointerLeave}
        @mousedown=${this.onMouseDown}
      >
        <div class="travel" aria-hidden="true">
          ${this.renderPiece(before, false, dots.track)} ${this.renderPiece(active, true, dots.active)} ${this.renderPiece(after, false, dots.track)}
        </div>
        <div class="rail">${this.handles.map((id) => this.renderHandle(id, values))}</div>
      </div>
      ${DIRECTION_PROBE}
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiSlider);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiSlider);
if (!customElements.get('tanrei-slider')) customElements.define('tanrei-slider', TanreiSlider);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-slider': TanreiSlider;
  }
}
