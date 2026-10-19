// Node-side wiring of the Studio core for tests: the same inputs the page bundles, read from disk, and the
// build's real emitter and invariants (the page gets those two through the bundler, see ../vite-plugin.js).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { checkInvariants, contrast } from '@tanrei/tokens-build/invariants';
import { declarations, emitCss, idToVar } from '@tanrei/tokens-build/emit/css';
import { cssColor } from '@tanrei/tokens-build/pure';
import { heldComponents, outsideStandIns, sheetAvailability } from '@tanrei/tokens-build/layers';
import { createStudio } from '../src/core.js';
import { catalogOf } from '../src/listing.js';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const json = (rel) => JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));

// material-color-utilities@0.4.0: the barrel has extensionless imports Node cannot load, and `exports`
// blocks deep specifiers, so the leaf modules are loaded by file path (as packages/tokens-build does).
const require = createRequire(import.meta.url);
const mcuRoot = path.dirname(require.resolve('@material/material-color-utilities'));
const load = (file) => import(pathToFileURL(path.join(mcuRoot, file)).href);
const { Hct } = await load('hct/hct.js');
const { TonalPalette } = await load('palettes/tonal_palette.js');

const resolver = json('tokens/tanrei.resolver.json');
const refs = Object.values(resolver.sets).flatMap((set) => set.sources.map((s) => s.$ref)).filter((ref) => !ref.startsWith('generated/'));
// …and the documents of the components that live in a layer, keyed as the engine looks them up.
const held = fs.readdirSync(path.join(repoRoot, 'tokens/systems'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((entry) => fs.readdirSync(path.join(repoRoot, 'tokens/systems', entry.name, 'comp')).map((file) => `systems/${entry.name}/comp/${file}`));
const sources = Object.fromEntries([...refs, ...held].map((ref) => [ref, json(`tokens/${ref}`)]));
export const shipped = Object.fromEntries(
  fs.readdirSync(path.join(repoRoot, 'tokens/systems')).filter((f) => f.endsWith('.system.json')).map((f) => [f.replace('.system.json', ''), json(`tokens/systems/${f}`)]),
);
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(json('tokens/schema/system.schema.json'));

export const studio = createStudio({
  config: json('tanrei.config.json'),
  sources,
  vocabulary: json('tokens/sys/color.vocabulary.json'),
  resolver,
  layers: shipped,
  mcu: { Hct, TonalPalette },
  validateSchema: (layer) => (validate(layer) ? [] : validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`)),
  emitCss,
  heldComponents,
  outsideStandIns,
  sheetAvailability,
  checkInvariants,
  contrast,
  idToVar,
  cssColor,
  declarations,
  catalog: catalogOf(json('docs/status/status.json')),
});
