import * as React from 'react';

/**
 * The props to hand on, with each boolean mark written as an attribute that is present or absent: `true` becomes the
 * empty string and anything false is taken out. A component that reads a mark asks only whether the attribute is there
 * (`hasAttribute`), and React before 19 writes a boolean prop of a custom element as the text `"true"` or `"false"` —
 * so `confirming={false}` would otherwise mark the element.
 */
export function marks<P extends object>(props: P, names: readonly string[]): P {
  if (!names.some((name) => name in props)) return props;
  const next = { ...props } as Record<string, unknown>;
  for (const name of names) {
    if (next[name]) next[name] = '';
    else delete next[name];
  }
  return next as P;
}

/** A wrapper (`C`) whose props are its own and the marks `M`; a mark that has the name of a property of the element takes its place. */
export type Marked<C, M> = C extends React.ForwardRefExoticComponent<infer P> ? React.ForwardRefExoticComponent<Omit<P, keyof M> & M> : never;

/**
 * Writes each of `names` on `element` as an attribute: its text, or — for nothing, `null` or `false` — no attribute.
 * For an attribute whose name is also a read-only property of the element (a form-associated element's `form`: the
 * attribute is the id of a form, the property returns the form): a prop of that name cannot be assigned, by this
 * package or by React, so the attribute is written on the element itself.
 */
export function writeAttributes(element: Element, props: Record<string, unknown>, names: readonly string[]): void {
  for (const name of names) {
    const value = props[name];
    if (value === undefined || value === null || value === false) element.removeAttribute(name);
    else element.setAttribute(name, String(value));
  }
}

/**
 * Gives a wrapper the attributes of its element that are not properties of it — marks another component reads from the
 * element, as a button group reads `confirming` from a button — as typed props (`M`). `names` are the boolean ones.
 * `attributes` are the ones that share their name with a read-only property of the element (`form`): they are taken
 * out of the props and written on the element when it is attached, at every render.
 */
export function withMarks<M extends object>(names: readonly (keyof M & string)[], attributes: readonly (keyof M & string)[] = []) {
  return <P extends object>(Component: React.ForwardRefExoticComponent<P>): React.ForwardRefExoticComponent<Omit<P, keyof M> & M> => {
    const WithMarks = React.forwardRef<unknown, object>((props, ref) => {
      if (!attributes.length) return React.createElement(Component as React.ElementType, { ...marks(props, names), ref });
      const rest = { ...marks(props, names) } as Record<string, unknown>;
      for (const name of attributes) delete rest[name];
      const attach = (element: Element | null) => {
        if (element) writeAttributes(element, props as Record<string, unknown>, attributes);
        if (typeof ref === 'function') ref(element);
        else if (ref) ref.current = element;
      };
      return React.createElement(Component as React.ElementType, { ...rest, ref: attach });
    });
    WithMarks.displayName = Component.displayName;
    return WithMarks as unknown as React.ForwardRefExoticComponent<Omit<P, keyof M> & M>;
  };
}
