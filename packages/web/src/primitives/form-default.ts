// The value a form's reset returns a control to: its default, as a native control's `defaultValue` and `defaultChecked`
// are (the HTML form-reset algorithm), which the specs call "the value it was first given".
//
// A native control keeps its default in a content attribute (`value`, `checked`) and its current value apart. An element
// of this package takes its value from that attribute as well as from its property, and a product gives it either way:
// written in the markup — by hand or by a server's render — or set as a property before the element first draws, which
// is how a client framework gives it (React's props, through `@tanrei/react`). So the default is not the attribute's
// text at the moment of the reset: an element given its value as a property has no attribute, and reset to nothing.
// The default is what the element holds when it first draws, from either way. A property set after that is the current
// value alone and moves no default, as a native control's `value` does; the product writing the attribute after that is
// a new default, as writing a native control's `value` or `checked` attribute is.
//
// A server's render gives a client framework's values in two moments: what an attribute can carry is in the HTML, which
// the element reads when it is defined — before the page is hydrated — and the rest (a list) arrives with hydration.
// The framework's binding knows when it has given the first props: `@tanrei/react` calls `takeFormDefaults()` once each
// element is mounted, and what the element holds after that render is its default.
import type { ReactiveController, ReactiveControllerHost } from 'lit';

type Host = ReactiveControllerHost & HTMLElement;

const held = /* @__PURE__ */ new WeakMap<Host, FormDefault<unknown>[]>();

/**
 * One value's default, as a Lit controller: taken at the element's first update (and again at the update after
 * `takeFormDefaults()`), and read by its `formResetCallback()`. `read` is the value as the element holds it; `attribute`
 * is the content attribute that gives it, read by `fromAttribute` as the element reads it, or `null` for a value no
 * attribute gives.
 */
export class FormDefault<T> implements ReactiveController {
  private given!: T;
  /** The attribute's text when the default was taken: other text is the product's new default. */
  private text: string | null = null;
  /** Taken at the next update: the first, or the one after the product's first props. */
  private pending = true;

  constructor(
    private readonly host: Host,
    private readonly read: () => T,
    private readonly attribute: string | null = null,
    private readonly fromAttribute?: (text: string | null) => T,
  ) {
    host.addController(this);
    const list = held.get(host);
    if (list) list.push(this as FormDefault<unknown>);
    else held.set(host, [this as FormDefault<unknown>]);
  }

  hostUpdate() {
    if (this.pending) this.take();
  }

  /** The value a reset returns to. */
  get value(): T {
    // Not drawn yet (a reset in the task that made it): what it holds is what it was given.
    if (this.pending) this.take();
    if (this.attribute && this.fromAttribute) {
      const text = this.host.getAttribute(this.attribute);
      if (text !== this.text) return this.fromAttribute(text);
    }
    return this.given;
  }

  /** What the element holds now is what the product gave it first: taken at the element's next update. */
  retake() {
    this.pending = true;
    this.host.requestUpdate();
  }

  private take() {
    this.pending = false;
    this.given = this.read();
    this.text = this.attribute ? this.host.getAttribute(this.attribute) : null;
  }
}

/** Every default of `host` is taken again from what it holds at its next update (`TanreiElement.takeFormDefaults()`). */
export function takeFormDefaults(host: Host) {
  for (const each of held.get(host) ?? []) each.retake();
}
