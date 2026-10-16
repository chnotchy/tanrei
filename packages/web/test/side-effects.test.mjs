// The package's `sideEffects` (package.json) against the modules that define an element. A bundler that honours the
// field (esbuild, Rollup, Rolldown and Vite, webpack) treats a module the field leaves out as free of side effects, and
// drops a bare `import './button.js'` of it: the element that module defines is never defined, and a calendar draws
// without its buttons. So every module that calls `customElements.define`, and every module that bare-imports one, is
// listed — in `dist/`, which a product bundles, and in `src/`, which this package's own bundle (scripts/build.js) and a
// build from the sources are made from.
//
// esbuild is the judge: each such module is bundled alone, as a product would import it (`import '<module>'`), and the
// bundle must keep every definition the module's bare imports reach, with no import ignored. Run after the build
// (`dist/`), by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const DEFINE = /customElements\.define\(/g;
const BARE_IMPORT = /^import\s+['"](\.{1,2}\/[^'"]+)['"];?\s*$/gm;

/** Every source module of the package: TypeScript under src/, not a test and not a declaration. */
function sources(dir = path.join(root, 'src')) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(file);
    return /\.ts$/.test(entry.name) && !/\.(?:test|d)\.ts$/.test(entry.name) ? [file] : [];
  });
}

const modules = new Map(
  sources().map((file) => {
    const text = fs.readFileSync(file, 'utf8');
    const bare = [...text.matchAll(BARE_IMPORT)].map((match) => path.resolve(path.dirname(file), match[1]).replace(/\.js$/, '.ts')).filter((target) => fs.existsSync(target));
    return [file, { defines: text.match(DEFINE)?.length ?? 0, bare }];
  }),
);

/** The modules a module evaluates through its bare imports, itself included. */
function reached(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  for (const target of modules.get(file)?.bare ?? []) reached(target, seen);
  return seen;
}

// A module counts when evaluating it defines an element: it defines one, or it bare-imports a module that does.
const defining = [...modules.keys()].filter((file) => [...reached(file)].some((target) => modules.get(target).defines > 0)).sort();
const relative = (file) => path.relative(root, file);
const built = (file) => path.join(root, 'dist', path.relative(path.join(root, 'src'), file).replace(/\.ts$/, '.js'));

test('the modules that define an element are found', () => {
  // A floor, not a count: the components alone are more than eighty.
  assert.ok(defining.length > 80, `found ${defining.length}`);
  assert.ok(defining.includes(path.join(root, 'src/components/button/button.ts')));
  assert.ok(defining.includes(path.join(root, 'src/primitives/field-frame.ts')), 'field-frame.ts bare-imports the tag');
});

test('the list names the same modules in src/ and in dist/, and none that is gone', () => {
  const list = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).sideEffects;
  // The bundle is built from src/index.ts, which the list names: it has no source of its own.
  const inDist = list.filter((entry) => entry.startsWith('./dist/') && entry !== './dist/tanrei.bundle.js').map((entry) => entry.slice('./dist/'.length).replace(/\.js$/, ''));
  const inSrc = list.filter((entry) => entry.startsWith('./src/')).map((entry) => entry.slice('./src/'.length).replace(/\.ts$/, ''));
  assert.deepEqual([...inSrc].sort(), [...inDist].sort(), 'name each module in both halves: "./src/<path>.ts" beside "./dist/<path>.js"');
  const gone = inSrc.filter((entry) => !entry.includes('*') && !fs.existsSync(path.join(root, 'src', `${entry}.ts`)));
  assert.deepEqual(gone, []);
});

test('every module that defines an element, or bare-imports one, is a side effect: imported alone, it defines what it reaches', async () => {
  const missing = defining.map(built).filter((file) => !fs.existsSync(file));
  assert.deepEqual(missing.map(relative), [], 'build the package first (pnpm --filter @tanrei/web build)');
  const entries = defining.flatMap((file) => {
    const expected = [...reached(file)].reduce((sum, target) => sum + modules.get(target).defines, 0);
    return [file, built(file)].map((module) => ({ module, expected }));
  });
  const result = await build({
    entryPoints: entries.map((_, index) => ({ in: `entry:${index}`, out: `entry-${index}` })),
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    outdir: path.join(root, 'side-effects-out'),
    external: ['lit', 'lit/*', '@lit/*'],
    logLevel: 'silent',
    plugins: [
      {
        name: 'import-alone',
        setup(bundler) {
          bundler.onResolve({ filter: /^entry:/ }, (args) => ({ path: args.path, namespace: 'import-alone' }));
          bundler.onLoad({ filter: /.*/, namespace: 'import-alone' }, (args) => ({
            contents: `import ${JSON.stringify(entries[Number(args.path.slice('entry:'.length))].module)};\n`,
            resolveDir: root,
            loader: 'js',
          }));
        },
      },
    ],
  });
  const ignored = [...new Set(result.warnings.filter((warning) => warning.id === 'ignored-bare-import').map((warning) => warning.text.replace(path.join(root, '/'), '')))].sort();
  assert.deepEqual(ignored, [], 'a bundler drops these imports: list the module in package.json "sideEffects"');
  const output = new Map(result.outputFiles.map((file) => [path.basename(file.path, '.js'), file.text]));
  const lost = entries
    .map(({ module, expected }, index) => ({ module, expected, kept: output.get(`entry-${index}`)?.match(DEFINE)?.length ?? 0 }))
    .filter(({ expected, kept }) => kept < expected)
    .map(({ module, expected, kept }) => `${relative(module)}: ${kept} of ${expected} definitions kept`);
  assert.deepEqual(lost, []);
});
