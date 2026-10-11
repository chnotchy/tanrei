// Generates the test fixtures under `src/components/__tests__/__fixtures__/`: the React Native output of fixture
// layers of the token pipeline, exactly as `tanrei build` writes it for a product
// (`buildProductSystem({ layerFile, targets: ['react-native'] })` — the file imports and augments
// '@tanrei/react-native' by name, as product code does). Everything happens in memory: no temporary directory.
//
//   acme.ts            packages/tokens-build/test/fixtures/acme.system.json — extends the vocabulary in every way
//                      a layer may (a series step, a color role, a Button size and variant, its own namespace).
//   tone-per-state.ts  packages/tokens-build/test/fixtures/tone-per-state.system.json — non-monotonic `tone` rules on
//                      two Button states, so those colors differ per scheme (paint kind `scheme`).
//
//   node scripts/acme-fixture.mjs           write the fixtures
//   node scripts/acme-fixture.mjs --check   exit 1 when a committed fixture is not what the pipeline produces
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from '../../tokens-build/src/model.js';
import { buildProductSystem } from '../../tokens-build/src/product.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const COMMAND = 'pnpm --filter @tanrei/react-native generate:fixtures';
const FIXTURES = ['acme', 'tone-per-state'];

let stale = false;
for (const id of FIXTURES) {
  const layerFile = path.join(REPO_ROOT, `packages/tokens-build/test/fixtures/${id}.system.json`);
  const target = path.join(here, `../src/components/__tests__/__fixtures__/${id}.ts`);
  const built = await buildProductSystem({ layerFile, targets: ['react-native'], command: COMMAND });
  const texts = Object.values(built.files['react-native']);
  if (texts.length !== 1) throw new Error(`${id}: expected one React Native file, got ${Object.keys(built.files['react-native']).join(', ')}`);
  const [text] = texts;

  if (process.argv.includes('--check')) {
    const committed = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (committed !== text) {
      console.error(`${path.relative(REPO_ROOT, target)} is stale: run \`${COMMAND}\``);
      stale = true;
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
    console.log(`wrote ${path.relative(REPO_ROOT, target)}`);
  }
}
if (stale) process.exit(1);
