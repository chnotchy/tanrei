// A suite leaves nothing behind. Temporary directories are made with tempDir()
// (packages/tools/src/test-tmp.js): tagged with the process that made them, removed when the test file ends, and the
// file fails if one stays. This file is the other half: no code of this package makes one in any other way.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { directTempDirCalls, leavesNothingBehind, ownTempDirs, tempDir } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after);
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('temporary directories are made only through tempDir(), which removes them', () => {
  assert.deepEqual(directTempDirCalls(pkg), [], 'use tempDir(purpose) from packages/tools/src/test-tmp.js instead of fs.mkdtempSync');
});

test('tempDir(): tagged with this process, counted while it exists', () => {
  const before = ownTempDirs().length;
  const dir = tempDir('tmp-check');
  assert.ok(fs.statSync(dir).isDirectory());
  assert.match(path.basename(dir), new RegExp(`^tanrei-tmp-check-p${process.pid}-`));
  assert.equal(ownTempDirs().length, before + 1);
  assert.throws(() => tempDir('../escape'), /purpose/);
});
