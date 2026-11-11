// Reduced motion is written in one place (MOT-6, docs/architecture/motion.md). Motion is reduced where the person asks
// their system for it (`prefers-reduced-motion: reduce`) or where the product reduces it from inside the app
// (`data-tanrei-motion="reduce"` on the root element); the generated tokens say either as `--tanrei-motion: reduce`.
//
// - A shadow root's reduced form is `reducedMotion(…)` (src/styles/motion.ts), which writes it under the media query and
//   again under the root's style query. A component writes no condition of its own.
// - A motion script plays or holds asks `motionReduced()`, and a component that follows a change of it
//   `watchMotionReduced()` (src/primitives/motion.ts) — never `matchMedia` itself, which answers the person alone.
// - A light-DOM stylesheet (src/styles/*.css) writes its reduced form under the media query as plain CSS, and the build
//   writes it again under the style query (`writeReducedMotion()`, scripts/build.js): every such block in dist/ has its
//   twin.
//
// What the attribute does in the browsers, against what the media query does, is held by the MOT-6 tests of a component
// of each motion family (menu, number ticker, button, dialog) and by CRL-34 for a change of it while a component is shown.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(pkg, 'src');
const relative = (file) => path.relative(src, file).split(path.sep).join('/');

const files = (dir, pattern) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(file, pattern);
    return pattern.test(entry.name) && !/\.(test|d)\.ts$/.test(entry.name) ? [file] : [];
  });

/** The one module that names the media query: src/styles/motion.ts. */
const OWN = 'styles/motion.ts';

test('no module but src/styles/motion.ts writes prefers-reduced-motion as a condition, in CSS or in script', () => {
  const own = [];
  for (const file of files(src, /\.ts$/)) {
    if (relative(file) === OWN) continue;
    for (const [line] of fs.readFileSync(file, 'utf8').matchAll(/^.*(?:@media[^{\n]*prefers-reduced-motion|matchMedia\([^)\n]*prefers-reduced-motion).*$/gm)) own.push(`${relative(file)}: ${line.trim()}`);
  }
  assert.deepEqual(own, []);
});

test('every reduced block of a light-DOM stylesheet the build writes has its twin under the root style query', () => {
  const sheets = fs.readdirSync(path.join(pkg, 'dist')).filter((file) => file.endsWith('.css') && file !== 'tokens.css' && file !== 'tanrei.css');
  assert.ok(sheets.length > 10, `dist/ holds the stylesheets (${sheets.length}): build first`);
  const unpaired = [];
  for (const sheet of sheets) {
    const css = fs.readFileSync(path.join(pkg, 'dist', sheet), 'utf8');
    const media = css.match(/@media \(prefers-reduced-motion: reduce\)/g)?.length ?? 0;
    const query = css.match(/@container style\(--tanrei-motion: reduce\)/g)?.length ?? 0;
    if (media !== query) unpaired.push(`${sheet}: ${media} under the media query, ${query} under the style query`);
  }
  assert.deepEqual(unpaired, []);
});

test('the root tokens say --tanrei-motion: reduce under the media query and under data-tanrei-motion="reduce"', () => {
  const tokens = fs.readFileSync(path.join(src, 'generated/tokens.css'), 'utf8');
  assert.match(tokens, /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{\s*--tanrei-motion: reduce;\s*\}\s*\}/);
  assert.match(tokens, /:root\[data-tanrei-motion="reduce"\] \{\s*--tanrei-motion: reduce;\s*\}/);
});
