// Bundles the server with the pipeline (tokens-build + token-engine are not published on their own) and copies
// what it reads at run time — tokens/ (sources, plus the presets' fidelity reports), tanrei.config.json and the mimicry-gaps registry — so it works in a
// product's repository with nothing else checked out. Same approach as packages/cli.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const dist = path.join(pkg, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
await build({
  entryPoints: [path.join(pkg, 'src/server.js')],
  outfile: path.join(dist, 'server.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // Real dependencies of the published package; everything from the workspace is inlined.
  external: ['@material/material-color-utilities', '@modelcontextprotocol/sdk', '@modelcontextprotocol/sdk/*', '@terrazzo/parser', 'ajv', 'ajv/*'],
  banner: { js: '// Bundled from the Tanrei monorepo (packages/mcp, packages/tokens-build, packages/token-engine).' },
});

const vocabulary = path.join(dist, 'vocabulary');
fs.mkdirSync(path.join(vocabulary, 'docs/governance'), { recursive: true });
fs.copyFileSync(path.join(repo, 'tanrei.config.json'), path.join(vocabulary, 'tanrei.config.json'));
fs.copyFileSync(path.join(repo, 'docs/governance/mimicry-gaps.json'), path.join(vocabulary, 'docs/governance/mimicry-gaps.json'));
// Sources only: tokens/generated/ is build output, and the server computes every system from its layers…
fs.cpSync(path.join(repo, 'tokens'), path.join(vocabulary, 'tokens'), { recursive: true, filter: (source) => path.relative(repo, source) !== path.join('tokens', 'generated') });
// …except the measured fidelity reports (tokens/generated/<id>/fidelity.json), which list_systems reads as they are.
for (const entry of fs.readdirSync(path.join(repo, 'tokens/generated'), { withFileTypes: true })) {
  const report = path.join('tokens/generated', entry.name, 'fidelity.json');
  if (!entry.isDirectory() || !fs.existsSync(path.join(repo, report))) continue;
  fs.mkdirSync(path.dirname(path.join(vocabulary, report)), { recursive: true });
  fs.copyFileSync(path.join(repo, report), path.join(vocabulary, report));
}
console.log('✔ mcp: dist/server.js, dist/vocabulary/');
