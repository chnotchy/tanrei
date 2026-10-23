#!/usr/bin/env node
// `node --test`, failing when anything failed: every package's Node test script runs through this.
//
//   node ../../packages/tools/src/run-node-tests.js [the arguments of node --test…]      (run from the package's directory)
//   TEST_SHARD=2/3 pnpm --filter <package> <script>                                      (one share of the files: shard below)
//
// Why: some Node versions report a failure without counting it. On Node 22.13, a suite whose `describe` body throws
// (a file it reads is missing, say) or rejects, and an `after` hook inside a `describe` that throws, are printed as
// `not ok` while the summary says `fail 0` and the process exits 0, so a run is green while a whole suite never ran.
// Node 24 sets the exit code but still prints `fail 0`. This runs `node --test` with the reporter it would have used,
// writes a second, TAP report to a temporary file, and exits non-zero when the runner did, or when that report holds
// any `not ok` that is not a TODO. The guard is packages/tools/test/run-node-tests.test.js.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from './test-tmp.js';

/**
 * The `not ok` lines of a TAP report that are failures (a TODO that fails is not one), at any depth.
 * @param {string} tap
 * @returns {string[]}
 */
export function uncountedFailures(tap) {
  return tap
    .split('\n')
    .filter((line) => /^\s*not ok \d+\b/.test(line) && !/\s#\s*TODO\b/i.test(line))
    .map((line) => line.trim());
}

/**
 * `--test-shard` for the shard `TEST_SHARD` names (`<index>/<total>`, from 1), or nothing: a CI job that runs one share
 * of a package's test files sets it, and the package's script stays the same. Node takes the flag only before the
 * files' patterns (after them it is ignored, and every file runs), so it is put there; it gives each shard every
 * `total`-th file of the sorted list, so the shards together run every file once.
 * @param {NodeJS.ProcessEnv} env
 * @returns {string[]}
 */
export function shard(env) {
  const value = env.TEST_SHARD;
  if (!value) return [];
  const m = /^(\d+)\/(\d+)$/.exec(value);
  if (!m || +m[1] < 1 || +m[1] > +m[2]) throw new Error(`TEST_SHARD is "${value}": it is <index>/<total>, the index from 1 to the total`);
  return [`--test-shard=${value}`];
}

/**
 * Run `node --test` with these arguments; the exit status the run should have.
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, stdio?: import('node:child_process').StdioOptions }} [options]
 * @returns {number}
 */
export function runNodeTests(args, { cwd = process.cwd(), env = process.env, stdio = 'inherit' } = {}) {
  const report = path.join(tempDir('node-test'), 'report.tap');
  // Node adds its default reporter only when no reporter is named: name it, as it would have chosen it.
  const shown = args.some((arg) => arg.startsWith('--test-reporter')) ? [] : ['--test-reporter', process.stdout.isTTY ? 'spec' : 'tap', '--test-reporter-destination', 'stdout'];
  const run = spawnSync(process.execPath, ['--test', ...shown, '--test-reporter', 'tap', '--test-reporter-destination', report, ...shard(env), ...args], { cwd, env, stdio });
  if (run.error) throw run.error;
  if (run.signal) {
    console.error(`✖ node --test: ended by ${run.signal}`);
    return 1;
  }
  if (run.status !== 0) return run.status ?? 1;
  const failures = fs.existsSync(report) ? uncountedFailures(fs.readFileSync(report, 'utf8')) : ['no report was written'];
  if (failures.length === 0) return 0;
  console.error(`\n✖ node --test exited 0, but ${failures.length} failure${failures.length === 1 ? ' was' : 's were'} reported and not counted (a suite that failed to load, or a hook that threw):`);
  for (const failure of failures) console.error(`  ${failure}`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runNodeTests(process.argv.slice(2));
}
