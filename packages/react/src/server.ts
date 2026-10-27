import * as React from 'react';

/**
 * The props of a wrapper that its element reads from an attribute, as the elements' manifest lists them: the prop, and
 * the attribute's name with — where the manifest gives one — the value the element has while the attribute is absent.
 * A mark (an attribute with no property behind it) is listed under its own name; a boolean one is absent while false.
 */
export type ServerAttributes = Readonly<Record<string, readonly [attribute: string, initial?: string | number | boolean | null]>>;

type Converter = { fromAttribute?: (text: string | null, type?: unknown) => unknown; toAttribute?: (value: unknown, type?: unknown) => unknown };
/** How a Lit element declares a property (`static elementProperties`): only what writing its attribute needs. */
interface Declaration {
  type?: unknown;
  converter?: ((text: string | null, type?: unknown) => unknown) | Converter;
}
/** A Lit element's class: its declarations are complete once it is finalized (`finalize` is protected, and idempotent). */
type Declared = { prototype: object; elementProperties?: Map<PropertyKey, Declaration>; finalize?: () => void };

// Props that are React's, not the element's.
const REACT_PROPS = new Set(['children', 'ref', 'key']);

/** Lit's own reading and writing of an attribute (`defaultConverter`), for a property declared without a converter. */
const plain = (type: unknown): Required<Converter> => ({
  toAttribute: (value) => (type === Boolean ? (value ? '' : null) : value),
  fromAttribute: (text) => (type === Boolean ? text !== null : type === Number ? (text === null ? null : Number(text)) : text),
});

/**
 * The text of the attribute that gives the element `value`, by the element's own converter, or `null` for no attribute.
 * No attribute is right only where the element has that value without one (`entry[1]`), so a prop at its default writes
 * nothing and a false is never written as present. A value no attribute gives writes nothing either: the client sets it
 * once it mounts.
 */
export function attributeText(declaration: Declaration | undefined, value: string | number | boolean, entry: ServerAttributes[string]): string | null {
  const type = declaration?.type ?? (typeof value === 'boolean' ? Boolean : undefined);
  const own = declaration?.converter;
  const fallback = plain(type);
  const toAttribute = typeof own === 'object' && own.toAttribute ? own.toAttribute : fallback.toAttribute;
  const fromAttribute = typeof own === 'function' ? own : typeof own === 'object' && own.fromAttribute ? own.fromAttribute : fallback.fromAttribute;
  const reads = (text: string | null) => (text === null ? (entry.length > 1 ? entry[1] : undefined) : fromAttribute(text, type));
  const converted = toAttribute(value, type);
  // Absent first; then the element's own text for the value; then, for a boolean, the texts the element may read it from.
  const candidates = [null, converted === undefined || converted === null ? null : String(converted), ...(typeof value === 'boolean' ? ['', 'false'] : [])];
  for (const text of candidates) if (Object.is(reads(text), value)) return text;
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
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
      const text = attributeText(elementClass.elementProperties?.get(key), value, entry);
      if (text !== null) html[entry[0]] = text;
    } else if (key === 'className') html.class = value; // as `@lit/react` writes it: a custom element takes `class`
    // A property with no attribute (an object, an array) is the client's to set.
    else if (!(key in elementClass.prototype)) html[key] = value;
  }
  return html;
}

/**
 * A wrapper that renders on a server as well as in the browser. Where there is a document it renders `Component`, which
 * sets the props as properties once the element mounts (`@lit/react`). Where there is none (a server: Node, Deno, Bun,
 * an edge runtime) it renders the element's tag with each prop the element reads from an attribute written as that
 * attribute — under the attribute's name, by the element's own converter — so the HTML carries the label, the value
 * and the states before any script runs. The attributes the client hydrates over are not a mismatch: `@lit/react`
 * suppresses the warning for the element. Only the tag is rendered, not the element's shadow root.
 */
export function withServerAttributes<C>(Component: C, tagName: string, elementClass: { prototype: object }, attributes: ServerAttributes): C {
  const client = Component as unknown as { render: (props: object, ref: unknown) => React.ReactNode; displayName?: string };
  const Wrapper = React.forwardRef<unknown, Record<string, unknown>>((props, ref) =>
    // Whether there is a document never changes while a page or a server runs, so the hooks the client's render calls
    // are called at every render of the wrapper, or at none.
    typeof document === 'undefined' ? React.createElement(tagName, serverProps(elementClass as Declared, attributes, props), props.children as React.ReactNode) : client.render(props, ref),
  );
  Wrapper.displayName = client.displayName;
  return Wrapper as unknown as C;
}
