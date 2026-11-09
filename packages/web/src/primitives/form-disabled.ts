// The platform's word that a form-associated element is disabled — by an ancestor `<fieldset disabled>`, or by the
// element's own `disabled` attribute.
//
// An element is disabled by its own `disabled` property, which it has before its attribute, and by a disabled fieldset
// around it, which it reads from the platform where it renders: `:disabled`, less its own attribute. The attribute
// reflects the property in the middle of the update that drew the property's change, after `render()` has read it, and
// `formDisabledCallback` answers it there. A word that changes nothing drawn draws nothing again, so one change of
// `disabled` — the element's own, or a fieldset's around it — is drawn in one update.
import type { ReactiveController } from 'lit';
import { SUBMIT_BUTTON, type SubmitButtonState } from './default-button.js';

/** What the controller needs from the element. */
export interface FormDisabledHost extends HTMLElement {
  addController(controller: ReactiveController): void;
  /** Lit's own, which records `name` among the changed properties of the update it asks for. */
  requestUpdate(name?: PropertyKey, oldValue?: unknown): void;
  readonly disabled: boolean;
  readonly isUpdatePending: boolean;
}

/**
 * The disabled state a fieldset around a form-associated element gives it, as a Lit controller. The element reads
 * `byFieldset` where it renders (its `formDisabled` is a getter of it) and forwards its `formDisabledCallback`. It is
 * drawn again, with `formDisabled` among its changed properties, exactly when the platform's word changes what the last
 * update drew: a fieldset around it disabled or enabled — or its own `disabled` unset inside a disabled fieldset, which
 * only the attribute's removal at the end of that update shows.
 */
export class FormDisabledController implements ReactiveController {
  /** What the last update read: the fieldset's part, and whether the element was drawn disabled by it or by itself. */
  private read = false;
  private drawn = false;

  constructor(private readonly host: FormDisabledHost) {
    host.addController(this);
  }

  /** Disabled by an ancestor `<fieldset disabled>`: the platform's word, less the element's own attribute. */
  get byFieldset(): boolean {
    return !this.host.hasAttribute('disabled') && this.host.matches(':disabled');
  }

  hostUpdate() {
    this.read = this.byFieldset;
    this.drawn = this.host.disabled || this.read;
  }

  hostUpdated() {
    this.check();
  }

  /** The element's `formDisabledCallback`. A word that arrives while an update is pending is read by that update. */
  formDisabledCallback() {
    if (!this.host.isUpdatePending) this.check();
  }

  private check() {
    if ((this.host.disabled || this.byFieldset) !== this.drawn) this.host.requestUpdate('formDisabled', this.read);
  }
}

/** What is asked of the element: Lit's own flag. */
export interface UpdatingHost {
  readonly isUpdatePending: boolean;
}

/** The platform's last word for an element whose word is waiting for its update to end. */
const waiting = new WeakMap<UpdatingHost, boolean>();

/**
 * The Button's `formDisabledCallback` calls this with what it was given (every other form-associated element composes
 * `FormDisabledController`). `take` draws the element again: at once, or right after the update under way — then with
 * the last word that arrived during it, where a word taken during the update would be lost.
 */
export function takeFormDisabled(host: UpdatingHost, disabled: boolean, take: (disabled: boolean) => void): void {
  if (waiting.has(host)) {
    waiting.set(host, disabled);
    return;
  }
  if (!host.isUpdatePending) {
    take(disabled);
    return;
  }
  waiting.set(host, disabled);
  // The update that is running (or queued) is a microtask's work: this one runs after it.
  queueMicrotask(() => {
    const last = waiting.get(host) ?? disabled;
    waiting.delete(host);
    take(last);
  });
}

/**
 * Whether a control a container walks is disabled now: by its own `disabled` — the property, which a Tanrei element
 * has before its attribute (src/primitives/disabled-while-focused.ts), or the attribute of an element that has no such
 * property — or by a disabled fieldset around a form-associated element (a Button, BTN-32; a field), which changes
 * neither. A Button answers for itself: as a link it is disabled by no fieldset, though the platform says so of its
 * element. A container that reads only an item's own `disabled` counts an item no key can reach.
 */
export function isDisabledControl(control: Element & { disabled?: boolean }): boolean {
  if (SUBMIT_BUTTON in control) return (control as unknown as Record<symbol, SubmitButtonState>)[SUBMIT_BUTTON]!.disabled;
  return !!(control.disabled ?? control.hasAttribute('disabled')) || control.matches(':disabled');
}
