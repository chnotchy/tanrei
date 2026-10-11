// The pipeline's reader of a DTCG bundle: resolver document + token documents → the tokens of each scheme.
//
// A general DTCG parser, run once per scheme, merges every scheme, prints it, parses it into a syntax tree with a
// location on every node, and keeps it — about a gigabyte for one system of 8,500 tokens, and nine tenths of the time
// of a build. This reader does the same reading — the same merge in the same order, the same inheritance of `$type` and `$deprecated`, the same
// alias chains, the same normal forms — on the documents as they already are in memory, and KEEPS NOTHING TWICE:
//
//   - a token's `$extensions`, its authored node (`originalValue`) and a value nobody had to change are the
//     bundle's own objects, never copies;
//   - what the schemes have in common is merged once, and a scheme's documents are laid over it without copying it;
//   - a normal form (a color with its alpha, a shadow as a list) is made once per value, whatever reads it;
//   - ids are made once per system, and a token that comes out the same in two schemes is one object.
//
// `test/reader.test.js` holds it to the general parser, token by token and field by field, for every scheme of
// every shipped system: the parser is the oracle, this is what runs.
//
// It reads what Tanrei writes. Where a document uses a DTCG feature the bundles never use (`$ref`, `$extends`,
// `$root`, a color as a string) it stops with a message, rather than read it differently from a general parser.
//
// No file access, no dependency: it runs wherever the documents are.

/** Why a bundle cannot be read: an alias that leads nowhere, a cycle, a type that does not fit. */
export class TokenReadError extends Error {}

const collator = new Intl.Collator('en-us', { numeric: true });
const ALIAS = /^\{([^}]+)\}$/;
const isAlias = (value) => typeof value === 'string' && ALIAS.test(value);
const isObject = (value) => value !== null && typeof value === 'object';

const DTCG_TYPES = new Set(['color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number', 'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography']);

// The type an alias INSIDE a composite value must lead to, by the composite's type and the key it stands at.
const NESTED = {
  border: { color: ['color'], stroke: ['strokeStyle'], width: ['dimension'] },
  gradient: { color: ['color'], position: ['number'] },
  shadow: { color: ['color'], offsetX: ['dimension'], offsetY: ['dimension'], blur: ['dimension'], spread: ['dimension'], inset: ['boolean'] },
  strokeStyle: { dashArray: ['dimension'] },
  transition: { duration: ['duration'], delay: ['duration'], timingFunction: ['cubicBezier'] },
  typography: { fontFamily: ['fontFamily'], fontWeight: ['fontWeight'], fontSize: ['dimension'], lineHeight: ['dimension', 'number'], letterSpacing: ['dimension'], paragraphSpacing: ['dimension', 'string'], wordSpacing: ['dimension', 'string'] },
};

const FONT_WEIGHTS = {
  thin: 100, hairline: 100, 'extra-light': 200, 'ultra-light': 200, light: 300, normal: 400, regular: 400, book: 400, medium: 500,
  'semi-bold': 600, 'demi-bold': 600, bold: 700, 'extra-bold': 800, 'ultra-bold': 800, black: 900, heavy: 900, 'extra-black': 950, 'ultra-black': 950,
};

// ── Merging documents ─────────────────────────────────────────────────────
// `over` laid on `under`, as a resolver merges its sources: groups and token nodes merge key by key, a list replaces
// a list, anything else replaces. Nothing is changed in place: a subtree only one side has is that side's own object.
function merge(under, over) {
  if (under === undefined || !isObject(over) || Array.isArray(over)) return over;
  if (under === null) return null; // what a destructive merge into null leaves
  if (typeof under !== 'object') return over;
  const out = Array.isArray(under) ? [...under] : { ...under };
  for (const key of Object.keys(over)) out[key] = Object.hasOwn(under, key) ? merge(under[key], over[key]) : over[key];
  return out;
}

const GROUP_KEYS = new Set(['$type', '$description', '$deprecated', '$extensions', '$value', '$schema']);

// A composite value with its fields followed, per authored value: [{ type, ends, value }] — see `literal`.
const resolvedForms = new WeakMap();

// ── Normal forms ──────────────────────────────────────────────────────────
// One per value object and type, so every token and every scheme that ends at a value shares its normal form.
const normalForms = new WeakMap();

function normalColor(value, id) {
  if (typeof value === 'string' && !isAlias(value)) throw new TokenReadError(`${id}: a color written as a string ("${value}") is not read; write it in the object notation`);
  if (!isObject(value) || value.alpha !== undefined) return value;
  return normalForm(value, 'color', () => ({ ...value, alpha: 1 }));
}

function normalForm(value, type, make) {
  let forms = normalForms.get(value);
  if (!forms) normalForms.set(value, (forms = new Map()));
  if (!forms.has(type)) forms.set(type, make());
  return forms.get(type);
}

const fontFamily = (value) => (typeof value === 'string' ? [value] : value);
const fontWeight = (value) => (typeof value === 'string' && FONT_WEIGHTS[value]) || value;

/** A changed copy only where something changes; the value itself otherwise. */
function withFields(value, changes) {
  let out = value;
  for (const [key, next] of changes) {
    if (next === value[key] && key in value) continue;
    if (out === value) out = Array.isArray(value) ? [...value] : { ...value };
    out[key] = next;
  }
  return out;
}

function normalize(value, type, id) {
  switch (type) {
    case 'color':
      return normalColor(value, id);
    case 'fontFamily':
      return fontFamily(value);
    case 'fontWeight':
      return fontWeight(value);
    case 'border':
      return isObject(value) && value.color ? normalForm(value, type, () => withFields(value, [['color', normalColor(value.color, id)]])) : value;
    case 'shadow': {
      const layer = (shadow) => (isObject(shadow) ? withFields(shadow, [...(shadow.color ? [['color', normalColor(shadow.color, id)]] : []), ...('inset' in shadow ? [] : [['inset', false]])]) : shadow);
      if (!isObject(value)) return [value];
      return normalForm(value, type, () => (Array.isArray(value) ? withFields(value, value.map((shadow, i) => [i, layer(shadow)])) : [layer(value)]));
    }
    case 'gradient':
      if (!Array.isArray(value)) return value;
      return normalForm(value, type, () => withFields(value, value.map((stop, i) => [i, isObject(stop) && stop.color ? withFields(stop, [['color', normalColor(stop.color, id)]]) : stop])));
    case 'transition':
      if (!isObject(value)) return value;
      return normalForm(value, type, () => withFields(value, [...(value.duration ? [] : [['duration', { value: 0, unit: 'ms' }]]), ...(value.delay ? [] : [['delay', { value: 0, unit: 'ms' }]]), ...(value.timingFunction ? [] : [['timingFunction', [0, 0, 1, 1]]])]));
    case 'typography':
      if (!isObject(value)) return value;
      return normalForm(value, type, () => withFields(value, [...('fontFamily' in value ? [['fontFamily', fontFamily(value.fontFamily)]] : []), ...('fontWeight' in value ? [['fontWeight', fontWeight(value.fontWeight)]] : [])]));
    default:
      return value;
  }
}

// ── Names ─────────────────────────────────────────────────────────────────
// One node per path of a system: the id, the JSON pointer and the reference of a token are made once, for every
// scheme, and a list of ids is a list of these strings.
const pointerPart = (part) => part.replaceAll('~', '~0').replaceAll('/', '~1');
class Name {
  constructor(parent, key) {
    this.id = parent ? (parent.id ? `${parent.id}.${key}` : key) : '';
    this.jsonID = parent ? `${parent.jsonID === '#/' ? '#' : parent.jsonID}/${pointerPart(key)}` : '#/';
    this.children = undefined;
    this.reference = undefined;
    this.rank = undefined;
  }
  child(key) {
    let child = (this.children ??= new Map()).get(key);
    if (!child) this.children.set(key, (child = new Name(this, key)));
    return child;
  }
  /** The reference a dependency is written as: the pointer of the token's value. */
  get ref() {
    return (this.reference ??= `${this.jsonID}/$value`);
  }
}

const SCALARS = ['$type', '$description', '$deprecated', '$value', '$extensions', 'aliasOf', 'originalValue'];
const LISTS = ['aliasChain', 'aliasedBy', 'dependencies'];
const sameList = (a, b) => a === b || (a !== undefined && b !== undefined && a.length === b.length && a.every((item, i) => item === b[i]));
const sameShape = (a, b) => a === b || (isObject(a) && isObject(b) && Array.isArray(a) === Array.isArray(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => key in b && sameShape(a[key], b[key])));

/**
 * @typedef {object} ReadToken  One token of one scheme. Read-only: its values are shared with the bundle, with other
 *   tokens and with other schemes.
 * @property {string} id
 * @property {string} [$type]         its own, its group's, or the type at the end of its alias chain
 * @property {string} [$description]
 * @property {*} [$deprecated]        its own or its group's
 * @property {*} $value               resolved, in normal form (a color has `alpha`, a shadow is a list, …)
 * @property {object} [$extensions]
 * @property {string[]} [aliasChain]  when the whole value is an alias: every id on the way, the nearest first
 * @property {string} [aliasOf]       the end of that chain
 * @property {object|Array} [partialAliasOf]  where the fields of a composite value point, in the value's own shape
 * @property {string[]} [aliasedBy]   every token that reaches this one through an alias, whole or partial
 * @property {string[]} [dependencies] every value this one reaches, as JSON pointers
 * @property {object} originalValue   the token as authored, after the documents are merged
 * @property {string} jsonID          its JSON pointer
 */

/**
 * Read a bundle.
 * @param {Record<string, object>} files  path relative to the bundle root → document, the resolver document among them
 * @param {string} systemId               the bundle's resolver document is `<systemId>.resolver.json`
 * @returns {{ schemes: string[], defaultScheme: string, tokens: (scheme?: string) => Record<string, ReadToken>, apply: (input?: { scheme?: string }) => Record<string, ReadToken> }}
 * @throws {TokenReadError}
 */
export function readBundle(files, systemId) {
  const name = `${systemId}.resolver.json`;
  const resolver = files[name];
  if (!resolver) throw new Error(`the bundle has no ${name}`);

  const documentOf = (source, where) => {
    if (typeof source?.$ref !== 'string') return source; // a document written in place
    if (source.$ref.startsWith('#')) throw new TokenReadError(`${name} ${where}: a source that points into the resolver document ("${source.$ref}") is not read`);
    const doc = files[source.$ref];
    if (!doc) throw new Error(`the bundle has no ${source.$ref}`);
    return doc;
  };
  const steps = (resolver.resolutionOrder ?? []).map(({ $ref }, i) => {
    const [, kind, key] = /^#\/(sets|modifiers)\/(.+)$/.exec($ref ?? '') ?? [];
    const item = kind && resolver[kind]?.[key];
    if (!item) throw new TokenReadError(`${name} resolutionOrder[${i}]: "${$ref}" names no set and no modifier of this document`);
    return kind === 'sets' ? { set: key, sources: item.sources ?? [] } : { modifier: key, contexts: item.contexts ?? {}, default: typeof item.default === 'string' ? item.default : Object.keys(item.contexts ?? {})[0] };
  });
  const modifiers = steps.filter((step) => step.modifier);
  const schemeModifier = modifiers.find((step) => step.modifier === 'scheme');
  const mergeSources = (tree, sources, where) => sources.reduce((acc, source) => merge(acc, documentOf(source, where)), tree);

  // What every scheme starts from: the sets before the first modifier, merged once.
  const firstModifier = steps.findIndex((step) => step.modifier);
  const shared = steps.slice(0, firstModifier < 0 ? steps.length : firstModifier);
  let common;
  const treeOf = (input) => {
    common ??= { tree: shared.reduce((tree, step) => mergeSources(tree, step.sources, `sets.${step.set}`), {}) };
    let tree = common.tree;
    for (const step of steps.slice(shared.length)) {
      if (step.set) tree = mergeSources(tree, step.sources, `sets.${step.set}`);
      else {
        const context = input[step.modifier] ?? step.default;
        if (!step.contexts[context]) throw new TokenReadError(`Modifier ${step.modifier} has no context ${JSON.stringify(context)}.`);
        tree = mergeSources(tree, step.contexts[context], `modifiers.${step.modifier}.contexts.${context}`);
      }
    }
    return tree;
  };

  const root = new Name();
  const canonical = new Map(); // id → the token as each scheme so far read it: a scheme in which it comes out the same shares it
  let sorted; // the order of the last scheme read: the same names in the same document order sort the same way
  const ranked = new Set(); // every name seen; `rank` is a name's place among them, in the order lists of ids are sorted in
  const read = new Map();

  function tokensOf(input) {
    const key = JSON.stringify(modifiers.map((step) => input[step.modifier] ?? step.default));
    if (!read.has(key)) read.set(key, resolveTree(treeOf(input)));
    return read.get(key);
  }

  function resolveTree(tree) {
    // 1. The tokens of the merged document, in document order, with what they inherit from their groups.
    const entries = new Map();
    const walk = (node, at, type, deprecated) => {
      const ownType = node.$type || type;
      const ownDeprecated = node.$deprecated ?? deprecated;
      if (Object.hasOwn(node, '$value')) entries.set(at.id, { name: at, node, type: ownType, deprecated: ownDeprecated, state: 0 });
      for (const key of Object.keys(node)) {
        const child = node[key];
        if (key.charCodeAt(0) === 36 /* $ */) {
          if (!GROUP_KEYS.has(key) && (key === '$ref' || key === '$extends' || key === '$root' || isObject(child))) throw new TokenReadError(`${at.id || '(the document)'}: "${key}" is not read by Tanrei's reader of its own bundles`);
          continue;
        }
        if (isObject(child) && !Array.isArray(child)) walk(child, at.child(key), ownType, ownDeprecated);
      }
    };
    walk(tree, root, undefined, undefined);

    // 2. Aliases. A token's value is the value at the end of its chain; a composite value has its fields resolved.
    const fail = (entry, message) => {
      throw new TokenReadError(`${entry.name.id}: ${message}`);
    };
    // The way from an alias to the value at its end is the same for everyone who names that token: it is walked
    // once, and every token that takes it shares the list of ids and the list of what it depends on.
    const chainOf = (alias, entry) => {
      const target = entries.get(alias.slice(1, -1));
      if (!target) fail(entry, `Could not resolve alias ${alias}.`);
      if (target.way) return target.way;
      if (target.walking) fail(entry, 'Circular alias detected.');
      target.walking = true;
      const links = isAlias(target.node.$value) ? [target, ...chainOf(target.node.$value, entry).links] : [target];
      target.walking = false;
      return (target.way = { links, end: links.at(-1), ids: links.map((link) => link.name.id), refs: links.map((link) => link.name.ref).sort(collator.compare) });
    };
    /** The fields of a value with their aliases followed; `partials` collects where each one pointed. */
    const deep = (value, expected, path, entry, partials) => {
      if (typeof value !== 'string') {
        if (Array.isArray(value)) {
          const inner = expected?.includes('cubicBezier') ? ['number'] : expected;
          return withFields(value, value.flatMap((item, i) => (item ? [[i, deep(item, inner, [...path, i], entry, partials)]] : [])));
        }
        const fields = isObject(value) && expected?.length ? NESTED[expected[0]] : undefined;
        return fields ? withFields(value, Object.keys(value).map((key) => [key, deep(value[key], fields[key], [...path, key], entry, partials)])) : value;
      }
      if (!isAlias(value)) {
        if ((!expected?.[0] || DTCG_TYPES.has(expected[0])) && (value.includes('{') || value.includes('}'))) fail(entry, 'Invalid alias syntax.');
        return value;
      }
      const way = chainOf(value, entry);
      if (expected?.length && !expected.includes(way.end.type)) fail(entry, `Cannot alias to $type "${way.end.type}" from $type "${expected.join(' / ')}".`);
      partials.push({ path, way });
      return literal(way.end).value;
    };
    /** A token whose value is not an alias as a whole: its value with every field resolved. */
    const literal = (entry) => {
      if (entry.state === 2) return entry;
      if (entry.state === 1) fail(entry, 'Circular alias detected.');
      entry.state = 1;
      const raw = entry.node.$value;
      if (isObject(raw) && hasReference(raw)) fail(entry, '"$ref" inside a value is not read by Tanrei\'s reader of its own bundles');
      entry.partials = [];
      entry.value = deep(raw, entry.type ? [entry.type] : undefined, [], entry, entry.partials);
      if (entry.value !== raw) {
        // Fields were followed, so this is a new object — unless the same value, with its fields ending at the same
        // values, was resolved before (another scheme): then it is that one.
        const ends = entry.partials.map((partial) => partial.way.end.value);
        const forms = resolvedForms.get(raw) ?? resolvedForms.set(raw, []).get(raw);
        const known = forms.find((form) => form.type === entry.type && sameList(form.ends, ends));
        if (known) entry.value = known.value;
        else forms.push({ type: entry.type, ends, value: entry.value });
      }
      entry.state = 2;
      return entry;
    };
    for (const entry of entries.values()) {
      const raw = entry.node.$value;
      if (!isAlias(raw)) {
        literal(entry);
        continue;
      }
      entry.walking = true; // an alias that comes back to its own token is a circle
      entry.chain = chainOf(raw, entry);
      entry.walking = false;
      const { end } = entry.chain;
      if (entry.type && entry.type !== end.type) fail(entry, `Cannot alias to $type "${end.type}" from $type "${entry.type}".`);
      entry.type ||= end.type;
      // An alias whose end is 0, false or "" keeps the alias as its value: the general parser's reading, kept so the
      // two agree. (The model puts the value at the end of the chain in its place: `simplifyAll`.)
      entry.value = literal(end).value || raw;
    }

    // 3. The graph: who is reached from where.
    const aliasedBy = new Map();
    const reached = (target, by) => {
      let set = aliasedBy.get(target);
      if (!set) aliasedBy.set(target, (set = new Set()));
      set.add(by);
    };
    for (const entry of entries.values()) {
      for (const { links } of entry.chain ? [entry.chain] : entry.partials.map((partial) => partial.way)) {
        for (let i = 0; i < links.length; i += 1) {
          reached(links[i], entry.name);
          for (let j = 0; j < i; j += 1) reached(links[i], links[j].name);
        }
      }
    }

    // 4. The order of the result: by JSON pointer, as the general parser sorts. The same names in the same order
    // sort the same way, so a scheme that walks like the last one is not sorted again.
    const walked = [...entries.values()];
    if (!sorted || sorted.walked.length !== walked.length || !sorted.walked.every((at, i) => at === walked[i].name)) {
      const order = walked.map((entry) => entry.name).sort((a, b) => collator.compare(a.jsonID, b.jsonID));
      sorted = { walked: walked.map((entry) => entry.name), order };
      if (order.some((at) => at.rank === undefined)) {
        for (const at of order) ranked.add(at);
        [...ranked].sort((a, b) => collator.compare(a.id, b.id)).forEach((at, i) => (at.rank = i));
      }
    }
    const byRank = (a, b) => a.rank - b.rank;

    // 5. The tokens.
    const tokens = {};
    for (const at of sorted.order) {
      const entry = entries.get(at.id);
      const { node } = entry;
      const ways = entry.chain ? undefined : entry.partials.map((partial) => partial.way);
      const token = {
        id: at.id,
        $type: entry.type,
        $description: node.$description || undefined,
        $deprecated: entry.deprecated ?? undefined,
        $value: normalize(entry.value, entry.type, at.id),
        $extensions: node.$extensions || undefined,
        aliasChain: entry.chain?.ids,
        aliasedBy: aliasedBy.has(entry) ? [...aliasedBy.get(entry)].sort(byRank).map((by) => by.id) : undefined,
        aliasOf: entry.chain?.end.name.id,
        partialAliasOf: entry.chain ? undefined : partialAliases(entry),
        dependencies: entry.chain ? entry.chain.refs : ways.length === 1 ? ways[0].refs : ways.length ? [...new Set(ways.flatMap((way) => way.refs))].sort(collator.compare) : undefined,
        originalValue: node,
        jsonID: at.jsonID,
      };
      tokens[at.id] = share(token);
    }
    return tokens;
  }

  /** The token already read under this id when this one is the same; its lists when only they are. */
  function share(token) {
    const known = canonical.get(token.id);
    if (!known) return canonical.set(token.id, [token]), token;
    for (const other of known) {
      if (SCALARS.every((key) => token[key] === other[key]) && LISTS.every((key) => sameList(token[key], other[key])) && sameShape(token.partialAliasOf, other.partialAliasOf)) return other;
    }
    for (const key of LISTS) if (sameList(token[key], known[0][key])) token[key] = known[0][key];
    if (sameShape(token.partialAliasOf, known[0].partialAliasOf)) token.partialAliasOf = known[0].partialAliasOf;
    known.push(token);
    return token;
  }

  const reader = {
    schemes: Object.keys(schemeModifier?.contexts ?? {}),
    defaultScheme: schemeModifier?.default,
    /** The tokens of one scheme, by id. Read on first use, then kept. */
    tokens: (scheme) => tokensOf(scheme === undefined ? {} : { scheme }),
    /** The same, in the words of a DTCG resolver: `apply({ scheme })`. */
    apply: (input = {}) => tokensOf(input),
  };
  return reader;
}

const referenceFree = new WeakSet();
/** Whether a value holds a `$ref` anywhere. Looked for once per value object. */
function hasReference(value) {
  if (referenceFree.has(value)) return false;
  for (const [key, child] of Array.isArray(value) ? value.entries() : Object.entries(value)) {
    if (key === '$ref' || (isObject(child) && hasReference(child))) return true;
  }
  referenceFree.add(value);
  return false;
}

/** Where the fields of a composite value point: the id each alias names, in the shape of the value. */
function partialAliases(entry) {
  const value = entry.value;
  if (!entry.partials.length || !isObject(value)) return undefined;
  const loneShadow = entry.type === 'shadow' && !Array.isArray(value);
  const out = Array.isArray(value) || entry.type === 'shadow' ? [] : {};
  for (const { path, way } of entry.partials) {
    if (!path.length) continue;
    if (loneShadow && !out.length) out.push({});
    let into = loneShadow ? out[0] : out;
    let node = value;
    path.forEach((key, i) => {
      if (isObject(node) && key in node && node[key] !== undefined) node = node[key];
      if (i === path.length - 1) into[key] = way.ids[0];
      if (!(key in into)) into[key] = Array.isArray(node) ? [] : {};
      into = into[key];
    });
  }
  return out;
}
