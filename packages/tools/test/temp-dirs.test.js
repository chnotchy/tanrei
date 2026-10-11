// A suite leaves nothing behind. Temporary directories are made with tempDir()
// (packages/tools/src/test-tmp.js): tagged with the process that made them, removed when the test file ends, and the
// file fails if one stays. This file is the other half: no code of this package makes one in any other way.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { directTempDirCalls, leavesNothingBehind, ownTempDirs, tempDir } from '../src/test-tmp.js';

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

test('the check itself: what stays is reported, what a child process makes is swept when it exits', async () => {
  const { sweepTempDirs } = await import('../src/test-tmp.js');
  const { spawnSync } = await import('node:child_process');
  const os = await import('node:os');
  // A child makes a directory and exits without removing it: its exit handler does.
  const helper = path.join(pkg, 'src/test-tmp.js');
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import { tempDir } from ${JSON.stringify(helper)}; console.log(tempDir('child'));`], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout.trim(), /tanrei-child-p\d+-/);
  assert.equal(fs.existsSync(child.stdout.trim()), false, 'swept on exit');
  // A directory with this process's tag that tempDir() does not know about is what the file-level check reports.
  const stray = path.join(os.tmpdir(), `tanrei-stray-p${process.pid}-manual`);
  fs.mkdirSync(stray);
  try {
    assert.deepEqual(sweepTempDirs(), [path.basename(stray)]);
  } finally {
    fs.rmdirSync(stray);
  }
});
