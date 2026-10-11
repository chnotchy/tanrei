#!/usr/bin/env node
// The platform test fixtures (a product layer, "acme", and a tone-per-state system) are built by the token pipeline
// from layer files under test, but each package owns its script. `pnpm generate` runs them after turbo's generate so a
// token change leaves no fixture stale. `--check` exits 1 on a stale fixture.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = [
  'packages/swiftui/scripts/generate-acme-fixture.mjs',
  'packages/compose/scripts/generate-acme-fixture.mjs',
  'packages/flutter/tool/generate_acme_fixture.mjs',
  'packages/react-native/scripts/acme-fixture.mjs',
];
const check = process.argv.includes('--check');
let failed = false;
for (const script of SCRIPTS) {
  try {
    execFileSync(process.execPath, [path.join(root, script), ...(check ? ['--check'] : [])], { cwd: root, stdio: 'inherit' });
  } catch {
    failed = true;
    console.error(`✖ ${script}${check ? ' --check' : ''} failed`);
  }
}
process.exit(failed ? 1 : 0);
