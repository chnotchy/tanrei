// Pure helpers: no filesystem, no Node built-ins. The CSS emitter and the invariants import only this and
// config.js, so Theme Studio runs them in the browser unchanged.

// ── system ids ──────────────────────────────────────────────────────────
/**
 * What may name a system wherever a name becomes part of a file path: lowercase letters, digits and hyphens. The layer
 * schema is stricter still, but it is applied to a chain AFTER the chain has been read — so every reader checks this
 * first, before any path is built from an `extends` it has not validated yet.
 */
export const SYSTEM_ID = /^[a-z0-9][a-z0-9-]*$/;
export const isSystemId = (value) => typeof value === 'string' && SYSTEM_ID.test(value);

/** @throws when `value` cannot be a system id. `where` names the place it was written, for the message. */
export function assertSystemId(value, where = '"extends"') {
  if (!isSystemId(value)) throw new Error(`${where}: ${JSON.stringify(value) ?? String(value)} is not a system id (lowercase letters, digits and hyphens: ${SYSTEM_ID.source}). A parent layer is named by its id, never by a path.`);
  return value;
}

// ── naming ──────────────────────────────────────────────────────────────
export const kebab = (parts) => parts.join('-');
export const camel = (parts) =>
  parts
    .join('-')
    .split('-')
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join('');
export const pascal = (parts) => {
  const c = camel(parts);
  return c[0].toUpperCase() + c.slice(1);
};

// ── color helpers ───────────────────────────────────────────────────────
export function rgba(color) {
  const [r, g, b] = color.components.map((c) => Math.round(c * 255));
  return { r, g, b, a: color.alpha ?? 1 };
}
export function hex8(color) {
  const { r, g, b, a } = rgba(color);
  const h = (n) => n.toString(16).padStart(2, '0').toUpperCase();
  return { rgb: `${h(r)}${h(g)}${h(b)}`, a: h(Math.round(a * 255)) };
}
export function cssColor(color) {
  const { r, g, b, a } = rgba(color);
  if (a === 1) return `#${hex8(color).rgb.toLowerCase()}`;
  return `rgb(${r} ${g} ${b} / ${a})`;
}

export const GENERATED_HEADER = [
  'GENERATED FILE — DO NOT EDIT.',
  'Source: tokens/ (DTCG 2025.10). Regenerate with `pnpm generate`.',
];

// The family a text role belongs to, for the emphasis step: the first segment of its name; caption, code
// and eyebrow take the label step; an added role of an unknown first segment does too. Decided once, here — this file
// has no Node imports, so the CSS emitter and Theme Studio's browser bundle can read it.
export const TYPE_FAMILIES = ['display', 'heading', 'body', 'label'];
export const typeFamily = (role) => { const first = role.split('-')[0]; return TYPE_FAMILIES.includes(first) ? first : 'label'; };
