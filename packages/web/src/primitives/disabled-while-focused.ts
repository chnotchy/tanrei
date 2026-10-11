// A form-associated element that is disabled while it holds focus lets go of focus when the platform's own control
// would: at the next frame, in every engine.
//
// The element's `disabled` attribute is the platform's word that a form-associated custom element is disabled, and
// one engine takes focus from such an element inside the very call that writes the attribute — `focusout` with no
// related target, before any code of the page could have moved focus on — where the other engines, and every engine
// for a `<button>` of the platform's own, take it at the next frame. A container that puts focus on a neighbour in
// the turn in which it disables the control focus stood on (a row whose move button reaches the end, a pager on its
// last page), and a product's panel that closes when focus leaves it, were written against the platform's timing.
//
// So the attribute alone waits: while the element holds focus, writing `disabled` is put off until focus has left
// it, and no longer than the next frame. Nothing else waits — the property is true at once, the native control inside
// is disabled at once, so the element emits nothing, takes no key, is passed by Tab and is drawn and exposed as
// disabled from the same update on. What is one frame late, and only for an element that held focus: the attribute
// itself, and with it the platform's `:disabled` on the host.

/** What is asked of the element: its property, which is true before its attribute is. */
export interface DisabledHost extends HTMLElement {
  disabled: boolean;
}

/** The elements whose attribute is waiting, each with what ends the wait: `write` false where it ends unwritten. */
const waiting = new WeakMap<DisabledHost, (write?: boolean) => void>();

/**
 * The element's `setAttribute` and `toggleAttribute` call this before they write `disabled` (the reflection of the
 * property and a template's boolean binding arrive through those two). True: the attribute waits and the caller
 * writes nothing now — `write` is called once focus has left the element, or at the next frame, if the element is
 * still disabled then. False: nothing holds it back. An attribute written first, by the page, sets the property at
 * once.
 */
export function waitsWhileFocused(host: DisabledHost, write: () => void): boolean {
  if (host.hasAttribute('disabled')) return false;
  // Focus inside the element's shadow root, or on the element itself.
  if (!host.shadowRoot?.activeElement && !host.matches(':focus')) return false;
  if (!host.disabled) host.disabled = true;
  if (waiting.has(host)) return true;
  const done = (written = true) => {
    cancelAnimationFrame(frame);
    host.removeEventListener('focusout', onFocusOut);
    waiting.delete(host);
    if (written && host.disabled && !host.hasAttribute('disabled')) write();
  };
  const onFocusOut = () => done();
  const frame = requestAnimationFrame(() => done());
  host.addEventListener('focusout', onFocusOut);
  waiting.set(host, done);
  return true;
}

/**
 * The element's `removeAttribute` and `toggleAttribute` call this before they remove `disabled`. An attribute that
 * was still waiting is not there to be removed, so no change of it would tell the property: the wait ends unwritten
 * and the property is unset here.
 */
export function endsWaiting(host: DisabledHost): void {
  const done = waiting.get(host);
  if (!done) return;
  done(false);
  host.disabled = false;
}

/**
 * Gives a form-associated element's class the three overrides in one call, after the class is written (the Button
 * writes them out): `setAttribute` and `toggleAttribute` ask `waitsWhileFocused()` before they write `disabled` — the
 * reflection of the property arrives through the first —, and `removeAttribute` ends a wait. Every form-associated
 * element of the package calls it, so each lets go of focus as the platform's own control does (form-disabled.test.ts
 * holds a row for each).
 */
export function disabledWaitsWhileFocused(element: { prototype: HTMLElement }): void {
  const prototype = element.prototype as DisabledHost;
  const { setAttribute, toggleAttribute, removeAttribute } = prototype;
  prototype.setAttribute = function (this: DisabledHost, name: string, value: string) {
    if (name.toLowerCase() === 'disabled' && waitsWhileFocused(this, () => setAttribute.call(this, 'disabled', ''))) return;
    setAttribute.call(this, name, value);
  };
  prototype.toggleAttribute = function (this: DisabledHost, name: string, force?: boolean): boolean {
    if (name.toLowerCase() !== 'disabled') return toggleAttribute.call(this, name, force);
    if (force ?? !(this.disabled || this.hasAttribute('disabled'))) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
    return this.disabled;
  };
  prototype.removeAttribute = function (this: DisabledHost, name: string) {
    if (name.toLowerCase() === 'disabled') endsWaiting(this);
    removeAttribute.call(this, name);
  };
}

/**
 * The same for a part that is a focus stop by its `tabindex` (a select's container, a slider's handle), and for a
 * native control whose `tabindex` the element writes (a radio button's input): one engine takes focus from the part
 * inside the call that writes or removes the attribute on what can no longer be focused, where the platform's own
 * control keeps it until the next frame. So a part that holds focus when its element is disabled keeps its
 * `tabindex` as it was for one frame; everything else is disabled at once — the element's handlers, `aria-disabled`,
 * the native control's own `disabled` —, and Tab cannot return to it within a frame.
 */
export class FocusedStop {
  private was = false;
  private held = false;

  constructor(private readonly host: HTMLElement & { requestUpdate(): void }) {}

  /** Called by the element's `render()` with whether it is disabled now: whether its stop keeps its `tabindex` for this frame. */
  keeps(disabled: boolean): boolean {
    if (!disabled) {
      this.was = false;
      this.held = false;
      return false;
    }
    if (!this.was) {
      this.was = true;
      if (this.host.shadowRoot?.activeElement) {
        this.held = true;
        requestAnimationFrame(() => {
          if (!this.held) return;
          this.held = false;
          this.host.requestUpdate();
        });
      }
    }
    return this.held;
  }
}
