// The stylesheets for the time before the elements are defined are written with every selector filed under the element
// it styles (scripts/filed-selectors.js says why: a rule an engine cannot file is tried on every element of the page,
// and WebKit paid 264 ms of a restyle of the docs' Button page for the cloak's, 46 ms once each was filed).
// Run by `pnpm --filter @tanrei/web test:node`, after the build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { alternatives, fileSelector, fileSelectors, filed } from '../scripts/filed-selectors.js';

const pkg = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('an engine files a selector under the element its rightmost compound names, in a :where() of one selector too', () => {
  assert.ok(filed('tanrei-tag:not(:defined)'));
  assert.ok(filed(':where(tanrei-tag:not(:defined))'));
  assert.ok(filed(':where(tanrei-tag):where(:not(:defined):not([hidden]))::before'));
  assert.ok(filed(':where(tanrei-list:not(:defined) > tanrei-list-item)'));
  assert.ok(filed(':where(tanrei-menu:not(:defined)) :where(tanrei-menu-item)'));
  assert.ok(!filed(':where(tanrei-checkbox, tanrei-switch):where(:not(:defined))'));
  assert.ok(!filed(':where(tanrei-menu:not(:defined)) :where(tanrei-menu-item, tanrei-submenu)'));
  assert.ok(!filed(':where(tanrei-tag) :where([slot])'));
});

test('a :where() list that names elements is written as one selector for each, its specificity none', () => {
  assert.deepEqual(fileSelector(':where(tanrei-checkbox, tanrei-switch):where(:not(:defined):not([hidden]))::before'), [
    ':where(tanrei-checkbox):where(:not(:defined):not([hidden]))::before',
    ':where(tanrei-switch):where(:not(:defined):not([hidden]))::before',
  ]);
  // the rightmost compound's list, after a combinator
  assert.deepEqual(fileSelector(':where(tanrei-menu[open]:not(:defined)) :where(tanrei-menu-item, tanrei-submenu):where([label])'), [
    ':where(tanrei-menu[open]:not(:defined)) :where(tanrei-menu-item):where([label])',
    ':where(tanrei-menu[open]:not(:defined)) :where(tanrei-submenu):where([label])',
  ]);
  // alternatives that are selectors of their own, and a list of attributes beside them, which names no element
  assert.deepEqual(fileSelector(":where(tanrei-tabs:not(:defined) > tanrei-tab-panel, tanrei-tab-view:not(:defined) > tanrei-tab-panel):where([a], [b='x, y'])"), [
    ":where(tanrei-tabs:not(:defined) > tanrei-tab-panel):where([a], [b='x, y'])",
    ":where(tanrei-tab-view:not(:defined) > tanrei-tab-panel):where([a], [b='x, y'])",
  ]);
  // inside a :where() of one selector, an :is() list too (none of it has a specificity there)
  assert.deepEqual(fileSelector(':where(tanrei-toolbar :is(tanrei-button, tanrei-chip):not(:defined))'), [':where(tanrei-toolbar :is(tanrei-button):not(:defined))', ':where(tanrei-toolbar :is(tanrei-chip):not(:defined))']);
  // what is filed, what names no element, and an :is() whose specificity counts, as written
  for (const selector of [':where(tanrei-tag:not(:defined))', ':where([slot], [hidden])', ':is(tanrei-a, tanrei-b):not(:defined)']) assert.deepEqual(fileSelector(selector), [selector]);
});

test('a stylesheet keeps its comments, at-rules, declarations and order, each selector on a line of its own', () => {
  const css = "/* head */\n@layer x {\n  /* a, b */\n  :where(a-a, b-b):where(:not(:defined)) {\n    content: '{;}';\n  }\n  @media (pointer: coarse) {\n    :where(c-c:not(:defined)) { color: red; }\n  }\n}\n";
  assert.equal(fileSelectors(css, 'x.css'), "/* head */\n@layer x {\n  /* a, b */\n  :where(a-a):where(:not(:defined)),\n  :where(b-b):where(:not(:defined)) {\n    content: '{;}';\n  }\n  @media (pointer: coarse) {\n    :where(c-c:not(:defined)) { color: red; }\n  }\n}\n");
  assert.throws(() => fileSelectors('a { b { color: red; } }', 'nested.css'), /a style rule inside another/);
});

test('every selector of the cloak, the menu’s and the menubar’s stylesheet is filed under an element', () => {
  for (const file of ['dist/cloak.css', 'dist/menu.css', 'dist/menubar.css']) {
    const css = fs.readFileSync(path.join(pkg, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const unfiled = [];
    let count = 0;
    for (const [, prelude] of css.matchAll(/([^{};]+)\{/g)) {
      if (prelude.trim().startsWith('@')) continue;
      for (const selector of alternatives(prelude)) {
        count += 1;
        if (!filed(selector)) unfiled.push(selector);
      }
    }
    assert.ok(count > 5, `${file}: ${count} selectors`);
    assert.deepEqual(unfiled, [], `${file}: selectors an engine tries on every element`);
  }
});
