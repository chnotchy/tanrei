// ARIA set on the host of a component whose role is carried by an element inside it — the native `<button>` of a
// Button, the `<input>` of a text input — is exposed on that element.
//
// The host of a custom element is a generic box: an `aria-expanded`, an `aria-describedby` or an `aria-label` a
// product writes on `<tanrei-button>` (React's `aria-*` props, a menu library's `aria-controls`) names, describes or
// states nothing a person meets, and where the engine keeps the host in the accessibility tree it is a second node
// with the same name. So a class that carries its role inside takes the product's ARIA off the host and draws it on
// that element, beside its own:
//
//   delegatesAria(Class, { owns })   after the class is written, before it is defined. Every state and relationship
//                                    below that the class does not own (`owns`: the ones it says itself and that a
//                                    product must not override — a toggle's `aria-pressed`, a checkbox's
//                                    `aria-checked`, `aria-disabled`) is observed on the host, kept by the element and
//                                    removed from the host, so the host stays a box with no name. The host still
//                                    answers for it — `getAttribute()`, `hasAttribute()`, `removeAttribute()`,
//                                    `toggleAttribute()` and the ARIA properties (`ariaExpanded`, `ariaDescribedByElements`
//                                    …) read and change what it keeps — so a framework that removes an attribute it
//                                    set, or a frame that removes what it gave (a field's `aria-invalid`, a badge's
//                                    `aria-description`), is heard.
//   delegatedAria(host, own)         on the element that carries the role, in the template: `own` is what the component
//                                    says itself (`'aria-label': this.label`); an empty value leaves the name to the
//                                    product's, and an owned name is never the product's. A relationship of its own is
//                                    ids of its shadow root (`'aria-describedby': 'description'`), joined in front of
//                                    the product's elements. Nothing else on that element binds a name it writes; an
//                                    owned name the component does not pass may stay a binding of its own.
//
// What stays on the host is what the class owns: a product's `aria-pressed` on a Button that is not a toggle names
// nothing, as on any element without the role. A product's own style or query that selects the host by a delegated
// attribute (`tanrei-button[aria-expanded="true"]`) no longer matches: it reads the property or `getAttribute()`.
//
// A relationship (`aria-describedby`, `aria-labelledby`, `aria-controls`, `aria-details`, `aria-errormessage`) names
// elements by id in the host's tree, which an attribute inside the shadow root cannot reach. It is drawn with ARIA's
// element reflection (`ariaDescribedByElements` …), which may point from a shadow root to an element of a tree around
// it (Chrome and Edge 135, Firefox 136, Safari 16.4). Where an engine has no reflection, the text of the elements
// named stands in their place: the description's after the component's own description, the label's as the name. That
// text is copied when the element draws, and does not follow later changes; the ids are looked up when it draws, so
// an element named before it exists is found at the next update.
import { noChange } from 'lit';
import { Directive, type ElementPart, type PartInfo, PartType, directive } from 'lit/directive.js';

/** The states and properties that are delegated, by attribute, with the ARIA reflection property of each. */
export const DELEGATED_STATES = {
  'aria-label': 'ariaLabel',
  'aria-description': 'ariaDescription',
  'aria-roledescription': 'ariaRoleDescription',
  'aria-expanded': 'ariaExpanded',
  'aria-haspopup': 'ariaHasPopup',
  'aria-pressed': 'ariaPressed',
  'aria-checked': 'ariaChecked',
  'aria-disabled': 'ariaDisabled',
  'aria-invalid': 'ariaInvalid',
  'aria-required': 'ariaRequired',
  'aria-readonly': 'ariaReadOnly',
  'aria-current': 'ariaCurrent',
  'aria-keyshortcuts': 'ariaKeyShortcuts',
  'aria-busy': 'ariaBusy',
} as const;

/** The relationships that are delegated, by attribute, with the element reflection property of each. */
export const DELEGATED_RELATIONS = {
  'aria-labelledby': 'ariaLabelledByElements',
  'aria-describedby': 'ariaDescribedByElements',
  'aria-controls': 'ariaControlsElements',
  'aria-details': 'ariaDetailsElements',
  'aria-errormessage': 'ariaErrorMessageElements',
} as const;

type StateName = keyof typeof DELEGATED_STATES;
type RelationName = keyof typeof DELEGATED_RELATIONS;
export type DelegatedName = StateName | RelationName;

/** What a host keeps: a state's value, or a relationship's ids (as written) or elements (as given by property). */
type Kept = Map<DelegatedName, string | readonly Element[]>;

const KEPT = Symbol('tanrei.delegatedAria.kept');
const NAMES = Symbol('tanrei.delegatedAria.names');
const REMOVING = Symbol('tanrei.delegatedAria.removing');

interface Delegating extends HTMLElement {
  [KEPT]?: Kept;
  [REMOVING]?: Set<string>;
  requestUpdate(): void;
}

const isRelation = (name: string): name is RelationName => name in DELEGATED_RELATIONS;
const kept = (host: Delegating): Kept => (host[KEPT] ??= new Map());

/** The names a class delegates (all but the ones it owns); empty for a class that does not. */
export function delegatedNames(host: Element): readonly DelegatedName[] {
  return (host.constructor as unknown as { [NAMES]?: readonly DelegatedName[] })[NAMES] ?? [];
}

/** Whether this engine has ARIA element reflection for `name`. */
const reflects = (name: RelationName) => typeof Element !== 'undefined' && DELEGATED_RELATIONS[name] in Element.prototype;

function keep(host: Delegating, name: DelegatedName, value: string | readonly Element[] | null) {
  const map = kept(host);
  const before = map.get(name);
  if (value === null) map.delete(name);
  else map.set(name, value);
  if (before !== value) host.requestUpdate();
}

/**
 * Takes a delegated attribute off the host, quietly: its removal is not a product's. Only that removal is ignored —
 * the engine runs the element's other callbacks still waiting (the next attribute of an upgrade) inside it.
 */
function takeOff(host: Delegating, name: string, remove: (name: string) => void) {
  const removing = (host[REMOVING] ??= new Set());
  removing.add(name);
  try {
    remove.call(host, name);
  } finally {
    removing.delete(name);
  }
}

/**
 * Makes `element`'s class delegate the product's ARIA from its host to the element that carries its role
 * (`delegatedAria()`): every name of `DELEGATED_STATES` and `DELEGATED_RELATIONS` but those in `owns`.
 */
export function delegatesAria(element: { prototype: HTMLElement; observedAttributes?: string[] }, { owns = [] }: { owns?: readonly DelegatedName[] } = {}): void {
  const names = ([...Object.keys(DELEGATED_STATES), ...Object.keys(DELEGATED_RELATIONS)] as DelegatedName[]).filter((name) => !owns.includes(name));
  const handled = new Set<string>(names);
  const ctor = element as unknown as Record<symbol, unknown> & { observedAttributes: string[] };
  ctor[NAMES] = names;

  // The getter the class inherits (Lit's, or one of its own that adds to it), called for this class.
  let observed: PropertyDescriptor | undefined;
  for (let at: object | null = element; at && !observed; at = Object.getPrototypeOf(at)) observed = Object.getOwnPropertyDescriptor(at, 'observedAttributes');
  Object.defineProperty(element, 'observedAttributes', {
    configurable: true,
    get(this: unknown) {
      const own = (observed?.get?.call(this) as string[] | undefined) ?? [];
      return [...own, ...names];
    },
  });

  const prototype = element.prototype as Delegating & Record<string, unknown>;
  // The element's own methods as it inherits them (the DOM's), read before they are replaced: a module that is only
  // imported where there is no DOM (a server's render, a test of the manifest in Node) defines the class and calls none.
  const { removeAttribute, toggleAttribute, getAttribute, hasAttribute } = element.prototype;
  const attributeChanged = prototype.attributeChangedCallback as ((name: string, old: string | null, value: string | null) => void) | undefined;

  prototype.attributeChangedCallback = function (this: Delegating, name: string, old: string | null, value: string | null) {
    if (!handled.has(name)) return attributeChanged?.call(this, name, old, value);
    if (value === null) return this[REMOVING]?.has(name) ? undefined : keep(this, name as DelegatedName, null);
    if (isRelation(name)) {
      // Set by the property (`ariaDescribedByElements = [...]`), the attribute is empty: the elements are the engine's.
      const given = value === '' ? ((Object.getOwnPropertyDescriptor(Element.prototype, DELEGATED_RELATIONS[name])?.get?.call(this) as Element[] | null) ?? null) : null;
      keep(this, name, given ?? value);
    } else keep(this, name as DelegatedName, value);
    takeOff(this, name, removeAttribute);
  };

  prototype.removeAttribute = function (this: Delegating, name: string) {
    const lower = name.toLowerCase();
    if (handled.has(lower)) keep(this, lower as DelegatedName, null);
    removeAttribute.call(this, name);
  };

  prototype.toggleAttribute = function (this: Delegating, name: string, force?: boolean) {
    const lower = name.toLowerCase();
    if (!handled.has(lower)) return toggleAttribute.call(this, name, force);
    const on = force ?? !kept(this).has(lower as DelegatedName);
    if (on) this.setAttribute(lower, '');
    else this.removeAttribute(lower);
    return on;
  };

  prototype.getAttribute = function (this: Delegating, name: string) {
    const lower = name.toLowerCase();
    if (!handled.has(lower)) return getAttribute.call(this, name);
    const value = kept(this).get(lower as DelegatedName);
    return value === undefined ? getAttribute.call(this, name) : typeof value === 'string' ? value : '';
  };

  prototype.hasAttribute = function (this: Delegating, name: string) {
    const lower = name.toLowerCase();
    return hasAttribute.call(this, name) || (handled.has(lower) && kept(this).has(lower as DelegatedName));
  };

  for (const name of names) {
    if (isRelation(name)) {
      Object.defineProperty(prototype, DELEGATED_RELATIONS[name], {
        configurable: true,
        get(this: Delegating) {
          return relationElements(this, name);
        },
        set(this: Delegating, elements: readonly Element[] | null) {
          keep(this, name, elements ? [...elements] : null);
        },
      });
    } else {
      Object.defineProperty(prototype, DELEGATED_STATES[name], {
        configurable: true,
        get(this: Delegating) {
          const value = kept(this).get(name);
          return typeof value === 'string' ? value : null;
        },
        set(this: Delegating, value: string | null) {
          keep(this, name, value === null || value === undefined ? null : String(value));
        },
      });
    }
  }
}

/** The elements a kept relationship names: as given, or each id looked up in the host's tree (those found). */
function relationElements(host: Delegating, name: RelationName): Element[] | null {
  const value = kept(host).get(name);
  if (value === undefined) return null;
  if (typeof value !== 'string') return [...value];
  const root = host.getRootNode() as Document | ShadowRoot;
  const found = value
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => root.getElementById?.(id) ?? null)
    .filter((element): element is HTMLElement => element !== null);
  return found;
}

/** The text an element stands for where its reference cannot be drawn: its own name, else its text. */
const textOf = (element: Element) => (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim();

const same = (a: readonly Element[] | null | undefined, b: readonly Element[] | null | undefined) =>
  (a?.length ?? 0) === (b?.length ?? 0) && (a ?? []).every((element, at) => element === b?.[at]);

/** What the component says itself on the element: a name's value, or nothing (empty, null, undefined, false). */
export type OwnAria = Partial<Record<string, string | null | undefined | false>>;

class DelegatedAria extends Directive {
  /** The attributes it wrote last, so that one no longer given is taken off. */
  private written = new Set<string>();
  /** The relationships it drew last by element reflection, and which update drew them. */
  private referenced = new Set<RelationName>();
  private turn = 0;

  constructor(part: PartInfo) {
    super(part);
    if (part.type !== PartType.ELEMENT) throw new Error('delegatedAria() stands on the element that carries the role: <button ${delegatedAria(this, { … })}>');
  }

  render(_host: HTMLElement, _own: OwnAria) {
    return noChange;
  }

  override update(part: ElementPart, [host, own]: [Delegating, OwnAria]) {
    const element = part.element as HTMLElement & Record<string, unknown>;
    const delegated = new Set<string>(delegatedNames(host));
    const store = kept(host);
    const values = new Map<string, string>();
    // A state: the component's own, else the product's.
    for (const [name, value] of Object.entries(own)) if (value && !isRelation(name)) values.set(name, value);
    for (const name of delegated) {
      if (isRelation(name) || values.has(name)) continue;
      const value = store.get(name as DelegatedName);
      if (typeof value === 'string') values.set(name, value);
    }
    // A relationship: the component's own ids (in its shadow root) and the product's elements, one list.
    const referenced = new Map<RelationName, { ids: string; given: Element[] }>();
    for (const name of Object.keys(DELEGATED_RELATIONS) as RelationName[]) {
      const ids = (own[name] || '') as string;
      const given = delegated.has(name) ? (relationElements(host, name) ?? []) : [];
      // A Tanrei element that delegates it takes the elements whatever the engine, and draws them where it can.
      if (given.length && (reflects(name) || delegatedNames(element).includes(name))) {
        referenced.set(name, { ids, given });
        continue;
      }
      if (ids) values.set(name, ids);
      if (!given.length) continue;
      // No reflection in this engine: the text of what is named, in its place.
      const text = given.map(textOf).filter(Boolean).join(' ');
      if (!text) continue;
      if (name === 'aria-labelledby') values.set('aria-label', text);
      else if (name === 'aria-describedby' || name === 'aria-errormessage') values.set('aria-description', [values.get('aria-description'), text].filter(Boolean).join(', '));
    }
    // What was drawn by reflection and is no longer: taken off (which takes the attribute off too).
    for (const name of this.referenced) if (!referenced.has(name)) element[DELEGATED_RELATIONS[name]] = null;
    for (const name of this.written) {
      if (!values.has(name) && !referenced.has(name as RelationName) && element.hasAttribute(name)) element.removeAttribute(name);
    }
    for (const [name, value] of values) {
      if (element.getAttribute(name) !== value) element.setAttribute(name, value);
    }
    this.written = new Set(values.keys());
    this.referenced = new Set(referenced.keys());
    // The component's own ids are looked up once this render has been committed: an element it names may come later in
    // the template, or in a part committed after this one.
    const turn = ++this.turn;
    if (referenced.size) {
      queueMicrotask(() => {
        if (turn !== this.turn) return;
        const root = element.getRootNode() as Document | ShadowRoot | DocumentFragment;
        for (const [name, { ids, given }] of referenced) {
          const owned = ids.split(/\s+/).filter(Boolean).map((id) => root.getElementById?.(id) ?? null).filter((found): found is HTMLElement => found !== null);
          const next = [...owned, ...given];
          const property = DELEGATED_RELATIONS[name];
          if (!same(element[property] as readonly Element[] | null | undefined, next)) element[property] = next;
        }
      });
    }
    return noChange;
  }
}

/**
 * On the element that carries the role: the component's own ARIA (`own`) and, for every name its class delegates
 * (`delegatesAria()`) that `own` leaves empty, the product's from the host.
 */
export const delegatedAria = directive(DelegatedAria);
