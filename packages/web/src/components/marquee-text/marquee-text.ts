import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AvailabilityController, DIRECTION_PROBE, DirectionController, WordsController, report } from '../../primitives/index.js';
import { TanreiElement } from '../../primitives/element.js';
import '../button/button.js';
import { FADE, GAP, LOOPS, SPEED, TRIGGERS, styles } from './marquee-text.styles.js';

/** When the text scrolls (MRQ-3). */
export type TanreiMarqueeTextTrigger = (typeof TRIGGERS)[number];
/** How a pass goes (MRQ-4, MRQ-5). */
export type TanreiMarqueeTextLoop = (typeof LOOPS)[number];
/** `pausedchange`'s detail: the value the playback control set. */
export interface TanreiMarqueeTextPausedChangeDetail {
  paused: boolean;
}

/** A width compared with another is the same within this much: layout rounds to a fraction of a pixel. */
const SAME = 0.5;
/** The size the browser's default text size is measured against (MRQ-13). */
const DEFAULT_TEXT_PX = 16;

/** The elements around the line that take presses or focus: the trigger's area (MRQ-3). */
const CONTROL = [
  'a[href]',
  'button',
  'summary',
  'label',
  'select',
  'input',
  'textarea',
  '[tabindex]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  ...['button', 'link', 'option', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab', 'treeitem', 'row', 'gridcell', 'checkbox', 'radio', 'switch'].map((role) => `[role="${role}"]`),
].join(', ');

/** Letters of the scripts written right to left (Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan, Mandaic and their presentation forms). */
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]|\uD802[\uDC00-\uDFFF]|\uD803[\uDC00-\uDE7F]|\uD83A[\uDC00-\uDFFF]|\uD83B[\uDC00-\uDEFF]/u;
/** A strong character of either direction: a letter (or a mark of a letter's script). */
const STRONG = /[\p{L}]/u;

/** The base direction of a text: that of its first strong character (MRQ-7), or null where it has none. */
export function textDirection(text: string): 'ltr' | 'rtl' | null {
  for (const char of text) {
    if (RTL_LETTER.test(char)) return 'rtl';
    if (STRONG.test(char)) return 'ltr';
  }
  return null;
}

/** A positive finite number, or null (MRQ-15). */
const positive = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);
/** A finite number not below zero, or null (MRQ-15). */
const notNegative = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);
/** A number attribute: empty, absent or not a number is null. */
const numberOrNull = { fromAttribute: (value: string | null) => (value === null || value.trim() === '' ? null : Number(value)), toAttribute: (value: number | null) => (value === null ? null : String(value)) };

/** The element that holds focus, through shadow roots. */
function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** The parent of an element, crossing a shadow root to its host and a slot's assignment to where it is slotted. */
const parentOf = (element: Element): Element | null => element.assignedSlot ?? element.parentElement ?? ((element.getRootNode() as ShadowRoot).host ?? null);

/** The look of the fade at one moment: whether text lies hidden behind the left and behind the right edge (MRQ-6). */
type Hidden = { left: boolean; right: boolean };

/**
 * One line of text that does not fit its place and, while its trigger holds, moves sideways at a steady pace to show
 * all of it, resting at its start between passes; at rest it is cut with an ellipsis.
 *
 * Contract: specs/marquee-text.spec.json. The line is as wide as its place and drawn in the text style, color and
 * direction of where it stands; it moves only while the text does not fit, never where motion is reduced, and is read
 * once, whole. It is never a focus stop: `focus` is the focus of the control it stands in (a row, a chip).
 *
 * `trigger` — `hover-or-focus` (the default), `hover`, `focus` or `always`. `loop` — `repeat` (a copy follows a gap
 * behind) or `bounce`. `speed` is in pixels per second; `start-pause`, `end-pause` in milliseconds; `iterations` the
 * passes a trigger plays (none: until the trigger ends). With `always`, `playback-control` draws a pause button at the
 * line's end; without it the product must give the page a control that sets `paused` (WCAG 2.2.2), which a debug build
 * reports.
 *
 * The motion of a run of passes is one Web Animations API animation of the text's `translate` (and one of the fade's
 * mask, with the same timing), its keyframes holding the pauses: nothing is measured while it runs.
 *
 * @tag tanrei-marquee-text
 * @slot - The text: plain text, or inline content (a bold run, an inline mark).
 * @csspart viewport - The line's box, which clips the text.
 * @csspart playback - The playback control, a small text `<tanrei-button>`.
 * @fires {CustomEvent<TanreiMarqueeTextPausedChangeDetail>} pausedchange - The person paused or played the motion with the playback control; `detail.paused` is the new value. Not fired when `paused` is set.
 */
export class TanreiMarqueeText extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'marquee-text');
  static override styles = styles;

  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  static override properties: PropertyDeclarations = {
    trigger: { type: String, reflect: true },
    loop: { type: String, reflect: true },
    speed: { attribute: 'speed', converter: numberOrNull },
    startPause: { attribute: 'start-pause', converter: numberOrNull },
    endPause: { attribute: 'end-pause', converter: numberOrNull },
    iterations: { attribute: 'iterations', converter: numberOrNull },
    paused: { type: Boolean, reflect: true },
    playbackControl: { type: Boolean, attribute: 'playback-control', reflect: true },
    playLabel: { type: String, attribute: 'play-label' },
    pauseLabel: { type: String, attribute: 'pause-label' },
    fits: { state: true },
    playing: { state: true },
    reduced: { state: true },
    textDir: { state: true },
  };

  /** When the text scrolls (MRQ-3): `hover-or-focus` (the default), `hover`, `focus` or `always`. Anything else is the default, reported in debug builds. Reflected. */
  trigger: TanreiMarqueeTextTrigger = 'hover-or-focus';

  /** How a pass goes: `repeat` (the default) or `bounce` (MRQ-4, MRQ-5). Anything else is `repeat`, reported in debug builds. Reflected. */
  loop: TanreiMarqueeTextLoop = 'repeat';

  /** How fast the text moves, in pixels per second; null takes `comp.marquee-text.speed`. Not positive: null, reported in debug builds. */
  speed: number | null = null;

  /** How long the text rests at its start before each pass, in ms; 0 rests none; null takes `comp.marquee-text.motion.start-pause`. */
  startPause: number | null = null;

  /** While loop is bounce: how long the text rests with its end in view, in ms; null takes `comp.marquee-text.motion.end-pause`. */
  endPause: number | null = null;

  /** How many passes a trigger plays before the text rests; null plays until the trigger ends (and without end for always). */
  iterations: number | null = null;

  /** Holds the motion where it is: set by the playback control, or by the product's control that pauses every moving part of the page. Reflected. */
  paused = false;

  /** While trigger is always: draws the playback control at the line's end. Off by default: give the page a control that sets `paused` instead (WCAG 2.2.2). */
  playbackControl = false;

  /** The playback control's accessible name while the motion is paused ("Play scrolling text"); empty reads the product's words. */
  playLabel = '';

  /** The playback control's accessible name while the text moves ("Pause scrolling text"); empty reads the product's words. */
  pauseLabel = '';

  /** MRQ-1: whether the text fits the line. True until it is measured, so that the first frame draws a plain line. */
  private fits = true;
  /** MRQ-6: whether the line plays its passes (moving, or resting between two), and so draws no ellipsis. */
  private playing = false;
  /** MRQ-8: whether motion is reduced. */
  private reduced = false;
  /** MRQ-7: the text's own direction. */
  private textDir: 'ltr' | 'rtl' = 'ltr';

  /** The width of the text as last measured. */
  private textWidth = 0;
  /** The width of the viewport as last measured. */
  private viewWidth = 0;

  /** The run of passes, and the fade's animation with the same timing. */
  private run: Animation[] = [];
  /** The motion back to the start when a trigger ends (MRQ-3). */
  private returning: Animation[] = [];
  /** MRQ-14: a value changed while a run played; the next pass is played from it. */
  private changedMidRun = false;
  /** MRQ-8: the timer of the next view where motion is reduced. */
  private stepTimer: ReturnType<typeof setTimeout> | undefined;
  /** MRQ-3: the timer of the start delay of a hover or a focus: until it ends the line is still the cut line. */
  private delayTimer: ReturnType<typeof setTimeout> | undefined;
  /** MRQ-3: the trigger that holds has played its passes; a new trigger plays them again. */
  private spent = false;

  private hovering = false;
  private focused = false;
  private inView = true;
  private pageVisible = typeof document === 'undefined' ? true : document.visibilityState !== 'hidden';
  /** The element whose hover and focus are the trigger (MRQ-3): the nearest control around the line, or the host. */
  private area: Element | null = null;

  private sizes: ResizeObserver | null = null;
  private mutations: MutationObserver | null = null;
  private sight: IntersectionObserver | null = null;
  private motionQuery: MediaQueryList | null = null;
  private reportedPause = false;
  /** A width was read while a face was loading: it is read again once the faces are ready. */
  private facesPending = false;

  /** MRQ-17: a change of the layout direction rests the line at once and draws it for the new direction. */
  private readonly direction = new DirectionController(this, () => {
    this.stop();
    this.measure();
  });

  // ── Reading the tokens ─────────────────────────────────────────────────────────────────────────

  private probe(name: string): CSSStyleDeclaration | null {
    const el = this.renderRoot?.querySelector(`.timing.${name}`);
    return el ? getComputedStyle(el) : null;
  }

  /** A duration token in ms, read through its probe's transition delay. */
  private tokenMs(name: string): number {
    const seconds = Number.parseFloat(this.probe(name)?.transitionDelay ?? '');
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
  }

  private tokenEasing(name: string): string {
    return this.probe(name)?.transitionTimingFunction || 'linear';
  }

  private tokenPx(property: string): number {
    const probe = document.createElement('div');
    probe.style.inlineSize = `var(${property})`;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    this.renderRoot.appendChild(probe);
    const px = probe.getBoundingClientRect().width;
    probe.remove();
    return px;
  }

  /** MRQ-13: the ratio of the browser's default text size to 16 px. */
  private textScale(): number {
    const px = Number.parseFloat(this.probe('medium')?.fontSize ?? '');
    return Number.isFinite(px) && px > 0 ? px / DEFAULT_TEXT_PX : 1;
  }

  /** MRQ-4, MRQ-13: pixels per second at this text size. */
  private pace(): number {
    const own = positive(this.speed);
    const token = Number.parseFloat(getComputedStyle(this).getPropertyValue(SPEED));
    const base = own ?? (Number.isFinite(token) && token > 0 ? token : 1);
    return base * this.textScale();
  }

  private get startRest(): number {
    return notNegative(this.startPause) ?? this.tokenMs('start-pause');
  }

  private get endRest(): number {
    return notNegative(this.endPause) ?? this.tokenMs('end-pause');
  }

  private get passes(): number {
    const own = notNegative(this.iterations);
    return own === null ? Number.POSITIVE_INFINITY : own;
  }

  private get triggerName(): TanreiMarqueeTextTrigger {
    return (TRIGGERS as readonly string[]).includes(this.trigger) ? this.trigger : 'hover-or-focus';
  }

  private get loopName(): TanreiMarqueeTextLoop {
    return (LOOPS as readonly string[]).includes(this.loop) ? this.loop : 'repeat';
  }

  // ── The parts ──────────────────────────────────────────────────────────────────────────────────

  private get viewport(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.viewport') ?? null;
  }

  private get track(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.track') ?? null;
  }

  // ── Life ───────────────────────────────────────────────────────────────────────────────────────

  override connectedCallback() {
    super.connectedCallback();
    if (typeof matchMedia === 'function') {
      this.motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = this.motionQuery.matches;
      this.motionQuery.addEventListener('change', this.onMotionChange);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.pageVisible = document.visibilityState !== 'hidden';
    this.mutations = new MutationObserver(this.onContent);
    this.mutations.observe(this, { childList: true, characterData: true, subtree: true });
    if (this.hasUpdated) this.observe();
    this.watchArea();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.mutations?.disconnect();
    document.fonts?.removeEventListener?.('loadingdone', this.onFaces);
    this.sizes?.disconnect();
    this.sight?.disconnect();
    this.mutations = this.sizes = this.sight = null;
    this.unwatchArea();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // MRQ-15: values the component does not define are their defaults; numbers out of range are null.
    if (changed.has('trigger') && !(TRIGGERS as readonly string[]).includes(this.trigger)) {
      report(this, 'MRQ-15', `trigger "${this.trigger}" is not a value of the marquee text; it is drawn as "hover-or-focus"`);
    }
    if (changed.has('loop') && !(LOOPS as readonly string[]).includes(this.loop)) {
      report(this, 'MRQ-15', `loop "${this.loop}" is not a value of the marquee text; it is drawn as "repeat"`);
    }
    if (changed.has('speed') && this.speed !== null && this.speed !== undefined && positive(this.speed) === null) {
      report(this, 'MRQ-15', `speed ${this.speed} is not a positive number of pixels per second; comp.marquee-text.speed is used`);
    }
    for (const [name, value] of [['startPause', this.startPause], ['endPause', this.endPause], ['iterations', this.iterations]] as const) {
      if (changed.has(name) && value !== null && value !== undefined && notNegative(value) === null) {
        report(this, 'MRQ-15', `${name} ${value} is negative or not a number; it is treated as null`);
      }
    }
  }

  protected override firstUpdated() {
    this.observe();
    this.measure();
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('trigger')) this.watchArea();
    const timing: (keyof this)[] = ['speed', 'startPause', 'endPause', 'loop', 'iterations'];
    // MRQ-14: a change of trigger rests the line and asks again; a change of the pass's values takes effect from the next pass.
    if (changed.has('trigger') && changed.get('trigger') !== undefined) {
      this.stop();
      this.decide();
    } else if (timing.some((name) => changed.has(name as keyof TanreiMarqueeText) && changed.get(name as keyof TanreiMarqueeText) !== undefined)) {
      this.fromNextPass();
    }
    if (changed.has('paused')) this.holdOrGo();
    if ((changed as Map<string, unknown>).has('playing') && this.playing && this.loopName === 'repeat') this.fillCopy();
    this.reportControl();
  }

  /** MRQ-10, MRQ-12: what a line that moves all the time lacks for a person to stop it, in debug builds. */
  private reportControl() {
    if (this.triggerName !== 'always' || this.fits || this.reduced) return;
    if (!this.playbackControl) {
      if (!this.reportedPause) {
        this.reportedPause = true;
        report(this, 'MRQ-10', 'trigger is always and the text moves, but playback-control is off: give the page a control that sets paused on every moving part, or set playback-control, so that a person can stop the motion (WCAG 2.2.2)');
      }
      return;
    }
    if (!this.words.get('marqueePlayLabel', this.playLabel)) this.words.missing('marqueePlayLabel', { prop: 'playLabel', id: 'MRQ-12', effect: 'the playback control is drawn and has no accessible name while the motion is paused' });
    if (!this.words.get('marqueePauseLabel', this.pauseLabel)) this.words.missing('marqueePauseLabel', { prop: 'pauseLabel', id: 'MRQ-12', effect: 'the playback control is drawn and has no accessible name while the text moves' });
  }

  private observe() {
    if (this.sizes) return;
    const viewport = this.viewport;
    if (!viewport) return;
    this.sizes = new ResizeObserver(() => this.measure());
    this.sizes.observe(viewport);
    this.sight = new IntersectionObserver((entries) => {
      const seen = entries[entries.length - 1]?.isIntersecting ?? true;
      if (seen !== this.inView) {
        this.inView = seen;
        this.decide(true);
      }
    });
    this.sight.observe(this);
    document.fonts?.addEventListener?.('loadingdone', this.onFaces);
  }

  private readonly onFaces = () => this.measure();

  /**
   * A text drawn while its face is loading is drawn, and measured, in a fallback face of another width. The width is
   * read again once the faces are ready: `loadingdone` is not enough, as WebKit on Linux does not always fire it for a
   * face that was loading when the listener was added (the run's distance was then the fallback's, 26 px short).
   */
  private measureWhenFacesReady() {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    if (!fonts || fonts.status !== 'loading' || this.facesPending) return;
    this.facesPending = true;
    void fonts.ready.then(() => {
      this.facesPending = false;
      if (this.isConnected) this.measure();
    });
  }

  // ── Measuring (MRQ-1, MRQ-7, MRQ-14) ───────────────────────────────────────────────────────────

  private readonly onContent = () => {
    this.measure();
    if (this.playing && this.loopName === 'repeat') this.fillCopy();
  };

  /** Reads whether the text fits, and its direction; a run that is playing starts again from the start (MRQ-14). */
  private measure() {
    const viewport = this.viewport;
    const text = this.renderRoot?.querySelector<HTMLElement>('.text');
    if (!viewport || !text) return;
    const own = textDirection(this.textContent ?? '');
    const dir = own ?? (this.direction.rtl ? 'rtl' : 'ltr');
    const textWidth = text.getBoundingClientRect().width;
    const viewWidth = viewport.getBoundingClientRect().width;
    // After the layout the reads forced: a face the text first asked for in it is loading now.
    this.measureWhenFacesReady();
    const fits = viewWidth === 0 || textWidth <= viewWidth + SAME;
    const changed = Math.abs(textWidth - this.textWidth) > SAME || Math.abs(viewWidth - this.viewWidth) > SAME || dir !== this.textDir || fits !== this.fits;
    this.textWidth = textWidth;
    this.viewWidth = viewWidth;
    if (dir !== this.textDir) this.textDir = dir;
    if (fits !== this.fits) this.fits = fits;
    if (!changed) return;
    if (this.playing || this.stepTimer !== undefined) {
      this.stop();
      if (!fits) void this.updateComplete.then(() => this.decide());
    } else {
      this.decide();
    }
  }

  // ── The trigger (MRQ-3, MRQ-9) ─────────────────────────────────────────────────────────────────

  /** The nearest element around the line that takes presses or focus, across shadow roots; the host where none does. */
  private findArea(): Element {
    for (let at = parentOf(this); at; at = parentOf(at)) {
      if (at instanceof HTMLSlotElement) continue;
      if (at.matches(CONTROL)) return at;
      if (at.localName.includes('-') && at.shadowRoot?.querySelector(CONTROL)) return at;
      if (at === document.body) break;
    }
    return this;
  }

  private watchArea() {
    if (!this.isConnected) return;
    const area = this.triggerName === 'always' ? this : this.findArea();
    if (area === this.area) return;
    this.unwatchArea();
    this.area = area;
    area.addEventListener('pointerenter', this.onEnter as EventListener);
    area.addEventListener('pointerleave', this.onLeave as EventListener);
    // A mouse's leaving is heard as mouseleave too: Chromium does not always send pointerleave after it.
    area.addEventListener('mouseleave', this.onLeave as EventListener);
    area.addEventListener('focusin', this.onFocusIn);
    area.addEventListener('focusout', this.onFocusOut);
    if (area !== this) {
      this.addEventListener('focusin', this.onFocusIn);
      this.addEventListener('focusout', this.onFocusOut);
    }
  }

  private unwatchArea() {
    const area = this.area;
    if (!area) return;
    area.removeEventListener('pointerenter', this.onEnter as EventListener);
    area.removeEventListener('pointerleave', this.onLeave as EventListener);
    area.removeEventListener('mouseleave', this.onLeave as EventListener);
    area.removeEventListener('focusin', this.onFocusIn);
    area.removeEventListener('focusout', this.onFocusOut);
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('focusout', this.onFocusOut);
    this.area = null;
    this.hovering = this.focused = false;
  }

  private readonly onEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    this.hovering = true;
    this.decide();
  };

  private readonly onLeave = (event: PointerEvent | MouseEvent) => {
    if ('pointerType' in event && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (!this.hovering) return;
    this.hovering = false;
    this.decide();
  };

  /** Keyboard focus on the area or inside the line: `:focus-visible` on the element that holds it. */
  private readFocus() {
    const area = this.area;
    const active = deepActive();
    const within = !!area && (area.matches(':focus-within') || this.matches(':focus-within'));
    const focused = within && !!active && active.matches(':focus-visible');
    this.focused = focused;
    this.decide();
  }

  private readonly onFocusIn = () => this.readFocus();
  private readonly onFocusOut = () => queueMicrotask(() => this.readFocus());

  private readonly onVisibility = () => {
    const visible = document.visibilityState !== 'hidden';
    if (visible !== this.pageVisible) {
      this.pageVisible = visible;
      this.decide(true);
    }
  };

  private readonly onMotionChange = (event: MediaQueryListEvent) => {
    this.reduced = event.matches;
    this.stop();
    void this.updateComplete.then(() => this.decide());
  };

  /** Whether the trigger holds now (MRQ-3). */
  private get triggered(): boolean {
    switch (this.triggerName) {
      case 'always':
        return this.inView && this.pageVisible;
      case 'hover':
        return this.hovering;
      case 'focus':
        return this.focused;
      default:
        return this.hovering || this.focused;
    }
  }

  /** MRQ-9: a line that moves all the time holds while the pointer is over it or focus is within it, and while paused. */
  private get held(): boolean {
    if (this.paused) return true;
    return this.triggerName === 'always' && (this.hovering || this.focused || this.matches(':focus-within'));
  }

  /**
   * Starts, ends or holds the passes as the trigger, the fit and the motion setting say. `fresh`: a line that moves all
   * the time and comes back into view, or to a shown page, starts again from the start (MRQ-9).
   */
  private decide(fresh = false) {
    if (!this.isConnected || !this.hasUpdated) return;
    const always = this.triggerName === 'always';
    const go = !this.fits && this.triggered && !(always && this.reduced);
    if (!go) {
      this.spent = false;
      if (this.playing || this.stepTimer !== undefined || this.delayTimer !== undefined) {
        if (always || this.reduced || this.fits || !this.run.length) this.stop();
        else this.returnToStart();
      }
      return;
    }
    if (fresh && always) {
      this.stop();
      this.spent = false;
    }
    if (this.spent) return;
    if (this.run.length || this.stepTimer !== undefined || this.delayTimer !== undefined || this.playing) {
      this.holdOrGo();
      return;
    }
    if (this.reduced) this.startViews();
    else if (always) void this.start(this.startRest);
    else {
      // A pointer that passes over the line sets nothing moving: the passes start once the trigger has held this long.
      this.delayTimer = setTimeout(() => {
        this.delayTimer = undefined;
        if (this.triggered && !this.fits) void this.start(0);
      }, this.tokenMs('start-delay'));
    }
  }

  // ── The motion (MRQ-4, MRQ-5, MRQ-6) ───────────────────────────────────────────────────────────

  /** The fade's look as the mask's size and position: widened past each side behind which no text lies hidden. */
  private maskFor(hidden: Hidden, fade: number): Keyframe {
    const widen = (hidden.left ? 0 : 1) + (hidden.right ? 0 : 1);
    return { maskSize: `calc(100% + ${widen * fade}px) 100%`, maskPosition: `${hidden.left ? 0 : -fade}px 0px` };
  }

  /** What lies hidden behind each physical edge when the text stands `fromStart` past its start, in the text's direction. */
  private hiddenAt(edge: 'start' | 'end' | 'both'): Hidden {
    const start = edge !== 'end';
    const end = edge !== 'start';
    return this.textDir === 'rtl' ? { left: end, right: start } : { left: start, right: end };
  }

  /**
   * Builds the run's keyframes: the text's translate and the fade's mask at each offset of one iteration, an iteration
   * being one pass and the rest after it.
   */
  private keyframes(): { duration: number; track: Keyframe[]; mask: Keyframe[] } {
    const sign = this.textDir === 'rtl' ? 1 : -1;
    const v = this.pace() / 1000;
    const easing = this.tokenEasing('pass');
    const fadePx = Math.max(0, this.tokenPx(FADE));
    const rest = this.startRest;
    const tx = (px: number): Keyframe => ({ translate: `${sign * px}px 0px` });
    const at = (offset: number, frame: Keyframe): Keyframe => ({ ...frame, offset, easing });
    if (this.loopName === 'bounce') {
      const distance = Math.max(0, this.textWidth - this.viewWidth);
      const travel = distance / v;
      const end = this.endRest;
      const duration = Math.max(1, 2 * travel + end + rest);
      const fade = Math.min(fadePx, distance / 2);
      const ramp = fade / v;
      const o = (ms: number) => Math.min(1, Math.max(0, ms / duration));
      return {
        duration,
        track: [at(0, tx(0)), at(o(travel), tx(distance)), at(o(travel + end), tx(distance)), at(o(2 * travel + end), tx(0)), at(1, tx(0))],
        mask: [
          at(0, this.maskFor(this.hiddenAt('end'), fadePx)),
          at(o(ramp), this.maskFor(this.hiddenAt('both'), fadePx)),
          at(o(travel - ramp), this.maskFor(this.hiddenAt('both'), fadePx)),
          at(o(travel), this.maskFor(this.hiddenAt('start'), fadePx)),
          at(o(travel + end), this.maskFor(this.hiddenAt('start'), fadePx)),
          at(o(travel + end + ramp), this.maskFor(this.hiddenAt('both'), fadePx)),
          at(o(2 * travel + end - ramp), this.maskFor(this.hiddenAt('both'), fadePx)),
          at(o(2 * travel + end), this.maskFor(this.hiddenAt('end'), fadePx)),
          at(1, this.maskFor(this.hiddenAt('end'), fadePx)),
        ],
      };
    }
    const distance = this.textWidth + Math.max(0, this.tokenPx(GAP));
    const travel = distance / v;
    const duration = Math.max(1, travel + rest);
    const fade = Math.min(fadePx, distance / 2);
    const ramp = fade / v;
    const o = (ms: number) => Math.min(1, Math.max(0, ms / duration));
    return {
      duration,
      track: [at(0, tx(0)), at(o(travel), tx(distance)), at(1, tx(distance))],
      mask: [
        at(0, this.maskFor(this.hiddenAt('end'), fadePx)),
        at(o(ramp), this.maskFor(this.hiddenAt('both'), fadePx)),
        at(o(travel - ramp), this.maskFor(this.hiddenAt('both'), fadePx)),
        at(o(travel), this.maskFor(this.hiddenAt('end'), fadePx)),
        at(1, this.maskFor(this.hiddenAt('end'), fadePx)),
      ],
    };
  }

  /** MRQ-3: plays the passes after `delay` ms: the start delay for a hover or a focus, the start pause for always. */
  private async start(delay: number) {
    if (this.passes === 0) return;
    this.playing = true;
    await this.updateComplete;
    const track = this.track;
    const viewport = this.viewport;
    if (!track || !viewport || !this.playing || this.run.length) return;
    const { duration, track: frames, mask } = this.keyframes();
    const timing: KeyframeAnimationOptions = { duration, delay, iterations: this.passes, fill: 'backwards' };
    const moving = track.animate(frames, timing);
    const fading = viewport.animate(mask, timing);
    this.run = [moving, fading];
    this.changedMidRun = false;
    moving.finished.then(
      () => this.passesEnded(moving),
      () => undefined,
    );
    this.holdOrGo();
  }

  /** The passes ended: the line rests (MRQ-3), or plays on from the changed values (MRQ-14). */
  private passesEnded(moving: Animation) {
    if (this.run[0] !== moving) return;
    for (const animation of this.run) animation.cancel();
    this.run = [];
    if (this.changedMidRun && this.triggered && !this.fits) {
      this.changedMidRun = false;
      this.playing = false;
      void this.start(0);
      return;
    }
    this.spent = true;
    this.playing = false;
  }

  /** MRQ-14: the run plays out the pass it is in and the next is played from the new values. */
  private fromNextPass() {
    const [moving] = this.run;
    if (!moving) return;
    const done = moving.effect?.getComputedTiming().currentIteration ?? 0;
    this.changedMidRun = true;
    for (const animation of this.run) animation.effect?.updateTiming({ iterations: (done ?? 0) + 1 });
  }

  /** MRQ-9: holds the run where it is, or lets it go on. */
  private holdOrGo() {
    const hold = this.held;
    for (const animation of this.run) {
      if (hold && animation.playState === 'running') animation.pause();
      else if (!hold && animation.playState === 'paused') animation.play();
    }
    if (this.reduced && this.stepTimer !== undefined && hold) this.clearSteps();
  }

  /** MRQ-3: the trigger ended before the passes did — the text returns to its start, and rests. */
  private returnToStart() {
    const track = this.track;
    const viewport = this.viewport;
    if (!track || !viewport || !this.run.length) {
      this.stop();
      return;
    }
    const now = Number.parseFloat(getComputedStyle(track).translate) || 0;
    const mask = getComputedStyle(viewport);
    const from: Keyframe[] = [{ translate: `${now}px 0px` }, { maskSize: mask.maskSize, maskPosition: mask.maskPosition }];
    for (const animation of this.run) animation.cancel();
    this.run = [];
    const sign = this.textDir === 'rtl' ? 1 : -1;
    // A repeat that has passed half its distance returns to where its copy began, which looks as the start does.
    const distance = this.textWidth + Math.max(0, this.tokenPx(GAP));
    const to = this.loopName === 'repeat' && Math.abs(now) > distance / 2 ? sign * distance : 0;
    const timing: KeyframeAnimationOptions = { duration: this.tokenMs('return'), easing: this.tokenEasing('return') };
    const fadePx = Math.max(0, this.tokenPx(FADE));
    const moving = track.animate([from[0], { translate: `${to}px 0px` }], timing);
    const fading = viewport.animate([from[1], this.maskFor(this.hiddenAt('end'), fadePx)], timing);
    this.returning = [moving, fading];
    moving.finished.then(
      () => {
        if (this.returning[0] !== moving) return;
        for (const animation of this.returning) animation.cancel();
        this.returning = [];
        this.playing = false;
      },
      () => undefined,
    );
  }

  /** Rests the line at once: no motion, no views, the cut line (MRQ-2). */
  private stop() {
    for (const animation of [...this.run, ...this.returning]) animation.cancel();
    this.run = [];
    this.returning = [];
    this.changedMidRun = false;
    this.clearSteps();
    if (this.delayTimer !== undefined) clearTimeout(this.delayTimer);
    this.delayTimer = undefined;
    const track = this.track;
    if (track) track.style.translate = '';
    const viewport = this.viewport;
    if (viewport) {
      viewport.style.maskSize = '';
      viewport.style.maskPosition = '';
    }
    this.playing = false;
  }

  // ── Reduced motion (MRQ-8) ─────────────────────────────────────────────────────────────────────

  private clearSteps() {
    if (this.stepTimer !== undefined) clearTimeout(this.stepTimer);
    this.stepTimer = undefined;
  }

  /** The views of the text where motion is reduced: a viewport's width at a time, the last ending at the text's end. */
  private views(): number[] {
    const width = Math.max(1, this.viewWidth);
    const last = Math.max(0, this.textWidth - this.viewWidth);
    const offsets: number[] = [];
    for (let at = width; at < last; at += width) offsets.push(at);
    offsets.push(last);
    return offsets;
  }

  /** MRQ-8: after the start delay, each view at once, resting startPause on each, then back at once; again for each pass. */
  private startViews() {
    if (this.passes === 0) return;
    let pass = 0;
    let index = -1;
    const views = this.views();
    const place = (px: number | null) => {
      const track = this.track;
      const viewport = this.viewport;
      if (!track || !viewport) return;
      const sign = this.textDir === 'rtl' ? 1 : -1;
      const fadePx = Math.max(0, this.tokenPx(FADE));
      if (px === null) {
        track.style.translate = '';
        viewport.style.maskSize = viewport.style.maskPosition = '';
        return;
      }
      track.style.translate = `${sign * px}px 0px`;
      const mask = this.maskFor(this.hiddenAt(px >= this.textWidth - this.viewWidth - SAME ? 'start' : 'both'), fadePx);
      viewport.style.maskSize = String(mask.maskSize);
      viewport.style.maskPosition = String(mask.maskPosition);
    };
    const next = () => {
      this.stepTimer = undefined;
      if (!this.triggered || this.fits || this.held) return;
      index += 1;
      if (index < views.length) {
        this.playing = true;
        void this.updateComplete.then(() => place(views[index]!));
        this.stepTimer = setTimeout(next, this.startRest);
        return;
      }
      // Back to the start at once, the cut line; the next pass, if any, after a rest there.
      pass += 1;
      index = -1;
      place(null);
      this.playing = false;
      if (pass < this.passes) this.stepTimer = setTimeout(next, this.startRest);
      else this.spent = true;
    };
    this.stepTimer = setTimeout(next, this.tokenMs('start-delay'));
  }

  // ── The copy and the control ───────────────────────────────────────────────────────────────────

  /** MRQ-4, MRQ-11: the copy of the text that follows it, hidden from assistive technology and inert. */
  private fillCopy() {
    const copy = this.renderRoot?.querySelector('.copy');
    if (!copy) return;
    copy.replaceChildren(...[...this.childNodes].map((node) => node.cloneNode(true)));
  }

  /** MRQ-10: the person paused or played the motion. */
  private readonly onPlayback = () => {
    this.paused = !this.paused;
    this.dispatchEvent(new CustomEvent<TanreiMarqueeTextPausedChangeDetail>('pausedchange', { detail: { paused: this.paused }, bubbles: true, composed: true }));
  };

  protected override render(): unknown {
    const always = this.triggerName === 'always';
    const control = always && this.playbackControl && !this.fits && !this.reduced;
    const copy = this.playing && this.loopName === 'repeat' && !this.reduced;
    const label = this.paused ? this.words.get('marqueePlayLabel', this.playLabel) : this.words.get('marqueePauseLabel', this.pauseLabel);
    return html`<div part="viewport" class="viewport" dir=${this.textDir} ?data-playing=${this.playing}
        ><div class="track"><span class="text"><slot></slot></span><span class="copy" aria-hidden="true" inert ?hidden=${!copy}></span></div></div
      >${control
        ? html`<tanrei-button part="playback" class="control" variant="text" size="small" label=${label || nothing} @click=${this.onPlayback}
            ><span slot="icon">${this.paused ? 'play_arrow' : 'pause'}</span></tanrei-button
          >`
        : nothing}<span class="timing start-pause" aria-hidden="true"></span><span class="timing end-pause" aria-hidden="true"></span><span
        class="timing start-delay"
        aria-hidden="true"
      ></span><span class="timing pass" aria-hidden="true"></span><span class="timing return" aria-hidden="true"></span><span class="timing medium" aria-hidden="true"></span>${DIRECTION_PROBE}`;
  }
}

if (!customElements.get('tanrei-marquee-text')) customElements.define('tanrei-marquee-text', TanreiMarqueeText);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-marquee-text': TanreiMarqueeText;
  }
}
