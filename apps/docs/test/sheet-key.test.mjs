// The key of the build that computes a reader's own theme's stylesheet (src/lib/sheet-key.mjs): the same for the same
// sources, another when any of them changes, and made of what the stylesheet is really computed from — every module
// the worker that computes it bundles from the Studio's package is named.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { leavesNothingBehind, tempDir } from '../../../packages/tools/src/test-tmp.js';
import { SHEET_PACKAGES, SHEET_SOURCES, packageVersions, sheetKeyOf } from '../src/lib/sheet-key.mjs';

leavesNothingBehind(after);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

test('the same sources give the same key, of sixteen hexadecimal digits', () => {
  const key = sheetKeyOf(repoRoot);
  assert.match(key, /^[0-9a-f]{16}$/);
  assert.equal(sheetKeyOf(repoRoot), key);
});

test('a change to any source gives another key', () => {
  const root = tempDir('docs-sheet-key');
  try {
    for (const source of SHEET_SOURCES) {
      const from = path.join(repoRoot, source);
      fs.cpSync(from, path.join(root, source), { recursive: true });
    }
    // (The copy has no installed packages: their versions are the repository's.)
    const versions = packageVersions(repoRoot);
    const before = sheetKeyOf(root, versions);
    assert.equal(before, sheetKeyOf(repoRoot), 'the copy of the sources gives the repository’s key');
    const config = path.join(root, 'tanrei.config.json');
    fs.appendFileSync(config, '\n');
    assert.notEqual(sheetKeyOf(root, versions), before, 'the configuration');
    fs.writeFileSync(path.join(root, 'tokens', 'new.tokens.json'), '{}');
    assert.notEqual(sheetKeyOf(root, versions), before, 'a new token file');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the installed version of each package the worker bundles is part of the key', () => {
  const versions = packageVersions(repoRoot);
  assert.deepEqual(Object.keys(versions), SHEET_PACKAGES);
  // The version installed for the Studio, as its lockfile entry names it.
  const lock = fs.readFileSync(path.join(repoRoot, 'pnpm-lock.yaml'), 'utf8');
  for (const [name, version] of Object.entries(versions)) {
    assert.match(version, /^\d+\.\d+\.\d+/, name);
    assert.ok(lock.includes(`'${name}@${version}'`) || lock.includes(`${name}@${version}:`), `${name}@${version} is the version the lockfile installs`);
    assert.notEqual(sheetKeyOf(repoRoot, { ...versions, [name]: `${version}-other` }), sheetKeyOf(repoRoot), `another ${name} gives another key`);
  }
  // Only what reaches the worker: the Studio's plugin imports material-color-utilities' modules for it.
  assert.match(fs.readFileSync(path.join(repoRoot, 'packages/studio/vite-plugin.js'), 'utf8'), /require\.resolve\('@material\/material-color-utilities'\)/);
});

test('the Studio’s modules the worker bundles are each a source of the key', () => {
  const studio = path.join(repoRoot, 'packages/studio/src');
  // What the worker imports, followed through the Studio's own modules (its imports of other packages are named as
  // whole folders: the token engine's and the pipeline's sources).
  const seen = new Set();
  const follow = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = fs.readFileSync(path.join(studio, file), 'utf8');
    for (const [, specifier] of text.matchAll(/^import [^'"]*['"](\.\/[^'"]+)['"]/gm)) {
      const name = path.basename(specifier);
      const found = [name, `${name}.ts`, `${name}.js`].find((candidate) => fs.existsSync(path.join(studio, path.dirname(file), path.dirname(specifier), candidate)));
      if (found) follow(path.join(path.dirname(file), path.dirname(specifier), found));
    }
  };
  follow('sheet-worker.ts');
  for (const file of seen) assert.ok(SHEET_SOURCES.includes(`packages/studio/src/${file}`), `packages/studio/src/${file} is bundled into the worker: name it in SHEET_SOURCES`);
});
