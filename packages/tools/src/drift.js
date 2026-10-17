// The generated half of the drift check: run every generator and name each generated file that differs from what the
// generators write now — a file they rewrite (stale, or edited by hand), make (missing) or leave out (one that should
// no longer exist).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { componentFiles } from '../../tokens-build/src/components-catalog.js';
import { keepFiles } from './keep.js';

/**
 * Every generator in the repository, in dependency order: [cwd, command, args, outputs]. An output is a file, or a
 * directory (written with a trailing `/`) the generator owns whole: every file under it is generated, so drift clears
 * it before the generator runs, and a file the generator no longer writes there — a wrapper of an element that is gone,
 * a file put there by hand — is reported as one that should not exist.
 */
export const GENERATORS = [
  ['.', 'node', ['packages/tokens-build/src/cli.js', 'generate'], []],
  // The glyph names the components and the docs site draw, and the icon axes of the shipped systems (read from the
  // resolved tokens the step before writes).
  ['.', 'node', ['packages/tools/src/glyphs.js'], ['packages/web/src/generated/glyphs.json', 'apps/docs/src/generated/glyphs.json']],
  // As the `generate` script of packages/web: what the analyzer reads and where it writes is its configuration's
  // (packages/web/custom-elements-manifest.config.mjs), written once.
  ['packages/web', 'node_modules/.bin/cem', ['analyze'], ['packages/web/custom-elements.json']],
  // One module per wrapper (src/generated/wrappers/) and the module that re-exports them.
  ['packages/react', 'node', ['scripts/generate.js'], ['packages/react/src/generated/']],
  // The component catalog and each shipped system's components manifest: read from the specs and from what the two
  // steps before write (the elements' manifest, the wrappers), so it runs after them.
  ['.', 'node', ['packages/tokens-build/src/components-catalog.js'], componentFiles()],
];

const isDirectory = (output) => output.endsWith('/');

/** The files `outputs` name in `root`, as paths relative to it: a file as it is, a directory as every file under it. */
export function outputFiles(root, outputs) {
  const under = (rel) => {
    const dir = path.join(root, rel);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? under(`${rel}${entry.name}/`) : [`${rel}${entry.name}`]));
  };
  return outputs.flatMap((output) => (isDirectory(output) ? under(output) : [output])).sort();
}

/**
 * Runs `generators` in `root` and compares every generated file — those of `listed()` (a manifest of generated files)
 * and the generators' own outputs — before and after.
 * With `checkOnly`, every file is put back as it was found, `keep` (more paths) with them.
 * @returns {{ changed: string[], removed: string[], files: string[], failure?: string }} `changed`: the files that
 *   differ, sorted; `removed`: those of them the generators no longer write (they should not exist); `files`: every
 *   file compared (before and after); `failure`: what a generator that failed printed (nothing is compared then).
 */
export function regenerate(root, generators, { checkOnly = false, listed = () => [], keep = [] } = {}) {
  const read = (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null);
  const tracked = () => [...listed(), ...generators.flatMap((g) => outputFiles(root, g[3] ?? []))];
  const before = new Map(tracked().map((rel) => [rel, read(rel)]));
  const kept = checkOnly ? keepFiles(root, [...before.keys(), ...keep]) : null;
  for (const [cwd, bin, args, outputs = []] of generators) {
    // A directory the generator owns is emptied first: what it does not write again is not there afterwards.
    for (const rel of outputFiles(root, outputs.filter(isDirectory))) fs.rmSync(path.join(root, rel));
    const run = spawnSync(bin, args, { cwd: path.join(root, cwd), encoding: 'utf8' });
    if (run.status !== 0) {
      if (kept) kept.restore(tracked());
      // Without --check too, a failed run does not leave an emptied directory without its files.
      else for (const [rel, text] of before) if (text !== null && read(rel) === null) writeFile(root, rel, text);
      return { changed: [], removed: [], files: [...before.keys()], failure: `${bin} ${args.join(' ')}\n${run.stdout}${run.stderr}` };
    }
  }
  const files = [...new Set([...before.keys(), ...tracked()])].sort();
  const changed = files.filter((rel) => (before.get(rel) ?? null) !== read(rel));
  const removed = changed.filter((rel) => read(rel) === null);
  kept?.restore(files);
  return { changed, removed, files };
}

function writeFile(root, rel, text) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}
