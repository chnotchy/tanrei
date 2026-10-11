// Structural checks over a whole system object: which color roles its tokens name, and which of them a
// scheme does not value. Works on any `TanreiSystem` (shipped preset or product system) without knowing
// the component list: every `TanreiPaint` anywhere under `components` is walked.
import type { TanreiColorRole, TanreiPaint, TanreiScheme, TanreiSystem } from '../generated/vocabulary';

const PAINT_KINDS = new Set(['role', 'mix', 'alpha', 'none', 'literal', 'scheme']);
const isPaint = (value: unknown): value is TanreiPaint =>
  typeof value === 'object' && value !== null && 'kind' in value && PAINT_KINDS.has(String((value as { kind: unknown }).kind));

function paintRoles(paint: TanreiPaint, into: Set<TanreiColorRole>) {
  if (paint.kind === 'role') into.add(paint.role);
  if (paint.kind === 'mix') {
    paintRoles(paint.base, into);
    paintRoles(paint.with, into);
  }
  if (paint.kind === 'alpha') paintRoles(paint.of, into);
  if (paint.kind === 'scheme') Object.values(paint.by).forEach((each) => paintRoles(each, into));
}

function walk(value: unknown, into: Set<TanreiColorRole>) {
  if (isPaint(value)) paintRoles(value, into);
  else if (Array.isArray(value)) value.forEach((item) => walk(item, into));
  else if (typeof value === 'object' && value !== null) Object.values(value).forEach((item) => walk(item, into));
}

/** Every role a component token (through any paint) or an elevation layer of `system` names. */
export function referencedRoles(system: TanreiSystem): TanreiColorRole[] {
  const roles = new Set<TanreiColorRole>();
  walk(system.components, roles);
  for (const layers of Object.values(system.elevation)) for (const layer of layers) roles.add(layer.role);
  return [...roles].sort();
}

export const schemesOf = (system: TanreiSystem) => Object.keys(system.colors) as TanreiScheme[];

/** `scheme: role` for every referenced role a scheme of `system` has no value for. Empty = sound. */
export function unknownRoles(system: TanreiSystem, roles: readonly TanreiColorRole[] = referencedRoles(system)): string[] {
  return schemesOf(system).flatMap((scheme) => roles.filter((role) => system.colors[scheme][role] === undefined).map((role) => `${scheme}: ${role}`));
}

const capitalize = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/** The four roles an intent stands for: `x`, `onX`, `xContainer`, `onXContainer`. */
export const intentRoles = (intent: string) =>
  [intent, `on${capitalize(intent)}`, `${intent}Container`, `on${capitalize(intent)}Container`] as TanreiColorRole[];
