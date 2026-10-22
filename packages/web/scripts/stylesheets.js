// `@tanrei/web/tanrei.css`: every stylesheet of the package in one file, for a page that wants Tanrei's look whole.
// Written by scripts/build.js and read by test/stylesheets.test.mjs.

/** The export that is the one file, and the two it begins with: the page's base, then the tokens. */
export const ALL = './tanrei.css';
export const FIRST = ['./base.css', './tokens.css'];

/**
 * The stylesheets `tanrei.css` holds, as their exports name them: the base and the tokens, then every other `.css`
 * export in the order the exports list them. Not a preset's (`./systems/*.css`, opt in) and not itself.
 */
export function stylesheetExports(pkg) {
  const css = Object.keys(pkg.exports).filter((name) => name.endsWith('.css') && !name.includes('*') && name !== ALL);
  for (const first of FIRST) if (!css.includes(first)) throw new Error(`package.json exports no ${first}`);
  return [...FIRST, ...css.filter((name) => !FIRST.includes(name))];
}

/** The text of `tanrei.css`: each stylesheet whole, under a line that names it. `read` reads a file of the package. */
export function allStylesheets(pkg, read) {
  const parts = stylesheetExports(pkg).map((name) => `/* ── @tanrei/web/${name.slice(2)} ── */\n${read(pkg.exports[name].replace(/^\.\//, ''))}`);
  return `/* @tanrei/web/tanrei.css: the page's base, the default system's tokens and every stylesheet of the package, in one file. A preset's tokens (systems/<id>.css) are not in it. */\n${parts.join('\n')}`;
}
