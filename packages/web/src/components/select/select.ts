import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import {
  AvailabilityController,
  DismissController,
  type DismissReason,
  FieldControlController,
  type FieldSays,
  GlyphDrawnController,
  GlyphMirrorController,
  OpenAxesController,
  SEPARATION_VALUES,
  type SeparationProp,
  SystemWatchController,
  keepOverlayFocusAfterPress,
  registerOverlay,
  report,
  slottedInteractive,
  syncFocusStyle,
} from '../../primitives/index.js';
import { FormSays } from '../../primitives/form-says.js';
import { missingValueMessage } from '../../primitives/missing-value.js';
import { FloatingLabelController, floatingAsterisk, floatingLabel, triggerEdges } from '../../primitives/field-trigger.js';
import {
  OPTION_GLYPHS,
  OPTION_GROUP_TAG,
  OPTION_MIRRORED,
  OPTION_TAG,
  type OptionData,
  type OptionModel,
  OptionListController,
  OptionsController,
  anchoredOptionList,
} from '../../primitives/option-list.js';
import type { TanreiInputBoxSizeRegistry, TanreiInputBoxVariantRegistry } from '../../registry.js';
import { ownDirection } from '../../styles/product-text.js';
import '../option/option.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { AXES, INSET, styles } from './select.styles.js';
import { FocusedStop, disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The three looks of the input box (`comp.input-box`): a filled box whose label is the row of the Field that frames it (`stacked`), or the label floating inside a `filled` or `outlined` box. A design system may leave some out or add values. */
export type TanreiSelectVariant = keyof TanreiInputBoxVariantRegistry;
/** The container's minimum height: `medium` and `large` are the sizes every input box has, `small` is for a header, a toolbar or a dense row. A design system may add values. */
export type TanreiSelectSize = keyof TanreiInputBoxSizeRegistry;
/** How a group of options is told from what is next to it: the design system's answer (auto), a line, or empty space. */
export type TanreiSelectSeparation = SeparationProp;
/** Why the list closed (SEL-27). The web has no back of its own, so it never sends `back`. */
export type TanreiSelectToggleReason = 'select' | 'escape' | 'back' | 'outside' | 'focus-out' | 'anchor-hidden' | 'press' | 'tab';
/** `toggle`'s detail: the new `open`, and for a close its reason. */
export interface TanreiSelectToggleDetail {
  open: boolean;
  reason?: TanreiSelectToggleReason;
}

type Layout = 'stacked' | 'filled' | 'outlined';

/** Runs `task` once the document has been read: an element upgraded while its children are still being parsed has none yet. */
function whenParsed(task: () => void) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', task, { once: true });
  else task();
}

/** What left the element with the frame: each is an attribute of `<tanrei-select-field>`, or of the Field that frames a select. */
const LEFT_ATTRIBUTES = ['supporting-text', 'error-text', 'required', 'optional', 'required-mark', 'required-text', 'optional-text'] as const;

/**
 * Lets people choose one value from a closed list: a trigger that looks and measures like a text input's box and
 * shows the chosen option, and a list of options, optionally grouped, that opens from it. The bare control: it draws
 * no label row, no requirement mark, no help and no error text.
 *
 * Contract: specs/select.spec.json. The options are `<tanrei-option>` children, optionally in
 * `<tanrei-option-group>` elements (the pair a combobox holds too); the select reads them — and reads them again when
 * they change — and renders the rows itself. Every visual value is a token: the trigger is drawn from
 * `--tanrei-comp-input-box-*`, the one set every input box is drawn from (SEL-65), and the list from
 * `--tanrei-comp-select-*`, which hold the menu's values in every shipped design system.
 *
 * ```html
 * <tanrei-select size="small" label="Theme" value="auto">
 *   <tanrei-option value="auto">Follow the device</tanrei-option>
 *   <tanrei-option value="light">Light</tanrei-option>
 * </tanrei-select>
 * ```
 *
 * Alone it is for a place where its label stands elsewhere or is plain from where it stands — a theme or a language
 * in a bar, a toolbar, a column of a table — and `label` names it for assistive technology; a filled or an outlined
 * select also draws that name, floating in its box. In a form it stands in a `<tanrei-field>`, which names it,
 * describes it and marks it: that pair as one element is `<tanrei-select-field>`. The select says to its Field what
 * only it knows (`src/primitives/field.ts`): that it draws the label while its look floats one, where its value
 * starts and ends, and that it is drawn focused while its list is open.
 *
 * Bare and given no width it is an inline box as wide as its widest option; in a Field it is a block that fills the
 * Field's width.
 *
 * It is a form-associated element: it takes `name`, submits `value`, resets to the `value` attribute, is restored on
 * navigation, follows `<fieldset disabled>` and reports `valueMissing` while the Field that frames it says it is
 * required and `value` is empty. It never validates beyond that: `error` is the product's to set.
 *
 * The options may also reach it through a `<slot>` among its children: the elements assigned to that slot stand in
 * the slot's place. That is how a select field's options reach the select inside it, and how a product's own element
 * passes options on (`<tanrei-select label="Plan"><slot></slot></tanrei-select>` in its shadow root).
 *
 * The pattern is the select-only combobox. Focus stays on the trigger while the list is open and one option is the
 * active one: Enter, Space, Down or Up Arrow, or a printable character open the list; the arrow keys, Home, End, Page
 * Down and Page Up and typing move the active option; Enter or Space choose it; Escape, Tab, a press outside or on the
 * trigger close the list without choosing. The value changes only when the person confirms an option.
 *
 * An option is a value, never a destination: a list of places to go is a menu or links.
 *
 * @tag tanrei-select
 * @slot - The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place.
 * @slot leading-icon - A glyph at the start of the container that stands for the field whatever is chosen (a globe before a language). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart container - The trigger's box: the combobox.
 * @csspart outline - A stacked select's inner line, or an outlined select's border.
 * @csspart active-indicator - The line along the bottom of a filled select.
 * @csspart label - The label that floats in a filled or an outlined select's box.
 * @csspart requirement-label - The required asterisk after a floating label.
 * @csspart value - The chosen option's label.
 * @csspart placeholder - The hint shown while nothing is chosen.
 * @csspart leading-icon - The box of the glyph at the start of the container.
 * @csspart chevron - The glyph at the end of the container.
 * @csspart list - The raised sheet that holds the options.
 * @csspart option - An option's row.
 * @csspart option-label - An option's label.
 * @csspart option-supporting-text - An option's supporting text.
 * @csspart option-leading-icon - The box of an option's glyph.
 * @csspart mark - The check of the chosen option.
 * @csspart group - A group of options.
 * @csspart group-title - A group's title.
 * @csspart divider - The line between two groups while the separation is divider.
 * @attr {string} form - The id of the form the select belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires change - The person chose an option whose value differs from the select's; `value` is already the new one. A composed, bubbling Event, as a native select's. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only moves through the list.
 * @fires {CustomEvent<TanreiSelectToggleDetail>} toggle - The list was opened or closed by the person; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `escape`, `outside`, `focus-out`, `anchor-hidden`, `press` or `tab`. After a choice it follows `change`. Composed and not bubbling: heard on the element — and on an element composed around it — and by no ancestor. Never fired when the product sets `open`.
 */
export class TanreiSelect extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'select');
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
  static readonly parts: readonly string[] = [
    'container',
    'outline',
    'active-indicator',
    'label',
    'requirement-label',
    'value',
    'placeholder',
    'leading-icon',
    'chevron',
    'list',
    'option',
    'option-label',
    'option-supporting-text',
    'option-leading-icon',
    'mark',
    'group',
    'group-title',
    'divider',
  ];

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    value: { type: String },
    name: { type: String, reflect: true },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    placeholder: { type: String },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    open: { type: Boolean, reflect: true },
    separation: { type: String, reflect: true },
    inline: { type: Boolean, reflect: true },
    hasLeading: { state: true },
    focused: { state: true },
    formDisabled: { state: true },
  };

  /** The look, as the text inputs beside it: `stacked` is a filled box whose label is the row of the Field that frames it; `filled` and `outlined` float the label inside the box. Use one style per form. A value the select does not know by name is laid out as stacked. Reflected. */
  variant: TanreiSelectVariant = 'stacked';

  /** The container's minimum height: `small`, `medium` or `large` (40 / 48 / 56 in the default system). The hit area always meets the minimum target. Reflected. */
  size: TanreiSelectSize = 'medium';

  /** The value of the chosen option. The select shows that option's label; while `value` names no option it shows the placeholder. An option whose value is the empty string is a choice like any other. The `value` attribute is the value a form reset returns to. */
  value = '';

  /** The name the value is submitted under in a form. Reflected. */
  name = '';

  /** Names the select for assistive technology, where no Field frames it or its visible label is elsewhere; it then wins over the Field's label. A filled or an outlined select also draws it, floating in its box; a stacked select draws no label. A select no Field frames needs one. */
  label = '';

  /** Does not draw the floating label of a filled or an outlined select, which stays the accessible name (`label-hidden`). It changes nothing on a stacked select, which draws no label. */
  labelHidden = false;

  /** A hint shown while nothing is chosen and the label is not in the line. Never a replacement for `label`, and never a choice. */
  placeholder = '';

  /** Puts the select in the error condition: it is exposed as invalid and drawn in its error parts. The select never sets this itself and shows no error text: the words are the `errorText` of the Field that frames it, which puts its select in this condition too. */
  error = false;

  /** Disables the select: it takes no focus, does not open and is left out of form submission. Disable a framed select on its Field, so that the label follows. */
  disabled = false;

  /** The value is shown, can be focused and is submitted, but cannot be changed: the list does not open and no chevron is drawn. The attribute is `readonly`. */
  readOnly = false;

  /** Whether the list is shown. The select opens and closes itself and emits `toggle`; the product may also set it. Ignored while the select is disabled or read-only or holds no option. Reflected. */
  open = false;

  /** How a group of options is told from what is next to it: `divider`, `gap`, or `auto` for the design system's answer (`--tanrei-comp-select-separation`). */
  separation: TanreiSelectSeparation = 'auto';

  /** For tests and fixtures: draws the open list in place below the trigger — inside its positioned ancestor, which stands for the window — not in the top layer; it then answers no dismissal. */
  inline = false;

  /** Whether the leading-icon slot has content. */
  protected hasLeading = false;
  /** SEL-20: the container has focus, however it was gained. */
  protected focused = false;
  /** Set by an ancestor `<fieldset disabled>` (the element's `formDisabledCallback`). */
  protected formDisabled = false;

  private readonly internals: ElementInternals;
  /** What it tells its form, said where an element composed around it hears it (src/primitives/form-says.ts). */
  private readonly says: FormSays;
  /** Whether the list is presented: open, usable, and beside a container in the page. */
  private presented = false;
  /** What opened the list last: a key shows the active option's focus indicator, a press does not (SEL-32). */
  private byKeyboard = false;
  /** A mouse press on the container was answered as it went down: the click that follows it is not a second press. */
  private pressed = false;
  /** SEL-64: what left the element with the frame has been reported for this element. */
  private reportedLeft = false;
  private unregister: (() => void) | null = null;

  /** SEL-60: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'select', behavior: 'SEL-60', axes: AXES });
  /** SEL-45: where style queries are missing, what parts two groups is read by script, again when the system is switched. */
  private readonly system = new SystemWatchController(this);
  /**
   * SEL-63: the select's side of the exchange with the Field that frames it (src/primitives/field.ts). It takes the
   * Field's name, description and states, whether the label is hidden and whether an asterisk follows it; and it says
   * what only it knows — that it draws the label, where its value starts and ends, that it is drawn focused while its
   * list is open. It has an error condition of its own (SEL-9). No Field: it is drawn as a bare select.
   */
  private readonly frame = new FieldControlController(this, {
    errorCondition: true,
    named: () => !!this.label.trim(),
    says: () => this.saysToField,
    changed: () => this.framedChanged(),
  });
  /** The Field's answer changed since the last update: the floating label may have other lines (SEL-15). */
  private frameChanged = false;
  /** SEL-17, SEL-36: the options, read from the children and read again when they change (src/primitives/option-list.ts). */
  private readonly options$ = new OptionsController(this);
  /** SEL-26, SEL-31 … SEL-35, SEL-41, SEL-42: the active option, the keys that move it, the press and the choice. */
  private readonly list = new OptionListController(this, {
    model: () => this.options$.model,
    chosen: () => this.chosen,
    choose: (option, event) => this.choose(option, event),
    widens: true,
  });
  /** SEL-24, SEL-25, SEL-30: where the list is — the anchored surface a popover is drawn on, at least as wide as the container. */
  private readonly anchored = anchoredOptionList(this, {
    anchor: () => this.container,
    inline: () => this.inline,
    gone: () => this.closeList('anchor-hidden'),
  });
  /** SEL-27, SEL-28: Escape, a press outside and focus leaving (src/primitives/dismiss.ts); Tab closes at once. */
  private readonly dismiss = new DismissController(this, {
    related: () => [this],
    request: (reason: DismissReason) => this.closeList(reason),
    tab: (event) => {
      if (!event.ctrlKey && !event.metaKey) this.closeList('tab');
    },
  });
  /** SEL-15: a floating label that does not fit on one line is given the room its lines take (src/primitives/field-trigger.ts). */
  private readonly floating = new FloatingLabelController(this);
  /** SEL-57: the glyph of the slot, the chosen option's own and the options' are marked when the icon set mirrors them. */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="leading-icon"]', drawn: `.leading-own, ${OPTION_MIRRORED}` });
  /** SEL-19: a glyph the select draws by name is drawn once the icon set can draw it; until then nothing stands in its place. */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>(`.chevron, .leading-own, ${OPTION_GLYPHS}`));

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.says = new FormSays(this, this.internals);
    // A `<label for>` of the page activates the element itself: its container takes focus, and nothing opens.
    this.addEventListener('click', (event) => {
      if (event.composedPath()[0] === this) this.focus();
    });
  }

  private get container(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  /**
   * SEL-49: a select a Field frames is a block that fills the Field's width; a bare one is an inline box as wide as its
   * widest option. Said on the element as a state (`:state(framed)`), at the moment the Field answers or lets go, so
   * that the Field reads the control's display as it is.
   */
  private framedChanged() {
    this.frameChanged = true;
    try {
      if (this.frame.framed) this.internals.states.add('framed');
      else this.internals.states.delete('framed');
    } catch {
      // A browser without custom states keeps the inline box; a width given to the select still sizes it.
    }
  }

  /** SEL-11: the accessible name — its own label, else the label of the Field that frames it. */
  private get name_(): string {
    return this.frame.name(this.label.trim() ? this.label : '');
  }

  /** SEL-9: in the error condition — its own `error`, or its Field's. */
  private get invalid(): boolean {
    return this.error || this.frame.invalid;
  }

  /** SEL-15: the label floats in the box — a filled or an outlined select with a name, unless its own `labelHidden` or its Field's says to draw none. */
  private get labelled(): boolean {
    return this.layout !== 'stacked' && !!this.name_ && !this.labelHidden && !this.frame.labelHidden;
  }

  /** SEL-18: what stands at the start of the container — the slot's glyph, else the chosen option's own, else nothing. */
  private get leading(): 'slot' | 'option' | null {
    return this.hasLeading ? 'slot' : this.chosen?.leadingIcon ? 'option' : null;
  }

  /**
   * SEL-63: what the select says to the Field that frames it. That it draws the label while its look floats one — its
   * name, or nothing while the label is hidden; the Field draws no label row either way. How far its value stands from
   * its start edge and the padding it keeps at its end edge, as lengths of the box's tokens (`INSET`, in the styles).
   * And that it is drawn focused for as long as its list is open, whether or not it has focus (SEL-20).
   */
  private get saysToField(): FieldSays {
    const size = /^[a-z0-9][a-z0-9-]*$/.test(this.size) ? this.size : 'medium';
    return {
      drawsLabel: this.layout !== 'stacked',
      inset: INSET(size, { leading: this.leading !== null, chevron: !this.readOnly }),
      drawnFocused: this.open && this.usable,
    };
  }

  /** Disabled by its own `disabled`, a fieldset's, its Field's or a field group's. */
  private get inert_(): boolean {
    return this.disabled || this.formDisabled || this.frame.disabled;
  }

  /** How the variant is laid out: filled and outlined by name, every other value as stacked (SEL-60). */
  private get layout(): Layout {
    return this.variant === 'filled' || this.variant === 'outlined' ? this.variant : 'stacked';
  }

  /** SEL-17: the chosen option — the first, in order and across groups, whose value equals `value`; a disabled one and one whose value is empty included. */
  private get chosen(): OptionData | null {
    return this.options$.model.options.find((option) => option.value === this.value) ?? null;
  }

  private sized: { model: OptionModel; placeholder: string; text: string; said: { label: string; lang: string }[] } | null = null;

  /**
   * SEL-49: what the select's own width is measured from — every option's label and the placeholder, one to a line of
   * one hidden text, each as it would be drawn in the line (spaces collapsed). One element whatever the number of
   * options; made again only when the options or the placeholder change.
   *
   * SEL-59: an option that says a language is shown, once chosen, in that language, and a browser may draw it in
   * another face than the field's: its label is measured in a line of its own that says the same language — an
   * element for each such option only, so a list that says none stays one text.
   */
  private sizerLines(model: OptionModel) {
    if (this.sized?.model !== model || this.sized.placeholder !== this.placeholder) {
      const line = (text: string) => text.replace(/\s+/g, ' ').trim();
      const lines = model.options.filter((option) => !option.lang).map((option) => line(option.label));
      if (this.placeholder) lines.push(line(this.placeholder));
      const said = model.options.filter((option) => !!option.lang).map((option) => ({ label: line(option.label), lang: option.lang }));
      this.sized = { model, placeholder: this.placeholder, text: lines.join('\n'), said };
    }
    const { text, said } = this.sized;
    return html`${text}${said.map((own) => html`${'\n'}<span lang=${own.lang}>${own.label}</span>`)}`;
  }

  /** SEL-23, SEL-46, SEL-47, SEL-61: whether the list can be shown at all. */
  private get usable(): boolean {
    return !this.inert_ && !this.readOnly && this.options$.model.options.length > 0;
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity: `valueMissing` while the Field that frames the select says it is required and its value is empty. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity() {
    return this.internals.checkValidity();
  }

  reportValidity() {
    return this.internals.reportValidity();
  }

  /** Moves focus to the container: the select's one stop in the focus order. */
  override focus(options?: FocusOptions) {
    this.container?.focus(options);
  }

  override blur() {
    this.container?.blur();
  }

  formResetCallback() {
    this.value = this.getAttribute('value') ?? '';
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this.value = typeof state === 'string' ? state : '';
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  // ── SEL-23, SEL-27, SEL-34: opening, closing and choosing ─────────────────────────────────────────────────────

  /** SEL-23: the person opens the list. `open` is true before `toggle` is fired; the list is presented by the render that follows. */
  private openList(keyboard: boolean) {
    if (this.open || !this.usable) return;
    this.byKeyboard = keyboard;
    this.focus({ preventScroll: true });
    this.open = true;
    // The active option is there for the key that opened the list (a character typed on a closed select).
    this.list.start(keyboard);
    // Composed, so that it is heard on an element composed around the select; not bubbling, so that an ancestor's own
    // `toggle` listener — a `<details>`'s — never hears a select's.
    this.dispatchEvent(new CustomEvent<TanreiSelectToggleDetail>('toggle', { composed: true, detail: { open: true } }));
  }

  /** SEL-27: the person closes the list, for `reason`. `open` is false, and the list no longer takes input, before `toggle` is fired. */
  private closeList(reason: TanreiSelectToggleReason) {
    if (!this.open) return;
    this.open = false;
    const container = this.container;
    this.withdraw();
    // A press outside that landed on nothing focusable takes focus from the page: the container takes it again.
    if (reason === 'outside' && this.focused) keepOverlayFocusAfterPress(container);
    this.dispatchEvent(new CustomEvent<TanreiSelectToggleDetail>('toggle', { composed: true, detail: { open: false, reason } }));
  }

  /** SEL-34: the person confirmed `option`. `value` is the new one before `change`; the list then closes, so `toggle` follows. */
  private choose(option: OptionData, _event: Event) {
    if (option.disabled || this.inert_ || this.readOnly) return;
    if (option.value !== this.value) {
      this.value = option.value;
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
    this.closeList('select');
  }

  /** SEL-24, SEL-26: into the overlay layer beside the container. Focus stays where it is. */
  private present() {
    if (!this.anchored.show()) return;
    this.presented = true;
    // SEL-25: the whole of the chosen option is in view when the list opens.
    this.list.reveal();
    if (!this.inline) this.dismiss.start();
  }

  /** SEL-27, SEL-29, SEL-30: out of it, fading; closed or closing it takes no pointer input. */
  private withdraw(fade = true) {
    if (!this.presented) return;
    this.presented = false;
    if (this.dismiss.active) {
      this.dismiss.closeOwned();
      this.dismiss.stop();
    }
    this.anchored.hide(fade);
  }

  // ── SEL-22, SEL-23, SEL-31 … SEL-34: the container's input ─────────────────────────────────────────────────────

  /** A press on the container opens the list with the press, or closes an open one (`press`). Never while disabled or read-only. */
  private toggleByPress() {
    if (this.inert_) return;
    if (this.open && this.presented) this.closeList('press');
    else if (!this.readOnly) this.openList(false);
  }

  private onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    this.pressed = true;
    // A press that ends somewhere else brings no click: it is over once the pointer is lifted.
    const over = () => {
      window.removeEventListener('pointerup', over, true);
      window.removeEventListener('pointercancel', over, true);
      setTimeout(() => (this.pressed = false), 0);
    };
    window.addEventListener('pointerup', over, true);
    window.addEventListener('pointercancel', over, true);
    this.toggleByPress();
  }

  /** A touch, a pen and assistive technology press with a click; a mouse press was answered as it went down. */
  private onClick(event: MouseEvent) {
    if (this.pressed) {
      this.pressed = false;
      // The click of that mouse press; a click made by script or by assistive technology (detail 0) is a press of its own.
      if (event.detail > 0) return;
    }
    this.toggleByPress();
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || this.inert_ || this.readOnly) return;
    const { key } = event;
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
    const printable = plain && [...key].length === 1;
    if (!(this.open && this.usable)) {
      if (!this.usable || event.ctrlKey || event.metaKey) return;
      // SEL-23: the list opens; the value never changes from the keyboard while it is closed.
      if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        this.openList(true);
      } else if (printable) {
        // SEL-33: the first character opens the list, and then looks for an option as it does in an open one.
        event.preventDefault();
        this.openList(true);
        this.list.key(key);
      }
      return;
    }
    // SEL-34: Enter chooses the active option; so does a Space that is not a character of what is being typed.
    if (key === 'Enter' || (key === ' ' && !this.list.searching())) {
      event.preventDefault();
      this.list.activate(event);
      return;
    }
    const moves = key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End' || key === 'PageDown' || key === 'PageUp';
    if (!moves && !printable) return;
    if (event.ctrlKey || event.metaKey) return;
    // SEL-31, SEL-33: the key is the list's, and scrolls nothing else.
    event.preventDefault();
    this.byKeyboard = true;
    this.list.key(key);
  }

  private onFocus() {
    this.focused = true;
    // SEL-21: where style queries are missing, the focus style is read when focus arrives.
    syncFocusStyle(this, this.renderRoot.querySelector<HTMLElement>('.field'));
  }

  private onBlur() {
    this.focused = false;
  }

  private onLeadingSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    this.hasLeading = slot.assignedNodes({ flatten: true }).some((node) => node.nodeType === Node.ELEMENT_NODE || !!node.textContent?.trim());
    // SEL-18: the slot's content is a glyph only.
    void slottedInteractive(slot).then((found) => {
      if (found) report(this, 'SEL-18', `the leading-icon slot holds an interactive element (<${found.localName}>); it takes a glyph only, and the whole container is one target`);
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    // SEL-29: the list belongs to the overlay the select stands in, and closes with it.
    this.unregister = registerOverlay(this, {
      openers: () => [this],
      open: () => this.presented,
      close: () => this.closeList('anchor-hidden'),
      kind: 'select',
    });
    // Put back in the page while open: presented again, as mounted.
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unregister?.();
    this.unregister = null;
    // The controllers take the surface out of the top layer and stop listening.
    this.presented = false;
    this.focused = false;
  }

  protected override willUpdate(changed: PropertyValues) {
    // The first render already draws the glyphs' room: the light-DOM children are there before the slots say so.
    if (!this.hasUpdated) this.hasLeading = [...this.children].some((child) => child.slot === 'leading-icon');
    if (this.inert_) this.focused = false;
    // SEL-26, SEL-31: one option is the active one for as long as the list is shown, from the render that shows it.
    const shown = this.open && this.usable && this.isConnected;
    if (shown) {
      if (!this.list.activeId) this.list.start(changed.has('open') ? this.byKeyboard : false);
    } else this.list.stop();
  }

  protected override updated(changed: PropertyValues) {
    const container = this.container;
    // SEL-15: the floating label's lines follow its text, its asterisk, the look and the size — its own, or its Field's.
    if (changed.has('label') || changed.has('labelHidden') || changed.has('variant') || changed.has('size') || this.frameChanged) this.floating.measure();
    this.frameChanged = false;

    // SEL-36: the product's `open`, and what makes the list unusable, show or remove the list without `toggle`.
    const want = this.open && this.usable && this.isConnected;
    if (changed.has('inline') && this.presented) this.withdraw(false);
    if (want && !this.presented) this.present();
    else if (!want && this.presented) {
      this.withdraw();
      // …disabled, read-only or without its last option while open: it is closed, and says nothing.
      if (this.open) this.open = false;
    } else if (this.presented) this.anchored.request();

    // The form's view: the value, left out while disabled; a missing value while its Field says it is required (SEL-11).
    // Said where an element composed around the select hears it (src/primitives/form-says.ts).
    this.says.value(this.inert_ ? null : this.value, this.value);
    if (this.frame.required && this.value === '' && !this.inert_ && !this.readOnly) {
      this.says.validity({ valueMissing: true }, missingValueMessage('select', { errorText: '', requiredText: this.frame.state?.requiredText ?? '', label: this.name_ }), container ?? undefined);
    } else this.says.validity();
    whenParsed(() => this.reports(changed));
  }

  private reportedOptions = '';

  /** What a debug build tells the developer; the select still renders. */
  private reports(changed: PropertyValues) {
    if (!this.isConnected) return;
    // SEL-64: what left the element with the frame — the six attributes and a child for `label-icon` — is the Field's,
    // and draws nothing here. Said once for each element, permanently: nothing is kept for them in a production build.
    if (!this.reportedLeft) {
      const left = [...LEFT_ATTRIBUTES.filter((name) => this.hasAttribute(name)), ...(this.querySelector(':scope > [slot="label-icon"]') ? ['a child for the label-icon slot'] : [])];
      if (left.length) {
        this.reportedLeft = true;
        report(this, 'SEL-64', `${left.join(', ')}: the select is the bare control and draws no label row, requirement mark, help or error text, so ${left.length > 1 ? 'these do' : 'this does'} nothing here; use <tanrei-select-field>, or put the select in a <tanrei-field>`);
      }
    }
    // SEL-11: a select with neither name — no label of its own, and no Field that gives it one — still renders.
    if (!this.name_) report(this, 'SEL-11', 'label is empty and no Field names the select, so it has no accessible name; give it a label, or put it in a <tanrei-field> that has one');
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'SEL-45', `separation "${this.separation}" is not auto, divider or gap; it behaves as "auto"`);
    }
    const { options, nested } = this.options$.model;
    // The options are reported when they, or the value, change — not on every render.
    const signature = `${this.value}\u0000${options.map((option) => `${option.value}\u0001${option.label}`).join('\u0000')}\u0000${nested.length}`;
    if (signature === this.reportedOptions) return;
    this.reportedOptions = signature;
    if (options.length === 0) {
      report(this, 'SEL-61', `the select holds no option, so it does not open; give it <${OPTION_TAG}> children`);
      return;
    }
    if (options.some((option) => !option.label)) report(this, 'SEL-11', `an option has an empty label, so it has no accessible name; give each <${OPTION_TAG}> a label or a text`);
    if (this.value !== '' && !this.chosen) report(this, 'SEL-17', `value "${this.value}" names no option; the select is drawn with nothing chosen and keeps the value`, { once: false });
    const seen = new Set<string>();
    for (const option of options) {
      if (seen.has(option.value)) report(this, 'SEL-17', `two options share the value "${option.value}"; the first is the one both stand for`);
      seen.add(option.value);
    }
    if (nested.length) report(this, 'SEL-44', `a <${OPTION_GROUP_TAG}> stands inside another; its options are drawn as the outer group's, with no title or separation of its own`);
  }

  protected override render() {
    const { model } = this.options$;
    const layout = this.layout;
    const stacked = layout === 'stacked';
    const inert = this.inert_;
    const chosen = this.chosen;
    const name = this.name_;
    const described = this.frame.description();
    const expanded = this.open && this.usable;
    const leading = this.leading;
    const floating = this.labelled;
    // SEL-7: the asterisk follows a floating label while the Field says so (FLD-25); hidden from assistive technology,
    // because the required state already says it. A bare select draws none.
    const asterisk = floating && this.frame.requiredMark === 'asterisk' ? floatingAsterisk('asterisk') : nothing;
    // The edge: a stacked select's inner line (SEL-20); an outlined select's three-piece outline with the gap for the
    // floated label, and a filled select's active indicator (SEL-15).
    const edges = triggerEdges({ stacked, floating, label: name, asterisk });
    // SEL-11, SEL-48: the combobox is named by its own label or its Field's — drawn or not, and never by the
    // placeholder — and described by what its Field gives. The name and the description are values, written here: an
    // id cannot be referenced across the roots. Its value is what it holds that is not hidden: the chosen option's
    // label. The floating label, the placeholder and every glyph are kept from assistive technology.
    return html`
      <div
        class="field"
        data-layout=${layout}
        ?data-error=${this.invalid}
        ?data-disabled=${inert}
        ?data-focused=${(this.focused || expanded) && !inert}
        ?data-labelled=${floating}
        ?data-has-value=${!!chosen}
        data-leading=${leading ?? nothing}
        ?data-chevron=${!this.readOnly}
        ?data-option-icons=${model.hasIcons}
      >
        <div
          part="container"
          class="container"
          data-tanrei-shape
          role="combobox"
          tabindex=${this.stop.keeps(inert) || !inert ? '0' : nothing}
          aria-label=${name || nothing}
          aria-describedby=${described ? 'description' : nothing}
          aria-invalid=${this.invalid ? 'true' : nothing}
          aria-required=${this.frame.required ? 'true' : nothing}
          aria-readonly=${this.readOnly ? 'true' : nothing}
          aria-disabled=${inert ? 'true' : nothing}
          aria-haspopup="listbox"
          aria-expanded=${expanded ? 'true' : 'false'}
          aria-controls="list"
          aria-activedescendant=${(expanded && this.list.activeId) || nothing}
          @pointerdown=${this.onPointerDown}
          @click=${this.onClick}
          @keydown=${this.onKeyDown}
          @focus=${this.onFocus}
          @blur=${this.onBlur}
        >
          <span part="leading-icon" class="icon leading-slot" aria-hidden="true"><slot name="leading-icon" @slotchange=${this.onLeadingSlotChange}></slot></span>
          <span part="leading-icon" class="icon leading-own" aria-hidden="true"><span class="ink">${leading === 'option' ? chosen?.leadingIcon : nothing}</span></span>
          <div class="body">
            <span class="sizer" aria-hidden="true">${this.sizerLines(model)}</span>
            <span class="line"
              >${chosen
                ? html`<span part="value" class="value" lang=${chosen.lang || nothing} dir=${chosen.dir || ownDirection(chosen.label)}>${chosen.label}</span>`
                : this.placeholder
                  ? html`<span part="placeholder" class="placeholder" aria-hidden="true" dir=${ownDirection(this.placeholder)}>${this.placeholder}</span>`
                  : nothing}</span
            >
          </div>
          ${this.readOnly ? nothing : html`<span part="chevron" class="icon chevron" aria-hidden="true"><span class="ink">expand_more</span></span>`}
          ${floatingLabel({ floating, label: name, asterisk })}
          ${edges}
        </div>
        <span id="name" hidden>${name}</span>
        ${described ? html`<span id="description" hidden>${described}</span>` : nothing}
      </div>
      ${this.list.render({ labelledBy: 'name', inline: this.inline })}
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiSelect);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiSelect);
if (!customElements.get('tanrei-select')) customElements.define('tanrei-select', TanreiSelect);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-select': TanreiSelect;
  }
}
