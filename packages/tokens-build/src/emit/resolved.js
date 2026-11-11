// Resolved values: every token of a system as one scheme draws it, with no alias, no expression and no engine left to
// evaluate. Two forms of the same values:
//
// - `resolvedDocument(model, scheme)`: alias-free DTCG 2025.10, with each token's type and description — the hand-off
//   to design tools (`design/tokens/…/<namespace>.<scheme>.tokens.json`).
// - `resolvedValues(doc, …)`: the same values flat, by token id, in the plain form a program reads without a DTCG
//   library — `#rrggbb` (or `#rrggbbaa`), `16px`, `200ms` — for a native app, a canvas, a chart, a script or a
//   language model (`@tanrei/web/systems/<id>.<scheme>.json`, and `tanrei build`'s tokens output).
//
// And the color a browser paints its own interface in (`<meta name="theme-color">`): the system's surface, per scheme.
import { CONFIG } from '../config.js';

/** Alias-free DTCG for one scheme of a model. */
export function resolvedDocument(model, scheme) {
  const doc = { $description: `Tanrei tokens resolved for scheme "${scheme}". Generated; do not edit.` };
  for (const token of Object.values(model.tokens)) {
    // Colors that vary by scheme: the roles, and every component color (resting and per state). Other tokens have
    // one value in every scheme.
    const source =
      token.path[0] === 'sys' && token.path[1] === 'color'
        ? model.colors[scheme][token.path[2]]
        : (model.componentColors[scheme]?.[token.id] ?? token);
    let node = doc;
    for (const part of [CONFIG.namespace, ...token.path.slice(0, -1)]) node = node[part] ??= {};
    node[token.path.at(-1)] = {
      $type: source.type,
      $value: source.value,
      ...(token.description ? { $description: token.description } : {}),
    };
  }
  return doc;
}

const byte = (unit) => Math.round(Math.min(1, Math.max(0, unit)) * 255).toString(16).padStart(2, '0');

/** A DTCG color as `#rrggbb`, or `#rrggbbaa` when it is not opaque. Only sRGB: the only space the tokens use. */
export function hexColor(color) {
  if (color?.colorSpace !== 'srgb' || !Array.isArray(color.components)) throw new Error(`resolved values: a color that is not sRGB (${JSON.stringify(color)})`);
  const hex = `#${color.components.map(byte).join('')}`;
  const alpha = color.alpha ?? 1;
  return alpha >= 1 ? hex : `${hex}${byte(alpha)}`;
}

/** A DTCG value in its plain form: a color as hex, a dimension or a duration as one string, the rest as they are. */
export function plainValue(value) {
  if (Array.isArray(value)) return value.map(plainValue);
  if (value && typeof value === 'object') {
    if ('colorSpace' in value) return hexColor(value);
    if ('unit' in value && 'value' in value && Object.keys(value).length === 2) return `${value.value}${value.unit}`;
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, plainValue(inner)]));
  }
  return value;
}

/** Every token of a resolved DTCG document, by its dotted id, in its plain form. */
export function flatValues(doc) {
  const tokens = {};
  const walk = (node, path) => {
    if ('$value' in node) {
      tokens[path.join('.')] = plainValue(node.$value);
      return;
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$') && child && typeof child === 'object') walk(child, [...path, key]);
  };
  walk(doc, []);
  return tokens;
}

/** The flat file for one scheme of one system: what it is, then the values by token id. */
export function resolvedValues(doc, { system, scheme }) {
  return {
    $comment: `Every token of the "${system}" design system as the "${scheme}" scheme draws it, resolved: no alias and no expression. A color is #rrggbb, or #rrggbbaa when it is not opaque; a dimension or a duration is one string with its unit. The same values with their types and descriptions, as DTCG, are what design tools import. Generated; do not edit.`,
    system,
    scheme,
    tokens: flatValues(doc),
  };
}

/** The token a browser paints its own interface in: the surface a page is drawn on. */
export const THEME_COLOR_TOKEN = `${CONFIG.namespace}.sys.color.surface`;

/**
 * The theme color of each scheme, `{ light: '#ffffff', dark: …, 'light-high': … }`: the surface, opaque — a browser
 * ignores the alpha of a theme color. Read from the resolved documents by scheme.
 */
export function themeColors(docs) {
  const colors = {};
  // By name, whatever order the documents came in: the same file from the same values.
  for (const [scheme, doc] of Object.entries(docs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    let node = doc;
    for (const part of THEME_COLOR_TOKEN.split('.')) node = node?.[part];
    if (!node?.$value) throw new Error(`resolved values: no ${THEME_COLOR_TOKEN} in scheme "${scheme}"`);
    colors[scheme] = hexColor({ ...node.$value, alpha: 1 });
  }
  return colors;
}
