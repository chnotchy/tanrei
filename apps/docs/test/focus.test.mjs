// The site's focus ring and the components that draw their own (src/styles/tanrei-theme.css, src/styles/prose.css).
//
// `tanrei-theme.css` is unlayered so that it wins over the framework's layers and the components' — which is wrong for
// one rule: the ring it gives everything that takes focus. A component's stylesheet that draws its own indicator says
// `outline: none` on the focused thing (a sortable header of the Table, a row of the Tree view) or says that a thing
// draws none (the main region, focused by the skip link), in a layer of the docs — and lost to the unlayered ring, so
// those were drawn with two rings, or with one they must not have. The ring is therefore in `docs.focus`, the first of
// the docs' layers: after the framework's, before every component's.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const read = (file) => fs.readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('`docs.focus` is named before any component stylesheet is loaded into a docs layer', () => {
  const css = read('prose.css');
  const statement = css.match(/@layer\s+([^;{]+);/);
  assert.ok(statement, 'prose.css begins with a layer statement');
  const names = statement[1].split(',').map((name) => name.trim());
  assert.ok(names.includes('docs.focus'), 'the statement names docs.focus');
  assert.ok(names.indexOf('starlight') < names.indexOf('docs.focus'), "after the framework's layers");
  assert.ok(statement.index < css.indexOf('@import'), 'before the first import');
  assert.equal(/layer\(docs\.focus\)/.test(css), false, 'no stylesheet is imported into it');
});

test('the ring of everything that takes focus is in `docs.focus`, and nowhere else in the theme', () => {
  const css = read('tanrei-theme.css');
  const layer = css.match(/@layer docs\.focus\s*\{([\s\S]*?\n)\}/);
  assert.ok(layer, 'tanrei-theme.css has the layer');
  assert.match(layer[1], /^\s*:focus-visible\s*\{[^}]*outline:/m);
  const outside = css.replace(layer[0], '');
  assert.equal(/(^|[\s,}])(\*)?:focus-visible\s*[{,]/m.test(outside), false, 'no unlayered rule gives every focused element an outline');
});
