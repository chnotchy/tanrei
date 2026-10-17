// A design system, loaded once and kept: the layer chain, the merged operations, the DTCG bundle, and the
// standard resolver reading that bundle back. Every tool works from this context. The pipeline itself is
// @tanrei/tokens-build — the same code `tanrei build` runs — so the server can never disagree with a build.
import fs from 'node:fs';
import path from 'node:path';
import { AXES, STATES, collectVocabulary as engineCollectVocabulary, dependencyIndex, expandStateVocabulary, isHeldDocument, listExtensions, materializeVocabulary, walkTokens } from '@tanrei/token-engine';
import { DEFAULT_SYSTEM, ROOT_SYSTEM, listSystems, shippedSystems as systemsOffered, validateLayerFile } from '@tanrei/tokens-build/bundle';
import { CONFIG, REPO_ROOT } from '@tanrei/tokens-build/model';
// resolve.js is the pipeline without the platform emitters: layers → bundle → DTCG resolver → model, all in memory.
import { chainDigest, readSystemChain, resolveChainByScheme, systemIdOf, validateSystem } from '@tanrei/tokens-build/resolve';
import { SCHEMES, heldDocuments, loadSystem, sourceFiles, vocabularyDigest } from '@tanrei/tokens-build/scheme';

export { CONFIG, REPO_ROOT, SCHEMES };
export const NS = CONFIG.namespace;
// The root layer every chain starts from, and the default system — the one a tool reads when it is named no system.
export { DEFAULT_SYSTEM, ROOT_SYSTEM };
export const VOCABULARY = 'dev.tanrei.vocabulary';
export const LLM = 'dev.tanrei.llm';
export const DERIVE = 'dev.tanrei.derive';
export const STATE = 'dev.tanrei.state';
const RECIPE = 'dev.tanrei.system';
const SYS_COLOR = `${NS}.sys.color.`;
/** A name inside a token id — the rule the engine applies to every segment of a declared id. */
export const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
/** `<…>`: text a tool wrote for the agent to replace. Never a rationale or a reason. */
export const isPlaceholder = (text) => typeof text === 'string' && /^\s*<[^>]*>\s*$/.test(text);
const clone = (value) => JSON.parse(JSON.stringify(value));
// Names come from tanrei.config.json; the engine takes the namespace as a parameter.
// `lend`: a layer a component is included from — one of the chain's, or a shipped one.
const collectVocabulary = (layers, chain = layers) => engineCollectVocabulary(layers, { namespace: NS, lend: (id) => chain.find((layer) => layer.id === id) ?? (listSystems(REPO_ROOT).includes(id) ? loadSystem(REPO_ROOT, id) : undefined) });
const LAYER_SUFFIX = '.system.json';

/** An error whose message is meant for the calling agent; `details` travels with it as JSON. */
export class ToolError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}

/** Every layer that ships in tokens/systems/, the root among them: what a reference may name. */
export const shippedSystems = () => listSystems(REPO_ROOT);
/** The systems a product chooses from: every shipped layer but the root, which has no output of its own. */
export const listedSystems = () => systemsOffered(REPO_ROOT);
export const shippedLayer = (id) => loadSystem(REPO_ROOT, id);
export const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);

/** `*` matches exactly one id segment — the same meaning it has in a layer's pattern rules. */
export function matchSegments(pattern, id) {
  const p = pattern.split('.');
  const s = id.split('.');
  return p.length === s.length && p.every((part, i) => part === '*' || part === s[i]);
}

/**
 * What the caller named: a shipped id, a product's layer file, or a layer object that exists only in the request.
 * `system` may also be a path ending in .system.json, so one string is enough wherever a system is expected.
 */
export function describeReference({ system, layerFile, layer, parents, dir } = {}) {
  if (layer) {
    if (parents !== undefined && (!Array.isArray(parents) || parents.some((p) => !p || typeof p !== 'object' || typeof p.id !== 'string'))) throw new ToolError('"parents" is a list of layer objects, each with an "id": the layers that exist only in this request and that "layer" (or another parent) extends.');
    if (dir !== undefined && (typeof dir !== 'string' || !fs.existsSync(path.resolve(dir)))) throw new ToolError(`${dir}: no such directory. "dir" is where the product's other <id>${LAYER_SUFFIX} files live.`);
    return { kind: 'inline', layer, parents: parents ?? [], dir: dir === undefined ? undefined : path.resolve(dir) };
  }
  if (!layerFile && typeof system === 'string' && system.endsWith(LAYER_SUFFIX)) layerFile = system;
  if (layerFile) {
    const file = path.resolve(layerFile);
    if (!file.endsWith(LAYER_SUFFIX)) throw new ToolError(`${layerFile}: a layer file is named <id>${LAYER_SUFFIX}`);
    if (!fs.existsSync(file)) throw new ToolError(`${layerFile}: no such file. Pass an absolute path, or one relative to the server's working directory (${process.cwd()}).`);
    return { kind: 'file', file };
  }
  const id = system ?? DEFAULT_SYSTEM;
  if (!shippedSystems().includes(id)) throw new ToolError(`"${id}" is not a shipped system. Shipped: ${shippedSystems().join(', ')}. For a product's own system pass "layerFile": the path of its <id>${LAYER_SUFFIX}.`);
  return { kind: 'shipped', id };
}

/**
 * Layer chain (root first). A layer passed inline may extend another layer of the request (`parents`), a layer file
 * in `dir`, or a shipped system — in that order, the same lookup `tanrei build` and `tanrei studio` use.
 */
function readChain(reference) {
  const input = reference.kind === 'shipped' ? { system: reference.id } : reference.kind === 'file' ? { layerFile: reference.file } : { layers: [...reference.parents.filter((p) => p.id !== reference.layer.id), reference.layer], dir: reference.dir };
  const { id, chain, sources } = readSystemChain(input);
  return { id, chain, sources, input };
}

/** The layers a reference names, root first — read, not built. */
export function readLayers(input) {
  const reference = describeReference(input);
  try {
    return { reference, ...readChain(reference) };
  } catch (error) {
    throw new ToolError(error.message);
  }
}

/** The extensions a chain of layers declares, without building it: [{ id, kind, $type?, from?, declaredBy, rationale }]. */
export const declaredExtensions = (chain) => listExtensions({ vocabulary: collectVocabulary(chain) });

/**
 * What each component declares about itself — its axes with their current values (extensions included) and its
 * interaction states — read from the documents of a bundle. Keyed by component name.
 */
export function componentsOf(files) {
  const out = {};
  for (const [name, doc] of Object.entries(files)) {
    if (!name.startsWith('comp/')) continue;
    for (const [component, group] of Object.entries(doc[NS]?.comp ?? {})) {
      const axes = group?.$extensions?.[AXES];
      if (!axes) continue;
      const states = group.$extensions[STATES];
      out[component] = {
        id: `${NS}.comp.${component}`,
        states: states?.states ?? [],
        axes: Object.fromEntries(Object.entries(axes).map(([axis, decl]) => [axis, { default: decl.default, values: decl.from === 'states' ? (states?.variants ?? []) : decl.values, members: decl.from === 'states' ? null : decl.members }])),
      };
    }
  }
  return out;
}

/** Every component of a system by name, with an axis or without: the groups under `<namespace>.comp` of its component documents. */
export function componentNamesOf(files) {
  return Object.entries(files).filter(([name]) => name.startsWith('comp/')).flatMap(([, doc]) => Object.keys(doc[NS]?.comp ?? {}).filter((key) => !key.startsWith('$')));
}

/** The axis a component token sits on: { id: 'tanrei.comp.button.size', key: 'large', values: [...] }, or null. */
export function axisOf(components, id) {
  for (const component of Object.values(components)) {
    if (!id.startsWith(`${component.id}.`)) continue;
    const rest = id.slice(component.id.length + 1);
    for (const [axis, { values, members }] of Object.entries(component.axes)) {
      if (!members) continue;
      for (const member of members) for (const key of values) if (rest === `${member}.${key}`) return { id: `${component.id}.${axis}`, key, values };
    }
    for (const [axis, { values, members }] of Object.entries(component.axes)) {
      const key = rest.split('.')[0];
      if (!members && rest.includes('.') && values.includes(key)) return { id: `${component.id}.${axis}`, key, values };
    }
  }
  return null;
}

/** Vocabulary rationale and LLM guidance per token id, each inherited from the nearest group that states it. */
export function collectMetadata(files) {
  const meta = new Map();
  const visit = (node, trail, inherited) => {
    const ext = node.$extensions ?? {};
    const id = trail.join('.');
    const here = {
      vocabulary: ext[VOCABULARY] ? { ...ext[VOCABULARY], from: id } : inherited.vocabulary,
      llm: ext[LLM] ? [...inherited.llm, { from: id, guidance: ext[LLM] }] : inherited.llm,
    };
    if ('$value' in node) return void meta.set(id, here);
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$') && child && typeof child === 'object') visit(child, [...trail, key], here);
  };
  for (const [name, doc] of Object.entries(files)) {
    if (name.endsWith('.resolver.json')) continue;
    if (/^generated\/(sys\.color|comp\.states)\./.test(name) && !name.includes('.light.tokens')) continue; // same ids and metadata in every scheme
    visit(doc, [], { vocabulary: undefined, llm: [] });
  }
  return meta;
}

// Resolved systems, kept per CHAIN DIGEST — the layers as authored, root first — and per VOCABULARY DIGEST: the
// hand-authored files under tokens/, by size and mtime (a stat each, no reading). A layer that changes gives another
// chain digest; an inline layer, a file and a trial build of the same content share one entry; an edit under
// tokens/ while the server runs gives another vocabulary digest, so the next call
// rebuilds instead of answering from what the old vocabulary resolved to.
// A system is read one scheme at a time (`resolveChainByScheme`): with its light scheme and its warnings it holds
// ~0.05 GB, and each other scheme a tool asks for adds ~0.04 GB.
const cache = new Map(); // digest → promise of a context
const CACHE_LIMIT = 6;

function cached(id, chain) {
  const key = `${chainDigest(chain)}:${vocabularyDigest(REPO_ROOT)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key); // most recently used last
    cache.set(key, hit);
    return hit;
  }
  const promise = assemble(id, chain).catch((error) => {
    if (cache.get(key) === promise) cache.delete(key); // a failure is not remembered
    throw error;
  });
  cache.set(key, promise);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return promise;
}

/**
 * @param {{ scheme?: string }} [options] a scheme other than light that the caller will read with `tokens(scheme)`
 * @returns {Promise<{ id: string, chain: object[], system: object, files: Record<string, object>, meta: Map<string, object>,
 *   tokens: (scheme?: string) => Record<string, object>, warnings: () => Promise<string[]> }>}
 */
export function loadContext(input, { scheme = 'light' } = {}) {
  const reference = describeReference(input);
  let read;
  try {
    read = readChain(reference);
  } catch (error) {
    throw new ToolError(error.message);
  }
  const problems = layerProblems(reference, read);
  if (problems.length) return Promise.reject(new ToolError(`"${read.id}" is not a valid layer, so it has no values yet. Fix these first (validate_layer reports the same list):`, { problems }));
  return withScheme(cached(read.id, read.chain), scheme);
}

/** A context whose `tokens(scheme)` can answer: the light scheme is read with the system, any other on first use. */
async function withScheme(context, scheme) {
  const ctx = await context;
  if (scheme !== 'light') {
    try {
      await ctx.load(scheme);
    } catch (error) {
      throw new ToolError(`"${ctx.id}" cannot be built: ${error.message}`);
    }
  }
  return ctx;
}

/** Build a chain of layers that exists only in memory — what propose_extension does to verify a proposal. */
export function trialBuild(chain) {
  const layer = chain.at(-1);
  const problems = tidySchemaProblems(validateLayerFile(REPO_ROOT, layer, layer.id), [layer]);
  if (problems.length) throw new ToolError(`"${layer.id}" is not a valid layer`, { problems });
  return cached(layer.id, chain);
}

async function assemble(id, chain) {
  let resolved;
  try {
    // In memory, and read back through a standard DTCG resolver exactly as any other consumer would read the bundle —
    // one scheme at a time, when a tool first asks for it.
    resolved = await resolveChainByScheme(chain);
  } catch (error) {
    throw new ToolError(`"${id}" cannot be built: ${error.message}`);
  }
  const { system, files } = resolved;
  let dependencies;
  const extensions = files['dial/dial.tokens.json'].$extensions?.[RECIPE]?.extensions ?? [];
  const components = componentsOf(files);
  return {
    id,
    chain,
    system,
    files,
    meta: collectMetadata(files),
    // What the layers of this system added to the vocabulary, as the bundle itself records it.
    extensions,
    components,
    /** Every component's name, whether it declares an axis or not (`components` holds those that do). */
    componentNames: componentNamesOf(files),
    axisOf: (tokenId) => axisOf(components, tokenId),
    /** { declaredBy, rationale, declaredAs? } when a layer added this token; null for core vocabulary. */
    extensionOf(token) {
      const own = token.$extensions?.[VOCABULARY];
      if (own?.extension) return { declaredBy: own.declaredBy, rationale: own.rationale };
      // The tokens of a component that lives in a layer belong to the declaration of its whole vocabulary.
      const component = extensions.find((e) => e.kind === 'component' && token.id.startsWith(`${e.id}.`));
      if (component) return { declaredBy: component.declaredBy, rationale: component.rationale, declaredAs: component.id };
      // The per-state tokens of a declared variant are generated by the state engine; they belong to the axis value.
      const axis = axisOf(components, token.id);
      const declaration = axis && extensions.find((e) => e.id === `${axis.id}.${axis.key}`);
      return declaration ? { declaredBy: declaration.declaredBy, rationale: declaration.rationale, declaredAs: declaration.id } : null;
    },
    /** Every token whose value moves when `tokenId` does — through aliases and rules, transitively. Ids are the same in every scheme. */
    followers(tokenId) {
      dependencies ??= dependencyIndex(Object.fromEntries(Object.entries(files).filter(([name]) => !name.endsWith('.resolver.json') && (!name.startsWith('generated/') || !/\.(light-|dark)/.test(name)))));
      return [...dependencies.followers(tokenId)].sort();
    },
    tokens: resolved.tokens,
    load: resolved.load,
    // Accessibility and structure invariants: constants in @tanrei/tokens-build, the same ones a build reports.
    // Computed once, on first use, from the light tokens and the role colors of every scheme.
    warnings: resolved.warnings,
  };
}

// ── validation ───────────────────────────────────────────────────────────
// The engine is the authority: nothing here decides what is legal. What this adds is (1) every problem in one
// pass instead of the first one, and (2) the way out. The vocabulary checks below CALL the engine, one
// declaration at a time; the last step of validate_layer is always the real build.

let rootIds;
/** Every core token id with its $type, as the root system builds it. Declared palettes and extensions come on top. */
async function coreIds() {
  rootIds ??= loadContext({ system: ROOT_SYSTEM }).then((ctx) => new Map(Object.entries(ctx.tokens('light')).map(([id, token]) => [id, token.$type])));
  return rootIds;
}

const INTENT_ROLES = (name) => [name, `on-${name}`, `${name}-container`, `on-${name}-container`].map((role) => `${SYS_COLOR}${role}`);

/**
 * JSON Schema reports a bad `vocabulary` entry once per branch of its `oneOf` (token | axis value). Say it once,
 * about the shape the entry actually has.
 */
function tidySchemaProblems(problems, layers) {
  const out = [];
  const told = new Set();
  for (const problem of problems) {
    // A bad KEY is reported without the key. Name it.
    const keys = /^(\S+) \/vocabulary (?:must match pattern "(.+)"|property name must be valid)$/.exec(problem);
    if (keys) {
      const layer = layers.find((l) => `${l.id}${LAYER_SUFFIX}` === keys[1]);
      if (keys[2] && layer) for (const id of Object.keys(layer.vocabulary ?? {})) if (!new RegExp(keys[2]).test(id)) out.push(`${keys[1]} /vocabulary/${id}: not an id a layer can declare. Declare "${NS}.sys.…" / "${NS}.comp.…" (inside Tanrei's tree) or "${layer.id}.sys.…" / "${layer.id}.comp.…" (your own namespace); every segment is lowercase letters, digits and hyphens.`);
      if (layer) continue;
    }
    const at = /^(\S+) \/vocabulary\/([^/\s]+)(\/\S*)? /.exec(problem);
    const entry = at && layers.find((l) => `${l.id}${LAYER_SUFFIX}` === at[1])?.vocabulary?.[at[2]];
    if (!at || !entry || typeof entry !== 'object') {
      out.push(problem);
      continue;
    }
    const where = `${at[1]} /vocabulary/${at[2]}`;
    const say = (message) => void (told.has(`${where}${message}`) || (told.add(`${where}${message}`), out.push(`${where}: ${message}`)));
    if ('from' in entry === '$type' in entry) say('an extension is either a token — "$type" with a value ("$value" or "derive") — or a value on a component axis — "from", an existing value of that axis. It has ' + ('from' in entry ? 'both' : 'neither') + '.');
    else if (typeof entry.rationale !== 'string' || entry.rationale.length < 8) say('an extension needs a "rationale" (8+ characters): why does this design system or product need it?');
    else {
      const branchNoise = 'from' in entry ? /required property '\$type'/ : /required property 'from'/;
      if (!/must match exactly one schema in oneOf/.test(problem) && !branchNoise.test(problem)) out.push(problem);
    }
  }
  return [...new Set(out)];
}

/** Schema problems of every layer of the chain, in the pipeline's own words. */
function layerProblems(reference, { chain, input }) {
  const problems = validateSystem(input);
  return reference.kind === 'shipped' ? problems : tidySchemaProblems(problems, chain);
}

/**
 * The chain's `vocabulary`, checked by the engine one declaration at a time (so all problems surface together),
 * and every id that exists once the accepted declarations are materialised — the legal targets of `tokens`/`rules`.
 */
function checkVocabulary(chain, reports) {
  const problems = [];
  const failed = [];
  const fail = (layer, id, message) => {
    failed.push(id);
    if (reports(layer)) problems.push(`${layer}: vocabulary: ${message}`);
  };
  // A component a layer includes from the layer that holds it comes with that layer's `components`.
  const accepted = chain.map((layer) => ({ id: layer.id, ...(layer.components ? { components: layer.components } : {}), vocabulary: {} }));
  chain.forEach((layer, i) => {
    for (const [id, entry] of Object.entries(layer.vocabulary ?? {})) {
      if (isPlaceholder(entry?.rationale)) {
        fail(layer.id, id, `${id}: the "rationale" is still the placeholder. Say why this design system or product needs it — it is shown wherever the token is shown.`);
        continue;
      }
      try {
        // One declaration at a time, against what is accepted before it (an include is judged once, below).
        collectVocabulary([...accepted.slice(0, i), { ...accepted[i], vocabulary: { ...accepted[i].vocabulary, [id]: entry } }].map(({ components, ...rest }) => rest));
        accepted[i].vocabulary[id] = entry;
      } catch (error) {
        fail(layer.id, id, error.message);
      }
    }
  });

  // The core's documents, and those the layers hold: a component this chain has is materialised from its own.
  const docs = clone({ ...sourceFiles(REPO_ROOT), ...heldDocuments(REPO_ROOT) });
  const known = new Map();
  // Tokens before axis values — the engine's own order: an axis value may be cloned from a step declared alongside it.
  let collected = {};
  try {
    collected = collectVocabulary(accepted, chain);
  } catch (error) {
    // An include that names a layer which does not hold the component: said once, for the layer that wrote it.
    fail(chain.at(-1).id, 'components.include', error.message);
  }
  const declared = Object.entries(collected).sort(([, a], [, b]) => Number(a.kind === 'axis-value') - Number(b.kind === 'axis-value'));
  for (const [id, declaration] of declared) {
    if (declaration.kind === 'token' && id.startsWith(SYS_COLOR)) known.set(id, 'color'); // valued by the palette engine
    try {
      materializeVocabulary(docs, { vocabulary: { [id]: declaration }, tokens: {} });
    } catch (error) {
      fail(declaration.declaredBy, id, error.message);
    }
  }
  // The documents of the components this chain does not have are no part of it.
  for (const name of Object.keys(docs)) if (isHeldDocument(name)) delete docs[name];
  for (const doc of Object.values(docs)) for (const { id, type } of walkTokens(doc)) known.set(id, type);
  for (const { id, type } of expandStateVocabulary(Object.entries(docs).filter(([name]) => name.startsWith('comp/')).map(([, doc]) => doc))) known.set(id, type);
  return { problems, failed, known };
}

/** Could `tokenId` be one of the tokens a declaration that FAILED would have produced? Then "unknown token" is an echo, not a finding. */
function echoesFailure(tokenId, failed) {
  return failed.some((id) => {
    if (tokenId === id) return true;
    const parts = id.split('.');
    return parts[1] === 'comp' && tokenId.startsWith(`${parts.slice(0, 3).join('.')}.`) && tokenId.split('.').includes(parts.at(-1));
  });
}

/**
 * Problems the engine would stop at one by one, collected in one pass so an agent can fix them together:
 * a declaration the engine refuses, a token id that is neither core nor declared, a `$type` change, a pinned
 * literal without a reason, a pattern that matches nothing.
 */
async function philosophyProblems(chain) {
  const shipped = new Set(shippedSystems());
  const reports = (layerId) => !shipped.has(layerId) || layerId === chain.at(-1).id; // shipped parents are checked by the Tanrei repository
  const vocabulary = checkVocabulary(chain, reports);
  const known = new Map([...(await coreIds()), ...vocabulary.known]);
  for (const layer of chain) for (const [name, decl] of Object.entries(layer.palettes ?? {})) if (decl?.roles === 'intent') for (const id of INTENT_ROLES(name)) known.set(id, 'color');
  const problems = [...vocabulary.problems];
  for (const layer of chain) {
    if (!reports(layer.id)) continue;
    for (const [id, op] of Object.entries(layer.tokens ?? {})) {
      const at = `${layer.id}: ${id}`;
      if (!known.has(id)) {
        if (echoesFailure(id, vocabulary.failed)) continue;
        problems.push(`${at}: not a token of this system. If a token with this meaning already exists, use it (search_tokens). Otherwise ADD it: declare it under "vocabulary" with a "rationale" — a step in a series, a value on a component axis, or a token in this layer's own namespace ("${layer.id}.comp.…") — and propose_extension writes the declaration for you. For a whole color family, declare a palette with "roles": "intent".`);
        continue;
      }
      if (op.$type && op.$type !== known.get(id)) problems.push(`${at}: a layer cannot change $type (${known.get(id)} → ${op.$type}). Extensions are additive: declare a token of your own instead.`);
      const pinsLiteral = '$value' in op && !isRef(op.$value);
      if (pinsLiteral && id.startsWith(SYS_COLOR)) problems.push(`${at}: a color role is not pinned to a literal. Give it a rule ({"derive": {"fn": "tone", "palette": …, "tone": {"light": […], "dark": […]}}}), alias another role, or change the palette's seed under "palettes".`);
      else if (pinsLiteral && (typeof op.reason !== 'string' || op.reason.length < 8)) problems.push(`${at}: pinning a literal "$value" needs a "reason" (8+ characters): a pinned token stops following the dials, and the next person must know why.`);
      else if (pinsLiteral && isPlaceholder(op.reason)) problems.push(`${at}: the "reason" is still the placeholder. Say why this value is pinned.`);
    }
    for (const [index, rule] of (layer.rules ?? []).entries()) {
      const at = `${layer.id}: rules[${index}] ${rule.match}`;
      if (![...known.keys()].some((id) => matchSegments(rule.match, id)) && !vocabulary.failed.length) problems.push(`${at}: matches no token. Patterns value the per-state component tokens that exist — core ones, and those of a variant declared under "vocabulary". Interaction states themselves are not extensible.`);
      if ('$value' in rule && !isRef(rule.$value) && (typeof rule.reason !== 'string' || rule.reason.length < 8)) problems.push(`${at}: a literal "$value" needs a "reason".`);
    }
  }
  return problems;
}

/**
 * @returns {Promise<{ id: string, chain: string[], valid: boolean, problems: string[], warnings?: string[], tokens?: number }>}
 */
export async function validateLayer(input) {
  const reference = describeReference(input);
  if (reference.kind === 'shipped') throw new ToolError('validate_layer checks a product layer: pass "layerFile" or "layer". Shipped systems are validated by the Tanrei repository itself.');
  if (reference.kind === 'inline' && (typeof reference.layer.id !== 'string' || !reference.layer.id)) return { id: null, chain: [], valid: false, problems: ['/ must have required property \'id\''] };
  let read;
  try {
    read = readChain(reference);
  } catch (error) {
    return { id: reference.layer?.id ?? systemIdOf(reference.file), chain: [], valid: false, problems: [error.message] };
  }
  const chain = read.chain.map((l) => l.id);
  const problems = layerProblems(reference, read);
  if (!problems.length) problems.push(...(await philosophyProblems(read.chain)));
  if (problems.length) return { id: read.id, chain, valid: false, problems };
  try {
    const ctx = await loadContext(input);
    return { id: read.id, chain, valid: true, problems: [], tokens: Object.keys(ctx.tokens('light')).length, extensions: ctx.extensions.length, warnings: await ctx.warnings() };
  } catch (error) {
    // What only the engine can see: a cycle, an alias to a token that does not exist, a rule the closed language lacks.
    return { id: read.id, chain, valid: false, problems: [error.message, ...(error.details?.problems ?? [])] };
  }
}
