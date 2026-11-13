#!/usr/bin/env node
// Removes the directories named on the command line, relative to the current directory: a package's `clean` script
// (`node ../tools/src/clean.js dist`) names exactly the build outputs turbo.json caches for it.
//
// turbo.json runs every package's `clean` task, uncached, before its `build` task. On a cache hit turbo does not run
// the build script, which is what would empty the directory: it copies the cached files over the ones on disk and
// removes nothing, so a file an earlier build wrote (on another branch, from a source that is gone) would stay and
// be tested and packed. Emptying the directory first makes a cache hit leave what a fresh build leaves.
import fs from 'node:fs';
import path from 'node:path';

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error('usage: clean.js <dir>...  (relative to the package)');
  process.exit(1);
}
const here = process.cwd();
for (const dir of dirs) {
  const target = path.resolve(here, dir);
  // Only a directory inside the package: a mistyped `..` or an absolute path must not remove anything else.
  if (path.isAbsolute(dir) || !target.startsWith(here + path.sep)) {
    console.error(`clean.js: ${dir} is not a directory inside ${here}`);
    process.exit(1);
  }
  fs.rmSync(target, { recursive: true, force: true });
}
