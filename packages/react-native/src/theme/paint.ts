import type { TanreiColor, TanreiColorRole, TanreiPaint, TanreiScheme, TanreiSchemeColors } from '../generated/vocabulary';

const TRANSPARENT: TanreiColor = { r: 0, g: 0, b: 0, a: 0 };

/**
 * Premultiplied interpolation — identical to CSS `color-mix(in srgb, base, over amount)` and to
 * `mixColors` in `@tanrei/token-engine`. Mixing with "nothing" keeps the other color's channels.
 */
export function mixColors(base: TanreiColor, over: TanreiColor, amount: number): TanreiColor {
  const t = Math.min(1, Math.max(0, amount));
  const a = base.a * (1 - t) + over.a * t;
  if (a === 0) return TRANSPARENT;
  const channel = (k: 'r' | 'g' | 'b') => (base[k] * base.a * (1 - t) + over[k] * over.a * t) / a;
  return { r: channel('r'), g: channel('g'), b: channel('b'), a };
}

/** Structured color → React Native color string. Channels round to 8 bits, alpha to three decimals. */
export function formatColor({ r, g, b, a }: TanreiColor): string {
  const byte = (n: number) => Math.round(Math.min(255, Math.max(0, n)));
  const alpha = Math.round(Math.min(1, Math.max(0, a)) * 1000) / 1000;
  return alpha === 1 ? `rgb(${byte(r)}, ${byte(g)}, ${byte(b)})` : `rgba(${byte(r)}, ${byte(g)}, ${byte(b)}, ${alpha})`;
}

const warned = new Set<string>();

/** `onXContainer` → `onPrimaryContainer`, `onX` → `onPrimary`, `xContainer` → `primaryContainer`, `x` → `primary`. */
function fallbackRole(role: string): TanreiColorRole {
  const on = /^on[A-Z]/.test(role);
  const container = role.endsWith('Container');
  return on ? (container ? 'onPrimaryContainer' : 'onPrimary') : container ? 'primaryContainer' : 'primary';
}

/**
 * A role's color in one scheme. Roles are open-ended across systems (a system may declare palettes such
 * as `tertiary`); a role the active system does not have falls back to the matching `primary` slot and
 * warns once in development.
 */
export function roleColor(colors: TanreiSchemeColors, role: TanreiColorRole): TanreiColor {
  const found = colors[role];
  if (found) return found;
  if (__DEV__ && !warned.has(role)) {
    warned.add(role);
    console.warn(`Tanrei: the active system has no color role "${role}"; using "${fallbackRole(role)}".`);
  }
  return colors[fallbackRole(role)] ?? TRANSPARENT;
}

/**
 * Evaluates a paint against one scheme's colors. Component tokens stay scheme-independent; this is the only place
 * they meet a scheme. `scheme` names the scheme `colors` belongs to: a paint of kind `scheme` (decided per scheme at
 * build time) picks its paint by that name — `light` when the caller does not say.
 */
export function evaluatePaint(paint: TanreiPaint, colors: TanreiSchemeColors, scheme: TanreiScheme = 'light'): TanreiColor {
  switch (paint.kind) {
    case 'role':
      return roleColor(colors, paint.role);
    case 'mix':
      return mixColors(evaluatePaint(paint.base, colors, scheme), evaluatePaint(paint.with, colors, scheme), paint.amount);
    case 'alpha': {
      const of = evaluatePaint(paint.of, colors, scheme);
      return { ...of, a: of.a * paint.amount };
    }
    case 'scheme':
      return evaluatePaint(paint.by[scheme], colors, scheme);
    case 'none':
      return TRANSPARENT;
    case 'literal':
      return { r: paint.r, g: paint.g, b: paint.b, a: paint.a };
    default: {
      const unknown: never = paint;
      throw new Error(`Tanrei: unknown paint ${JSON.stringify(unknown)}`);
    }
  }
}
