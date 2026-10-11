// The message of a required control left empty (TXF-48, SEL-11, CMB-12, NUM-12, RGP-11 on the web: constraint
// validation). The words are the browser's own, in the browser's language: a native control of the same
// kind is asked once. Where a browser returns none, Tanrei has no words to put in their place: the message is the
// element's own — its errorText, else its requiredText (the instance's or the product's), else its label — because
// `ElementInternals.setValidity()` refuses a flag without a message.

/** The native control whose message is asked: a text input, a select, a radio button, a file input (FUP-31). */
export type MissingValueKind = 'text' | 'select' | 'radio' | 'file';

const asked = new Map<MissingValueKind, string>();

/** The browser's own words for a required control of this kind left empty; empty where it has none. */
export function browserMissingMessage(kind: MissingValueKind): string {
  let message = asked.get(kind);
  if (message === undefined) {
    const probe = kind === 'select' ? document.createElement('select') : document.createElement('input');
    if (probe instanceof HTMLInputElement && kind === 'radio') {
      probe.type = 'radio';
      probe.name = 'tanrei-missing-value-probe';
    }
    if (probe instanceof HTMLInputElement && kind === 'file') probe.type = 'file';
    probe.required = true;
    message = probe.validationMessage ?? '';
    asked.set(kind, message);
  }
  return message;
}

/** What the element has to say in the browser's place, most telling first. */
export interface OwnWords {
  errorText: string;
  /** With the product's words read (`WordsController.get('requiredText', …)`). */
  requiredText: string;
  label: string;
}

/**
 * The validity message of a missing value: the browser's; else the element's errorText, requiredText or label. The
 * last resort is the required mark itself, "*" — a mark and not a word — so that the flag is never refused.
 */
export function missingValueMessage(kind: MissingValueKind, own: OwnWords): string {
  return browserMissingMessage(kind) || [own.errorText, own.requiredText, own.label].find((text) => text.trim() !== '') || '*';
}
