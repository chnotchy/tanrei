// A form's default button, and the one way a Tanrei control asks its form to submit on Enter (BTN-30).
//
// The platform's rule: Enter in a field presses the form's default button — its first submit button in document
// order — so that button's `click` is emitted, its name and value are sent, and a disabled one stops the submission.
// A Tanrei Button of type `submit` counts exactly as the platform's own does. Every Tanrei control that submits its form
// on Enter calls `pressDefaultButton()` where it would ask the form directly (the text field, the number field, the
// color field, the combobox, the one-time-code input, the search, and the selection primitive of the checkbox, the radio
// button and the switch), and `watchNativeInputs()` lets the browser itself press a Tanrei default button from the
// platform's own controls, which know only the platform's buttons.

/**
 * What a Tanrei element that can be a form's submit button answers with. Internal between Tanrei elements: the
 * primitive imports no component, so a Button of another copy of the package is read the same way.
 */
export const SUBMIT_BUTTON = Symbol.for('tanrei.submit-button');

/** The element's side: what it is now, read at the moment of the key. */
export interface SubmitButtonState {
  /** Whether a press of it submits its form now: its type is `submit` and nothing makes it ignore that (BTN-33). */
  readonly submits: boolean;
  /** Whether it is disabled now, by itself or by a disabled fieldset (BTN-32). */
  readonly disabled: boolean;
}

interface TanreiSubmitButton extends HTMLElement {
  readonly [SUBMIT_BUTTON]: SubmitButtonState;
}

/**
 * The submit buttons of the platform's own that a Button holds in passing: the submitter of one dispatch (BTN-31), in
 * `form.elements` while a `submit` listener runs, and the one the browser presses for Enter in a control of its own
 * (`watchNativeInputs()`). Neither is ever a form's default button. A property and not a set of this module, so a
 * Button of another copy of the package is read the same way.
 */
const PASSING = Symbol.for('tanrei.passing-submitter');

/** Marks `button` as a submit button in passing. */
export function markPassingSubmitter(button: HTMLButtonElement) {
  (button as unknown as Record<symbol, boolean>)[PASSING] = true;
}

const isTanreiSubmit = (el: Element): el is TanreiSubmitButton => SUBMIT_BUTTON in el && (el as TanreiSubmitButton)[SUBMIT_BUTTON].submits;
// An image button is a submit button the platform leaves out of `form.elements`.
const isNativeSubmit = (el: Element): el is HTMLButtonElement | HTMLInputElement =>
  !(PASSING in el) && ((el instanceof HTMLButtonElement && el.type === 'submit') || (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'image')));

/**
 * The form's default button: the first submit button among its controls in document order — the platform's own
 * (`<button>` without a type or of type `submit`, `<input type="submit">`, `<input type="image">`) or a Tanrei Button
 * whose type is `submit`. Disabled or not: a disabled default button is still the default button. Null where the form
 * has none.
 */
export function defaultButton(form: HTMLFormElement): HTMLElement | null {
  let first: HTMLElement | null = null;
  for (const el of form.elements) {
    if (isNativeSubmit(el) || isTanreiSubmit(el)) {
      first = el as HTMLElement;
      break;
    }
  }
  // Image buttons are not listed: one that stands before the first listed button is the default button.
  const root = form.getRootNode() as Document | ShadowRoot;
  for (const image of root.querySelectorAll<HTMLInputElement>('input[type="image" i]')) {
    if (image.form !== form) continue;
    if (!first || image.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING) return image;
    break;
  }
  return first;
}

/** Whether `button` — a form's default button — is disabled now. */
export function isDisabledButton(button: HTMLElement): boolean {
  return SUBMIT_BUTTON in button ? (button as TanreiSubmitButton)[SUBMIT_BUTTON].disabled : button.matches(':disabled');
}

/** Whether `button` is a Tanrei Button and not one of the platform's own. */
export function isTanreiButton(button: HTMLElement): boolean {
  return SUBMIT_BUTTON in button;
}

/**
 * Enter in a control of `form` (BTN-30): the form's default button is pressed — its `click`, and then, unless the
 * product cancelled it, the submission with that button named in it. A disabled default button stops it: nothing is
 * emitted and nothing is sent. A form with no submit button is asked directly, as before. The button takes no focus
 * and draws no pressed state: the key was pressed elsewhere.
 */
export function pressDefaultButton(form: HTMLFormElement): void {
  const button = defaultButton(form);
  if (!button) {
    form.requestSubmit();
    return;
  }
  if (isDisabledButton(button)) return;
  button.click();
}

/**
 * The form a control submits on Enter: its own — `own`, what its
 * `ElementInternals` says — or, where it has none and stands in the shadow root of a form-associated element, that
 * element's. A member of a composed element is outside every form: the form is the composed element's, which is the
 * form's control. A control calls `formOf(this, this.form)` where it read `this.form`, and presses that form's default
 * button.
 *
 * It looks no further than form-associated hosts: a control in the shadow root of anything else has no form, as before.
 */
export function formOf(control: Element, own: HTMLFormElement | null): HTMLFormElement | null {
  let form = own;
  let at = control;
  while (!form) {
    const root = at.getRootNode();
    if (!(root instanceof ShadowRoot)) break;
    const host = root.host as Element & { form?: unknown };
    if (!(host.constructor as { formAssociated?: boolean }).formAssociated) break;
    form = host.form instanceof HTMLFormElement ? host.form : null;
    at = host;
  }
  return form;
}

// ─── Enter in the platform's own controls ────────────────────────────────────────────────────────────────────────
//
// A native control knows only the platform's buttons, and what it does with Enter is the engine's own: which controls
// submit (a `<select>` and a range input in two engines of three), with which modifier keys (Alt and the command key
// in one), never for the Enter an input method or a suggestion list took, and always after the field has committed
// what was typed — `change`, then the button's `click`, then `submit`. None of that is listed here. For the length
// of one Enter the Tanrei default button holds a submit button of the platform's own, and the browser presses it
// exactly where, when and whether it would press its own default button; that press is turned into the Button's.

/** The forms that hold a Tanrei submit Button now, each with those Buttons and where its keys are heard. */
const watched = new WeakMap<HTMLFormElement, { buttons: Set<Element>; heard: EventTarget }>();

/** How many watched forms each tree's listener serves. */
const hearing = new Map<EventTarget, number>();

/** The button the browser may press for the key going on now, the Button that holds it and the window that hears its click. */
let held: { passing: HTMLButtonElement; button: HTMLElement; view: Window } | null = null;

/**
 * Where a form's keys are heard: its tree — the window of a document, so that a key stopped on its way down is heard
 * all the same, or its shadow root. A control that names the form by its `form` attribute from outside it is in the
 * same tree, and its keys never pass the form itself.
 */
function treeOf(form: HTMLFormElement): EventTarget {
  const root = form.getRootNode();
  return root instanceof Document ? (root.defaultView ?? root) : root;
}

/** The browser did not press it, or has: the passing button is gone, and so are its listeners. */
function letGo() {
  if (!held) return;
  const { passing, view } = held;
  held = null;
  passing.remove();
  if (view !== window) view.removeEventListener('click', onPassingClick, true);
  view.removeEventListener('keyup', onKeyUp, true);
  view.removeEventListener('keypress', onKeyPress, true);
  view.removeEventListener('blur', letGo);
}

/**
 * The browser pressed the passing button: the form's default button is the Button that holds it, so the press is the
 * Button's. The browser's own click is stopped where it starts — at the window, by a listener that is there from the
 * page's first watched form on, so that no listener of the page below the window, and none added to the window
 * after it, hears a click that is no one's — and its submission is cancelled: the Button's `click` and its own
 * submission (BTN-27, BTN-31) follow at once, inside the same key — after the field's `change`, as with the
 * platform's own default button.
 */
function onPassingClick(event: Event) {
  if (!held || event.composedPath()[0] !== held.passing) return;
  const { button } = held;
  event.stopImmediatePropagation();
  event.preventDefault();
  letGo();
  if (!isDisabledButton(button)) button.click();
}

function onKeyUp(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.keyCode === 13) letGo();
}

/**
 * The key's `keyup` is not always the page's to hear: where Enter opens a list of the platform's own (a `<select>` in
 * one engine on Linux and Windows), the list takes the rest of the key, and the passing button would stay in the form
 * until the next key. The browser presses its default button inside the key's `keypress`, or not at all: once that
 * dispatch and what the browser does after it are over — the next task — a button not pressed is let go.
 */
function onKeyPress(event: KeyboardEvent) {
  if (!held || !event.isTrusted || (event.key !== 'Enter' && event.keyCode !== 13)) return;
  const during = held;
  during.view.setTimeout(() => {
    if (held === during) letGo();
  });
}

/**
 * Enter goes down in a control of the platform's own whose form is watched and whose default button is a Tanrei
 * Button: for the length of the key that Button holds a hidden submit button of the platform's own — the form's first
 * submit button exactly when the Button is, disabled while the Button is, in a slot the Button does not have so it is
 * drawn nowhere — which is all the browser needs to treat the form as one with a default button of its own. Held
 * again for each repeat of a key kept down; let go when the browser presses it, once the key's `keypress` is over
 * (`onKeyPress()`), at the key's `keyup`, and when the window loses the keyboard.
 */
function onKeyDown(event: KeyboardEvent) {
  // A key a script dispatched is no key to the browser, which submits nothing for it.
  if (!event.isTrusted || (event.key !== 'Enter' && event.keyCode !== 13)) return;
  const control = event.composedPath()[0];
  // A Tanrei control asks for itself (`pressDefaultButton()`): the browser submits nothing from a custom element.
  if (!(control instanceof HTMLElement) || control.localName.includes('-')) return;
  const form = (control as HTMLElement & { form?: unknown }).form;
  if (!(form instanceof HTMLFormElement) || !watched.has(form)) return;
  letGo();
  const button = defaultButton(form);
  // The platform's own default button is the browser's to press.
  if (!button || !isTanreiButton(button)) return;
  const view = button.ownerDocument.defaultView;
  if (!view) return;
  const passing = button.ownerDocument.createElement('button');
  passing.type = 'submit';
  passing.hidden = true;
  passing.slot = 'passing';
  // A disabled Tanrei Button is not a disabled button to the browser, which would otherwise submit behind it.
  passing.disabled = isDisabledButton(button);
  // A Button that names its form from outside it: the passing button names the same one.
  const named = button.getAttribute('form');
  if (named !== null) passing.setAttribute('form', named);
  markPassingSubmitter(passing);
  button.append(passing);
  held = { passing, button, view };
  // There already, as a rule (`watchNativeInputs()`); added here for another window's document, and for a document
  // written anew (`document.open()`), which takes every listener from its window.
  view.addEventListener('click', onPassingClick, true);
  view.addEventListener('keyup', onKeyUp, true);
  view.addEventListener('keypress', onKeyPress, true);
  view.addEventListener('blur', letGo);
}

/**
 * A Tanrei submit Button tells which form it belongs to now (`null`: none, or it is no submit button any more). While
 * a form has at least one, Enter in a control of the platform's own that belongs to that form — inside it or naming
 * it from outside — presses the form's default button when that button is Tanrei's (BTN-30): one `keydown` listener
 * per tree, in the capture phase, added with the tree's first such form and removed with its last.
 */
export function watchNativeInputs(button: Element, form: HTMLFormElement | null, previous: HTMLFormElement | null): void {
  if (form === previous) return;
  if (previous) {
    const entry = watched.get(previous);
    entry?.buttons.delete(button);
    if (entry && entry.buttons.size === 0) {
      watched.delete(previous);
      const count = (hearing.get(entry.heard) ?? 1) - 1;
      if (count > 0) hearing.set(entry.heard, count);
      else {
        hearing.delete(entry.heard);
        entry.heard.removeEventListener('keydown', onKeyDown as EventListener, true);
        if (entry.heard !== window) entry.heard.removeEventListener('click', onPassingClick, true);
      }
    }
    if (held?.button === button) letGo();
  }
  if (form) {
    // The press of a passing button is stopped at the window, by a listener that is there from the page's first
    // watched form on — before most listeners of the page — and is never taken away; adding it again changes nothing.
    window.addEventListener('click', onPassingClick, true);
    let entry = watched.get(form);
    if (!entry) {
      const heard = treeOf(form);
      entry = { buttons: new Set(), heard };
      watched.set(form, entry);
      const count = hearing.get(heard) ?? 0;
      if (count === 0) {
        heard.addEventListener('keydown', onKeyDown as EventListener, true);
        // A closed shadow root shows the window nothing of what is pressed inside it: the click is stopped at the root.
        if (heard !== window) heard.addEventListener('click', onPassingClick, true);
      }
      hearing.set(heard, count + 1);
    }
    entry.buttons.add(button);
  }
}
