#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GENERATED_MANIFEST, checkParity, generatedFilesOnDisk, layerProblems, validateAvailability, validatePackages, validateSpecs } from './checks.js';
import { CONFIG, PLATFORMS, REPO_ROOT } from './conventions.js';
import { GENERATORS, regenerate } from './drift.js';
import { citationFiles, writeCitation } from './citation.js';
import { checkRetiredTerms, checkWorkMarkers } from './scans.js';
import { syntaxProblems, targetEdition } from './syntax.js';
import { buildStatus, levelLine, listingLine, statusFiles, writeStatus } from './status.js';
import { draftParts, manifestElements, withParts } from './parts.js';
import { wordPackProblems } from './words.js';

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
    report('components live where their specs say', layerProblems()),
    report('publishable packages carry the license and NOTICE', validatePackages()),
    report('no retired names', checkRetiredTerms()),
    report('work markers say what is missing', checkWorkMarkers()),
    report('the English word pack has a word for every key', wordPackProblems()),
  ];
  return results.every(Boolean);
}

function status() {
  const s = writeStatus();
  // How to cite the project, from tanrei.config.json (citation.js).
  writeCitation();
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
  // The pack is generated from the list of keys, so a key a spec adds without its English word fails here too.
  ok = report('the English word pack has a word for every key', wordPackProblems()) && ok;

  const stale = Object.entries({ ...statusFiles(), ...citationFiles() })
    .filter(([rel, content]) => {
      const file = path.join(REPO_ROOT, rel);
      return !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content;
    })
    .map(([rel]) => `${rel} is out of date`);

  // Every generator in the repo, and what each writes (drift.js): the files of the generated manifest and each
  // generator's outputs, a directory it owns as every file under it. The manifest is itself generated: it is kept
  // with them.
  const run = regenerate(REPO_ROOT, GENERATORS, { checkOnly, listed: generatedFilesOnDisk, keep: [GENERATED_MANIFEST] });
  if (run.failure) {
    console.error(`generator failed: ${run.failure}`);
    return false;
  }
  for (const rel of run.changed) {
    if (run.removed.includes(rel)) stale.push(`${rel} should not exist: no generator writes it (${checkOnly ? 'left as it was: --check' : 'now removed — review and commit'})`);
    else stale.push(`${rel} is stale or hand-edited (${checkOnly ? 'left as it was: --check' : 'now regenerated — review and commit'})`);
  }
  try {
    // The owned directories are named whole, so a file in one that git does not know is reported too.
    const owned = GENERATORS.flatMap((g) => g[3]).filter((output) => output.endsWith('/'));
    const untracked = execFileSync('git', ['status', '--porcelain', '--', ...run.files, ...owned, 'docs/status'], { cwd: REPO_ROOT, encoding: 'utf8' });
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
  // Everything `status` writes from the version is written again from the new one, in a process of its own: this one
  // read tanrei.config.json before the edit.
  execFileSync(process.execPath, [process.argv[1], 'status'], { stdio: 'inherit' });
  console.log(`✔ versions synced to ${version}`);
  return true;
}

/**
 * `parts <component>… [--write]`: a first `platforms.web.parts` for each spec named that has none — the anatomy ids
 * the element exports a CSS part of the same name for — and the ids left for the author. `--write` writes it into
 * the spec; `validate` then names what is still to map.
 */
function parts() {
  const args = process.argv.slice(3);
  const write = args.includes('--write');
  const names = args.filter((a) => a !== '--write');
  if (!names.length) {
    console.error('usage: tanrei parts <component>… [--write]');
    return false;
  }
  const tags = manifestElements(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages/web/custom-elements.json'), 'utf8')));
  let ok = true;
  for (const name of names) {
    const rel = `specs/${name}.spec.json`;
    const text = safeRead(rel);
    if (text === null) { console.error(`✖ ${rel} does not exist`); ok = false; continue; }
    const spec = JSON.parse(text);
    if (spec.platforms.web.parts) { console.log(`– ${name}: has parts already`); continue; }
    const draft = draftParts(spec, tags);
    console.log(`${name}: ${Object.keys(draft.parts).length} of ${spec.anatomy.length} by name${draft.open.length ? `; left to map: ${draft.open.join(', ')}` : ''}`);
    if (!write) continue;
    const next = withParts(text, draft.parts);
    if (next === null) { console.error(`✖ ${rel} is not in canonical JSON form; write its parts by hand`); ok = false; continue; }
    fs.writeFileSync(path.join(REPO_ROOT, rel), next);
  }
  return ok;
}

const parity = () => report('spec ↔ implementation parity', checkParity());
/**
 * The web package's `dist/**\/*.js` parses as the ECMAScript edition its tsconfig targets (syntax.js). The package's
 * build runs it last, so `pnpm build`, `pnpm check` and every CI job that builds the package run it.
 */
function syntax() {
  const web = path.join(REPO_ROOT, 'packages/web');
  const dist = path.join(web, 'dist');
  if (!fs.existsSync(dist)) return report('web dist syntax', ['packages/web/dist does not exist: build the package first (pnpm --filter @tanrei/web build)']);
  const year = targetEdition(path.join(web, 'tsconfig.json'));
  const { files, problems } = syntaxProblems(dist, year);
  return report(`web dist parses as ES${year} (${files} files)`, problems.map((problem) => `packages/web/dist/${problem} — write it in ES${year}, or have the build lower it`));
}
const commands = { validate, status, parity, drift, parts, syntax, 'sync-versions': syncVersions };
const command = commands[process.argv[2]];
if (!command) {
  console.error(`usage: tanrei <${Object.keys(commands).join('|')}>\nplatforms: ${CONFIG.platforms.map((p) => PLATFORMS[p].label).join(', ')}`);
  process.exit(2);
}
process.exit(command() ? 0 : 1);
