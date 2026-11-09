// A layer's page sheet, and the part of the Studio's pipeline it is computed with: from a chain of layers to the
// system's model (`systemOf`), and from the model to the sheet a page applies over the default system's
// (`pageSheetOf`). The Studio core (./core.js) computes with these.
import { componentDocumentPath, mergeLayers, resolveNumericTokens } from '@tanrei/token-engine';
import { buildModel } from './model.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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
