// Regenerates the SwiftUI test fixture of a design system that EXTENDS the vocabulary:
//   packages/swiftui/Tests/AcmeFixture/TanreiSystem+Acme.swift
// from packages/tokens-build/test/fixtures/acme.system.json, through the same code path a product uses
// (`tanrei build`, target `swiftui`). The file is compiled as its own module (target `AcmeFixture` in
// Package.swift), the way a product compiles it: it sees only Tanrei's PUBLIC API.
//
//   node packages/swiftui/scripts/generate-acme-fixture.mjs           write the fixture
//   node packages/swiftui/scripts/generate-acme-fixture.mjs --check   exit 1 if the committed fixture is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductSystem } from '../../tokens-build/src/product.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(root);
const layerFile = 'packages/tokens-build/test/fixtures/acme.system.json';
const outDir = 'packages/swiftui/Tests/AcmeFixture';


async function build() {
  try {
    return (await buildProductSystem({ layerFile, targets: ['swiftui'] })).files;
  } catch (error) {
    if (!/Extensions are delivered to the tokens and web targets today/.test(error.message)) throw error;
    // INTERIM: product.js still refuses native targets for a system that extends the vocabulary. Until that
    // guard is removed, do exactly what it does after the guard. DELETE this fallback (and these imports) then.
    return { swiftui: await withoutGuard() };
  }
}

async function withoutGuard() {
  const os = await import('node:os');
  const { buildBundle, layerChain } = await import('../../tokens-build/src/bundle.js');
  const { productLayerReader, systemIdOf } = await import('../../tokens-build/src/product.js');
  const { GENERATED_HEADER, REPO_ROOT, buildModel } = await import('../../tokens-build/src/model.js');
  const { buildIR } = await import('../../tokens-build/src/ir.js');
  const { checkInvariants } = await import('../../tokens-build/src/invariants.js');
  const { emitSwift } = await import('../../tokens-build/src/emit/swift.js');
  const id = systemIdOf(layerFile);
  const chain = layerChain(id, productLayerReader(layerFile));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tanrei-system-'));
  let model;
  try {
    for (const [name, doc] of Object.entries(buildBundle(REPO_ROOT, chain).files)) {
      fs.mkdirSync(path.dirname(path.join(tmp, name)), { recursive: true });
      fs.writeFileSync(path.join(tmp, name), JSON.stringify(doc, null, 2));
    }
    model = await buildModel(tmp, id);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const warnings = checkInvariants(model);
  const note = warnings.length ? `⚠ ${warnings.length} accessibility/structure warning(s) in system "${id}" — see a11y-report.json in the tokens output.` : null;
  const previous = [...GENERATED_HEADER];
  GENERATED_HEADER[1] = `Source: ${path.basename(layerFile)} (extends ${chain.slice(0, -1).map((l) => l.id).reverse().join(' ← ')}). Regenerate with \`tanrei build\`.`;
  try {
    return Object.fromEntries(Object.entries(emitSwift(buildIR(model), { external: true })).map(([file, text]) => [path.basename(file), note ? `// ${note}\n${text}` : text]));
  } finally {
    GENERATED_HEADER.splice(0, GENERATED_HEADER.length, ...previous);
  }
}
const files = await build();
let stale = 0;
for (const [name, text] of Object.entries(files.swiftui)) {
  const file = path.join(outDir, name);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) {
      console.error(`✖ ${file} is stale — run: node packages/swiftui/scripts/generate-acme-fixture.mjs`);
      stale += 1;
    }
  } else {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(file, text);
    console.log(`✔ ${file}`);
  }
}
process.exit(stale ? 1 : 0);
