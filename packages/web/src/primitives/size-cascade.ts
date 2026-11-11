import type { ReactiveController, ReactiveControllerHost } from 'lit';

// The size cascade (system → container → component). The system decides how much room every height takes, once: its
// density moves the size steps' tokens, so nothing here reads it. What is set locally is a size, which a container
// passes down to what it holds: a container that has a size SET provides it, and a component that sets none of its own
// draws the one its nearest providing container sets (BGR-26, BTN-48). A container's default is never passed, so a
// container that says nothing leaves what it holds at its own default, or at the size a container around it sets — as
// SwiftUI's `.controlSize` and Carbon's `Layout` pass only what is set. A component's own size always wins.
//
// "Nearest" is taken up the composed tree — the parent element, or the host of the shadow root an element is in — so a
// component the product places in a container's light DOM takes that container's size, and one a component draws in
// its own shadow root takes the size of the containers around that component.

/** The size names a container may pass, smallest first: what a component that lacks one is drawn at is read here. */
export const SIZE_LADDER = ['extra-small', 'small', 'medium', 'large', 'extra-large'] as const;

/** What a providing container answers: the size set on it, or null while none is. */
const PROVIDES = Symbol('tanrei.size-provider');
type Provider = Element & { [PROVIDES]?: () => string | null };

/** Every component connected to a page that takes a size its container sets: asked again when a container changes. */
const consumers = new Set<SizeConsumerController>();

const parentOf = (node: Node): Element | null => {
  const parent = node.parentNode;
  if (parent instanceof Element) return parent;
  return parent instanceof ShadowRoot ? parent.host : null;
};

/** The size the nearest container around `element` that has one set provides, or null. */
function providedTo(element: Element): string | null {
  for (let node = parentOf(element); node; node = parentOf(node)) {
    const size = (node as Provider)[PROVIDES]?.();
    if (size) return size;
  }
  return null;
}

/**
 * A size a component does not have is taken as its nearest one along the ladder, the larger on a tie (as Carbon caps a
 * passed size to what a component supports). A name that is not on the ladder — one a design system added — is passed
 * as it is, for the component's open axis to draw or report (BTN-7).
 */
export function nearestSize(size: string, own: readonly string[]): string {
  if (own.includes(size)) return size;
  const at = (SIZE_LADDER as readonly string[]).indexOf(size);
  const steps = own.map((name) => (SIZE_LADDER as readonly string[]).indexOf(name)).filter((step) => step >= 0);
  if (at < 0 || !steps.length) return size;
  const best = steps.reduce((a, b) => {
    const da = Math.abs(a - at);
    const db = Math.abs(b - at);
    return db < da || (db === da && b > a) ? b : a;
  });
  return SIZE_LADDER[best];
}

/**
 * A container that passes its size down (BGR-26). `read` answers the size the product set on it, or null while it set
 * none. Whenever that answer changes — and when the container is connected, which is also when it is upgraded after the
 * components it holds — every component that takes a size from its containers is asked again.
 */
export class SizeProviderController implements ReactiveController {
  private last: string | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly read: () => string | null,
  ) {
    (host as Provider)[PROVIDES] = () => this.read() || null;
    host.addController(this);
  }

  hostConnected() {
    this.last = this.read() || null;
    if (this.last) announce();
  }

  hostUpdated() {
    const size = this.read() || null;
    if (size === this.last) return;
    this.last = size;
    announce();
  }
}

function announce() {
  for (const consumer of consumers) consumer.resolve();
}

/**
 * A component that takes the size its nearest providing container sets while it sets none of its own (BTN-48).
 * `value` is that size, or null where no container around it sets one; the host renders again when it changes.
 */
export class SizeConsumerController implements ReactiveController {
  value: string | null = null;

  constructor(private readonly host: ReactiveControllerHost & HTMLElement) {
    host.addController(this);
  }

  hostConnected() {
    consumers.add(this);
    this.resolve();
  }

  hostDisconnected() {
    consumers.delete(this);
  }

  /** @internal Asked again when a container's size changes: renders the host where the size it takes changed. */
  resolve() {
    const size = providedTo(this.host);
    if (size === this.value) return;
    this.value = size;
    this.host.requestUpdate();
  }
}
