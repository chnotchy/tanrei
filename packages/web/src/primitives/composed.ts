// The web's way of composing (W1 to W14), built once. A composed element is a custom element whose shadow root holds its members' OWN custom
// elements, by their tags — never a copy of what they draw. What is here is everything such an element needs besides
// its template (README "Composed elements" is the builder's guide):
//
//   ComposedElement  — the base of every composed element: focus passed to the control without delegating it (W7), a
//                      slot passed on only while it is filled (W9), the Field's connection left alone and asked again
//                      through the element (W8), `updateComplete` that waits for the members, the debug report for an
//                      ARIA name on the host (W8).
//   ComposedControl  — a composed element with a value member: the value that is the member's at every moment (W5) and
//                      the form — the element is the form's control and repeats what its value member tells its own
//                      internals (W6). `memberUpdated()` is where an element fills a member's prop from what its value
//                      member holds (W14, `fills`).
//   forward()        — src/primitives/forward.ts: a directive on a member's tag — each named property of the composed
//                      element set on the member, as a property, on every render (W2).
//   exported()       — a member's documented parts as an `exportparts` value, from the list its class keeps (W4).
//
// The element writes no custom property and reads no token of a member (W3): nothing here touches a style.
import { type CSSResultGroup, LitElement, type PropertyDeclarations, type PropertyValues, type TemplateResult, css, html, nothing } from 'lit';
import { FIELD_CONTROL } from './field.js';
import { takeFormDisabled } from './form-disabled.js';
import { type FormEntry, type FormWord, formSaysOf } from './form-says.js';
import { hiddenHost } from './hidden.js';
import { report } from './report.js';
import { disabledWaitsWhileFocused } from './disabled-while-focused.js';
import { wantsAutofocus } from './autofocus.js';

export { forward } from './forward.js';

// ─── W4: parts ───────────────────────────────────────────────────────────────────────────────────────────────────

/** What a class that can be a member offers for W4: its documented parts, once (`static readonly parts`). */
export interface WithParts {
  readonly parts: readonly string[];
}

/** A part of a member whose name another member has too: the name it is exported under, and whether the bare name is kept. */
export interface Collision {
  /** The name it is always exported under: the member's name before the part's (`field-label`). */
  as: string;
  /** Also under the bare name: only where the two parts are one thing to a person and never drawn at once (W4, item 2). */
  bare?: boolean;
}

/**
 * W4: a member's documented parts for the composed element — `attribute` is the member's `exportparts`, `names` what
 * `::part()` on the composed element can then name. Made from the member's own list, never written by hand. `collisions`
 * says, for a part whose name two members share, the prefixed name it is always exported under and whether the bare
 * name is exported too (`exportparts="label, label: field-label"`). `omit` names the parts of the member that the
 * composed element never draws and so does not export — a Field's `counter`, in a field that gives its Field no count.
 */
export function exported(member: WithParts, collisions: Record<string, Collision> = {}, omit: readonly string[] = []): { attribute: string; names: string[] } {
  const entries: string[] = [];
  const names: string[] = [];
  for (const part of member.parts) {
    if (omit.includes(part)) continue;
    const collision = collisions[part];
    if (!collision) {
      entries.push(part);
      names.push(part);
      continue;
    }
    if (collision.bare) {
      entries.push(part);
      names.push(part);
    }
    entries.push(`${part}: ${collision.as}`);
    names.push(collision.as);
  }
  return { attribute: entries.join(', '), names };
}

// ─── The base ────────────────────────────────────────────────────────────────────────────────────────────────────

/** W1: a composed element's own stylesheet where it has no part and no arrangement of its own — the host is a block. */
export const composedHost = css`
  :host {
    display: block;
  }
`;

type Updating = Element & { updateComplete?: Promise<unknown> };
type Asking = Record<symbol, { ask?: () => void } | undefined>;

/**
 * W8: a frame defined after the controls inside it asks each of its descendants to ask again (`FIELD_CONTROL`), and
 * cannot see into a shadow root: the composed element keeps, under the same key a control does, a way to have its
 * members ask. One that has its answer already does nothing; the frame member's own question then leaves the element.
 */
function passAsking(host: Element, members: () => Element[]) {
  (host as unknown as Asking)[FIELD_CONTROL] = { ask: () => members().forEach((member) => (member as unknown as Asking)[FIELD_CONTROL]?.ask?.()) };
}

/**
 * The base of a composed element (W1, W7, W8, W9). A subclass renders its members' own elements —
 * `<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)}>` — and says which of them
 * focus goes to (`control`).
 *
 * The shadow root does not delegate focus (W7): a press on text that is not a control must move no focus. The host is
 * never focusable; `focus()` and `blur()` are the control's, a click that arrives on the host itself — a page's own
 * `<label for>` — moves focus to the control, and `autofocus` on the host reaches the control when the element first
 * renders.
 */
export abstract class ComposedElement extends LitElement {
  static override styles: CSSResultGroup = [composedHost, hiddenHost];

  /** W7: the member focus goes to, once rendered. */
  protected abstract get control(): HTMLElement | null;

  /**
   * W8: the sentence a debug build names when the host is given an ARIA name. The host has no role: its name is the
   * frame's `label`. Empty: nothing is reported.
   */
  protected readonly hostNameSentence: string = '';

  /** W9: the names of the slots it has passed on, and the watch on its own children for them. */
  private readonly passing = new Set<string>();
  private children_: MutationObserver | null = null;
  private focusedAtFirst = false;

  constructor() {
    super();
    // W7, item 3: a click on the host itself is not a press inside it (whose first target is a member's): it is what a
    // page's `<label for>` sends its control.
    this.addEventListener('click', (event) => {
      if (event.composedPath()[0] === this) this.control?.focus();
    });
    passAsking(this, () => this.members);
  }

  /** The members it has rendered: the custom elements of its own shadow tree. */
  protected get members(): Updating[] {
    return [...(this.renderRoot?.querySelectorAll('*') ?? [])].filter((element) => element.localName.includes('-'));
  }

  /** W7, item 2: focus is the control's. */
  override focus(options?: FocusOptions) {
    this.control?.focus(options);
  }

  /** W7, item 2: what has focus inside the control loses it (an engine does not take it from inside a host it blurs). */
  override blur() {
    let active = this.shadowRoot?.activeElement ?? null;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    (active as HTMLElement | null)?.blur();
  }

  /**
   * W9: a slot of a member, passed on — `${this.pass('label-icon')}` among that member's children. Rendered only while
   * the element has a child for it: a member that draws room for a filled slot would take a passing slot that is
   * always there for content.
   */
  protected pass(name: string): TemplateResult | typeof nothing {
    if (!this.passing.has(name)) {
      this.passing.add(name);
      this.watchChildren();
    }
    return [...this.children].some((child) => child.slot === name) ? html`<slot name=${name} slot=${name}></slot>` : nothing;
  }

  private watchChildren() {
    if (this.children_ || !this.passing.size || typeof MutationObserver === 'undefined') return;
    this.children_ = new MutationObserver(() => this.requestUpdate());
    // The element's own children and the slot each of them names; nothing below them.
    this.children_.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['slot'] });
  }

  override connectedCallback() {
    super.connectedCallback();
    this.watchChildren();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children_?.disconnect();
    this.children_ = null;
  }

  /** The element has updated when its members have: what it gave them, they have taken. */
  protected override async getUpdateComplete(): Promise<boolean> {
    const done = await super.getUpdateComplete();
    await Promise.all(this.members.map((member) => member.updateComplete));
    return done;
  }

  protected override updated(changed: PropertyValues) {
    super.updated(changed);
    // W7, item 4: `autofocus` on the host. The browser focuses nothing for it — the host is not focusable — so the
    // element gives the control focus itself, once, when it first renders, and only where the page has given focus to
    // nothing else (as the browser's own autofocus does).
    if (!this.focusedAtFirst) {
      this.focusedAtFirst = true;
      if (wantsAutofocus(this)) void this.focusWhenReady();
    }
    // W8: the host has no role, so an ARIA name on it names nothing a person meets.
    if (this.hostNameSentence && (this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby'))) {
      report(this, this.hostNameSentence, 'aria-label and aria-labelledby on the element name nothing: it has no role; name it with label (labelHidden keeps the name and draws none)');
    }
  }

  /** The control has rendered what takes focus only after its own first update. */
  private async focusWhenReady() {
    await this.updateComplete;
    if (this.isConnected) this.control?.focus();
  }
}

// ─── W5, W6: a composed element with a value ─────────────────────────────────────────────────────────────────────

/** What a value member is: a control with a `value`, which a form restores by the platform's own callback. */
export interface ValueMember<V> extends HTMLElement {
  value: V;
  formStateRestoreCallback?: (state: FormEntry, mode: 'restore' | 'autocomplete') => void;
}

/**
 * A composed element with a value member (W5, W6). The subclass names the member (`valueMember`) and writes the
 * `value` accessor in place, on these two:
 *
 *     get value(): string { return this.memberValue(''); }
 *     set value(value: string) { this.giveValue(value); }
 *
 * **The value is the member's at every moment** (W5): what was last set on the element until the member has taken it
 * — the element's next render — and from then on what the member holds. So in every listener of a member's event,
 * capturing or bubbling, `event.target.value` is the new value, and a value the member changed is read back changed.
 *
 * **The element is the form's control** (W6): its class says `static formAssociated = true`; it takes `name` and `form`, and repeats on its own
 * internals what its value member tells its own through `FormSays` (src/primitives/form-says.ts) — the value and the
 * state as they are, the validity flags, the message and the member's own anchor. It resets to its `value` attribute
 * (`firstValue()`), passes a restore on to the member, and joins a disabled `<fieldset>` with its own `disabled` for
 * its frame (`formDisabled`). Enter is the member's: it asks for the element's form (`formOf`).
 */
export abstract class ComposedControl<V = string> extends ComposedElement {
  static override properties: PropertyDeclarations = {
    name: { type: String, reflect: true },
    formDisabled: { state: true },
  };

  /** Web only: the name the value is submitted under. */
  name = '';

  /** W6, item 6: a disabled `<fieldset>` around the element, or its own `disabled` attribute, as the platform says it. */
  protected formDisabled = false;

  /** W5: the member that holds the value, once rendered. */
  protected abstract get valueMember(): ValueMember<V> | null;

  abstract get value(): V;
  abstract set value(value: V);

  protected override get control(): HTMLElement | null {
    return this.valueMember;
  }

  protected readonly internals = this.attachInternals();

  /** W5: the value last set on the element, while the member has not taken it. */
  private given: V | undefined;
  private pending = false;
  private heard: Element | null = null;
  private unhear: (() => void) | undefined;
  private restored: [FormEntry, 'restore' | 'autocomplete'] | null = null;

  /** W5: what `value` returns — `initial` is the member's own default, for an element that has not rendered and was given nothing. */
  protected memberValue(initial: V): V {
    if (this.pending) return this.given as V;
    const member = this.valueMember;
    return member ? member.value : initial;
  }

  /** W5: what `value` is set with. The member takes it at the element's next render; what the member holds already changes nothing. */
  protected giveValue(value: V) {
    const member = this.valueMember;
    if (!this.pending && member && Object.is(member.value, value)) return;
    this.given = value;
    this.pending = true;
  }

  /** W6, item 4: the value a form's reset returns to — the `value` attribute, where the first value is written. */
  protected firstValue(): V {
    return (this.getAttribute('value') ?? '') as V;
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The element's validity: its value member's (W6, item 3). */
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

  formResetCallback() {
    this.value = this.firstValue();
  }

  formStateRestoreCallback(state: FormEntry, mode: 'restore' | 'autocomplete') {
    const member = this.valueMember;
    // Restored before it first rendered: passed on when the member is there.
    if (!member) {
      this.restored = [state, mode];
      return;
    }
    member.formStateRestoreCallback?.(state, mode);
    // W6, item 5: the member's value is the element's.
    this.pending = false;
    this.given = undefined;
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /** W6, items 2 and 3: the same value and state, the same flags and message, and the member's own anchor. */
  private repeat(word: FormWord) {
    this.internals.setFormValue(word.value, word.state);
    if (word.anchor) this.internals.setValidity(word.flags, word.message, word.anchor);
    else this.internals.setValidity(word.flags, word.message);
    this.memberUpdated();
  }

  /**
   * W14 (`fills`): called after each word the value member tells its form — when the element first hears it, and after
   * each of the member's updates, which is when a member speaks. An element whose spec names a member's prop it fills
   * itself from state the value member holds (a text field: its Field's count text, from its input's count) sets it
   * here; it reads the member and writes the other member's property, and computes nothing of its own. Does nothing
   * otherwise.
   */
  protected memberUpdated() {}

  protected override updated(changed: PropertyValues) {
    // W5: the render that has just ended gave the member what was set; from here the value is the member's.
    this.pending = false;
    this.given = undefined;
    const member = this.valueMember;
    if (member !== this.heard) {
      this.unhear?.();
      this.heard = member;
      this.unhear = formSaysOf(member)?.hear((word) => this.repeat(word));
    }
    if (member && this.restored) {
      const [state, mode] = this.restored;
      this.restored = null;
      member.formStateRestoreCallback?.(state, mode);
    }
    super.updated(changed);
  }
}

// W6, item 6: an element's `disabled` attribute, written while it holds focus, waits until focus has left — a frame at
// most —, so a composed element lets go of focus as the platform's own control does.
disabledWaitsWhileFocused(ComposedControl);
