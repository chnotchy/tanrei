// Node wiring of the page sheet (./sheet.js `createPageSheet`): the same inputs its worker is given (./sheet-data.ts),
// read from the repository on disk — the token documents without their prose, every shipped layer as its index, the
// default system's chain whole, any other shipped layer read when a chain needs it — with the build's own emitter and
// the layers' rules. A host that computes a layer's sheet where the site is built (the documentation's sheets of the
// shipped systems, which a page applies on its root) computes it with this, so that it is the sheet the worker gives a
// reader's own theme, character for character. And a shipped system's sheet scoped to `[data-<ns>-system="<id>"]`, as
// the build writes each preset's (`scopedSheet`): for a host that draws the default system inside a page drawn in
// another (a figure that compares systems).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createPaletteEngine } from '@tanrei/token-engine';
import { emitCss } from '@tanrei/tokens-build/emit/css';
import { ROOT_SYSTEM, heldComponents, layerChain, outsideStandIns, sheetAvailability } from '@tanrei/tokens-build/layers';
import { createPageSheet, systemOf } from './sheet.js';
import { layerIndex, withoutProse } from './sheet-sources.js';

/** A sheet's declarations by the rule they stand in, with its selectors and at-rules (./sheet.js). */
export { sheetRules } from './sheet.js';

/** The repository this package stands in. */
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const json = (rel) => JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));

// material-color-utilities: its entry has extensionless imports Node cannot load, and `exports` blocks deep
// specifiers, so the two leaf modules the engine needs are loaded by file path (as packages/tokens-build does).
const require = createRequire(import.meta.url);
const mcuRoot = path.dirname(require.resolve('@material/material-color-utilities'));
const leaf = (file) => import(pathToFileURL(path.join(mcuRoot, file)).href);
const { Hct } = await leaf('hct/hct.js');
const { TonalPalette } = await leaf('palettes/tonal_palette.js');

/** Every shipped layer, whole, by id (tokens/systems/<id>.system.json). */
export function shippedLayers() {
  return Object.fromEntries(
    fs
      .readdirSync(path.join(repoRoot, 'tokens/systems'))
      .filter((file) => file.endsWith('.system.json'))
      .map((file) => {
        const layer = json(`tokens/systems/${file}`);
        return [layer.id, layer];
      }),
  );
}

/** The token documents the default resolver names, and those of the components that live in a layer, without their prose, keyed by path relative to tokens/. */
function sheetSources(resolver) {
  const refs = Object.values(resolver.sets)
    .flatMap((set) => set.sources.map((source) => source.$ref))
    .filter((ref) => !ref.startsWith('generated/'));
  const held = fs
    .readdirSync(path.join(repoRoot, 'tokens/systems'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => fs.readdirSync(path.join(repoRoot, 'tokens/systems', entry.name, 'comp')).map((file) => `systems/${entry.name}/comp/${file}`));
  return Object.fromEntries([...refs, ...held].map((ref) => [ref, withoutProse(json(`tokens/${ref}`))]));
}

/**
 * The page sheet, computed in Node from the repository's files: `pageSheet(layer)` as the worker answers it. `onLoad`
 * hears each shipped layer read beyond the default system's chain, by id.
 * @param {{ onLoad?: (id: string) => void }} [options]
 */
export function nodePageSheet({ onLoad } = {}) {
  const config = json('tanrei.config.json');
  const resolver = json('tokens/tanrei.resolver.json');
  const shipped = shippedLayers();
  const defaultId = Object.hasOwn(shipped, config.namespace) ? config.namespace : ROOT_SYSTEM;
  return createPageSheet({
    config,
    sources: sheetSources(resolver),
    vocabulary: json('tokens/sys/color.vocabulary.json'),
    resolver,
    shipped: Object.fromEntries(Object.values(shipped).map((layer) => [layer.id, layerIndex(layer)])),
    preloaded: layerChain(defaultId, (id) => shipped[id]),
    load: async (id) => {
      onLoad?.(id);
      if (!Object.hasOwn(shipped, id)) throw new Error(`no shipped layer "${id}"`);
      return shipped[id];
    },
    mcu: { Hct, TonalPalette },
    emitCss,
    sheetAvailability,
    heldComponents,
    outsideStandIns,
  });
}

/**
 * A shipped system's whole sheet scoped to `[data-<ns>-system="<id>"]`, computed from the repository's files with the
 * build's pipeline and emitter: what `tanrei build` writes as a preset's `systems/<id>.css` (without its banner), and
 * the same for the default system, which the build writes only unscoped, on the root.
 * @param {string} id
 */
export function scopedSheet(id) {
  const config = json('tanrei.config.json');
  const resolver = json('tokens/tanrei.resolver.json');
  const shipped = shippedLayers();
  const ids = Object.keys(shipped);
  const read = (each) => shipped[each];
  const modelOf = (chain) =>
    systemOf(chain, {
      namespace: config.namespace,
      sources: sheetSources(resolver),
      vocabulary: json('tokens/sys/color.vocabulary.json'),
      resolver,
      engine: createPaletteEngine({ Hct, TonalPalette }),
      lend: (each) => (Object.hasOwn(shipped, each) ? shipped[each] : undefined),
    }).model;
  const chain = layerChain(id, read);
  const model = modelOf(chain);
  // Drawn under the default system's sheet, as the build writes it: its contrast rules restate the default system's.
  const defaultId = Object.hasOwn(shipped, config.namespace) ? config.namespace : ROOT_SYSTEM;
  const defaultModel = id === defaultId ? model : modelOf(layerChain(defaultId, read));
  return emitCss(model, { scope: id, defaultModel, ...sheetAvailability(chain, heldComponents(ids, read), outsideStandIns(ids, read)) });
}
