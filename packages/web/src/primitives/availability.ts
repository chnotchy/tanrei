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

/** How a use of what the active system does not have is reported: a warning, or an error (`setAvailabilityMode()`). */
export type AvailabilityMode = 'warn' | 'error';
const MODES: readonly AvailabilityMode[] = ['warn', 'error'];

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
function store(): Store {
  const holder = globalThis as { [STORE]?: Store };
  return (holder[STORE] ??= { mode: 'warn', uses: new Set() });
}

/**
 * How a debug build reports a component, or a value of its `variant`, that the active system does not have (AVL-3):
 * `'warn'` (the default) as a warning, `'error'` as an error — for a product's own tests, which can fail on it. Every
 * use is recorded for `unavailableUses()` in either mode. A production build reads, reports and records nothing.
 */
export function setAvailabilityMode(mode: AvailabilityMode): void {
  if (!MODES.includes(mode)) {
    if (debugBuild()) console.warn(`[tanrei] setAvailabilityMode(): "${String(mode)}" is not a mode (${MODES.join(', ')}); the mode stays "${store().mode}"`);
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
function variantOf(element: Element): string | undefined {
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
    if (!debugBuild() || !this.host.isConnected) return;
    if (!due.size) queueMicrotask(readDueOnceDrawn);
    due.add(this);
  }

  /** The host's update of this turn, done (or failed: the read does not depend on it). */
  drawn(): Promise<unknown> {
    return this.host.updateComplete.catch(() => undefined);
  }

  /**
   * Reads the cascade for this host, as it is now. Called for every host that is due, in one pass. A use is recorded
   * and reported under the element the product wrote (AVL-1): a text field's, for the text input it draws.
   */
  read() {
    if (!this.host.isConnected) return;
    const style = getComputedStyle(this.host);
    const layer = parseOutside(style.getPropertyValue(UNAVAILABLE_LAYER)).get(this.component);
    const entry = layer ? this.component : unavailableEntry(parseUnavailable(style.getPropertyValue(UNAVAILABLE)), this.component, this.variant());
    if (!entry) return;
    const outer = writtenAs(this.host, this.component);
    const { use, drawn } = useOf(entry, { component: outer.component, variant: variantOf(outer.host) }, this.component);
    const held = store();
    held.uses.add(use);
    const system = unquote(style.getPropertyValue(SYSTEM)) || scopeSystem(this.host);
    // AVL-2: what the system names instead — of the use as the product wrote it, else of what the element draws.
    const named = parseReplacements(style.getPropertyValue(UNAVAILABLE_REPLACEMENT));
    const instead = named.get(use) ?? named.get(entry) ?? [];
    const by = drawn ? outer.component : undefined;
    const message = layer ? outsideMessage(this.component, layer, system, instead, by) : unavailableMessage(drawn ? entry : use, system, instead, by);
    report(outer.host, 'availability', message, { level: held.mode === 'error' ? 'error' : 'warn' });
  }
}
