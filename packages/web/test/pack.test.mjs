// What `npm pack` puts in the tarball of @tanrei/web, read from the build (`dist/`): its code and what that code reads,
// and nothing of the repository's own — no tests, fixtures, snapshots or TypeScript sources, and no source map that
// names a file the tarball does not hold (packages/tools/src/pack-contents.js says why). Run after the build, by
// `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { packed } from '../../tools/src/pack-contents.js';

const { files, findings } = packed(fileURLToPath(new URL('..', import.meta.url)));

test('the tarball holds nothing a product should not get', () => {
  assert.deepEqual(findings, []);
});

test('the tarball holds the code and the self-contained bundle with its map', () => {
  // The premise of the test above: it read a built package, not an empty `dist/`.
  for (const file of ['package.json', 'README.md', 'NOTICE', 'custom-elements.json', 'dist/index.js', 'dist/index.d.ts', 'dist/tokens.css', 'dist/tanrei.bundle.js', 'dist/tanrei.bundle.js.map']) {
    assert.ok(files.includes(file), `${file} is packed`);
  }
});
