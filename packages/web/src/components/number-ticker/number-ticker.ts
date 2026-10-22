import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AnimatedSize, AvailabilityController, DIRECTION_PROBE, DirectionController, compChoice, report } from '../../primitives/index.js';
import { ambientLocale, localeDirection, supportedLocale } from '../../primitives/locale-date.js';
import { TanreiElement } from '../../primitives/element.js';
import { ANIMATIONS, ANIMATION_VALUES, CHOICE, COPIES, LIVE_VALUES, NOTATIONS, NUMBER_STYLES, SIGN_DISPLAYS, TRENDS, styles } from './number-ticker.styles.js';

/** How a digit changes; `auto` takes the design system's answer (`comp.number-ticker.animation`). */
export type TanreiNumberTickerAnimation = (typeof ANIMATION_VALUES)[number];
/** Which way the digits move: with the whole number (`auto`), one way (`up`, `down`), or each by its own change (`digit`). */
export type TanreiNumberTickerTrend = (typeof TRENDS)[number];
/** How the number is written by the platform's number formatter (the spec's `style`). */
export type TanreiNumberTickerNumberStyle = (typeof NUMBER_STYLES)[number];
export type TanreiNumberTickerNotation = (typeof NOTATIONS)[number];
export type TanreiNumberTickerSignDisplay = (typeof SIGN_DISPLAYS)[number];
export type TanreiNumberTickerLive = (typeof LIVE_VALUES)[number];
/** `detail` of `settle`: the value the digits came to rest at. */
export interface TanreiNumberTickerSettleDetail {
  value: number;
}

type Mode = (typeof ANIMATIONS)[number];
/** One character of the formatted number: a digit (with its value in 0…9) or any other character, and its place. */
interface Glyph {
  /** The place it stands in, the same from one value to the next: `i<n>` the integer digit of 10^n, `f<n>` the n-th fraction digit, `g<n>` the group separator before `i<n>`, else the part's type and its count. */
  key: string;
  digit: number | null;
  text: string;
  /** Whether it is of the numeric run (digits, group and decimal separators), which is written left to right (NTK-13). */
  core: boolean;
}
interface Written {
  glyphs: Glyph[];
  text: string;
  digits: readonly string[];
  direction: 'ltr' | 'rtl';
  finite: boolean;
}
interface PlaceState {
  /** The digit the column is at, or moving to. */
  digit: number;
}
interface Timing {
  duration: number;
  stagger: number;
  reduced: number;
  easing: string;
  blur: number;
  distance: number;
}

const ROWS = COPIES * 10;
/** The column's transform that shows position `p` (digit p mod 10 of copy ⌊p / 10⌋) in the window. */
const at = (p: number) => `translateY(${(-p * 100) / ROWS}%)`;
/** Where a column stands at rest showing digit `d`: in the middle copy, so it can move on a whole turn either way. */
const rest = (d: number) => 10 + d;
/** How near a whole step a column reads while it stands there: within a fiftieth of a step (under a pixel at any text size a person reads). */
const AT_REST = 0.02;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const seconds = (value: string) => {
  const text = value.trim();
  const n = Number.parseFloat(text);
  if (!Number.isFinite(n)) return 0;
  return text.endsWith('ms') ? n : n * 1000;
};
const BIDI_MARKS = /[‎‏؜]/g;

/**
 * NTK-14: the language of where a ticker stands can change on any ancestor (and inside any shadow root on the way): one
 * observer of `lang` for every ticker, and each ticker asks again whether its language changed.
 */
const watching = new Set<TanreiNumberTicker>();
const watchedRoots = new WeakSet<Node>();
let langObserver: MutationObserver | null = null;
function watchLanguage(host: TanreiNumberTicker) {
  if (typeof MutationObserver !== 'function') return;
  langObserver ??= new MutationObserver(() => {
    for (const each of watching) each.languageMayHaveChanged();
  });
  watching.add(host);
  for (let root: Node = host.getRootNode(); ; ) {
    if (!watchedRoots.has(root) && (root instanceof Document || root instanceof ShadowRoot)) {
      watchedRoots.add(root);
      langObserver.observe(root, { attributes: true, attributeFilter: ['lang'], subtree: true });
    }
    if (!(root instanceof ShadowRoot)) break;
    root = root.host.getRootNode();
  }
}

/**
 * Shows a number that changes — a count, a price, a score, a figure on a dashboard — by moving each changed digit to its
 * new value, so that a person sees that it changed, which way and roughly by how much, while assistive technology is
 * told only the value it settles on.
 *
 * Contract: specs/number-ticker.spec.json. The number is written by `Intl.NumberFormat` (`numberStyle`, `currency`,
 * `unit`, `notation`, `fractionDigits`, `signDisplay`, `locale`); every digit it writes (in the locale's own digits) is a
 * window over a column of the digits 0…9, every other character plain text. It is drawn in the text style of where it
 * stands, in tabular figures, with no fill, edge or color of its own.
 *
 * A change moves each changed digit's column (`slide`), cross-fades it (`blur`, `blur-slide`) or turns it over as a
 * split-flap board (`flip`) over `comp.number-ticker.motion.duration`, every changed digit with the whole number by
 * default (`trend`); the width follows with the shared size transition (`AnimatedSize`). A change while one runs goes on
 * from what is drawn. Under `prefers-reduced-motion: reduce` the new number cross-fades in at once.
 *
 * Assistive technology reads one text — `label`, then the number as written — and none of the drawn digits; with
 * `live="polite"` that text is a polite live region, written once each change has settled.
 *
 * @tag tanrei-number-ticker
 * @fires {CustomEvent<TanreiNumberTickerSettleDetail>} settle - The digits came to rest at `value`: once at the end of each change's motion (at once where there is none). `detail.value` is the value.
 */
export class TanreiNumberTicker extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'number-ticker');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    value: { type: Number },
    numberStyle: { type: String, attribute: 'number-style' },
    currency: { type: String },
    unit: { type: String },
    notation: { type: String },
    fractionDigits: { type: Number, attribute: 'fraction-digits' },
    signDisplay: { type: String, attribute: 'sign-display' },
    locale: { type: String },
    trend: { type: String },
    animation: { type: String },
    startValue: { type: Number, attribute: 'start-value' },
    duration: { type: Number },
    live: { type: String },
    label: { type: String },
    spoken: { state: true },
  };

  /** The number shown. Not a finite number is written as the formatter writes it, at once (NTK-12). */
  value = 0;

  /** How the number is written: `decimal`, `percent` (× 100, with the locale's percent sign), `currency`, `unit`. The spec's `style`. */
  numberStyle: TanreiNumberTickerNumberStyle = 'decimal';

  /** The currency while `number-style` is `currency`, as its three-letter code ("JPY", "EUR"). */
  currency = '';

  /** The unit while `number-style` is `unit`, as a unit identifier of `Intl.NumberFormat` ("kilometer-per-hour", "megabyte"). */
  unit = '';

  /** `standard` writes every digit; `compact` writes it short with the locale's suffix (1.2K, 1.2万). */
  notation: TanreiNumberTickerNotation = 'standard';

  /** How many digits after the decimal separator are always written; null leaves it to the formatter. */
  fractionDigits: number | null = null;

  /** When a sign is written: `auto` (negative only), `always`, `except-zero`. */
  signDisplay: TanreiNumberTickerSignDisplay = 'auto';

  /** A BCP 47 tag ("ja-JP", "ar-EG"); empty takes the nearest `lang` (through shadow roots), then the browser's. */
  locale = '';

  /** Which way the digits move (NTK-3). */
  trend: TanreiNumberTickerTrend = 'auto';

  /** How a digit changes (NTK-3, NTK-4, NTK-7); `auto` takes `comp.number-ticker.animation`. */
  animation: TanreiNumberTickerAnimation = 'auto';

  /** A value to move from the first time the ticker comes into view (NTK-8); null draws the first value at once. */
  startValue: number | null = null;

  /** How long a change takes, in milliseconds; null takes `comp.number-ticker.motion.duration`. */
  duration: number | null = null;

  /** `polite` tells assistive technology each value once it settles (NTK-10); `off` tells it nothing by itself. */
  live: TanreiNumberTickerLive = 'off';

  /** Words read before the value ("Revenue"), where nothing visible beside the number says what it is. Never drawn. */
  label = '';

  /** NTK-10: the text a polite live region holds — written when a change has settled. */
  private spoken = '';

  /** The value the digits are at, or moving to; null before the first drawing. */
  private shown: number | null = null;
  /** What was last written: the glyphs drawn, and the locale it was written for. */
  private written: Written | null = null;
  private writtenFor = '';
  /** Every change's number: a motion's end settles only the change that is still the latest. */
  private run = 0;
  private readonly places = new WeakMap<HTMLElement, PlaceState>();
  /** NTK-8: whether the first coming into view is still awaited, and the observer that waits for it. */
  private introduction: IntersectionObserver | null = null;
  private introduced = false;

  /** NTK-5: the width follows the number, as one motion with the digits. */
  private readonly size = ((host: TanreiNumberTicker) =>
    new AnimatedSize(host, {
      box: () => host.box,
      axis: 'inline',
      // The change's duration: the prop, or the component token while it is null (NTK-3).
      get duration() {
        const own = host.duration;
        return own !== null && own !== undefined && Number.isFinite(own) && own > 0 ? `${own}ms` : 'var(--tanrei-comp-number-ticker-motion-duration)';
      },
      easing: 'var(--tanrei-comp-number-ticker-motion-easing)',
    }))(this);

  /** NTK-14: a change of the direction around the ticker is drawn at once: every motion under way is finished. */
  private readonly direction = new DirectionController(this, () => this.finishMotions());

  private get box(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.number');
  }
  private get digitsBox(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.digits');
  }

  override connectedCallback() {
    super.connectedCallback();
    watchLanguage(this);
    if (this.hasUpdated && !this.introduced && this.introduction === null && this.startValue !== null) this.awaitView();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    watching.delete(this);
    this.introduction?.disconnect();
    this.introduction = null;
  }

  /** NTK-14: an ancestor's `lang` changed somewhere; the number is written again, at once, if it changed this ticker's language. */
  languageMayHaveChanged() {
    if (!this.hasUpdated || this.locale.trim()) return;
    if (ambientLocale(this) !== this.writtenFor) this.draw(this.shown ?? this.value, false);
  }

  // ── Reading the props (NTK-12, NTK-16) ──────────────────────────────────────────────────────────────────────────

  private closed<T extends string>(values: readonly T[], value: string, fallback: T, name: string): T {
    if ((values as readonly string[]).includes(value)) return value as T;
    report(this, 'NTK-16', `${name} "${value}" is not a value of the number ticker; it is drawn as "${fallback}"`);
    return fallback;
  }

  private resolveLocale(): string {
    const tag = (this.locale ?? '').trim();
    if (!tag) return ambientLocale(this);
    const known = supportedLocale(tag);
    if (!known) report(this, 'NTK-16', `locale "${tag}" is not a language tag this browser knows; the language of where the ticker stands is used`);
    return known ?? ambientLocale(this);
  }

  /** NTK-1, NTK-12: the formatter for the props, decimal where the currency or the unit is not one it knows. */
  private formatter(locale: string): Intl.NumberFormat {
    const style = this.closed(NUMBER_STYLES, this.numberStyle, 'decimal', 'number-style');
    const notation = this.closed(NOTATIONS, this.notation, 'standard', 'notation');
    const sign = this.closed(SIGN_DISPLAYS, this.signDisplay, 'auto', 'sign-display');
    const options: Intl.NumberFormatOptions = { notation, signDisplay: sign === 'except-zero' ? 'exceptZero' : sign };
    const digits = this.fractionDigits;
    if (digits !== null && digits !== undefined) {
      if (Number.isInteger(digits) && digits >= 0 && digits <= 100) Object.assign(options, { minimumFractionDigits: digits, maximumFractionDigits: digits });
      else report(this, 'NTK-16', `fraction-digits ${digits} is not a whole number from 0 to 100; the formatter's own is used`);
    }
    if (style === 'currency') {
      const code = (this.currency ?? '').trim().toUpperCase();
      const listed = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
      const known = typeof listed === 'function' ? listed('currency').includes(code) : /^[A-Z]{3}$/.test(code);
      if (known) return new Intl.NumberFormat(locale, { ...options, style, currency: code });
      report(this, 'NTK-12', `currency "${this.currency}" is not a currency code the formatter knows; the number is written as decimal`);
    } else if (style === 'unit') {
      try {
        return new Intl.NumberFormat(locale, { ...options, style, unit: (this.unit ?? '').trim() });
      } catch {
        report(this, 'NTK-12', `unit "${this.unit}" is not a unit the formatter knows; the number is written as decimal`);
      }
    } else if (style === 'percent') {
      return new Intl.NumberFormat(locale, { ...options, style });
    }
    return new Intl.NumberFormat(locale, options);
  }

  /** NTK-1: the number written, split into its characters: each digit in a place of its own, everything else as text. */
  private write(value: number): Written {
    const locale = this.resolveLocale();
    this.writtenFor = locale;
    const format = this.formatter(locale);
    const numbering = format.resolvedOptions().numberingSystem;
    const digitFormat = new Intl.NumberFormat(locale, { numberingSystem: numbering, useGrouping: false, maximumFractionDigits: 0 });
    const digits = Array.from({ length: 10 }, (_, d) => digitFormat.format(d));
    const finite = Number.isFinite(value);
    const parts = format.formatToParts(value);
    let place = parts.filter((part) => part.type === 'integer').reduce((n, part) => n + [...part.value].length, 0);
    let fraction = 0;
    const counts: Record<string, number> = {};
    const glyphs: Glyph[] = [];
    for (const part of parts) {
      if (finite && (part.type === 'integer' || part.type === 'fraction')) {
        for (const char of part.value) {
          const key = part.type === 'integer' ? `i${--place}` : `f${fraction++}`;
          const digit = digits.indexOf(char);
          glyphs.push({ key, digit: digit >= 0 ? digit : null, text: char, core: true });
        }
      } else if (finite && (part.type === 'group' || part.type === 'decimal')) {
        glyphs.push({ key: part.type === 'group' ? `g${place}` : 'decimal', digit: null, text: part.value, core: true });
      } else {
        counts[part.type] = (counts[part.type] ?? -1) + 1;
        glyphs.push({ key: `${part.type}${counts[part.type]}`, digit: null, text: part.value, core: false });
      }
    }
    const label = (this.label ?? '').trim();
    const number = format.format(value).replace(BIDI_MARKS, '');
    // The locale's own direction lays the characters out (NTK-13), whatever the direction around the ticker.
    const direction = localeDirection(locale);
    return { glyphs, text: label ? `${label} ${number}` : number, digits, direction, finite };
  }

  // ── The motion's tokens ────────────────────────────────────────────────────────────────────────────────────────

  private timing(): Timing {
    const probe = this.renderRoot.querySelector<HTMLElement>('.timing');
    const style = probe ? getComputedStyle(probe) : null;
    const [duration, stagger, reduced] = (style?.transitionDuration ?? '').split(',').map(seconds);
    const own = this.duration;
    const valid = own === null || own === undefined || (Number.isFinite(own) && own > 0);
    if (!valid) report(this, 'NTK-16', `duration ${own} is not a positive number of milliseconds; comp.number-ticker.motion.duration is used`);
    return {
      duration: valid && own ? own : (duration ?? 0),
      stagger: stagger ?? 0,
      reduced: reduced ?? 0,
      easing: style?.transitionTimingFunction.trim() || 'ease',
      blur: Number.parseFloat(style?.inlineSize ?? '') || 0,
      distance: Number.parseFloat(style?.blockSize ?? '') || 0,
    };
  }

  // ── The update ────────────────────────────────────────────────────────────────────────────────────────────────

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('trend')) this.closed(TRENDS, this.trend, 'auto', 'trend');
    if (changed.has('live')) this.closed(LIVE_VALUES, this.live, 'off', 'live');
    if (changed.has('value') && !Number.isFinite(Number(this.value))) {
      report(this, 'NTK-12', `value ${this.value} is not a finite number; it is written as the formatter writes it, at once`);
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    const formatting = ['numberStyle', 'currency', 'unit', 'notation', 'fractionDigits', 'signDisplay', 'locale', 'label'] as const;
    if (!this.written) {
      // NTK-8: the first drawing — startValue until the ticker first comes into view, else the value at once.
      if (this.startValue !== null && this.startValue !== undefined && !this.introduced) {
        this.draw(Number(this.startValue), false);
        this.awaitView();
      } else {
        this.introduced = true;
        this.draw(Number(this.value), false);
      }
      return;
    }
    if (this.introduction) return; // NTK-8: waiting to come into view; the change to value is made then.
    if (changed.has('value') && Number(this.value) !== this.shown) this.draw(Number(this.value), true);
    else if (formatting.some((name) => changed.has(name))) this.draw(Number(this.value), false);
  }

  /** NTK-8: the change from startValue to value waits for the ticker's first coming into view. */
  private awaitView() {
    if (typeof IntersectionObserver !== 'function') {
      this.introduced = true;
      this.draw(Number(this.value), true);
      return;
    }
    this.introduction?.disconnect();
    this.introduction = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      this.introduction?.disconnect();
      this.introduction = null;
      this.introduced = true;
      this.draw(Number(this.value), true);
    });
    this.introduction.observe(this);
  }

  /** The animation a change takes: the prop, or the design system's answer for `auto` (read now, never cached). */
  private mode(): Mode | 'none' {
    // Read (and an unknown value reported) where a change starts: the prop matters only then.
    const known = (ANIMATION_VALUES as readonly string[]).includes(this.animation);
    if (!known) report(this, 'NTK-16', `animation "${this.animation}" is not a value of the number ticker; it is drawn as "auto"`);
    const asked = known ? this.animation : 'auto';
    if (asked === 'none') return 'none';
    return asked === 'auto' ? compChoice(this, CHOICE, ANIMATIONS) : (asked as Mode);
  }

  /** Every motion of the drawing finished where it was going (NTK-14). */
  private finishMotions() {
    for (const animation of this.box?.getAnimations({ subtree: true }) ?? []) animation.finish();
  }

  /**
   * Draws `value`: at once (`animate` false, NTK-7, NTK-12, NTK-14), or as a change from what is drawn now (NTK-3…6).
   */
  private draw(value: number, animate: boolean) {
    const digitsBox = this.digitsBox;
    const box = this.box;
    if (!digitsBox || !box) return;
    const run = ++this.run;
    const was = this.shown;
    const before = this.written;
    const written = this.write(value);
    this.shown = value;
    this.written = written;
    digitsBox.style.direction = written.direction;
    const mode = this.mode();
    const reduced = reducedMotion();
    const moving = animate && before !== null && was !== null && written.finite && before.finite && mode !== 'none' && !reduced && before.digits.join('') === written.digits.join('');
    if (!moving) {
      const fade = animate && reduced && before !== null && mode !== 'none';
      const ghost = fade ? (digitsBox.cloneNode(true) as HTMLElement) : null;
      const from = fade ? digitsBox.getBoundingClientRect() : null;
      this.size.fit(false);
      for (const animation of box.getAnimations({ subtree: true })) animation.cancel();
      digitsBox.replaceChildren(...this.build(written));
      // NTK-7: the old number cross-fades to the new one under reduced motion.
      if (ghost && from && typeof ghost.animate === 'function') {
        const { reduced: duration } = this.timing();
        if (duration > 0) {
          const now = digitsBox.getBoundingClientRect();
          ghost.classList.add('leaving');
          ghost.style.left = `${from.left - now.left}px`;
          ghost.style.top = `${from.top - now.top}px`;
          ghost.style.direction = getComputedStyle(digitsBox).direction;
          digitsBox.append(ghost);
          const out = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'linear' });
          void out.finished.then(() => ghost.remove(), () => ghost.remove());
          for (const child of [...digitsBox.children].filter((child) => child !== ghost)) (child as HTMLElement).animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'linear' });
        }
      }
      this.speak(written.text, true);
      if (animate) this.settled(run, value);
      return;
    }
    this.change(run, was!, value, before!, written, mode as Mode);
  }

  /** NTK-9, NTK-10: the text read; a live region is written only when a change has settled. */
  private speak(text: string, settledNow: boolean) {
    if (this.live !== 'polite' || settledNow) this.spoken = text;
  }

  private settled(run: number, value: number) {
    if (run !== this.run) return;
    if (this.written) this.spoken = this.written.text;
    this.dispatchEvent(new CustomEvent<TanreiNumberTickerSettleDetail>('settle', { bubbles: true, detail: { value } }));
  }

  // ── The drawing ───────────────────────────────────────────────────────────────────────────────────────────────

  /** The characters at rest: the numeric run in one `.core`, every other character a `.char` around it. */
  private build(written: Written): HTMLElement[] {
    const out: HTMLElement[] = [];
    let core: HTMLElement | null = null;
    const coreAt = written.glyphs.findIndex((glyph) => glyph.core);
    let coreEnd = -1;
    written.glyphs.forEach((glyph, i) => {
      if (glyph.core) coreEnd = i;
    });
    written.glyphs.forEach((glyph, i) => {
      const element = this.glyph(glyph, written.digits);
      if (coreAt >= 0 && i >= coreAt && i <= coreEnd) {
        if (!core) {
          core = document.createElement('span');
          core.className = 'core';
          out.push(core);
        }
        (core as HTMLElement).append(element);
      } else out.push(element);
    });
    return out;
  }

  private glyph(glyph: Glyph, digits: readonly string[]): HTMLElement {
    const element = document.createElement('span');
    element.dataset.key = glyph.key;
    if (glyph.digit === null) {
      element.className = 'char';
      element.textContent = glyph.text;
      return element;
    }
    element.className = 'place';
    const sizer = document.createElement('span');
    sizer.className = 'sizer';
    sizer.textContent = digits[0];
    const column = document.createElement('span');
    column.className = 'column';
    for (let i = 0; i < ROWS; i++) {
      const digit = document.createElement('span');
      digit.textContent = digits[i % 10];
      column.append(digit);
    }
    column.style.transform = at(rest(glyph.digit));
    element.append(sizer, column);
    this.places.set(element, { digit: glyph.digit });
    return element;
  }

  /** NTK-3: where a column at `p` goes to show `digit`, moving the way `way` says (0: by the digit's own change). */
  private static target(p: number, from: number, digit: number, way: number): number {
    if (way === 0) return rest(digit);
    if (digit === from && Math.abs(p - rest(from)) < AT_REST) return p;
    return way > 0 ? digit + 10 * Math.ceil((p - digit - 1e-6) / 10) : digit + 10 * Math.floor((p - digit + 1e-6) / 10);
  }

  /** Where a column is drawn now, as a position in the column (NTK-6): read from its computed transform. */
  private static drawnAt(column: HTMLElement): number {
    const height = column.offsetHeight;
    const transform = getComputedStyle(column).transform;
    if (!height || !transform || transform === 'none') return 10;
    // A column at rest is read at its rest: a transform read back carries the engine's rounding (9.995 for 10).
    const read = (-new DOMMatrixReadOnly(transform).m42 * ROWS) / height;
    const p = Math.abs(read - Math.round(read)) < AT_REST ? Math.round(read) : read;
    // Into the middle copy, which looks the same: a whole turn either way stays inside the column.
    return (((p % 10) + 10) % 10) + 10;
  }

  /**
   * NTK-3…6: a change from `was` to `value`. The characters that stay are kept and moved; the ones that come and go fade
   * in and out; the width moves with the size transition, and every character that stays moves along the line from where
   * it is drawn to its new place with it.
   */
  private change(run: number, was: number, value: number, before: Written, written: Written, mode: Mode) {
    const box = this.box!;
    const digitsBox = this.digitsBox!;
    const timing = this.timing();
    const trend = (TRENDS as readonly string[]).includes(this.trend) ? this.trend : 'auto';
    const whole = Math.sign(value - was);
    this.speak(written.text, false);
    const way = trend === 'up' ? 1 : trend === 'down' ? -1 : trend === 'digit' ? 0 : whole;
    // What is drawn now: each character's place on the line, and each column's position.
    const boxBefore = box.getBoundingClientRect();
    const old = new Map<string, HTMLElement>();
    for (const element of digitsBox.querySelectorAll<HTMLElement>('[data-key]')) {
      if (!element.closest('.leaving')) old.set(element.dataset.key!, element);
    }
    const rects = new Map<HTMLElement, DOMRect>();
    const positions = new Map<HTMLElement, number>();
    for (const element of old.values()) {
      rects.set(element, element.getBoundingClientRect());
      const column = element.querySelector<HTMLElement>(':scope > .column');
      if (column) positions.set(element, TanreiNumberTicker.drawnAt(column));
    }
    // Every motion under way stops where it is drawn (NTK-6); the ones of what is leaving run on.
    for (const element of old.values()) {
      // A blurred digit on its way out runs on: it fades from where it is (NTK-6).
      for (const animation of element.getAnimations({ subtree: true })) {
        if (!((animation.effect as KeyframeEffect | null)?.target as Element | null)?.classList.contains('fading')) animation.cancel();
      }
      for (const layer of element.querySelectorAll(':scope > .layer:not(.fading)')) layer.remove();
      delete element.dataset.flip;
      element.querySelector<HTMLElement>(':scope > .column')?.style.removeProperty('visibility');
    }
    // The new characters, reusing each place that stays.
    const kept = new Set<HTMLElement>();
    const entering = new Set<HTMLElement>();
    const fresh = this.build(written);
    const swap = (element: HTMLElement) => {
      const same = old.get(element.dataset.key!);
      const reuse = same && same.classList.contains('place') === element.classList.contains('place') && (same.classList.contains('place') || same.textContent === element.textContent);
      if (!reuse) {
        entering.add(element);
        return element;
      }
      kept.add(same);
      return same;
    };
    const next = fresh.map((element) => {
      if (element.classList.contains('core')) {
        element.replaceChildren(...[...element.children].map((child) => swap(child as HTMLElement)));
        return element;
      }
      return swap(element);
    });
    const leaving = [...old.values()].filter((element) => !kept.has(element));
    const stillLeaving = [...digitsBox.querySelectorAll<HTMLElement>(':scope > .leaving')];
    digitsBox.replaceChildren(...next, ...stillLeaving);
    // The width at its end, and every character at its end place, measured with nothing moving them…
    this.size.fit(false);
    const boxAfter = box.getBoundingClientRect();
    const digitsAfter = digitsBox.getBoundingClientRect();
    const ends = new Map<HTMLElement, DOMRect>();
    for (const element of kept) ends.set(element, element.getBoundingClientRect());
    // …then the width moving there from what was drawn: the number stands at the box's start edge, so it is carried
    // from where that edge was to where it will be.
    this.size.fit(true);
    const rtl = getComputedStyle(box).direction === 'rtl';
    const carried = rtl ? boxBefore.right - boxAfter.right : boxBefore.left - boxAfter.left;
    const motions: Animation[] = [...box.getAnimations()];
    const options = (delay = 0): KeyframeAnimationOptions => ({ duration: timing.duration, easing: timing.easing, delay, fill: 'backwards' });
    // NTK-5: a character that stays moves along the line from where it was drawn, with the width.
    for (const element of kept) {
      const shift = rects.get(element)!.left - (ends.get(element)!.left + carried);
      if (Math.abs(shift) >= 0.5) motions.push(element.animate([{ translate: `${shift}px 0` }, { translate: '0 0' }], options()));
    }
    // NTK-5: what goes is drawn where it was and fades out — a digit's column moving on the way the change moves.
    for (const element of leaving) {
      const rect = rects.get(element)!;
      element.classList.add('leaving');
      element.style.left = `${rect.left - carried - digitsAfter.left}px`;
      element.style.top = `${rect.top - digitsAfter.top}px`;
      digitsBox.append(element);
      const out = [element.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: `${carried}px 0` }], { duration: timing.duration, easing: timing.easing })];
      const column = element.querySelector<HTMLElement>(':scope > .column');
      if (column && mode === 'slide') {
        const p = positions.get(element) ?? 10;
        out.push(column.animate([{ transform: at(p) }, { transform: at(p + (way || 1)) }], { duration: timing.duration, easing: timing.easing, fill: 'forwards' }));
      }
      void Promise.allSettled(out.map((animation) => animation.finished)).then(() => element.remove());
    }
    // NTK-5: what comes fades in — a digit's column rising (or falling) one step into place as it moves.
    for (const element of entering) {
      motions.push(element.animate([{ opacity: 0 }, { opacity: 1 }], options()));
      const column = element.querySelector<HTMLElement>(':scope > .column');
      const state = this.places.get(element);
      if (column && state && mode === 'slide') motions.push(column.animate([{ transform: at(rest(state.digit) - (way || 1)) }, { transform: at(rest(state.digit)) }], options()));
    }
    // NTK-3, NTK-4: each place that stays and whose digit changes, from the most significant to the least.
    const changing: [HTMLElement, number, number, PlaceState][] = [];
    for (const glyph of written.glyphs) {
      if (glyph.digit === null) continue;
      const element = [...kept].find((each) => each.dataset.key === glyph.key && each.classList.contains('place'));
      const state = element && this.places.get(element);
      if (!element || !state) continue;
      const p = positions.get(element) ?? rest(state.digit);
      const from = Math.round(p) % 10;
      if (glyph.digit === state.digit && Math.abs(p - rest(state.digit)) < AT_REST) continue;
      changing.push([element, p, from, state]);
      state.digit = glyph.digit;
    }
    changing.forEach(([element, p, from, state], i) => {
      const column = element.querySelector<HTMLElement>(':scope > .column')!;
      const digit = state.digit;
      if (mode === 'slide') {
        const x = TanreiNumberTicker.target(p, from, digit, way);
        column.style.transform = at(x);
        const motion = column.animate([{ transform: at(p) }, { transform: at(x) }], options(i * timing.stagger));
        motions.push(motion);
        void motion.finished.then(
          () => {
            if (this.places.get(element) === state && state.digit === digit) column.style.transform = at(rest(digit));
          },
          () => undefined,
        );
        return;
      }
      column.style.transform = at(rest(digit));
      const oldText = before.digits[from] ?? '';
      const newText = written.digits[digit] ?? '';
      if (mode === 'flip') {
        motions.push(...this.flip(element, column, oldText, newText, timing));
        return;
      }
      // blur, blur-slide: the old digit blurs out as the new one sharpens in (and both move by the distance).
      const toward = way || Math.sign(digit - from) || 1;
      const distance = mode === 'blur-slide' ? timing.distance : 0;
      const ghost = document.createElement('span');
      ghost.className = 'layer fading';
      ghost.textContent = oldText;
      element.append(ghost);
      const gone = ghost.animate(
        [
          { opacity: 1, filter: 'blur(0px)', translate: '0 0' },
          { opacity: 0, filter: `blur(${timing.blur}px)`, translate: `0 ${-toward * distance}px` },
        ],
        { duration: timing.duration, easing: timing.easing, fill: 'forwards' },
      );
      void gone.finished.then(() => ghost.remove(), () => ghost.remove());
      motions.push(
        column.animate(
          [
            { opacity: 0, filter: `blur(${timing.blur}px)`, translate: `0 ${toward * distance}px` },
            { opacity: 1, filter: 'blur(0px)', translate: '0 0' },
          ],
          options(),
        ),
      );
    });
    // NTK-11: settled once every motion of this change has ended — never for a change a later one replaced.
    void Promise.allSettled(motions.map((motion) => motion.finished)).then(() => this.settled(run, value));
  }

  /** NTK-4 flip: the old digit's upper half turns down over its lower half, uncovering the new digit's upper half; then the new lower half turns down into place. */
  private flip(element: HTMLElement, column: HTMLElement, oldText: string, newText: string, timing: Timing): Animation[] {
    element.dataset.flip = '';
    column.style.visibility = 'hidden';
    const layer = (text: string, half: 'top' | 'bottom') => {
      const span = document.createElement('span');
      span.className = `layer ${half}`;
      span.textContent = text;
      element.append(span);
      return span;
    };
    const newTop = layer(newText, 'top');
    const oldBottom = layer(oldText, 'bottom');
    const oldTop = layer(oldText, 'top');
    const newBottom = layer(newText, 'bottom');
    const timed = { duration: timing.duration, easing: timing.easing, fill: 'forwards' as const };
    const motions = [
      oldTop.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)', offset: 0.5 }, { transform: 'rotateX(-90deg)', visibility: 'hidden' }], timed),
      newBottom.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(90deg)', offset: 0.5 }, { transform: 'rotateX(0deg)' }], timed),
      oldBottom.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }], timed),
    ];
    void Promise.allSettled(motions.map((motion) => motion.finished)).then(() => {
      if (!motions.every((motion) => motion.playState === 'finished')) return;
      for (const span of [newTop, oldBottom, oldTop, newBottom]) span.remove();
      delete element.dataset.flip;
      column.style.removeProperty('visibility');
    });
    return motions;
  }

  protected override render(): unknown {
    const polite = this.live === 'polite';
    return html`<span class="text" aria-live=${polite ? 'polite' : nothing} aria-atomic=${polite ? 'true' : nothing}>${this.spoken}</span><span class="number" aria-hidden="true"
        ><span class="digits"></span></span
      ><span class="timing" aria-hidden="true"></span>${DIRECTION_PROBE}`;
  }
}

if (!customElements.get('tanrei-number-ticker')) customElements.define('tanrei-number-ticker', TanreiNumberTicker);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-number-ticker': TanreiNumberTicker;
  }
}
