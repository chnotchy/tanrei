// The web package's JavaScript never goes past the edition of the language its compiler targets. Neither compiler is
// the check: esbuild, which writes the bundle, lowers what it can to the target and passes the rest through as it is
// (a regular expression with duplicate group names or a modifier group reaches `dist/` unchanged), and the bundle
// takes Lit as Lit publishes it. So every file under `dist/` is parsed again here, by a parser that knows only the
// target's edition and refuses anything newer.
//
// The edition is read from the package's `tsconfig.json` (`compilerOptions.target`, `ES2022`): the compiler and this
// check cannot disagree. A hashbang (`#!`, the Node-only `dist/links/node/cli.js`) is allowed: it is ES2023 grammar,
// but every browser the package supports has read it for years (Chrome 74, Firefox 67, Safari 13.1).
//
// It checks syntax, not the library: a method newer than the edition (`Array.prototype.findLast`) is refused at compile
// time instead, by the tsconfig's `lib`.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';

/** The ECMAScript edition a tsconfig's `compilerOptions.target` names, as a year (`ES2022` → 2022). */
export function targetEdition(tsconfigFile) {
  const target = JSON.parse(fs.readFileSync(tsconfigFile, 'utf8')).compilerOptions?.target;
  const year = /^es(\d{4})$/i.exec(target ?? '')?.[1];
  if (!year) throw new Error(`${tsconfigFile}: compilerOptions.target is "${target}"; the syntax check reads an edition by its year (ES2022)`);
  return Number(year);
}

/** Every `.js` file under `dir`, relative to it, sorted. */
const scripts = (dir) =>
  fs
    .readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith('.js') && fs.statSync(path.join(dir, file)).isFile())
    .map((file) => file.split(path.sep).join('/'))
    .sort();

/**
 * The files under `dir` that do not parse as edition `year` of ECMAScript, each as `<file>:<line>:<column> <why>`;
 * empty when every one does. `files` is how many were read.
 */
export function syntaxProblems(dir, year) {
  const files = scripts(dir);
  const problems = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      parse(source, { ecmaVersion: year, sourceType: 'module', allowHashBang: true, locations: true });
    } catch (error) {
      const at = error.loc ? `:${error.loc.line}:${error.loc.column + 1}` : '';
      problems.push(`${file}${at} ${error.message.replace(/ \(\d+:\d+\)$/, '')}: not ES${year} syntax`);
    }
  }
  return { files: files.length, problems };
}
