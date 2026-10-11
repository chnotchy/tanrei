const warned = new Set<string>();
/** Test hook: report every key again. Package-internal. */
export function resetLookupReports(): void {
  warned.clear();
}
const has = (values: object, key: string) => Object.prototype.hasOwnProperty.call(values, key);

/**
 * The total lookup of an open vocabulary: the value `values` has under `key`, else `fallback`.
 *
 * Keys are open-ended across systems — a system may add a Button size, a variant, a step of a series — so
 * a key the ACTIVE system does not have is not an error: the value under `fallback` (a core key, which
 * every system has) is used, and development builds warn once per key (`what` names the vocabulary, e.g.
 * `Button size`). Release builds stay silent. Only own properties count, so `constructor` is unknown too.
 */
export function lookupValue<Values extends object, Default extends keyof Values & string>(values: Values, key: string, fallback: Default, what: string): Values[Default] {
  // Every member of a series or an axis holder has the same type: the one the fallback has.
  const found = has(values, key) ? (values as Record<string, Values[Default] | undefined>)[key] : undefined;
  if (found !== undefined) return found;
  if (__DEV__ && !warned.has(`${what}:${key}`)) {
    warned.add(`${what}:${key}`);
    console.warn(`Tanrei: the active system has no ${what} "${key}"; using "${fallback}".`);
  }
  return values[fallback];
}

/**
 * The total read of a series step that ONE system added: `series[key]` when the active system has the
 * step, else `declared` — the value the declaring system gave it, which its generated file knows. Never throws;
 * development builds report once per step (`what` names the series, e.g. `space`, `motion.spring.standard`).
 * Generated `<system>Steps` accessors call this; product code rarely needs to.
 */
export function seriesStep<Value>(series: object, key: string, declared: Value, what: string): Value {
  const found = has(series, key) ? (series as Record<string, Value | undefined>)[key] : undefined;
  if (found !== undefined) return found;
  if (__DEV__ && !warned.has(`${what}.${key}`)) {
    warned.add(`${what}.${key}`);
    console.warn(`Tanrei: the active system has no step "${key}" in ${what}; using the value of the system that declared it.`);
  }
  return declared;
}

/**
 * The total read of a CLOSED enum prop — a structural choice the component draws in code, not a token axis (a
 * divider's `orientation`, a progress indicator's `variant`): `value` when it is one of `values`, else `fallback` (the
 * spec default). Development builds report an unknown value once per value (`what` names the prop, e.g. `Divider
 * orientation`); release builds stay silent. Package-internal: `lookupValue` is the read of an OPEN key.
 */
export function closedValue<Value extends string>(values: readonly Value[], value: string, fallback: Value, what: string): Value {
  if ((values as readonly string[]).includes(value)) return value as Value;
  if (__DEV__ && !warned.has(`${what}:${value}`)) {
    warned.add(`${what}:${value}`);
    console.warn(`Tanrei: ${what} "${value}" is not defined; using "${fallback}".`);
  }
  return fallback;
}
