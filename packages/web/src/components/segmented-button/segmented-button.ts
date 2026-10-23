import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import {
  AvailabilityController,
  GlyphDrawnController,
  GlyphMirrorController,
  OpenAxesController,
  PressController,
  RovingKeys,
  delegatedAria,
  delegatesAria,
  hostAria,
  markConditionChange,
  namedByProduct,
  notifyItemUpdate,
  parseValues,
  report,
  syncFocusStyle,
} from '../../primitives/index.js';
import { AXES, segmentStyles, setStyles } from './segmented-button.styles.js';
import { TanreiElement } from '../../primitives/element.js';
import { holdsProductName, nameHost } from '../../primitives/delegated-aria.js';

/** One option at a time (a radio group), or each option on and off (toggle buttons). A closed set: anything else is single. */
export type TanreiSegmentedButtonSelection = 'single' | 'multiple';

/** The core sizes (small, medium, large), plus any a design system adds. */
export type TanreiSegmentedButtonSize = 'small' | 'medium' | 'large' | (string & {});

/** What `change` carries: the set's `value` after the change (single), or its `values` (multiple). */
export type TanreiSegmentedButtonChangeDetail = { value: string } | { values: string[] };

/** The set's range of segments (SEG-22): fewer or more still render, and a debug build reports them. */
const RANGE = [2, 5] as const;

/**
 * SEG-16: the glyph of the system's icon set a selected segment draws in its leading position — the spec's name, not a
 * value; the segmented button draws no mark of its own.
 */
const CHECK_GLYPH = 'check';

/** What the set tells each of its segments. */
interface SegmentContext {
  selected: boolean;
  tabStop: boolean;
  position: number;
  size: number;
  multiple: boolean;
  /** Whether the set's size draws a check (its check size is not 0, SEG-16). */
  check: boolean;
}

/** The event a segment fires when a prop the set depends on changes. */
const SEGMENT_UPDATE = 'tanrei-segment-update';

/**
 * One option of a segmented button — the spec's item kind `segment`: a label, an optional icon, and the value
 * that selects it. Placed as a child of `<tanrei-segmented-button>`, as `<option>` in a `<select>`; the set decides
 * whether it is selected and which segment is the Tab stop, and answers its activation.
 *
 * Its native `<button>` carries its semantics: a radio with `aria-checked` in a single-choice set, a toggle button with
 * `aria-pressed` in a multiple-choice one, named by its label whether or not the label is drawn.
 *
 * @tag tanrei-segment
 * @csspart container - The segment's native button: its fill, elevation, corners, every state, the ripple and the focus ring.
 * @csspart icon - The glyph (hidden from assistive technology).
 * @csspart check - The icon set's `check` glyph a selected segment shows before its label (hidden from assistive technology).
 * @csspart label - The segment's text.
 * @csspart divider - The line in the gap before the segment (not drawn before the first; hidden from assistive technology).
 */
export class TanreiSegment extends TanreiElement {
  static override styles = segmentStyles;

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    value: { type: String, reflect: true },
    label: { type: String },
    icon: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    disabled: { type: Boolean, reflect: true },
    context: { state: true },
  };

  /** Identifies the segment: the set's `value` or `values` name it by this, and `change` carries it. Unique within the set; required. */
  value = '';

  /** The segment's text and its accessible name. Required, even when `labelHidden` is true. */
  label = '';

  /** The name of a glyph of the system's icon set. Give every segment of a set an icon, or none. A name the icon set flags is drawn mirrored in right-to-left. */
  icon = '';

  /** Draws the icon alone and keeps `label` as the accessible name (an icon-only segment). */
  labelHidden = false;

  /** Prevents choosing or clearing the segment; the arrow keys skip it and it is never the Tab stop. */
  disabled = false;

  /** What the set says about this segment. */
  private context: SegmentContext = { selected: false, tabStop: false, position: 0, size: 0, multiple: false, check: true };
  /** Whether the set has told it anything yet: the first selection is drawn, not animated. */
  private told = false;
  /** The first frames after it connected, when the set's first word is drawn without motion. */
  private still = true;

  private readonly internals = this.attachInternals();

  /** SEG-9, SEG-10: the segment's pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.button,
    holdCarrier: () => this.renderRoot?.querySelector('.hold') ?? null,
    disabled: () => this.disabled,
  });

  /**
   * SEG-27: the segment's icon is marked when the icon set mirrors its name in right-to-left (src/primitives/glyph-mirror.ts);
   * `iconGlyph()` draws the mark, in the glyph's own box. The check is not named to the controller: it is never mirrored
   * (SEG-16).
   */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.icon' });

  /** SEG-25: the check is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly drawnGlyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.check'));

  constructor() {
    super();
    // SEG-3: a disabled segment swallows every click that reaches it, from its content or dispatched on it.
    this.addEventListener(
      'click',
      (event) => {
        if (this.disabled) {
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
        this.button?.classList.remove('still');
      }),
    );
  }

  private get button(): HTMLButtonElement | null {
    return this.renderRoot?.querySelector<HTMLButtonElement>('.container') ?? null;
  }

  /** @internal The set's side. */
  setSegmentContext(context: SegmentContext) {
    const now = this.context;
    if (this.told && (Object.keys(context) as (keyof SegmentContext)[]).every((key) => context[key] === now[key])) return;
    this.context = context;
    // SEG-24: a selected segment rises above its neighbours.
    this.state('selected', context.selected);
    if (!this.told) this.told = true;
  }

  /** Whether the set draws this segment as selected. */
  get selected(): boolean {
    return this.context.selected;
  }

  /** `element.click()` activates the segment as a person would, through its native button; a disabled one does nothing. */
  override click() {
    if (this.disabled) return;
    const button = this.button;
    if (button) button.click();
    else super.click();
  }

  private state(name: string, on: boolean) {
    try {
      if (on) this.internals.states.add(name);
      else this.internals.states.delete(name);
    } catch {
      // A browser without custom states draws the segment in place; only its stacking differs.
    }
  }

  /** SEG-5, SEG-11: where style queries are missing, the focus style is read when focus arrives; keyboard focus rises above the outline. */
  private readonly onFocus = (event: FocusEvent) => {
    const button = event.currentTarget as HTMLElement;
    syncFocusStyle(this, button);
    this.state('focus-visible', button.matches(':focus-visible'));
  };

  private readonly onBlur = () => {
    this.press.onBlur();
    this.state('focus-visible', false);
  };

  /** SEG-22: the label is drawn unless it is hidden and there is an icon to draw instead. */
  private get drawsLabel(): boolean {
    return !this.labelHidden || !this.icon;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // SEG-16: a change of condition takes the selection motion.
    const before = changed.get('context' as keyof TanreiSegment) as SegmentContext | undefined;
    if (before && this.hasUpdated && before.selected !== this.context.selected) markConditionChange(this.button);
  }

  protected override updated(changed: PropertyValues<this>) {
    const { multiple, position, size } = this.context;
    // SEG-20: in a multiple-choice set (a group of toggle buttons) the host is an item of the set's list, which is how its
    // position is read (a button has none of its own); in a single-choice set the radio carries it.
    hostAria(this, {
      role: multiple ? 'listitem' : null,
      'aria-posinset': multiple && position ? String(position) : null,
      'aria-setsize': multiple && size ? String(size) : null,
    });
    // The set re-reads its segments when a prop it depends on changes (values, disabled, labels, icons); an internal event,
    // kept out of the segment's public API.
    if (this.hasUpdated && [...changed.keys()].some((key) => key !== 'context')) notifyItemUpdate(this, SEGMENT_UPDATE);
  }

  private glyphs(checked: boolean) {
    return html`<span class="glyphs">
      ${this.icon ? html`<span part="icon" class="glyph icon">${this.icon}</span>` : nothing}
      ${checked || this.context.check ? html`<span part="check" class="glyph check"><span class="ink">${CHECK_GLYPH}</span></span>` : nothing}
    </span>`;
  }

  protected override render() {
    const { selected, tabStop, position, size, multiple, check } = this.context;
    const label = this.drawsLabel;
    const iconOnly = !label;
    const hasIcon = !!this.icon;
    // SEG-16: a selected segment whose label is drawn shows the check in place of its icon — unless the size draws none.
    const checked = selected && label && check;
    const classes = classMap({
      root: true,
      container: true,
      selected,
      first: position === 1,
      last: position === size,
      checked,
      still: this.still,
      'lead-open': hasIcon || checked,
      'icon-only': iconOnly,
      'no-icon': !hasIcon,
    });
    return html`
      ${position > 1 ? html`<span part="divider" class="divider" aria-hidden="true"></span>` : nothing}
      <button
        part="container"
        class=${classes}
        type="button"
        data-tanrei-shape
        role=${multiple ? nothing : 'radio'}
        ${delegatedAria(this, { 'aria-checked': !multiple && String(selected), 'aria-pressed': multiple && String(selected), 'aria-label': this.label })}
        aria-posinset=${!multiple && position ? String(position) : nothing}
        aria-setsize=${!multiple && size ? String(size) : nothing}
        tabindex=${tabStop ? '0' : '-1'}
        ?disabled=${this.disabled}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @keydown=${this.press.onKeyDown}
        @keyup=${this.press.onKeyUp}
        @blur=${this.onBlur}
        @focus=${this.onFocus}
      >
        <span class="content">
          <span class="lead" aria-hidden="true"><span class="lead-clip"><span class="lead-item">${this.glyphs(checked)}</span></span></span>
          ${label ? html`<span part="label" class="label">${this.label}</span>` : nothing}
        </span>
        ${label
          ? html`<span class="sizer" aria-hidden="true">${hasIcon || check ? html`<span class="sizer-glyph"></span>` : nothing}<span>${this.label}</span></span>`
          : nothing}
        <span class="hold"></span>
      </button>
    `;
  }
}

/**
 * Lets people choose one option, or several, from two to five related options drawn side by side as the joined
 * segments of one control.
 *
 * Contract: specs/segmented-button.spec.json. `<tanrei-segment>` children are the segments, in order. The selection is
 * the set's: `value` names the selected segment while `selection` is `single` (`null` selects none), and
 * `values` the selected segments while it is `multiple`. The set sets them itself when a segment is activated — by
 * pointer, touch, Enter, Space, or (single) the arrow keys, which select the segment they reach — and then fires
 * `change`, as a native control does.
 *
 * Every visual value comes from `--tanrei-comp-segmented-button-*` tokens: the set's fill, outline, corners and
 * padding, the dividers, per size the segments' height, paddings, gap, label style, icon and check sizes, and per
 * condition (unselected, selected) and state each segment's colors and elevation. How a press is answered and how
 * keyboard focus is drawn are the system's choices of kind (`--tanrei-sys-behavior-*`), read from the cascade.
 *
 * @tag tanrei-segmented-button
 * @slot - `<tanrei-segment>` children: the segments.
 * @csspart set - The row that holds the segments: its fill, corners and outline (`::after`).
 * @fires {CustomEvent<TanreiSegmentedButtonChangeDetail>} change - The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change, which the set already holds.
 */
export class TanreiSegmentedButton extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'segmented-button');
  static override styles = setStyles;

  static override properties: PropertyDeclarations = {
    selection: { type: String, reflect: true },
    value: { type: String },
    values: { attribute: 'values', converter: { fromAttribute: parseValues } },
    size: { type: String, reflect: true },
    label: { type: String },
    check: { state: true },
  };

  /** `single` chooses one option at a time, as a radio group does; `multiple` switches each option on and off. */
  selection: TanreiSegmentedButtonSelection = 'single';

  /** The value of the selected segment while `selection` is single; `null` selects none. The set sets it when a segment is activated. */
  value: string | null = null;

  /** The values of the selected segments while `selection` is multiple. Assign a new array to change it; the set assigns one when a segment is switched. */
  values: string[] = [];

  /** Visual height (32 / 36 / 40 in the default system, Button's heights). The hit area always meets the minimum target. */
  size: TanreiSegmentedButtonSize = 'medium';

  /** The accessible name of the set: the question its options answer ("Range", "Text alignment"). Required. */
  label = '';

  /** Whether the set's size draws a check (its check size is not 0): measured, so a system switch is seen. */
  private check = true;

  /** SEG-8: sizes a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'segmented-button', behavior: 'SEG-8', axes: AXES });

  private readonly keys = new RovingKeys({ wrap: true });
  private readonly children$ = new MutationObserver(() => this.sync());
  private readonly probe$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());
  /** SEG-19: the segment that had focus last, the multiple-choice set's Tab stop while it is enabled. */
  private lastFocused: TanreiSegment | null = null;
  private readonly reported = new Set<string>();

  constructor() {
    super();
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener(SEGMENT_UPDATE, () => this.sync());
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true });
    this.sync();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.probe$?.disconnect();
  }

  /** The set's segments, in order. */
  get segments(): TanreiSegment[] {
    return [...this.children].filter((child): child is TanreiSegment => child instanceof TanreiSegment);
  }

  private get multiple(): boolean {
    return this.selection === 'multiple';
  }

  /**
   * SEG-12: the segments drawn selected — the FIRST segment with the value (single), or with each of the values
   * (multiple). A value naming no segment selects nothing.
   */
  private selectedSegments(): Set<TanreiSegment> {
    const segments = this.segments;
    const chosen = this.multiple ? new Set(this.values ?? []) : this.value === null || this.value === undefined ? new Set<string>() : new Set([this.value]);
    const selected = new Set<TanreiSegment>();
    for (const value of chosen) {
      const segment = segments.find((each) => each.value === value);
      if (segment) selected.add(segment);
    }
    return selected;
  }

  /** The segment an event came from. */
  private segmentOf(event: Event): TanreiSegment | null {
    for (const node of event.composedPath()) {
      if (node === this) return null;
      if (node instanceof TanreiSegment && node.parentElement === this) return node;
    }
    return null;
  }

  /**
   * SEG-1, SEG-2: the activation of `segment`. Single: selects it and fires `change` once, unless it already is the
   * selected one (a single choice is never cleared by its own segment). Multiple: adds its value, or removes it, and
   * fires `change` with the new values. A disabled segment does nothing (SEG-3).
   */
  private activate(segment: TanreiSegment) {
    if (segment.disabled) return;
    const selected = this.selectedSegments().has(segment);
    if (this.multiple) {
      const values = this.values ?? [];
      this.values = selected ? values.filter((each) => each !== segment.value) : [...values, segment.value];
      this.sync();
      this.dispatchEvent(new CustomEvent<TanreiSegmentedButtonChangeDetail>('change', { bubbles: true, detail: { values: [...this.values] } }));
      return;
    }
    if (selected) return;
    this.value = segment.value;
    this.sync();
    this.dispatchEvent(new CustomEvent<TanreiSegmentedButtonChangeDetail>('change', { bubbles: true, detail: { value: segment.value } }));
  }

  /** SEG-1, SEG-2: a segment's activation — its click, from a pointer, Enter, Space or `segment.click()`. */
  private readonly onClick = (event: MouseEvent) => {
    const segment = this.segmentOf(event);
    if (segment) this.activate(segment);
  };

  /**
   * SEG-18, SEG-19: Right and Down Arrow move to the next enabled segment and Left and Up Arrow to the previous one,
   * wrapping (Left and Right mirrored in right-to-left), Home and End to the first and last; with single selection each
   * move also selects the segment it reaches. Disabled segments are skipped (SEG-3).
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const segment = this.segmentOf(event);
    if (!segment) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const keys: Record<string, string> = {
      ArrowRight: rtl ? 'ArrowUp' : 'ArrowDown',
      ArrowLeft: rtl ? 'ArrowDown' : 'ArrowUp',
      ArrowDown: 'ArrowDown',
      ArrowUp: 'ArrowUp',
      Home: 'Home',
      End: 'End',
    };
    const key = keys[event.key];
    if (!key) return;
    const segments = this.segments;
    const target = this.keys.target(
      key,
      segments.indexOf(segment),
      segments.map((each) => ({ focusable: !each.disabled, label: each.label })),
    );
    if (target === null) return;
    event.preventDefault();
    const next = segments[target];
    next.focus();
    if (!this.multiple) this.activate(next);
  };

  /** SEG-19: the multiple-choice set remembers the segment that had focus last. */
  private readonly onFocusIn = (event: FocusEvent) => {
    const segment = this.segmentOf(event);
    if (segment && segment !== this.lastFocused) {
      this.lastFocused = segment;
      if (this.multiple) this.sync();
    }
  };

  /** SEG-16: whether the size draws a check, from its measured check size. */
  private measure() {
    const probe = this.renderRoot?.querySelector<HTMLElement>('.probe');
    if (!probe) return;
    const check = probe.getBoundingClientRect().width > 0;
    if (check !== this.check) this.check = check;
    this.sync();
  }

  /** A debug report, once per problem while it lasts (it is reported again after it went away and came back). */
  private reportOnce(seen: Set<string>, id: string, message: string) {
    seen.add(message);
    if (this.reported.has(message)) return;
    this.reported.add(message);
    report(this, id, message);
  }

  /**
   * Tells every segment what it is now — selected, the Tab stop, its position (SEG-12, SEG-18, SEG-19, SEG-20) — and
   * reports what a debug build should (SEG-12, SEG-22).
   */
  private sync() {
    if (!this.hasUpdated) return;
    const segments = this.segments;
    const selected = this.selectedSegments();
    const multiple = this.multiple;
    const enabled = segments.filter((segment) => !segment.disabled);
    // SEG-18, SEG-19: one Tab stop. Single: the selected segment, or the first enabled one. Multiple: the segment that had
    // focus last, or the first selected one, or the first enabled one. A disabled segment never is.
    const firstSelected = segments.find((segment) => selected.has(segment) && !segment.disabled);
    const last = this.lastFocused && segments.includes(this.lastFocused) && !this.lastFocused.disabled ? this.lastFocused : null;
    const stop = (multiple ? (last ?? firstSelected) : firstSelected) ?? enabled[0] ?? null;
    segments.forEach((segment, index) => {
      segment.setSegmentContext({ selected: selected.has(segment), tabStop: segment === stop, position: index + 1, size: segments.length, multiple, check: this.check });
    });

    const seen = new Set<string>();
    const chosen = multiple ? (this.values ?? []) : this.value === null || this.value === undefined ? [] : [this.value];
    if (segments.length) {
      for (const value of chosen) {
        if (!segments.some((segment) => segment.value === value)) this.reportOnce(seen, 'SEG-12', `the value "${value}" names no segment; nothing is selected for it`);
      }
    }
    const values = segments.map((segment) => segment.value);
    segments.forEach((segment, index) => {
      if (!segment.value) this.reportOnce(seen, 'SEG-12', `segment ${index + 1} ("${segment.label}") has an empty value; give every segment a unique value`);
    });
    for (const repeated of new Set(values.filter((v, i) => v && values.indexOf(v) !== i))) {
      this.reportOnce(seen, 'SEG-12', `the value "${repeated}" is given to more than one segment; the first of them is the one it selects`);
    }
    segments.forEach((segment, index) => {
      if (!segment.label.trim() && !namedByProduct(segment)) this.reportOnce(seen, 'SEG-22', `segment ${index + 1} (value "${segment.value}") has an empty label, so it has no accessible name; give it a label`);
      if (segment.labelHidden && !segment.icon) this.reportOnce(seen, 'SEG-22', `segment ${index + 1} ("${segment.label}") hides its label but has no icon, so its label is drawn anyway; give it an icon`);
    });
    if (!this.label.trim() && !namedByProduct(this)) this.reportOnce(seen, 'SEG-22', 'label is empty, so the set has no accessible name; give it the question its options answer');
    if (segments.length < RANGE[0] || segments.length > RANGE[1]) this.reportOnce(seen, 'SEG-22', `it holds ${segments.length} segments; it is made for ${RANGE[0]} to ${RANGE[1]}`);
    for (const message of this.reported) if (!seen.has(message)) this.reported.delete(message);
  }

  protected override firstUpdated() {
    const probe = this.renderRoot.querySelector('.probe');
    if (probe) this.probe$?.observe(probe);
    this.measure();
  }

  protected override updated() {
    // SEG-20: a radio group (single) or a group (multiple), named by the set's label.
    // SEG-29: the set's label is its whole name over the product's, which names it while the label is empty.
    nameHost(this, this.label);
    hostAria(this, { role: this.multiple ? 'group' : 'radiogroup' });
    this.sync();
  }

  protected override render() {
    // SEG-20: in a multiple-choice set the segments are a list, which gives each toggle button its position.
    return html`<div part="set" class="set" data-tanrei-shape role=${this.multiple ? 'list' : nothing}>
      <span class="probe" aria-hidden="true"></span>
      <slot></slot>
    </div>`;
  }
}

// The product's ARIA on a segment's host is its button's (src/primitives/delegated-aria.ts); its checked or pressed state
// and the disabled state are its own (SEG-20).
delegatesAria(TanreiSegment, { owns: ['aria-checked', 'aria-pressed', 'aria-disabled'], sentence: 'SEG-29' });
if (!customElements.get('tanrei-segment')) customElements.define('tanrei-segment', TanreiSegment);
// SEG-29: the set's host carries its role, and holds the product's name while its label names it.
holdsProductName(TanreiSegmentedButton);
if (!customElements.get('tanrei-segmented-button')) customElements.define('tanrei-segmented-button', TanreiSegmentedButton);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-segmented-button': TanreiSegmentedButton;
    'tanrei-segment': TanreiSegment;
  }
  interface HTMLElementEventMap {
    'tanrei-segment-update': Event;
  }
}
