// Build ONE design system from a layer file that lives anywhere — a product's repository, a temp dir, a
// Theme Studio export. This is what `tanrei build` runs, and it is the same code path the monorepo uses for
// its presets: layers → DTCG bundle → its tokens (reader.js) → invariants → one file per platform.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_SYSTEM, heldComponents, listSystems, outsideStandIns, shippedSystems } from './bundle.js';
import { CATALOG_FILE, componentsManifest, manifestComment, readComponentCatalog } from './components-manifest.js';
import { emitCss } from './emit/css.js';
import { dartSystemNames, emitDart } from './emit/dart.js';
import { emitKotlin } from './emit/kotlin.js';
import { emitSwift } from './emit/swift.js';
import { emitShadcnTheme, emitTailwindTheme } from './emit/theme-exports.js';
import { emitTs } from './emit/ts.js';
import { checkedPairs } from './invariants.js';
import { fontReport } from './fonts.js';
import { componentGlyphs, iconAxesOf } from './glyphs.js';
import { buildIR } from './ir.js';
import { nativeChain, sheetAvailability } from './layers.js';
import { CONFIG, GENERATED_HEADER, REPO_ROOT, pascal } from './model.js';
import { LAYER_SUFFIX, LayerProblems, chainDigest, localLayerFile, readSystemChain, resolveChain, resolveSystem, systemIdOf, validateSystem } from './resolve.js';
import { loadSystem } from './scheme.js';

/**
 * Sizes and variants a system ADDED become legal values of the web components' TypeScript props through
 * declaration merging into `@tanrei/web/registry` — generated only when there is something to add.
 */
function webRegistry(ir, id) {
  const lines = [];
  for (const [component, axes] of Object.entries(ir.axes)) {
    for (const [axis, { values }] of Object.entries(axes)) {
      const added = values.filter((v) => !v.core);
      if (added.length) lines.push(`  interface Tanrei${pascal([component])}${pascal([axis])}Registry {`, ...added.map((v) => `    ${JSON.stringify(v.key)}: true;`), '  }');
    }
  }
  if (!lines.length) return {};
  return { [`${id}.d.ts`]: [...GENERATED_HEADER.map((l) => `// ${l}`), `// Values the "${id}" design system adds to component props.`, `import '${CONFIG.packages.npmScope}/web/registry';`, '', `declare module '${CONFIG.packages.npmScope}/web/registry' {`, ...lines, '}', ''].join('\n') };
}

/**
 * The product's components manifest (components-manifest.js): what its system ships, each with the module that
 * registers it, and what it does not have. Worked out from the component catalog the vocabulary carries.
 */
function productComponents(chain, held, command) {
  const catalog = readComponentCatalog(REPO_ROOT);
  if (!catalog) throw new Error(`${CATALOG_FILE} is missing from the vocabulary at ${REPO_ROOT}: run \`pnpm generate\` in the Tanrei repository`);
  return { $comment: manifestComment(chain.at(-1).id, `\`${command}\``), ...componentsManifest(chain, catalog, held, shippedSystems(REPO_ROOT)) };
}

/** Every output `tanrei build` can write. A product picks the ones it ships. */
export const TARGETS = ['tokens', 'web', 'swiftui', 'compose', 'flutter', 'react-native', 'tailwind', 'shadcn'];
const NATIVE = new Set(['swiftui', 'compose', 'flutter', 'react-native']);

export { LAYER_SUFFIX, LayerProblems, chainDigest, localLayerFile, readSystemChain, resolveChain, resolveSystem, systemIdOf, validateSystem };

/**
 * Reads `extends` first next to the product's layer (a product may stack its own layers), then from the shipped systems.
 * Kept for callers that walk a chain themselves; `readSystemChain({ layerFile })` is the same lookup in one call.
 */
export function productLayerReader(layerFile) {
  const dir = path.dirname(path.resolve(layerFile));
  const shipped = new Set(listSystems(REPO_ROOT));
  return (id) => {
    const local = localLayerFile(dir, id); // an id, and a regular file inside `dir` — never a path an "extends" spells
    if (local) return JSON.parse(fs.readFileSync(local, 'utf8'));
    if (shipped.has(id)) return loadSystem(REPO_ROOT, id);
    throw new Error(`system "${id}" not found: no ${id}${LAYER_SUFFIX} next to ${path.basename(layerFile)}, and it is not a shipped system (${[...shipped].join(', ')})`);
  };
}

/** Schema and philosophy problems of a product's layer chain, without building anything. */
export const validateProductLayer = (layerFile) => validateSystem({ layerFile });

/**
 * @param {{ layerFile?: string, layers?: object[], dir?: string, targets?: string[], kotlinPackage?: string, command?: string }} options
 *   the system is a `layerFile`, or `layers` in memory (the last one is the system; see resolve.js)
 * @returns {Promise<{ id: string, chain: string[], tokens: number, warnings: string[], files: Record<string, Record<string, string | object>> }>}
 *   `files[target]` maps a path RELATIVE TO THAT TARGET'S OUTPUT DIRECTORY to its content.
 */
export async function buildProductSystem({ layerFile, layers, dir, targets = TARGETS, kotlinPackage, command = 'tanrei build' }) {
  const input = layers ? { layers, dir } : { layerFile };
  const unknown = targets.filter((t) => !TARGETS.includes(t));
  if (unknown.length) throw new Error(`unknown target(s): ${unknown.join(', ')}. Known: ${TARGETS.join(', ')}`);
  if (targets.includes('compose') && !kotlinPackage) throw new Error('the compose target needs "kotlinPackage": the package of the module the file is written into');

  // Validated, then built and read back from the bundle — all in memory (resolve.js).
  const resolved = await resolveSystem(input);
  const { id, chain, files: bundle } = resolved;
  const model = await resolved.model();
  const { failures: warnings, checked } = await resolved.audit();
  const sourceName = layerFile ? path.basename(layerFile) : `${id}${LAYER_SUFFIX}`;

  const previous = [...GENERATED_HEADER];
  // The parents nearest first. Every chain starts at the root, so the root is named only when it is the one parent.
  const parents = chain.slice(0, -1).map((l) => l.id).reverse();
  GENERATED_HEADER[1] = `Source: ${sourceName} (extends ${(parents.length > 1 ? parents.filter((parent) => parent !== ROOT_SYSTEM) : parents).join(' ← ')}). Regenerate with \`${command}\`.`;
  try {
    const ir = buildIR(model);
    // The native targets type the system with the whole vocabulary: a component that lives in a layer the product does
    // not extend is valued with the product's own tokens there (`nativeChain`), as the shipped systems' native outputs are.
    const held = heldComponents(listSystems(REPO_ROOT), (layer) => loadSystem(REPO_ROOT, layer));
    const standIns = outsideStandIns(listSystems(REPO_ROOT), (layer) => loadSystem(REPO_ROOT, layer));
    const native = nativeChain(chain, held);
    const nativeIr = native === chain || !targets.some((t) => NATIVE.has(t)) ? ir : buildIR(await (await resolveChain(native, { model: false })).model());
    const note = warnings.length ? `⚠ ${warnings.length} accessibility/structure warning(s) in system "${id}" — see a11y-report.json in the tokens output.` : null;
    const flat = (emitted) => Object.fromEntries(Object.entries(emitted).map(([file, text]) => [path.basename(file), note ? `// ${note}\n${text}` : text]));
    const all = {
      tokens: () => ({ ...bundle, 'a11y-report.json': { system: id, severity: 'warning', checked: checkedPairs(checked), count: warnings.length, warnings }, 'components.json': productComponents(chain, held, command) }),
      // The product's sheet says what its system does not have and what it uses instead, as a shipped system's does:
      // declared in its own scope, so that an element there reads the product's lists and not the default system's from `:root`.
      web: () => ({ [`${id}.css`]: (note ? `/* ${note} */\n` : '') + emitCss(model, { scope: id, ...sheetAvailability(chain, held, standIns) }), ...webRegistry(ir, id) }),
      swiftui: () => flat(emitSwift(nativeIr, { external: true })),
      compose: () => flat(emitKotlin(nativeIr, { externalPackage: kotlinPackage })),
      flutter: () => flat(emitDart(nativeIr, { external: true })),
      'react-native': () => flat(emitTs(nativeIr, { external: true })),
      tailwind: () => ({ [`${id}.tailwind.css`]: emitTailwindTheme(model) }),
      shadcn: () => ({ [`${id}.shadcn.css`]: emitShadcnTheme(model) }),
    };
    return {
      id,
      chain: chain.map((l) => l.id),
      tokens: Object.keys(model.tokens).length,
      warnings,
      // The named font families this system references, per use: { text, icons, styles, families, warnings }.
      fonts: fontReport(ir),
      // The glyph names the components may draw and the axis values this system draws icons at: what the product
      // cuts its icon font down to, with its own names. `names` is null where no generated list is at hand.
      glyphs: { names: componentGlyphs(), axes: iconAxesOf(ir) },
      names: { swiftui: `TanreiSystem.${pascal([id]).replace(/^./, (ch) => ch.toLowerCase())}`, compose: `TanreiSystem.${pascal([id])}`, flutter: dartSystemNames(id).constant, 'react-native': pascal([id]).replace(/^./, (ch) => ch.toLowerCase()) },
      files: Object.fromEntries(targets.map((t) => [t, all[t]()])),
    };
  } finally {
    GENERATED_HEADER.splice(0, GENERATED_HEADER.length, ...previous);
  }
}
