#!/usr/bin/env node
// The web's Playwright tests split into CI shards of about equal time, by the seconds each test file ran in each
// project (packages/web/test/durations.json), not by Playwright's `--shard`, which deals out equal counts of tests in
// file order: its first shard of each engine came near the job's 60-minute limit while the last ones took 5–8 minutes.
//
//   playwright test --list --reporter=json <the shard's --project flags> [--grep …] > list.json   (the tests the run runs)
//   node packages/tools/src/playwright-shards.js <durations.json> list.json <index>/<total> <test-list.txt> [--every=every.json] [--first=<seconds>]
//   playwright test <the same --project flags> --test-list <test-list.txt> [the same --grep]
//
// A selection (a `--grep` of the changed components and files) is split the same way: its list holds only the tests the
// grep matches, and `--every` names the list of every test, so that a file the grep matches in part weighs its share of
// its seconds (its matching tests over all of its tests) and not the whole file. The run gives the same `--grep` with
// the test list, and Playwright runs the tests both select. `--first` is the seconds of tests the first shard is
// counted as holding before any file: the work it does besides its Playwright tests.
//
// The files are dealt as the docs' browser files are (run-node-tests.js, balance): longest first, each to the shard
// with the least so far. A file that weighs more than a shard's even share is dealt by its top-level blocks (each
// `test.describe` or test at the top of the file) instead, each weighing its share of the file's tests. A file the
// durations do not name weighs the median of its project's files, and the log says so: a new file runs, in some shard,
// before anyone has measured it. Every shard computes the same split from the same list, and checks that every listed
// test is matched by exactly one shard's test list, read as Playwright reads one; it fails otherwise.
//
// The durations are measured again by playwright-durations.js, from a full run's merged report.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { balance } from './run-node-tests.js';

/** What separates a test list's file and titles (Playwright's `›`). */
const SEPARATOR = ' › ';

/**
 * Every test of a Playwright JSON report or list (`--list --reporter=json`): its project, the test file it belongs to,
 * the file its `test()` call is in (a helper module, for some), and its titles below the file.
 * @param {any} report
 * @returns {{ project: string, file: string, at: string, titles: string[], results: any[] }[]}
 */
export function testsOf(report) {
  const out = [];
  const walk = (suite, file, titles) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests) out.push({ project: t.projectName, file, at: spec.file, titles: [...titles, spec.title], results: t.results ?? [] });
    }
    // An anonymous `test.describe(() => …)` has no title of its own in Playwright's title path, nor here.
    for (const child of suite.suites ?? []) walk(child, file, child.title ? [...titles, child.title] : titles);
  };
  for (const suite of report.suites ?? []) walk(suite, suite.file, []);
  return out;
}

const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  if (v.length === 0) return 1;
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};

/**
 * The shards: each one's units (a whole file, or `file › top-level title`), their seconds, the files the durations
 * did not name, and the test list that selects them.
 * @param {ReturnType<typeof testsOf>} tests
 * @param {Record<string, unknown>} durations seconds by project, then by file (relative to the test directory)
 * @param {number} total
 * @param {{ every?: ReturnType<typeof testsOf>, first?: number }} [options] every test of the suite, when `tests` is a
 *   part of it (a file then weighs the part of its seconds its listed tests are); the seconds the first shard starts with
 */
export function split(tests, durations, total, { every, first = 0 } = {}) {
  const projects = [...new Set(tests.map((t) => t.project))].sort();
  for (const project of projects) {
    if (typeof durations[project] !== 'object' || durations[project] === null) throw new Error(`the durations name no seconds for the project "${project}": measure them (playwright-durations.js), or add the project with {}`);
  }
  const medians = Object.fromEntries(projects.map((p) => [p, median(Object.values(durations[p]).filter((v) => typeof v === 'number'))]));
  /** @type {Map<string, { seconds: number, guessed: boolean, count: Map<string, number>, blocks: Map<string, Map<string, number>> }>} */
  const files = new Map();
  for (const t of tests) {
    if (!files.has(t.file)) files.set(t.file, { seconds: 0, guessed: false, count: new Map(), blocks: new Map() });
    const f = files.get(t.file);
    f.count.set(t.project, (f.count.get(t.project) ?? 0) + 1);
    if (!f.blocks.has(t.titles[0])) f.blocks.set(t.titles[0], new Map());
    const block = f.blocks.get(t.titles[0]);
    block.set(t.project, (block.get(t.project) ?? 0) + 1);
  }
  /** How many tests each file has in each project, in the whole suite (`every`), when the tests are a part of it. */
  const whole = new Map();
  for (const t of every ?? []) {
    const key = `${t.project}\n${t.file}`;
    whole.set(key, (whole.get(key) ?? 0) + 1);
  }
  /** The seconds of a file in a project: the part of them its listed tests are, when the tests are a part of the suite. */
  const secondsOf = (file, project) => {
    const known = durations[project][file];
    if (typeof known !== 'number') return null;
    const all = whole.get(`${project}\n${file}`);
    return all ? (known * files.get(file).count.get(project)) / all : known;
  };
  for (const [file, f] of files) {
    for (const project of f.count.keys()) {
      const known = secondsOf(file, project);
      if (known === null) f.guessed = true;
      f.seconds += known ?? medians[project];
    }
  }
  const sum = [...files.values()].reduce((a, f) => a + f.seconds, 0);
  const share = (sum + first) / total;
  /** @type {Record<string, number>} */
  const weights = {};
  /** @type {Map<string, { file: string, top: string | null }>} */
  const units = new Map();
  for (const [file, f] of [...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (f.seconds <= share || f.blocks.size === 1) {
      units.set(file, { file, top: null });
      weights[file] = f.seconds;
      continue;
    }
    for (const [top, count] of f.blocks) {
      const key = `${file}${SEPARATOR}${top}`;
      units.set(key, { file, top });
      let seconds = 0;
      for (const [project, n] of count) seconds += ((secondsOf(file, project) ?? medians[project]) * n) / f.count.get(project);
      weights[key] = seconds;
    }
  }
  const dealt = balance([...units.keys()], weights, total, [first]);
  return dealt.map((s, k) => {
    const own = new Set(s.files);
    const lines = new Set();
    for (const key of s.files) {
      const { file, top } = units.get(key);
      lines.add(top === null ? file : `${file}${SEPARATOR}${top}`);
    }
    // A test whose `test()` call is in a helper module is matched by that module's path, not its file's: Playwright
    // compares a test list's file with the test's location. Its file's line loads the file; this one selects the test.
    for (const t of tests) {
      if (t.at === t.file) continue;
      const unit = units.has(t.file) ? t.file : `${t.file}${SEPARATOR}${t.titles[0]}`;
      if (own.has(unit)) lines.add(`${t.at}${SEPARATOR}${t.titles[0]}`);
    }
    const guessed = [...new Set(s.files.map((key) => units.get(key).file))].filter((file) => files.get(file).guessed);
    const before = k === 0 ? first : 0;
    return { units: s.files, seconds: s.seconds - before, before, guessed, lines: [...lines].sort() };
  });
}

/**
 * Which shards' test lists select each test, read as Playwright reads a test list (`--test-list`): a line is a file,
 * then titles, split at `›` and trimmed; only the files a line names are loaded, and a test is selected by a line of
 * its location's file whose titles begin its own.
 * @param {ReturnType<typeof testsOf>} tests
 * @param {string[][]} lists each shard's lines
 * @returns {{ none: string[], several: string[] }}
 */
export function coverage(tests, lists) {
  const parsed = lists.map((lines) =>
    lines.map((line) => {
      const tokens = line.split(line.includes('›') ? '›' : '>').map((token) => token.trim());
      return { file: tokens[0], titles: tokens.slice(1) };
    }),
  );
  const none = [];
  const several = [];
  for (const t of tests) {
    let n = 0;
    for (const descriptions of parsed) {
      if (!descriptions.some((d) => d.file === t.file)) continue; // the file is not loaded
      if (descriptions.some((d) => d.file === t.at && d.titles.length <= t.titles.length && d.titles.every((title, k) => t.titles[k] === title))) n++;
    }
    const name = `[${t.project}] ${t.file}${SEPARATOR}${t.titles.join(SEPARATOR)}`;
    if (n === 0) none.push(name);
    else if (n > 1) several.push(name);
  }
  return { none, several };
}

/** The lines that say how the tests were split, for the log. */
export function describeSplit(shards, index) {
  const lines = [`Shards by measured time (packages/web/test/durations.json; a file it does not name weighs its project's median):`];
  shards.forEach((s, k) => {
    const mark = k + 1 === index ? '→' : ' ';
    const before = s.before ? ` (and ${Math.round(s.before)} s counted for its other work)` : '';
    lines.push(`${mark} ${k + 1}/${shards.length}: ${Math.round(s.seconds)} s of tests${before} — ${s.units.join(', ') || 'none'}${s.guessed.length ? ` (median for ${s.guessed.join(', ')})` : ''}`);
  });
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const [durationsFile, listFile, which, out] = args.filter((arg) => !arg.startsWith('--'));
  const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const everyFile = option('every');
  const first = Number(option('first') ?? 0);
  const m = /^(\d+)\/(\d+)$/.exec(which ?? '');
  if (!durationsFile || !listFile || !m || !out || +m[1] < 1 || +m[1] > +m[2] || !(first >= 0) || args.some((arg) => arg.startsWith('--') && !/^--(every|first)=./.test(arg))) {
    console.error('usage: playwright-shards.js <durations.json> <list.json> <index>/<total> <test-list.txt> [--every=<list of every test.json>] [--first=<seconds>]');
    process.exit(2);
  }
  const tests = testsOf(JSON.parse(fs.readFileSync(listFile, 'utf8')));
  if (tests.length === 0) {
    console.error(`✖ ${listFile} lists no test`);
    process.exit(1);
  }
  const every = everyFile ? testsOf(JSON.parse(fs.readFileSync(everyFile, 'utf8'))) : undefined;
  const shards = split(tests, JSON.parse(fs.readFileSync(durationsFile, 'utf8')), +m[2], { every, first });
  console.log(describeSplit(shards, +m[1]));
  const { none, several } = coverage(tests, shards.map((s) => s.lines));
  if (none.length || several.length) {
    for (const name of none.slice(0, 20)) console.error(`✖ in no shard: ${name}`);
    for (const name of several.slice(0, 20)) console.error(`✖ in several shards: ${name}`);
    console.error(`✖ ${none.length} test(s) in no shard, ${several.length} in several, of ${tests.length}: the split is wrong`);
    process.exit(1);
  }
  const mine = shards[+m[1] - 1];
  // No line, no file content: the job then runs nothing rather than an empty test list.
  fs.writeFileSync(out, mine.lines.length ? `${mine.lines.join('\n')}\n` : '');
  console.log(`Every one of the ${tests.length} listed tests is in exactly one shard; this one's test list (${mine.lines.length} line${mine.lines.length === 1 ? '' : 's'}) is ${out}.`);
}
