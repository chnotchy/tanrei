import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { DEBUG } from './debug.js';
import { availabilityRead } from './availability-debug.js';
import { type AvailabilityMode, store, variantOf } from './availability-read.js';

// What is read from the cascade, recorded and reported is in availability-read.ts, which only a debug build uses: the
// controller below reaches it through `availabilityRead` (availability-debug.ts), so that a production bundle leaves
// it out.
export {
  type AvailabilityMode,
  SYSTEM,
  UNAVAILABLE,
  UNAVAILABLE_LAYER,
  UNAVAILABLE_REPLACEMENT,
  outsideMessage,
  parseOutside,
  parseReplacements,
  parseUnavailable,
  unavailableEntry,
  unavailableMessage,
  useOf,
  writtenAs,
} from './availability-read.js';

const MODES: readonly AvailabilityMode[] = ['warn', 'error'];

/**
 * How a debug build reports a component, or a value of its `variant`, that the active system does not have (AVL-3):
 * `'warn'` (the default) as a warning, `'error'` as an error — for a product's own tests, which can fail on it. Every
 * use is recorded for `unavailableUses()` in either mode. A production build reads, reports and records nothing.
 */
export function setAvailabilityMode(mode: AvailabilityMode): void {
  if (!MODES.includes(mode)) {
    if (DEBUG) console.warn(`[tanrei] setAvailabilityMode(): "${String(mode)}" is not a mode (${MODES.join(', ')}); the mode stays "${store().mode}"`);
    return;
  }
  store().mode = mode;
}

/**
 * The uses of what the active system does not have since the page loaded (AVL-3), each once, in alphabetical order:
 * `component` for a component it leaves out or that lives in a layer it does not extend, `component:variant` for a
 * value of its `variant` it leaves out — named by the component the product wrote, a composed component's own name
 * for a variant it gives its member (`text-field:outlined`). For a product's own test:
 * `expect(unavailableUses()).toEqual([])`. Empty in a production build, which reads nothing.
 */
export function unavailableUses(): string[] {
  return [...store().uses].sort();
}

/**
 * Availability as a Lit controller: when the host connects, and when its `variant` changes, the lists the
 * active system's stylesheet declares are read from the cascade, and a component or variant it leaves out — or a
 * component that lives in a layer the system does not extend — is recorded for `unavailableUses()` and reported once
 * per element in debug builds, as a warning or, in the error mode, an error (AVL-1, AVL-2, AVL-3). Nothing else
 * changes: what is left out still renders and works.
 */
export class AvailabilityController implements ReactiveController {
  private checked: string | undefined | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly component: string,
  ) {
    host.addController(this);
  }

  private variant(): string | undefined {
    return variantOf(this.host);
  }

  hostConnected() {
    this.check();
  }

  hostUpdated() {
    if (this.variant() !== this.checked) this.check();
  }

  private check() {
    this.checked = this.variant();
    // Read only in a debug build: `availabilityRead` is undefined in a production one.
    if (availabilityRead && this.host.isConnected) availabilityRead(this, this.host, this.component);
  }
}
