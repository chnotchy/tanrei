// Extensible vocabulary.
//
// The core vocabulary is what the source documents declare. A layer — preset or product — may EXTEND it
// under `vocabulary`; `tokens` and `rules` then give the extension a value like any core token:
//
//   "tanrei.sys.space.space1200":        { "$type": "dimension", "rationale": "…", "derive": {…} }   a step in a series
//   "tanrei.comp.button.size.3x":        { "from": "large", "scale": 1.5, "rationale": "…" }         a value on a component axis
//   "tanrei.comp.button.variant.danger": { "from": "filled", "rationale": "…" }
//   "acme.comp.rating.star.size":        { "$type": "dimension", "rationale": "…", "derive": {…} }   the layer's own token
//   "tanrei.sys.motion.spring.standard.bouncy": { "from": "default-spatial", "rationale": "…" }      a step that is a GROUP
//       of tokens (a named spring set: damping, stiffness, easing, duration) — cloned whole from a sibling, so it can
//       never be half a spring; single fields are then changed under "tokens" like any token.
//   "tanrei.comp.fab-menu":              { "document": "comp/fab-menu.tokens.json", "rationale": "…" }   the WHOLE
//       vocabulary of a component that lives in this layer: its document, kept next to the layer
//       (`tokens/systems/<layer>/comp/<component>.tokens.json`), and the rules that value its states. A system has it
//       when the layer is in its chain, or when one of its layers includes the component from that layer
//       (`components.include: [{ "name": "fab-menu", "from": "m3-like" }]`): the document's aliases then resolve
//       against that system's own tokens, and none of the holding layer's values come along.
//
// Extensions are MATERIALISED into the documents before anything else looks at them, so the resolver, the
// model, every emitter, the Figma plan, the MCP server and the Studio preview see ordinary tokens.
import { SystemError } from './errors.js';
import { DERIVE, VOCABULARY, walkTokens } from './rules.js';
import { STATES } from './states.js';

export const AXES = 'dev.tanrei.axes';
const KEY = /^[a-z0-9][a-z0-9-]*$/;
const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);
const clone = (v) => JSON.parse(JSON.stringify(v));

// `from` clones: on a component axis it adds a value; in a sys series it adds a step that is a group of tokens.
// `document` names the whole vocabulary of a component that lives in the declaring layer.
const kindOf = (entry, id) => ('document' in entry ? 'component' : !('from' in entry) ? 'token' : id.split('.')[1] === 'sys' ? 'group' : 'axis-value');

/** Where the sources hold the document of a component that lives in a layer, relative to tokens/. */
export const heldDocumentPath = (layerId, component) => `systems/${layerId}/comp/${component}.tokens.json`;
/** Where a system's documents hold a component's vocabulary: the core's components and a layer's alike. */
export const componentDocumentPath = (component) => `comp/${component}.tokens.json`;
/** A source document a layer holds (`systems/…`): only a system that has its component reads it. */
export const isHeldDocument = (name) => name.startsWith('systems/');

/** The component a declaration of a whole component's vocabulary names (`<ns>.comp.<component>`), its shape checked. */
function componentDeclaration(id, entry, layerId, CORE_NS) {
  const segments = id.split('.');
  if (segments[0] !== CORE_NS || segments[1] !== 'comp' || segments.length !== 3) throw new SystemError(`${id}: a component's whole vocabulary is declared as "${CORE_NS}.comp.<component>", in the core namespace, so that the names a product, a stylesheet and the native types use do not depend on where the component lives`);
  const component = segments[2];
  if (entry.document !== componentDocumentPath(component)) throw new SystemError(`${id}: "document" is "${componentDocumentPath(component)}" — the component's document, kept in tokens/systems/${layerId}/`);
  for (const key of ['$type', 'from', 'scale', '$value', 'derive', 'onRole']) if (key in entry) throw new SystemError(`${id}: a component's whole vocabulary is its document; "${key}" belongs to a single token`);
  for (const rule of entry.rules ?? []) {
    if (typeof rule?.match !== 'string' || !rule.match.startsWith(`${CORE_NS}.comp.${component}.`)) throw new SystemError(`${id}: its rules value the component's own states — "match" starts with "${CORE_NS}.comp.${component}.", not ${JSON.stringify(rule?.match)}`);
  }
  return component;
}

/**
 * The declaration of a component that a layer includes from the layer that holds it (`components.include:
 * [{ name, from }]`), as that layer wrote it. `lend(from)` returns that layer as authored.
 */
function borrowed({ name, from }, layer, lend, CORE_NS) {
  const id = `${CORE_NS}.comp.${name}`;
  if (!lend) throw new SystemError(`${layer.id}: components.include takes "${name}" from "${from}"; building it needs that layer — pass "lend"`);
  const entry = lend(from)?.vocabulary?.[id];
  if (!entry || typeof entry !== 'object' || !('document' in entry)) throw new SystemError(`${layer.id}: components.include: "${name}" does not live in "${from}" — that layer declares no "${id}" with its document`);
  return { id, component: componentDeclaration(id, entry, from, CORE_NS), entry };
}

/**
 * Collect the declarations of a layer chain, root first.
 * @returns {Record<string, { kind, type?, from?, scale?, rationale, description?, onRole?, declaredBy, definition? }>}
 * @param {{ namespace?: string, lend?: (id: string) => object | undefined }} [options] the core vocabulary's namespace
 *   ('tanrei' by default); `lend` returns a layer by id, for a component a layer includes from the layer that holds it
 */
export function collectVocabulary(layers, { namespace: CORE_NS = 'tanrei', lend } = {}) {
  const out = {};
  const copy = (rules) => JSON.parse(JSON.stringify(rules ?? []));
  for (const layer of layers) {
    // A component included from the layer that holds it arrives as that layer declared it — its document and its
    // rules, none of that layer's values — before this layer's own extensions, which may add to it.
    for (const include of layer.components?.include ?? []) {
      if (typeof include !== 'object' || include === null) continue;
      const { id, component, entry } = borrowed(include, layer, lend, CORE_NS);
      if (out[id]) throw new SystemError(`${layer.id}: components.include: "${component}" is already in this system (declared by layer "${out[id].declaredBy}"); there is nothing to include`);
      out[id] = { kind: 'component', component, document: entry.document, rules: copy(entry.rules), rationale: entry.rationale, declaredBy: include.from, includedBy: layer.id, definition: {} };
    }
    for (const [id, entry] of Object.entries(layer.vocabulary ?? {})) {
      if (out[id]) throw new SystemError(`${id}: already declared by layer "${out[id].declaredBy}". Declare a token once; change its value under "tokens".`);
      if (typeof entry.rationale !== 'string' || entry.rationale.length < 8) throw new SystemError(`${id}: an extension needs a "rationale" — why does this design system or product need it?`);
      const namespace = id.split('.')[0];
      const kind = kindOf(entry, id);
      if (kind === 'component') {
        const component = componentDeclaration(id, entry, layer.id, CORE_NS);
        out[id] = { kind, component, document: entry.document, rules: copy(entry.rules), rationale: entry.rationale, description: entry.$description, declaredBy: layer.id, definition: {} };
        continue;
      }
      if (namespace !== CORE_NS) {
        if (namespace !== layer.id) throw new SystemError(`${id}: a layer's own tokens live in its own namespace — "${layer.id}.…", not "${namespace}.…"`);
        if (kind === 'group') throw new SystemError(`${id}: a step cloned with "from" belongs to a series of the core vocabulary — "${CORE_NS}.sys.<series>.…". In your own namespace declare each token with "$type".`);
        if (kind !== 'token') throw new SystemError(`${id}: an axis value belongs to a Tanrei component — "${CORE_NS}.comp.<component>.<axis>.<value>"`);
      }
      for (const segment of id.split('.').slice(1)) if (!KEY.test(segment)) throw new SystemError(`${id}: "${segment}" is not a valid name (lowercase letters, digits and hyphens)`);
      const { rationale, $description, from, scale, onRole, $type, ...definition } = entry;
      out[id] = { kind, type: $type, from, scale, rationale, description: $description, onRole, declaredBy: layer.id, definition };
    }
  }
  return out;
}

const stamp = (node, decl) => {
  (node.$extensions ??= {})[VOCABULARY] = { rationale: decl.rationale, declaredBy: decl.declaredBy, extension: true, ...(decl.onRole ? { onRole: decl.onRole } : {}) };
  if (decl.description) node.$description = decl.description;
};

const isToken = (node) => node && typeof node === 'object' && '$value' in node;

/** The group at `segments`, or undefined. */
function groupAt(doc, segments) {
  let node = doc;
  for (const key of segments) {
    node = node?.[key];
    if (!node || typeof node !== 'object' || isToken(node)) return undefined;
  }
  return node;
}

/** The document that already holds the longest group prefix of `segments`. */
function ownerOf(docs, segments) {
  let best = null;
  for (const [name, doc] of Object.entries(docs)) {
    let depth = 0;
    while (depth < segments.length - 1 && groupAt(doc, segments.slice(0, depth + 1))) depth += 1;
    if (!best || depth > best.depth) best = { name, doc, depth };
  }
  return best;
}

function scaleNode(node, factor, id, type) {
  if (factor === 1 || factor === undefined) return;
  if (type !== 'dimension' && type !== 'number' && type !== 'duration') return; // a text style or a shadow is cloned as it is
  const ext = (node.$extensions ??= {});
  if (isRef(node.$value)) {
    ext[DERIVE] = { fn: 'mul', of: node.$value, by: factor };
    node.$value = null; // computed by resolveNumericTokens
  } else if (ext[DERIVE]?.fn === 'mul') ext[DERIVE] = { ...ext[DERIVE], by: ext[DERIVE].by * factor };
  // A padding that follows its box's height: the padding scales, and still gives up or takes half of what its box does.
  else if (ext[DERIVE]?.fn === 'pad') ext[DERIVE] = { ...ext[DERIVE], by: (ext[DERIVE].by ?? 1) * factor };
  else throw new SystemError(`${id}: cannot scale a fixed value — give this member a value under "tokens"`);
}

/**
 * A cloned member's `pad` measures the height of its own size: a padding cloned from `large` that read
 * `<component>.container.height.large` reads `<component>.container.height.<value>`, the height cloned beside it.
 */
function repointPad(node, componentPath, members, from, value) {
  const rule = node.$extensions?.[DERIVE];
  if (rule?.fn !== 'pad' || !isRef(rule.height)) return;
  const prefix = `${componentPath.join('.')}.`;
  const height = rule.height.slice(1, -1);
  const member = members.find((m) => height === `${prefix}${m}.${from}`);
  if (member) node.$extensions[DERIVE] = { ...rule, height: `{${prefix}${member}.${value}}` };
}

/** Every token under `node`, with its path relative to it and its inherited `$type`. */
function* tokensUnder(node, path = [], type) {
  const here = node.$type ?? type;
  if (isToken(node)) {
    yield { path, token: node, type: here };
    return;
  }
  for (const [key, child] of Object.entries(node)) if (!key.startsWith('$') && child && typeof child === 'object') yield* tokensUnder(child, [...path, key], here);
}

function addAxisValue(docs, id, decl) {
  const segments = id.split('.');
  const value = segments.at(-1);
  const axis = segments.at(-2);
  const componentPath = segments.slice(0, -2);
  const home = Object.values(docs).find((doc) => groupAt(doc, componentPath)?.$extensions?.[AXES]);
  const component = home && groupAt(home, componentPath);
  const declared = component?.$extensions[AXES][axis];
  if (!declared) throw new SystemError(`${id}: "${componentPath.join('.')}" has no axis "${axis}". Axes are declared by the component in $extensions["${AXES}"].`);

  const states = component.$extensions[STATES];
  const values = declared.from === 'states' ? states.variants : declared.values;
  if (!values.includes(decl.from)) throw new SystemError(`${id}: "from" must be an existing ${axis} (${values.join(', ')}), not "${decl.from}"`);
  // Declarations are unique across a chain, so a value that already exists here is the core's.
  if (values.includes(value)) throw new SystemError(`${id}: "${value}" is a core ${axis} of ${componentPath.join('.')}; a layer declares only what the core lacks: delete this declaration (its values under "tokens" stay)`);
  if ((states?.states ?? []).includes(value)) throw new SystemError(`${id}: "${value}" is an interaction state; states are not extensible`);

  if (declared.from === 'states') {
    // A variant is the group `<component>.<variant>`: its resting parts. The system's pattern rules value its states.
    if (component[value]) throw new SystemError(`${id}: "${componentPath.join('.')}.${value}" already exists`);
    const copy = clone(component[decl.from]);
    // A reference inside the source variant to itself (Button's `filled.state-layer.color` aliases
    // `filled.label.color`) follows the clone: `danger.state-layer.color` aliases `danger.label.color`.
    const own = `{${[...componentPath, decl.from].join('.')}.`;
    for (const { token } of tokensUnder(copy)) {
      if (typeof token.$value === 'string' && token.$value.startsWith(own)) token.$value = `{${[...componentPath, value].join('.')}.${token.$value.slice(own.length)}`;
      stamp(token, decl);
    }
    component[value] = copy;
    states.variants = [...states.variants, value];
  } else {
    // A size-like axis: each member is a group keyed by the axis value.
    for (const member of declared.members) {
      const group = groupAt(home, [...componentPath, ...member.split('.')]);
      if (!group || !isToken(group[decl.from])) throw new SystemError(`${id}: axis member "${member}" has no "${decl.from}"`);
      const copy = clone(group[decl.from]);
      const factor = typeof decl.scale === 'object' ? decl.scale[member] : decl.scale;
      repointPad(copy, componentPath, declared.members, decl.from, value);
      scaleNode(copy, factor, `${componentPath.join('.')}.${member}.${value}`, copy.$type ?? group.$type);
      stamp(copy, decl);
      group[value] = copy;
    }
    if (typeof decl.scale === 'object') for (const member of Object.keys(decl.scale)) if (!declared.members.includes(member)) throw new SystemError(`${id}: "scale" names "${member}", which is not a member of the ${axis} axis (${declared.members.join(', ')})`);
    declared.values = [...declared.values, value];
  }
  (declared.extensions ??= []).push({ value, declaredBy: decl.declaredBy });
}

/**
 * The whole vocabulary of a component that lives in a layer: its document, from the sources the caller passed
 * (`systems/<layer>/comp/<component>.tokens.json`), becomes the system's `comp/<component>.tokens.json` — a document
 * like the core's components', which everything after this step reads the same way.
 */
function addComponent(docs, id, decl, CORE_NS) {
  const held = heldDocumentPath(decl.declaredBy, decl.component);
  const name = componentDocumentPath(decl.component);
  if (docs[name]) throw new SystemError(`${id}: the core vocabulary already has ${name}; a component lives in one place — the core, or the one layer that declares it`);
  const doc = docs[held];
  if (!doc) throw new SystemError(`${id}: the component's document (tokens/${held}) is not among the sources — pass the documents the layers hold along with the core's`);
  const own = (node) => Object.keys(node ?? {}).filter((key) => !key.startsWith('$'));
  if (own(doc).join() !== CORE_NS || own(doc[CORE_NS]).join() !== 'comp' || own(doc[CORE_NS].comp).join() !== decl.component) throw new SystemError(`${id}: tokens/${held} holds the group "${CORE_NS}.comp.${decl.component}" and nothing else`);
  docs[name] = doc;
}

/** A step that is a group of tokens (a named spring set), cloned whole from a sibling group of the same series. */
function addGroup(docs, id, decl) {
  const segments = id.split('.');
  const name = segments.at(-1);
  const home = Object.values(docs).find((doc) => groupAt(doc, segments.slice(0, -1)));
  const series = home && groupAt(home, segments.slice(0, -1));
  const siblings = series ? Object.keys(series).filter((key) => !key.startsWith('$') && !isToken(series[key])) : [];
  if (!series || !siblings.length) throw new SystemError(`${id}: "${segments.slice(0, -1).join('.')}" is not a series whose steps are groups of tokens (such as ${segments[0]}.sys.motion.spring.standard). A single token is declared with "$type", not "from".`);
  // Declarations are unique across a chain, so a step that already exists here is the core's.
  if (series[name]) throw new SystemError(`${id}: "${name}" is a core step of ${segments.slice(0, -1).join('.')}; a layer declares only what the core lacks: delete this declaration (its values under "tokens" stay)`);
  if (!siblings.includes(decl.from)) throw new SystemError(`${id}: "from" must be an existing step of ${segments.slice(0, -1).join('.')} (${siblings.join(', ')}), not "${decl.from}"`);
  if (decl.scale !== undefined) throw new SystemError(`${id}: "scale" does not apply to a cloned step; change its fields under "tokens"`);
  if (Object.entries(series[decl.from]).some(([key, child]) => !key.startsWith('$') && !isToken(child))) throw new SystemError(`${id}: "${decl.from}" is not a step but a group of steps. A cloned step is one named set of tokens, e.g. ${segments.slice(0, -1).join('.')}.${decl.from}.<name>.`);
  const copy = clone(series[decl.from]);
  for (const { token } of tokensUnder(copy)) stamp(token, decl);
  if (decl.description) copy.$description = decl.description;
  series[name] = copy;
}

function addToken(docs, id, decl, core, system) {
  const CORE_NS = system.namespace ?? 'tanrei';
  const segments = id.split('.');
  if (core.has(id)) {
    const existing = core.get(id);
    if (existing.type !== decl.type) throw new SystemError(`${id}: the core has this id as "${existing.type}", not "${decl.type}". Rename the extension.`);
    throw new SystemError(`${id}: a core token; a layer declares only what the core lacks: delete this declaration, and write its value under "tokens"`);
  }
  if (!decl.type) throw new SystemError(`${id}: a declared token needs "$type"`);
  const namespace = segments[0];
  let owner;
  if (namespace === CORE_NS) {
    // Inside Tanrei's tree an extension is a STEP IN A SERIES: its group must already exist. A new group of your
    // own (a new concept) belongs in your layer's namespace, where it cannot collide with what core adds later.
    owner = ownerOf(docs, segments);
    if (!owner || owner.depth < segments.length - 1) throw new SystemError(`${id}: "${segments.slice(0, -1).join('.')}" is not a group of the vocabulary. Inside ${CORE_NS}.* a layer adds a step to an existing series (e.g. ${CORE_NS}.sys.space.…); for anything new use your layer's own namespace.`);
  } else {
    const name = `ext/${namespace}.tokens.json`;
    // No root $description: a resolver merges documents, and a root description would land on every group.
    docs[name] ??= {};
    owner = { name, doc: docs[name] };
  }
  let node = owner.doc;
  for (const key of segments.slice(0, -1)) {
    if (isToken(node[key])) throw new SystemError(`${id}: "${key}" is a token; a token cannot have children`);
    node = node[key] ??= {};
  }
  if (node[segments.at(-1)]) throw new SystemError(`${id}: a group with this name already exists`);

  const { $value, derive, reason } = decl.definition;
  // A text style's rules (`derive.fontSize`, `derive.letterSpacing`) value single fields of a style that must already
  // be there; the other fields have nowhere else to come from. Refused here, where the declaration is, not later as a
  // crash inside the evaluator.
  if (decl.type === 'typography' && $value === undefined && derive) throw new SystemError(`${id}: a text style declared with "derive" alone has no fontFamily, fontWeight or lineHeight — its rules value only fontSize and letterSpacing. Write "$value" with the whole style, e.g. { "fontFamily": "{${CORE_NS}.ref.typeface.plain}", "fontSize": { "value": 14, "unit": "px" }, "fontWeight": 400, "letterSpacing": { "value": 0, "unit": "px" }, "lineHeight": 1.5 }, and keep "derive" for the fields that follow the dials; or alias an existing style with "$value": "{${CORE_NS}.sys.typescale.<role>}" and no "derive".`);
  // Cloned: a text style's fields are written in place when its rules are evaluated, and the declaration belongs to the layer.
  const token = { $type: decl.type, $value: $value === undefined ? null : clone($value) };
  if (derive) token.$extensions = { [DERIVE]: clone(derive) };
  else if ($value !== undefined && !isRef($value)) token.$extensions = { [DERIVE]: { fixed: reason ?? decl.rationale } };
  stamp(token, decl);
  node[segments.at(-1)] = token;
}

/**
 * Insert a system's extensions into (already cloned) documents. Mutates `docs`; may add `ext/<ns>.tokens.json`.
 * A declaration of what the core already has is refused (`SystemError`).
 */
export function materializeVocabulary(docs, system) {
  const vocabulary = system.vocabulary ?? {};
  const SYS_COLOR = `${system.namespace ?? 'tanrei'}.sys.color.`;
  // A component that lives in a layer first: an extension of the system may add to it (a size, a variant).
  for (const [id, decl] of Object.entries(vocabulary)) if (decl.kind === 'component') addComponent(docs, id, decl, system.namespace ?? 'tanrei');
  if (!Object.values(vocabulary).some((decl) => decl.kind !== 'component')) return;
  const core = new Map();
  for (const doc of Object.values(docs)) for (const entry of walkTokens(doc)) core.set(entry.id, entry);
  // Tokens (and steps that are groups) first: an axis value may be cloned from, or later re-pointed to, a step declared alongside it.
  const ordered = Object.entries(vocabulary).sort(([, a], [, b]) => Number(a.kind === 'axis-value') - Number(b.kind === 'axis-value'));
  for (const [id, decl] of ordered) {
    if (decl.kind === 'component') continue; // in place above
    if (decl.kind === 'token' && id.startsWith(SYS_COLOR)) continue; // color roles are materialised by the palette engine
    if (decl.kind === 'axis-value') addAxisValue(docs, id, decl);
    else if (decl.kind === 'group') addGroup(docs, id, decl);
    else addToken(docs, id, decl, core, system);
  }
}

/** The extensions of a system as a plain list, for bundles, reports and tools. */
export function listExtensions(system) {
  return Object.entries(system.vocabulary ?? {}).map(([id, d]) => ({ id, kind: d.kind, ...(d.type ? { $type: d.type } : {}), ...(d.from ? { from: d.from } : {}), ...(d.document ? { document: d.document } : {}), declaredBy: d.declaredBy, ...(d.includedBy ? { includedBy: d.includedBy } : {}), rationale: d.rationale }));
}
