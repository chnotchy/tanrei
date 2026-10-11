#!/usr/bin/env node
// Stop hook: an agent may not end its turn while specs and implementations disagree.
// Fast checks only (schema + parity); the full drift check runs in lefthook and CI.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
if (input.stop_hook_active) process.exit(0); // already continuing because of this hook — do not loop

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
if (!fs.existsSync(`${root}/packages/tools/node_modules`)) process.exit(0); // dependencies not installed yet

const failures = [];
for (const args of [['validate'], ['parity']]) {
  const run = spawnSync('node', ['packages/tools/src/cli.js', ...args], { cwd: root, encoding: 'utf8' });
  if (run.status !== 0) failures.push((run.stderr || run.stdout).trim());
}
if (failures.length) {
  console.error(
    `The repository disagrees with itself. Resolve this before finishing. If it truly cannot be resolved now, say so plainly: what disagrees, where, and what would resolve it.\n\n${failures.join('\n\n')}`,
  );
  process.exit(2);
}
