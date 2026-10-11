// Bundles the pipeline (tokens-build + token-engine are not published on their own) and copies the vocabulary
// — tokens/ and tanrei.config.json — so the CLI works in a product's repository with nothing else checked out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const dist = path.join(pkg, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
await build({
  entryPoints: [path.join(pkg, 'src/cli.js')],
  outfile: path.join(dist, 'cli.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // Real dependencies of the published package; everything from the workspace is inlined.
  external: ['@material/material-color-utilities', '@terrazzo/parser', 'ajv', 'ajv/*'],
  banner: { js: '// Bundled from the Tanrei monorepo (packages/cli, packages/tokens-build, packages/token-engine).' },
});

const vocabulary = path.join(dist, 'vocabulary');
fs.mkdirSync(vocabulary, { recursive: true });
fs.copyFileSync(path.join(repo, 'tanrei.config.json'), path.join(vocabulary, 'tanrei.config.json'));
// Sources only: tokens/generated/ is build output, and a product build never reads it.
fs.cpSync(path.join(repo, 'tokens'), path.join(vocabulary, 'tokens'), { recursive: true, filter: (source) => path.relative(repo, source) !== path.join('tokens', 'generated') });
// Theme Studio, prebuilt by packages/studio (`pnpm --filter @tanrei/studio build:app`), for `tanrei studio`.
const studio = path.join(repo, 'packages/studio/dist-app');
const hasStudio = fs.existsSync(path.join(studio, 'index.html'));
if (hasStudio) fs.cpSync(studio, path.join(dist, 'studio'), { recursive: true });
else if (process.env.TANREI_REQUIRE_STUDIO) throw new Error('packages/studio/dist-app is missing: build the Studio app before packing the CLI');
console.log(`✔ cli: dist/cli.js, dist/vocabulary/${hasStudio ? ', dist/studio/' : ' (Theme Studio app not built: `tanrei studio` will say so)'}`);
