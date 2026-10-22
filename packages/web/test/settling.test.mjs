// Every element of this package draws its first frames at rest (MOT-3, docs/architecture/motion.md): it settles from
// each time it is connected until two frames after its first update, and nothing in it starts a transition meanwhile.
// That is written once, in the two base classes of src/primitives/element.ts, so an element has it by extending one of
// them — and a class that extends Lit's own does not. An element that draws in the light DOM has its rules in the
// document's stylesheet, so the build writes the settling rule into that stylesheet (`settleRule()`, scripts/build.js):
// into the page's copy (`dist/<name>.css`, and a system's own copy of it) and into the element's.
//
// What settling does in the browsers is held by `src/primitives/motion.test.ts` and, over every fixture of every spec,
// by `src/first-frame-all.test.ts`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(pkg, 'src');
const relative = (file) => path.relative(src, file).split(path.sep).join('/');

const files = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(file);
    return /\.ts$/.test(entry.name) && !/\.(test|d)\.ts$/.test(entry.name) ? [file] : [];
  });

test('no element extends LitElement or ReactiveElement itself: each extends TanreiElement or TanreiLightElement', () => {
  const own = [];
  for (const file of files(src)) {
    if (relative(file) === 'primitives/element.ts') continue;
    for (const [line] of fs.readFileSync(file, 'utf8').matchAll(/^.*\bextends (?:LitElement|ReactiveElement)\b.*$/gm)) own.push(`${relative(file)}: ${line.trim()}`);
  }
  assert.deepEqual(own, []);
});

/** The elements that draw in the light DOM: each has the text of its stylesheet written into it by the build (`TANREI_<NAME>_CSS`). */
const light = files(path.join(src, 'components'))
  .filter((file) => /\bdeclare const TANREI_[A-Z_]+_CSS\b/.test(fs.readFileSync(file, 'utf8')))
  .map((file) => path.basename(file, '.ts'))
  .sort();

test('there are elements that draw in the light DOM to look at', () => {
  assert.ok(light.includes('tree-view') && light.includes('table') && light.length >= 10, light.join(', '));
});

const built = fs.existsSync(path.join(pkg, 'dist/tanrei.bundle.js'));
const settles = (text, name) => text.includes(`:where(tanrei-${name})[data-tanrei-settling]:not([data-tanrei-appear])`) && text.includes(`:where(tanrei-${name})[data-tanrei-settling] :not([data-tanrei-appear])`);

test('the stylesheet of each element that draws in the light DOM settles it: the page\'s copy, a system\'s copy and the element\'s own', { skip: !built && 'run the build first' }, () => {
  const missing = [];
  for (const name of light) {
    const sheets = [`dist/${name}.css`, ...fs.readdirSync(path.join(pkg, 'dist/systems')).filter((file) => file.endsWith(`.${name}.css`)).map((file) => `dist/systems/${file}`), `dist/components/${name}/${name}.js`];
    for (const sheet of sheets) if (!settles(fs.readFileSync(path.join(pkg, sheet), 'utf8'), name)) missing.push(sheet);
  }
  assert.deepEqual(missing, []);
});
