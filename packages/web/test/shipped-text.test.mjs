// Text a product's bundle carries that no component reads: a CSS comment inside a style string, and a value only the
// build uses. Each costs bytes in every bundle that imports its module, for nothing: a `css` template loses its comments
// in the build (scripts/css-literals.js), but a plain template or string handed to `unsafeCSS()` ships as it is written,
// and a top-level value made by a call (a template written out by a function) is kept by every bundler, used or not.
// So:
//   - a style string says why a rule is there in a source comment beside it (`// …`), never in a CSS comment inside it;
//   - what scripts/build.js imports from dist/ to write a stylesheet is a function it calls (or a plain literal),
//     never a value made at the top of a module: then a bundle that does not call it drops it.
//
// One esbuild run of `@tanrei/web/all` (every module a component imports), its whitespace and syntax minified as a
// product's bundler would, its names kept so that a build-only value can be found by name. Run after the build
// (`dist/`), by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

/** What scripts/build.js imports from dist/ that a component also uses at run time, with where. Exactly the list. */
const SHIPPED = {
  SHAPE_CSS: 'the corner rule, which every rounded box composes (`shape`, src/styles/shape.ts)',
  CODE_BLOCK_CSS: "the code block's light-DOM sheet, which the element adopts (src/components/code-block/code-block.ts)",
  SYNTAX_ROLES: "the code block's syntax roles, which the element reads (src/components/code-block/code-block.ts)",
};

/**
 * Modules whose style strings still carry CSS comments, or a build-only value, while another change moves them out:
 * what is found there is reported, not failed. Take a module off once nothing of it is reported (the test says so).
 */
const PENDING = {
  'src/styles/icons.ts': { names: ['ICONS_CSS'], why: 'the icons stylesheet is still a constant made by a call' },
  'src/primitives/focus-ring.ts': { names: [], why: "the focus ring's style strings still say why in CSS comments" },
};

const unescape = (text) => text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
const normal = (text) => unescape(text).replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();

const { outputFiles } = await build({
  entryPoints: [path.join(root, 'dist/all.js')],
  absWorkingDir: root,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  minifyWhitespace: true,
  minifySyntax: true,
  legalComments: 'none',
  write: false,
  logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const bundle = outputFiles[0].text;

/** The comments of each pending module's source, as the bundle would carry them. */
const pendingComments = new Map(
  Object.keys(PENDING).flatMap((file) => [...fs.readFileSync(path.join(root, file), 'utf8').matchAll(/\/\*(?!\*)[\s\S]*?\*\//g)].map((match) => [normal(match[0]), file])),
);

test('no style string ships a CSS comment', (t) => {
  // A CSS comment: `/*` and a space or a line break, to its `*/` (a regular expression's `/*` is never followed by
  // whitespace in this package's grammars, and a legal comment of a dependency is left out by `legalComments`).
  const found = [...bundle.matchAll(/\/\*\s[\s\S]*?\*\//g)].map((match) => normal(match[0]));
  const pending = found.filter((comment) => pendingComments.has(comment));
  for (const file of Object.keys(PENDING)) {
    const left = pending.filter((comment) => pendingComments.get(comment) === file).length;
    t.diagnostic(left ? `${file}: ${left} CSS comment(s) left, reported (${PENDING[file].why})` : `${file}: no CSS comment left — take its comments off PENDING`);
  }
  assert.deepEqual(
    found.filter((comment) => !pendingComments.has(comment)).map((comment) => (comment.length > 120 ? `${comment.slice(0, 117)}…` : comment)),
    [],
    'say why in a source comment beside the string (`// …`), not in a CSS comment inside it',
  );
});

test('no value only the build uses is in a bundle', (t) => {
  const source = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');
  const imported = [...source.matchAll(/const \{([^}]+)\} = await import\('\.\.\/dist\/[^']+'\)/g)].flatMap((match) => match[1].split(',').map((name) => name.trim()));
  assert.ok(imported.length > 5, `found ${imported.length} names that scripts/build.js imports from dist/`);
  const carried = (name) => new RegExp(`(?<![\\w$])${name}\\d*(?![\\w$])`).test(bundle);
  const pendingNames = new Set(Object.values(PENDING).flatMap(({ names }) => names));
  for (const name of pendingNames) if (!imported.includes(name) || !carried(name)) t.diagnostic(`${name}: no longer carried — take it off PENDING`);
  assert.deepEqual(
    imported.filter((name) => !(name in SHIPPED) && !pendingNames.has(name) && carried(name)),
    [],
    'make it a function that scripts/build.js calls, so that a bundle drops it',
  );
  // The list is exact: a name no bundle carries any more comes off it, and so does one the build no longer imports.
  assert.deepEqual(
    Object.keys(SHIPPED).filter((name) => !imported.includes(name) || !carried(name)),
    [],
  );
});
