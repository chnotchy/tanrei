// A host that takes focus itself and draws its indicator on a box inside says `outline: none !important` on `:host`
// (src/primitives/focus-ring.ts). Without `!important` the page's own rules win over the shadow root's: a page's
// `:focus-visible { outline: … }` drew its ring around the host, on top of the component's (a tab, a tab panel, a list
// item, a menubar's menu). This reads every component stylesheet's `:host { … }` rules and fails on an outline that
// is not important. The browser's side, a page with such a rule, is the docs' test (apps/docs/test/browser/focus-own-indicator.test.mjs).
// Run by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'src');

/** Every `.ts` file under `dir` that is not a test. */
function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(file);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [file] : [];
  });
}

/** The `outline` declarations of a file's plain `:host { … }` rules (an interpolation, `${…}`, read as part of one), with their line. */
function hostOutlines(text) {
  const found = [];
  for (const rule of text.matchAll(/(^|[\s}])(:host\s*\{)((?:[^{}$]|\$(?!\{)|\$\{[^{}]*\})*)\}/g)) {
    const body = rule[3].replace(/\/\*[\s\S]*?\*\//g, '');
    for (const declaration of body.matchAll(/(?:^|;|\s)outline\s*:\s*([^;]*)/g)) {
      const line = text.slice(0, rule.index + rule[1].length).split('\n').length;
      found.push({ line, value: declaration[1].trim() });
    }
  }
  return found;
}

test('reads the outline of a plain `:host` rule, and no other rule', () => {
  assert.deepEqual(hostOutlines(':host {\n  display: block;\n  outline: none;\n}\n:host(:focus-visible) .row { outline: 2px solid; }'), [{ line: 1, value: 'none' }]);
  assert.deepEqual(hostOutlines('.a { outline: none; }\n:host { outline-offset: 0; }'), []);
  assert.deepEqual(hostOutlines(':host {\n  --a: ${d(\'--b\')};\n  outline: none !important;\n}'), [{ line: 1, value: 'none !important' }]);
});

test('every `:host` that sets its outline sets it `!important`', () => {
  const files = sources(src);
  assert.ok(files.length > 100, `reads the component sources (${files.length} files)`);
  const outlines = files.flatMap((file) => hostOutlines(fs.readFileSync(file, 'utf8')).map((found) => ({ file, ...found })));
  assert.ok(outlines.length >= 16, `finds the hosts that say it (${outlines.length})`);
  const plain = outlines
    .filter(({ value }) => !/!important$/.test(value))
    .map(({ file, line, value }) => `${path.relative(src, file)}:${line}: outline: ${value}`);
  assert.deepEqual(plain, [], 'a page rule that matches the host would draw over the component');
});
