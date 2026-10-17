// The generated half of `drift`: every file a generator writes is compared, and a directory a generator owns is
// compared whole — a file in it that the generator does not write again is reported as one that should not exist.
// The React wrappers are the case: one module per wrapper under packages/react/src/generated/, so a hand edit to any
// one of them, or the wrapper of an element that is gone, must be seen. These tests run the React generator entry of
// GENERATORS for real, in a copy of what it reads and runs: the manifest, the specs (for how each event is cased) and
// the generator.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GENERATORS, outputFiles, regenerate } from '../src/drift.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';

leavesNothingBehind(after);

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const react = GENERATORS.filter(([cwd]) => cwd === 'packages/react');
const GENERATED = 'packages/react/src/generated';

/** A tree with what the React generator reads and runs, generated once. */
function reactTree() {
  const root = tempDir('drift');
  const specs = fs.readdirSync(path.join(REPO, 'specs')).filter((f) => f.endsWith('.spec.json')).map((f) => `specs/${f}`);
  for (const rel of ['packages/react/scripts/generate.js', 'packages/web/custom-elements.json', ...specs]) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), path.join(root, rel));
  }
  assert.equal(regenerate(root, react).failure, undefined);
  return root;
}
const write = (root, rel, text) => fs.writeFileSync(path.join(root, rel), text);
const read = (root, rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null);

test('the React generator is one entry, and it owns its generated directory whole', () => {
  assert.equal(react.length, 1);
  assert.deepEqual(react[0][3], [`${GENERATED}/`]);
});

test('freshly generated: nothing is reported, and every wrapper module is among the files compared', () => {
  const root = reactTree();
  const run = regenerate(root, react, { checkOnly: true });
  assert.deepEqual(run.changed, []);
  assert.ok(run.files.includes(`${GENERATED}/components.ts`));
  assert.ok(run.files.includes(`${GENERATED}/wrappers/calendar.ts`));
  assert.ok(run.files.filter((rel) => rel.startsWith(`${GENERATED}/wrappers/`)).length > 100);
});

test('a hand edit to one wrapper is reported; with --check it is left as it was, without it is regenerated', () => {
  const root = reactTree();
  const rel = `${GENERATED}/wrappers/calendar.ts`;
  const generated = read(root, rel);
  write(root, rel, `${generated}// edited by hand\n`);
  const run = regenerate(root, react, { checkOnly: true });
  assert.deepEqual(run.changed, [rel]);
  assert.deepEqual(run.removed, []);
  assert.equal(read(root, rel), `${generated}// edited by hand\n`, '--check leaves the tree as it was');
  assert.deepEqual(regenerate(root, react).changed, [rel]);
  assert.equal(read(root, rel), generated);
});

test('a wrapper no generator writes — left behind by an element that is gone, or put there by hand — is reported as one that should not exist', () => {
  const root = reactTree();
  const stale = [`${GENERATED}/wrappers/gone.ts`, `${GENERATED}/stray.ts`];
  for (const rel of stale) write(root, rel, 'export const Gone = null;\n');
  const run = regenerate(root, react, { checkOnly: true });
  assert.deepEqual(run.changed, stale.toSorted());
  assert.deepEqual(run.removed, stale.toSorted());
  for (const rel of stale) assert.equal(read(root, rel), 'export const Gone = null;\n', '--check leaves the tree as it was');
  assert.deepEqual(regenerate(root, react).removed, stale.toSorted());
  for (const rel of stale) assert.equal(read(root, rel), null);
  assert.deepEqual(regenerate(root, react, { checkOnly: true }).changed, []);
});

test('a generator that fails is reported, and the directory it owns keeps its files, with --check or without', () => {
  const root = reactTree();
  const files = outputFiles(root, [`${GENERATED}/`]);
  fs.rmSync(path.join(root, 'packages/web/custom-elements.json'));
  for (const checkOnly of [true, false]) {
    const run = regenerate(root, react, { checkOnly });
    assert.match(run.failure ?? '', /scripts\/generate\.js/);
    assert.deepEqual(outputFiles(root, [`${GENERATED}/`]), files);
  }
});

test('outputFiles(): a file is named as it is, a directory as every file under it, sorted', () => {
  const root = tempDir('drift-outputs');
  for (const rel of ['a/x.ts', 'a/b/y.ts', 'c.json']) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    write(root, rel, '');
  }
  assert.deepEqual(outputFiles(root, ['c.json', 'a/', 'missing/']), ['a/b/y.ts', 'a/x.ts', 'c.json']);
});
