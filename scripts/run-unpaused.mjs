#!/usr/bin/env node
// Runs a turbo task over the workspace minus the packages of the paused native platforms
// (packages/tools/paused-platforms.json, the list CI's changes job reads), so the root `pnpm build`, `pnpm test` and
// `pnpm check` check what CI checks and nothing CI does not. A paused platform is still run on its own:
// `pnpm --filter @tanrei/<platform> test`.
//
//   node scripts/run-unpaused.mjs <task> [turbo options…]
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

const [task, ...rest] = process.argv.slice(2);
if (!task) {
  console.error('usage: node scripts/run-unpaused.mjs <task> [turbo options…]');
  process.exit(2);
}

const config = read('tanrei.config.json');
const { paused } = read('packages/tools/paused-platforms.json');
const natives = config.platforms.filter((p) => p !== 'web');
for (const p of paused) {
  if (!natives.includes(p)) {
    console.error(`packages/tools/paused-platforms.json names '${p}', which is not a native platform (${natives.join(', ')})`);
    process.exit(2);
  }
}

const filters = paused.map((p) => `--filter=!${config.packages.npmScope}/${p}`);
if (paused.length > 0) {
  console.log(`Paused, not run: ${paused.join(', ')} (packages/tools/paused-platforms.json; CONTRIBUTING.md#native-ci-is-paused)`);
}
const result = spawnSync('turbo', ['run', task, ...filters, ...rest], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
