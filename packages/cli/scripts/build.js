// Bundles the pipeline (tokens-build + token-engine are not published on their own) and writes what it reads at run
// time (scripts/vocabulary.js), so the CLI works in a product's repository with nothing else checked out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { THIRD_PARTY_FILE, writeThirdPartyLicenses } from '../../tools/src/third-party.js';
import { writeVocabulary } from './vocabulary.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const dist = path.join(pkg, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
const bundle = await build({
  entryPoints: [path.join(pkg, 'src/cli.js')],
  outfile: path.join(dist, 'cli.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // Real dependencies of the published package; everything from the workspace is inlined.
  external: ['@material/material-color-utilities', '@terrazzo/parser', 'ajv', 'ajv/*'],
  banner: { js: '// Bundled from the Tanrei monorepo (packages/cli, packages/tokens-build, packages/token-engine).' },
  metafile: true,
});
// A dependency inlined into the bundle (none today: every third-party one is external) has its licence written beside it.
writeThirdPartyLicenses(dist, Object.keys(bundle.metafile.inputs).map((input) => path.resolve(input)), { what: 'dist/cli.js' });

writeVocabulary(repo, path.join(dist, 'vocabulary'));
// Theme Studio, prebuilt by packages/studio (`pnpm --filter @tanrei/studio build:app`), for `tanrei studio`.
const studio = path.join(repo, 'packages/studio/dist-app');
const hasStudio = fs.existsSync(path.join(studio, 'index.html'));
// The app bundles third-party code and fonts; their licences (THIRD_PARTY_LICENSES.md, written by its build) travel with it.
if (hasStudio && !fs.existsSync(path.join(studio, THIRD_PARTY_FILE))) throw new Error(`packages/studio/dist-app has no ${THIRD_PARTY_FILE}: rebuild the Studio app`);
if (hasStudio) fs.cpSync(studio, path.join(dist, 'studio'), { recursive: true });
else if (process.env.TANREI_REQUIRE_STUDIO) throw new Error('packages/studio/dist-app is missing: build the Studio app before packing the CLI');
console.log(`✔ cli: dist/cli.js, dist/vocabulary/${hasStudio ? ', dist/studio/' : ' (Theme Studio app not built: `tanrei studio` will say so)'}`);
