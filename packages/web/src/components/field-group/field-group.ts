import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { type FrameProps, type FrameRequiredMark, type FrameRequirement, frameAnnounce, frameRequirement, frameWithWords, reportFrame, syncFrameMark } from '../../primitives/field-frame.js';
import { GROUP_ORIENTATIONS, type GroupOrientation, type GroupSemantics, groupDescribedBy, groupOrientation, groupRows } from '../../primitives/field-group-frame.js';
import { AvailabilityController, FieldControlController, FieldProviderController, type FieldState, OpenAxesController, WordsController, report } from '../../primitives/index.js';
import type { TanreiFieldGroupSpacingRegistry } from '../../registry.js';
import { AXES, CORE_SPACINGS, PREFIX, styles } from './field-group.styles.js';

/** What the form asks of the set: nothing, an answer, or that it may be left out. */
export type TanreiFieldGroupRequirement = FrameRequirement;
/** How a required set is marked: the design system's answer (auto), a tag, an asterisk, or nothing. */
export type TanreiFieldGroupRequiredMark = FrameRequiredMark;
/** A column, or a row that wraps. */
export type TanreiFieldGroupOrientation = GroupOrientation;
/** The core spacings (controls, fields), plus any a design system's generated `.d.ts` registers. */
export type TanreiFieldGroupSpacing = keyof TanreiFieldGroupSpacingRegistry;
/** What the set is to assistive technology: a group of controls that each answer for themselves, or the radio group of its radio buttons. */
export type TanreiFieldGroupKind = (typeof KINDS)[number];

/** FGR-22: the first is what an unknown kind is exposed as. */
const KINDS = ['group', 'radio-group'] as const;

/** FGR-25: a radio group has a required state, so "required" is that state and never words of the description. */
const RADIO_GROUP: GroupSemantics = { requiredState: true };

/** The id of the legend, which names the radio group (FGR-25). */
const LEGEND = 'legend';

/** FGR-15, FGR-25: a radio button — Tanrei's or the platform's. */
const RADIO_BUTTON = 'tanrei-radio-button, input[type="radio"]';

/** The elements that hold a set of controls: a radio button inside one, inside this group, is that set's. */
const SETS = 'tanrei-radio-group, tanrei-field-group, tanrei-checkbox-group';

/** FGR-25: what can be operated among the product's own elements. */
const OPERABLE = 'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"])';

const state = (given: Partial<FieldState>): FieldState => ({ label: '', description: '', invalid: false, required: false, requiredText: '', disabled: false, ...given });

/** A native element that has an error condition of its own to be put in (FGR-8): a checkbox. */
const PLAIN_ERROR_CONDITION = 'input[type="checkbox"], [role="checkbox"]';

/**
 * Names a set of controls that answer one question — checkboxes, switches, or fields that belong together — with a
 * label that can say the set is required or optional, a description, and one error for the set, and lays the controls
 * out in a column or a row. It frames the set and never selects, moves focus or holds a value.
 *
 * Contract: specs/field-group.spec.json. `<tanrei-field-group label="Notify me by"><tanrei-checkbox label="Email">
 * </tanrei-checkbox>…</tanrei-field-group>`: the controls are the elements of the default slot. They stay in the
 * product's light DOM, so each keeps its place in a `<form>`, its `name` and `value` and its events; the group is not
 * form-associated, holds no value and emits no event. Every visual value is a `--tanrei-comp-field-group-*` token.
 *
 * The shadow root holds a `<fieldset>` with a `<legend>` around the slot, so the controls are inside the group the
 * label names. A group has neither a required nor an invalid state: its description is `supporting-text`, then
 * `error-text` while `error` is true, then the requirement in words (`required-text`, `optional-text`); `error` puts
 * each checkbox it holds in the checkbox's own error condition and gives it the error text as its description. A
 * switch, which has no error condition, stays as it is drawn, and a field keeps the error the product gave it.
 * `disabled` disables every control. The group gives these through the composed `tanrei-field-connect` event a control
 * asks with (`src/primitives/field.ts`), or as attributes on any other element, and takes back exactly what it gave.
 *
 * It answers no press and no key and adds no stop to the focus order.
 *
 * `kind="radio-group"` (FGR-25) makes the same element the radio group of the radio buttons it holds — a set of radio
 * buttons of one `name`, written by hand, or the radio buttons of the `<tanrei-radio-group>` built around it: the
 * `<fieldset>` carries the radio group's role with `aria-required` while the set is required, `aria-invalid` while
 * `error` is true and `aria-orientation`, and `required-text` is left out of its description, because the state says
 * it. Nothing that is drawn changes, and the group still holds no value, moves no focus and handles no key: selection,
 * the arrow keys and the one tab stop stay the radio buttons' own group's.
 *
 * @tag tanrei-field-group
 * @slot - The controls of the set, in the order given.
 * @csspart label - The label above the controls.
 * @csspart requirement-label - The required or optional tag after the label, or the required asterisk.
 * @csspart supporting-text - The description under the label.
 * @csspart error-text - The error text below the controls.
 */
export class TanreiFieldGroup extends LitElement {
  private readonly availability = new AvailabilityController(this, 'field-group');
  static override styles = styles;

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['label', 'requirement-label', 'supporting-text', 'error-text'];

  static override properties: PropertyDeclarations = {
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    supportingText: { type: String, attribute: 'supporting-text' },
    errorText: { type: String, attribute: 'error-text' },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    requirement: { type: String, reflect: true },
    requiredMark: { type: String, attribute: 'required-mark', reflect: true },
    requiredText: { type: String, attribute: 'required-text' },
    optionalText: { type: String, attribute: 'optional-text' },
    orientation: { type: String, reflect: true },
    spacing: { type: String, reflect: true },
    kind: { type: String, reflect: true },
  };

  /** Names the set, visibly and to assistive technology: the question its controls answer ("Notify me by"). Required. */
  label = '';

  /** Does not draw the label, which stays the accessible name of the group (`label-hidden`). */
  labelHidden = false;

  /** The description: how to answer ("Choose all that apply"), drawn under the label and given to assistive technology as the group's description (`supporting-text`). */
  supportingText = '';

  /** What is wrong with the set as a whole and how to put it right, drawn below the controls while `error` is true (`error-text`). */
  errorText = '';

  /** Puts the set in the error condition: the error text is drawn, and each control that has an error condition of its own (a checkbox, a radio button) is drawn in it. The group never sets this itself. */
  error = false;

  /** Disables every control of the set and draws the frame as disabled. */
  disabled = false;

  /** What the form asks of the set: `required` draws the required mark and says so in the group's description; `optional` draws the optional tag; `none` says and draws nothing. It never validates. */
  requirement: TanreiFieldGroupRequirement = 'none';

  /** How this set shows that it is required (`required-mark`): `tag`, `asterisk` or `none`; `auto` takes the design system's answer (`--tanrei-comp-field-group-requirement-mark`, which follows `--tanrei-sys-behavior-requirement-mark`). */
  requiredMark: TanreiFieldGroupRequiredMark = 'auto';

  /** The text of the required tag, also part of the group's description, because a group has no required state (`required-text`): this instance's words, else the product's (`setWords({ requiredText })`). Tanrei has none: without them the asterisk is drawn in the tag's place and nothing says the requirement to assistive technology. */
  requiredText = '';

  /** The text of the optional tag, also part of the group's description (`optional-text`): this instance's words, else the product's (`setWords({ optionalText })`). Tanrei has none: without them no tag is drawn and nothing is said. */
  optionalText = '';

  /** `vertical` stacks the controls in one column, the form to prefer; `horizontal` lays them out in a row that wraps. */
  orientation: TanreiFieldGroupOrientation = 'vertical';

  /** What the set holds, which decides the distance between its members: `controls` (checkboxes or switches, a touch target apart) or `fields` (the distance a form keeps between two fields). A design system may add values. */
  spacing: TanreiFieldGroupSpacing = 'controls';

  /** What the set is to assistive technology. `group`: a named group of controls that each answer for themselves. `radio-group`: the radio group of the radio buttons it holds, which is required and invalid as a whole and says its orientation. It changes what is exposed and nothing that is drawn, and the group still holds no value: the radio buttons keep their selection, their arrow keys and their tab stop, which their own group gives them — the `<tanrei-radio-group>` they stand in, or their `name`. */
  kind: TanreiFieldGroupKind = 'group';

  /** The group has been drawn once. */
  private drawn = false;

  /** FGR-22: a spacing a design system adds, and one the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'field-group', behavior: 'FGR-22', axes: AXES });

  /** A group inside a group follows the outer group's `disabled`, and takes nothing else from it (FGR-20). */
  private readonly outer = new FieldControlController(this, { takes: 'disabled', framed: true, named: () => true });

  /** FGR-8, FGR-11, FGR-14, FGR-23: what the group gives each control, and takes back (src/primitives/field.ts). */
  private readonly provider = new FieldProviderController(this, {
    controls: () => this.controls,
    // A control that draws an error condition of its own is put in it — a checkbox is told why too, and exposes the
    // invalid state itself; a radio button is only drawn in its error form, because its role has no invalid state and
    // the group says the error once (FGR-10, FGR-11). Every other control — a switch, a field, a group, a radio group —
    // is given `disabled` and nothing else.
    state: (connection) =>
      connection.takes === 'all' && connection.errorCondition ? (connection.control.matches(RADIO_BUTTON) ? this.drawnInError : this.marked) : state({ disabled: this.isDisabled }),
    plain: (element) => (element.matches(PLAIN_ERROR_CONDITION) ? this.marked : { disabled: this.isDisabled }),
  });

  /** FGR-24: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /** FGR-24: the frame's props with requiredText and optionalText read: the prop, else the product's words. */
  private get framed(): FrameProps {
    return frameWithWords(this, this.words);
  }

  /** FGR-25: the set is exposed as the radio group of its radio buttons; any other value of `kind` is a group (FGR-22). */
  private get isRadioGroup(): boolean {
    return this.kind === 'radio-group';
  }

  /** Disabled by its own `disabled` or by a field group around it. */
  private get isDisabled(): boolean {
    return this.disabled || this.outer.disabled;
  }

  /** The elements in the default slot, in the order given. */
  private get controls(): Element[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    return slot ? slot.assignedElements({ flatten: true }) : [...this.children].filter((child) => !child.slot);
  }

  /** FGR-8, FGR-11: what a control with an error condition of its own is given. */
  private get marked(): FieldState {
    return state({ invalid: this.error, description: this.error ? this.errorText : '', disabled: this.isDisabled });
  }

  /** FGR-8, FGR-11: what a radio button is given — its error form, and no description: the group is described, not each option. */
  private get drawnInError(): FieldState {
    return state({ invalid: this.error, disabled: this.isDisabled });
  }

  /** FGR-23: a control came, left or moved. */
  private onSlotChange() {
    this.requestUpdate();
  }

  protected override updated(changed: PropertyValues) {
    // FGR-6: the design system's required mark, for a browser without style queries.
    syncFrameMark(this, this.renderRoot, PREFIX);
    // FGR-11, FGR-23: every control is told at once; one that left gets back what it had.
    this.provider.sync();
    // FGR-9: an error that appears, or changes its words, while focus is inside the group is announced once, politely.
    if (this.drawn && this.error && (changed.has('error') || changed.has('errorText')) && this.matches(':focus-within')) frameAnnounce(this.renderRoot, this.errorText);
    this.drawn = true;
    this.reports(changed);
  }

  /** What a debug build tells the developer; the group still renders. */
  private reports(changed: PropertyValues) {
    // FGR-24: a group says the requirement in words whichever mark is drawn; a radio group's required state needs none,
    // so its word is missed only where the tag would be drawn.
    reportFrame(this, this.framed, changed, { unknown: 'FGR-22', words: 'FGR-24' }, this.words, { prefix: PREFIX, always: !this.isRadioGroup });
    if (changed.has('orientation') && !(GROUP_ORIENTATIONS as readonly string[]).includes(this.orientation)) {
      report(this, 'FGR-22', `orientation "${this.orientation}" is not vertical or horizontal; it is drawn as "vertical"`);
    }
    // FGR-10: a set without a name still renders.
    if (changed.has('label') && !this.label) report(this, 'FGR-10', 'label is empty, so the set has no accessible name; give it a label (labelHidden hides it and keeps the name)');
    const controls = this.controls;
    // FGR-20: a set without a control still draws its rows.
    if (!controls.length) report(this, 'FGR-20', 'the field group holds no control; put the controls of the set in its default slot');
    if (changed.has('kind') && !(KINDS as readonly string[]).includes(this.kind)) report(this, 'FGR-22', `kind "${this.kind}" is not group or radio-group; the set is exposed as a group`);
    if (!this.isRadioGroup) {
      // FGR-15: radio buttons are framed like any control, and nothing a set of them needs is added.
      if (controls.some((element) => element.matches(RADIO_BUTTON))) {
        report(this, 'FGR-15', 'the field group holds radio buttons, which it frames and does not group: a set of radio buttons is a radio group (RGP-1), or, written by hand, a field group whose kind is radio-group (FGR-25)');
      }
      return;
    }
    // FGR-25: the radio buttons of one group, and no other control.
    const other = [...this.provider.connections.keys()].some((control) => !control.matches(RADIO_BUTTON)) || controls.some((element) => !element.matches(RADIO_BUTTON) && (element.matches(OPERABLE) || !!element.querySelector(`:is(${OPERABLE}):not(${RADIO_BUTTON})`)));
    if (other) report(this, 'FGR-25', 'the field group is a radio group and holds a control that is not a radio button; it holds the radio buttons of one group and nothing else that can be operated');
    // One group: the radio group they stand in, or one name. The set's radio buttons are its controls and those inside
    // the product's own elements — none of a set of its own that stands among them, which is one member and reported above.
    const radios = controls.flatMap((element) => (element.matches(RADIO_BUTTON) ? [element] : [...element.querySelectorAll(RADIO_BUTTON)].filter((radio) => !element.contains(radio.closest(SETS)))));
    const groups = new Set(radios.map((radio) => radio.closest('tanrei-radio-group') ?? (radio as Element & { name?: string }).name ?? radio.getAttribute('name') ?? ''));
    if (groups.size > 1) report(this, 'FGR-25', 'the field group is a radio group and holds radio buttons of more than one group; give the radio buttons of the set one name');
    if (changed.has('spacing') || changed.has('kind')) {
      if (this.spacing !== 'controls') report(this, 'FGR-25', `the field group is a radio group, whose radio buttons are controls; spacing "${this.spacing}" is for another kind of set`);
    }
  }

  protected override render() {
    const disabled = this.isDisabled;
    const framed = this.framed;
    const radioGroup = this.isRadioGroup;
    const semantics = radioGroup ? RADIO_GROUP : undefined;
    const rows = groupRows(framed, semantics);
    const spacing = (CORE_SPACINGS as readonly string[]).includes(this.spacing) ? this.spacing : 'controls';
    // FGR-10: a fieldset with a legend — a group that contains its controls (the accessibility tree is built from the
    // flattened tree) and is named by its label, drawn or not. FGR-11: it is described by the rows of the same shadow
    // root. FGR-14: the group is exposed as disabled; its `disabled` attribute would not reach the slotted controls,
    // which are told one by one.
    //
    // FGR-25: in the radio-group kind the same fieldset carries the radio group's role — one radio group in the group's
    // place, never one inside the other — named by its legend, with the role's required and invalid states and its
    // orientation as attributes of this element, which the accessibility checks can see (they cannot see a role given
    // through ElementInternals). Nothing else differs, so the two kinds are the same picture.
    return html`
      <fieldset
        class="group"
        role=${radioGroup ? 'radiogroup' : nothing}
        aria-labelledby=${radioGroup && this.label ? LEGEND : nothing}
        aria-describedby=${groupDescribedBy(framed, semantics) ?? nothing}
        aria-required=${radioGroup && frameRequirement(this) === 'required' ? 'true' : nothing}
        aria-invalid=${radioGroup && this.error ? 'true' : nothing}
        aria-orientation=${radioGroup ? groupOrientation(this.orientation) : nothing}
        aria-disabled=${disabled ? 'true' : nothing}
        ?data-labelled=${rows.labelled}
        ?data-described=${rows.described}
        ?data-error=${this.error}
        ?data-disabled=${disabled}
      >
        ${this.label ? html`<legend class="legend" id=${radioGroup ? LEGEND : nothing} ?data-unseen=${!rows.labelled}>${rows.labelled ? rows.label : this.label}</legend>` : nothing} ${rows.description}
        <div class="controls" data-orientation=${groupOrientation(this.orientation)} data-spacing=${spacing}><slot @slotchange=${this.onSlotChange}></slot></div>
        ${rows.error} ${rows.unseen}
      </fieldset>
    `;
  }
}

if (!customElements.get('tanrei-field-group')) customElements.define('tanrei-field-group', TanreiFieldGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-field-group': TanreiFieldGroup;
  }
}
