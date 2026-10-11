// A test sets a custom property on the root through the harness's `rootTokens()`, never by a write of its own: a
// token the root already declares, written alone, has WebKit restyle the page of fixtures for seconds (README, "A
// single token set on the root from script is slow in WebKit"), and a test that writes several times ends at its
// time limit in whichever command is then running. The helper changes the number of the root's custom
// properties with the write, which is not compared.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The files that may write the root's inline style themselves: the helper, and the test of the way round itself. */
const OWN = new Set(['test/harness.ts', 'src/styles/restyle.perf.test.ts']);

const files = (dir) =>
  fs.readdirSync(path.join(pkg, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(file);
    return dir.startsWith('test') ? (/\.ts$/.test(entry.name) ? [file] : []) : /\.test\.ts$/.test(entry.name) ? [file] : [];
  });

/** A custom property set on, or taken off, the root element's inline style — however the root's style is reached. */
const WRITE = /documentElement\.style\.(?:setProperty|removeProperty)\(|const (\w+) = document\.documentElement\.style;[\s\S]{0,400}?\b\1\.(?:setProperty|removeProperty)\(/;

test('no test writes a custom property on the root by itself: each goes through rootTokens() of the harness', () => {
  const all = [...files('src'), ...files('test')];
  assert.ok(all.length > 100, `the tests were found (${all.length})`);
  const writing = all.filter((file) => !OWN.has(file) && WRITE.test(fs.readFileSync(path.join(pkg, file), 'utf8')));
  assert.deepEqual(writing, []);
  // The look is seen to tell: the helper itself, and the one test of the way round, are found by it.
  for (const file of OWN) assert.ok(WRITE.test(fs.readFileSync(path.join(pkg, file), 'utf8')), `${file} writes the root's style`);
  assert.ok(all.filter((file) => /\brootTokens\(/.test(fs.readFileSync(path.join(pkg, file), 'utf8'))).length > 60, 'the tests that set a token use the helper');
});
