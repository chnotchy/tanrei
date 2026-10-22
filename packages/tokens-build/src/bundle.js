// One self-contained DTCG 2025.10 bundle per design system.
// A bundle mirrors the layout of tokens/ — so the default resolver works unchanged — with every
// value already computed for that system, and carries the recipe that produced it. Any DTCG tool
// can read it; Tanrei can rebuild it.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { componentDocumentPath, listExtensions, mergeLayers, resolveNumericTokens, rootLayerProblems } from '@tanrei/token-engine';
import { CONFIG } from './config.js';
import { DEFAULT_SYSTEM, ROOT_SYSTEM, availabilityOf, componentChoices, heldComponents, layerChain, outsideComponents, outsideStandIns } from './layers.js';
import { SYSTEM_ID, assertSystemId, isSystemId } from './pure.js';
import { generateSchemeFiles, heldDocuments, loadSystem, sourceFiles } from './scheme.js';

const RECIPE = 'dev.tanrei.system';

export { DEFAULT_SYSTEM, ROOT_SYSTEM, SYSTEM_ID, assertSystemId, availabilityOf, componentChoices, heldComponents, isSystemId, layerChain, outsideComponents, outsideStandIns };

/** Every layer in tokens/systems/, the root among them: what an `extends` may name. */
export function listSystems(repoRoot) {
  return fs
    .readdirSync(path.join(repoRoot, 'tokens/systems'))
    .filter((f) => f.endsWith('.system.json'))
    .map((f) => f.replace('.system.json', ''))
    .sort();
}

/**
 * The systems that ship with Tanrei, by id: every layer but the root. The root values the vocabulary for the systems
 * that extend it and has no outputs of its own — no stylesheet, no bundle, no native constant — so it is offered
 * nowhere a system is chosen; it is read only as the first layer of every chain.
 */
export const shippedSystems = (repoRoot) => listSystems(repoRoot).filter((id) => id !== ROOT_SYSTEM);

let validateLayer;
/** Schema-validate one layer file's content. Returns problems. */
export function validateLayerFile(repoRoot, layer, fileId) {
  if (!validateLayer) {
    const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tokens/schema/system.schema.json'), 'utf8'));
    validateLayer = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  }
  const problems = validateLayer(layer) ? [] : validateLayer.errors.map((e) => `${fileId}.system.json ${e.instancePath || '/'} ${e.message}`);
  if (layer.id !== fileId) problems.push(`${fileId}.system.json: "id" must equal the file name`);
  if (fileId === ROOT_SYSTEM ? 'extends' in layer : !layer.extends) problems.push(`${fileId}.system.json: only the root layer "${ROOT_SYSTEM}" omits "extends"`);
  return problems;
}

/**
 * Problems of the layers that ship in `tokens/systems/`: each one's schema, and — for every layer the default system
 * is made of (the root and the default system's own) — every line the default system cannot take. The default system
 * is read from `tokens/` as it is written; only what is generated from its layers is theirs to set
 * (`rootLayerProblems`): a line for anything else would reach the systems built on them and never the default.
 * @param {(id: string) => object} [read] a shipped layer by id
 * @returns {string[]}
 */
export function shippedLayerProblems(repoRoot, read = (id) => loadSystem(repoRoot, id)) {
  let defaultChain = [];
  try {
    defaultChain = layerChain(DEFAULT_SYSTEM, read).map((layer) => layer.id);
  } catch (error) {
    return [`${DEFAULT_SYSTEM}.system.json: ${error.message}`];
  }
  return listSystems(repoRoot).flatMap((id) => {
    const layer = read(id);
    const role = id === ROOT_SYSTEM ? 'the root layer' : 'the default system\'s own layer';
    return [...validateLayerFile(repoRoot, layer, id), ...(defaultChain.includes(id) ? rootLayerProblems(sourceFiles(repoRoot), layer, { namespace: CONFIG.namespace, role }) : [])];
  });
}

/**
 * Compute a system's bundle in memory.
 * @param {{ lend?: (id: string) => object }} [options] `lend`: a layer by id, for a component a layer of the chain
 *   includes from the layer that holds it; the shipped layers by default
 * @returns {{ system: object, files: Record<string, object> }} files keyed by path relative to the bundle root
 */
export function buildBundle(repoRoot, chain, { lend = (id) => loadSystem(repoRoot, id) } = {}) {
  const system = mergeLayers(chain, { namespace: CONFIG.namespace, lend });

  // The core's documents, and those of the components that live in a layer and that this system has.
  const files = resolveNumericTokens({ ...sourceFiles(repoRoot), ...heldDocuments(repoRoot, system) }, system);
  for (const [name, doc] of Object.entries(generateSchemeFiles(system, repoRoot, files))) files[`generated/${name}`] = doc;

  // tokens/ is the default system's bundle: its resolver is the one every bundle starts from.
  const resolver = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tokens', `${DEFAULT_SYSTEM}.resolver.json`), 'utf8'));
  // A component that lives in a layer is one more component document, read with the core's.
  const held = Object.values(system.vocabulary).filter((decl) => decl.kind === 'component').map((decl) => ({ $ref: componentDocumentPath(decl.component) }));
  resolver.sets.comp.sources.push(...held);
  resolver.name = system.name ?? system.id;
  resolver.description = `Design system "${system.id}" (${system.chain.join(' ← ')}), fully valued. Generated by Tanrei; do not edit.`;
  // A layer's own tokens arrive as ext/<namespace>.tokens.json: one more set, after the components.
  const own = Object.keys(files).filter((name) => name.startsWith('ext/')).sort();
  if (own.length) resolver.resolutionOrder.push({ $ref: '#/sets/ext' });
  if (own.length) resolver.sets.ext = { description: 'Tokens that layers of this system declare in their own namespace.', sources: own.map((name) => ({ $ref: name })) };
  files[`${system.id}.resolver.json`] = resolver;

  // The recipe travels with the values: the layers, root first, exactly as authored.
  const dial = files['dial/dial.tokens.json'];
  const extensions = listExtensions(system);
  files['dial/dial.tokens.json'] = { $extensions: { [RECIPE]: { id: system.id, chain: system.chain, ...(extensions.length ? { extensions } : {}), layers: chain } }, ...dial };
  return { system, files };
}

export function writeBundle(outDir, files, write) {
  return Object.entries(files).map(([name, doc]) => {
    const rel = path.join(outDir, name);
    write(rel, doc);
    return rel;
  });
}
