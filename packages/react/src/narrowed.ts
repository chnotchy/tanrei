import type * as React from 'react';

/**
 * A wrapper (`C`) whose prop `K` takes none of the values `V`: the values a design system leaves out of that axis, as the
 * entry of that system types them (src/entries/generated/). Types only — the component is the same one — so a value the
 * system has, or one a product's layer adds to the axis, stays legal.
 */
export type Narrowed<C, K extends string, V extends string> =
  C extends React.ForwardRefExoticComponent<infer P> ? React.ForwardRefExoticComponent<Omit<P, K> & { [key in K]?: Exclude<P[K & keyof P], V> }> : never;
