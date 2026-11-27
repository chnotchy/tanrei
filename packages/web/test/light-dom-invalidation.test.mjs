// The package's light-DOM stylesheets (src/styles/*.css) are the page's own: every element of the page is styled by
// them. A selector that names two pointer or focus conditions as alternatives of one list — `:is(:hover, :focus-within)`
// — has WebKit restyle everything inside each element whose hover or focus changes, and the page's root is one of them:
// one rule of a tree view's made every pointer move and focus change on a long documentation page cost 60 ms, with no
// tree on it. One selector for each condition costs what the elements it styles cost.
// Run by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const styles = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'src', 'styles');
const ACTION = /^:(hover|active|focus|focus-visible|focus-within)$/;

/** The `:is()` and `:where()` lists of `css` with two or more alternatives that are a pointer or focus condition alone. */
function conditionLists(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  for (const match of text.matchAll(/:(?:is|where)\(([^()]*)\)/g)) {
    const alone = match[1].split(',').map((each) => each.trim()).filter((each) => ACTION.test(each));
    if (alone.length >= 2) found.push(match[0]);
  }
  return found;
}

test('finds a list of two conditions, and leaves a condition beside an attribute or a list of one', () => {
  assert.deepEqual(conditionLists('a:is(:hover, :focus-within) b {}'), [':is(:hover, :focus-within)']);
  assert.deepEqual(conditionLists('a:where(:focus-visible,:hover) {}'), [':where(:focus-visible,:hover)']);
  assert.deepEqual(conditionLists('a:is(:focus-visible, [data-x]) b {} a:is([data-y], [data-z]:hover) b {} a:hover b {} /* :is(:hover, :focus) */'), []);
});

test('no light-DOM stylesheet names two pointer or focus conditions as alternatives of one list', () => {
  const found = fs
    .readdirSync(styles)
    .filter((name) => name.endsWith('.css'))
    .flatMap((name) => conditionLists(fs.readFileSync(path.join(styles, name), 'utf8')).map((list) => `${name}: ${list}`));
  assert.deepEqual(found, [], 'write one selector for each condition');
});
