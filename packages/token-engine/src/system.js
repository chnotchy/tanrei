// Design systems as layers. A system is the vocabulary's defaults with a chain of
// layer files applied on top: root ← preset ← product. A layer changes VALUES, and may EXTEND the vocabulary
// under `vocabulary` (vocabulary.js); an extension then takes operations like any core token.
//
// Per-token operations in a layer's `tokens` map:
//   { "$value": <literal>, "reason": "…" }   pin a fixed value (exempt from dials); typography may pin single fields
//   { "$value": "{other.token}" }            re-point the alias
//   { "derive": <rule> }                     replace the rule
//   { "scale": n }                           n × whatever was inherited, without restating it (still dial-driven)
import { SystemError } from './errors.js';
import { DERIVE, ENUM, evaluateNumeric, ruleDependencies, walkTokens } from './rules.js';
import { expandStateVocabulary, isColorRule } from './states.js';
import { collectVocabulary, materializeVocabulary } from './vocabulary.js';

/** The vocabulary's namespace when a caller does not pass one. Tools that have tanrei.config.json pass `CONFIG.namespace`. */
export const DEFAULT_NAMESPACE = 'tanrei';
const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);
const refId = (v) => v.slice(1, -1);
const clone = (v) => JSON.parse(JSON.stringify(v));

export { SystemError };

/**
 * Merge a chain of layers, root first. Later layers win; `scale` composes with an inherited `scale`.
 * @param {object[]} layers
 * @param {{ namespace?: string }} [options] the vocabulary's namespace (tanrei.config.json); it travels on the merged
 *   system, so everything that takes the system afterwards uses the same one.
 */
export function mergeLayers(layers, { namespace = DEFAULT_NAMESPACE } = {}) {
  const SYS_COLOR = `${namespace}.sys.color.`;
  const merged = { id: layers.at(-1).id, namespace, name: layers.at(-1).name, specVersion: layers[0].specVersion, palettes: {}, tokens: {}, rules: [], chain: layers.map((l) => l.id), vocabulary: collectVocabulary(layers, { namespace }), notices: [] };
  for (const layer of layers) {
    // A declared color role is valued by the palette engine, which reads operations: its inline definition becomes one.
    for (const [id, decl] of Object.entries(merged.vocabulary)) {
      if (decl.declaredBy === layer.id && decl.kind === 'token' && id.startsWith(SYS_COLOR)) merged.tokens[id] = { ...clone(decl.definition), layer: layer.id };
    }
    if (layer.specVersion) merged.specVersion = layer.specVersion;
    for (const [name, declaration] of Object.entries(layer.palettes ?? {})) {
      if (declaration === null) delete merged.palettes[name]; // drop an inherited palette
      else merged.palettes[name] = clone(declaration);
    }
    merged.rules.push(...clone(layer.rules ?? []).map((rule) => ({ ...rule, layer: undefined })));
    for (const [id, op] of Object.entries(layer.tokens ?? {})) {
      const previous = merged.tokens[id];
      const replaces = '$value' in op || 'derive' in op;
      // `scale` composes down the chain. It is a number, or — for a text style — a map of field → number; a bare
      // number on a text style means its fontSize, so the two forms multiply field by field.
      const inherited = replaces ? 1 : (previous?.scale ?? 1);
      const own = op.scale ?? 1;
      let scale;
      if (typeof inherited === 'number' && typeof own === 'number') scale = inherited * own;
      else {
        const fields = (v) => (typeof v === 'number' ? { fontSize: v } : v);
        const [x, y] = [fields(inherited), fields(own)];
        scale = Object.fromEntries([...new Set([...Object.keys(x), ...Object.keys(y)])].map((field) => [field, (x[field] ?? 1) * (y[field] ?? 1)]));
      }
      merged.tokens[id] = { ...(replaces ? {} : previous), ...clone(op), ...(scale !== 1 ? { scale } : {}), layer: layer.id };
      if (scale === 1) delete merged.tokens[id].scale;
    }
  }
  return merged;
}

function scaleRule(rule, factor, id) {
  if (!rule || 'fixed' in rule) throw new SystemError(`${id}: cannot scale a fixed value — set "$value" instead`);
  if (rule.fn === 'mul') return { ...rule, by: rule.by * factor };
  throw new SystemError(`${id}: "scale" is supported on "mul" rules and aliases, not on "${rule.fn}"`);
}

/**
 * Where an operation's value ends up when it is not written into the vocabulary's documents: the generated color
 * documents of the system. Null for every other operation — `resolveNumericTokens` applies those to the documents.
 * @returns {'roles'|'states'|'colors'|null}
 */
function generatedFrom(id, op, type, { namespace, stateIds }) {
  if (id.startsWith(`${namespace}.sys.color.`)) return 'roles'; // color roles are resolved by the palette engine
  if (stateIds.has(id)) return 'states'; // per-state tokens are valued by generateStateDocument
  // A resting component color valued by a color rule is valued per scheme by generateStateDocument, as a state token
  // is: the rule's result differs between schemes, and the documents are the same in all six. The authored value
  // stays there as what the rule replaced; the resolver reads the scheme's documents after the components', so the
  // generated value is the one in force.
  if (type === 'color' && id.startsWith(`${namespace}.comp.`) && isColorRule(op)) return 'colors';
  return null;
}

/** The group at `segments` of a document — not a token — or undefined. */
function groupOf(doc, segments) {
  let node = doc;
  for (const key of segments) {
    node = node?.[key];
    if (!node || typeof node !== 'object' || '$value' in node) return undefined;
  }
  return node;
}

const stateIdsOf = (documents) => new Set(expandStateVocabulary(Object.entries(documents).filter(([name]) => name.startsWith('comp/')).map(([, doc]) => doc)).map((v) => v.id));

/**
 * What the root layer writes and the default system cannot take.
 *
 * The default system is the vocabulary's documents as they are written, plus what is generated from the root layer:
 * its color roles, its per-state component tokens and the component colors a color rule values. A line in the root
 * layer for any other token — a choice of kind, a dial, a size, an alias — has no document of the default system to
 * land in, while every system that extends the root would take it: the default and its presets would part without a
 * word. So such a line is a problem, and the message says where the default system's value is set. A declaration
 * under "vocabulary" that is not a color role parts them the same way, and is a problem the same way.
 * @param {Record<string, object>} sources relative file name → DTCG document (the vocabulary with its defaults)
 * @param {object} layer the root layer, as authored
 * @param {{ namespace?: string, sourceDir?: string }} [options] `sourceDir` is what the file names are relative to, for the message
 * @returns {string[]} one problem per line that cannot be taken: the lines under "tokens" in the layer's order, then its declarations
 */
export function rootLayerProblems(sources, layer, { namespace = DEFAULT_NAMESPACE, sourceDir = 'tokens/' } = {}) {
  const index = new Map();
  for (const [file, doc] of Object.entries(sources)) for (const entry of walkTokens(doc)) index.set(entry.id, { ...entry, file });
  const stateIds = stateIdsOf(sources);
  const problems = [];
  for (const [id, op] of Object.entries(layer.tokens ?? {})) {
    const entry = index.get(id);
    // A token nobody declared is refused when the layer is resolved, as for any layer.
    if (!entry || generatedFrom(id, op, entry.type, { namespace, stateIds })) continue;
    const names = entry.token.$extensions?.[ENUM]?.values;
    const written = names && Number.isInteger(entry.token.$value) ? `"${names[entry.token.$value]}"` : JSON.stringify(entry.token.$value);
    problems.push(`${id}: the root layer "${layer.id}" cannot set this token. The default system's value of it is the one written in ${sourceDir}${entry.file} (${written}): change it there. The root layer sets what is generated from it — color roles, per-state component tokens, and component colors valued by a color rule; a line for any other token would reach every system that extends "${layer.id}" and never the default system itself.`);
  }
  // The other door: a declaration under
  // "vocabulary" is materialised into the documents of a system built from a layer chain, and the default system is
  // not built from one. A color role is the exception — the palette engine values it into the generated documents.
  for (const [id, decl] of Object.entries(layer.vocabulary ?? {})) {
    const segments = id.split('.');
    const cloned = decl !== null && typeof decl === 'object' && 'from' in decl;
    if (!cloned && id.startsWith(`${namespace}.sys.color.`)) continue;
    // What the declaration would join: the component of an axis value, the series of a step.
    const parent = segments.slice(0, cloned && segments[1] !== 'sys' ? -2 : -1);
    const home = Object.keys(sources).find((file) => groupOf(sources[file], parent));
    const where = home ? `${sourceDir}${home}` : `a document under ${sourceDir}`;
    problems.push(`${id}: the root layer "${layer.id}" cannot declare this token under "vocabulary". The default system's vocabulary is the documents under ${sourceDir} as they are written: a new core token is written in ${where}, with its one-product rationale. An extension belongs to a layer that extends "${layer.id}"; declared here it would reach every such system and never the default system itself. Only a color role is the root layer's to declare — it is valued into the generated documents.`);
  }
  return problems;
}

/**
 * Apply merged layer operations to cloned source documents and evaluate every rule.
 * @param {Record<string, object>} sources  relative file name → DTCG document (the vocabulary with its defaults)
 * @param {ReturnType<typeof mergeLayers>} system
 * @returns {Record<string, object>} the same file names, fully valued for this system
 */
export function resolveNumericTokens(sources, system) {
  const NS = system.namespace ?? DEFAULT_NAMESPACE;
  const SYS_COLOR = `${NS}.sys.color.`;
  // Color roles and palette tones are produced by the palette engine, not by these documents.
  const isColorRef = (id) => id.startsWith(SYS_COLOR) || id.startsWith(`${NS}.ref.palette.`) || id.startsWith(`${NS}.ref.alpha.`);
  const docs = Object.fromEntries(Object.entries(sources).map(([name, doc]) => [name, clone(doc)]));
  // The merged system is what a reader (explain_token, Theme Studio) shows as authored: the operations are applied
  // from a copy, so a choice written by name stays a name there, and a declaration core has since adopted does not
  // grow an entry under `tokens`. Only `notices` is written back — it is an output of this step.
  const work = { ...system, tokens: clone(system.tokens) };
  // Extensions become ordinary tokens here, before anything indexes the documents.
  system.notices = materializeVocabulary(docs, work);
  const index = new Map();
  for (const doc of Object.values(docs)) for (const entry of walkTokens(doc)) index.set(entry.id, entry);
  const stateIds = stateIdsOf(docs);

  for (const [id, op] of Object.entries(work.tokens)) {
    const entry = index.get(id);
    const generated = generatedFrom(id, op, entry?.type, { namespace: NS, stateIds });
    if (generated === 'roles' || generated === 'states') continue;
    if (!entry) throw new SystemError(`${id}: unknown token (layer "${op.layer}"). To add it, declare it under "vocabulary" with a rationale.`);
    if (op.$type && op.$type !== entry.type) throw new SystemError(`${id}: a layer cannot change $type (${entry.type} → ${op.$type})`);
    if (generated) continue;
    const token = entry.token;
    const ext = (token.$extensions ??= {});

    // A choice of kind: the value is one of the token's NAMES. A layer writes the name or its index; the
    // documents keep the index, because DTCG has no string type.
    const names = ext[ENUM]?.values;
    if (names) {
      if ('scale' in op || 'derive' in op) throw new SystemError(`${id}: a choice of kind is neither scaled nor derived. Choose one of its names: { "$value": "${names[1] ?? names[0]}", "reason": "…" } (${names.join(' | ')}).`);
      if ('$value' in op && !isRef(op.$value)) {
        const index = typeof op.$value === 'string' ? names.indexOf(op.$value) : op.$value;
        if (!Number.isInteger(index) || index < 0 || index >= names.length) throw new SystemError(`${id}: ${JSON.stringify(op.$value)} is not one of its choices (layer "${op.layer}"). Allowed: ${names.map((name, i) => `"${name}" (${i})`).join(', ')}. The list is part of the vocabulary; a layer chooses among the names, it does not add one.`);
        op.$value = index; // on the copy: the merged system keeps the name the layer wrote
      }
    }

    if ('$value' in op) {
      if (isRef(op.$value)) {
        if (!index.has(refId(op.$value)) && !isColorRef(refId(op.$value))) throw new SystemError(`${id}: alias target ${op.$value} does not exist`);
        token.$value = op.$value;
        delete ext[DERIVE];
      } else {
        if (typeof op.reason !== 'string' || op.reason.length < 8) throw new SystemError(`${id}: pinning a fixed value needs a "reason"`);
        if (entry.type === 'typography' && typeof op.$value === 'object') {
          // Pin only the named fields; the others keep following their rules.
          const rule = clone(ext[DERIVE] ?? {});
          for (const field of Object.keys(op.$value)) delete rule[field];
          token.$value = { ...token.$value, ...op.$value };
          ext[DERIVE] = Object.keys(rule).length ? { ...rule, pinned: { fields: Object.keys(op.$value), reason: op.reason } } : { fixed: op.reason };
        } else {
          token.$value = op.$value;
          ext[DERIVE] = { fixed: op.reason };
        }
      }
    }
    if ('derive' in op) {
      const pinned = ext[DERIVE]?.pinned;
      // A rule replaces an alias: the token is computed from now on, not pointed at something.
      if (isRef(token.$value) && entry.type !== 'typography') token.$value = null;
      ext[DERIVE] = clone(op.derive);
      if (pinned) for (const field of pinned.fields) delete ext[DERIVE][field]; // a pinned field stays pinned
      if (pinned) ext[DERIVE].pinned = pinned;
    }
    if ('scale' in op) {
      const factors = typeof op.scale === 'number' ? null : op.scale;
      // A token that POINTS AT a text style has nothing of its own to multiply.
      if (isRef(token.$value) && entry.type === 'typography') throw new SystemError(`${id}: "scale" does not apply to an alias of a text style. Re-point it to another text style, or scale ${token.$value} itself.`);
      if (isRef(token.$value)) {
        ext[DERIVE] = { fn: 'mul', of: token.$value, by: op.scale };
        token.$value = null; // computed below
      } else if (entry.type === 'typography') {
        const rule = ext[DERIVE];
        const f = factors ?? { fontSize: op.scale };
        for (const [field, n] of Object.entries(f)) rule[field] = scaleRule(rule[field], n, `${id}.${field}`);
      } else {
        ext[DERIVE] = scaleRule(ext[DERIVE], op.scale, id);
      }
    }
  }

  // An extension must end up with a value: inline in its declaration, or from an operation above.
  for (const [id, { token }] of index) if (token.$value === null && !token.$extensions?.[DERIVE]) throw new SystemError(`${id}: declared under "vocabulary" but never given a value — add "$value" or "derive" to the declaration, or an entry under "tokens"`);

  // Evaluate in dependency order (memoized depth-first, with cycle detection).
  const state = new Map(); // id → 'visiting' | 'done'
  const resolve = (id, trail = []) => {
    if (isColorRef(id)) return { color: id };
    const entry = index.get(id);
    if (!entry) throw new SystemError(`${trail.at(-1) ?? '?'}: references unknown token {${id}}`);
    // The core never depends on a layer's own namespace; the other direction is the point of having one.
    if (trail.length && trail.at(-1).startsWith(`${NS}.`) && !id.startsWith(`${NS}.`)) throw new SystemError(`${trail.at(-1)}: a ${NS}.* token cannot reference {${id}}, a token in a layer's own namespace`);
    if (state.get(id) === 'visiting') throw new SystemError(`cycle: ${[...trail, id].join(' → ')}`);
    const { token, type } = entry;
    if (state.get(id) !== 'done') {
      state.set(id, 'visiting');
      const rule = token.$extensions?.[DERIVE];
      const lookup = (dep) => resolve(dep, [...trail, id]);
      if (isRef(token.$value)) resolve(refId(token.$value), [...trail, id]);
      else if (rule && !('fixed' in rule)) {
        if (type === 'typography') {
          // A text style's rules value single fields; the style itself must already be there to write into.
          if (!token.$value || typeof token.$value !== 'object') throw new SystemError(`${id}: a text style's "derive" values its fontSize and letterSpacing, and this one has no style to write them into (${JSON.stringify(token.$value)}). Give it "$value" with the whole style — fontFamily, fontSize, fontWeight, letterSpacing, lineHeight — and keep "derive" for the fields that follow the dials.`);
          if (rule.fontSize) token.$value.fontSize = evaluateNumeric(rule.fontSize, lookup, { type: 'dimension' });
          if (rule.letterSpacing) token.$value.letterSpacing = evaluateNumeric(rule.letterSpacing, lookup, { type: 'dimension', fontSize: token.$value.fontSize.value });
        } else {
          const result = evaluateNumeric(rule, lookup, { type });
          token.$value = type === 'number' ? result.value : result;
        }
      }
      state.set(id, 'done');
    }
    const v = isRef(token.$value) ? resolve(refId(token.$value), [...trail, id]) : token.$value;
    return typeof v === 'number' ? { value: v } : v;
  };
  for (const id of index.keys()) resolve(id);
  // Touch ruleDependencies so unknown references inside unused fields still surface.
  for (const [id, { token }] of index) for (const dep of ruleDependencies(token.$extensions?.[DERIVE])) if (!index.has(dep) && !isColorRef(dep)) throw new SystemError(`${id}: rule references unknown token {${dep}}`);
  return docs;
}

