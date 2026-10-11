import { LitElement, type PropertyDeclarations, type PropertyValues, html, svg } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { AvailabilityController, OpenAxesController, VisibilityController, hostAria, report } from '../../primitives/index.js';
import type { TanreiLoadingIndicatorSizeRegistry } from '../../registry.js';
import { AXES, styles } from './loading-indicator.styles.js';

/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiLoadingIndicatorSize = keyof TanreiLoadingIndicatorSizeRegistry;
/** How the indicator enters once its show delay has passed; auto is `comp.loading-indicator.motion.entrance`. */
export type TanreiLoadingIndicatorEntrance = 'auto' | 'fade' | 'grow';

/** The kinds of `comp.loading-indicator.motion.entrance`. The first is the default, and what an unknown name falls back to. */
const ENTRANCES = ['fade', 'grow'] as const;
type Entrance = (typeof ENTRANCES)[number];
const ENTRANCE_TOKEN = '--tanrei-comp-loading-indicator-motion-entrance';

/** LDG-14: an attribute that is empty or does not parse as a finite number is not a number (and is reported). */
const milliseconds = {
  fromAttribute: (value: string | null) => (value === null ? null : value.trim() === '' ? Number.NaN : Number(value)),
};
const usable = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** What one insertion runs with (LDG-16): resolved as it is inserted, kept until it is removed. */
interface Run {
  delay: number;
  duration: number;
  easing: string;
  entrance: Entrance;
}

/**
 * Shows that a short wait of unknown length is under way, inline or over content.
 *
 * Contract: specs/loading-indicator.spec.json. A quarter arc that turns once per cycle, with no track; `contained` draws
 * it on a raised circle of its own, for waits over content. Every visual value is a `--tanrei-comp-loading-indicator-*`
 * token. When the length of the wait can be measured, use `<tanrei-progress-indicator>` instead.
 *
 * Insert it when the wait starts and remove it when the wait ends. From its insertion it waits `showDelay` (null takes
 * `motion.show-delay`) with its box kept, drawing nothing and exposing nothing (`aria-hidden="true"`); then it enters
 * (`entrance`: fade, or grow from its center, over `enterDuration`) and the arc starts turning. Moving it within the
 * document starts a new delay; hiding it (`hidden`, CSS, scrolling) neither restarts nor pauses it. A change of
 * `showDelay`, `entrance` or `enterDuration` applies from the next insertion.
 *
 * Once shown, the host is a progressbar with no value (`role="progressbar"`, `aria-label` from `label`,
 * `aria-busy="true"`). It is never focusable and never announces itself: mark the region being loaded `aria-busy` and
 * announce its arrival in the product. Under `prefers-reduced-motion: reduce` the arc stops turning and the whole circle
 * pulses, and grow enters as a fade; the delay is kept. Off screen, the turning is paused (the entrance is not).
 *
 * @tag tanrei-loading-indicator
 * @csspart container - The raised circle behind the indicator (filled only when contained).
 * @csspart indicator - The turning arc.
 */
export class TanreiLoadingIndicator extends LitElement {
  private readonly availability = new AvailabilityController(this, 'loading-indicator');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    size: { type: String, reflect: true },
    contained: { type: Boolean, reflect: true },
    label: { type: String },
    showDelay: { attribute: 'show-delay', converter: milliseconds },
    entrance: { type: String },
    enterDuration: { attribute: 'enter-duration', converter: milliseconds },
  };

  /** The indicator's box (16 / 24 / 40 in the default system): small in a control, medium next to text, large in an empty section. */
  size: TanreiLoadingIndicatorSize = 'medium';

  /** Draws the indicator on a raised container of its own, for places where it floats over content. */
  contained = false;

  /** The accessible name: what is loading ("Loading messages"). Required. */
  label = '';

  /**
   * How long, in milliseconds, it waits from its insertion before it is drawn and exposed; 0 shows it as it is inserted.
   * Null takes `motion.show-delay`, as does a negative or non-finite value (reported).
   */
  showDelay: number | null = null;

  /** How it enters once shown: fade, or grow from its center. Auto takes `motion.entrance`. */
  entrance: TanreiLoadingIndicatorEntrance = 'auto';

  /**
   * How long, in milliseconds, its entrance lasts; 0 shows it whole at once. Null takes `motion.enter-duration`, as does
   * a negative or non-finite value (reported).
   */
  enterDuration: number | null = null;

  /** LDG-9: sizes a design system adds, and a size the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'loading-indicator', behavior: 'LDG-9', axes: AXES });

  /** LDG-7: the arc turns only while it can be seen. */
  private readonly visibility = new VisibilityController(this);

  /** LDG-11, LDG-12: false during the show delay. */
  private shown = false;
  private run: Run | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private entering = false;
  private entry: Animation | null = null;

  override connectedCallback() {
    super.connectedCallback();
    // LDG-16: every insertion waits its whole delay, with the values of that moment.
    clearTimeout(this.timer);
    this.cancelEntrance();
    this.shown = false;
    this.requestUpdate();
    this.run = this.resolve();
    if (this.run.delay === 0) this.show();
    else {
      this.expose();
      // LDG-15: a wait, not motion — kept under reduced motion, and counted while the indicator cannot be seen.
      this.timer = setTimeout(() => this.show(), this.run.delay);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // LDG-16: removed during the delay, it has shown nothing; removed while shown, it is gone at once.
    clearTimeout(this.timer);
    this.timer = undefined;
    this.cancelEntrance();
    this.shown = false;
  }

  /** LDG-14: the delay, the entrance's duration, curve and kind, from the props or else from the tokens as they resolve now. */
  private resolve(): Run {
    // A duration token is an expression: it is computed through real properties, never parsed.
    const probe = document.createElement('span');
    probe.className = 'timing';
    this.renderRoot.appendChild(probe);
    const style = getComputedStyle(probe);
    const ms = (value: string) => (Number.parseFloat(value) || 0) * 1000;
    const token = { delay: ms(style.transitionDelay), duration: ms(style.transitionDuration), easing: style.transitionTimingFunction };
    probe.remove();
    const named = (ENTRANCES as readonly string[]).includes(this.entrance) ? (this.entrance as Entrance) : null;
    // The system's choice of kind arrives as its name; an unknown name is the first kind.
    const system = getComputedStyle(this).getPropertyValue(ENTRANCE_TOKEN).trim() as Entrance;
    return {
      delay: usable(this.showDelay) ? this.showDelay : token.delay,
      duration: usable(this.enterDuration) ? this.enterDuration : token.duration,
      easing: token.easing,
      entrance: named ?? (ENTRANCES.includes(system) ? system : ENTRANCES[0]),
    };
  }

  /** LDG-12: shown — exposed, entering, and the cycle starting from its beginning. */
  private show() {
    this.timer = undefined;
    this.shown = true;
    this.entering = true;
    this.expose();
    this.requestUpdate();
  }

  /** LDG-5, LDG-11: a busy progressbar with no value once shown; absent from the accessibility tree while it waits. */
  private expose() {
    // LDG-6: not focusable, not a live region.
    if (this.shown) hostAria(this, { role: 'progressbar', 'aria-label': this.label || null, 'aria-busy': 'true', 'aria-hidden': null });
    else hostAria(this, { role: null, 'aria-label': null, 'aria-busy': null, 'aria-hidden': 'true' });
  }

  /**
   * LDG-13: fade eases the opacity of the whole component from 0 to 1; grow does so while scaling it from nothing about its
   * center. Drawn only — the box keeps its size — and it runs to its end whether or not the indicator is seen.
   */
  private enter(container: HTMLElement) {
    const run = this.run;
    if (!run || run.duration <= 0) return;
    // Reduced motion: nothing moves, so grow enters as fade.
    const grow = run.entrance === 'grow' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const keyframes: Keyframe[] = grow ? [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 0 }, { opacity: 1 }];
    this.entry = container.animate(keyframes, { duration: run.duration, easing: run.easing, fill: 'backwards' });
    this.entry.id = grow ? 'enter-grow' : 'enter-fade';
  }

  private cancelEntrance() {
    this.entering = false;
    this.entry?.cancel();
    this.entry = null;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // LDG-10: a moving mark alone is not a name.
    if (changed.has('label') && !this.label) report(this, 'LDG-10', 'label is empty, so the loading indicator has no accessible name; give it a label');
    // LDG-14: a value it cannot use takes the token, and is reported.
    for (const [name, attribute, token] of [['showDelay', 'show-delay', 'show-delay'], ['enterDuration', 'enter-duration', 'enter-duration']] as const) {
      const value = this[name];
      if (!changed.has(name) || value === null || value === undefined || usable(value)) continue;
      const written = this.getAttribute(attribute);
      const shown = Number.isNaN(value) && written !== null ? `"${written}"` : String(value);
      report(this, 'LDG-14', `${name} ${shown} is not a finite, non-negative number of milliseconds; it takes comp.loading-indicator.motion.${token}`);
    }
    if (changed.has('entrance') && this.entrance !== 'auto' && !(ENTRANCES as readonly string[]).includes(this.entrance)) {
      report(this, 'LDG-14', `entrance "${this.entrance}" is not auto, fade or grow; it takes comp.loading-indicator.motion.entrance`);
    }
    if (this.isConnected) this.expose();
  }

  protected override updated() {
    if (!this.entering) return;
    this.entering = false;
    const container = this.renderRoot.querySelector<HTMLElement>('.container');
    if (container) this.enter(container);
  }

  protected override render() {
    // LDG-11: while it waits, its box is kept and nothing is drawn or run.
    return html`
      <div part="container" class=${classMap({ container: true, waiting: !this.shown })} data-tanrei-shape>
        <div part="indicator" class=${classMap({ indicator: true, paused: !this.visibility.visible })}>
          <svg aria-hidden="true" focusable="false">${svg`<circle></circle>`}</svg>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('tanrei-loading-indicator')) customElements.define('tanrei-loading-indicator', TanreiLoadingIndicator);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-loading-indicator': TanreiLoadingIndicator;
  }
}
