// The browser tests' runner (test/browser/run.mjs) given a word that names no test file: it fails at once, saying so,
// before it builds anything or starts a browser — `node --test` given no file would run every file of the package.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('a filter that matches no browser test file fails the run with a message, and builds and runs nothing', () => {
  const env = { ...process.env };
  delete env.TANREI_STUDIO_APP;
  const run = spawnSync(process.execPath, ['test/browser/run.mjs', 'no-such-test-file'], { cwd: pkg, env, encoding: 'utf8', timeout: 60_000 });
  assert.equal(run.signal, null, `ended by ${run.signal}`);
  assert.equal(run.status, 1, run.stdout + run.stderr);
  assert.match(run.stderr, /no test file in test\/browser matches "no-such-test-file"/);
  assert.doesNotMatch(run.stdout, /app built|browser tests ran|# tests/, 'nothing was built or run');
});
