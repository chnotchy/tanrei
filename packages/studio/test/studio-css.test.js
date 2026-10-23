// Where `:has()` may stand in the Studio's stylesheets.
//
// A site that hosts the Studio on one page may load `src/studio.css` on every page (a host that imports it from a
// script its pages share does). A `:has()` whose argument looks down from the root (`:root:has(.ts)`) makes every
// element of each of those pages one whose changes the root must be asked about again, and the root's question is the
// whole document: 35 to 60 ms of style time on a component page of the docs, measured.
//
// The rule held here is the web package's (packages/web/src/styles/has.test.ts): `:has()` is asked of the element the
// rule styles, and never of the root, the body or the Studio's own root — each holds everything the Studio draws.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const SHEETS = ['../src/studio.css', '../app/app.css'];
const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** Every selector of a sheet that uses `:has()`: the text before each `{`, one selector of its list at a time. */
const withHas = (css) =>
  [...css.matchAll(/([^{}]+)\{/g)]
    .flatMap((match) => {
      const out = [''];
      let depth = 0;
      for (const char of match[1].trim()) {
        if (char === '(' || char === '[') depth += 1;
        if (char === ')' || char === ']') depth -= 1;
        if (char === ',' && depth === 0) out.push('');
        else out[out.length - 1] += char;
      }
      return out.map((selector) => selector.trim());
    })
    .filter((selector) => selector.includes(':has('));
/** `:has()` asked of an element that is not the one styled: something follows the `:has(…)` compound. */
const forAnother = (selector) => {
  let depth = 0;
  let after = '';
  let seen = false;
  for (let i = 0; i < selector.length; i += 1) {
    if (depth === 0 && selector.startsWith(':has(', i)) seen = true;
    if (selector[i] === '(') depth += 1;
    else if (selector[i] === ')') depth -= 1;
    else if (seen && depth === 0) after += selector[i];
  }
  return /[\s>+~]/.test(after.trim());
};
const WHOLE_PAGE = /(^|[\s>+~,(])(:root|html|body|\.ts)(?![\w-])[^\s>+~]*:has\(/;

test('the reading finds the shapes it is written for', () => {
  assert.deepEqual(withHas(':root:root:has(.ts) { a: b } .ts-x, .ts-y:has(> i) > b { c: d } .ts-z { e: f }'), [':root:root:has(.ts)', '.ts-y:has(> i) > b']);
  assert.match(':root:root:has(.ts)', WHOLE_PAGE);
  assert.match('body:has(.ts-open)', WHOLE_PAGE);
  assert.match('.ts:has(.ts-banner:not([hidden]))', WHOLE_PAGE);
  assert.doesNotMatch('.ts-panel:has(> .ts-help)', WHOLE_PAGE);
  assert.equal(forAnother('.ts-y:has(> i) > b'), true);
  assert.equal(forAnother('.ts-y:has(> i):hover'), false);
  assert.equal(forAnother('.ts-panel:has(> .ts-help)'), false);
});

for (const sheet of SHEETS) {
  test(`${sheet.slice(3)}: :has() is asked of the element a rule styles, and never of the root, the body or the Studio’s root`, () => {
    const css = read(sheet);
    assert.ok(css.length > 500, 'the sheet was read');
    const found = withHas(css);
    assert.deepEqual(found.filter((selector) => WHOLE_PAGE.test(selector)), [], 'asked of an element that holds the whole page, or the whole Studio');
    assert.deepEqual(found.filter(forAnother), [], 'asked of one element for the sake of another');
  });
}
