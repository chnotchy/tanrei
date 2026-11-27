#!/usr/bin/env node
// Node's test runner over a list of files, started in the list's order: what run-node-tests.js runs a shard sharded by
// weights with, its files longest first.
//
//   node run-test-files-in-order.js '<JSON: { files, concurrency?, forceExit?, timeout?, only?, testNamePatterns?, reporters }>'
//
// Why not `node --test <files…>`: the command line sorts the files it is given by name (it globs each one and sorts the
// list), so a job's longest file, when its name comes late, starts only as the others end and runs alone at the end.
// `run()` from node:test takes `files` as they come and starts them in that order, `concurrency` at a time: the same
// runner, each file in its own process, as `node --test` uses. The reporters are composed onto its stream as the
// command line composes them (`--test-reporter` and `--test-reporter-destination`, one destination each).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { run } from 'node:test';
import * as builtIn from 'node:test/reporters';
import { pathToFileURL } from 'node:url';

/**
 * The reporter a name stands for, as the command line loads it: one of node:test's own, or a module's default export.
 * A class (spec, lcov) is made into a stream; a generator function (tap, dot, junit) is composed as it is.
 * @param {string} name
 */
async function reporterOf(name) {
  let reporter;
  if (Object.hasOwn(builtIn, name)) reporter = builtIn[name];
  else {
    const specifier = /^[a-z][a-z\d+.-]*:/i.test(name) || !(name.startsWith('.') || path.isAbsolute(name)) ? name : pathToFileURL(path.resolve(name)).href;
    reporter = (await import(specifier)).default;
  }
  if (typeof reporter === 'function' && reporter.prototype && Object.getOwnPropertyDescriptor(reporter.prototype, 'constructor')) return new reporter();
  return reporter;
}

/** run()'s options for the config: `concurrency`, when it names none, as `node --test` sets it. */
function runOptions({ files, concurrency, forceExit = false, timeout, only = false, testNamePatterns }) {
  return {
    files,
    concurrency: concurrency ?? Math.max(os.availableParallelism() - 1, 1),
    forceExit,
    ...(timeout === undefined ? {} : { timeout }),
    only,
    ...(testNamePatterns?.length ? { testNamePatterns } : {}),
  };
}

async function main(config) {
  const stream = run(runOptions(config));
  stream.on('test:fail', (data) => {
    if (!data.todo) process.exitCode = 1;
  });
  const done = [];
  for (const { reporter, destination } of config.reporters) {
    const out = stream.compose(await reporterOf(reporter));
    if (destination === 'stdout' || destination === 'stderr') {
      out.pipe(process[destination], { end: false });
      done.push(finished(out));
    } else {
      const file = fs.createWriteStream(destination);
      out.pipe(file);
      done.push(finished(file));
    }
  }
  await Promise.all(done);
  // `forceExit` ends each file's process once its tests have ended; this one ends once its reports are written.
  if (config.forceExit) process.exit();
}

main(JSON.parse(process.argv[2] ?? 'null')).catch((error) => {
  console.error(error);
  process.exit(1);
});
