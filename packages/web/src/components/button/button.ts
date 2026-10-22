import { LitElement, type PropertyDeclarations, type PropertyValues, nothing, svg } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ref } from 'lit/directives/ref.js';
import { html, literal } from 'lit/static-html.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  GROUP_ITEM,
  GlyphMirrorController,
  GroupItemController,
  LINK_MARK,
  LinkController,
  OUTSIDE_FOCUS_ORDER,
  OpenAxesController,
  PressController,
  SUBMIT_BUTTON,
  type SubmitButtonState,
  type TanreiLinkTarget,
  afterClick,
  delegatedAria,
  delegatesAria,
  endsWaiting,
  linkAttributes,
  markPassingSubmitter,
  report,
  syncFocusStyle,
  takeFormDisabled,
  waitsWhileFocused,
  watchNativeInputs,
} from '../../primitives/index.js';
import type { TanreiButtonSizeRegistry, TanreiButtonVariantRegistry } from '../../registry.js';
import { AXES, WIDTHS, styles } from './button.styles.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core variants, plus any a design system's generated `.d.ts` registers. */
export type TanreiButtonVariant = keyof TanreiButtonVariantRegistry;
/** The core sizes, plus any a design system's generated `.d.ts` registers. */
export type TanreiButtonSize = keyof TanreiButtonSizeRegistry;
/** Which side of the label the icon sits on, in the reading direction. */
export type TanreiButtonIconPosition = 'leading' | 'trailing';

/** How wide an icon-only Button is (BTN-12): as wide as it is high, its glyph and a small inset on each side, or its size's wide width. A closed set. */
export type TanreiButtonWidth = 'default' | 'narrow' | 'wide';

/** What a press does to the button's form (BTN-27, BTN-28): nothing, send it, or put it back as it was. A closed set, the platform's own three words. */
export type TanreiButtonType = 'button' | 'submit' | 'reset';

const TYPES: readonly string[] = ['button', 'submit', 'reset'];

/** BTN-16: a name and a drawn text as a spoken word is compared — ends dropped, runs of white space as one, without case. */
const spoken = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

/** What `change` carries: the new value of `selected`. */
export interface TanreiButtonChangeDetail {
  selected: boolean;
}

/**
 * Lets people take an action, or switch something on and off, with one tap or click — named by a label, an icon, or both.
 *
 * Contract: specs/button.spec.json. Every visual value comes from `--tanrei-comp-button-*`
 * tokens, one set per state and, for a toggle, per selection: how a state looks is the active design system's decision,
 * not this component's. How a press is answered and how keyboard focus is drawn are the system's choices of kind
 * (`--tanrei-sys-behavior-*`), and how far its corners ease is the system's amount
 * (`--tanrei-sys-shape-corner-smoothing`); all are read from the cascade, so they follow `data-tanrei-system`.
 *
 * The icon is the `icon` slot: a glyph of the system's icon set, given as its ligature text (`<span slot="icon">favorite</span>`)
 * or a `.tanrei-icon`, `<svg>` or `<img>`. With a label it sits on the side `icon-position` names; alone it is the
 * button's only content, the button is as wide as it is high, and `label` is its accessible name.
 *
 * In a right-to-left layout a glyph given by name is drawn mirrored when the system's icon set says it shows a direction
 * (`arrow_forward`, `chevron_right`, `send`; never `check`, `search` or `play_arrow`) — in its own box, on the side
 * `icon-position` names (BTN-19). `data-mirror="never"` or `"always"` on the slotted element decides for
 * one use; an `<svg>` or `<img>` is never mirrored for you.
 *
 * With `href` it is a link and not a button (BTN-22): the shadow root holds an `<a href>` in place of the
 * `<button>` — the same part, drawn from the same tokens in every state — so the browser's own link is what people get
 * (a new tab, the address to copy, the status bar). Enter activates it and Space does not; `click` fires first and
 * cancelling it (`preventDefault()`) cancels the navigation, which is how a router takes it. `target="new"` opens a new
 * tab, safely (`noopener`), draws the icon set's `open_in_new` after the label unless your own icon is there, and reads
 * `target-label` as the link's description. A toggle takes no destination.
 *
 * In a form it is one of the form's controls (BTN-29), and `type` says what a press does to the form: nothing
 * (`button`, the default), send it (`submit`) or put it back as it was (`reset`). The form is the one around it, or the
 * one the `form` attribute names by id. A submit button is pressed by Enter in a field of its form while it is the
 * form's first submit button, and stops that key while it is disabled (BTN-30); its `name` and `value` are sent when
 * it is the button pressed (BTN-31). `label` is the whole accessible name whenever it is given — also beside a drawn
 * label, which it must contain (BTN-16).
 *
 * @tag tanrei-button
 * @slot - Label content: the text that names the action. Leave it empty for an icon-only button.
 * @slot icon - The icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart container - The native button that holds the label and the icon; with `href`, the anchor in its place.
 * @csspart label - The label text wrapper.
 * @csspart icon - The box the icon is drawn in (hidden from assistive technology); also the mark of a link that opens a new context.
 * @attr {boolean} confirming - A mark for the component that places this button as an action (a button group, a dialog, a popover, a side sheet): the action completes the task, and is placed at the end of a row and at the top of a column (BGR-13, BGR-14). Read by that component as an attribute; the button draws nothing for it and has no property of the name.
 * @attr {boolean} dismissive - The same mark for the action that backs out of the task: placed at the start of a row and at the bottom of a column. With `confirming` as well, the button is placed as one with neither (BGR-18).
 * @attr {string} form - The id of the form the button belongs to, where it stands outside it (a dialog's actions, a page header): the platform's own attribute, which then wins over a form around the button (BTN-29). The `form` property is read-only and returns the form element.
 * @fires click - The button was activated by pointer, touch, keyboard or assistive technology. A link button fires it before the browser follows the address; `preventDefault()` cancels the navigation.
 * @fires {CustomEvent<TanreiButtonChangeDetail>} change - A toggle was activated; fired after its `click`. `detail.selected` (and the element's `selected`) is the new value.
 */
export class TanreiButton extends TanreiElement {
  /** BTN-29: one of its form's controls, for its form owner and for a disabled fieldset (BTN-32). */
  static formAssociated = true;

  private readonly availability = new AvailabilityController(this, 'button');
  static override styles = [styles, hiddenHost];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  /** @internal Its documented parts, for an element that holds it and exports them (src/primitives/composed.ts, `exported()`). */
  static readonly parts: readonly string[] = ['container', 'label', 'icon'];

  static override properties: PropertyDeclarations = {
    // The default is not reflected, so "no variant attribute" is how a dialog or a side sheet knows the product set
    // none (DLG-20, SSH-17).
    variant: { type: String, reflect: true, useDefault: true },
    destructive: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    width: { type: String, reflect: true },
    fullWidth: { type: Boolean, reflect: true, attribute: 'full-width' },
    iconPosition: { type: String, reflect: true, attribute: 'icon-position' },
    toggle: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    focusableWhenDisabled: { type: Boolean, reflect: true, attribute: 'focusable-when-disabled' },
    busy: { type: Boolean, reflect: true },
    busyLabel: { type: String, attribute: 'busy-label' },
    label: { type: String },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    // The default is not reflected: a button that says nothing of a form gains no attribute.
    type: { type: String, reflect: true, useDefault: true },
    name: { type: String },
    value: { type: String },
    hasIcon: { state: true },
    hasLabel: { state: true },
    outsideFocusOrder: OUTSIDE_FOCUS_ORDER,
  };

  /**
   * Emphasis level. Use one filled button per view for the main action; an icon-only text button is the quiet icon
   * action of a toolbar or a row. Default filled; a Button placed as a dialog's or a side sheet's action without a
   * `variant` attribute takes the host's (DLG-20, SSH-17), and a side sheet's close button takes
   * `comp.side-sheet.close-button.variant` (SSH-5).
   */
  variant: TanreiButtonVariant = 'filled';

  /**
   * An action that deletes or discards something a person may not get back (Delete, Discard, Remove member): the button
   * keeps its variant's emphasis and takes the error role's color in it (BTN-40) — filled in the error color, tonal in
   * its tonal container, the label of an elevated, outlined or text button (and an outlined button's edge) in the error
   * color. Disabled, it looks like any disabled button of its variant. It adds a color and nothing else: the label says
   * what is destroyed (BTN-42). Ignored on a toggle (BTN-41), and on a link — while `href` is not empty — which only
   * leads somewhere and deletes nothing (BTN-43); both are reported in debug builds. The action at the link's
   * destination is the one that deletes, and the one to mark destructive.
   */
  destructive = false;

  /** Visual height (small 32 / medium 40 / large 56), which is also an icon-only button's width at its default width. The hit area always meets the minimum target. */
  size: TanreiButtonSize = 'medium';

  /**
   * How wide an icon-only button is: `default` as wide as it is high (32 / 40 / 56), `narrow` its glyph and
   * `comp.button.container.padding-inline-narrow` on each side of it (28 / 32 / 32 in the default system, whose inset
   * is 4 at every size; it has no narrow width of its own, so it follows its glyph) for a tight row of icon actions,
   * `wide` (40 / 52 / 72) for the one action of a row that should weigh more. Ignored with a label. The height does
   * not change, and the hit area meets the minimum target at every width — a narrow button is never drawn wider to
   * reach it. Anything else is drawn as `default` (reported in debug builds, BTN-21).
   */
  width: TanreiButtonWidth = 'default';

  /**
   * Takes the whole width its container gives it, its content centred, at the height of its size (the `full-width`
   * attribute, BTN-39): a form's only action on a narrow screen, the action at the foot of a card or a sheet. A label
   * that does not fit wraps, its lines centred; an icon-only button centres its glyph and ignores `width`. Ignored while
   * a host lays the button out (a button group, a toolbar, the actions of a dialog, a popover, a callout or an empty
   * state), which gives it its width: a button group's own `full-width` is how a row of buttons shares one.
   */
  fullWidth = false;

  /** Which side of the label the icon sits on, in the reading direction. Ignored without a label or an icon. */
  iconPosition: TanreiButtonIconPosition = 'leading';

  /** Makes the button a two-state control: activation switches `selected`, and assistive technology announces it as pressed or not pressed. */
  toggle = false;

  /** Whether a toggle is on. Ignored unless `toggle` is true. */
  selected = false;

  /**
   * Prevents interaction and removes the button from the focus order. A disabled submit button sends nothing, and
   * still stops Enter from sending its form where it is the form's default button (BTN-32). A button that is not a
   * link is disabled as well by a `<fieldset disabled>` around it. A button disabled while it holds focus keeps it
   * until the next frame, as the platform's own does, and its `disabled` attribute is written then.
   */
  disabled = false;

  /**
   * Keeps a disabled button in the focus order (BTN-38): drawn and exposed as disabled (`aria-disabled`), refusing every
   * activation, but reachable by Tab and by a pointer, and keeping focus when it becomes disabled — so that a person can
   * learn why it does nothing (a tooltip, a description). A disabled fieldset still takes it out of the focus order.
   * Ignored unless `disabled` is set.
   */
  focusableWhenDisabled = false;

  /**
   * The action it started is under way (BTN-36, BTN-37): it keeps its focus, its place in the focus order and its size,
   * draws the loading indicator's arc in place of its label and icon, refuses every activation — a submit button sends
   * nothing, and stops Enter in its form as a disabled one does — and announces `busyLabel`.
   */
  busy = false;

  /** What assistive technology is told while the button is busy ("Saving"): your words, in your language. Required while busy. */
  busyLabel = '';

  /**
   * The accessible name, where it is more than what the button draws. Required for an icon-only button. Beside a drawn
   * label it is the whole name in place of the drawn text, which stays drawn — for an action repeated in every row
   * (drawn "Reset", named "Reset: Spacing") — and it must contain the drawn text, so that a person who says what they
   * see is heard: a debug build reports one that does not, and the name stays what was given (BTN-16).
   */
  label = '';

  /**
   * Web only. What a press does to the button's form: `button` nothing (the default), `submit` asks it to submit as
   * the platform's own submit button does — after `click`, the form's validation, then its `submit` event — and
   * `reset` asks it to reset (BTN-27, BTN-28). Anything else is `button` and reported; a toggle and a link ignore it
   * (BTN-33). `formaction` and its siblings are not read.
   */
  type: TanreiButtonType = 'button';

  /** Web only. With `value`, the pair sent with the form when this button is the one that submitted it; nothing is sent while it is empty (BTN-31). */
  name = '';

  /** Web only. What is sent under `name` when this button submitted the form. */
  value = '';

  /**
   * The destination: a URL, a path or a fragment. Not empty, the button is a link and not a button (BTN-22): the link
   * role, an `<a href>` in the shadow root, activated by Enter and not by Space, drawn exactly as the button it would
   * otherwise be. Ignored while `toggle` is set; white space is no destination, and a `javascript:` address or one that
   * cannot be read is refused and reported in debug builds (BTN-26).
   */
  href = '';

  /**
   * Where the destination opens: `same` (here) or `new` (a new tab or window, with `noopener`), which a labelled button
   * marks with the glyph `open_in_new` after its label and says through `targetLabel` (BTN-24). HTML's `_self` and
   * `_blank` are read as those two; anything else is `same` and reported. Ignored without `href`.
   */
  target: TanreiLinkTarget = 'same';

  /** What assistive technology reads after the link's name while `target` is `new` ("opens in a new tab"): your words, in your language. Required then; ignored otherwise. */
  targetLabel = '';

  /** Web only: forwarded to the anchor's `rel`; `target="new"` adds `noopener` to it. Ignored without `href`. */
  rel: string | null = null;

  /** Web only: forwarded to the anchor's `download` (the file name; empty for the address's own). Ignored without `href`. */
  download: string | null = null;

  /**
   * A host that steps for the button by keys of its own takes it out of the focus order: it stays a named button to
   * assistive technology and to a pointer (src/primitives/focus-order.ts; a number field's steppers, NUM-25).
   * @internal
   */
  outsideFocusOrder = false;

  /** Whether the last render drew the button as disabled: compared once the update has reflected `disabled` (BTN-32). */
  private drawnDisabled = false;

  private readonly internals = this.attachInternals();

  /** The form whose native controls are listened to for this submit button (BTN-30), so it can be let go. */
  private watchedForm: HTMLFormElement | null = null;

  /** Whether the icon slot has content. */
  protected hasIcon = false;

  /** Whether the default slot has content: without it the button is icon-only (BTN-12). */
  protected hasLabel = false;

  /**
   * BTN-7: a size or variant the core does not have was added by a design system: its stylesheet is adopted,
   * built once per value for the page. Tokens the active system lacks fall back to the default's, and a value the
   * active system does not have is reported in debug builds (src/primitives/axes.ts).
   */
  private readonly axes = new OpenAxesController(this, { component: 'button', behavior: 'BTN-7', axes: AXES });

  /**
   * BTN-19: the glyph in the icon slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]', drawn: '.mark' });

  /**
   * BTN-22 … BTN-26: the link the button is while it has a destination, what its anchor carries, and what a debug
   * build is told (src/primitives/link.ts). A toggle holds a state and takes none (BTN-26).
   */
  private readonly link = new LinkController(this, {
    ids: { refused: 'BTN-26', newContext: 'BTN-24' },
    // BTN-37: a busy link opens nothing, as a disabled one does.
    disabled: () => this.disabled || this.busy,
    holds: () => (this.toggle ? 'a toggle' : null),
  });

  /**
   * BTN-8 / BTN-9: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). BTN-23: a
   * link is pressed by Enter alone; Space is the browser's.
   */
  private readonly press = new PressController(this, {
    container: () => this.container,
    holdCarrier: () => this.container?.querySelector(this.hasLabel ? '.label' : 'slot[name="icon"]') ?? null,
    disabled: () => this.refuses,
    keys: () => this.link.pressKeys,
  });

  /**
   * BTN-10, BGR-1…4, BGR-7, BGR-16, BGR-22, BGR-23: where a button group places it (src/primitives/group-item.ts) — its
   * corners and minimum size as a connected group sets them, the padding the group adds at a rounded outer end, no
   * outline or ring along an edge joined under a divider, its label free to wrap when the group narrows it — and the
   * variant (DLG-20, SSH-17) and the tone (BTN-45) a host gives it. Internal between Tanrei elements.
   * @internal
   */
  readonly [GROUP_ITEM] = new GroupItemController(this, () => this.container);

  /** The native button, or the anchor of the link form: the one styled part (BTN-22). */
  private get container() {
    return this.renderRoot?.querySelector<HTMLElement>('[part="container"]') ?? null;
  }

  /**
   * The form the button belongs to (BTN-29): the nearest form around it, or the one its `form` attribute names by id.
   * Read-only, as the platform's own button has it; null where there is none.
   */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /**
   * BTN-32: disabled by its own `disabled`, or — unless it is a link, as no link of the platform is — by a disabled
   * fieldset around it. The fieldset's part is the platform's word (`:disabled`) less the element's own attribute:
   * that attribute follows the property one step late — it is still there while the update that unsets it renders —
   * and a button enabled by its property is enabled by that same update, so that focus can be moved to it at once.
   */
  private get isDisabled(): boolean {
    if (this.disabled) return true;
    return !this.link.form && !this.hasAttribute('disabled') && this.matches(':disabled');
  }

  /** BTN-37, BTN-38: whether a press does nothing now — disabled, or busy. */
  private get refuses(): boolean {
    return this.isDisabled || this.busy;
  }

  /**
   * BTN-37, BTN-38: whether the button refuses presses and still stays in the focus order — busy, or disabled by its own
   * `disabled` while `focusableWhenDisabled` is set. A disabled fieldset takes it out of the focus order whatever it says.
   */
  private get reachable(): boolean {
    if (!this.disabled && this.isDisabled) return false;
    return this.disabled ? this.focusableWhenDisabled : this.busy;
  }

  /** BTN-33: what a press does to the form now — nothing for a toggle, a link, and a type the button does not define. */
  private get formAction(): 'submit' | 'reset' | null {
    if (this.toggle || this.link.form) return null;
    return this.type === 'submit' || this.type === 'reset' ? this.type : null;
  }

  /**
   * BTN-30: what the default-button primitive reads (src/primitives/default-button.ts). Internal between Tanrei elements.
   * @internal
   */
  get [SUBMIT_BUTTON](): SubmitButtonState {
    // BTN-37: a busy default button stops Enter as a disabled one does.
    return { submits: this.formAction === 'submit', disabled: this.refuses };
  }

  /** BTN-32: the platform's word changed — a fieldset around the button was disabled or enabled: it is drawn again, at once. */
  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, () => {
      this.requestUpdate();
      // A group that keeps one Tab stop among its items (a toolbar) is told: no attribute of the item changed.
      this[GROUP_ITEM].availabilityChanged();
    });
  }

  /**
   * BTN-2: a button disabled while it holds focus is disabled at once — its property, the native button inside, what
   * it emits, Tab — and lets go of focus as the platform's own button does, at the next frame in every engine: its
   * `disabled` attribute, which is the platform's word for a form-associated element and takes focus within the call
   * in one engine, is written when focus has left, a frame later at most (src/primitives/disabled-while-focused.ts).
   * The property's reflection comes through here as the page's own `setAttribute` does.
   */
  override setAttribute(name: string, value: string) {
    if (name.toLowerCase() === 'disabled') {
      // BTN-38: a disabled button that stays reachable carries no `disabled` attribute — the platform's word that a
      // form-associated element is disabled, which takes it out of the focus order and takes focus from it. The
      // property says it, and aria-disabled says it to assistive technology.
      if (this.focusableWhenDisabled) {
        if (!this.disabled) this.disabled = true;
        return;
      }
      if (waitsWhileFocused(this, () => super.setAttribute('disabled', ''))) return;
    }
    super.setAttribute(name, value);
  }

  override toggleAttribute(name: string, force?: boolean): boolean {
    if (name.toLowerCase() !== 'disabled') return super.toggleAttribute(name, force);
    if (force ?? !(this.disabled || this.hasAttribute('disabled'))) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
    return this.disabled;
  }

  override removeAttribute(name: string) {
    if (name.toLowerCase() === 'disabled') {
      endsWaiting(this);
      // BTN-38: there is no attribute to remove, so no change of it tells the property.
      if (this.focusableWhenDisabled && !this.hasAttribute('disabled') && this.disabled) this.disabled = false;
    }
    super.removeAttribute(name);
  }

  /** BTN-38: while the attribute is taken off on the property's behalf, it says nothing of the property. */
  private holdingDisabled = false;

  override attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (name === 'disabled' && this.holdingDisabled) return;
    super.attributeChangedCallback(name, old, value);
  }

  /** BTN-29: the form owner changed — the button moved, or its `form` attribute was written. */
  formAssociatedCallback() {
    this.watch();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.watch();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.watch();
  }

  /** BTN-30: while it is a submit button of a form, Enter in the platform's own inputs of that form is listened to. */
  private watch() {
    const form = this.isConnected && this.formAction === 'submit' ? this.form : null;
    watchNativeInputs(this, form, this.watchedForm);
    this.watchedForm = form;
  }

  /** BTN-10: where style queries are missing, the focus style is read when focus arrives. */
  #onFocus() {
    syncFocusStyle(this, this.container);
  }

  #onIconSlotChange(event: Event) {
    this.hasIcon = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  #onLabelSlotChange(event: Event) {
    this.hasLabel = (event.target as HTMLSlotElement).assignedNodes({ flatten: true }).some((node) => node.nodeType === Node.ELEMENT_NODE || !!node.textContent?.trim());
    this.reportName();
  }

  constructor() {
    super();
    // A disabled native button already swallows its own clicks; this also covers
    // clicks that land on the host (e.g. from `element.click()`), so BTN-2 holds.
    this.addEventListener(
      'click',
      (event) => {
        if (this.refuses) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
    // BTN-27, BTN-28: the first listener on the element, so the form is asked once the click has gone through the
    // page — from the native button, from the element's own `click()` and from a click dispatched on it alike.
    this.addEventListener('click', this.onFormClick);
  }

  /**
   * BTN-27, BTN-28: after `click` has gone through the page (src/primitives/after-click.ts) and the product has not
   * cancelled it, a submit button asks its form to submit and a reset button asks it to reset. The form is read then
   * (BTN-29). Not held for the press-hold time: the pressed state is shown and the work starts at once.
   */
  private readonly onFormClick = (event: MouseEvent) => {
    const action = this.formAction;
    if (!action) return;
    afterClick(() => {
      if (event.defaultPrevented || this.refuses) return;
      const form = this.form;
      if (!form) {
        report(this, 'BTN-29', `a ${action} button has no form: it stands in none, and its form attribute names none; the press emitted click and did nothing more`);
        return;
      }
      if (action === 'reset') form.reset();
      else this.submit(form);
    });
  };

  /**
   * BTN-31: the platform lets only its own buttons be a submitter, so the form is asked through a submit button of the
   * platform's own that holds this button's name and value and lasts no longer than the dispatch: the validation, the
   * `submit` event, `event.submitter` and `new FormData(form, event.submitter)` are the platform's. It stands where
   * this button stands — a child of it in a slot it does not have, drawn nowhere, naming the same form where this
   * button names one — so the pair is sent at the button's own place among the form's entries, as the platform's own
   * button's is; and it is gone when the call returns, also when a listener throws.
   */
  private submit(form: HTMLFormElement) {
    const submitter = document.createElement('button');
    submitter.type = 'submit';
    submitter.hidden = true;
    submitter.slot = 'passing';
    // Without a name nothing of it is sent; its value is still the submitter's (what a `method="dialog"` form returns).
    if (this.name) submitter.name = this.name;
    submitter.value = this.value;
    const named = this.getAttribute('form');
    if (named !== null) submitter.setAttribute('form', named);
    markPassingSubmitter(submitter);
    this.append(submitter);
    // A form owner the parser gave without an ancestor or an id to show for it: the form itself then holds it.
    if (submitter.form !== form) {
      submitter.removeAttribute('form');
      form.append(submitter);
    }
    try {
      form.requestSubmit(submitter);
    } finally {
      submitter.remove();
    }
  }

  /**
   * `element.click()` activates the button as a person would — through the native button, so a toggle switches and
   * fires `change`, and through the anchor, so a link is followed — and does nothing while disabled.
   */
  override click() {
    const container = this.container;
    if (container) container.click();
    else if (!this.refuses) super.click();
  }

  /**
   * BTN-14: a toggle switches its own `selected`, then fires `click`, then `change` (src/primitives/after-click.ts): a
   * `click` listener on the element already sees the new value, and `change` follows once the click has gone through the page.
   */
  #onClick() {
    if (!this.toggle || this.refuses) return;
    this.selected = !this.selected;
    const detail = { selected: this.selected };
    afterClick(() => this.dispatchEvent(new CustomEvent<TanreiButtonChangeDetail>('change', { bubbles: true, detail })));
  }

  protected override willUpdate(changed: PropertyValues) {
    // BTN-38: a disabled button made reachable gives up the `disabled` attribute (the page's too) and keeps the property;
    // one no longer reachable takes it back, as its reflection would have written it.
    if (changed.has('focusableWhenDisabled') || changed.has('disabled')) {
      if (this.focusableWhenDisabled && this.hasAttribute('disabled')) {
        this.holdingDisabled = true;
        HTMLElement.prototype.removeAttribute.call(this, 'disabled');
        this.holdingDisabled = false;
      } else if (!this.focusableWhenDisabled && this.disabled && !this.hasAttribute('disabled') && changed.has('focusableWhenDisabled') && changed.get('focusableWhenDisabled') !== undefined) {
        this.setAttribute('disabled', '');
      }
    }
    // The slots report their content only once rendered; the first render reads it from the children, so an icon-only
    // button is square and named from its first frame.
    // BTN-39: the custom state `placed` while a host lays the button out (src/primitives/group-item.ts): `full-width`
    // does nothing under it, so the host's width holds.
    if (this[GROUP_ITEM].place) this.internals.states.add('placed');
    else this.internals.states.delete('placed');
    if (this.hasUpdated) return;
    const nodes = [...this.childNodes];
    this.hasIcon = nodes.some((node) => node instanceof Element && node.slot === 'icon');
    this.hasLabel = nodes.some((node) => (node instanceof Element ? !node.slot : node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()));
  }

  /** BTN-37: the polite region busyLabel is announced through. */
  private get status() {
    return this.renderRoot?.querySelector<HTMLElement>('.live') ?? null;
  }

  protected override updated(changed: PropertyValues) {
    // BTN-37: busyLabel is announced once when the button becomes busy (the region was emptied when it was not), and
    // nothing is said when it ends.
    // The region exists only while the button is busy (a status region on every button would be one in every list of
    // the page's regions), so the words are put in a frame after it was, where a screen reader hears a change.
    if (changed.has('busy') && this.busy) {
      const words = this.busyLabel;
      requestAnimationFrame(() => {
        const status = this.status;
        if (status && this.busy && !this.isDisabled) status.textContent = words;
      });
      if (!words) report(this, 'BTN-37', 'it is busy and busyLabel is empty, so nothing tells people who cannot see the arc that it is working; give it the words ("Saving")');
    }
    // BTN-32: the update has reflected `disabled` by now. Unset inside a disabled fieldset, the button was rendered
    // from the property alone and is still disabled by the fieldset: it is drawn again.
    if (this.drawnDisabled !== this.isDisabled) this.requestUpdate();
    // BTN-21: a width the button does not define is drawn at the default width (no rule matches it) and reported.
    if (changed.has('width') && !(WIDTHS as readonly string[]).includes(this.width)) {
      report(this, 'BTN-21', `width "${this.width}" is not a value of the button; it is drawn as "default"`);
    }
    // BTN-41: a toggle has no destructive look; the styles draw it as the toggle it is.
    if ((changed.has('destructive') || changed.has('toggle')) && this.destructive && this.toggle) {
      report(this, 'BTN-41', 'a toggle has no destructive look: destructive is ignored while toggle is true');
    }
    // BTN-43: a link deletes nothing; the styles draw it as the link of its variant.
    if ((changed.has('destructive') || changed.has('href') || changed.has('toggle')) && this.destructive && this.link.form) {
      report(this, 'BTN-43', 'a link only leads somewhere and does not itself delete anything: destructive is ignored while href is not empty. The action that deletes is the one at its destination; mark that one destructive');
    }
    if (changed.has('type') || changed.has('toggle') || changed.has('href')) {
      this.watch();
      this.reportType();
    }
    if (changed.has('label') || changed.has('hasLabel')) this.reportName();
    if (!changed.has('label') && !changed.has('hasLabel') && !changed.has('hasIcon')) return;
    // BTN-16, BTN-17: an icon alone is not a name, and a button with neither label nor icon shows nothing. It still renders.
    if (!this.hasLabel && !this.hasIcon) report(this, 'BTN-17', 'it has neither a label nor an icon; give it one');
    // A button its host keeps from assistive technology needs no name there (a number field's unnamed stepper, NUM-44).
    else if (!this.hasLabel && !this.label && this.getAttribute('aria-hidden') !== 'true') report(this, 'BTN-16', 'it is icon-only and label is empty, so it has no accessible name; give it a label');
  }

  /** BTN-33: a type the button does not define, and a type a toggle or a link ignores. Each once. */
  private reportType() {
    const { type } = this;
    if (!TYPES.includes(type)) {
      report(this, 'BTN-33', `type "${type}" is not button, submit or reset; it behaves as "button" and submits nothing`);
      return;
    }
    if (type === 'button') return;
    if (this.toggle) report(this, 'BTN-33', `a toggle cannot ${type} a form; type "${type}" is ignored`);
    else if (this.link.form) report(this, 'BTN-33', `a link cannot ${type} a form; type "${type}" is ignored`);
  }

  /** The text the default slot draws. */
  private get drawnText(): string {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    const nodes = slot ? slot.assignedNodes({ flatten: true }) : [...this.childNodes].filter((node) => !(node instanceof Element && node.slot));
    return nodes.map((node) => node.textContent ?? '').join('');
  }

  /**
   * BTN-16: a name beside a drawn label must contain the drawn text, so that a person who says the word they see is
   * heard. The report is all the button does about it: `label` stays the whole name.
   */
  private reportName() {
    if (!this.label || !this.hasLabel) return;
    const drawn = spoken(this.drawnText);
    if (drawn && !spoken(this.label).includes(drawn)) {
      report(this, 'BTN-16', `label "${this.label}" does not contain the text the button draws ("${drawn}"), so a person who says what they see is not heard; label is still its whole name`);
    }
  }

  protected override render() {
    // The native <button> supplies role, focusability, Enter/Space activation and
    // the disabled state, so assistive technology and test tools see real semantics. aria-pressed exists only on a toggle (BTN-14).
    // BTN-12, BTN-17: without a label the button is as wide as its width names — an icon alone, or nothing at all.
    // BTN-22: with a destination the same part is an anchor — the same classes, parts and listeners, so every state is
    // drawn from the same tokens — whose attributes are the link primitive's (`href`, `target`, `rel`, `download`; a
    // disabled link is the anchor without `href`, with the link role and aria-disabled, BTN-25).
    // BTN-16: `label`, whenever given, is the whole name: the one native element carries it, and the drawn text under
    // it is not exposed a second time. The native button stays `type="button"`: in a shadow root no form owns it.
    const link = this.link.form;
    const disabled = this.isDisabled;
    this.drawnDisabled = disabled;
    // BTN-36 … BTN-38: busy, or disabled and still reachable — refusing presses, staying in the focus order, and telling
    // assistive technology so with aria-disabled in place of the platform's disabled state.
    const reachable = this.reachable;
    const busy = this.busy && !disabled;
    // The product's `aria-description` on the host (a badge's on its anchor, BDG-8) comes first (src/primitives/delegated-aria.ts).
    const description = [this.link.describe(this.getAttribute('aria-description')), busy ? this.busyLabel : ''].filter(Boolean).join(', ');
    const tag = link ? literal`a` : literal`button`;
    const iconOnly = !this.hasLabel;
    const trailing = this.hasIcon && this.hasLabel && this.iconPosition === 'trailing';
    // BTN-24: a new context is marked after the label, where a trailing icon is drawn — unless the product's own icon is
    // there, or there is no label to follow.
    const mark = !!link?.opensNew && this.hasLabel && !trailing;
    // BTN-39: full width, unless a host lays the button out.
    const full = this.fullWidth && !this[GROUP_ITEM].place;
    return html`
      <${tag}
        part="container"
        type=${link ? nothing : 'button'}
        data-tanrei-shape
        class=${classMap({ 'has-icon': this.hasIcon, 'with-icon': this.hasIcon && this.hasLabel && !trailing, 'with-trailing-icon': trailing, 'with-mark': mark, 'icon-only': iconOnly, 'full-width': full, busy, ...this[GROUP_ITEM].classes() })}
        data-host-variant=${this[GROUP_ITEM].variant ?? nothing}
        ${ref(this[GROUP_ITEM].toneRef)}
        ${linkAttributes(link)}
        tabindex=${this.outsideFocusOrder ? '-1' : link && reachable ? '0' : nothing}
        ${delegatedAria(this, {
          'aria-label': this.label,
          'aria-description': description,
          'aria-pressed': this.toggle && String(this.selected),
          'aria-disabled': !link && reachable && 'true',
        })}
        ?disabled=${!link && disabled && !reachable}
        @click=${this.#onClick}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @keydown=${this.press.onKeyDown}
        @keyup=${this.press.onKeyUp}
        @blur=${this.press.onBlur}
        @focus=${this.#onFocus}
      >
        <span part="icon" class="icon" aria-hidden="true"><slot name="icon" @slotchange=${this.#onIconSlotChange}></slot></span>
        <span part="label" class="label"><slot @slotchange=${this.#onLabelSlotChange}></slot></span>
        ${mark ? html`<span part="icon" class="mark" aria-hidden="true">${LINK_MARK}</span>` : nothing}
        ${busy ? html`<span class="busy-arc" aria-hidden="true">${svg`<svg focusable="false"><circle></circle></svg>`}</span>` : nothing}
      </${tag}>
      ${busy ? html`<span class="live" role="status"></span>` : nothing}
    `;
  }
}

// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiButton);
// The product's ARIA on the host is the native element's; a toggle's pressed state and the disabled state are its own.
delegatesAria(TanreiButton, { owns: ['aria-pressed', 'aria-disabled'] });
if (!customElements.get('tanrei-button')) customElements.define('tanrei-button', TanreiButton);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-button': TanreiButton;
  }
}
