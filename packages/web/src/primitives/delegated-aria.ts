// ARIA a product sets on the host of a component whose role is carried by an element inside it — the native `<button>`
// of a Button, the `<input>` of a text input — is moved to `data-aria-*` on the host and exposed on that element.
//
// The host of a custom element is a box with no role of its own. Left on it, `aria-label`, `aria-labelledby`,
// `aria-describedby`, `aria-description`, `aria-current`, `aria-invalid`, `aria-busy`, `aria-controls` and
// `aria-haspopup` each make the host a second node in Chromium's, Firefox's and WebKit's accessibility trees, with the
// same name, description or state as the control inside it; neither `role="none"` (attribute or internals) nor
// `display: contents` removes that node. So every `aria-*` attribute of the list below moves, as the product wrote
// it, to `data-aria-*` of the same name — `aria-current="page"` becomes `data-aria-current="page"` — and the component
// exposes it on its control:
//
//   delegatesAria(Class, { owns })   after the class is written, before it is defined. The host observes every name of
//                                    the list and its `data-aria-` twin; an `aria-X` written on it — by markup, by
//                                    `setAttribute()`, by a framework, by an ARIA property (`host.ariaCurrent = …`,
//                                    `host.ariaDescribedByElements = […]`) — moves to `data-aria-X`. `removeAttribute()`
//                                    and `toggleAttribute()` of a moved name are overridden so that a framework that
//                                    takes away the `aria-X` it set (React, Vue, Lit) takes the moved value away too,
//                                    and the setter of each name's ARIA property, so that `host.ariaX = null` (Lit's
//                                    `.ariaX=${nothing}`) takes it away as well. Nothing else is overridden, getters
//                                    neither: `getAttribute('aria-X')` is null and `ariaX` is null,
//                                    because the host does not have them; the value is `data-aria-X`, and a selector
//                                    reads `[data-aria-X]`. `owns` names what the component says itself (a toggle's
//                                    `aria-pressed`, a checkbox's `aria-checked`, `aria-disabled`): those move too, so
//                                    the host carries nothing, are not exposed, and a debug build reports each one
//                                    set (`report()`, citing `sentence` — the id of the spec sentence that states this
//                                    rule for the component, "WHERE the platform has ARIA attributes (the web)" — and
//                                    `instead`, what to write in its place). A composed element that passes the product's ARIA on to a member
//                                    that moves it owns what that member owns as well (`ownedNames()`).
//   delegatedAria(host, own)         on the element that carries the role, in the template: `own` is what the component
//                                    says itself (`'aria-label': this.label`); an empty value leaves the name to the
//                                    product's, and an owned name is never the product's. A name of its own — a
//                                    non-empty `aria-label`, or ids of its own in `aria-labelledby` — is its whole name
//                                    while it is set: the product's `aria-label` and `aria-labelledby` are kept out (a
//                                    label given is the name, BTN-16, TXI-23…), so a control named by its content passes
//                                    that text as its `aria-label` (a chip's label). A relationship of its own is ids of
//                                    its shadow root (`'aria-describedby': 'description'`), joined in front of the
//                                    product's elements; `null` for a relationship keeps the product's out. Nothing else
//                                    on that element binds a name it writes; an owned name it does not pass may stay a
//                                    binding of its own.
//                                    On a member that moves the product's ARIA itself (a composed field's control, a
//                                    Copy button's Button), it writes on the member's host as a product would, and
//                                    the member moves and exposes it; that write is the component's (`asComponent()`).
//   new DelegatedAriaWriter()        the same, for a member the template does not draw (the row a tab view places in
//                                    its light DOM): `writer.write(member, host, own)` after each of the host's updates.
//
// A relationship (`aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-details`, `aria-flowto`,
// `aria-errormessage`) names elements by id. Its ids are looked up in the host's tree (`getRootNode()`) and the elements
// assigned to the control by ARIA element reflection (`ariaDescribedByElements` …), which may point from a shadow root
// to an element of its own tree or of a tree around it, never into another component's shadow root (Chrome and Edge
// 135, Firefox 136, Safari 16.4). While the host names elements, a watch on its tree follows them: an element added
// later, removed, replaced by another of the same id, or whose text changes, is drawn again. An element that has left
// the page is taken off the control (the reflected getter leaves it out, but the engine would keep its text).
// `aria-errormessage` is never written on the control: while the control is invalid (`aria-invalid="true"`) the
// elements it names join its description, after those of `aria-describedby` — the description a person hears, and no
// empty `aria-errormessage=""` for a checker to refuse.
//
// Playwright's own name and description computation does not follow reflected element references: it reads the
// `aria-labelledby` / `aria-describedby` attribute and looks its ids up in the element's own tree, and reflection
// leaves that attribute empty. So, for Playwright and for the engines alike:
//   - a name given by `aria-labelledby` is drawn by reference and, beside it, as its text in `aria-label`, kept in step
//     with the text (the engines take the reference over the string, so they expose the same);
//   - a description given by `aria-describedby` (and the error message joined to it) is a copy of the text in a hidden
//     element of the control's own shadow root, which the control's `aria-describedby` names by id after the
//     component's own ids. Each new text is a new copy under the other of two ids: Chromium's macOS tree does not follow
//     a change of the text of a hidden element a description names, but does follow a reference to another element.
// Remove both when Playwright follows reflected element references; `aria-controls` and `aria-details`, which no
// Playwright assertion reads, are drawn by reference alone.
//
// Where an engine has no element reflection, the text of the elements named stands in for them: the label's as the
// name, the description's (and the error message's) after the component's own description.
import { noChange } from 'lit';
import { AsyncDirective } from 'lit/async-directive.js';
import { type ElementPart, type PartInfo, PartType, directive } from 'lit/directive.js';
import { report } from './report.js';

/** The states and properties that move, by attribute. (`aria-hidden` is not one: it hides the whole component.) */
export const DELEGATED_STATES = [
  'aria-label',
  'aria-description',
  'aria-roledescription',
  'aria-expanded',
  'aria-haspopup',
  'aria-pressed',
  'aria-checked',
  'aria-selected',
  'aria-disabled',
  'aria-invalid',
  'aria-required',
  'aria-readonly',
  'aria-current',
  'aria-keyshortcuts',
  'aria-busy',
  'aria-placeholder',
] as const;

/** The relationships that move, by attribute, with the element reflection property of each. */
export const DELEGATED_RELATIONS = {
  'aria-labelledby': 'ariaLabelledByElements',
  'aria-describedby': 'ariaDescribedByElements',
  'aria-controls': 'ariaControlsElements',
  'aria-details': 'ariaDetailsElements',
  'aria-flowto': 'ariaFlowToElements',
  'aria-errormessage': 'ariaErrorMessageElements',
} as const;

type StateName = (typeof DELEGATED_STATES)[number];
type RelationName = keyof typeof DELEGATED_RELATIONS;
export type DelegatedName = StateName | RelationName;

const ALL: readonly DelegatedName[] = [...DELEGATED_STATES, ...(Object.keys(DELEGATED_RELATIONS) as RelationName[])];

/** The ARIA property that reflects each name (ARIA's reflection: `aria-roledescription` is `ariaRoleDescription`). */
const ARIA_PROPERTIES: Record<DelegatedName, string> = {
  'aria-label': 'ariaLabel',
  'aria-description': 'ariaDescription',
  'aria-roledescription': 'ariaRoleDescription',
  'aria-expanded': 'ariaExpanded',
  'aria-haspopup': 'ariaHasPopup',
  'aria-pressed': 'ariaPressed',
  'aria-checked': 'ariaChecked',
  'aria-selected': 'ariaSelected',
  'aria-disabled': 'ariaDisabled',
  'aria-invalid': 'ariaInvalid',
  'aria-required': 'ariaRequired',
  'aria-readonly': 'ariaReadOnly',
  'aria-current': 'ariaCurrent',
  'aria-keyshortcuts': 'ariaKeyShortcuts',
  'aria-busy': 'ariaBusy',
  'aria-placeholder': 'ariaPlaceholder',
  ...DELEGATED_RELATIONS,
};
const NAMES = Symbol('tanrei.delegatedAria.names');
const OWNS = Symbol('tanrei.delegatedAria.owns');
const GIVEN = Symbol('tanrei.delegatedAria.given');
const WATCH = Symbol('tanrei.delegatedAria.watch');
const SET = Symbol('tanrei.delegatedAria.set');

interface Delegating extends HTMLElement {
  /** Elements a relationship was given by property (`host.ariaDescribedByElements = […]`): no id to keep. */
  [GIVEN]?: Map<RelationName, readonly Element[]>;
  [WATCH]?: TreeWatch;
  /** Elements a relationship's property setter was given, until the attribute it writes is moved. */
  [SET]?: Map<RelationName, readonly Element[]>;
  requestUpdate(): void;
}

const isRelation = (name: string): name is RelationName => name in DELEGATED_RELATIONS;
const dataName = (name: string) => `data-${name}`;

/** Whether `element`'s class moves the product's ARIA (`delegatesAria()`). */
export function delegates(element: Element): boolean {
  return !!(element.constructor as unknown as { [NAMES]?: unknown })[NAMES];
}

/** The names a class moves and exposes: every one of the list but those it owns. Empty for a class that does not move. */
export function delegatedNames(element: Element): readonly DelegatedName[] {
  return (element.constructor as unknown as { [NAMES]?: readonly DelegatedName[] })[NAMES] ?? [];
}

/** The names a class owns (`delegatesAria()`'s `owns`): moved and never exposed. Empty for a class that does not move. */
export function ownedNames(element: { prototype: HTMLElement }): readonly DelegatedName[] {
  return (element as unknown as { [OWNS]?: readonly DelegatedName[] })[OWNS] ?? [];
}

/**
 * How deep the components' own writes on another element are: a value a Tanrei component writes on a member it holds
 * (a composed field on its control, this directive on a Button) is not the product's, and an owned name it writes is
 * not reported.
 */
let componentWriting = 0;

/** Runs `write` as a component's own write on another element (above). */
export function asComponent<T>(write: () => T): T {
  componentWriting++;
  try {
    return write();
  } finally {
    componentWriting--;
  }
}

/**
 * The value of `aria-X` a product gave `element`: on a component that moves it, its `data-aria-X`; on any other element,
 * the attribute itself. For code that reads or takes back what it wrote on an element it does not know (a field's
 * `aria-invalid`, a tooltip's or a badge's `aria-description`).
 */
export function ariaAttribute(element: Element, name: string): string | null {
  return delegates(element) && (ALL as readonly string[]).includes(name) ? element.getAttribute(dataName(name)) : element.getAttribute(name);
}

/** Whether this engine has ARIA element reflection for `name`. */
const reflects = (name: RelationName) => typeof Element !== 'undefined' && DELEGATED_RELATIONS[name] in Element.prototype;

/** The elements a relationship of the host names now: given by property, or each id looked up in its tree (those found). */
function relationElements(host: Delegating, name: RelationName): Element[] {
  const given = host[GIVEN]?.get(name);
  const ids = host.getAttribute(dataName(name));
  if (given && ids === '') return given.filter((element) => element.isConnected);
  if (!ids) return [];
  const root = host.getRootNode() as Document | ShadowRoot;
  return ids
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => root.getElementById?.(id) ?? null)
    .filter((element): element is HTMLElement => element !== null);
}

/**
 * Whether the product has named `host` itself — a non-empty `aria-label`, or an `aria-labelledby` that names an element
 * — for a component whose check for a missing name must count it (BTN-16, TXI-23, TAB-22…). On a component that moves
 * the product's ARIA it reads `data-aria-*`; on one whose host carries its role itself (a tab), the attributes, or the
 * elements given by property (`host.ariaLabelledByElements`).
 */
export function namedByProduct(host: Element): boolean {
  if (ariaAttribute(host, 'aria-label')?.trim()) return true;
  if (delegates(host)) return relationElements(host as Delegating, 'aria-labelledby').length > 0;
  const given = reflects('aria-labelledby') ? (host as Element & { ariaLabelledByElements?: readonly Element[] | null }).ariaLabelledByElements : null;
  if (given?.some((element) => element.isConnected)) return true;
  const root = host.getRootNode() as Document | ShadowRoot;
  return (host.getAttribute('aria-labelledby') ?? '').split(/\s+/).some((id) => !!id && !!root.getElementById?.(id));
}

/**
 * While the host names elements, a watch on its tree: an element added, removed or given another id, and a change of
 * the text of an element it names, update the host. A host that names nothing watches nothing.
 */
class TreeWatch {
  private observer: MutationObserver | null = null;
  private root: Node | null = null;
  /** The elements drawn last, whose text is followed. */
  named: Element[] = [];

  constructor(private readonly host: Delegating) {}

  sync() {
    const wanted = this.host.isConnected && (Object.keys(DELEGATED_RELATIONS) as RelationName[]).some((name) => this.host.getAttribute(dataName(name)) !== null);
    const root = wanted ? this.host.getRootNode() : null;
    if (root === this.root) return;
    this.observer?.disconnect();
    this.observer = null;
    this.root = root;
    if (!root || typeof MutationObserver === 'undefined') return;
    this.observer = new MutationObserver((records) => {
      const touches = records.some(
        (record) => record.type !== 'characterData' || this.named.some((element) => element.contains(record.target)),
      );
      if (touches) this.host.requestUpdate();
    });
    this.observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['id'] });
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.root = null;
  }
}

const watchOf = (host: Delegating) => (host[WATCH] ??= new TreeWatch(host));

/** The setter of each name's ARIA property as the platform has it (`Element.prototype`), where it has one. */
const platformSetters = new Map<DelegatedName, (value: unknown) => void>(
  typeof Element === 'undefined'
    ? []
    : ALL.flatMap((name) => {
        const set = Object.getOwnPropertyDescriptor(Element.prototype, ARIA_PROPERTIES[name])?.set;
        return set ? [[name, set] as const] : [];
      }),
);


/** What `delegatesAria()` is told. */
export interface DelegatesAriaOptions {
  /** What the component says itself: moved, never exposed, and reported where the product sets it. */
  owns?: readonly DelegatedName[];
  /** The id of the component's spec sentence that states this rule ("WHERE the platform has ARIA attributes (the web)…"), which a report of an owned name cites. */
  sentence: string;
  /** For an owned name, what the product writes in its place (`'name it with label'`), said in its report. */
  instead?: Partial<Record<DelegatedName, string>>;
}

/**
 * Makes `element`'s class move the product's ARIA from its host to `data-aria-*` and expose it on the element that
 * carries its role (`delegatedAria()`): every name of the list, those in `owns` moved and not exposed — and, in a debug
 * build, reported once per element and name where something other than a Tanrei component sets one (`asComponent()`).
 */
export function delegatesAria(element: { prototype: HTMLElement; observedAttributes?: string[] }, { owns = [], sentence, instead = {} }: DelegatesAriaOptions): void {
  const exposed = ALL.filter((name) => !owns.includes(name));
  const moved = new Set<string>(ALL);
  const owned = new Set<string>(owns);
  const watched = new Set<string>(ALL.map(dataName));
  const ctor = element as unknown as Record<symbol, unknown>;
  ctor[NAMES] = exposed;
  ctor[OWNS] = owns;

  // The getter the class inherits (Lit's, or one of its own that adds to it), called for this class.
  let observed: PropertyDescriptor | undefined;
  for (let at: object | null = element; at && !observed; at = Object.getPrototypeOf(at)) observed = Object.getOwnPropertyDescriptor(at, 'observedAttributes');
  Object.defineProperty(element, 'observedAttributes', {
    configurable: true,
    get(this: unknown) {
      const own = (observed?.get?.call(this) as string[] | undefined) ?? [];
      return [...own, ...moved, ...watched];
    },
  });

  // The element's own methods as it inherits them (the DOM's), read before two of them are replaced. A module that is
  // only imported where there is no DOM (a server's render, a test of the manifest in Node) defines the class and calls
  // none of them.
  const prototype = element.prototype as Delegating & Record<string, unknown>;
  const { removeAttribute, toggleAttribute, setAttribute, hasAttribute } = element.prototype;
  const attributeChanged = prototype.attributeChangedCallback as ((name: string, old: string | null, value: string | null) => void) | undefined;
  const connected = prototype.connectedCallback as (() => void) | undefined;
  const disconnected = prototype.disconnectedCallback as (() => void) | undefined;

  prototype.attributeChangedCallback = function (this: Delegating, name: string, old: string | null, value: string | null) {
    if (watched.has(name)) {
      if (isRelation(name.slice(5))) watchOf(this).sync();
      this.requestUpdate();
      return;
    }
    if (!moved.has(name)) return attributeChanged?.call(this, name, old, value);
    // Its own removal below, or the product's of a name already moved: nothing to move.
    if (value === null) return;
    // What the component says itself, set on it: moved like the rest, and not exposed — which the developer is told.
    if (owned.has(name) && !componentWriting) {
      const hint = instead[name as DelegatedName];
      report(this, sentence, `${name} on the element is the component's own to say, so it is moved to data-${name} and not exposed${hint ? `; ${hint}` : ''}`);
    }
    if (isRelation(name)) {
      // Set by the property (`ariaDescribedByElements = […]`), the attribute is empty: the elements are those its setter
      // was given (the engine's getter leaves out every one outside the host's tree, all of them while it is not in
      // the page yet: a template's clone), else the engine's.
      const set = this[SET]?.get(name);
      this[SET]?.delete(name);
      const elements = value === '' ? (set ?? (Object.getOwnPropertyDescriptor(Element.prototype, DELEGATED_RELATIONS[name])?.get?.call(this) as Element[] | null) ?? []) : null;
      const given = (this[GIVEN] ??= new Map());
      if (elements) given.set(name, [...elements]);
      else given.delete(name);
      setAttribute.call(this, dataName(name), value);
      // The engine's own list is cleared with the attribute (Firefox keeps it when only the attribute is removed, and
      // the host would be a second node with its description).
      const clear = platformSetters.get(name);
      if (elements && clear) clear.call(this, null);
      else removeAttribute.call(this, name);
      return;
    }
    setAttribute.call(this, dataName(name), value);
    removeAttribute.call(this, name);
  };

  // A framework takes away the `aria-X` it set by removing it: the moved value goes with it.
  prototype.removeAttribute = function (this: Delegating, name: string) {
    const lower = String(name).toLowerCase();
    if (moved.has(lower)) {
      this[GIVEN]?.delete(lower as RelationName);
      removeAttribute.call(this, dataName(lower));
    }
    removeAttribute.call(this, name);
  };

  prototype.toggleAttribute = function (this: Delegating, name: string, force?: boolean) {
    const lower = String(name).toLowerCase();
    if (!moved.has(lower)) return toggleAttribute.call(this, name, force);
    const on = force ?? !hasAttribute.call(this, dataName(lower));
    if (on) this.setAttribute(lower, '');
    else this.removeAttribute(lower);
    return on;
  };

  // An ARIA property set on the host (`host.ariaLabel = …`, Lit's `.ariaLabel=${…}`) writes the attribute, which moves; set
  // to null it would take away an attribute already gone, so nothing would follow: null (or an empty list of elements)
  // takes the moved value away as removing the attribute does. Only the setters are the component's; a getter is the
  // platform's, and reads nothing on the host, which carries nothing.
  for (const name of ALL) {
    const set = platformSetters.get(name);
    if (!set) continue;
    Object.defineProperty(element.prototype, ARIA_PROPERTIES[name], {
      configurable: true,
      enumerable: true,
      get: Object.getOwnPropertyDescriptor(Element.prototype, ARIA_PROPERTIES[name])?.get,
      set(this: Delegating, value: unknown) {
        if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) return this.removeAttribute(name);
        // The elements, for the move: an engine may run it after this setter has returned (Firefox).
        if (isRelation(name)) (this[SET] ??= new Map()).set(name, [...(value as Iterable<Element>)]);
        set.call(this, value);
      },
    });
  }

  prototype.connectedCallback = function (this: Delegating) {
    connected?.call(this);
    watchOf(this).sync();
  };

  prototype.disconnectedCallback = function (this: Delegating) {
    disconnected?.call(this);
    this[WATCH]?.stop();
  };
}

/** The names a host that carries its role itself holds while it names itself (`holdsProductName()`). */
const NAMING = ['aria-label', 'aria-labelledby'] as const;
type NamingName = (typeof NAMING)[number];
const isNaming = (name: string): name is NamingName => (NAMING as readonly string[]).includes(name);

/** The name a host that carries its role itself gives itself now (`nameHost()`), and the elements of a held `aria-labelledby`. */
const OWN_NAME = Symbol('tanrei.delegatedAria.ownName');
const HELD = Symbol('tanrei.delegatedAria.held');

interface Naming extends HTMLElement {
  [OWN_NAME]?: string;
  [HELD]?: readonly Element[] | null;
  [SET]?: Map<RelationName, readonly Element[]>;
}

// The DOM's own methods, which `holdsProductName()` replaces on a class for its two names.
const domSet = typeof Element === 'undefined' ? null : Element.prototype.setAttribute;
const domRemove = typeof Element === 'undefined' ? null : Element.prototype.removeAttribute;

/** Holds the name the product wrote (`aria-X` = `value`) as `data-aria-X`, so that the host's own is its whole name. */
function hold(host: Naming, name: NamingName, value: string) {
  if (name === 'aria-labelledby') {
    // Set by the property, the attribute is empty: the elements are those its setter was given, else the engine's.
    const set = host[SET]?.get(name);
    host[SET]?.delete(name);
    const elements = value === '' ? (set ?? (Object.getOwnPropertyDescriptor(Element.prototype, DELEGATED_RELATIONS[name])?.get?.call(host) as Element[] | null) ?? []) : null;
    host[HELD] = elements ? [...elements] : null;
    domSet!.call(host, dataName(name), value);
    const clear = platformSetters.get(name);
    if (elements && clear) clear.call(host, null);
    else domRemove!.call(host, name);
    return;
  }
  domSet!.call(host, dataName(name), value);
  asComponent(() => domSet!.call(host, name, host[OWN_NAME]!));
}

/**
 * Makes `element`'s class — one whose host carries its role itself, so that what the product writes on it is the
 * platform's ARIA and is not moved (a tab) — hold the product's name while the component names the host itself
 * (`nameHost()`): the platform would give the name to an `aria-labelledby` over the component's `aria-label`, so the
 * product's `aria-label` and `aria-labelledby` are held as `data-aria-label` / `data-aria-labelledby` while it does,
 * and given back as they were written once it no longer does. Removing one (`removeAttribute()`, `toggleAttribute()`,
 * React's `undefined`, Lit's `nothing`), its `data-aria-` twin, or setting its ARIA property to null takes the held
 * value away.
 */
export function holdsProductName(element: { prototype: HTMLElement; observedAttributes?: string[] }): void {
  let observed: PropertyDescriptor | undefined;
  for (let at: object | null = element; at && !observed; at = Object.getPrototypeOf(at)) observed = Object.getOwnPropertyDescriptor(at, 'observedAttributes');
  Object.defineProperty(element, 'observedAttributes', {
    configurable: true,
    get(this: unknown) {
      return [...((observed?.get?.call(this) as string[] | undefined) ?? []), ...NAMING];
    },
  });
  const prototype = element.prototype as Naming & Record<string, unknown>;
  const { removeAttribute, toggleAttribute, setAttribute } = element.prototype;
  const attributeChanged = prototype.attributeChangedCallback as ((name: string, old: string | null, value: string | null) => void) | undefined;

  prototype.attributeChangedCallback = function (this: Naming, name: string, old: string | null, value: string | null) {
    // The component's own write, the product's while the host does not name itself, and a removal: as they are.
    if (!isNaming(name) || componentWriting || !this[OWN_NAME] || value === null) return attributeChanged?.call(this, name, old, value);
    hold(this, name, value);
  };

  prototype.removeAttribute = function (this: Naming, name: string) {
    const lower = String(name).toLowerCase();
    if (!isNaming(lower) || componentWriting) return removeAttribute.call(this, name);
    if (lower === 'aria-labelledby') this[HELD] = null;
    removeAttribute.call(this, dataName(lower));
    // While it names itself, the host's aria-label is its own: the product takes away only what it wrote.
    if (lower === 'aria-label' && this[OWN_NAME]) return;
    removeAttribute.call(this, name);
  };

  prototype.toggleAttribute = function (this: Naming, name: string, force?: boolean) {
    const lower = String(name).toLowerCase();
    if (!isNaming(lower) || componentWriting) return toggleAttribute.call(this, name, force);
    const on = force ?? !(this.hasAttribute(dataName(lower)) || (!this[OWN_NAME] && this.hasAttribute(lower)));
    if (on) setAttribute.call(this, lower, '');
    else this.removeAttribute(lower);
    return on;
  };

  for (const name of NAMING) {
    const set = platformSetters.get(name);
    if (!set) continue;
    Object.defineProperty(element.prototype, ARIA_PROPERTIES[name], {
      configurable: true,
      enumerable: true,
      get: Object.getOwnPropertyDescriptor(Element.prototype, ARIA_PROPERTIES[name])?.get,
      set(this: Naming, value: unknown) {
        if (!componentWriting && (value === null || value === undefined || (Array.isArray(value) && value.length === 0))) return this.removeAttribute(name);
        // The elements, for the hold: an engine may run it after this setter has returned (Firefox).
        if (isRelation(name) && !componentWriting) (this[SET] ??= new Map()).set(name, [...(value as Iterable<Element>)]);
        set.call(this, value);
      },
    });
  }
}

/**
 * The name a host of `holdsProductName()` gives itself, called on each of its updates: a non-empty `name` is written
 * as its `aria-label` and holds the product's name; an empty one takes its own away and gives the product's back.
 */
export function nameHost(host: HTMLElement, name: string): void {
  const element = host as Naming;
  const was = element[OWN_NAME] ?? '';
  element[OWN_NAME] = name;
  asComponent(() => {
    if (name) {
      // It starts naming itself: what the product wrote is held.
      if (!was) for (const each of NAMING) {
        const value = host.getAttribute(each);
        if (value !== null) hold(element, each, value);
      }
      if (host.getAttribute('aria-label') !== name) domSet!.call(host, 'aria-label', name);
      return;
    }
    if (!was) return;
    domRemove!.call(host, 'aria-label');
    const label = host.getAttribute(dataName('aria-label'));
    if (label !== null) {
      domRemove!.call(host, dataName('aria-label'));
      domSet!.call(host, 'aria-label', label);
    }
    const ids = host.getAttribute(dataName('aria-labelledby'));
    if (ids !== null) {
      domRemove!.call(host, dataName('aria-labelledby'));
      const held = element[HELD];
      element[HELD] = null;
      if (ids === '' && held) platformSetters.get('aria-labelledby')?.call(host, held.filter((each) => each.isConnected));
      else domSet!.call(host, 'aria-labelledby', ids);
    }
  });
}

/**
 * Gives `target` — another component that moves the product's ARIA (a Copy button's Button) — the elements of a
 * relationship, as a product's property would, or takes them away.
 */
function giveElements(target: Element, name: RelationName, elements: readonly Element[] | null) {
  const host = target as Delegating;
  const now = host[GIVEN]?.get(name);
  if (!elements?.length) {
    if (target.hasAttribute(dataName(name))) target.removeAttribute(name);
    return;
  }
  if (now && same(now, elements) && target.getAttribute(dataName(name)) === '') return;
  (host[GIVEN] ??= new Map()).set(name, elements);
  if (target.getAttribute(dataName(name)) === '') host.requestUpdate();
  else target.setAttribute(dataName(name), '');
}

/** The text an element stands for where its reference cannot be drawn: its own name, else its text. */
const textOf = (element: Element) => (ariaAttribute(element, 'aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim();

const same = (a: readonly Element[] | null | undefined, b: readonly Element[] | null | undefined) =>
  (a?.length ?? 0) === (b?.length ?? 0) && (a ?? []).every((element, at) => element === b?.[at]);

/**
 * What the component says itself on the element: a name's value, or nothing (empty, undefined, false) — and then the
 * product's. `null` is nothing too for a state; for a relationship it keeps the product's out as well. A non-empty
 * `aria-label` or `aria-labelledby` keeps the product's name out: neither its `aria-label` nor its `aria-labelledby`.
 */
export type OwnAria = Partial<Record<string, string | null | undefined | false>>;

/**
 * What `delegatedAria()` does, for one element: the component's own ARIA and the product's from `host`, written on
 * `element` each time it is called. The directive keeps one for the element it stands on; a component keeps one of its
 * own for a member its template does not draw — the row a tab view places in its light DOM — and calls `write()` after
 * each of its updates.
 */
export class DelegatedAriaWriter {
  /** The attributes it wrote last, so that one no longer given is taken off. */
  private written = new Set<string>();
  /** The relationships it drew last by element reflection. */
  private referenced = new Set<RelationName>();
  private turn = 0;
  /** The hidden copy of the description's text in the control's shadow root (above), and the two ids it takes. */
  private copy: HTMLElement | null = null;
  /** Where the copy was put, for when the element is back in the page (`attach()`). */
  private copyParent: Node | null = null;
  private readonly copyIds = [`tanrei-described-${++copies}-a`, `tanrei-described-${copies}-b`] as const;

  write(target: HTMLElement, from: HTMLElement, own: OwnAria = {}) {
    const element = target as HTMLElement & Record<string, unknown>;
    const host = from as Delegating;
    const inner = delegates(element);
    const exposed = new Set<string>(delegatedNames(host));
    const values = new Map<string, string>();
    // A name of the component's own is its whole name while it is set: the product's is kept out (BTN-16, TXI-23…).
    const ownName = !!(own['aria-label'] || own['aria-labelledby']);
    // A state: the component's own, else the product's.
    for (const [name, value] of Object.entries(own)) if (value && !isRelation(name)) values.set(name, value);
    for (const name of exposed) {
      if (isRelation(name) || values.has(name) || (ownName && name === 'aria-label')) continue;
      const value = host.getAttribute(dataName(name));
      if (value !== null) values.set(name, value);
    }
    const invalid = values.get('aria-invalid') === 'true';
    // A relationship: the component's own ids (in its shadow root) and the product's elements, one list. The error
    // message is never a relationship of the control: while it is invalid, its elements join the description.
    const product = (name: RelationName) => (exposed.has(name) && own[name] !== null && !(ownName && name === 'aria-labelledby') ? relationElements(host, name) : []);
    const lists = new Map<RelationName, { ids: string; given: Element[] }>();
    for (const name of Object.keys(DELEGATED_RELATIONS) as RelationName[]) {
      if (name === 'aria-errormessage') continue;
      const given = product(name);
      if (name === 'aria-describedby' && invalid) for (const each of product('aria-errormessage')) if (!given.includes(each)) given.push(each);
      lists.set(name, { ids: (own[name] || '') as string, given });
    }
    const named: Element[] = [];
    const referenced = new Map<RelationName, { ids: string; given: Element[] }>();
    // The description, on a native control: its own ids and a copy of the product's text, set once committed (below).
    let described: { ids: string; text: string } | null = null;
    for (const [name, { ids, given }] of lists) {
      named.push(...given);
      if (name === 'aria-describedby' && !inner) {
        described = { ids, text: given.map(textOf).filter(Boolean).join(' ') };
        continue;
      }
      // A Tanrei element that moves it takes the elements whatever the engine, and draws them where it can.
      if (given.length && (reflects(name) || inner)) {
        referenced.set(name, { ids, given });
        // Beside the reference, its text: Playwright's name computation does not follow reflected references (above).
        if (name === 'aria-labelledby' && !inner) {
          const text = given.map(textOf).filter(Boolean).join(' ');
          if (text) values.set('aria-label', text);
        }
        continue;
      }
      if (ids) values.set(name, ids);
      if (!given.length) continue;
      // No reflection in this engine: the text of what is named, in its place.
      const text = given.map(textOf).filter(Boolean).join(' ');
      if (!text) continue;
      if (name === 'aria-labelledby') values.set('aria-label', text);
      else if (name === 'aria-describedby') values.set('aria-description', [values.get('aria-description'), text].filter(Boolean).join(', '));
    }
    if (host[WATCH]) host[WATCH].named = named;
    // What was drawn by reference and is no longer: taken off (which takes the attribute off too).
    for (const name of this.referenced) {
      if (referenced.has(name)) continue;
      if (inner) giveElements(element, name, null);
      else element[DELEGATED_RELATIONS[name]] = null;
    }
    // On a member that moves it, a component's own write (`asComponent()`): what the member owns is never reported.
    asComponent(() => {
      for (const name of this.written) {
        if (name === 'aria-describedby' && described) continue;
        if (!values.has(name) && !referenced.has(name as RelationName) && ariaAttribute(element, name) !== null) element.removeAttribute(name);
      }
      for (const [name, value] of values) {
        if (ariaAttribute(element, name) !== value) element.setAttribute(name, value);
      }
    });
    this.written = new Set(values.keys());
    this.referenced = new Set(referenced.keys());
    // The component's own ids are looked up once this render has been committed: an element it names may come later in
    // the template, or in a part committed after this one.
    if (described) this.written.add('aria-describedby');
    const turn = ++this.turn;
    if (referenced.size || described) {
      queueMicrotask(() => {
        if (turn !== this.turn) return;
        const root = element.getRootNode() as Document | ShadowRoot | DocumentFragment;
        if (described) this.describe(element, root, described);
        for (const [name, { ids, given }] of referenced) {
          const owned = ids.split(/\s+/).filter(Boolean).map((id) => root.getElementById?.(id) ?? null).filter((found): found is HTMLElement => found !== null);
          const next = [...owned, ...given];
          if (inner) giveElements(element, name, next);
          else if (!same(element[DELEGATED_RELATIONS[name]] as readonly Element[] | null | undefined, next)) element[DELEGATED_RELATIONS[name]] = next;
        }
      });
    }
  }

  /**
   * The element has left the page — its template no longer draws it (a drawer that turns from its navigation landmark
   * into its dialog), or its host has left: the copy of the description it drew goes with it, and a reference not yet
   * drawn is not drawn.
   */
  detach() {
    this.turn++;
    this.copy?.remove();
  }

  /** The element is back in the page as it was (its host put back): so is the copy, where it was. */
  attach() {
    if (this.copy && !this.copy.isConnected) this.copyParent?.appendChild(this.copy);
  }

  /** The description: the component's own ids, then the hidden copy of the product's text (above). */
  private describe(element: HTMLElement, root: Node, { ids, text }: { ids: string; text: string }) {
    if (!text) {
      this.copy?.remove();
      this.copy = null;
    } else if (!this.copy || this.copy.textContent !== text || this.copy.getRootNode() !== root) {
      const id = this.copy?.id === this.copyIds[0] ? this.copyIds[1] : this.copyIds[0];
      this.copy?.remove();
      const copy = (element.ownerDocument ?? document).createElement('span');
      copy.id = id;
      copy.hidden = true;
      copy.textContent = text;
      const parent = root.nodeType === Node.DOCUMENT_NODE ? element.parentNode : root;
      parent?.appendChild(copy);
      this.copy = copy;
      this.copyParent = parent;
    }
    if (!this.copy) this.copyParent = null;
    const value = [ids, this.copy?.id ?? ''].filter(Boolean).join(' ');
    if (value) {
      if (element.getAttribute('aria-describedby') !== value) element.setAttribute('aria-describedby', value);
    } else if (element.hasAttribute('aria-describedby')) element.removeAttribute('aria-describedby');
  }
}

/** The copies of descriptions made in this page, for their ids. */
let copies = 0;

class DelegatedAria extends AsyncDirective {
  private readonly writer = new DelegatedAriaWriter();

  constructor(part: PartInfo) {
    super(part);
    if (part.type !== PartType.ELEMENT) throw new Error('delegatedAria() stands on the element that carries the role: <button ${delegatedAria(this, { … })}>');
  }

  render(_host: HTMLElement, _own: OwnAria) {
    return noChange;
  }

  override update(part: ElementPart, [host, own]: [HTMLElement, OwnAria]) {
    this.writer.write(part.element as HTMLElement, host, own);
    return noChange;
  }

  // The template dropped the element, or its host left the page: no copy of a description is left in the shadow root.
  protected override disconnected() {
    this.writer.detach();
  }

  protected override reconnected() {
    this.writer.attach();
  }
}

/**
 * On the element that carries the role: the component's own ARIA (`own`) and, for every name its class exposes
 * (`delegatesAria()`) that `own` leaves empty, the product's, from `data-aria-*` on the host.
 */
export const delegatedAria = directive(DelegatedAria);
