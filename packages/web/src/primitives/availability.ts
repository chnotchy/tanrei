import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { debugBuild, report } from './report.js';

/** What the active system does not ship: `component` or `component:variant`, space-separated, in one string. */
export const UNAVAILABLE = '--tanrei-unavailable';
/** What the active system uses instead: `<entry>=<replacement>[,<replacement>…]`, space-separated, in one string. */
export const UNAVAILABLE_REPLACEMENT = '--tanrei-unavailable-replacement';
/** What lives in a layer the active system does not extend: `<component>=<layer>`, space-separated, in one string. */
export const UNAVAILABLE_LAYER = '--tanrei-unavailable-layer';
/** The active system's id, in one string. */
export const SYSTEM = '--tanrei-system';

/** A string custom property's text: `"a b"` → `a b`; empty when the property is not declared. */
const unquote = (value: string) => value.trim().replace(/^(["'])(.*)\1$/s, '$2').trim();
const words = (value: string) => unquote(value).split(/\s+/).filter(Boolean);

export function parseUnavailable(value: string): Set<string> {
  return new Set(words(value));
}

export function parseReplacements(value: string): Map<string, string[]> {
  const replacements = new Map<string, string[]>();
  for (const pair of words(value)) {
    const at = pair.indexOf('=');
    const uses = pair.slice(at + 1).split(',').filter(Boolean);
    if (at > 0 && uses.length) replacements.set(pair.slice(0, at), uses);
  }
  return replacements;
}

/** Component → the layer it lives in, for the components the active system does not have. */
export function parseOutside(value: string): Map<string, string> {
  const outside = new Map<string, string>();
  for (const pair of words(value)) {
    const at = pair.indexOf('=');
    if (at > 0 && at < pair.length - 1) outside.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return outside;
}

/**
 * The report's text for a component used under a system that does not have it: it lives in a layer the system does
 * not extend, so the system's stylesheet holds none of its tokens.
 */
export function outsideMessage(component: string, layer: string, system: string | null): string {
  const under = system ? `the design system "${system}"` : 'the active design system';
  return `${component} lives in the layer "${layer}", which ${under} does not extend: its stylesheet has none of the component's tokens. Use a system that extends "${layer}", or include the component from it in a layer of your own`;
}

/** The entry that leaves this component, or this variant of it, out — the component whole first — or null. */
export function unavailableEntry(list: ReadonlySet<string>, component: string, variant?: string): string | null {
  if (list.has(component)) return component;
  const entry = `${component}:${variant}`;
  return variant && list.has(entry) ? entry : null;
}

const describe = (entry: string) => {
  const [component, variant] = entry.split(':');
  return variant ? `variant "${variant}" of ${component}` : component;
};

/** The report's text: what is left out, by which system (null: the active one, unnamed), and what it uses instead. */
export function unavailableMessage(entry: string, system: string | null, replacements: readonly string[] = []): string {
  const by = system ? `the design system "${system}"` : 'the active design system';
  const instead = replacements.length ? `, but the system uses ${replacements.map(describe).join(' or ')} instead` : '';
  return `${describe(entry)} is left out of ${by}; it still works${instead}`;
}

/** The nearest `data-tanrei-system` around the element, across shadow roots. */
function scopeSystem(element: Element): string | null {
  for (let node: Element | null = element; node; ) {
    const scope = node.closest('[data-tanrei-system]');
    if (scope) return scope.getAttribute('data-tanrei-system');
    const root = node.getRootNode();
    node = root instanceof ShadowRoot ? root.host : null;
  }
  return null;
}

/**
 * The hosts whose availability is to be read. Reading the cascade asks the browser to bring every style of the page
 * up to date, so the hosts that connect in one turn — the fifty code blocks of a page being defined, each with its
 * copy button and that button's Button — are read together, in one microtask, and cost the page one style pass
 * between them rather than one each.
 */
const due = new Set<AvailabilityController>();
function readDue() {
  const hosts = [...due];
  due.clear();
  for (const host of hosts) host.read();
}

/**
 * The read waits for the hosts' own updates of the turn. The computed style of an element that is a size container
 * (`container-type`: a link card, a table, a page header) is answered only after a layout, and a host that then
 * writes its content in its first update had the page laid out a second time, each container styled again inside it
 * (fifty link cards: 101 style passes and 2 layouts where 51 and 1 are owed). Read after them, the layout it asks for
 * is the one the frame needed anyway.
 */
function readDueOnceDrawn() {
  void Promise.all([...due].map((each) => each.drawn())).then(readDue);
}

/**
 * Availability as a Lit controller: when the host connects, and when its `variant` changes, the lists the
 * active system's stylesheet declares are read from the cascade, and a component or variant it leaves out — or a
 * component that lives in a layer the system does not extend — is reported once per element in debug builds. Nothing
 * else changes: what is left out still renders and works.
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
    const variant = (this.host as unknown as { variant?: unknown }).variant;
    return typeof variant === 'string' ? variant : undefined;
  }

  hostConnected() {
    this.check();
  }

  hostUpdated() {
    if (this.variant() !== this.checked) this.check();
  }

  private check() {
    this.checked = this.variant();
    if (!debugBuild() || !this.host.isConnected) return;
    if (!due.size) queueMicrotask(readDueOnceDrawn);
    due.add(this);
  }

  /** The host's update of this turn, done (or failed: the read does not depend on it). */
  drawn(): Promise<unknown> {
    return this.host.updateComplete.catch(() => undefined);
  }

  /** Reads the cascade for this host, as it is now. Called for every host that is due, in one pass. */
  read() {
    if (!this.host.isConnected) return;
    const style = getComputedStyle(this.host);
    const layer = parseOutside(style.getPropertyValue(UNAVAILABLE_LAYER)).get(this.component);
    if (layer) {
      report(this.host, 'availability', outsideMessage(this.component, layer, unquote(style.getPropertyValue(SYSTEM)) || scopeSystem(this.host)));
      return;
    }
    const entry = unavailableEntry(parseUnavailable(style.getPropertyValue(UNAVAILABLE)), this.component, this.variant());
    if (!entry) return;
    const system = unquote(style.getPropertyValue(SYSTEM)) || scopeSystem(this.host);
    report(this.host, 'availability', unavailableMessage(entry, system, parseReplacements(style.getPropertyValue(UNAVAILABLE_REPLACEMENT)).get(entry)));
  }
}
