// What a product pays in bytes for one component: each element's own module (`@tanrei/web/components/<dir>`), and
// `@tanrei/web/all`, bundled alone as a product would import it — esbuild, minified, `process.env.NODE_ENV` defined as
// "production", Lit included — and compressed with gzip at level 9. Each is held to the budget perf-budgets.json gives
// it, and to the other components it may pull in (`allowedComponents`): a component that starts importing another
// grows by the whole of it, which a budget of a few per cent would hide until it is spent.
//
// Bytes, not time: the same sources make the same bundle on every machine, so a budget can be held exactly.
//
//   pnpm --filter @tanrei/web build && node --test test/bundle-budget.test.mjs    (part of `test:node`)
//   TANREI_MEASURE_BUDGETS=1 node --test test/bundle-budget.test.mjs              writes `measured` (never `budget`)
//
// A budget is the measured size and a margin (perf-budgets.json says which). A component over its budget is a finding:
// make it smaller, or raise its budget in the same change and say in the changeset why the bytes are worth it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const BUDGETS = path.join(root, 'perf-budgets.json');
const budgets = JSON.parse(fs.readFileSync(BUDGETS, 'utf8'));
const COMPONENT_INPUT = /^dist\/components\/([^/]+)\//;

/** Every element module of the package under dist/components/<dir>/<dir>.js, by directory. */
const components = fs
  .readdirSync(path.join(root, 'dist/components'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, 'dist/components', entry.name, `${entry.name}.js`)))
  .map((entry) => entry.name)
  .sort();

/** The entries measured: each component's module, and the entry that defines every component. */
const entries = { ...Object.fromEntries(components.map((dir) => [dir, `dist/components/${dir}/${dir}.js`])), all: 'dist/all.js' };

/**
 * Each entry bundled alone, in one esbuild run (one output per entry, no code shared between them): its gzip -9 size,
 * and the other components whose modules are in it.
 */
async function measure() {
  const result = await build({
    entryPoints: Object.entries(entries).map(([out, input]) => ({ in: input, out })),
    absWorkingDir: root,
    outdir: 'bundle-budget',
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    minify: true,
    write: false,
    metafile: true,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const sizes = {};
  for (const [name, input] of Object.entries(entries)) {
    const out = `bundle-budget/${name}.js`;
    const file = result.outputFiles.find((output) => path.relative(root, output.path) === out);
    assert.ok(file, `esbuild wrote no ${out}`);
    const own = input.match(COMPONENT_INPUT)?.[1];
    const pulled = [...new Set(Object.keys(result.metafile.outputs[out].inputs).map((source) => source.match(COMPONENT_INPUT)?.[1]).filter(Boolean))].filter((dir) => dir !== own).sort();
    sizes[name] = { bytes: file.contents.length, gzip: zlib.gzipSync(file.contents, { level: 9 }).length, pulled };
  }
  return { sizes, warnings: result.warnings };
}

const { sizes, warnings } = await measure();
const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

if (process.env.TANREI_MEASURE_BUDGETS) {
  for (const [name, { gzip }] of Object.entries(sizes)) if (budgets.bundles[name]) budgets.bundles[name].measured = gzip;
  budgets.bundlesMeasured = { date: new Date().toISOString().slice(0, 10), machine: `${os.platform()} ${os.arch()}, ${os.cpus().length} CPUs`, load: `load average ${os.loadavg()[0].toFixed(2)} (byte sizes do not depend on it)` };
  fs.writeFileSync(BUDGETS, `${JSON.stringify(budgets, null, 2)}\n`);
}

test('every component is bundled without a warning', () => {
  assert.deepEqual(
    warnings.map((warning) => warning.text),
    [],
  );
  // A floor, not a count: the components are more than eighty.
  assert.ok(components.length > 80, `found ${components.length}`);
});

test('every entry has a budget, and no budget is left for an entry that is gone', () => {
  assert.deepEqual(Object.keys(budgets.bundles).sort(), Object.keys(entries).sort());
});

for (const [name, { bytes, gzip, pulled }] of Object.entries(sizes)) {
  const entry = budgets.bundles[name];
  test(`${name}: ${kb(gzip)} gzip (${kb(bytes)} minified) — within its budget, pulling in only the components it may`, { skip: !entry && 'no budget (the test above fails)' }, () => {
    assert.ok(gzip <= entry.budget, `${name} is ${gzip} bytes gzip, over its budget of ${entry.budget} (measured ${entry.measured} on ${budgets.bundlesMeasured.date})`);
    if (name === 'all') return;
    // Exactly the list: a component that pulls in another now is a finding, and one that no longer does takes the name
    // off its list, so the list never allows more than is needed.
    assert.deepEqual(pulled, [...entry.allowedComponents].sort(), `${name} pulls in ${pulled.join(', ') || 'no other component'}`);
  });
}
