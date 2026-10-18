import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { AvailabilityController, FieldControlController, FieldProviderController, type FieldSays, type FieldState, GlyphMirrorController, SystemWatchController, WordsController, compChoice, composedContains, namesItself, report } from '../../primitives/index.js';
import {
  type FrameRequiredMark,
  type FrameRequirement,
  SYSTEM_MARKS,
  frameAnnounce,
  frameAnnouncer,
  frameErrorText,
  frameLabelIcon,
  frameLabelRow,
  frameLabelled,
  frameMark,
  frameOptionalText,
  frameRequirement,
  frameText,
  frameWithWords,
  type FrameProps,
  reportFrame,
  syncFrameMark,
} from '../../primitives/field-frame.js';
import { ownDirection } from '../../styles/product-text.js';
import { PREFIX, styles } from './field.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** FLD-21: a run of the value text that is isolated already (a first-strong isolate: one of a range's two values) has its own direction and gives the whole text none. */
const ISOLATED = /\u2068[^\u2069]*\u2069/g;

/** What the form asks of the control: nothing, an answer, or that it may be left out. */
export type TanreiFieldRequirement = FrameRequirement;
/** How a required control is marked: the design system's answer (auto), a tag, an asterisk, or nothing. */
export type TanreiFieldRequiredMark = FrameRequiredMark;

/**
 * FLD-1: the fields whose control's display is read in this turn, read together — after every field of the turn has
 * drawn, one after the other with no write between them: one style pass for a page of fields, where a field that read
 * in its own update would cost one each.
 */
const toFlow = new Set<TanreiField>();
function flowTogether(field: TanreiField) {
  if (!toFlow.size) {
    queueMicrotask(() => {
      const fields = [...toFlow];
      toFlow.clear();
      for (const each of fields) if (each.isConnected) each.flow();
    });
  }
  toFlow.add(field);
}

/** FLD-7: where the error text stands beside the help — `comp.field.error-text.placement`, by name; the first is what an unknown one behaves as. */
const PLACEMENTS = ['replace', 'append'] as const;

/** What a control that takes only the field's `disabled` is given. */
const ONLY_DISABLED = (disabled: boolean): FieldState => ({ label: '', description: '', invalid: false, required: false, requiredText: '', disabled });

/**
 * Frames one control with what a form gives every field: a label above it that can say the control is required or
 * optional, a line of help, and the reason a value was refused, each tied to the control for assistive technology. It
 * is a frame, never a control.
 *
 * Contract: specs/field.spec.json. `<tanrei-field label="Volume"><tanrei-slider></tanrei-slider></tanrei-field>`: the
 * control is the one element in the default slot. It stays in the product's light DOM, so it keeps its place in a
 * `<form>`, its `name` and `value`, its events and its styles; the field is not form-associated, holds no value and
 * emits no event. Every visual value is a `--tanrei-comp-field-*` token.
 *
 * The label names the control; the help describes it, with the error text after it while the field is in error and
 * `optional-text` after that while the control is optional. They are given as values, because an id cannot be referenced across a shadow root: a Tanrei
 * control asks for them (the composed `tanrei-field-connect` event; `src/primitives/field.ts`) and writes them on the
 * element that carries its semantics, its own `label` winning; any other element receives `aria-label` (only where it
 * has no name of its own), `aria-description`, `aria-invalid`, `aria-required` and, where it has the property,
 * `disabled`. The field takes back exactly what it gave when the element leaves the slot.
 *
 * `requirement="required"` exposes the control as required and draws the required mark beside the label — a small
 * filled tag, an asterisk or nothing, as the design system or `required-mark` says; `requirement="optional"` draws the
 * optional tag. Neither validates: `error` is the product's to set, and `error-text` says what is wrong in words. While
 * the field is in error the error text takes the help's place, so a form in error is no taller than at rest; a design
 * system whose `--tanrei-comp-field-error-text-placement` is `append` keeps the help and draws the error text below
 * it. A disabled field draws its requirement tag as a tag inside something disabled. An error that appears while
 * focus is inside the field is announced once, politely — the error text alone, never the help again.
 *
 * A press on the label moves focus to the control and never operates it; a press on the help, the error or the count
 * does nothing. A control that names itself (a checkbox with its own label) takes a field with an empty `label`, which
 * then adds help and an error only. A control that is a field already — a composed field such as
 * `<tanrei-text-field>`, which is this element around `<tanrei-text-input>`, or anything with a `supportingText` of its
 * own — needs no field.
 *
 * A control may say of itself what only it knows, through the same connection (`src/primitives/field.ts`): that it
 * draws the label itself, floating in its own box — the field then draws no label row and gives the control the name,
 * whether it is hidden, and an asterisk or none for a required one (FLD-25); how far its content is inset — the
 * supporting row starts and ends there (FLD-26); and that it refused what was entered, with its words — the field is
 * then in its error condition and shows them as its error text (FLD-28); and that it is drawn focused though focus is elsewhere — a
 * combobox or a select for as long as its list is open — so that the field's rows are drawn focused with it (FLD-13).
 * `count-text` is a count about the control's value as it is to
 * be drawn ("12/40"), at the end of the supporting row: the field draws it, never counts, and keeps it from assistive
 * technology, which hears the count from the control (FLD-27). `value-text` is the control's present value in words
 * ("40 %"), at the end of the label row, for a control whose value cannot be read from the control itself (a slider):
 * the field draws it, never reads or formats a value, and keeps it from assistive technology, which hears the value
 * from the control (FLD-29, FLD-30).
 *
 * @tag tanrei-field
 * @slot - The one control the field frames.
 * @slot label-icon - A glyph of the icon set before the label; decorative. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart label - The label above the control.
 * @csspart label-icon - The box of the label's glyph.
 * @csspart requirement-label - The required or optional tag after the label, or the required asterisk.
 * @csspart value-text - The control's value in words the field is given (`value-text`), at the end of the label row.
 * @csspart supporting-text - The help below the control; not drawn while the error text stands in its place.
 * @csspart error-text - The error text: in the help's place, directly below the control, or below the help where the design system keeps both (`--tanrei-comp-field-error-text-placement: append`); there only while the field is in error and has words for it.
 * @csspart counter - The count the field is given (`count-text`), at the end of the supporting row's first line.
 */
export class TanreiField extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'field');
  static override styles = styles;

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['label', 'label-icon', 'requirement-label', 'value-text', 'supporting-text', 'error-text', 'counter'];

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
    countText: { type: String, attribute: 'count-text' },
    valueText: { type: String, attribute: 'value-text' },
    hasLabelIcon: { state: true },
    focused: { state: true },
    inline: { state: true },
  };

  /** Names the control, visibly and to assistive technology. Required, unless the control names itself (a checkbox or a switch with its own label): then leave it empty and the field adds only help and an error. */
  label = '';

  /** Does not draw the label, which stays the accessible name (`label-hidden`). For a control whose visible label is elsewhere. */
  labelHidden = false;

  /** Help shown below the control and given to assistive technology as the control's description (`supporting-text`). While the field is in error it gives way to `errorText`, unless the design system keeps both (`--tanrei-comp-field-error-text-placement: append`). */
  supportingText = '';

  /** Shown while `error` is true, in `supportingText`'s place (below it, which stays, where the design system says `append`): what is wrong with this answer and how to put it right, in words (`error-text`). */
  errorText = '';

  /** Puts the field in the error condition: the error text is drawn, the control is exposed as invalid and, where it has an error condition of its own, drawn in it. The field never sets this itself. */
  error = false;

  /** Disables the control and draws the frame as disabled. Disable a framed control here, not on the control, so that its label follows. */
  disabled = false;

  /** What the form asks of the control: `required` exposes it as required and draws the required mark; `optional` draws the optional tag; `none` says and draws nothing. It never validates. */
  requirement: TanreiFieldRequirement = 'none';

  /** How this control shows that it is required (`required-mark`): `tag` is a small filled tag with `requiredText`, `asterisk` is "*" after the label, `none` draws nothing and keeps the semantics; `auto` takes the design system's answer (`--tanrei-comp-field-requirement-mark`, which follows `--tanrei-sys-behavior-requirement-mark`). */
  requiredMark: TanreiFieldRequiredMark = 'auto';

  /** The text of the required tag (`required-text`): this instance's words, else the product's (`setWords({ requiredText })`). Tanrei has none: without them the asterisk is drawn in the tag's place and the required state is kept. */
  requiredText = '';

  /** The text of the optional tag, also part of the description (`optional-text`): this instance's words, else the product's (`setWords({ optionalText })`). Tanrei has none: without them no tag is drawn and nothing is said. */
  optionalText = '';

  /** A count about the control's value, as it is to be drawn ("12/40"), at the end of the supporting row's first line (`count-text`). For a control that keeps a count (a text input whose `counter` is set): the product's to write from the control's own count, or the composed element's that holds the field. Kept from assistive technology, because the control says its own count. */
  countText = '';

  /** The control's present value in words ("40 %", "$100 – $300"), drawn at the end of the label row (`value-text`). For a control whose value cannot be read from the control itself (a slider): the product's to write from the control's own value at each `input`, or the composed element's that holds the field. Not drawn while the label is not. Kept from assistive technology, because the control says its own value. */
  valueText = '';

  /** Whether the label-icon slot has content. */
  protected hasLabelIcon = false;
  /** FLD-13: focus is inside the field. */
  protected focused = false;
  /** FLD-1: the control is an inline-level box, with a size of its own. */
  protected inline = false;
  /** The field has been drawn once. */
  private drawn = false;
  /** FLD-28: the words of the refusal last shown (null: none), so that a new one is announced once. */
  private refused: string | null = null;
  /** FLD-25: the design system's required mark is read by script for a control that draws the label itself; read again when the system is switched. */
  private readonly system = new SystemWatchController(this);

  /** FLD-20: the glyph in the label-icon slot is marked when the icon set mirrors it in right-to-left (src/primitives/glyph-mirror.ts). */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="label-icon"]' });

  /** A field inside a field group follows the group's `disabled`, and takes nothing else from it (FGR-20). */
  private readonly outer = new FieldControlController(this, { takes: 'disabled', framed: true, named: () => true });

  /** FLD-8, FLD-10, FLD-11, FLD-14, FLD-23: what the field gives its control, and takes back (src/primitives/field.ts). */
  private readonly provider = new FieldProviderController(this, {
    controls: () => this.controls,
    state: (connection, index) => (connection.takes === 'disabled' || index !== 0 ? ONLY_DISABLED(this.isDisabled) : this.given),
    plain: (element, index) => (index !== 0 || 'supportingText' in element ? { disabled: this.isDisabled } : this.given),
  });

  constructor() {
    super();
    // FLD-13: focus inside the field, however it was gained, selects the focused tokens.
    this.addEventListener('focusin', () => (this.focused = true));
    this.addEventListener('focusout', (event) => (this.focused = composedContains(this, event.relatedTarget as Node | null)));
  }

  /** FLD-24: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /** FLD-24: the frame's props with requiredText and optionalText read: the prop, else the product's words. */
  private get framed(): FrameProps {
    return frameWithWords(this, this.words);
  }

  /** Disabled by its own `disabled` or by a field group around it. */
  private get isDisabled(): boolean {
    return this.disabled || this.outer.disabled;
  }

  /** The elements in the default slot, in the order given. The first is the control (FLD-15). */
  private get controls(): Element[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    return slot ? slot.assignedElements({ flatten: true }) : [...this.children].filter((child) => !child.slot);
  }

  /** FLD-25, FLD-26, FLD-28: what the control says of itself now; nothing for a control that says nothing. */
  private get said(): FieldSays {
    return this.provider.says(this.controls[0]);
  }

  /** FLD-8, FLD-28: the error condition — `error`, or the control's own refusal of an entry while it lasts. */
  private inError(said: FieldSays): boolean {
    return this.error || !!said.refusal;
  }

  /**
   * FLD-31, FLD-28: the error text the supporting row shows (where FLD-7 puts it) — a refusal's own words,
   * `errorText` while it has none; `errorText` while `error` is true; nothing while the field is not in error, or is in
   * error without words.
   */
  private shownError(said: FieldSays): string {
    return said.refusal ? said.refusal.text || this.errorText : frameErrorText(this);
  }

  /**
   * FLD-7, FLD-11: the help as the supporting row draws it — not while the error text stands in its place
   * (`comp.field.error-text.placement` replace, the first value); always under append. The design system's choice is
   * read from the cascade only where the field has both a help and an error text, and read again at every render: the
   * field draws again when the system is switched.
   */
  private shownHelp(error: string): string {
    if (!this.supportingText || !error) return this.supportingText;
    return compChoice(this, `${PREFIX}-error-text-placement`, PLACEMENTS) === 'append' ? this.supportingText : '';
  }

  /**
   * FLD-25: the required mark a control that draws the label itself is given: an asterisk while the control is required
   * and the mark FLD-6 names — this field's own, else the design system's — is the tag or the asterisk; none otherwise.
   * The cascade is read only for such a control, required, under `requiredMark: auto`.
   */
  private givenMark(said: FieldSays): 'asterisk' | 'none' {
    if (!said.drawsLabel) return 'none';
    const mark = frameMark({ label: this.label, labelHidden: this.labelHidden, requirement: this.requirement, requiredMark: this.requiredMark });
    const named = mark === 'auto' ? compChoice(this, `${PREFIX}-requirement-mark`, SYSTEM_MARKS) : mark;
    return named === 'none' ? 'none' : 'asterisk';
  }

  /** FLD-10, FLD-11, FLD-8, FLD-14, FLD-25: the name, the description and the states the control is given, and how it draws the label where it draws it. */
  private get given(): FieldState {
    const framed = this.framed;
    const said = this.said;
    const wrong = this.shownError(said);
    return {
      label: this.label,
      // FLD-11: what the supporting row draws — the help, the error text in its place or after it — then the optional
      // text: the order in which a field group describes its set.
      description: [this.shownHelp(wrong), wrong, frameOptionalText(framed)].filter(Boolean).join(' '),
      invalid: this.inError(said),
      required: frameRequirement(this) === 'required',
      requiredText: framed.requiredText,
      disabled: this.isDisabled,
      labelHidden: this.labelHidden,
      requiredMark: this.givenMark(said),
      // FLD-25: the optional word, which a control that draws the label itself draws after it.
      optionalText: said.drawsLabel && frameLabelled(this) ? frameOptionalText(framed) : '',
    };
  }

  /**
   * FLD-12: a press on the label, the label glyph or the requirement mark moves focus to the control and does nothing
   * else — it does not activate, switch or change it. Not while disabled (FLD-14).
   */
  private onLabelPress(event: MouseEvent) {
    if (event.button !== 0 || this.isDisabled) return;
    const control = this.controls[0] as HTMLElement | undefined;
    // The press must not take the focus it has just given (or select the label's text).
    event.preventDefault();
    control?.focus?.();
  }

  private onLabelIconSlotChange(event: Event) {
    this.hasLabelIcon = (event.target as HTMLSlotElement).assignedNodes({ flatten: true }).some((node) => node.nodeType === Node.ELEMENT_NODE || !!node.textContent?.trim());
  }

  /** FLD-23: the control was replaced, or came, or left. */
  private onSlotChange() {
    this.flow();
    this.requestUpdate();
  }

  /**
   * FLD-1: whether the control is an inline-level box. Its computed display says so only while it stands in a block's
   * flow, so the column is undone for the reading.
   */
  /** @internal */
  flow() {
    const box = this.renderRoot.querySelector<HTMLElement>('.control');
    const first = this.controls[0];
    if (!box) return;
    // (Nothing is written where the column is not set: a page of fields then reads without a write between two.)
    const was = box.hasAttribute('data-inline');
    if (was) box.removeAttribute('data-inline');
    const inline = !!first && getComputedStyle(first).display.startsWith('inline');
    if (was) box.setAttribute('data-inline', '');
    this.inline = inline;
  }

  protected override willUpdate(changed: PropertyValues) {
    // The first render already draws the glyph's room: the light-DOM children are there before the slot says so.
    if (!this.hasUpdated) this.hasLabelIcon = [...this.children].some((child) => child.slot === 'label-icon');
    if (changed.has('disabled') && this.isDisabled) this.focused = false;
  }

  protected override updated(changed: PropertyValues) {
    // FLD-6: the design system's required mark, for a browser without style queries.
    syncFrameMark(this, this.renderRoot, PREFIX);
    // FLD-11, FLD-23: the control is told at once; one that left gets back what it had.
    this.provider.sync();
    // FLD-1: the first reading, and a control that was defined, or asked, after the field rendered (an update no
    // property caused).
    if (changed.size === 0 || !this.drawn) flowTogether(this);
    // FLD-9: an error that appears, or changes its words, while focus is inside the field is announced once, politely —
    // the error text alone: the help has not changed and is not said again.
    // (Never what the field was first drawn with: that is read with the control.)
    // FLD-28: and so is the control's own refusal of an entry, when it begins or changes its words.
    const said = this.said;
    const refused = said.refusal ? this.shownError(said) : null;
    const refusedAnew = refused !== null && refused !== this.refused;
    this.refused = refused;
    // (Focus is asked of the document too: a control that refuses an entry as focus leaves it says so before the
    // field has heard that focus left.)
    if (this.drawn && this.inError(said) && this.focused && this.matches(':focus-within') && (changed.has('error') || changed.has('errorText') || refusedAnew)) frameAnnounce(this.renderRoot, this.shownError(said));
    this.drawn = true;
    this.reports(changed);
  }

  /** What a debug build tells the developer; the field still renders. */
  private reports(changed: PropertyValues) {
    const said = this.said;
    const floats = !!said.drawsLabel;
    // FLD-24: the required word is needed only where the tag would be drawn — not beside a label the control draws.
    reportFrame(this, this.framed, changed, { unknown: 'FLD-22', words: 'FLD-24' }, this.words, { prefix: PREFIX, row: !floats });
    const labelled = frameLabelled(this) && !floats;
    // FLD-3: the glyph is not drawn while the label is not — hidden, empty, or drawn by the control itself (FLD-25).
    if (!labelled && this.querySelector(':scope > [slot="label-icon"]')) {
      report(this, 'FLD-3', floats ? 'the label-icon slot is not drawn where the control draws the label itself, floating in its own box; remove the glyph' : 'the label-icon slot is not drawn while the label is not drawn; give the field a label, or remove the glyph');
    }
    // FLD-28: a refusal neither the control nor the field has words for is still marked, and reported.
    if (said.refusal && !said.refusal.text && !this.errorText) {
      report(this, 'FLD-28', 'the control refused what was entered and neither it nor the field has words for it; give the control the words of its refusal, or the field an errorText');
    }
    const controls = this.controls;
    const first = controls[0];
    // FLD-15: exactly one control.
    if (!first) {
      report(this, 'FLD-15', 'the field has no control; put the one control it frames in its default slot');
      return;
    }
    if (controls.length > 1) report(this, 'FLD-15', `the field holds ${controls.length} controls and names, describes and marks only the first; a set of controls is a field group`);
    // An element that is not defined yet says nothing about itself.
    if (first.localName.includes('-') && !customElements.get(first.localName)) return;
    const connection = this.provider.connectionIn(first);
    // An element that has not drawn itself yet has not said what it is — a composed field's frame asks only once the
    // field has rendered it: the field looks again when the element has.
    const drawing = first as Element & { hasUpdated?: boolean; updateComplete?: Promise<unknown> };
    if (!connection && drawing.hasUpdated === false && drawing.updateComplete) {
      void drawing.updateComplete.then(() => this.isConnected && this.requestUpdate());
      return;
    }
    if (connection?.framed || (!connection && 'supportingText' in first)) {
      // A composed field is a Field and its one control: the frame that answered is inside it, around the bare control.
      const bare = connection && connection.control !== first ? [...connection.control.children].find((child) => !child.slot)?.localName : undefined;
      report(
        this,
        'FLD-15',
        bare
          ? `<${first.localName}> is already a field — a Field around <${bare}>, with its own label, help and error; use it without a field, or frame the bare control, <${bare}>`
          : `<${first.localName}> draws its own label, help and error, so it is already a field; use it without a field`,
      );
      return;
    }
    // FLD-10: one name, and only one.
    const named = connection ? connection.named() : namesItself(first);
    if (labelled && named) report(this, 'FLD-10', `<${first.localName}> names itself and stands under the field's label, so the control has two labels; leave the field's label empty, or the control's`);
    if (!this.label && !named) report(this, 'FLD-10', 'label is empty and the control has no name of its own, so the control has no accessible name; give the field a label (labelHidden hides it and keeps the name)');
  }

  protected override render() {
    const disabled = this.isDisabled;
    const said = this.said;
    // FLD-7, FLD-31: the error text while the field is in error and has words — in the help's place, or below the help,
    // which then stays, as comp.field.error-text.placement names.
    const wrong = this.shownError(said);
    const help = this.shownHelp(wrong);
    const framed = this.framed;
    // FLD-26: the supporting row starts and ends where the control says its content does.
    const inset = said.inset ? `--_inset-start: ${said.inset.start}; --_inset-end: ${said.inset.end}` : undefined;
    // FLD-13: the rows are drawn focused while focus is inside the field, or while its control says that it is drawn
    // focused (a select or a combobox for as long as its list is open, whether or not it has focus).
    // The label is the control's accessible name as a value, so the drawn text is hidden from assistive technology: it
    // is announced once, as the name, and not a second time as text. The supporting row stays readable as text, as a
    // text field's does, so that a disabled field's help can still be read (FLD-14).
    const row = frameLabelRow({
          label: this.label,
          // FLD-25: no label row, glyph or tag where the control draws the label itself.
          labelHidden: this.labelHidden || !!said.drawsLabel,
          requirement: this.requirement,
          requiredMark: this.requiredMark,
          requiredText: framed.requiredText,
          optionalText: framed.optionalText,
          glyph: frameLabelIcon(this.onLabelIconSlotChange),
          hasGlyph: this.hasLabelIcon,
          labelHidden_: true,
          disabled,
          onPress: this.onLabelPress,
        });
    return html`
      <div class="frame" ?data-error=${this.inError(said)} ?data-disabled=${disabled} ?data-focused=${(this.focused || !!said.drawnFocused) && !disabled}>
        ${
          // FLD-29, FLD-30: the value text shares the label's line, at its end — only while the label row is drawn.
          row !== nothing && this.valueText
            ? html`<div class="label-line">
                ${row}<span part="value-text" class="value-text" ?data-own-direction=${ownDirection(this.valueText.replace(ISOLATED, '')) === 'auto'} aria-hidden="true" aria-disabled=${ifDefined(disabled ? 'true' : undefined)} @mousedown=${this.onLabelPress}>${this.valueText}</span>
              </div>`
            : row
        }
        <div class="control" ?data-inline=${this.inline}><slot @slotchange=${this.onSlotChange}></slot></div>
        ${help || wrong || this.countText
          ? html`<div class="supporting" style=${ifDefined(inset)}>
              ${help || wrong
                ? html`<div class="texts">${frameText(help, { id: 'supporting', disabled })}${frameText(wrong, { id: 'error', part: 'error-text', className: 'error-text', disabled })}</div>`
                : nothing}${this.countText
                ? html`<span part="counter" class="counter" aria-hidden="true" aria-disabled=${ifDefined(disabled ? 'true' : undefined)}>${this.countText}</span>`
                : nothing}
            </div>`
          : nothing}
        ${frameAnnouncer()}
      </div>
    `;
  }
}

if (!customElements.get('tanrei-field')) customElements.define('tanrei-field', TanreiField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-field': TanreiField;
  }
}
