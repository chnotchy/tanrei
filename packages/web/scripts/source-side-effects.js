// The package's `sideEffects` (package.json) applied to its TypeScript sources, for an esbuild build made from them.
//
// The field names the published modules (`./dist/<path>.js`): a product's bundler reads it, and keeps a bare
// `import './button.js'` of a module it lists. The sources are not published, so the field does not name them; but this
// package's own bundle (scripts/build.js, dist/tanrei.bundle.js) is made from them, and esbuild, reading the same field
// for `src/`, would treat every source module as free of side effects and drop each bare import of one (a calendar
// without its buttons). This plugin answers for the sources what the field answers for their built modules: a module
// `src/<path>.ts` is a side effect when the field lists `./dist/<path>.js`. One list, the one that ships.
//
// A module a plugin resolves does not get the tsconfig.json esbuild would find beside it: a build that uses this names
// it (`tsconfig: 'tsconfig.json'`), or the components' class fields compile with the wrong semantics.
import fs from 'node:fs';
import path from 'node:path';

const AGAIN = Symbol('source-side-effects');

/** A `sideEffects` glob (`**` crosses directories, `*` does not) as a regular expression over a `/`-separated path. */
function globPattern(glob) {
  const source = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/|\*/g, (wildcard) => (wildcard === '*' ? '[^/]*' : '(?:[^/]+/)*'));
  return new RegExp(`^${source}$`);
}

/** The source paths (relative to the package, `src/<path>.ts`) the field makes side effects, as patterns. */
export function sourcePatterns(root) {
  const { sideEffects } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return sideEffects
    .filter((entry) => entry.startsWith('./dist/') && entry.endsWith('.js'))
    .map((entry) => globPattern(`src/${entry.slice('./dist/'.length, -'.js'.length)}.ts`));
}

/** An esbuild plugin: each module under `root/src/` that the field makes a side effect is kept wherever it is imported. */
export function sourceSideEffectsPlugin(root) {
  const patterns = sourcePatterns(root);
  return {
    name: 'source-side-effects',
    setup(build) {
      // A relative or an absolute path: a package's name never resolves into this package's sources.
      build.onResolve({ filter: /^(?:\.\.?\/|\/)/ }, async (args) => {
        if (args.pluginData === AGAIN || !args.resolveDir) return undefined;
        const resolved = await build.resolve(args.path, { kind: args.kind, importer: args.importer, namespace: args.namespace, resolveDir: args.resolveDir, pluginData: AGAIN });
        if (resolved.errors.length > 0 || resolved.namespace !== 'file') return undefined;
        const file = path.relative(root, resolved.path).split(path.sep).join('/');
        if (!patterns.some((pattern) => pattern.test(file))) return undefined;
        return { path: resolved.path, namespace: 'file', sideEffects: true };
      });
    },
  };
}
