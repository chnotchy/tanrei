/**
 * An event as a wrapper's `on…` prop receives it. Each of those props is a listener on the element itself, so
 * `currentTarget` is the element — `event.currentTarget.value` reads the new value of a field whose `change` is a plain
 * `Event` — and `E` is the event the element fires (`CustomEvent<Detail>` where it carries one).
 *
 * `target` keeps the platform's type: it is the element for an event the element fires, and a child of it for an event
 * that bubbles up from one (a radio button's `change` at its group).
 */
export type TanreiEvent<I, E extends Event = Event> = E & { readonly currentTarget: I };
