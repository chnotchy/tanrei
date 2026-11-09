// Browser wiring of the page sheet (./sheet.js `createPageSheet`), for its worker (./sheet-worker.ts): the repository's
// own files, bundled, and only what a sheet is computed from — the token documents without their prose, every shipped
// layer as its index, the layers of the default system's chain whole, and each other shipped layer whole in a module of
// its own, loaded when a chain needs it. No schema, no checks of the build, no status, nothing of the Studio's page:
// those are ./data.ts's.
//
// The default system's chain is bundled, not loaded: every sheet is computed against it, and a module a worker imports
// while the page is loading may be fetched only once the page has loaded (WebKit holds it until then).
//
// The queries are ../vite-plugin.js's (src/sheet-sources.js `SHEET_QUERY`, `INDEX_QUERY`); `import.meta.glob` takes
// them only as they are written here.
import { Hct, TonalPalette } from 'virtual:tanrei-studio/hct';
import { defaultChain, loaders } from 'virtual:tanrei-studio/sheet-layers';
import config from '../../../tanrei.config.json';
import vocabulary from '../../../tokens/sys/color.vocabulary.json';
import resolver from '../../../tokens/tanrei.resolver.json';
import { emitCss } from '@tanrei/tokens-build/emit/css';
import { heldComponents, outsideStandIns, sheetAvailability } from '@tanrei/tokens-build/layers';
import { createPageSheet } from './sheet.js';

type Json = Record<string, any>;
/** A shipped layer as its index keeps it (./sheet-sources.js `layerIndex`). */
type Indexed = { id: string; extends?: string; vocabulary?: Json };

const tokenFiles = import.meta.glob<Json>('../../../tokens/{dial,ref,sys,comp}/*.tokens.json', { eager: true, import: 'default', query: '?tanrei-sheet' });
// The documents of the components that live in a layer, read by the systems that have them.
const heldFiles = import.meta.glob<Json>('../../../tokens/systems/*/comp/*.tokens.json', { eager: true, import: 'default', query: '?tanrei-sheet' });
const indexFiles = import.meta.glob<Indexed>('../../../tokens/systems/*.system.json', { eager: true, import: 'default', query: '?tanrei-sheet-index' });

// The hand-authored sources the default resolver names, keyed exactly as the build keys them.
const byRef = Object.fromEntries(Object.entries(tokenFiles).map(([file, doc]) => [file.split('/tokens/').pop()!, doc]));
const sources = Object.fromEntries(
  Object.values(resolver.sets as Json)
    .flatMap((set: Json) => set.sources.map((source: Json) => source.$ref as string))
    .filter((ref: string) => !ref.startsWith('generated/'))
    .map((ref: string) => [ref, byRef[ref]]),
);
for (const [file, doc] of Object.entries(heldFiles)) sources[file.split('/tokens/').pop()!] = doc;

const shipped = Object.fromEntries(Object.values(indexFiles).map((layer) => [layer.id, layer]));

export const pageSheets = createPageSheet({
  config,
  sources,
  vocabulary,
  resolver,
  shipped,
  preloaded: defaultChain,
  load: (id: string) => (Object.hasOwn(loaders, id) ? loaders[id]!() : Promise.reject(new Error(`no shipped layer "${id}"`))),
  mcu: { Hct, TonalPalette },
  emitCss,
  sheetAvailability,
  heldComponents,
  outsideStandIns,
});
