// What a published package's tarball holds, against what it should not: the files `npm pack` would put in it (the
// `files` list, `.npmignore` and npm's own rules decide), read without packing anything. Every published package's
// tests hold its tarball to this, after its build:
//
//   import { packed } from '../../tools/src/pack-contents.js';
//   const { files, findings } = packed(dir);
//   assert.deepEqual(findings, []);
//
// A tarball carries the package's code and what that code reads at run time. Not in it:
// - the repository's own working files: tests, fixtures, snapshots, TypeScript sources (a declaration `.d.ts` is
//   code's types and ships), a compiler's build info;
// - a source map that a debugger or a bundler cannot follow: one naming a source that is neither in the tarball nor
//   written into the map (`sourcesContent`). A map of the repository's `src/`, shipped without `src/`, points at
//   files only the maintainers' checkout has — and a bundler that reads it warns about every one;
// - a `//# sourceMappingURL=` comment naming a map the tarball does not hold.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const WORKING_FILE = [
  [/(?:^|\/)(?:test|tests|__tests__|fixtures?|__snapshots__|snapshots)\//, 'a test, fixture or snapshot directory'],
  [/\.(?:test|spec)\.[cm]?[jt]sx?$/, 'a test file'],
  [/(?<!\.d)\.[cm]?tsx?$/, 'a TypeScript source (only declarations ship)'],
  [/\.tsbuildinfo$/, "the compiler's build info"],
];
const MAPPING_URL = /\/\/# sourceMappingURL=(\S+)\s*$/;

/** The paths `npm pack` would put in the tarball of the package at `dir`, relative to it, with `/` separators. */
export function packedFiles(dir) {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out)[0].files.map((file) => file.path.split(path.sep).join('/'));
}

/** What should not be in a tarball of these files: one line each. `read(file)` returns a packed file's text. */
export function packFindings(files, read) {
  const packed = new Set(files);
  const findings = [];
  for (const file of files) {
    const working = WORKING_FILE.find(([pattern]) => pattern.test(file));
    if (working) findings.push(`${file}: ${working[1]}`);
    if (file.endsWith('.map')) {
      const map = JSON.parse(read(file));
      const missing = map.sources.filter((source, index) => typeof map.sourcesContent?.[index] !== 'string' && !packed.has(path.posix.join(path.posix.dirname(file), map.sourceRoot ?? '', source)));
      if (missing.length) findings.push(`${file}: a source map naming ${missing.length} source(s) neither packed nor in sourcesContent, e.g. ${missing[0]}`);
    } else if (/\.[cm]?js$/.test(file)) {
      const url = read(file).match(MAPPING_URL)?.[1];
      if (url && !url.startsWith('data:') && !packed.has(path.posix.join(path.posix.dirname(file), url))) findings.push(`${file}: names the source map ${url}, which is not packed`);
    }
  }
  return findings;
}

/** The files `npm pack` would put in the tarball of the package at `dir`, and what should not be among them. */
export function packed(dir) {
  const files = packedFiles(dir);
  return { files, findings: packFindings(files, (file) => fs.readFileSync(path.join(dir, file), 'utf8')) };
}
