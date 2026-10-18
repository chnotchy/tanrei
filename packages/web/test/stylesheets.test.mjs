// `@tanrei/web/base.css` and `@tanrei/web/tanrei.css`, as built (`dist/`): the base is in its own cascade layer and
// writes nothing but tokens on the page's two elements, and the one file is the base, the tokens and every other
// stylesheet the package exports, each whole, in the order of the exports. Run after the build, by
// `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { allStylesheets, stylesheetExports } from '../scripts/stylesheets.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('the base is one cascade layer, tanrei.base, that writes tokens on <html> and <body> and nothing else', () => {
  const css = withoutComments(read('dist/base.css')).trim();
  assert.match(css, /^@layer tanrei\.base \{[\s\S]*\}$/);
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => [selector.trim(), body.trim()]);
  assert.deepEqual(rules.map(([selector]) => selector), ['html', 'body']);
  for (const [selector, body] of rules) {
    for (const declaration of body.split(';').map((d) => d.trim()).filter(Boolean)) {
      const [property, value] = declaration.split(/:\s*/);
      // The colors and the face are the system's; the one literal is the body's margin taken away.
      assert.ok(/^var\(--tanrei-sys-[a-z0-9-]+\)$/.test(value) || (property === 'margin' && value === '0'), `${selector} { ${declaration} }`);
      // The page's scheme is the tokens' (a forced theme on <html> must win), and the root's font size is what rem means.
      assert.notEqual(property, 'color-scheme');
      if (selector === 'html') assert.ok(!/^font/.test(property), `html { ${declaration} }: a face on the root changes rem`);
    }
  }
});

test('tanrei.css is the base, the tokens and every other stylesheet the package exports, each whole, in the order of the exports', () => {
  const names = stylesheetExports(pkg);
  assert.deepEqual(names.slice(0, 2), ['./base.css', './tokens.css']);
  const exported = Object.keys(pkg.exports).filter((name) => name.endsWith('.css') && !name.includes('*') && name !== './tanrei.css');
  assert.deepEqual([...names].sort(), [...exported].sort(), 'every stylesheet export, and no other');
  // A preset's tokens are opted into, one at a time: not in the file.
  assert.ok(!names.some((name) => name.startsWith('./systems/')));
  const all = read('dist/tanrei.css');
  assert.equal(all, allStylesheets(pkg, (file) => read(file)));
  let at = 0;
  for (const name of names) {
    const text = read(pkg.exports[name].replace(/^\.\//, ''));
    const found = all.indexOf(text, at);
    assert.ok(found >= at, `${name} is in tanrei.css whole, after the one before it`);
    at = found + text.length;
  }
});

test('both are exported', () => {
  assert.equal(pkg.exports['./base.css'], './dist/base.css');
  assert.equal(pkg.exports['./tanrei.css'], './dist/tanrei.css');
});
