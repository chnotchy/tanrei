import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { wordPlaces } from '../../generated/words.js';
import {
  AvailabilityController,
  GlyphDrawnController,
  PressController,
  WordsController,
  countWork,
  fillPlaces,
  hostAria,
  notifyItemUpdate,
  placeFaults,
  report,
  reportPlaces,
  syncFocusStyle,
} from '../../primitives/index.js';
import { type StepCondition, stepStyles, stepperStyles } from './stepper.styles.js';
import { TanreiElement } from '../../primitives/element.js';
import { holdsProductName, nameHost, namedByProduct } from '../../primitives/delegated-aria.js';

/** How the steps are laid out (SPR-4, SPR-5, SPR-6). A closed set: anything else is horizontal. */
export type TanreiStepperLayout = 'horizontal' | 'vertical' | 'compact';

/** Which steps the person can press to go to them (SPR-9). A closed set: anything else is none. */
export type TanreiStepperPressable = 'none' | 'visited' | 'all';

/** What the product knows of a step (SPR-1). A closed set: anything else is auto. */
export type TanreiStepperStepStatus = 'auto' | 'incomplete' | 'complete' | 'error';

/** What `select` carries: the value of the step the person pressed. */
export interface TanreiStepperSelectDetail {
  value: string;
}

/** SPR-2: the glyphs of the system's icon set a marker draws in place of its number — the spec's names, not values. */
const GLYPHS: Partial<Record<StepCondition, string>> = { complete: 'check', error: 'priority_high' };

/** What the stepper tells each of its steps. */
interface StepContext {
  condition: StepCondition;
  current: boolean;
  /** SPR-9: a native button that answers a press. */
  pressable: boolean;
  /** SPR-11: a disabled button — a step of a pressable stepper that cannot be gone to now. */
  unavailable: boolean;
  /** Its place in the flow, counted from 1. */
  number: number;
  vertical: boolean;
  last: boolean;
  /** SPR-19: the product's word for its condition, heard after the label; empty for none. */
  statusText: string;
}

/** The parts whose colors a change of condition runs over the state motion (SPR-17). */
const CARRIED = ['.container', '.marker', '.label', '.description'] as const;

/** The first value of a computed list of timing functions: `cubic-bezier(0.2, 0, 0, 1), ease` → its first. */
const firstOf = (list: string) => list.match(/^\s*[^,(]+(\([^)]*\))?/)?.[0].trim() || 'ease';

/** The event a step fires when a prop the stepper depends on changes. */
const STEP_UPDATE = 'tanrei-stepper-step-update';

/**
 * One step of a stepper — the spec's item kind `step`: its value, its label, an optional description, its status and
 * whether it can be gone to. Placed as a child of `<tanrei-stepper>`, as `<option>` in a `<select>`; the stepper decides
 * its condition, its number and whether it can be pressed.
 *
 * The host is an item of the stepper's list (`role="listitem"`), with `aria-current="step"` while it is the current
 * step. While it can be pressed its parts are drawn in a native `<button>`; otherwise in a `<div>`.
 *
 * @tag tanrei-stepper-step
 * @csspart container - The step's button, or its box while it cannot be pressed: its fill, corners, every state, the ripple and the focus ring.
 * @csspart marker - The circle with the step's number, or the check or priority_high glyph (hidden from assistive technology).
 * @csspart label - The step's label.
 * @csspart description - The step's description, where it has one.
 * @csspart connector - The line to the next step's marker (not drawn after the last; hidden from assistive technology).
 */
export class TanreiStepperStep extends TanreiElement {
  static override styles = stepStyles;

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    value: { type: String, reflect: true },
    label: { type: String },
    description: { type: String },
    status: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    context: { state: true },
  };

  /** Identifies the step: the stepper's `value` names the current step by it, and `select` carries it. Unique; required. */
  value = '';

  /** The step's name, in a few words ("Shipping"). Required. */
  label = '';

  /** A short second line under the label ("Optional"). Empty draws none. */
  description = '';

  /** `auto` (complete before the current step, incomplete after it), `incomplete`, `complete` or `error`. */
  status: TanreiStepperStepStatus = 'auto';

  /** The step cannot be gone to now. Only meaningful while the stepper's `pressable` is not `none`; ignored on the current step. */
  disabled = false;

  private context: StepContext = { condition: 'incomplete', current: false, pressable: false, unavailable: false, number: 0, vertical: false, last: true, statusText: '' };
  /** The first frames after it connected, when the stepper's first word is drawn without motion. */
  private still = true;

  /** SPR-14, SPR-15: the step's pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.button,
    holdCarrier: () => this.renderRoot?.querySelector('.hold') ?? null,
    disabled: () => !this.context.pressable,
  });

  /** SPR-27: a marker's glyph is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly drawnGlyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.glyph'));

  constructor() {
    super();
    // SPR-9, SPR-11: a step that cannot be pressed swallows every click that reaches it, from its content or dispatched on it.
    this.addEventListener(
      'click',
      (event) => {
        if (!this.context.pressable) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }

  override connectedCallback() {
    super.connectedCallback();
    this.still = true;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.still = false;
        this.renderRoot?.querySelector('.container')?.classList.remove('still');
      }),
    );
  }

  private get button(): HTMLButtonElement | null {
    return this.renderRoot?.querySelector<HTMLButtonElement>('button.container') ?? null;
  }

  /** @internal The stepper's side. */
  setStepContext(context: StepContext) {
    const now = this.context;
    if ((Object.keys(context) as (keyof StepContext)[]).every((key) => context[key] === now[key])) return;
    this.context = context;
  }

  /** The condition the stepper draws this step in (SPR-1). */
  get condition(): StepCondition {
    return this.context.condition;
  }

  /** Whether the person can press this step now (SPR-9). */
  get pressable(): boolean {
    return this.context.pressable;
  }

  /** `element.click()` presses the step as a person would, through its native button; a step that cannot be pressed does nothing. */
  override click() {
    if (!this.context.pressable) return;
    const button = this.button;
    if (button) button.click();
  }

  /** SPR-13, SPR-16: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocus = (event: FocusEvent) => syncFocusStyle(this, event.currentTarget as HTMLElement);

  /**
   * SPR-17: what the parts looked like before the step's container changed element (a button became a plain box when
   * the step became current, or the other way round). The new element has no old colors to run a transition from, so
   * the old ones are carried over and run out over the same motion.
   */
  private carried: Map<string, Keyframe> | null = null;

  protected override willUpdate(changed: PropertyValues<this>) {
    const before = changed.get('context' as keyof TanreiStepperStep) as StepContext | undefined;
    const button = (context: StepContext) => context.pressable || context.unavailable;
    if (!before || !this.hasUpdated || this.still || button(before) === button(this.context)) return;
    this.carried = new Map();
    for (const selector of CARRIED) {
      const element = this.renderRoot.querySelector(selector);
      if (!element) continue;
      const style = getComputedStyle(element);
      this.carried.set(selector, { backgroundColor: style.backgroundColor, borderColor: style.borderTopColor, color: style.color });
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    const carried = this.carried;
    this.carried = null;
    for (const [selector, from] of carried ?? []) {
      const element = this.renderRoot.querySelector(selector);
      if (!element) continue;
      const style = getComputedStyle(element);
      const duration = Number.parseFloat(style.transitionDuration) * 1000;
      if (!(duration > 0)) continue;
      element.animate([from, { backgroundColor: style.backgroundColor, borderColor: style.borderTopColor, color: style.color }], { duration, easing: firstOf(style.transitionTimingFunction) });
    }
    // SPR-19: an item of the stepper's list; the current step is the flow's current step.
    hostAria(this, { role: 'listitem', 'aria-current': this.context.current ? 'step' : null });
    // The stepper re-reads its steps when a prop it depends on changes; an internal event, kept out of the step's API.
    if (this.hasUpdated && [...changed.keys()].some((key) => key !== 'context')) notifyItemUpdate(this, STEP_UPDATE);
  }

  private marker() {
    const { condition, number } = this.context;
    const glyph = GLYPHS[condition];
    return html`<span class="marker-cell" aria-hidden="true"
      ><span part="marker" class="marker" data-tanrei-shape
        >${glyph ? html`<span class="glyph"><span class="ink">${glyph}</span></span>` : html`<span class="number">${number || ''}</span>`}</span
      ></span
    >`;
  }

  private content() {
    const { statusText } = this.context;
    return html`${this.marker()}<span class="text"
        ><span part="label" class="label">${this.label}</span>${statusText ? html`<span class="status"> ${statusText}</span>` : nothing}${this.description
          ? html`<span part="description" class="description">${this.description}</span>`
          : nothing}</span
      ><span class="hold"></span>`;
  }

  protected override render() {
    const { condition, pressable, unavailable, vertical, last } = this.context;
    const classes = classMap({ container: true, root: true, [condition]: condition !== 'incomplete', still: this.still });
    const container =
      pressable || unavailable
        ? html`<button
            part="container"
            class=${classes}
            type="button"
            data-tanrei-shape
            ?disabled=${unavailable}
            @pointerdown=${this.press.onPointerDown}
            @pointerup=${this.press.release}
            @pointercancel=${this.press.release}
            @pointerleave=${this.press.release}
            @keydown=${this.press.onKeyDown}
            @keyup=${this.press.onKeyUp}
            @blur=${this.press.onBlur}
            @focus=${this.onFocus}
          >
            ${this.content()}
          </button>`
        : html`<div part="container" class=${classes} data-tanrei-shape>${this.content()}</div>`;
    return html`<div class=${classMap({ step: true, horizontal: !vertical, vertical })}>
      ${container}${last ? nothing : html`<span part="connector" class=${classMap({ connector: true, complete: condition === 'complete' })} aria-hidden="true"></span>`}
    </div>`;
  }
}

/**
 * Shows where a person is in a flow the product runs in a fixed order of steps — which step is current, which are
 * complete, which has an error and which are still to come — and, where the product allows it, lets the person press a
 * step to go back to it.
 *
 * Contract: specs/stepper.spec.json. `<tanrei-stepper-step>` children are the steps, in order. `value` names the current
 * step; the stepper never sets it: pressing a step fires `select` with the step's value, and the product goes there
 * (or does not) and sets `value`.
 *
 * Every visual value comes from `--tanrei-comp-stepper-*` tokens: the marker, the container, the label and
 * description styles, the connector, the compact form's bar and position, and per condition (incomplete, current,
 * complete, error) and state each step's colors. How a press is answered and how keyboard focus is drawn are the
 * system's choices of kind (`--tanrei-sys-behavior-*`), read from the cascade.
 *
 * @tag tanrei-stepper
 * @slot - `<tanrei-stepper-step>` children: the steps.
 * @csspart steps - The row or column of the steps (not displayed in the compact form, where the steps are in no slot).
 * @csspart compact - The compact form: the bar, the position and the current step's label.
 * @csspart bar - The compact form's row of segments (hidden from assistive technology).
 * @csspart position - The compact form's position ("Step 2 of 5").
 * @fires {CustomEvent<TanreiStepperSelectDetail>} select - The person pressed a step to go to it: `detail.value` is its value. The stepper does not change `value`.
 */
export class TanreiStepper extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'stepper');
  static override styles = stepperStyles;

  static override properties: PropertyDeclarations = {
    label: { type: String },
    value: { type: String },
    layout: { type: String, reflect: true },
    pressable: { type: String, reflect: true },
    completedText: { type: String, attribute: 'completed-text' },
    errorText: { type: String, attribute: 'error-text' },
    positionText: { type: String, attribute: 'position-text' },
    narrow: { state: true },
  };

  /** The accessible name of the stepper ("Checkout progress"). Not drawn. Required. */
  label = '';

  /** The value of the current step. Empty, or a value no step has, makes no step current. Never set by the stepper. */
  value = '';

  /** `horizontal` (compact where it is too narrow for every step), `vertical`, or `compact`. */
  layout: TanreiStepperLayout = 'horizontal';

  /** `none`, `visited` (each complete or error step that is not current) or `all` (every step that is not current). */
  pressable: TanreiStepperPressable = 'none';

  /** The word assistive technology hears after a complete step's label ("Completed"). Empty reads the product's words. */
  completedText = '';

  /** The word assistive technology hears after the label of a step with an error ("Has an error"). Empty reads the product's words. */
  errorText = '';

  /** The compact form's position, with the places {position} and {count} ("Step {position} of {count}"). Empty reads the product's words. */
  positionText = '';

  /** SPR-6: whether the width given is less than the steps' least widths (measured). */
  private narrow = false;

  private readonly words = new WordsController(this);
  private readonly children$ = new MutationObserver(() => this.requestUpdate());
  private readonly size$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());
  private readonly reported = new Set<string>();

  /** SPR-27: the compact form's glyph is drawn only while the icon set can draw it. */
  private readonly drawnGlyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.glyph'));

  constructor() {
    super();
    this.addEventListener('click', this.onClick);
    this.addEventListener(STEP_UPDATE, () => this.requestUpdate());
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true });
    this.size$?.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.size$?.disconnect();
  }

  /** The stepper's steps, in order. */
  get steps(): TanreiStepperStep[] {
    return [...this.children].filter((child): child is TanreiStepperStep => child instanceof TanreiStepperStep);
  }

  private get layoutName(): TanreiStepperLayout {
    return this.layout === 'vertical' || this.layout === 'compact' ? this.layout : 'horizontal';
  }

  private get pressableName(): TanreiStepperPressable {
    return this.pressable === 'visited' || this.pressable === 'all' ? this.pressable : 'none';
  }

  /** SPR-6: the compact form is drawn — asked for, or horizontal without the room for every step. */
  private get compact(): boolean {
    const layout = this.layoutName;
    return layout === 'compact' || (layout === 'horizontal' && this.narrow);
  }

  /** SPR-1, SPR-21: the index of the current step — the first with the value — or -1. */
  private currentIndex(steps: TanreiStepperStep[]): number {
    return this.value ? steps.findIndex((step) => step.value === this.value) : -1;
  }

  /** SPR-1: the condition of the step at `index`. */
  private conditionOf(step: TanreiStepperStep, index: number, current: number): StepCondition {
    const status = step.status;
    if (status === 'error') return 'error';
    if (index === current) return 'current';
    if (status === 'complete' || status === 'incomplete') return status;
    return current >= 0 && index < current ? 'complete' : 'incomplete';
  }

  /** SPR-6: the least width of every step, against the width given. */
  private measure() {
    const probe = this.renderRoot?.querySelector<HTMLElement>('.probe');
    if (!probe) return;
    const least = probe.getBoundingClientRect().width * this.steps.length;
    const narrow = this.getBoundingClientRect().width < least;
    if (narrow !== this.narrow) this.narrow = narrow;
  }

  /** SPR-10: a press on a pressable step — its click, from a pointer, Enter, Space or `step.click()` — fires select once. */
  private readonly onClick = (event: MouseEvent) => {
    for (const node of event.composedPath()) {
      if (node === this) return;
      if (node instanceof TanreiStepperStep && node.parentElement === this) {
        if (!node.pressable) return;
        this.dispatchEvent(new CustomEvent<TanreiStepperSelectDetail>('select', { bubbles: true, composed: true, detail: { value: node.value } }));
        return;
      }
    }
  };

  /** The current locale: the nearest `lang`, else the browser's. */
  private locale(): string | undefined {
    const lang = this.closest('[lang]')?.getAttribute('lang') || (typeof navigator !== 'undefined' ? navigator.language : '');
    try {
      return Intl.getCanonicalLocales(lang)[0];
    } catch {
      return undefined;
    }
  }

  /** A debug report, once per problem while it lasts (it is reported again after it went away and came back). */
  private reportOnce(seen: Set<string>, id: string, message: string) {
    seen.add(message);
    if (this.reported.has(message)) return;
    this.reported.add(message);
    report(this, id, message);
  }

  /** SPR-20: the product's word for a condition, recorded as missing where a drawn step needs it and nobody gave it. */
  private statusWord(condition: StepCondition): string {
    if (condition === 'complete') {
      const word = this.words.get('stepCompletedText', this.completedText);
      if (!word) this.words.missing('stepCompletedText', { prop: 'completedText', id: 'SPR-20', effect: 'a complete step is read as its label alone' });
      return word;
    }
    if (condition === 'error') {
      const word = this.words.get('stepErrorText', this.errorText);
      if (!word) this.words.missing('stepErrorText', { prop: 'errorText', id: 'SPR-20', effect: 'a step with an error is read as its label alone' });
      return word;
    }
    return '';
  }

  /** SPR-6, SPR-7: the position, its places filled; empty where there is no sentence. */
  private position(at: number, count: number): string {
    const sentence = this.words.get('stepPositionText', this.positionText).trim();
    if (!sentence) {
      this.words.missing('stepPositionText', { prop: 'positionText', id: 'SPR-20', effect: 'the compact form draws no position' });
      return '';
    }
    const declared = wordPlaces.stepPositionText ?? [];
    reportPlaces(this, 'SPR-7', 'positionText', sentence, declared, 'it is drawn as it is written');
    const seen = new Set<string>();
    for (const name of placeFaults(sentence, declared).absent) {
      this.reportOnce(seen, 'SPR-7', `position-text has no place {${name}}, so it does not say where the person is; write it as "Step {position} of {count}"`);
    }
    const format = new Intl.NumberFormat(this.locale(), { useGrouping: false, maximumFractionDigits: 0 });
    return fillPlaces(sentence, { position: format.format(at), count: format.format(count) })
      .runs.map((run) => run.text)
      .join('');
  }

  /** Tells every step what it is now (SPR-1, SPR-9, SPR-11, SPR-19), and reports what a debug build should (SPR-11, SPR-21). */
  private sync(steps: TanreiStepperStep[], compact: boolean) {
    countWork('stepper.sync');
    const current = this.currentIndex(steps);
    const mode = this.pressableName;
    const vertical = this.layoutName === 'vertical';
    steps.forEach((step, index) => {
      const condition = this.conditionOf(step, index, current);
      const isCurrent = index === current;
      const eligible = mode === 'all' || (mode === 'visited' && (condition === 'complete' || condition === 'error'));
      const unavailable = !compact && !isCurrent && mode !== 'none' && step.disabled;
      step.setStepContext({
        condition,
        current: isCurrent,
        pressable: !compact && !isCurrent && !step.disabled && eligible,
        unavailable,
        number: index + 1,
        vertical,
        last: index === steps.length - 1,
        statusText: compact ? '' : this.statusWord(condition),
      });
    });

    const seen = new Set<string>();
    if (!this.label.trim() && !namedByProduct(this)) this.reportOnce(seen, 'SPR-21', 'label is empty, so the stepper has no accessible name; give it one ("Checkout progress")');
    if (steps.length < 2) this.reportOnce(seen, 'SPR-21', `it holds ${steps.length} step${steps.length === 1 ? '' : 's'}; a stepper is made for two or more`);
    if (this.value && current < 0 && steps.length) this.reportOnce(seen, 'SPR-21', `the value "${this.value}" names no step; no step is current`);
    // The values given more than once, in the order of their second step: one pass, as every other read of the steps here.
    const values = new Set<string>();
    const repeats = new Set<string>();
    steps.forEach((step, index) => {
      if (!step.value) this.reportOnce(seen, 'SPR-21', `step ${index + 1} ("${step.label}") has an empty value; give every step a unique value`);
      if (!step.label.trim()) this.reportOnce(seen, 'SPR-21', `step ${index + 1} (value "${step.value}") has an empty label; give it one`);
      if (step.value && values.has(step.value)) repeats.add(step.value);
      values.add(step.value);
    });
    for (const repeated of repeats) {
      this.reportOnce(seen, 'SPR-21', `the value "${repeated}" is given to more than one step; the first of them is the one it names`);
    }
    if (current >= 0 && steps[current].disabled) this.reportOnce(seen, 'SPR-11', `the current step ("${steps[current].label}") is disabled; it is drawn current`);
    for (const message of this.reported) if (!seen.has(message)) this.reported.delete(message);
  }

  protected override firstUpdated() {
    this.measure();
  }

  protected override updated() {
    const compact = this.compact;
    // SPR-19: a list of its steps, or, in the compact form, one group that reads what is drawn — named by label.
    // SPR-28: its label is its whole name over the product's, which names it while the label is empty.
    nameHost(this, this.label);
    hostAria(this, { role: compact ? 'group' : 'list' });
    this.sync(this.steps, compact);
    // SPR-6: a step added or removed changes the least width.
    this.measure();
  }

  private compactForm(steps: TanreiStepperStep[]) {
    const current = this.currentIndex(steps);
    const step = current >= 0 ? steps[current] : null;
    const error = step?.status === 'error';
    const errorWord = error ? this.statusWord('error') : '';
    const position = step ? this.position(current + 1, steps.length) : '';
    return html`<div part="compact" class="compact">
      <div part="bar" class="bar" aria-hidden="true">
        ${steps.map((_, index) => html`<span class=${classMap({ segment: true, filled: current >= 0 && index <= current })} data-tanrei-shape></span>`)}
      </div>
      ${position ? html`<div part="position" class="position">${position}</div>` : nothing}
      ${step
        ? html`<div class=${classMap({ current: true, error })}>
            ${error ? html`<span class="glyph-line" aria-hidden="true"><span class="glyph"><span class="ink">priority_high</span></span></span>` : nothing}<span class="label"
              >${step.label}${errorWord ? html`<span class="status"> ${errorWord}</span>` : nothing}</span
            >
          </div>`
        : nothing}
    </div>`;
  }

  protected override render() {
    const steps = this.steps;
    const compact = this.compact;
    const layout = this.layoutName;
    return html`<span class="probe-box" aria-hidden="true"><span class="probe"></span></span>
      <div part="steps" class=${classMap({ steps: true, horizontal: layout !== 'vertical', vertical: layout === 'vertical' })} ?hidden=${compact}>${compact ? nothing : html`<slot></slot>`}</div>
      ${compact ? this.compactForm(steps) : nothing}`;
  }
}

if (!customElements.get('tanrei-stepper-step')) customElements.define('tanrei-stepper-step', TanreiStepperStep);
// SPR-28: the host carries the role, and holds the product's name while its label names it.
holdsProductName(TanreiStepper);
if (!customElements.get('tanrei-stepper')) customElements.define('tanrei-stepper', TanreiStepper);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-stepper': TanreiStepper;
    'tanrei-stepper-step': TanreiStepperStep;
  }
  interface HTMLElementEventMap {
    'tanrei-stepper-step-update': Event;
  }
}
