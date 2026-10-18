// Browser wiring of the Studio core: the repository's own files, bundled — never a hand-kept copy.
//
// material-color-utilities@0.4.0: the package's barrel uses extensionless imports, which break under
// Node's ESM loader (see packages/tokens-build/src/mcu.js) but resolve fine in a bundler. Vite resolves the
// bare specifier and tree-shakes the barrel down to Hct + TonalPalette and what they import.
import { Hct, TonalPalette } from '@material/material-color-utilities';
// A virtual module: the layer schema, compiled at build time (../vite-plugin.js, declared in ./virtual.d.ts).
import validate from 'virtual:tanrei-studio/validate-layer';
import config from '../../../tanrei.config.json';
import vocabulary from '../../../tokens/sys/color.vocabulary.json';
import resolver from '../../../tokens/tanrei.resolver.json';
// The generated status file, written from the specs: each component's level, listing and members (./listing.js).
import status from '../../../docs/status/status.json';
// The build's own emitter and invariants; their filesystem-bound import is swapped by ../vite-plugin.js.
import { emitCss, idToVar } from '@tanrei/tokens-build/emit/css';
import { cssColor } from '@tanrei/tokens-build/pure';
import { heldComponents, outsideStandIns, sheetAvailability } from '@tanrei/tokens-build/layers';
import { checkInvariants, contrast } from '@tanrei/tokens-build/invariants';
import { createStudio } from './core.js';
import { catalogOf } from './listing.js';

type Json = Record<string, any>;

const tokenFiles = import.meta.glob<Json>('../../../tokens/{dial,ref,sys,comp}/*.tokens.json', { eager: true, import: 'default' });
const layerFiles = import.meta.glob<Json>('../../../tokens/systems/*.system.json', { eager: true, import: 'default' });
// The documents of the components that live in a layer, read by the systems that have them.
const heldFiles = import.meta.glob<Json>('../../../tokens/systems/*/comp/*.tokens.json', { eager: true, import: 'default' });

// The hand-authored sources the default resolver names, keyed exactly as the build keys them.
const byRef = Object.fromEntries(Object.entries(tokenFiles).map(([file, doc]) => [file.split('/tokens/').pop()!, doc]));
const sources = Object.fromEntries(
  Object.values(resolver.sets as Json)
    .flatMap((set: Json) => set.sources.map((source: Json) => source.$ref as string))
    .filter((ref: string) => !ref.startsWith('generated/'))
    .map((ref: string) => [ref, byRef[ref]]),
);
for (const [file, doc] of Object.entries(heldFiles)) sources[file.split('/tokens/').pop()!] = doc;
const layers = Object.fromEntries(Object.values(layerFiles).map((layer) => [layer.id, layer]));

export const studio = createStudio({
  config,
  sources,
  vocabulary,
  resolver,
  layers,
  mcu: { Hct, TonalPalette },
  // Full JSON-Schema validation against tokens/schema/system.schema.json, in the browser.
  validateSchema: (layer: object) => (validate(layer) ? [] : (validate.errors ?? []).map((e: Json) => `${e.instancePath || '/'} ${e.message}`)),
  emitCss,
  heldComponents,
  outsideStandIns,
  sheetAvailability,
  checkInvariants,
  contrast,
  idToVar,
  cssColor,
  catalog: catalogOf(status),
});
export type Studio = typeof studio;
