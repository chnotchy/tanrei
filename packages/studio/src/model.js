// A system's DTCG documents → the platform-neutral model every emitter and the invariants consume.
//
// `tanrei build` gets this model by reading the bundle back through a DTCG resolver (tokens-build/src/model.js,
// which needs the filesystem). The Studio has the same documents in memory, so it resolves them here: inherited
// `$type`, alias chains, partial aliases inside composite values. `test/parity.test.js` requires the CSS emitted
// from this model to equal the build's, declaration by declaration, for whole systems.
import { DERIVE, LLM, SCHEMES, VOCABULARY } from '@tanrei/token-engine';

const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);
const refId = (v) => v.slice(1, -1);
const AXES = 'dev.tanrei.axes';
const STATES = 'dev.tanrei.states';
const SHARED = 'dev.tanrei.shared';

/** Leaf tokens of a document with what they inherit from their groups: `$type` and the usage guidance. */
function* walk(node, path = [], inherited = {}, groups) {
  if (node.$extensions?.[LLM]) groups?.set(path.join('.'), node.$extensions[LLM]);
  const here = { type: node.$type ?? inherited.type, llm: node.$extensions?.[LLM] ?? inherited.llm, rationale: node.$extensions?.[VOCABULARY]?.rationale ?? inherited.rationale };
  if ('$value' in node) {
    yield { id: path.join('.'), token: node, ...here };
    return;
  }
  for (const [key, child] of Object.entries(node)) if (!key.startsWith('$') && child && typeof child === 'object') yield* walk(child, [...path, key], here, groups);
}

/** Document names in the order the resolver applies them for one scheme; a layer's own documents come last. */
function documentOrder(files, resolver, scheme) {
  const names = [];
  for (const { $ref } of resolver.resolutionOrder) {
    const [, kind, name] = $ref.split('/').slice(0); // '#', 'sets' | 'modifiers', name
    const sources = kind === 'sets' ? resolver.sets[name].sources : resolver.modifiers[name].contexts[scheme];
    names.push(...sources.map((source) => source.$ref));
  }
  names.push(...Object.keys(files).filter((file) => file.startsWith('ext/')).sort());
  return names.filter((file) => files[file]);
}

/** @param {(name: string) => object[]} entriesOf walked tokens of one document, cached across schemes */
function resolveScheme(files, resolver, scheme, entriesOf, only) {
  const raw = new Map();
  for (const name of documentOrder(files, resolver, scheme)) for (const entry of entriesOf(name)) raw.set(entry.id, entry);

  const chainOf = (id, trail = []) => {
    const entry = raw.get(id);
    if (!entry) throw new Error(`${trail.at(-1) ?? '?'}: references unknown token {${id}}`);
    if (trail.includes(id)) throw new Error(`cycle: ${[...trail, id].join(' → ')}`);
    return isRef(entry.token.$value) ? [id, ...chainOf(refId(entry.token.$value), [...trail, id])] : [id];
  };
  /** A composite value with its inner references resolved, and where they pointed. */
  const deep = (value, id) => {
    if (isRef(value)) {
      const end = chainOf(refId(value), [id]).at(-1);
      return { value: deep(raw.get(end).token.$value, end).value, alias: refId(value) };
    }
    if (Array.isArray(value)) {
      const items = value.map((item) => deep(item, id));
      return { value: items.map((item) => item.value), partial: items.some((item) => item.alias || item.partial) ? items.map((item) => item.alias ?? item.partial) : undefined };
    }
    if (value && typeof value === 'object' && !('colorSpace' in value) && !('unit' in value)) {
      const fields = Object.entries(value).map(([key, field]) => [key, deep(field, id)]);
      const partial = fields.filter(([, field]) => field.alias || field.partial).map(([key, field]) => [key, field.alias ?? field.partial]);
      return { value: Object.fromEntries(fields.map(([key, field]) => [key, field.value])), partial: partial.length ? Object.fromEntries(partial) : undefined };
    }
    return { value };
  };

  const tokens = {};
  for (const [id, { token, type, llm, rationale }] of raw) {
    if (only && type !== only && !isRef(token.$value)) continue;
    const chain = chainOf(id);
    const end = raw.get(chain.at(-1));
    const resolved = deep(end.token.$value, chain.at(-1));
    let value = resolved.value;
    const finalType = type ?? end.type;
    if (only && finalType !== only) continue;
    if (finalType === 'fontFamily' && typeof value === 'string') value = [value];
    if (finalType === 'shadow' && !Array.isArray(value)) value = [value];
    if (finalType === 'typography' && typeof value?.fontFamily === 'string') value = { ...value, fontFamily: [value.fontFamily] };
    tokens[id] = {
      id,
      path: id.split('.').slice(1),
      namespace: id.split('.')[0],
      vocabulary: token.$extensions?.[VOCABULARY],
      type: finalType,
      value,
      description: token.$description,
      deprecated: token.$deprecated || undefined,
      alias: chain[1],
      aliasFinal: chain.length > 1 ? chain.at(-1) : undefined,
      partialAlias: chain.length > 1 ? undefined : finalType === 'shadow' && resolved.partial && !Array.isArray(end.token.$value) ? [resolved.partial] : resolved.partial,
      derive: token.$extensions?.[DERIVE],
      state: token.$extensions?.['dev.tanrei.state'],
      // A choice of kind: `value` is an index into `enum.values`.
      enum: token.$extensions?.['dev.tanrei.enum'],
      // Not part of the build's model: what a tool shows next to a token.
      llm,
      rationale,
    };
  }
  return tokens;
}

/**
 * What each component declares about itself: its axes (with values a layer added) and its states. A component that
 * declares no axis and reads a set of tokens that is no component's (`dev.tanrei.shared`: the input
 * box) is declared all the same, with no axis: its sizes and looks are the set's, and it still has tokens of its own.
 */
function componentDeclarations(files, namespace) {
  const out = {};
  const groups = Object.entries(files).filter(([name]) => name.startsWith('comp/')).flatMap(([, doc]) => Object.entries(doc[namespace]?.comp ?? {}));
  const readers = new Set(groups.flatMap(([, group]) => group.$extensions?.[SHARED]?.readers ?? []));
  for (const [component, group] of groups) {
    const axes = group.$extensions?.[AXES];
    if (axes) out[component] = { axes, states: group.$extensions[STATES] };
    else if (readers.has(component)) out[component] = { axes: {} };
  }
  return out;
}

/** The sets of tokens that are no component's, each with the components that read it: `{ 'input-box': ['text-input', …] }`. */
function sharedSets(files, namespace) {
  const out = {};
  for (const [name, doc] of Object.entries(files)) {
    if (!name.startsWith('comp/')) continue;
    for (const [set, group] of Object.entries(doc[namespace]?.comp ?? {})) if (group.$extensions?.[SHARED]?.readers) out[set] = group.$extensions[SHARED].readers;
  }
  return out;
}

/**
 * @param {Record<string, object>} files   a system's documents, keyed as in its bundle (`sys/space.tokens.json`, `generated/…`)
 * @param {{ id: string, namespace: string, resolver: object }} options  `resolver` = tokens/tanrei.resolver.json
 */
export function buildModel(files, { id, namespace, resolver }) {
  const color = `${namespace}.sys.color.`;
  const walked = new Map();
  const guidance = new Map(); // group path → usage guidance, for tokens generated outside their group's document (states)
  const entriesOf = (name) => walked.get(name) ?? walked.set(name, [...walk(files[name], [], {}, guidance)]).get(name);
  // Only colors differ between schemes: the first scheme is resolved whole, the others for their colors.
  const perScheme = Object.fromEntries(SCHEMES.map((scheme, i) => [scheme, resolveScheme(files, resolver, scheme, entriesOf, i === 0 ? undefined : 'color')]));
  const colors = {};
  const componentColors = {};
  for (const scheme of SCHEMES) {
    colors[scheme] = {};
    componentColors[scheme] = {};
    for (const [tokenId, token] of Object.entries(perScheme[scheme])) {
      if (tokenId.startsWith(color)) colors[scheme][tokenId.slice(color.length)] = token;
      else if (token.type === 'color' && token.path[0] === 'comp') componentColors[scheme][tokenId] = token;
    }
  }
  for (const token of Object.values(perScheme[SCHEMES[0]])) {
    for (let depth = token.path.length; !token.llm && depth > 0; depth -= 1) token.llm = guidance.get([token.namespace, ...token.path.slice(0, depth)].join('.'));
  }
  return { system: id, schemes: SCHEMES, tokens: perScheme[SCHEMES[0]], colors, componentColors, components: componentDeclarations(files, namespace), shared: sharedSets(files, namespace), perScheme };
}
