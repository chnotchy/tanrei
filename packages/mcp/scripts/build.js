// Bundles the server with the pipeline (tokens-build + token-engine are not published on their own) and copies
// what it reads at run time — tokens/ (sources, plus the presets' fidelity reports and the systems' components
// manifests), the component catalog and the specs, tanrei.config.json and the mimicry-gaps registry — so it works in a
// product's repository with nothing else checked out. Same approach as packages/cli.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { writeThirdPartyLicenses } from '../../tools/src/third-party.js';

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

const vocabulary = path.join(dist, 'vocabulary');
fs.mkdirSync(path.join(vocabulary, 'docs/governance'), { recursive: true });
fs.copyFileSync(path.join(repo, 'tanrei.config.json'), path.join(vocabulary, 'tanrei.config.json'));
fs.copyFileSync(path.join(repo, 'docs/governance/mimicry-gaps.json'), path.join(vocabulary, 'docs/governance/mimicry-gaps.json'));
// Sources only: tokens/generated/ is build output, and the server computes every system from its layers…
fs.cpSync(path.join(repo, 'tokens'), path.join(vocabulary, 'tokens'), { recursive: true, filter: (source) => path.relative(repo, source) !== path.join('tokens', 'generated') });
// …except what the tools read as it is: the measured fidelity reports (tokens/generated/<id>/fidelity.json, for
// list_systems) and each shipped system's components manifest (tokens/generated/<id>/components.json, for the component tools).
for (const entry of fs.readdirSync(path.join(repo, 'tokens/generated'), { withFileTypes: true })) {
  for (const name of ['fidelity.json', 'components.json']) {
    const report = path.join('tokens/generated', entry.name, name);
    if (!entry.isDirectory() || !fs.existsSync(path.join(repo, report))) continue;
    fs.mkdirSync(path.dirname(path.join(vocabulary, report)), { recursive: true });
    fs.copyFileSync(path.join(repo, report), path.join(vocabulary, report));
  }
}
// The component catalog, which a product's components manifest is worked out from (as `tanrei build` does), at its path in the repository.
const catalog = 'packages/tokens-build/generated/component-catalog.json';
fs.mkdirSync(path.dirname(path.join(vocabulary, catalog)), { recursive: true });
fs.copyFileSync(path.join(repo, catalog), path.join(vocabulary, catalog));
// The component specs, their schema and the inventory: get_component and find_component answer from them. Written without
// indentation (the same JSON, about a third smaller).
fs.mkdirSync(path.join(vocabulary, 'specs'));
for (const name of fs.readdirSync(path.join(repo, 'specs')).filter((file) => file.endsWith('.spec.json') || file === 'inventory.json' || file === 'component.schema.json')) {
  fs.writeFileSync(path.join(vocabulary, 'specs', name), JSON.stringify(JSON.parse(fs.readFileSync(path.join(repo, 'specs', name), 'utf8'))));
}
console.log('✔ mcp: dist/server.js, dist/vocabulary/');
