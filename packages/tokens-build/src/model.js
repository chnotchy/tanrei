// Reads a system's DTCG bundle (`reader.js`) and builds the platform-neutral model every emitter consumes.
// Emitters never read token files directly.
//
// Two readers live here. `readBundle` (reader.js) is the one the pipeline runs: it reads the documents as they are
// in memory and shares what the schemes have in common. `loadResolver` / `loadResolverFromBundle` read the same
// bundle through a general DTCG parser — any other consumer's reading — and are what `test/reader.test.js` holds
// the first to. The parser still judges every VALUE a system writes (`lintValues`: is this a dimension, a color, a
// shadow?), because that judgment is its own and long; it is given the values alone, each once per process.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONFIG } from './config.js';
import { COMPONENTS_HELD_IN_EVERY_SCHEME } from './invariants.js';
import { TokenReadError, readBundle } from './reader.js';
import { SCHEMES } from './scheme.js';

// The directory that holds tokens/ and tanrei.config.json. In the monorepo that is the repository root; the
// published CLI carries a copy of the vocabulary and points here with TANREI_VOCABULARY_ROOT.
export const REPO_ROOT = process.env.TANREI_VOCABULARY_ROOT ? path.resolve(process.env.TANREI_VOCABULARY_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const TOKENS_DIR = path.join(REPO_ROOT, 'tokens');
export { CONFIG };
const NS = CONFIG.namespace;
const MEMORY = new URL('file:///tanrei-bundle-in-memory/');

/**
 * A bundle on disk through a general DTCG parser. Not what the pipeline runs (see the head of this file): about
 * a second and 0.1 GB per scheme applied at 8,500 tokens, and everything it returns keeps its syntax tree alive.
 * @param {string} [bundleDir] absolute directory of a system bundle; the default system lives in tokens/ itself
 */
export async function loadResolver(bundleDir = TOKENS_DIR, systemId = NS) {
  const { defineConfig, parse } = await import('@terrazzo/parser');
  const file = pathToFileURL(path.join(bundleDir, `${systemId}.resolver.json`));
  const config = defineConfig({}, { cwd: pathToFileURL(`${bundleDir}/`) });
  const { resolver } = await parse([{ filename: file, src: fs.readFileSync(file, 'utf8') }], { config });
  return resolver;
}

/**
 * What each component DECLARES about itself in its source document: its axes (`dev.tanrei.axes`: size, variant —
 * including values a layer added) and its interaction states (`dev.tanrei.states`). Group-level
 * `$extensions` are not tokens, so a DTCG resolver does not surface them; they are read from the bundle.
 * @returns {Record<string, { axes: object, states: object|undefined }>} keyed by component name
 */
function componentDeclarations(bundleDir, systemId, read = (name) => JSON.parse(fs.readFileSync(path.join(bundleDir, name), 'utf8'))) {
  const resolver = read(`${systemId}.resolver.json`);
  const out = {};
  for (const { $ref } of resolver.sets.comp?.sources ?? []) {
    const components = read($ref)[NS]?.comp ?? {};
    for (const [name, group] of Object.entries(components)) {
      const axes = group.$extensions?.['dev.tanrei.axes'];
      if (axes) out[name] = { axes, states: group.$extensions['dev.tanrei.states'] };
    }
  }
  return out;
}

// ── The token lint ───────────────────────────────────────────────────────
// A general DTCG parser lints what it reads: sixteen rules on the shape of a value by its type (`core/valid-*` — a
// dimension's unit, a color's components and their range, what a shadow or a typography must hold). Reading a
// whole bundle through it for that took seconds and hundreds of megabytes, most of it spent on aliases the reader
// has already followed. So the parser is handed only what its rules look at: every value of the default scheme
// that is WRITTEN (not an alias), with the fields that point elsewhere replaced by what they point at, each
// distinct value once — one token per line of a document made for the purpose. A value this process has already
// had judged is not sent again: a second system, or the same one with one token changed, costs a few values.
const linted = new Set();
const LINTED_AT_MOST = 200_000; // values remembered as well-formed; past that the memory starts again

/**
 * The values a system writes, held to the DTCG value rules by a general parser's linter.
 * @param {Record<string, import('./reader.js').ReadToken>} tokens one scheme, as `readBundle` reads it
 * @throws {TokenReadError} naming every token whose value is not well-formed, and the rule it breaks
 */
export async function lintValues(tokens) {
  // A written value as the linter must see it: where a field is an alias, what stands at the end of that alias.
  const written = (id) => (tokens[id].aliasOf ? written(tokens[id].aliasOf) : inlined(tokens[id].originalValue.$value, tokens[id].partialAliasOf));
  const inlined = (value, partial) => {
    if (typeof partial === 'string') return written(partial);
    if (!partial || value === null || typeof value !== 'object') return value;
    if (Array.isArray(partial) && !Array.isArray(value)) return inlined(value, partial[0]); // a lone shadow's aliases are listed as a list of one
    const out = Array.isArray(value) ? [...value] : { ...value };
    for (const key of Object.keys(partial)) out[key] = inlined(value[key], partial[key]);
    return out;
  };
  const lines = ['{'];
  const at = [null]; // line (from 1) → the first token that writes the value on it
  const seen = new Map();
  for (const token of Object.values(tokens)) {
    if (token.aliasOf) continue;
    const text = JSON.stringify({ $type: token.$type, $value: inlined(token.originalValue.$value, token.partialAliasOf) });
    if (linted.has(text) || seen.has(text)) continue;
    seen.set(text, token.id);
  }
  if (!seen.size) return;
  [...seen].forEach(([text, id], i) => {
    lines.push(`"v${i}": ${text}${i === seen.size - 1 ? '' : ','}`);
    at.push(id);
  });
  lines.push('}');

  const { Logger, defineConfig, parse } = await import('@terrazzo/parser');
  class Problems extends Logger {
    error(...entries) {
      const said = entries.filter((entry) => !(entry.group === 'lint' && entry.label === 'lint')); // the linter's own count of its errors
      throw new TokenReadError(said.map((entry) => `${at[entry.node?.loc?.start?.line - 1] ?? 'a value'}: ${entry.message}${entry.group === 'lint' ? ` (${entry.label})` : ''}`).join('\n'));
    }
  }
  const filename = new URL('values.tokens.json', MEMORY);
  await parse([{ filename, src: lines.join('\n') }], { config: defineConfig({}, { cwd: MEMORY }), logger: new Problems({ level: 'error' }) });
  if (linted.size + seen.size > LINTED_AT_MOST) linted.clear();
  for (const text of seen.keys()) linted.add(text);
}

/** `tanrei.sys.color.on-primary` → ['sys','color','on-primary'] */
export const segments = (id) => id.split('.').slice(1);

/**
 * A bundle on disk as the reader takes it: the resolver document and every document it names, by their path
 * relative to the bundle root.
 */
export function readBundleFiles(bundleDir = TOKENS_DIR, systemId = NS) {
  const name = `${systemId}.resolver.json`;
  const read = (file) => JSON.parse(fs.readFileSync(path.join(bundleDir, file), 'utf8'));
  const resolver = read(name);
  const sources = [...Object.values(resolver.sets ?? {}).flatMap((set) => set.sources ?? []), ...Object.values(resolver.modifiers ?? {}).flatMap((modifier) => Object.values(modifier.contexts ?? {}).flat())];
  const files = { [name]: resolver };
  for (const { $ref } of sources) if (typeof $ref === 'string' && !$ref.startsWith('#')) files[$ref] ??= read($ref);
  return files;
}

/**
 * What the model says of one token. Every entry of a model is an object of its own — a test or a tool may change one
 * scheme's entry and nothing else — and only a token's `path` is shared between the entries that name it (`paths`).
 */
function simplify(token, paths) {
  let tokenPath = paths?.get(token.id);
  if (!tokenPath) paths?.set(token.id, (tokenPath = segments(token.id)));
  return simplified(token, tokenPath ?? segments(token.id));
}

function simplified(token, tokenPath) {
  return {
    id: token.id,
    path: tokenPath,
    // `tanrei` for the vocabulary (core and extensions inside its tree); a layer's id for its own tokens.
    namespace: token.id.split('.')[0],
    // Set on extensions: { rationale, declaredBy, extension: true, onRole? }.
    vocabulary: token.$extensions?.['dev.tanrei.vocabulary'],
    type: token.$type,
    value: token.$value,
    description: token.$description,
    deprecated: token.$deprecated || undefined,
    // Direct alias target (one hop), so emitters can keep the ref → sys → comp chain visible.
    alias: token.aliasChain?.[0],
    // The end of the alias chain (a comp token may alias another comp token that aliases a sys token).
    aliasFinal: token.aliasOf,
    partialAlias: token.partialAliasOf,
    // How the value is decided when it is not an alias: a rule, or { fixed: reason }.
    derive: token.$extensions?.['dev.tanrei.derive'],
    // Set on generated per-state component tokens: 'hovered' | 'focused' | 'pressed' | 'disabled'.
    state: token.$extensions?.['dev.tanrei.state'],
    // Set on a choice of kind: { values: [...] }; the value is an index into it.
    enum: token.$extensions?.['dev.tanrei.enum'],
  };
}

/**
 * @returns {{
 *   schemes: string[],
 *   tokens: Record<string, ReturnType<typeof simplify>>,       // default scheme, every token
 *   colors: Record<string, Record<string, ReturnType<typeof simplify>>>, // scheme → role → token
 * }}
 */
export async function buildModel(bundleDir = TOKENS_DIR, systemId = NS) {
  const files = readBundleFiles(bundleDir, systemId);
  const reader = readBundle(files, systemId);
  await lintValues(reader.tokens());
  return modelFrom(reader, systemId, componentDeclarations(null, systemId, (name) => files[name]));
}

/**
 * The same general DTCG parser as `loadResolver`, reading a bundle that exists only in memory
 * (`files`: path relative to the bundle root → DTCG document, as `buildBundle` returns it). Nothing touches the disk.
 * The oracle of `test/reader.test.js`; not what the pipeline runs.
 */
export async function loadResolverFromBundle(files, systemId = NS) {
  const { defineConfig, parse } = await import('@terrazzo/parser');
  const name = `${systemId}.resolver.json`;
  if (!files[name]) throw new Error(`the bundle has no ${name}`);
  const config = defineConfig({}, { cwd: MEMORY });
  const req = async (url) => {
    const relative = decodeURIComponent(url.href.slice(MEMORY.href.length));
    if (!url.href.startsWith(MEMORY.href) || !files[relative]) throw new Error(`the bundle has no ${relative}`);
    return JSON.stringify(files[relative]);
  };
  const { resolver } = await parse([{ filename: new URL(name, MEMORY), src: JSON.stringify(files[name]) }], { config, req });
  return resolver;
}

/**
 * `buildModel` for a bundle in memory, WITHOUT the token lint (`lintValues`): `resolveChain` has run it by the time
 * it builds a model; a caller that comes here with a bundle of its own runs it first.
 * Pass `resolver` when the bundle was already read (`readBundle`; anything with
 * `apply({ scheme })` that answers with a scheme's tokens will do — a general parser's resolver too).
 * `colorsFrom` — the model of ANOTHER system whose color documents are identical (the caller has checked): its
 * per-scheme role colors are reused and only the light scheme is resolved. Such a model is `partial` (no component
 * colors for the other schemes): enough for the invariants, not for an emitter.
 */
export async function buildModelFromBundle(files, systemId = NS, resolver, { colorsFrom } = {}) {
  return modelFrom(resolver ?? readBundle(files, systemId), systemId, componentDeclarations(null, systemId, (name) => files[name]), colorsFrom);
}

function modelFrom(resolver, systemId, components, colorsFrom) {
  const base = resolver.apply({ scheme: 'light' });
  if (colorsFrom) return partialModel(base, systemId, components, colorsFrom.colors);
  const paths = new Map();
  const tokens = simplifyAll(base, paths);

  const colors = {};
  // Component colors also differ per scheme (a state mix is computed from that scheme's roles). Native code
  // evaluates paints at runtime; tools with static variables (Figma) need the value of every scheme.
  const componentColors = {};
  for (const scheme of SCHEMES) {
    const set = resolver.apply({ scheme });
    colors[scheme] = {};
    componentColors[scheme] = {};
    for (const [id, token] of Object.entries(set)) {
      if (id.startsWith(SYS_COLOR)) colors[scheme][id.slice(SYS_COLOR.length)] = simplify(token, paths);
      else if (id.startsWith(COMP) && token.$type === 'color') componentColors[scheme][id] = simplify(token, paths);
    }
  }
  assertEveryRole(colors);
  return { system: systemId, schemes: SCHEMES, tokens, colors, componentColors, components };
}

const SYS_COLOR = `${NS}.sys.color.`;
const COMP = `${NS}.comp.`;

const WHOLE_ALIAS = /^\{[^{}]+\}$/;

function simplifyAll(set, paths) {
  const tokens = {};
  for (const [id, token] of Object.entries(set)) tokens[id] = simplify(token, paths);
  // A reader leaves an alias unresolved when the value at its end is falsy: a number token that aliases a token
  // whose value is 0 keeps the string "{…}" as its value. That is a component's choice of kind following a system's
  // choice at its first name. The value of an alias is the value at the end of its chain.
  for (const token of Object.values(tokens)) {
    if (typeof token.value === 'string' && WHOLE_ALIAS.test(token.value) && token.aliasFinal && tokens[token.aliasFinal]) token.value = tokens[token.aliasFinal].value;
  }
  return tokens;
}

function assertEveryRole(colors) {
  const roles = Object.keys(colors.light);
  for (const scheme of SCHEMES) {
    const missing = roles.filter((r) => !(r in colors[scheme]));
    if (missing.length) throw new Error(`Scheme "${scheme}" is missing color roles: ${missing.join(', ')}`);
  }
}

/** Every token of the light scheme, and the role colors of every scheme: what the invariants read. Not for an emitter. */
function partialModel(base, systemId, components, colors, otherSchemes = {}) {
  const tokens = simplifyAll(base);
  const light = Object.fromEntries(Object.entries(tokens).filter(([id, t]) => id.startsWith(COMP) && t.type === 'color'));
  return { system: systemId, schemes: SCHEMES, tokens, colors, componentColors: { ...otherSchemes, light }, components, partial: true };
}

// ── What the invariants read ─────────────────────────────────────────────

/**
 * The role colors of every scheme (scheme → role → simplified token, as a model has them).
 * @param {{ apply: (input: { scheme: string }) => Record<string, object> }} [reader] the bundle, when it is already read
 */
export async function colorsFromBundle(files, systemId = NS, reader = readBundle(files, systemId)) {
  return (await schemeColors(reader)).colors;
}

/**
 * The role colors of every scheme and, for the components whose colors `checkInvariants` compares in every scheme
 * (`COMPONENTS_HELD_IN_EVERY_SCHEME`), their component colors in every scheme: a few hundred tokens, not the
 * thousands of every component.
 */
async function schemeColors(reader) {
  const colors = {};
  const componentColors = {};
  const held = COMPONENTS_HELD_IN_EVERY_SCHEME.map((component) => `${COMP}${component}.`);
  for (const scheme of SCHEMES) {
    colors[scheme] = {};
    componentColors[scheme] = {};
    for (const [id, token] of Object.entries(reader.apply({ scheme }))) {
      if (id.startsWith(SYS_COLOR)) colors[scheme][id.slice(SYS_COLOR.length)] = simplify(token);
      else if (token.$type === 'color' && held.some((prefix) => id.startsWith(prefix))) componentColors[scheme][id] = simplify(token);
    }
  }
  assertEveryRole(colors);
  return { colors, componentColors };
}

/**
 * What `checkInvariants` reads, without the component colors of five more schemes: every token of the light scheme
 * (`light`, the resolved set), the role colors of every scheme, and the colors of the few components it compares in
 * every scheme. The same warnings as the full model's.
 */
export async function invariantModel(files, systemId, light, reader) {
  const { colors, componentColors } = await schemeColors(reader);
  return partialModel(light, systemId, componentDeclarations(null, systemId, (name) => files[name]), colors, componentColors);
}

export const byPrefix = (model, prefix) =>
  Object.values(model.tokens).filter((t) => t.id.startsWith(`${NS}.${prefix}.`) || t.id === `${NS}.${prefix}`);

// Names, colors and the generated-file header are pure and live in pure.js, so the browser can use them too.
export { GENERATED_HEADER, camel, cssColor, hex8, kebab, pascal, rgba } from './pure.js';
