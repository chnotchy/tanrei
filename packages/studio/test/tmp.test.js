// A suite leaves nothing behind. Temporary directories are made with tempDir()
// (packages/tools/src/test-tmp.js): tagged with the process that made them, removed when the test file ends, and the
// file fails if one stays. This file is the other half: no code of this package — the mock server, the browser
// tests, the app — makes one in any other way.
import assert from 'node:assert/strict';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { directTempDirCalls, leavesNothingBehind } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after);
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('temporary directories are made only through tempDir(), which removes them', () => {
  assert.deepEqual(directTempDirCalls(pkg), [], 'use tempDir(purpose) from packages/tools/src/test-tmp.js instead of fs.mkdtempSync');
});
