// Resolve a design system from its layers, in memory.
//
// A system is named in one of three ways — a shipped id, a product's layer FILE, or layer OBJECTS that exist only
// in the caller's memory (an MCP request, the layer Theme Studio is about to save) — and every way ends in the same
// chain of layers, root first. From there on nothing touches the disk: layers → DTCG bundle → its tokens, scheme by
// scheme (`reader.js`, reading the bundle from memory) → model → invariants. `tanrei build`, `tanrei studio` and the MCP
// server all stand on this, so they cannot disagree.
//
// Where a parent (`extends`) is looked up, in order:
//   1. `layers` — objects passed by the caller (they shadow a file of the same id: "what would be written");
//   2. `dir` — `<dir>/<id>.system.json` (defaults to the directory of `layerFile`): a product may stack its own layers;
//   3. the systems that ship with Tanrei.
// An `extends` is an ID, checked before anything is looked up (`layerChain`), and in `dir` only a regular file inside the
// directory is read (`localLayerFile`): a layer that arrives in a request can never spell a path.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_SYSTEM, assertSystemId, buildBundle, heldComponents, layerChain, listSystems, outsideComponents, validateLayerFile } from './bundle.js';
import { checkInvariants } from './invariants.js';
import { REPO_ROOT, buildModelFromBundle, invariantModel, lintValues } from './model.js';
import { readBundle } from './reader.js';
import { loadSystem, systemPath } from './scheme.js';

export const LAYER_SUFFIX = '.system.json';
export const systemIdOf = (file) => path.basename(file, LAYER_SUFFIX);

/**
 * The file of a product's own parent layer: `<dir>/<id>.system.json`, or null when there is none.
 * `id` comes from an `extends` nobody has validated yet, so it must be a system id BEFORE it is joined into a path,
 * and what the path leads to must be a regular file INSIDE `dir` — a link that leaves the directory is refused,
 * never followed. Every reader of a chain finds local parents through this function.
 * @throws when `id` is not a system id, or the file is not a regular file inside `dir`
 */
export function localLayerFile(dir, id) {
  assertSystemId(id);
  const file = path.join(dir, `${id}${LAYER_SUFFIX}`);
  if (!fs.lstatSync(file, { throwIfNoEntry: false })) return null;
  const name = `${id}${LAYER_SUFFIX}`;
  let real;
  try {
    real = fs.realpathSync(file);
  } catch {
    throw new Error(`${name}: a link that leads nowhere. A parent layer is a regular file in ${dir}`);
  }
  const root = fs.realpathSync(dir);
  if (!real.startsWith(root + path.sep)) throw new Error(`${name}: a link that leaves ${dir}. A parent layer is read only from inside the directory of the product's layers`);
  if (!fs.statSync(real).isFile()) throw new Error(`${name}: not a regular file`);
  return file;
}

/** Problems of a layer chain, as a list; thrown by `resolveSystem` so a caller can show all of them. */
export class LayerProblems extends Error {
  constructor(problems) {
    super(`invalid system layer:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.problems = problems;
  }
}

/**
 * @typedef {object} SystemInput  Exactly one of `system`, `layerFile`, `layers` names the system.
 * @property {string}   [system]    a shipped system id
 * @property {string}   [layerFile] path of a product's `<id>.system.json`
 * @property {object[]} [layers]    layer objects; the LAST one is the system, the others are parents it (or they) may extend
 * @property {string}   [dir]       where local parent layers live; defaults to the directory of `layerFile`
 */

/**
 * The chain of layers a system is made of, root first — read, not built.
 * @param {SystemInput} input
 * @returns {{ id: string, chain: object[], sources: (string|null)[], fileIds: string[] }}
 *   `sources[i]` is the file `chain[i]` was read from, or null for a layer object; `fileIds[i]` is the id its file name states.
 */
export function readSystemChain({ system, layerFile, layers, dir } = {}) {
  const given = [system !== undefined, layerFile !== undefined, layers !== undefined].filter(Boolean).length;
  if (given !== 1) throw new Error('name the system with exactly one of "system" (a shipped id), "layerFile" (a path) or "layers" (layer objects, the last one being the system)');
  if (layers && (!Array.isArray(layers) || !layers.length || layers.some((l) => !l || typeof l !== 'object' || typeof l.id !== 'string' || !l.id))) throw new Error('"layers" is a non-empty list of layer objects, each with an "id"');
  const inline = new Map((layers ?? []).map((layer) => [layer.id, layer]));
  if (inline.size !== (layers ?? []).length) throw new Error(`"layers" names the same id twice (${(layers ?? []).map((l) => l.id).join(', ')})`);
  const local = dir ?? (layerFile ? path.dirname(path.resolve(layerFile)) : null);
  const shipped = new Set(listSystems(REPO_ROOT));
  const id = system ?? (layerFile ? systemIdOf(layerFile) : layers.at(-1).id);
  const origin = new Map();

  const read = (wanted) => {
    if (inline.has(wanted)) return origin.set(wanted, null), inline.get(wanted);
    // The caller's own file is read where the caller says it is; a parent only through `localLayerFile` (an id, inside `local`).
    const own = layerFile && wanted === id ? path.resolve(layerFile) : null;
    const file = system !== undefined ? null : own ? (fs.existsSync(own) ? own : null) : local ? localLayerFile(local, wanted) : null;
    if (file) return origin.set(wanted, file), JSON.parse(fs.readFileSync(file, 'utf8'));
    if (shipped.has(wanted)) return origin.set(wanted, path.join(REPO_ROOT, systemPath(wanted))), loadSystem(REPO_ROOT, wanted);
    const where = [...(inline.size ? ['not among the layers passed'] : []), ...(local ? [`no ${wanted}${LAYER_SUFFIX} in ${layerFile ? `the directory of ${path.basename(layerFile)}` : local}`] : [])];
    throw new Error(`system "${wanted}" not found: ${[...where, `not a shipped system (${[...shipped].join(', ')})`].join(', ')}`);
  };
  // `layerChain` keys its lookups by the id it WANTS; the layer it gets may state another id, which validation reports.
  const wantedIds = [];
  const chain = layerChain(id, (wanted) => (wantedIds.unshift(wanted), read(wanted)));
  return { id, chain, sources: wantedIds.map((wanted) => origin.get(wanted)), fileIds: wantedIds };
}

/**
 * Schema and philosophy problems of a system's layer chain, without building anything.
 * @param {SystemInput} input
 * @returns {string[]}
 */
export function validateSystem(input) {
  if (input.layerFile !== undefined && !input.layerFile.endsWith(LAYER_SUFFIX)) return [`${input.layerFile}: a layer file is named <id>${LAYER_SUFFIX}`];
  const { id, chain, fileIds } = readSystemChain(input);
  if (input.system === undefined && id === ROOT_SYSTEM) return [`"${ROOT_SYSTEM}" is the root system; a product layer needs its own id and "extends"`];
  const problems = [];
  if (chain.at(-1).id !== id) problems.push(`${id}${LAYER_SUFFIX}: "id" must equal the file name`);
  chain.forEach((layer, i) => problems.push(...validateLayerFile(REPO_ROOT, layer, fileIds[i])));
  // A component that lives in a layer the chain does not extend is taken from that layer by name and layer; named
  // alone, `include` only brings back what an ancestor left out, and would bring nothing.
  const outside = outsideComponents(chain, heldComponents(listSystems(REPO_ROOT), (shipped) => loadSystem(REPO_ROOT, shipped)));
  chain.forEach((layer, i) => {
    for (const name of (layer.components?.include ?? []).filter((include) => typeof include === 'string' && outside[include])) {
      problems.push(`${fileIds[i] ?? layer.id}${LAYER_SUFFIX} components.include: "${name}" lives in the layer "${outside[name]}", which this system does not extend — include it from there: { "name": "${name}", "from": "${outside[name]}" }`);
    }
  });
  return [...new Set(problems)];
}

/** A stable name for "these layers, as authored" — what a cache of resolved systems is keyed on. */
export const chainDigest = (chain) => crypto.createHash('sha256').update(JSON.stringify(chain)).digest('hex').slice(0, 32);

/**
 * Build a chain of layers that is already in hand. No validation of the layer files; the engine still refuses what
 * it cannot build (`SystemError`), and the reader what it cannot read (`TokenReadError`: an alias that leads nowhere
 * or to another type, a value that is not well-formed for its type — `lintValues`).
 *
 * What it costs to hold (`test/budget.test.js`): the
 * bundle, and for each scheme asked for a list of tokens that share their values with the bundle and with each other
 * — some tens of megabytes for the six schemes of 8,500 tokens, where reading through a general parser held a
 * gigabyte. A scheme is read when it is first asked for; the default one is read and linted at once, so a bundle that
 * cannot be read is refused here.
 * @param {object[]} chain layers, root first
 * @param {{ model?: boolean }} [options] `model: false` skips the platform-neutral model and the invariants
 */
export async function resolveChain(chain, { model: wantsModel = true } = {}) {
  const id = chain.at(-1).id;
  const { system, files } = buildBundle(REPO_ROOT, chain);
  const reader = readBundle(files, id);
  await lintValues(reader.tokens());
  let model;
  let warnings;
  const resolved = {
    id,
    chain,
    digest: chainDigest(chain),
    /** The merged layers: operations per token id (with the `layer` that set them), rules, palettes, vocabulary. */
    system,
    /** The DTCG bundle: path relative to the bundle root → document. */
    files,
    /** The bundle as read: `apply({ scheme })` answers with a scheme's tokens, as a DTCG resolver does. */
    resolver: reader,
    /** Resolved DTCG tokens of one scheme, by id (`ReadToken`, reader.js). Read-only: schemes share what they have in common. */
    tokens: (scheme = 'light') => reader.tokens(scheme),
    /** The platform-neutral model every emitter reads. Built once, on first use. */
    model: () => (model ??= buildModelFromBundle(files, id, reader)),
    /**
     * Accessibility and structure invariants, every finding of the fixed ruler. What a finding means depends on the
     * system: a failure for the default system, a warning for a product layer; for an imitation preset a
     * contrast finding is a measurement that does not apply (`isCriterionFinding`).
     * (`like`, another resolved system with the same colors, once let a trial build skip five schemes; reading them
     * costs a twentieth of a second now, and the argument is ignored.)
     */
    warnings: () => (warnings ??= resolved.model().then(checkInvariants)),
  };
  if (wantsModel) await resolved.warnings();
  return resolved;
}

/**
 * `resolveChain` for a caller that asks questions one scheme at a time (the MCP server): the same bundle, read by the
 * same reader; the light scheme at once, another when `load` asks for it. The same tokens and the same warnings as
 * `resolveChain`. (It existed because a system read whole held a gigabyte; it is kept for its callers. A scheme is
 * still read only when `load` or `warnings` needs it — the warnings need the role colors of all of them.)
 * @param {object[]} chain layers, root first
 * @returns {Promise<{ id: string, chain: object[], digest: string, system: object, files: Record<string, object>,
 *   tokens: (scheme?: string) => Record<string, object>, load: (scheme: string) => Promise<Record<string, object>>, warnings: () => Promise<string[]> }>}
 *   `tokens(scheme)` answers for a scheme that is loaded (the light one, or one a `load` has settled) and throws otherwise.
 */
export async function resolveChainByScheme(chain) {
  const id = chain.at(-1).id;
  const { system, files } = buildBundle(REPO_ROOT, chain);
  const reader = readBundle(files, id);
  const loaded = new Set();
  // Asynchronous as it always was: a caller may start several and await them together.
  const load = async (scheme) => {
    const tokens = reader.tokens(scheme);
    loaded.add(scheme);
    return tokens;
  };
  await lintValues(await load('light'));
  let warnings;
  return {
    id,
    chain,
    digest: chainDigest(chain),
    system,
    files,
    tokens(scheme = 'light') {
      if (!loaded.has(scheme)) throw new Error(`scheme "${scheme}" is not loaded yet: await load("${scheme}") first`);
      return reader.tokens(scheme);
    },
    load,
    // From the light tokens and the role colors of every scheme: the model's warnings without the model's component colors.
    warnings: () => (warnings ??= invariantModel(files, id, reader.tokens('light'), reader).then(checkInvariants)),
  };
}

/**
 * Validate and build a system, in memory.
 * @param {SystemInput} input
 * @param {{ validate?: boolean, model?: boolean }} [options]
 * @returns {Promise<Awaited<ReturnType<typeof resolveChain>> & { sources: (string|null)[] }>}
 * @throws {LayerProblems} when the chain is not valid (`error.problems` lists everything)
 */
export async function resolveSystem(input, { validate = true, model = true } = {}) {
  if (validate) {
    const problems = validateSystem(input);
    if (problems.length) throw new LayerProblems(problems);
  }
  const { chain, sources } = readSystemChain(input);
  return { ...(await resolveChain(chain, { model })), sources };
}
