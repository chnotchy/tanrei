// `drift --check` leaves the tree as it found it: the drift check runs every
// generator to see what they would write, and an agent that runs it as a check must not find another lane's
// generated files rewritten under it. keepFiles() is what puts them back.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { keepFiles } from '../src/keep.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';

leavesNothingBehind(after);

const tree = (files) => {
  const root = tempDir('keep');
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
};
const read = (root, rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel)) : null);

test('a file a generator rewrote, one it made and one it removed are all as they were, and each is named', () => {
  const bytes = Buffer.from([0x00, 0xff, 0xfe, 0x80, 0x0a]); // not UTF-8: a font or a picture is put back byte for byte
  const root = tree({ 'a/generated/one.ts': 'hand-edited\n', 'a/generated/font.bin': bytes, 'manifest.json': '["old"]\n', 'same.json': '{}\n' });
  const kept = keepFiles(root, ['a/generated/one.ts', 'a/generated/font.bin', 'manifest.json', 'same.json', 'b/generated/new.ts']);

  fs.writeFileSync(path.join(root, 'a/generated/one.ts'), 'regenerated\n');
  fs.writeFileSync(path.join(root, 'a/generated/font.bin'), 'text now');
  fs.rmSync(path.join(root, 'manifest.json'));
  fs.mkdirSync(path.join(root, 'b/generated'), { recursive: true });
  fs.writeFileSync(path.join(root, 'b/generated/new.ts'), 'new\n');
  fs.writeFileSync(path.join(root, 'b/generated/later.ts'), 'listed only afterwards\n');

  // A file the generators list only afterwards (it is in the new manifest) did not exist before: it is removed too.
  assert.deepEqual(kept.restore(['b/generated/later.ts']), ['a/generated/font.bin', 'a/generated/one.ts', 'b/generated/later.ts', 'b/generated/new.ts', 'manifest.json']);
  assert.equal(read(root, 'a/generated/one.ts').toString(), 'hand-edited\n');
  assert.deepEqual(read(root, 'a/generated/font.bin'), bytes);
  assert.equal(read(root, 'manifest.json').toString(), '["old"]\n');
  assert.equal(read(root, 'b/generated/new.ts'), null);
  assert.equal(read(root, 'b/generated/later.ts'), null);
  assert.equal(read(root, 'same.json').toString(), '{}\n');
});

test('nothing changed: nothing is written and nothing is named', () => {
  const root = tree({ 'one.ts': 'as generated\n' });
  const kept = keepFiles(root, ['one.ts', 'absent.ts']);
  const modified = fs.statSync(path.join(root, 'one.ts')).mtimeMs;
  assert.deepEqual(kept.restore(), []);
  assert.equal(fs.statSync(path.join(root, 'one.ts')).mtimeMs, modified);
  assert.equal(read(root, 'absent.ts'), null);
});

test('the drift command takes --check, and says in its report that the tree was left as it was', () => {
  const cli = fs.readFileSync(new URL('../src/cli.js', import.meta.url), 'utf8');
  const drift = fs.readFileSync(new URL('../src/drift.js', import.meta.url), 'utf8');
  assert.match(cli, /regenerate\(REPO_ROOT, GENERATORS, \{ checkOnly/);
  assert.match(drift, /checkOnly \? keepFiles\(root/);
  assert.match(cli, /'--check'/);
  assert.match(cli, /TANREI_CHECK_ONLY/);
});
