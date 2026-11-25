import * as React from 'react';

/**
 * The props of a wrapper that its element reads from an attribute, as the elements' manifest lists them: the prop, and
 * the attribute's name with — where the manifest gives one — the value the element has while the attribute is absent.
 * A mark (an attribute with no property behind it) is listed under its own name; a boolean one is absent while false.
 */
export type ServerAttributes = Readonly<Record<string, readonly [attribute: string, initial?: ServerValue]>>;

/** A value the manifest can give as an element's default: a primitive, or a list of them (`values = []`). */
type ServerValue = string | number | boolean | null | readonly (string | number | boolean | null)[];

type Converter = { fromAttribute?: (text: string | null, type?: unknown) => unknown; toAttribute?: (value: unknown, type?: unknown) => unknown };
/** How a Lit element declares a property (`static elementProperties`): only what writing its attribute needs. */
interface Declaration {
  type?: unknown;
  converter?: ((text: string | null, type?: unknown) => unknown) | Converter;
}
/** A Lit element's class: its declarations are complete once it is finalized (`finalize` is protected, and idempotent). */
type Declared = {
  prototype: object;
  elementProperties?: Map<PropertyKey, Declaration>;
  finalize?: () => void;
  /** The inline style a page rendered before the element is defined needs, from the props (a navigation drawer's width). */
  serverStyle?: (props: Record<string, unknown>) => Record<string, string> | null;
};

// Props that are React's, not the element's.
const REACT_PROPS = new Set(['children', 'ref', 'key']);

/** Lit's own reading and writing of an attribute (`defaultConverter`), for a property declared without a converter. */
const plain = (type: unknown): Required<Converter> => ({
  toAttribute: (value) => (type === Boolean ? (value ? '' : null) : type === Array || type === Object ? (value == null ? value : JSON.stringify(value)) : value),
  fromAttribute: (text) => {
    if (type === Boolean) return text !== null;
    if (type === Number) return text === null ? null : Number(text);
    if (type === Array || type === Object) {
      try {
        return JSON.parse(text as string);
      } catch {
        return null;
      }
    }
    return text;
  },
});

/**
 * Whether `a` and `b` are the same value: primitives by `Object.is`, arrays and plain objects by their entries. Anything
 * else (a `Set`, a `Date`, a class's instance) is the same only as itself, so no text an attribute holds is taken for it.
 */
function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((each, i) => same(each, b[i]));
  const plainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(v));
  if (!plainObject(a) || !plainObject(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && same(a[key], b[key]));
}

/** What `run` returns, or `undefined` where it throws: a converter given a value it was not written for. */
function attempt(run: () => unknown): unknown {
  try {
    return run();
  } catch {
    return undefined;
  }
}

/**
 * The text of the attribute that gives the element `value`, by the element's own converter, or `null` for no attribute.
 * No attribute is right only where the element has that value without one (`entry[1]`), so a prop at its default writes
 * nothing and a false is never written as present. A text is written only where the element reads it back as `value`
 * (a list by its entries): a value no attribute gives writes nothing, and the client sets it once it mounts.
 *
 * A list (or an object) is tried as the element's converter writes it (`toAttribute`, where it has one) and as JSON,
 * which every list converter of the package reads: `<ChipField value={['a', 'b']}>` is `value='["a","b"]'`.
 */
export function attributeText(declaration: Declaration | undefined, value: unknown, entry: ServerAttributes[string]): string | null {
  const type = declaration?.type ?? (typeof value === 'boolean' ? Boolean : undefined);
  const own = declaration?.converter;
  const fallback = plain(type);
  const ownTo = typeof own === 'object' ? own.toAttribute : undefined;
  const toAttribute = ownTo ?? fallback.toAttribute;
  const fromAttribute = typeof own === 'function' ? own : typeof own === 'object' && own.fromAttribute ? own.fromAttribute : fallback.fromAttribute;
  const reads = (text: string | null) => (text === null ? (entry.length > 1 ? entry[1] : undefined) : attempt(() => fromAttribute(text, type)));
  const textOf = (converted: unknown) => (converted === undefined || converted === null ? null : String(converted));
  const listed = typeof value === 'object' && value !== null;
  // Absent first; then the element's own text for the value; then, for a boolean, the texts the element may read it
  // from, and for a list or an object its JSON.
  const candidates = [
    null,
    textOf(attempt(() => toAttribute(value, type))),
    ...(typeof value === 'boolean' ? ['', 'false'] : []),
    ...(listed ? [textOf(attempt(() => JSON.stringify(value)))] : []),
  ];
  for (const text of candidates) if (same(reads(text), value)) return text;
  return null;
}

/** The HTML attributes of a server render: `props` the element reads from attributes as those attributes. */
function serverProps(elementClass: Declared, attributes: ServerAttributes, props: Record<string, unknown>): Record<string, unknown> {
  elementClass.finalize?.();
  const html: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (REACT_PROPS.has(key) || value === undefined || value === null || typeof value === 'function') continue;
    const entry = Object.hasOwn(attributes, key) ? attributes[key] : undefined;
    if (entry) {
      // A primitive, or a list or an object an attribute may carry; `attributeText` writes it only where the element
      // reads the text back as the same value.
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && typeof value !== 'object') continue;
      const text = attributeText(elementClass.elementProperties?.get(key), value, entry);
      if (text !== null) html[entry[0]] = text;
    } else if (key === 'className') html.class = value; // as `@lit/react` writes it: a custom element takes `class`
    // A property with no attribute (a checkbox group's `value`) is the client's to set.
    else if (!(key in elementClass.prototype)) html[key] = value;
  }
  // What the element's own stylesheet reads before it is defined, beside the product's own style.
  const style = elementClass.serverStyle?.(props);
  if (style) html.style = { ...(props.style && typeof props.style === 'object' ? (props.style as Record<string, unknown>) : {}), ...style };
  return html;
}

/** An element as the ref sees it: whether it has drawn, and how it is told its first props have been given. */
type Mounted = HTMLElement & { hasUpdated?: boolean; takeFormDefaults?: () => void };

/** The refs `atMount` gives the element for each of the product's, without and with `autoFocus`: a map itself stands for no ref. */
const mounting = [new WeakMap<object, (element: Mounted | null) => unknown>(), new WeakMap<object, (element: Mounted | null) => unknown>()] as const;

/** The elements told their first props have been given: each once, whatever ref it is given later. */
const defaulted = new WeakSet<Element>();

/**
 * What the wrapper does when its element mounts. Returns the ref to give the element, which then calls the product's.
 *
 * The props of the first render are the element's first values, which a form's reset returns it to (a native control's
 * `defaultValue` and `defaultChecked`, as React's own controls take them from the first render). An element the client
 * mounts takes them before it first draws; an element of a page rendered on a server has drawn already, from the
 * attributes the server wrote, and takes the rest — a list no attribute carries — only now. So each element is told
 * once, after the render that gave its first props (`takeFormDefaults()`): the refs are attached before `@lit/react`
 * sets the props in a layout effect of the same commit, so it is told in a microtask, once the commit has ended.
 *
 * `autoFocus` is given as React gives it to a native control: the element is focused when it mounts, whatever had focus,
 * and not when the page is hydrated (the server's HTML carries the attribute, which the element answers at load). React
 * leaves a custom element's `autoFocus` to the browser's `autofocus`, which the browser answers only while nothing has
 * focus: a field revealed by a press on a button stayed unfocused. The attribute is still written, so that a dialog or a
 * sheet that opens later gives focus to the control marked with it. An element the client mounts is attached before its
 * first update, and keeps a `focus()` called then until it has drawn. An element of a hydrated page has drawn by then,
 * and so has one attached again (a ref given anew at a render): React's own focuses neither.
 *
 * No hook, so that the wrapper's render stays a plain function of its props; one ref for each of the product's, so that
 * a ref that stays the same between renders is not detached and attached again at each.
 */
function atMount(ref: React.ForwardedRef<unknown>, focus: boolean) {
  const refs = mounting[focus ? 1 : 0];
  let own = refs.get(ref ?? refs);
  if (!own) {
    own = (element: Mounted | null) => {
      if (element && !defaulted.has(element)) {
        defaulted.add(element);
        queueMicrotask(() => element.takeFormDefaults?.());
      }
      if (focus && element?.hasUpdated === false) element.focus();
      if (typeof ref === 'function') return ref(element);
      if (ref) ref.current = element;
    };
    refs.set(ref ?? refs, own);
  }
  return own;
}

/**
 * A wrapper that renders on a server as well as in the browser. Where there is a document it renders `Component`, which
 * sets the props as properties once the element mounts (`@lit/react`), tells the element its first props have been
 * given and gives React's `autoFocus` (`atMount`).
 * Where there is none (a server: Node, Deno, Bun, an edge runtime) it renders the element's tag with each prop the
 * element reads from an attribute written as that attribute — under the attribute's name, by the element's own
 * converter — so the HTML carries the label, the value and the states before any script runs. The attributes the
 * client hydrates over are not a mismatch: `@lit/react` suppresses the warning for the element. Only the tag is
 * rendered, not the element's shadow root.
 */
export function withServerAttributes<C>(Component: C, tagName: string, elementClass: { prototype: object }, attributes: ServerAttributes): C {
  const client = Component as unknown as { render: (props: object, ref: unknown) => React.ReactNode; displayName?: string };
  const Wrapper = React.forwardRef<unknown, Record<string, unknown>>((props, ref) => {
    // Whether there is a document never changes while a page or a server runs, so the hooks the client's render calls
    // are called at every render of the wrapper, or at none.
    if (typeof document === 'undefined') return React.createElement(tagName, serverProps(elementClass as Declared, attributes, props), props.children as React.ReactNode);
    return client.render(props, atMount(ref, !!props.autoFocus));
  });
  Wrapper.displayName = client.displayName;
  return Wrapper as unknown as C;
}
