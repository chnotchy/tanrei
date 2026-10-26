#!/usr/bin/env node
// Measure a weights file of the sharded test runner again (run-node-tests.js, `--shard-weights`) from the logs of runs
// that were sharded by it:
//
//   gh run view <run> --job <job> --log > shard-1.log      (each job of the sharded run, or a local run's output)
//   node packages/tools/src/shard-weights.js apps/docs/test/browser/durations.json shard-1.log shard-2.log shard-3.log
//
// Every such run prints `# file-duration <file> <seconds>` for each of its files (file-durations-reporter.js), the file
// relative to the package's directory. A file measured in several logs takes the mean of them; a file no log measured
// keeps its weight; the `$comment` is kept. Seconds are rounded to whole ones.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The seconds each file ran, from logs that hold `# file-duration` lines (a CI log's timestamps before them are fine).
 * @param {string[]} logs the logs' text
 * @returns {Map<string, number[]>}
 */
export function measured(logs) {
  const found = new Map();
  for (const log of logs) {
    for (const m of log.matchAll(/# file-duration (\S+) (\d+(?:\.\d+)?)\r?$/gm)) {
      if (!found.has(m[1])) found.set(m[1], []);
      found.get(m[1]).push(Number(m[2]));
    }
  }
  return found;
}

/**
 * The weights with what the logs measured written over them, keys sorted after the `$comment`.
 * @param {Record<string, unknown>} weights
 * @param {Map<string, number[]>} found by file, relative to the package's directory
 * @param {(file: string) => string} key the weights' key for a file of the logs
 * @returns {Record<string, unknown>}
 */
export function refreshed(weights, found, key) {
  const next = { ...weights };
  for (const [file, seconds] of found) next[key(file)] = Math.round(seconds.reduce((a, b) => a + b, 0) / seconds.length);
  const { $comment, ...rest } = next;
  return { ...($comment === undefined ? {} : { $comment }), ...Object.fromEntries(Object.keys(rest).sort().map((k) => [k, rest[k]])) };
}

/** The directory of the package a file is in: the nearest one above it with a package.json. */
function packageDir(file) {
  for (let dir = path.dirname(path.resolve(file)); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    if (path.dirname(dir) === dir) throw new Error(`${file} is in no package`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [weightsFile, ...logFiles] = process.argv.slice(2);
  if (!weightsFile || logFiles.length === 0) {
    console.error('usage: shard-weights.js <weights.json> <log> [<log>…]');
    process.exit(2);
  }
  const found = measured(logFiles.map((file) => fs.readFileSync(file, 'utf8')));
  if (found.size === 0) {
    console.error(`✖ no "# file-duration" line in ${logFiles.join(', ')}: they are the logs of a run sharded by weights`);
    process.exit(1);
  }
  const pkg = packageDir(weightsFile);
  const base = path.dirname(path.resolve(weightsFile));
  const key = (file) => path.relative(base, path.resolve(pkg, file)).split(path.sep).join('/');
  const weights = JSON.parse(fs.readFileSync(weightsFile, 'utf8'));
  fs.writeFileSync(weightsFile, `${JSON.stringify(refreshed(weights, found, key), null, 2)}\n`);
  console.log(`${weightsFile}: ${found.size} file${found.size === 1 ? '' : 's'} measured again`);
}
