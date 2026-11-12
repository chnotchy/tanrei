// What `npm pack` puts in the tarball of @tanrei/token-engine: its modules as written (it has no build), and nothing of
// the repository's own (packages/tools/src/pack-contents.js says what).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { packed } from '../../tools/src/pack-contents.js';

const { files, findings } = packed(fileURLToPath(new URL('..', import.meta.url)));

test('the tarball holds nothing a product should not get', () => {
  assert.deepEqual(findings, []);
});

test('the tarball holds every module under src/', () => {
  // The premise of the test above: it read the package's code.
  const modules = fs.readdirSync(new URL('../src', import.meta.url)).map((name) => `src/${name}`);
  for (const file of ['package.json', 'README.md', 'NOTICE', ...modules]) assert.ok(files.includes(file), `${file} is packed`);
});
