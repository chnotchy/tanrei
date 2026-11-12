import type { ReactiveController, ReactiveControllerHost } from 'lit';

// The size cascade (system → container → component). The system decides how much room every height takes, once: its
// density moves the size steps' tokens, so nothing here reads it. What is set locally is a size, which a container
// passes down to what it holds: a container that has a size SET provides it (BGR-26, TBR-31), and a component that sets
// none of its own draws the one its nearest providing container sets (BTN-48, SPB-37, CPY-21, and the input boxes'
// TXI-73, NMI-49, CLI-47, SEL-73, CMB-83, as Carbon's Layout size and SwiftUI's `.controlSize` reach a text field and a
// picker as well as a button, so that a box stands as tall as the Buttons beside it). A container's default
// is never passed, so a container that says nothing leaves what it holds at its own default, or at the size a container
// around it sets — as SwiftUI's `.controlSize` and Carbon's `Layout` pass only what is set. A component's own size
// always wins.
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
  const at = (SIZE_LADDER as readonly string[]).indexOf(size);
  // Outwards from the size itself, one step at a time, the larger first.
  for (let step = 0; at >= 0 && step < SIZE_LADDER.length; step++) {
    for (const name of [SIZE_LADDER[at + step], SIZE_LADDER[at - step]]) if (own.includes(name)) return name;
  }
  return size;
}

/**
 * A container that passes its size down (BGR-26, TBR-31). `read` answers the size the product set on it, or null while
 * it set none. Whenever that answer changes — and when the container is connected, which is also when it is upgraded
 * after the components it holds — every component that takes a size from its containers is asked again.
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

/** A name a custom state may carry: a token name. */
const STATE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** The selector a consumer's size block is written under: the custom state `size-<name>` its controller carries. */
export const drawnSizeAt = (size: string) => `:host(:state(size-${size}))`;

/** The host of a component that takes a size: its `size` is a custom accessor that hands every write to `setOwn`. */
type ConsumerHost = ReactiveControllerHost & HTMLElement & { requestUpdate(name?: PropertyKey, oldValue?: unknown): void };

/**
 * A component that takes the size its nearest providing container sets while it sets none of its own (BTN-48, SPB-37,
 * CPY-21). `value` is that size, or null where no container around it sets one; the host renders again when it changes.
 * `own` is the size the product set on the host, or null while it set none: the host's `size` property is declared with
 * `noAccessor` and without `reflect` (`setOwn` reflects it), and its setter calls `setOwn`, so that a size set to the
 * default's name is set all the same.
 */
export class SizeConsumerController implements ReactiveController {
  value: string | null = null;
  own: string | null = null;
  /** The custom state that carries the drawn size to the host's styles (`size-<name>`), while one does. */
  private state = '';
  /** The size drawn at the last `syncState`. */
  private synced: string | null = null;
  /**
   * Whether the last `syncState` drew another size than the one before it (true at the first): what the host lays out
   * by its size — a measure, a fitted height — is laid out again in that update, whether its own size or a container's
   * changed it.
   */
  drawnChanged = false;

  constructor(
    private readonly host: ConsumerHost,
    /** The sizes the component has (its core), which a passed size is taken as the nearest of. */
    private readonly sizes: readonly string[],
    /** What it is drawn at where neither it nor a container sets a size. */
    private readonly fallback = 'medium',
  ) {
    host.addController(this);
  }

  /** The host's `size` setter: any value makes it the host's own; null or undefined gives it back (and the attribute goes). */
  setOwn(value: unknown) {
    const own = value === null || value === undefined ? null : String(value);
    const old = this.own;
    if (own === old) return;
    this.own = own;
    if (own !== null) {
      this.host.requestUpdate('size', old);
      // Reflected here and not by Lit: Lit reflects a property with an accessor of the class's own on its first update
      // whatever its value, which would write the default's name on a host that sets none — and make it its own.
      if (this.host.getAttribute('size') !== own) this.host.setAttribute('size', own);
      return;
    }
    // Given back: nothing is reflected (removing the attribute sets nothing again).
    this.host.requestUpdate();
    if (this.host.hasAttribute('size')) this.host.removeAttribute('size');
  }

  /** The size the host draws: its own, else the one its nearest container sets (as its nearest size), else the fallback. */
  get drawn(): string {
    if (this.own !== null) return this.own;
    return this.value ? nearestSize(this.value, this.sizes) : this.fallback;
  }

  /**
   * Carries the drawn size as the custom state `size-<name>` on `internals`, which the host's size blocks match (a name
   * that is no token name carries none, and is drawn as the default by the host's own rules). Called as the host updates.
   */
  syncState(internals: ElementInternals) {
    const drawn = this.drawn;
    this.drawnChanged = drawn !== this.synced;
    this.synced = drawn;
    const state = STATE_NAME.test(drawn) ? `size-${drawn}` : '';
    if (state === this.state) return;
    if (this.state) internals.states.delete(this.state);
    if (state) internals.states.add(state);
    this.state = state;
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
