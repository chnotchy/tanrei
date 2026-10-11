// The platform's word that a form-associated element is disabled — by an ancestor `<fieldset disabled>`, or by the
// element's own `disabled` attribute — taken where it is not lost.
//
// `formDisabledCallback` is called for the element's own attribute too. A reflected `disabled` property set to false
// has its attribute removed in the middle of the update the property change started, after `render()` has read the old
// state; the callback arrives there, and a reactive state set during an update schedules no new one and is cleared
// with it: the element stays drawn and behaving as disabled until something else renders it. So a word that arrives
// while an update is pending is taken right after it, and starts an update of its own.
import { SUBMIT_BUTTON, type SubmitButtonState } from './default-button.js';

/** What is asked of the element: Lit's own flag. */
export interface UpdatingHost {
  readonly isUpdatePending: boolean;
}

/** The platform's last word for an element whose word is waiting for its update to end. */
const waiting = new WeakMap<UpdatingHost, boolean>();

/**
 * The element's `formDisabledCallback` calls this with what it was given. `take` sets the element's own state from the
 * platform's word (a reactive state, or a field and `requestUpdate()`): at once, or right after the update under way —
 * then with the last word that arrived during it.
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
