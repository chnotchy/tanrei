// The chain of layers a design system is made of, and the components it ships. Pure: no filesystem, so Theme Studio
// and the browser can read a chain the way the build does.
//
// Every system descends from one root layer, `core`, which values the vocabulary and leaves no component out. The
// default system (`tanrei`, the namespace) extends it, and so do the presets; a product extends one of them. What a
// system ships is worked out down the chain: each layer starts from what its parent ships and changes it with its
// `components` — `omit` leaves a component out, `include` brings back one an ancestor left out, `variants` does the
// same for the values of a component's `variant` prop. An ancestor's choice stays unless a layer undoes it by name.
//
// A component lives in the layer every system that ships it descends from: most in the root, some in one line's
// root (the FAB menu in `m3-like`), which declares the component's whole vocabulary under `vocabulary`. A system
// whose chain does not hold that layer does not have the component at all — it is outside, not left out — unless one
// of its layers includes it from the layer that holds it: `include: [{ "name": "fab-menu", "from": "m3-like" }]`.
import { CONFIG } from './config.js';
import { assertSystemId } from './pure.js';

/** The root layer: the one layer without `extends`. */
export const ROOT_SYSTEM = 'core';
/** The default system: the one the vocabulary's documents are written for, named like the namespace. */
export const DEFAULT_SYSTEM = CONFIG.namespace;

/** Layers from the root down to `id`, following `extends`. `read(id)` returns a parsed layer. */
export function layerChain(id, read) {
  const chain = [];
  const seen = new Set();
  for (let current = id; current; current = chain[0].extends) {
    // The id the caller started from is the caller's own; every further one was WRITTEN IN A LAYER nobody has validated yet.
    if (chain.length) assertSystemId(current, `${chain[0].id}.system.json "extends"`);
    if (seen.has(current)) throw new Error(`"extends" cycle: ${[...seen, current].join(' → ')}`);
    seen.add(current);
    chain.unshift(read(current));
  }
  if (chain[0].id !== ROOT_SYSTEM) throw new Error(`system "${id}" does not extend "${ROOT_SYSTEM}"`);
  return chain;
}

/** The component an entry of `components.include` names: a name, or `{ name, from }` for one another layer holds. */
export const includedName = (include) => (typeof include === 'string' ? include : include.name);

/**
 * Where each component that lives in a layer lives: component → the id of the layer that declares its whole
 * vocabulary (`vocabulary["<ns>.comp.<component>"]` with its `document`). A component not in the map lives in the root.
 * @param {string[]} ids the layers to look in (every shipped one)
 * @param {(id: string) => object} read a layer by id
 * @returns {Map<string, string>}
 */
export function heldComponents(ids, read) {
  const held = new Map();
  const prefix = `${CONFIG.namespace}.comp.`;
  for (const id of ids) {
    for (const [key, entry] of Object.entries(read(id).vocabulary ?? {})) {
      if (key.startsWith(prefix) && entry && typeof entry === 'object' && 'document' in entry) held.set(key.slice(prefix.length), id);
    }
  }
  return held;
}

/**
 * The components a chain does not have because they live in a layer it does not descend from, and that none of its
 * layers includes from there: component → the layer that holds it. The stylesheet says so, so that a component used
 * outside its layer is reported as that — its tokens are not in the sheet — rather than as one the system left out.
 * @param {object[]} chain layers, root first
 * @param {Map<string, string>} held `heldComponents`
 * @returns {Record<string, string>}
 */
export function outsideComponents(chain, held) {
  const ids = new Set(chain.map((layer) => layer.id));
  const included = new Set(chain.flatMap((layer) => (layer.components?.include ?? []).filter((include) => typeof include === 'object').map(includedName)));
  return Object.fromEntries([...held].filter(([name, layer]) => !ids.has(layer) && !included.has(name)));
}

/**
 * The chain a system's NATIVE outputs are built from: its own, with every component that lives in a layer it does not
 * extend included from that layer (`outsideComponents`). The native platforms type every system with one vocabulary,
 * and their sources still read every component's tokens from every system; until a platform decides how it packages a
 * component that lives in a layer, a system's values for it are those its own tokens give it, as for a product that
 * includes it.
 * @param {object[]} chain layers, root first
 * @param {Map<string, string>} held `heldComponents`
 * @returns {object[]} the same chain when nothing lives outside it
 */
export function nativeChain(chain, held) {
  const outside = Object.entries(outsideComponents(chain, held));
  if (!outside.length) return chain;
  const last = chain.at(-1);
  const include = [...(last.components?.include ?? []), ...outside.map(([name, from]) => ({ name, from }))];
  return [...chain.slice(0, -1), { ...last, components: { ...last.components, include } }];
}

/**
 * What a chain ships, layer by layer: the components and variant values it leaves out, each with the layer that left
 * it out (and, for a component, why and what the system uses instead).
 *
 * A layer's `components` changes what its parent ships; an ancestor's choice stays unless a layer undoes it by name.
 * @param {object[]} chain layers, root first
 * @returns {{ components: Map<string, { layer: string, reason?: string, insteadUse?: string[] }>, variants: Map<string, Map<string, { layer: string }>> }}
 *   in the order the values were left out
 */
export function componentChoices(chain) {
  const components = new Map();
  const variants = new Map();
  const variantsOf = (name) => variants.get(name) ?? variants.set(name, new Map()).get(name);
  for (const layer of chain) {
    const own = layer.components ?? {};
    for (const [name, { reason, insteadUse }] of Object.entries(own.omit ?? {})) {
      components.delete(name);
      components.set(name, { layer: layer.id, reason, ...(insteadUse ? { insteadUse: [...insteadUse] } : {}) });
    }
    for (const include of own.include ?? []) components.delete(includedName(include));
    for (const [name, { omit = [], include = [] }] of Object.entries(own.variants ?? {})) {
      const values = variantsOf(name);
      for (const value of omit) values.delete(value), values.set(value, { layer: layer.id });
      for (const value of include) values.delete(value);
    }
  }
  for (const [name, values] of variants) if (!values.size) variants.delete(name);
  return { components, variants };
}

/**
 * What a system does not ship, after inheritance — the form the CSS, the status matrix and the docs read.
 * @param {object[]} chain layers, root first
 * @returns {{ components: string[], variants: Record<string, string[]> }}
 */
export function availabilityOf(chain) {
  const { components, variants } = componentChoices(chain);
  return { components: [...components.keys()], variants: Object.fromEntries([...variants].map(([name, values]) => [name, [...values.keys()]])) };
}

/**
 * Problems of what the last layer of a chain says about its components, judged against what its parent ships.
 * @param {object[]} chain layers, root first; the last one is judged
 * @param {{ inventory: Set<string>, variantsOf: (component: string) => { values: string[], default?: string } | undefined, held?: Map<string, string> }} catalog
 *   the components of specs/inventory.json, the `variant` prop of a component's spec, and where each component that
 *   lives in a layer lives (`heldComponents`; none when it is not given)
 * @returns {string[]}
 */
export function componentChoiceProblems(chain, { inventory, variantsOf, held = new Map() }) {
  const layer = chain.at(-1);
  const where = `${layer.id}.system.json`;
  const problems = [];
  if (layer.components && chain.length === 1) problems.push(`${where}: the root layer leaves no component out — a system chooses its components in its own layer`);
  const parent = componentChoices(chain.slice(0, -1));
  const result = componentChoices(chain);
  const outsideParent = outsideComponents(chain.slice(0, -1), held);
  const outside = outsideComponents(chain, held);
  const own = layer.components ?? {};
  const known = (name, at) => (inventory.has(name) ? true : (problems.push(`${where} ${at}: "${name}" is not in specs/inventory.json`), false));

  for (const [name, { insteadUse = [] }] of Object.entries(own.omit ?? {})) {
    if (!known(name, 'components.omit')) continue;
    if (outsideParent[name]) problems.push(`${where} components.omit: "${name}" lives in the layer "${outsideParent[name]}", which this system does not extend — it has nothing to leave out`);
    else if (parent.components.has(name)) problems.push(`${where} components.omit: "${name}" is already left out by "${parent.components.get(name).layer}"`);
    for (const instead of insteadUse) {
      if (!known(instead, `components.omit.${name}.insteadUse`)) continue;
      if (instead === name || result.components.has(instead) || outside[instead]) problems.push(`${where} components.omit.${name}.insteadUse: "${instead}" is not a component this system ships`);
    }
  }
  for (const include of own.include ?? []) {
    const name = includedName(include);
    if (!known(name, 'components.include')) continue;
    if (own.omit && name in own.omit) problems.push(`${where} components: "${name}" is both omitted and included`);
    const home = held.get(name);
    if (typeof include === 'string') {
      // A name brings back what an ancestor left out; a component that lives in a layer this system does not extend is named with that layer.
      if (outsideParent[name]) problems.push(`${where} components.include: "${name}" lives in the layer "${outsideParent[name]}", which this system does not extend — include it from there: { "name": "${name}", "from": "${outsideParent[name]}" }`);
      else if (!parent.components.has(name)) problems.push(`${where} components.include: "${name}" is not left out by any layer this one extends — there is nothing to bring back`);
      continue;
    }
    // `{ name, from }`: a component that lives in another layer, its vocabulary valued with this system's own tokens.
    if (!home) problems.push(`${where} components.include: "${name}" lives in the root layer, not in "${include.from}" — every system has it; to bring it back where an ancestor left it out, name it alone`);
    else if (home !== include.from) problems.push(`${where} components.include: "${name}" lives in the layer "${home}", not in "${include.from}"`);
    else if (!outsideParent[name]) problems.push(`${where} components.include: "${name}" is already in this system — it extends "${home}"${chain.slice(0, -1).some((each) => each.id === home) ? '' : ', or an ancestor includes it'}; there is nothing to include`);
  }

  for (const [name, { omit = [], include = [] }] of Object.entries(own.variants ?? {})) {
    const at = 'components.variants';
    const variant = variantsOf(name);
    if (!variant) { problems.push(`${where} ${at}: "${name}" has no spec with a variant prop`); continue; }
    for (const value of [...omit, ...include]) if (!variant.values.includes(value)) problems.push(`${where} ${at}.${name}: "${value}" is not a variant of ${name}`);
    const before = parent.variants.get(name) ?? new Map();
    for (const value of omit) if (before.has(value)) problems.push(`${where} ${at}.${name}: "${value}" is already left out by "${before.get(value).layer}"`);
    for (const value of include) if (!before.has(value)) problems.push(`${where} ${at}.${name}: "${value}" is not left out by any layer this one extends — there is nothing to bring back`);
    for (const value of omit) if (include.includes(value)) problems.push(`${where} ${at}.${name}: "${value}" is both omitted and included`);
    const out = result.variants.get(name) ?? new Map();
    if (variant.default !== undefined && out.has(variant.default)) problems.push(`${where} ${at}.${name}: the default variant "${variant.default}" cannot be left out`);
    if (variant.values.every((value) => out.has(value))) problems.push(`${where} ${at}.${name}: every variant is left out — omit the component instead`);
  }
  return problems;
}
