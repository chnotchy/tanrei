// What a form-associated control tells its form, said where a composed element can hear it (W6, items 2
// and 3).
//
// A form finds its controls in its own tree. A control that is a member of a composed element stands in that element's
// shadow root, outside every form: what it tells its own `ElementInternals` reaches no form. The composed element is
// the form's element, and repeats on its own internals what its value member tells its own — so the member must say it
// where it can be heard. `FormSays` is that place: a control calls `value()` and `validity()` where it would call
// `internals.setFormValue()` and `internals.setValidity()`. Each does exactly that call, keeps the last word, and tells
// whoever listens. Outside a composed element nobody listens, and the control behaves as it did.

/** What `ElementInternals.setFormValue()` takes: one entry, several under names of their own, a file, or none. */
export type FormEntry = File | string | FormData | null;

/** The last thing a control told its form. */
export interface FormWord {
  /** What it submits (`null`: nothing). */
  value: FormEntry;
  /** What it is restored from; `undefined` where the control gave none (the platform then keeps the value). */
  state: FormEntry | undefined;
  /** Its validity flags; none set while it is valid. */
  flags: ValidityStateFlags;
  /** The message of an invalid control. */
  message: string;
  /** Where the browser's message points and what it focuses: the control's own native element. */
  anchor: HTMLElement | undefined;
}

/** Where a control keeps its `FormSays`, so that the element composed around it can hear it. */
export const FORM_SAYS = Symbol.for('tanrei.form-says');

export class FormSays {
  /** The last word. A control that has said nothing submits nothing and is valid, as the platform has it. */
  last: FormWord = { value: null, state: undefined, flags: {}, message: '', anchor: undefined };
  private readonly hearers = new Set<(word: FormWord) => void>();

  constructor(
    host: HTMLElement,
    private readonly internals: ElementInternals,
  ) {
    (host as unknown as Record<symbol, unknown>)[FORM_SAYS] = this;
  }

  /** In place of `internals.setFormValue(value, state)`. */
  value(value: FormEntry, state?: FormEntry) {
    this.internals.setFormValue(value, state);
    this.last = { ...this.last, value, state };
    this.tell();
  }

  /** In place of `internals.setValidity(flags, message, anchor)`; no argument says the control is valid. */
  validity(flags: ValidityStateFlags = {}, message = '', anchor?: HTMLElement) {
    this.internals.setValidity(flags, message, anchor);
    this.last = { ...this.last, flags, message, anchor };
    this.tell();
  }

  /** Tells `hearer` the last word at once and every later one; the function returned stops it. */
  hear(hearer: (word: FormWord) => void): () => void {
    this.hearers.add(hearer);
    hearer(this.last);
    return () => this.hearers.delete(hearer);
  }

  private tell() {
    for (const hearer of this.hearers) hearer(this.last);
  }
}

/** The `FormSays` of `element`, where it is a control that speaks through one. */
export const formSaysOf = (element: Element | null | undefined): FormSays | undefined => (element as unknown as Record<symbol, FormSays | undefined> | null | undefined)?.[FORM_SAYS];
