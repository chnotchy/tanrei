// The build's `css` template stripper (scripts/css-literals.js): what it takes out of a component's styles, what it must
// leave (strings, custom property values, the spaces calc() and selectors need, interpolations, `/*!` notices), how it
// finds the templates in a module, and that the source maps it rewrites still point at the same code.
// Run by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { findCssTemplates, minifyCssLiterals, minifyCssParts, remapSourceMap } from '../scripts/css-literals.js';

const one = (text) => minifyCssParts([text])[0];
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('drops comments and indentation, and the whitespace beside braces, semicolons, commas, colons and parentheses', () => {
  const css = `
    /* The host. */
    :host {
      display: inline-flex;
      font-family: a , b;
      margin: var( --x , 0 );
    }
  `;
  assert.equal(one(css), ' :host{display:inline-flex;font-family:a,b;margin:var(--x,0);}');
});

test('keeps one space where whitespace separates tokens', () => {
  assert.equal(one('a  b,\n  c > d ~ e + f { x: 1px\n  2px; }'), 'a b,c > d ~ e + f{x:1px 2px;}');
  assert.equal(one(':host(:hover)  .a {}'), ':host(:hover) .a{}');
  assert.equal(one('.a :is(.b) {}'), '.a :is(.b){}');
  assert.equal(one('@media screen and  (min-width:  600px) {}'), '@media screen and (min-width: 600px){}');
  // A colon in parentheses keeps its space: a feature reads as written, not as a pseudo-class (`forced-colors:active`).
  assert.equal(one('@media (forced-colors: active) { x { y: z; } }'), '@media (forced-colors: active){x{y:z;}}');
  assert.equal(one('@supports (corner-shape: round) and (x: url(a.svg)) { a:hover { b: c; } }'), '@supports (corner-shape: round) and (x: url(a.svg)){a:hover{b:c;}}');
  assert.equal(one('x { y: z  !important; }'), 'x{y:z !important;}');
});

test('keeps the spaces around + and - in calc()', () => {
  assert.equal(one('x { width: calc(100%  -  2 * var(--a)); height: calc(1px +\n  2px); }'), 'x{width:calc(100% - 2 * var(--a));height:calc(1px + 2px);}');
  assert.equal(one('x { margin: -1px - -2px; }'), 'x{margin:-1px - -2px;}');
});

test('copies strings as they are: content, grid-template-areas, attribute selectors, font names', () => {
  assert.equal(one(`x { content: "  a  /* b */  "; }`), `x{content:"  a  /* b */  ";}`);
  assert.equal(one(`x {\n  grid-template-areas:\n    "a  a"\n    'b  c';\n}`), `x{grid-template-areas:"a  a" 'b  c';}`);
  assert.equal(one(`[data-x="a  b"] {}`), `[data-x="a  b"]{}`);
  assert.equal(one(`x { content: "a\\"  b"; }`), `x{content:"a\\"  b";}`);
  assert.equal(one(`x { content: '\\201C  '; }`), `x{content:'\\201C  ';}`);
});

test('copies an unquoted url() as it is', () => {
  assert.equal(one('x { background: url( a/b.svg#c  ) ; }'), 'x{background:url( a/b.svg#c  );}');
});

test('keeps the value of a custom property the same tokens with the same spaces between them', () => {
  assert.equal(one(':host {\n  --a:  1px ,\n    2px ;\n  --b: { a: b };\n  color: red ;\n}'), ':host{--a: 1px , 2px ;--b: { a: b };color:red;}');
  assert.equal(one('x { --shadow: 0 1px 2px rgb(0 0 0 / 0.2), 0 0 0 1px red; }'), 'x{--shadow: 0 1px 2px rgb(0 0 0 / 0.2), 0 0 0 1px red;}');
  assert.equal(one('x { --empty: ; y: z ; }'), 'x{--empty: ;y:z;}');
});

test('keeps the space after an escape, and an escaped colon is not a colon', () => {
  assert.equal(one('.a\\31  0 {}'), '.a\\31 0{}');
  assert.equal(one('.a\\: .b {}'), '.a\\: .b{}');
});

test('keeps a comment that would otherwise join two tokens, and every /*! comment', () => {
  assert.equal(one('a/* x */b {}'), 'a/**/b{}');
  assert.equal(one('a/* x */.b {}'), 'a.b{}');
  assert.equal(one('a /* x */ b {}'), 'a b{}');
  assert.equal(one('/*! Licence. */\n:host {}'), '/*! Licence. */ :host{}');
});

test('leaves interpolations alone, with the whitespace that may separate them from their neighbours', () => {
  assert.deepEqual(minifyCssParts(['\n  :host {\n    margin: ', ' ', ';\n    ', ': 1px;\n  }\n  ', '\n']), [' :host{margin:', ' ', ';', ': 1px;}', ' ']);
  assert.deepEqual(minifyCssParts(['x { content: "', '  a"; }']), ['x{content:"', '  a";}']);
  assert.deepEqual(minifyCssParts(['', ' {\n  y: z;\n}']), ['', '{y:z;}']);
  assert.deepEqual(minifyCssParts(['x { width: calc(', ' - ', '); }']), ['x{width:calc(', ' - ', ');}']);
});

test('finds css templates in code, and not in comments, strings, regular expressions or other templates', () => {
  const source = [
    "import { css } from 'lit';",
    '// css`not this`',
    '/* css`nor this` */',
    "const s = 'css`nor this`';",
    'const r = /css`[/]`/g;',
    'const q = w[0]! / 2 / 1;',
    'const t = `css`;',
    'const d = 4 / 2 / 1;',
    'export const a = css`a { b: c; }`;',
    'export const b = css` x { y: ${cond ? css` p  { q: r; } ` : `  raw  `} } `;',
    'const o = { k: `${1}` };',
  ].join('\n');
  const found = findCssTemplates(source).map(({ parts }) => parts.map(([start, end]) => source.slice(start, end)));
  assert.deepEqual(found, [['a { b: c; }'], [' x { y: ', ' } '], [' p  { q: r; } ']]);
  const { code } = minifyCssLiterals(source);
  assert.ok(code.includes('css`a{b:c;}`'));
  assert.ok(code.includes('css` x{y:${cond ? css` p{q:r;}` : `  raw  `}}`'));
  assert.ok(code.includes("'css`nor this`'") && code.includes('`css`'));
});

test('leaves a template it cannot read to the end as it is', () => {
  const source = 'const a = css`x { /* ${y} */ z: 1; }`;';
  assert.equal(minifyCssLiterals(source).code, source);
});

test("every css template in the package's source can be read", () => {
  const files = fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'));
  let templates = 0;
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, 'src', file), 'utf8');
    const found = findCssTemplates(source);
    templates += found.length;
    // A plain count of the tags, outside comments: the scanner finds as many.
    const tags = source.split('\n').filter((line) => !/^\s*(?:\/\/|\*|\/\*)/.test(line)).join('\n').match(/(?<![\w$.])css`/g)?.length ?? 0;
    assert.equal(found.length, tags, `${file}: ${found.length} templates found, ${tags} tags`);
    const { code } = minifyCssLiterals(source);
    assert.equal(minifyCssLiterals(code).code, code, `${file}: minifying twice changes nothing more`);
  }
  assert.ok(templates > 100, `${templates} templates`);
});

test('moves a source map with the code', () => {
  const source = 'const a = css`\n  x {\n    y: z;\n  }\n`;\nfoo();\n';
  const { code, edits } = minifyCssLiterals(source);
  assert.equal(code, 'const a = css` x{y:z;}`;\nfoo();\n');
  // Line 0 col 0 → src 0:0; line 0 col 10 (`css`) → src 0:10; line 4 col 0 (the closing backtick) → src 4:0; line 5 col 0 (`foo`) → src 5:0.
  const map = { version: 3, sources: ['a.ts'], names: [], mappings: 'AAAA,UAAU;;;;AAIV;AACA' };
  const moved = remapSourceMap(map, source, edits);
  // The closing backtick is now on line 0, column 22, and `foo` on line 1; the code has three lines, the last empty.
  assert.equal(moved.mappings, 'AAAA,UAAU,YAIV;AACA;');
});
