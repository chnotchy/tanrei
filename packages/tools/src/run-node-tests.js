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
 * A file's weight: its seconds, or the median of the weights' seconds for a file they do not name (1 when they name
 * none) — a new file runs, in some shard, before anyone has measured it.
 * @param {Record<string, number | string | string[]>} weights
 * @returns {(file: string) => number}
 */
export function weigher(weights) {
  const known = Object.values(weights).filter((value) => typeof value === 'number').sort((a, b) => a - b);
  const median = known.length === 0 ? 1 : known.length % 2 ? known[(known.length - 1) / 2] : (known[known.length / 2 - 1] + known[known.length / 2]) / 2;
  return (file) => (typeof weights[file] === 'number' ? weights[file] : median);
}

/**
 * The files longest first by their weights, the files of one weight by name: the order a shard starts its files in,
 * and the order the shards are dealt them in. A job runs its files a few at a time (`--test-concurrency`, by default
 * the cores less one: three on CI's 4 cores), each as a place comes free; in name order a long file whose name comes
 * late started only as the others ended and ran alone at the end — the eighth docs browser job of CI run 45993351303,
 * whose files weigh 2145 s, about 715 s at best three at a time, would take about 940 s that way, its 620 s page
 * actions started last, and it reached its 20-minute limit. Started longest first, the short files fill in beside
 * the long ones.
 * @param {string[]} files
 * @param {Record<string, number | string | string[]>} weights
 * @returns {string[]}
 */
export function longestFirst(files, weights) {
  const weightOf = weigher(weights);
  return [...files].sort((a, b) => weightOf(b) - weightOf(a) || (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * How long a job runs files of these seconds, started in this order `at` at a time, each as a place comes free (the
 * earliest free place; the lower one on a tie): what the order of a shard's files costs, without a run.
 * @param {number[]} seconds in the order the files start
 * @param {number} at how many run at once
 * @returns {number}
 */
export function jobSeconds(seconds, at) {
  const free = Array.from({ length: Math.max(1, at) }, () => 0);
  for (const s of seconds) {
    const k = free.indexOf(Math.min(...free));
    free[k] += s;
  }
  return Math.max(...free);
}

/**
 * The files split into `total` shards of about the same time: longest first, each to the shard that has the least so
 * far (the lower index on a tie), the files of one weight taken by name — the same split on every machine, whatever
 * order the files were found in. A file the weights do not name weighs their median: a new file runs, in some shard,
 * before anyone has measured it. Each shard's files are in name order (a shard starts them longest first: weightedShard).
 *
 * A file the weights list under `$alone` takes a shard of its own, the first ones, and the others share the rest: a
 * file that keeps the machine busy for its whole run slows every file beside it (the docs' fixture gallery, about two
 * thirds of a job, made the pages of the files run with it take more than 30 s to load in WebKit), which a split by
 * time alone cannot see. A file of `$alone` that is not among the files is skipped.
 *
 * `start` is the seconds each shard has before any file (the first web Chromium shard's Node tests, which run after
 * its Playwright tests): the dealing counts them, and each shard's `seconds` includes them.
 * @param {string[]} files
 * @param {Record<string, number | string | string[]>} weights seconds by file, and `$alone`
 * @param {number} total
 * @param {number[]} [start] seconds by shard, from the first; a shard not named starts at 0
 * @returns {{ files: string[], seconds: number, guessed: string[] }[]}
 */
export function balance(files, weights, total, start = []) {
  const alone = (Array.isArray(weights.$alone) ? weights.$alone : []).filter((file) => files.includes(file)).sort();
  if (alone.length >= total) throw new Error(`the weights put ${alone.length} files in shards of their own (${alone.join(', ')}), and there are ${total} shards: the others need at least one`);
  const weightOf = weigher(weights);
  const shards = Array.from({ length: total }, (_, k) => ({ files: [], seconds: start[k] ?? 0, guessed: [] }));
  alone.forEach((file, k) => {
    shards[k].files.push(file);
    shards[k].seconds += weightOf(file);
    if (typeof weights[file] !== 'number') shards[k].guessed.push(file);
  });
  const shared = shards.slice(alone.length);
  const order = longestFirst([...new Set(files)].filter((file) => !alone.includes(file)), weights);
  for (const file of order) {
    const least = shared.reduce((best, s) => (s.seconds < best.seconds ? s : best));
    least.files.push(file);
    least.seconds += weightOf(file);
    if (typeof weights[file] !== 'number') least.guessed.push(file);
  }
  for (const s of shards) s.files.sort();
  return shards;
}

/**
 * This shard's files, longest first by the weights (the order they start in), when the arguments name a weights file
 * (`--shard-weights=<file>`: seconds by test file, its keys relative to the weights file's directory) and `TEST_SHARD`
 * is set; null otherwise. The other arguments are the files' patterns and node --test's own flags, each flag written
 * `--flag=value`.
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
  const files = longestFirst(shards[which.index - 1].files, table).map((k) => byKey.get(k));
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
 * What run-test-files-in-order.js is given for a shard's files: node --test's flags (each written `--flag=value`) as
 * run()'s options, and the reporters — those the flags name, each to its destination, or `shown` to stdout — and
 * `report`'s, the TAP report with each file's duration. A flag it does not know is an error, not a flag left out.
 * @param {string[]} flags
 * @param {string[]} files in the order they start
 * @param {{ shown: string, report: string }} reporters
 */
export function inOrderConfig(flags, files, { shown, report }) {
  const config = { files, forceExit: false, only: false, testNamePatterns: [], reporters: [] };
  const named = [];
  const destinations = [];
  for (const flag of flags) {
    const m = /^(--[a-z-]+)(?:=(.*))?$/s.exec(flag);
    const [name, value] = m ? [m[1], m[2]] : [flag, undefined];
    const number = () => {
      if (value === undefined || !/^\d+$/.test(value)) throw new Error(`${name} needs a number, written ${name}=<n>`);
      return Number(value);
    };
    if (name === '--test-force-exit' && value === undefined) config.forceExit = true;
    else if (name === '--test-only' && value === undefined) config.only = true;
    else if (name === '--test-concurrency') config.concurrency = number();
    else if (name === '--test-timeout') config.timeout = number();
    else if (name === '--test-name-pattern' && value !== undefined) config.testNamePatterns.push(value);
    else if (name === '--test-reporter' && value !== undefined) named.push(value);
    else if (name === '--test-reporter-destination' && value !== undefined) destinations.push(value);
    else throw new Error(`a run sharded by weights takes ${flag} nowhere: run-test-files-in-order.js passes on --test-force-exit, --test-only, --test-concurrency, --test-timeout, --test-name-pattern, --test-reporter and --test-reporter-destination (each written --flag=value)`);
  }
  if (named.length !== destinations.length && !(named.length === 1 && destinations.length === 0)) throw new Error(`${named.length} --test-reporter and ${destinations.length} --test-reporter-destination: one destination each`);
  if (named.length === 0) config.reporters.push({ reporter: shown, destination: 'stdout' });
  else named.forEach((reporter, k) => config.reporters.push({ reporter, destination: destinations[k] ?? 'stdout' }));
  config.reporters.push({ reporter: pathToFileURL(path.join(here, 'file-durations-reporter.js')).href, destination: report });
  return config;
}

/**
 * Run `node --test` with these arguments; the exit status the run should have. A shard sharded by weights runs its
 * files through run-test-files-in-order.js instead, which starts them longest first: `node --test` sorts the files
 * it is given by name.
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
    console.log(`# this shard starts its files longest first, by the weights: ${weighted.files.map((file) => path.basename(file)).join(', ')}`);
  }
  // Node adds its default reporter only when no reporter is named: name it, as it would have chosen it.
  const shown = args.some((arg) => arg.startsWith('--test-reporter')) ? [] : ['--test-reporter', process.stdout.isTTY ? 'spec' : 'tap', '--test-reporter-destination', 'stdout'];
  // A run sharded by weights says how long each of its files ran, so that the weights can be measured again from its
  // log: its TAP report ends with a line for each file, printed once the run has ended.
  const command = weighted.files
    ? [path.join(here, 'run-test-files-in-order.js'), JSON.stringify(inOrderConfig(weighted.args, weighted.files, { shown: process.stdout.isTTY ? 'spec' : 'tap', report }))]
    : ['--test', ...shown, '--test-reporter', 'tap', '--test-reporter-destination', report, ...shard(env), ...weighted.args];
  const run = spawnSync(process.execPath, command, { cwd, env, stdio });
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
  // A signal that reached this process while spawnSync held it (Ctrl-C reaches the whole process group; a job's
  // timeout may signal this process alone) is pending, and its listener in test-tmp.js — sweep, then end by that
  // signal — runs only when the event loop polls once more. Without this turn the process would exit first, with the
  // run's status instead of the signal.
  setImmediate(() => {});
}
