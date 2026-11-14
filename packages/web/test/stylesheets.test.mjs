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
  const exported = Object.keys(pkg.exports).filter((name) => name.endsWith('.css') && !name.includes('*') && name !== './tanrei.css' && name !== './cloak.css');
  assert.deepEqual([...names].sort(), [...exported].sort(), 'every stylesheet export but the cloak, and no other');
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

// The cloak (src/styles/cloak.css) is opted into on its own: an element it hides stays hidden while it is not defined,
// so a page whose script never arrives would show nothing of what is inside the elements. No other stylesheet holds it.
test('the cloak is exported on its own, hides every element the package defines, and is in no other stylesheet', () => {
  assert.equal(pkg.exports['./cloak.css'], './dist/cloak.css');
  const cloak = withoutComments(read('dist/cloak.css'));
  assert.match(cloak.trim(), /^@layer tanrei\.components \{[\s\S]*\}$/);
  assert.ok(!cloak.includes('tanrei-elements'), 'the mark is replaced by the names');
  const tags = [...new Set(JSON.parse(read('custom-elements.json')).modules.flatMap((module) => module.declarations ?? []).map((declaration) => declaration.tagName).filter(Boolean))];
  assert.ok(tags.length > 40, `${tags.length} elements`);
  const hidden = cloak.slice(0, cloak.indexOf('visibility: hidden'));
  const missing = tags.filter((tag) => !hidden.includes(`:where(${tag}:not(:defined))`));
  assert.deepEqual(missing, [], 'every element is hidden while it is not defined');
  // Every rule styles an element that is not defined, and only that element: no specificity, and no combinator outside
  // a parenthesis (a child or a sibling is never styled for an element's `:defined`; src/styles/has.test.ts says why).
  const rules = [...cloak.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selector]) => !selector.includes('@layer'));
  assert.ok(rules.length > 20, `${rules.length} rules`);
  /** The selectors of a list, split at its commas outside parentheses. */
  const selectors = (text) => {
    const out = [''];
    let depth = 0;
    for (const char of text) {
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (char === ',' && depth === 0) out.push('');
      else out[out.length - 1] += char;
    }
    return out.map((part) => part.trim());
  };
  /** What a selector says outside its parentheses. */
  const outside = (text) => {
    let depth = 0;
    let out = '';
    for (const char of text) {
      if (char === '(') depth += 1;
      if (depth === 0) out += char;
      if (char === ')') depth -= 1;
    }
    return out;
  };
  for (const [, list, body] of rules) {
    for (const selector of selectors(list)) {
      assert.match(outside(selector), /^(?::where)+$/, selector);
      assert.match(selector, /:not\(:defined\)/, selector);
    }
    // A value is a token's (or a private name's that holds one), a keyword, or arithmetic on them: no length, color or
    // time of its own.
    for (const [, property, value] of body.matchAll(/([a-z-]+):\s*([^;]+);/g)) {
      assert.ok(![...value.matchAll(/var\((--[a-z0-9_-]+)\)/g)].some(([, name]) => !/^--tanrei-comp-|^--_cloak-/.test(name)), `${property}: ${value}`);
      assert.ok(!/\d(?:px|rem|em|%|ms|s|vh|vw)\b|#[0-9a-f]{3}|rgb|hsl|oklch/i.test(value), `${property}: ${value}`);
    }
  }
  const names = stylesheetExports(pkg);
  assert.ok(!names.includes('./cloak.css'));
  // The first of its rules, the names of every element, is in no other stylesheet: not in tanrei.css, not in tokens.css.
  const hiding = cloak.slice(cloak.indexOf(':where(tanrei-'), cloak.indexOf('visibility: hidden'));
  for (const name of [...names, './tanrei.css']) assert.ok(!read(pkg.exports[name].replace(/^\.\//, '')).includes(hiding.trim()), `${name} holds no cloak`);
});

// The product's switch for the light DOM's glyphs (src/styles/icons.ts, `ICON_VISIBILITY`): while the icon font cannot
// draw, a product sets `--tanrei-icon-visibility: hidden` and no glyph's name is painted as letters. Every rule of a
// stylesheet that sets a glyph of the icon set in a box of its own reads it, and so does `.tanrei-icon`.
test('every glyph a stylesheet draws in the light DOM reads --tanrei-icon-visibility', () => {
  const READS = 'visibility: var(--tanrei-icon-visibility, inherit);';
  const dir = path.join(root, 'src/styles');
  const missing = [];
  let glyphs = 0;
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.css'))) {
    const css = withoutComments(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const at of [...css.matchAll(/font-family: var\(--tanrei-sys-icon-family-unselected\);/g)].map((match) => match.index)) {
      glyphs++;
      const body = css.slice(css.lastIndexOf('{', at) + 1, css.indexOf('}', at));
      if (!body.includes(READS)) missing.push(`${file}: ${css.slice(css.lastIndexOf('}', at) + 1, css.lastIndexOf('{', at)).trim()}`);
    }
  }
  assert.ok(glyphs >= 10, `${glyphs} glyph rules`);
  assert.deepEqual(missing, []);
  assert.ok(read('dist/icons.css').includes(READS), 'icons.css: .tanrei-icon');
});
