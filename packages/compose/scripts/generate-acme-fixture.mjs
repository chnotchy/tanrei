// Regenerates the generated Kotlin of the test source set: what a PRODUCT gets from `tanrei build` for its own layer,
// compiled in ANOTHER package than the library, exactly as it would be in a product's module.
//
//   com/acme/design/TanreiSystemAcme.kt                  packages/tokens-build/test/fixtures/acme.system.json
//       a layer that extends the vocabulary in every way a layer may (TanreiButtonExtensionsTest, TanreiAxesTest …)
//   com/toneperstate/design/TanreiSystemTonePerState.kt  packages/tokens-build/test/fixtures/tone-per-state.system.json
//       a layer whose filled Button takes hovered / pressed from a non-monotonic `tone` rule, different in every
//       scheme: those two colors are `TanreiPaint.Scheme` (TanreiPaintTest, TanreiButtonPerSchemeTest)
//
//   node packages/compose/scripts/generate-acme-fixture.mjs          # write
//   node packages/compose/scripts/generate-acme-fixture.mjs --check  # exit 1 when a committed fixture is stale
//
// Creates no temporary directory: the build is in memory and the only files written are the fixtures themselves.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductSystem } from '../../tokens-build/src/product.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const COMMAND = 'node packages/compose/scripts/generate-acme-fixture.mjs';
const FIXTURES = [
  { layer: 'acme.system.json', kotlinPackage: 'com.acme.design' },
  { layer: 'tone-per-state.system.json', kotlinPackage: 'com.toneperstate.design' },
];

async function kotlinOf(layerFile, kotlinPackage) {
  return (await buildProductSystem({ layerFile, targets: ['compose'], kotlinPackage, command: COMMAND })).files.compose;
}

let stale = 0;
for (const { layer, kotlinPackage } of FIXTURES) {
  const layerFile = path.resolve(here, '../../tokens-build/test/fixtures', layer);
  const outDir = path.resolve(here, '../tanrei/src/test/kotlin', ...kotlinPackage.split('.'));
  for (const [name, text] of Object.entries(await kotlinOf(layerFile, kotlinPackage))) {
    const target = path.join(outDir, name);
    if (process.argv.includes('--check')) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== text) { console.error(`✖ stale: ${target}`); stale += 1; }
      continue;
    }
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(target, text);
    console.log(`✔ ${path.relative(process.cwd(), target)}`);
  }
}
process.exit(stale ? 1 : 0);
