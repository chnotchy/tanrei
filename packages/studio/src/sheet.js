// A layer's page sheet, and the part of the Studio's pipeline it is computed with: from a chain of layers to the
// system's model (`systemOf`), and from the model to the sheet a page applies over the default system's
// (`pageSheetOf`). The Studio core (./core.js) computes with these, and so does the page sheet's worker
// (`createPageSheet`, ./sheet-worker.ts), which is given only what a sheet needs: the token documents without their
// prose (./sheet-sources.js), the default system's chain, the chosen layer's ancestry (loaded when it is asked for),
// and, of every other shipped layer, what it says of the components that live in it. No schema, no checks of the
// build, nothing the Studio's page shows: so the worker that the documentation starts for a reader's theme loads and
// computes no more than its sheet.
import { componentDocumentPath, createPaletteEngine, mergeLayers, resolveNumericTokens } from '@tanrei/token-engine';
import { buildModel } from './model.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/** The declarations of a sheet by the rule they stand in, with the rule's selectors and at-rules around it. */
export function sheetRules(css) {
  const rules = [];
  const open = [];
  let current = null;
  for (const line of css.split('\n')) {
    const text = line.trim();
    if (!text || text.startsWith('/*')) continue;
    if (text.endsWith('{')) {
      open.push(text.slice(0, -1).trim());
      current = { path: [...open], declarations: [] };
      rules.push(current);
    } else if (text === '}') {
      open.pop();
      current = rules.findLast((rule) => same(rule.path, open)) ?? null;
    } else if (current) {
      const colon = text.indexOf(':');
      if (colon > 0) current.declarations.push([text.slice(0, colon), text.slice(colon + 1).trim().replace(/;$/, '')]);
    }
  }
  return rules;
}

/** Rules as a sheet: each with its at-rules and selectors around it, opened where they differ from the last ones printed; a rule with nothing in it is left out. */
export function printRules(rules) {
  const lines = [];
  let printed = [];
  for (const rule of rules) {
    if (!rule.declarations.length) continue;
    let common = 0;
    while (common < printed.length && common < rule.path.length - 1 && printed[common] === rule.path[common]) common += 1;
    for (let depth = printed.length; depth > common; depth -= 1) lines.push(`${'  '.repeat(depth - 1)}}`);
    for (let depth = common; depth < rule.path.length; depth += 1) lines.push(`${'  '.repeat(depth)}${rule.path[depth]} {`);
    for (const [property, value] of rule.declarations) lines.push(`${'  '.repeat(rule.path.length)}${property}: ${value};`);
    lines.push(`${'  '.repeat(rule.path.length - 1)}}`);
    printed = rule.path.slice(0, -1);
  }
  for (let depth = printed.length; depth > 0; depth -= 1) lines.push(`${'  '.repeat(depth - 1)}}`);
  return lines.length ? `${lines.join('\n')}\n` : '';
}

/**
 * The layers from the root down to `layer`, following `extends` through `find` (a layer by id, or undefined).
 * @param {object} layer
 * @param {{ find: (id: string) => object | undefined, rootId: string, known: () => string }} options  `known`: the
 *   systems a layer may extend, as a list for the message of one that extends something else
 */
export function chainOf(layer, { find, rootId, known }) {
  const chain = [layer];
  const seen = new Set([layer.id]);
  while (chain[0].extends) {
    const parent = find(chain[0].extends);
    if (!parent) throw new Error(`"extends": "${chain[0].extends}" is not a shipped system (${known()})`);
    if (seen.has(parent.id)) throw new Error(`"extends" cycle at "${parent.id}"`);
    seen.add(parent.id);
    chain.unshift(parent);
  }
  if (chain[0].id !== rootId) throw new Error(`a layer must extend "${rootId}" or a system that does`);
  return chain;
}

/**
 * Layers → documents → model: the build's pipeline, in memory, up to the model its emitter and its checks read. Throws
 * what the engine throws.
 * @param {object[]} chain  layers, root first (`chainOf`)
 * @param {{ namespace: string, sources: Record<string, object>, vocabulary: object, resolver: object, engine: { generateColorFiles: Function }, lend: (id: string) => object | undefined }} deps
 *   `engine`: the token engine's palette engine (`createPaletteEngine`); `lend`: the layer that holds a component a
 *   layer of the chain includes from it (the engine reads its `vocabulary`)
 */
export function systemOf(chain, { namespace, sources, vocabulary, resolver, engine, lend }) {
  const system = mergeLayers(chain, { lend });
  const documents = resolveNumericTokens(sources, system);
  const generated = engine.generateColorFiles(system, { sourcePath: `tokens/systems/${system.id}.system.json`, vocabulary, documents });
  const files = { ...documents, ...Object.fromEntries(Object.entries(generated).map(([name, doc]) => [`generated/${name}`, doc])) };
  // A component that lives in a layer is one more component document of the systems that have it, as in the build's bundle.
  const held = Object.values(system.vocabulary).filter((decl) => decl.kind === 'component').map((decl) => ({ $ref: componentDocumentPath(decl.component) }));
  const own = held.length ? { ...resolver, sets: { ...resolver.sets, comp: { ...resolver.sets.comp, sources: [...resolver.sets.comp.sources, ...held] } } } : resolver;
  const model = buildModel(files, { id: system.id, namespace, resolver: own });
  return { chain, system, files, model };
}

/**
 * The sheet of a layer's model for a page whose root already holds the default system's sheet — the one `tanrei
 * build` writes unscoped, on `:root` (the web package's tokens.css) — to be applied after it, in the same cascade
 * layer: then the page draws the layer. It holds only what the page needs of the layer: the custom properties whose
 * value differs from the default system's in any rule of the sheet (on the root, at a contrast level, under
 * `prefers-contrast`), written by the build's emitter with only those (`emitCss`'s `used`, which brings along what
 * their values read). Where the default sheet declares one of them again in a rule the layer's sheet leaves it out of
 * (the layer's value is the same at that level), it is declared there too, with the layer's value, so that the default
 * system's never shows through.
 * @param {object} model  the layer's model (`systemOf`)
 * @param {{ namespace: string, emitCss: Function, availability: object, defaultRules: ReturnType<typeof sheetRules> }} options
 *   `availability`: what the layer's system does not have (tokens-build's `sheetAvailability` of its chain);
 *   `defaultRules`: the default system's unscoped sheet, as `sheetRules` reads it
 */
export function pageSheetOf(model, { namespace, emitCss, availability, defaultRules }) {
  const byPath = (rules) => new Map(rules.map((rule) => [JSON.stringify(rule.path), new Map(rule.declarations)]));
  const theirs = byPath(defaultRules);
  const ours = byPath(sheetRules(emitCss(model, availability)));
  // What a property is in a rule: its own declaration there, else the root's (the token block, then the system's own block).
  const ROOT = [`@layer ${namespace}.tokens`, `:root, [data-${namespace}-contrast]`];
  const OWN = [`@layer ${namespace}.tokens`, ':root'];
  const valueIn = (rules, path, property) => rules.get(path)?.get(property) ?? rules.get(JSON.stringify(ROOT))?.get(property) ?? rules.get(JSON.stringify(OWN))?.get(property);
  const paths = new Set([...theirs.keys(), ...ours.keys()]);
  const used = new Set();
  for (const path of paths) {
    for (const property of new Set([...(theirs.get(path)?.keys() ?? []), ...(ours.get(path)?.keys() ?? [])])) {
      if (property.startsWith('--') && valueIn(theirs, path, property) !== valueIn(ours, path, property)) used.add(property);
    }
  }
  const rules = sheetRules(emitCss(model, { ...availability, used }));
  const kept = byPath(rules);
  for (const rule of defaultRules) {
    const path = JSON.stringify(rule.path);
    const missing = rule.declarations.filter(([property]) => used.has(property) && !kept.get(path)?.has(property));
    if (!missing.length) continue;
    let own = rules.find((each) => JSON.stringify(each.path) === path);
    if (!own) {
      own = { path: rule.path, declarations: [] };
      // In the default sheet's order: after the last rule that comes before it there.
      const before = defaultRules.slice(0, defaultRules.indexOf(rule)).map((each) => JSON.stringify(each.path));
      const at = rules.findLastIndex((each) => before.includes(JSON.stringify(each.path)));
      rules.splice(at + 1, 0, own);
    }
    for (const [property] of missing) own.declarations.push([property, valueIn(ours, path, property)]);
  }
  return printRules(rules);
}

/**
 * The systems a layer may extend, by id, as the Studio offers them: the default first, then the others; never the
 * root, which is every chain's first layer and has no output of its own.
 * @param {string[]} ids  every shipped layer
 */
export function offeredSystems(ids, { rootId, defaultId }) {
  return ids.filter((id) => id !== rootId).sort((a, b) => Number(a !== defaultId) - Number(b !== defaultId) || a.localeCompare(b));
}

/**
 * The page sheet of a layer, computed from what it needs alone: `pageSheet(layer)` resolves with the sheet `pageSheetOf`
 * gives for the layer's model, and rejects with why a layer has none.
 *
 * `shipped` names every shipped layer with its `extends` and its `vocabulary` (what it says of the components that
 * live in it: where each lives, what a system without it uses instead, and what a layer that includes one from it
 * borrows); `preloaded` holds shipped layers whole that are at hand already (the default system's chain, which every
 * sheet is computed against), and `load(id)` gives any other one, asked for only when the chain of a layer asked for
 * holds it. A layer is not checked against the schema: what reaches the sheet is what the engine computes, and a layer
 * it cannot compute is refused with the engine's reason.
 *
 * @param {object} deps
 * @param {{ namespace: string }} deps.config  tanrei.config.json
 * @param {Record<string, object>} deps.sources  the token documents the default resolver names, and the documents of
 *   the components that live in a layer, keyed by path relative to tokens/ (their prose may be left out: ./sheet-sources.js)
 * @param {object} deps.vocabulary  tokens/sys/color.vocabulary.json
 * @param {object} deps.resolver  tokens/tanrei.resolver.json
 * @param {{ Hct: any, TonalPalette: any }} deps.mcu  material-color-utilities
 * @param {Function} deps.emitCss  tokens-build's src/emit/css.js
 * @param {Function} deps.sheetAvailability  tokens-build's src/layers.js
 * @param {Function} deps.heldComponents  the same module
 * @param {Function} deps.outsideStandIns  the same module
 * @param {Record<string, { id: string, extends?: string, vocabulary?: object }>} deps.shipped  every shipped layer, by id
 * @param {object[]} [deps.preloaded]  shipped layers, whole, at hand
 * @param {(id: string) => Promise<object>} deps.load  a shipped layer, whole
 */
export function createPageSheet({ config, sources, vocabulary, resolver, mcu, emitCss, sheetAvailability, heldComponents, outsideStandIns, shipped, preloaded = [], load }) {
  const NS = config.namespace;
  const engine = createPaletteEngine(mcu);
  const ids = Object.keys(shipped);
  const rootId = Object.values(shipped).find((layer) => !layer.extends).id;
  const defaultId = Object.hasOwn(shipped, NS) ? NS : rootId;
  const homes = heldComponents(ids, (id) => shipped[id]);
  const standIns = outsideStandIns(ids, (id) => shipped[id]);
  const known = () => offeredSystems(ids, { rootId, defaultId }).join(', ');
  const deps = { namespace: NS, sources, vocabulary, resolver, engine, lend: (id) => (Object.hasOwn(shipped, id) ? shipped[id] : undefined) };

  const loading = new Map(preloaded.map((layer) => [layer.id, Promise.resolve(layer)]));
  const loaded = (id) => loading.get(id) ?? loading.set(id, load(id)).get(id);
  /** The shipped layers `extends` leads through from `id`, by id: as far as the names are shipped, and no further than a cycle. */
  const ancestry = (id) => {
    const out = [];
    for (let at = id; at && Object.hasOwn(shipped, at) && !out.includes(at); at = shipped[at].extends) out.push(at);
    return out;
  };
  /** A layer's chain, its shipped layers loaded first. */
  async function chainFor(layer) {
    const ancestors = ancestry(layer.extends);
    const layers = new Map(await Promise.all(ancestors.map(async (id) => [id, await loaded(id)])));
    return chainOf(layer, { find: (id) => layers.get(id), rootId, known });
  }

  let defaultRules;
  /** The default system's sheet, as the page holds it on its root: computed once. */
  const defaults = () =>
    (defaultRules ??= (async () => {
      const { chain, model } = systemOf(await chainFor(await loaded(defaultId)), deps);
      return sheetRules(emitCss(model, sheetAvailability(chain, homes, standIns)));
    })());

  return {
    rootId,
    defaultId,
    /** Starts loading and computing what every sheet needs — the default system's — before a layer is asked for. */
    warm() {
      defaults().catch(() => {});
    },
    /** @param {unknown} input  a layer @returns {Promise<string>} */
    async pageSheet(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('a layer is a JSON object');
      if (input.extends && !Object.hasOwn(shipped, input.extends)) throw new Error(`"extends": "${input.extends}" is not a shipped system (${known()})`);
      if (!input.extends && input.id !== rootId) throw new Error(`the Studio edits layers that extend a shipped system ("extends": ${offeredSystems(ids, { rootId, defaultId }).map((id) => `"${id}"`).join(' | ')})`);
      const layer = clone(input);
      const chain = await chainFor(layer);
      const { model } = systemOf(chain, deps);
      return pageSheetOf(model, { namespace: NS, emitCss, availability: sheetAvailability(chain, homes, standIns), defaultRules: await defaults() });
    },
  };
}
