#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GENERATED_MANIFEST, checkParity, generatedFilesOnDisk, validateAvailability, validatePackages, validateSpecs } from './checks.js';
import { CONFIG, PLATFORMS, REPO_ROOT } from './conventions.js';
import { keepFiles } from './keep.js';
import { checkRetiredTerms, checkWorkMarkers } from './scans.js';
import { buildStatus, levelLine, listingLine, statusFiles, writeStatus } from './status.js';

function report(title, problems) {
  if (!problems.length) {
    console.log(`✔ ${title}`);
    return true;
  }
  console.error(`✖ ${title}: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  return false;
}

function validate() {
  // Every check runs: one failure must not hide the next.
  const results = [
    report('specs valid', validateSpecs()),
    report('system availability names what exists', validateAvailability()),
    report('publishable packages carry the license', validatePackages()),
    report('no retired names', checkRetiredTerms()),
    report('work markers say what is missing', checkWorkMarkers()),
  ];
  return results.every(Boolean);
}

function status() {
  const s = writeStatus();
  const width = Math.max(...s.components.map((c) => c.title.length));
  // The level is a column of its own, as wide as the longest of the names.
  const level = Math.max('Level'.length, ...Object.values(s.levels).map((name) => name.length));
  // `listing` beside it: whether the component is listed by default.
  const listing = Math.max('Listing'.length, ...Object.values(s.listings).map((name) => name.length));
  console.log(`${'Component'.padEnd(width)}  ${'Level'.padEnd(level)}  ${'Listing'.padEnd(listing)}  ${s.platforms.map((p) => p.padEnd(12)).join('')}`);
  for (const c of s.components.filter((c) => c.hasSpec)) {
    console.log(`${c.title.padEnd(width)}  ${(c.level ?? '').padEnd(level)}  ${(c.listing ?? '').padEnd(listing)}  ${s.platforms.map((p) => c.platforms[p].padEnd(12)).join('')}`);
  }
  console.log(`\n${s.components.filter((c) => c.hasSpec).length}/${s.components.length} components have a spec (${levelLine(s)}; ${listingLine(s)}). Full matrix: docs/status/STATUS.md`);
  return true;
}

/**
 * Drift = any way the repository can disagree with itself:
 *   1. a spec claims something the platform package does not have (or the reverse);
 *   2. a generated file differs from what the generators produce right now.
 *
 * The second is found by running the generators, which rewrites what was stale. With `--check` (or
 * TANREI_CHECK_ONLY=1) every generated file is put back as it was found: the report is the same, and the tree is
 * untouched — for an agent in a shared checkout, whose stale file may be another lane's work in progress.
 */
function drift() {
  const checkOnly = process.argv.slice(3).includes('--check') || process.env.TANREI_CHECK_ONLY === '1';
  let ok = report('spec ↔ implementation parity', checkParity());

  const stale = Object.entries(statusFiles())
    .filter(([rel, content]) => {
      const file = path.join(REPO_ROOT, rel);
      return !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content;
    })
    .map(([rel]) => `${rel} is out of date`);

  // Every generator in the repo, in dependency order. Each entry: [cwd, command, args, outputs].
  // As the `generate` script of packages/web: what the analyzer reads and where it writes is its configuration's
  // (packages/web/custom-elements-manifest.config.mjs), written once.
  const cem = ['packages/web', 'node_modules/.bin/cem', ['analyze'], ['packages/web/custom-elements.json']];
  const generators = [
    ['.', 'node', ['packages/tokens-build/src/cli.js', 'generate'], null],
    cem,
    ['packages/react', 'node', ['scripts/generate.js'], ['packages/react/src/generated/components.ts']],
  ];
  const tracked = () => [...generatedFilesOnDisk(), ...generators.flatMap((g) => g[3] ?? [])];
  const before = new Map(tracked().map((rel) => [rel, safeRead(rel)]));
  // The list of generated files is itself generated: it is kept with them.
  const kept = checkOnly ? keepFiles(REPO_ROOT, [...before.keys(), GENERATED_MANIFEST]) : null;
  for (const [cwd, bin, args] of generators) {
    const run = spawnSync(bin, args, { cwd: path.join(REPO_ROOT, cwd), encoding: 'utf8' });
    if (run.status !== 0) {
      console.error(`generator failed: ${bin} ${args.join(' ')}\n${run.stdout}${run.stderr}`);
      kept?.restore(tracked());
      return false;
    }
  }
  for (const rel of tracked()) {
    if (before.get(rel) !== safeRead(rel)) stale.push(`${rel} is stale or hand-edited (${checkOnly ? 'left as it was: --check' : 'now regenerated — review and commit'})`);
  }
  kept?.restore(tracked());
  try {
    const untracked = execFileSync('git', ['status', '--porcelain', '--', ...tracked(), 'docs/status'], { cwd: REPO_ROOT, encoding: 'utf8' });
    for (const line of untracked.split('\n').filter(Boolean)) stale.push(`uncommitted generated change: ${line.trim()}`);
  } catch {
    // Not a git checkout (e.g. a source tarball): the in-memory comparison above still ran.
  }
  ok = report('generated files up to date', [...new Set(stale)]) && ok;
  return ok;
}

const safeRead = (rel) => {
  const file = path.join(REPO_ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};

/** Changesets versions the JS packages; this copies that version to the non-JS manifests (lockstep). */
function syncVersions() {
  const version = JSON.parse(safeRead('packages/web/package.json') ?? safeRead('package.json')).version;
  const edits = [
    ['tanrei.config.json', /("version":\s*")[^"]+(")/, `$1${version}$2`],
    ['packages/flutter/pubspec.yaml', /^(version:\s*).+$/m, `$1${version}`],
    ['packages/compose/gradle.properties', /^(VERSION_NAME=).+$/m, `$1${version}`],
    ['packages/swiftui/Sources/Tanrei/TanreiVersion.swift', /(static let current = ")[^"]+(")/, `$1${version}$2`],
  ];
  for (const [rel, pattern, replacement] of edits) {
    const text = safeRead(rel);
    if (text === null) continue;
    fs.writeFileSync(path.join(REPO_ROOT, rel), text.replace(pattern, replacement));
  }
  console.log(`✔ versions synced to ${version}`);
  return true;
}

const parity = () => report('spec ↔ implementation parity', checkParity());
const commands = { validate, status, parity, drift, 'sync-versions': syncVersions };
const command = commands[process.argv[2]];
if (!command) {
  console.error(`usage: tanrei <${Object.keys(commands).join('|')}>\nplatforms: ${CONFIG.platforms.map((p) => PLATFORMS[p].label).join(', ')}`);
  process.exit(2);
}
process.exit(command() ? 0 : 1);
