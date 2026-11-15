// Text is set from a type role's longhands, read where it is drawn (src/styles/type.ts), read from the source.
//
// A custom property is resolved where it is declared, and the tokens are declared on the root: a role's composite
// (`--…-<role>-font`) is the root's, so a component that set `font: var(<role>-font)` ignored a product's
// `<role>-font-size` on one of its instances. src/type-longhands.test.ts overrides each longhand in a browser, for a
// component of each way of reading them; this is the early word for every file:
//
// - no source names a role's composite (a name ending in `-font`, a private `--_…font` that would hold one, or a
//   token pattern built to end in `-font`);
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
};

function files(dir) {
  return fs.readdirSync(path.join(pkg, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(rel);
    return /\.(ts|css)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [rel] : [];
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

const composed = (value) => {
  const parts = /^(\S+) (\S+)\/(\S+) (\S+)$/.exec(value);
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

test('the checks see the declarations: the composed ones are found and counted', () => {
  // Written out (a stylesheet, a size member's private properties), or through a helper of src/styles/type.ts.
  const written = SOURCES.flatMap(({ text }) => fontValues(text)).filter(composed).length;
  const helped = SOURCES.reduce((sum, { text }) => sum + [...text.matchAll(/\btypeface(?:Of|From)?\(/g)].length, 0);
  assert.ok(written + helped > 200, `only ${written} composed font declarations and ${helped} helper calls were found`);
  // And they refuse what they are for.
  assert.equal(code('a { font: var(--tanrei-comp-x-label-typescale-font); }').match(COMPOSITE)?.length, 1);
  assert.equal(code('`  --_font: ${ref((v) => `${P}-${m}-${v}-font`)};`').match(COMPOSITE)?.length, 2);
  assert.equal(composed('var(--a-font-size) var(--a-font-weight)/var(--a-line-height) var(--a-font-family)'), false);
  assert.equal(composed('var(--a-font-weight) var(--a-font-size)/var(--a-line-height) var(--a-font-family)'), true);
});
