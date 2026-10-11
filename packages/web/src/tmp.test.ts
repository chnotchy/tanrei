// A suite leaves nothing behind. Nothing in @tanrei/web or @tanrei/react makes a
// temporary directory: the harness builds fixture systems in memory and embeds fonts as data: URLs, and Playwright
// removes its own profiles and artifacts. This keeps it so: a directory may only be made through tempDir()
// (packages/tools/src/test-tmp.js), which removes it and fails the file when one stays.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('no test or script of @tanrei/web and @tanrei/react makes a temporary directory of its own', async () => {
  const { directTempDirCalls, ownTempDirs } = await import('../../tools/src/test-tmp.js');
  for (const pkg of ['web', 'react']) expect(directTempDirCalls(path.join(packages, pkg)), pkg).toEqual([]);
  expect(ownTempDirs()).toEqual([]);
});
