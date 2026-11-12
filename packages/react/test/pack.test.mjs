// What `npm pack` puts in the tarball of @tanrei/react, read from the build (`dist/`): the wrappers and their
// declarations, and nothing of the repository's own (packages/tools/src/pack-contents.js says what). Run after the
// build, by `pnpm --filter @tanrei/react test`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { packed } from '../../tools/src/pack-contents.js';

const { files, findings } = packed(fileURLToPath(new URL('..', import.meta.url)));

test('the tarball holds nothing a product should not get', () => {
  assert.deepEqual(findings, []);
});

test('the tarball holds every entry the package exports, with its declarations', () => {
  // The premise of the test above: it read a built package, not an empty `dist/`.
  const { exports } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const targets = Object.values(exports).flatMap((entry) => [entry.types, entry.default]).map((target) => target.replace(/^\.\//, ''));
  for (const file of ['package.json', 'README.md', 'NOTICE', ...targets]) assert.ok(files.includes(file), `${file} is packed`);
});
