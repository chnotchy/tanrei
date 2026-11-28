import type { ReactiveControllerHost } from 'lit';
import { report } from './report.js';
import { DEBUG } from './debug.js';

// What AvailabilityController (availability.ts) reads in a debug build: the lists the active system's stylesheet
// declares, the record of uses and the reports. A production build reads none of it, and a bundler leaves it out: the
// controller reaches it only through `availabilityRead` (availability-debug.ts), which a browser bundler takes from
// availability-debug.bundled.ts, where the constant that decides it is replaced and nothing here is used.

/** What the active system does not ship: `component` or `component:variant`, space-separated, in one string. */
export const UNAVAILABLE = '--tanrei-unavailable';
/** What the active system uses instead: `<entry>=<replacement>[,<replacement>…]`, space-separated, in one string. */
export const UNAVAILABLE_REPLACEMENT = '--tanrei-unavailable-replacement';
/** What lives in a layer the active system does not extend: `<component>=<layer>`, space-separated, in one string. */
export const UNAVAILABLE_LAYER = '--tanrei-unavailable-layer';
/** The active system's id, in one string. */
export const SYSTEM = '--tanrei-system';

/** How a use of what the active system does not have is reported: a warning, or an error (`setAvailabilityMode()`). */
export type AvailabilityMode = 'warn' | 'error';

/**
 * Kept under a registered symbol, not in this module, so that two copies of the module on one page (the bundle and
 * `@tanrei/web/availability` imported beside it) share one mode and one record.
 */
interface Store {
  mode: AvailabilityMode;
  /** The uses since the page loaded, each as `component` or `component:variant`, named by what the product wrote. */
  uses: Set<string>;
}
const STORE = Symbol.for('tanrei.availability');
export function store(): Store {
  const holder = globalThis as { [STORE]?: Store };
  return (holder[STORE] ??= { mode: 'warn', uses: new Set() });
}

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

/** An entry as a sentence names it: `variant "filled" of navigation-bar`, or the component. */
const describe = (entry: string) => {
  const [component, variant] = entry.split(':');
  return variant ? `variant "${variant}" of ${component}` : component;
};

/**
 * The report's text for a component used under a system that does not have it: it lives in a layer the system does
 * not extend, so the system's stylesheet holds none of its tokens. `replacements`: what the system uses instead (AVL-2);
 * `drawnBy`: the component the product wrote, where another draws this one inside it.
 */
export function outsideMessage(component: string, layer: string, system: string | null, replacements: readonly string[] = [], drawnBy?: string): string {
  const under = system ? `the design system "${system}"` : 'the active design system';
  const what = drawnBy ? `${drawnBy} draws ${component}, which` : component;
  const instead = replacements.length ? `The system uses ${replacements.map(describe).join(' or ')} instead; or use` : 'Use';
  return `${what} lives in the layer "${layer}", which ${under} does not extend: its stylesheet has none of the component's tokens. ${instead} a system that extends "${layer}", or include the component from it in a layer of your own`;
}

/** The entry that leaves this component, or this variant of it, out — the component whole first — or null. */
export function unavailableEntry(list: ReadonlySet<string>, component: string, variant?: string): string | null {
  if (list.has(component)) return component;
  const entry = `${component}:${variant}`;
  return variant && list.has(entry) ? entry : null;
}


/**
 * The report's text: what is left out, by which system (null: the active one, unnamed), and what it uses instead.
 * `drawnBy`: the component the product wrote, where it draws the entry inside it without giving it as its own variant.
 */
export function unavailableMessage(entry: string, system: string | null, replacements: readonly string[] = [], drawnBy?: string): string {
  const by = system ? `the design system "${system}"` : 'the active design system';
  const instead = replacements.length ? `, but the system uses ${replacements.map(describe).join(' or ')} instead` : '';
  const what = drawnBy ? `${drawnBy} draws ${describe(entry)}, which` : describe(entry);
  return `${what} is left out of ${by}; it still works${instead}`;
}

/**
 * The element the product wrote, and its component's name, for an element of `component` that another component
 * draws in its shadow root (a text field's text input): the outermost component around it, across shadow roots. The
 * element itself where it stands in the page's own tree. A component is told by its tag: the prefix the element's own
 * tag puts before its component's name.
 */
export function writtenAs(element: Element, component: string): { host: Element; component: string } {
  const prefix = element.localName.endsWith(component) ? element.localName.slice(0, -component.length) : null;
  let host = element;
  for (let root = element.getRootNode(); prefix && root instanceof ShadowRoot && root.host.localName.startsWith(prefix); root = root.host.getRootNode()) host = root.host;
  return { host, component: host === element ? component : host.localName.slice(prefix!.length) };
}

/**
 * The use as the product wrote it (AVL-1): `entry` (`component` or `component:variant`) of an element a component
 * `outer` draws. A variant the outer component has as well is its own (the text field's `outlined`, given to its text
 * input); anything else is the entry the outer component draws.
 */
export function useOf(entry: string, outer: { component: string; variant?: string }, own: string): { use: string; drawn: boolean } {
  if (outer.component === own) return { use: entry, drawn: false };
  const variant = entry.split(':')[1];
  if (variant && outer.variant === variant) return { use: `${outer.component}:${variant}`, drawn: false };
  return { use: entry, drawn: true };
}

/** An element's `variant`, where it has one. */
export function variantOf(element: Element): string | undefined {
  const variant = (element as unknown as { variant?: unknown }).variant;
  return typeof variant === 'string' ? variant : undefined;
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

type Host = ReactiveControllerHost & HTMLElement;

/**
 * The hosts whose availability is to be read, by the controller that asked, each with its component. Reading the
 * cascade asks the browser to bring every style of the page up to date, so the hosts that connect in one turn — the
 * fifty code blocks of a page being defined, each with its copy button and that button's Button — are read together,
 * in one microtask, and cost the page one style pass between them rather than one each.
 */
const due = new Map<object, { host: Host; component: string }>();
function readDue() {
  const hosts = [...due.values()];
  due.clear();
  for (const { host, component } of hosts) read(host, component);
}

/**
 * The read waits for the hosts' own updates of the turn (done, or failed: the read does not depend on it). The computed
 * style of an element that is a size container (`container-type`: a link card, a table, a page header) is answered
 * only after a layout, and a host that then writes its content in its first update had the page laid out a second
 * time, each container styled again inside it (fifty link cards: 101 style passes and 2 layouts where 51 and 1 are
 * owed). Read after them, the layout it asks for is the one the frame needed anyway.
 */
function readDueOnceDrawn() {
  void Promise.all([...due.values()].map(({ host }) => host.updateComplete.catch(() => undefined))).then(readDue);
}

/** The host of the controller `by` is to be read for `component`, with every other host due in this turn. */
export function queueRead(by: object, host: Host, component: string): void {
  if (!due.size) queueMicrotask(readDueOnceDrawn);
  due.set(by, { host, component });
}

/**
 * Reads the cascade for this host, as it is now. Called for every host that is due, in one pass. A use is recorded
 * and reported under the element the product wrote (AVL-1): a text field's, for the text input it draws.
 */
function read(host: Host, component: string) {
  if (!host.isConnected) return;
  const style = getComputedStyle(host);
  const layer = parseOutside(style.getPropertyValue(UNAVAILABLE_LAYER)).get(component);
  const entry = layer ? component : unavailableEntry(parseUnavailable(style.getPropertyValue(UNAVAILABLE)), component, variantOf(host));
  if (!entry) return;
  const outer = writtenAs(host, component);
  const { use, drawn } = useOf(entry, { component: outer.component, variant: variantOf(outer.host) }, component);
  const held = store();
  held.uses.add(use);
  // The message is made in the report's own arguments, which a production bundle leaves out with the call.
  if (DEBUG) {
    report(
      outer.host,
      'availability',
      (() => {
        const system = unquote(style.getPropertyValue(SYSTEM)) || scopeSystem(host);
        // AVL-2: what the system names instead — of the use as the product wrote it, else of what the element draws.
        const named = parseReplacements(style.getPropertyValue(UNAVAILABLE_REPLACEMENT));
        const instead = named.get(use) ?? named.get(entry) ?? [];
        const by = drawn ? outer.component : undefined;
        return layer ? outsideMessage(component, layer, system, instead, by) : unavailableMessage(drawn ? entry : use, system, instead, by);
      })(),
      { level: held.mode === 'error' ? 'error' : 'warn' },
    );
  }
}
