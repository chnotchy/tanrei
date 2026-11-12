// Bundles the server with the pipeline (tokens-build + token-engine are not published on their own) and writes what
// it reads at run time (scripts/vocabulary.js), so it works in a product's repository with nothing else checked out.
// Same approach as packages/cli.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { writeThirdPartyLicenses } from '../../tools/src/third-party.js';
import { writeVocabulary } from './vocabulary.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const dist = path.join(pkg, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
const bundle = await build({
  entryPoints: [path.join(pkg, 'src/server.js')],
  outfile: path.join(dist, 'server.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // Real dependencies of the published package; everything from the workspace is inlined.
  external: ['@material/material-color-utilities', '@modelcontextprotocol/sdk', '@modelcontextprotocol/sdk/*', '@terrazzo/parser', 'ajv', 'ajv/*'],
  banner: { js: '// Bundled from the Tanrei monorepo (packages/mcp, packages/tokens-build, packages/token-engine).' },
  metafile: true,
});
// A dependency inlined into the bundle (none today: every third-party one is external) has its licence written beside it.
writeThirdPartyLicenses(dist, Object.keys(bundle.metafile.inputs).map((input) => path.resolve(input)), { what: 'dist/server.js' });

writeVocabulary(repo, path.join(dist, 'vocabulary'));
console.log('✔ mcp: dist/server.js, dist/vocabulary/');
