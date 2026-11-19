// Text is set from a type role's longhands, read where it is drawn (src/styles/type.ts), read from the source.
//
// A custom property is resolved where it is declared, and the tokens are declared on the root: a composite declared
// there (`--…-<role>-font`) would be the root's, and would ignore a product's `<role>-font-size` on one instance. So a
// role has no composite: the token pipeline writes its longhands only (packages/tokens-build, src/emit/css.js).
// src/type-longhands.test.ts overrides each longhand in a browser, for a component of each way of reading them; this
// is the early word for every file:
//
// - no source, and no test, names a role's composite (a name ending in `-font`, a private `--_…font` that would hold
//   one, or a token pattern built to end in `-font`): there is none to read or to set;
// - every `font` declaration is `inherit`, or the shorthand composed from a role's four longhands in the order the
//   shorthand takes them: `font: <…font-weight> <…font-size>/<…line-height> <…font-family>`. A value outside them is
//   listed in ALLOWED with its reason; the list only shrinks.
// Run by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** `font` values that are not a role's, by `<file>: <value>`, with the reason. Only shrinks. */
export const ALLOWED = {
  'src/primitives/glyph-pending.ts: normal ${EM}px/1 var(${FAMILY})': "a hidden probe that measures the icon font's glyphs, at a size of its own; no text is drawn with it",
  "src/styles/type.ts: ${read('font-weight')} ${read('font-size')}/${lineBox(read('line-height'))} ${read('font-family')}": 'the helper every component composes its font with; what it writes is what the check reads everywhere else',
};

/** The sources under `dir` (`.ts` and `.css`), or with `tests` the browser tests among them (`.test.ts`). */
function files(dir, tests = false) {
  return fs.readdirSync(path.join(pkg, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(rel, tests);
    return /\.(ts|css)$/.test(entry.name) && entry.name.endsWith('.test.ts') === tests ? [rel] : [];
  });
}

/** The source without its comments (a block comment, or `//` to the end of the line where it does not follow a colon). */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** A role's composite, by name: `<role>-font` (or `-${size}-font`, `*-font`), or a private property that holds one. */
const COMPOSITE = /(?:[\w}*][-_]|--_)font(?![\w-])/g;

/** Every `font` declaration's value, whitespace collapsed; a TypeScript member named `font` is not one. */
function fontValues(text) {
  const values = [];
  for (const m of text.matchAll(/(?<![-\w.$])font:(?!\s*['"])\s*([^;]+?);/g)) {
    const value = m[1].replace(/\s+/g, ' ').trim();
    if (/^\w+$/.test(value) && value !== 'inherit') continue; // `font: string;`, a type
    if (/^[\w.]+, \w+:/.test(value)) continue; // `{ font: style.fontSize, direction: … }`, an object
    values.push(value);
  }
  return values;
}

// The line is the role's ratio rounded where the text is drawn (`lineBox()` in src/styles/type.ts): the bare ratio would
// draw a 12 px label on a 15.9996 px line, between pixels.
const composed = (value) => {
  const parts = /^(\S+) (\S+)\/round\(nearest, (\S+) \* 1em, 1px\) (\S+)$/.exec(value);
  return !!parts && parts[1].includes('font-weight') && parts[2].includes('font-size') && parts[3].includes('line-height') && parts[4].includes('font-family');
};

const SOURCES = [...files('src')].map((file) => ({ file, text: code(fs.readFileSync(path.join(pkg, file), 'utf8')) }));

test('no source reads a type role’s composite', () => {
  const found = SOURCES.flatMap(({ file, text }) => [...text.matchAll(COMPOSITE)].map((m) => `${file}: …${text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 2).replace(/\s+/g, ' ')}`));
  assert.deepEqual(found, [], 'read the longhands where the text is drawn (src/styles/type.ts), never `<role>-font`');
});

test('every font declaration is inherit, or the shorthand composed from a role’s longhands', () => {
  const seen = new Set();
  const wrong = SOURCES.flatMap(({ file, text }) =>
    fontValues(text)
      .filter((value) => value !== 'inherit' && !composed(value))
      .map((value) => `${file}: ${value}`)
      .filter((key) => {
        seen.add(key);
        return !(key in ALLOWED);
      }),
  );
  assert.deepEqual(wrong, [], 'compose `font` from the role’s longhands: `font: <role>-font-weight <role>-font-size/<role>-line-height <role>-font-family`');
  assert.deepEqual(
    Object.keys(ALLOWED).filter((key) => !seen.has(key)),
    [],
    'an ALLOWED entry no source has any more: take it off',
  );
});

/** The browser tests and their helpers. */
const TESTS = [...files('src', true), ...files('test').filter((file) => file.endsWith('.ts'))].map((file) => ({ file, text: code(fs.readFileSync(path.join(pkg, file), 'utf8')) }));

/** A role's composite being set: a declaration (`…-font: 500 …`) or an object key (`[T('label-typescale-font')]: …`, `'--…-font': …`, `fonts[…-font`] = …`). */
const SETS_COMPOSITE = /(?:[\w}*][-_]|--_)font(?![\w-])\s*['"`]?\)?[\]}]?\s*(?::|=(?!=))/g;

test('no test sets a type role’s composite', () => {
  // No component reads it (the checks above), so a test that set it to make a component's text larger or of another
  // family would change nothing, and could still pass. Set the longhands: `typeRole()` in test/harness.ts.
  const found = TESTS.flatMap(({ file, text }) => [...text.matchAll(SETS_COMPOSITE)].map((m) => `${file}: …${text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 12).replace(/\s+/g, ' ')}`));
  assert.deepEqual(found, [], 'set the role’s longhands (typeRole() in test/harness.ts), never `<role>-font`');
  assert.ok(TESTS.length > 100, `only ${TESTS.length} test files were read`);
  for (const set of ["{ [T('label-typescale-font')]: '500 2rem/1.5 Inter' }", "{ '--tanrei-comp-x-label-typescale-font': '' }", '`:root { ${T(\'label-typescale-huge-font\')}: 500 30px/1.25 Inter; }`', 'fonts[T(`${name}-typescale-font`)] = x']) {
    assert.equal(code(set).match(SETS_COMPOSITE)?.length, 1, set);
  }
  for (const read of ["probe.style.font = 'var(--tanrei-sys-typescale-body-font)';", "lineOf(page, T('title-typescale-font'))", "[T('headline-typescale-font'), T('x')]", 'a == b-font === c']) {
    assert.equal(code(read).match(SETS_COMPOSITE), null, read);
  }
});

test('no test reads a type role’s composite: there is none', () => {
  // `font: var(<role>-font)` is invalid at computed time, so a probe drawn with it takes its parent's font, and a test
  // that compared a component's text with it would compare it with whatever surrounds the probe. Draw a role's text
  // from its longhands: `roleFont()` in test/harness.ts.
  const found = TESTS.flatMap(({ file, text }) => [...text.matchAll(COMPOSITE)].map((m) => `${file}: …${text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 12).replace(/\s+/g, ' ')}`));
  assert.deepEqual(found, [], 'read the role’s longhands (roleFont() in test/harness.ts), never `<role>-font`');
});

test('the checks see the declarations: the composed ones are found and counted', () => {
  // Written out (a stylesheet, a size member's private properties), or through a helper of src/styles/type.ts.
  const written = SOURCES.flatMap(({ text }) => fontValues(text)).filter(composed).length;
  const helped = SOURCES.reduce((sum, { text }) => sum + [...text.matchAll(/\btypeface(?:Of|From)?\(/g)].length, 0);
  assert.ok(written + helped > 200, `only ${written} composed font declarations and ${helped} helper calls were found`);
  // And they refuse what they are for.
  assert.equal(code('a { font: var(--tanrei-comp-x-label-typescale-font); }').match(COMPOSITE)?.length, 1);
  assert.equal(code('`  --_font: ${ref((v) => `${P}-${m}-${v}-font`)};`').match(COMPOSITE)?.length, 2);
  assert.equal(composed('var(--a-font-size) var(--a-font-weight)/round(nearest, var(--a-line-height) * 1em, 1px) var(--a-font-family)'), false);
  assert.equal(composed('var(--a-font-weight) var(--a-font-size)/var(--a-line-height) var(--a-font-family)'), false, 'the bare ratio is not a line');
  assert.equal(composed('var(--a-font-weight) var(--a-font-size)/round(nearest, var(--a-line-height) * 1em, 1px) var(--a-font-family)'), true);
});

test('no source draws a role\'s line height bare: `line-height` takes the ratio rounded where the text is drawn', () => {
  // `line-height: var(<role>-line-height)` is the bare ratio, a line between pixels; write `lineBox()` (src/styles/type.ts),
  // `round(nearest, var(<role>-line-height) * 1em, 1px)`.
  const bare = /(?<![-\w])line-height:\s*(?:var\(--[\w-]*line-height\)|\$\{[^}]*line-height[^}]*\})\s*[;`]/g;
  const found = SOURCES.flatMap(({ file, text }) => [...text.matchAll(bare)].map((m) => `${file}: ${m[0]}`));
  assert.deepEqual(found, []);
  assert.equal(code('a { line-height: var(--tanrei-sys-typescale-body-line-height); }').match(bare)?.length, 1);
  assert.equal(code('a { line-height: round(nearest, var(--tanrei-sys-typescale-body-line-height) * 1em, 1px); }').match(bare), null);
  assert.equal(code('a { --_x-line-height: var(--tanrei-sys-typescale-body-line-height); }').match(bare), null, 'a private name that holds the ratio is no line');
});
