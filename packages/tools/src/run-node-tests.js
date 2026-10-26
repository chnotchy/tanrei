#!/usr/bin/env node
// `node --test`, failing when anything failed: every package's Node test script runs through this.
//
//   node ../../packages/tools/src/run-node-tests.js [the arguments of node --test…]      (run from the package's directory)
//   TEST_SHARD=2/3 pnpm --filter <package> <script>                                      (one share of the files: shard below)
//   node …/run-node-tests.js --shard-weights=<durations.json> [patterns…]                (shares of about equal time: balance)
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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DURATION_LINE } from './file-durations-reporter.js';
import { tempDir } from './test-tmp.js';

const here = path.dirname(fileURLToPath(import.meta.url));

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
 * The shard `TEST_SHARD` names (`<index>/<total>`, from 1), or null: a CI job that runs one share of a package's test
 * files sets it, and the package's script stays the same.
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ index: number, total: number } | null}
 */
export function shardOf(env) {
  const value = env.TEST_SHARD;
  if (!value) return null;
  const m = /^(\d+)\/(\d+)$/.exec(value);
  if (!m || +m[1] < 1 || +m[1] > +m[2]) throw new Error(`TEST_SHARD is "${value}": it is <index>/<total>, the index from 1 to the total`);
  return { index: +m[1], total: +m[2] };
}

/**
 * `--test-shard` for the shard `TEST_SHARD` names, or nothing: what a package without a weights file shards by. Node
 * takes the flag only before the files' patterns (after them it is ignored, and every file runs), so it is put there;
 * it gives each shard every `total`-th file of the sorted list, so the shards together run every file once — blind to
 * how long each file runs.
 * @param {NodeJS.ProcessEnv} env
 * @returns {string[]}
 */
export function shard(env) {
  return shardOf(env) ? [`--test-shard=${env.TEST_SHARD}`] : [];
}

/**
 * The files split into `total` shards of about the same time: longest first, each to the shard that has the least so
 * far (the lower index on a tie), the files of one weight taken by name — the same split on every machine, whatever
 * order the files were found in. A file the weights do not name weighs their median: a new file runs, in some shard,
 * before anyone has measured it. Each shard's files are in name order.
 * @param {string[]} files
 * @param {Record<string, number>} weights seconds by file
 * @param {number} total
 * @returns {{ files: string[], seconds: number, guessed: string[] }[]}
 */
export function balance(files, weights, total) {
  const known = Object.values(weights).filter((value) => typeof value === 'number').sort((a, b) => a - b);
  const median = known.length === 0 ? 1 : known.length % 2 ? known[(known.length - 1) / 2] : (known[known.length / 2 - 1] + known[known.length / 2]) / 2;
  const weightOf = (file) => (typeof weights[file] === 'number' ? weights[file] : median);
  const shards = Array.from({ length: total }, () => ({ files: [], seconds: 0, guessed: [] }));
  const order = [...new Set(files)].sort((a, b) => weightOf(b) - weightOf(a) || (a < b ? -1 : a > b ? 1 : 0));
  for (const file of order) {
    const least = shards.reduce((best, s) => (s.seconds < best.seconds ? s : best));
    least.files.push(file);
    least.seconds += weightOf(file);
    if (typeof weights[file] !== 'number') least.guessed.push(file);
  }
  for (const s of shards) s.files.sort();
  return shards;
}

/**
 * This shard's files, when the arguments name a weights file (`--shard-weights=<file>`: seconds by test file, its keys
 * relative to the weights file's directory) and `TEST_SHARD` is set; null otherwise. The other arguments are the
 * files' patterns and node --test's own flags, each flag written `--flag=value`.
 * @param {string[]} args
 * @param {{ cwd: string, env: NodeJS.ProcessEnv }} options
 * @returns {{ args: string[], weights: string | null, files: string[] | null, shards: ReturnType<typeof balance> | null, index: number }}
 */
export function weightedShard(args, { cwd, env }) {
  let weights = null;
  const rest = [];
  for (const arg of args) {
    if (arg.startsWith('--shard-weights=')) weights = path.resolve(cwd, arg.slice('--shard-weights='.length));
    else rest.push(arg);
  }
  const which = shardOf(env);
  if (!weights || !which) return { args: rest, weights, files: null, shards: null, index: 0 };
  const table = JSON.parse(fs.readFileSync(weights, 'utf8'));
  const base = path.dirname(weights);
  const key = (file) => path.relative(base, path.resolve(cwd, file)).split(path.sep).join('/');
  const patterns = rest.filter((arg) => !arg.startsWith('-'));
  if (patterns.length === 0) throw new Error(`--shard-weights needs the test files' patterns: name them after it`);
  const found = [...new Set(patterns.flatMap((pattern) => fs.globSync(pattern, { cwd })))].sort();
  const byKey = new Map(found.map((file) => [key(file), file]));
  const shards = balance([...byKey.keys()], table, which.total);
  const files = shards[which.index - 1].files.map((k) => byKey.get(k));
  return { args: rest.filter((arg) => arg.startsWith('-')), weights, files, shards, index: which.index };
}

/** The lines that say how the files were split, for the log: `# ` before each, a TAP comment. */
export function describeShards(shards, index) {
  const lines = [`shards by measured time (the weights' seconds; a file they do not name weighs their median):`];
  shards.forEach((s, k) => {
    const mark = k + 1 === index ? '→' : ' ';
    lines.push(`${mark} ${k + 1}/${shards.length}: ${Math.round(s.seconds)} s — ${s.files.join(', ') || 'no files'}${s.guessed.length ? ` (median for ${s.guessed.join(', ')})` : ''}`);
  });
  return lines.map((line) => `# ${line}`).join('\n');
}

/**
 * Run `node --test` with these arguments; the exit status the run should have.
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, stdio?: import('node:child_process').StdioOptions }} [options]
 * @returns {number}
 */
export function runNodeTests(args, { cwd = process.cwd(), env = process.env, stdio = 'inherit' } = {}) {
  const report = path.join(tempDir('node-test'), 'report.tap');
  const weighted = weightedShard(args, { cwd, env });
  if (weighted.files) {
    console.log(describeShards(weighted.shards, weighted.index));
    if (weighted.files.length === 0) return 0; // more shards than files: with no file named, node --test would run its default patterns
  }
  // Node adds its default reporter only when no reporter is named: name it, as it would have chosen it.
  const shown = args.some((arg) => arg.startsWith('--test-reporter')) ? [] : ['--test-reporter', process.stdout.isTTY ? 'spec' : 'tap', '--test-reporter-destination', 'stdout'];
  // A run sharded by weights says how long each of its files ran, so that the weights can be measured again from its
  // log: its TAP report ends with a line for each file, printed once the run has ended.
  const reporter = weighted.files ? pathToFileURL(path.join(here, 'file-durations-reporter.js')).href : 'tap';
  const tail = weighted.files ? [...weighted.args, ...weighted.files] : [...shard(env), ...weighted.args];
  const run = spawnSync(process.execPath, ['--test', ...shown, '--test-reporter', reporter, '--test-reporter-destination', report, ...tail], { cwd, env, stdio });
  if (run.error) throw run.error;
  if (weighted.files && fs.existsSync(report)) {
    const lines = fs.readFileSync(report, 'utf8').match(DURATION_LINE) ?? [];
    if (lines.length) console.log(`# seconds each file ran (packages/tools/src/shard-weights.js reads them):\n${lines.join('\n')}`);
  }
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
