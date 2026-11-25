// A production bundle leaves the debug reports out. What a debug build tells the developer (`report()`, a missing
// word's `effect`) is guarded where it starts by `DEBUG` (src/primitives/debug.ts), never by a call: a browser bundler
// reads the package's `browser` field, takes src/primitives/debug.bundled.ts in its place, replaces its bare
// `process.env.NODE_ENV` with "production" and drops what the constant guards — the message with the call. Without a
// bundler (and in Node) the module is the one that reads `process` in a try: a value at run time, true where there is
// no `process`.
//
// `@tanrei/web/all` bundled twice, as a product's esbuild would bundle it for the browser — production and development
// — and a sample of reports from across the package (each written where a guard starts, in its own form: a guarded
// `if`, a guarded statement, a word's effect) looked for in each. Run after the build (`dist/`), by
// `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

/** Reports a debug build makes, each written where its guard starts; the source each comes from. */
const SAMPLES = {
  'the menu-button slot is for a frame without a header': 'src/components/app-shell/app-shell.ts (APS-34)',
  'whose radio buttons are controls; spacing': 'src/components/field-group/field-group.ts (FGR-25)',
  'is not a finite, non-negative number of milliseconds': 'src/components/loading-indicator/loading-indicator.ts (LDG-14)',
  'nothing tells people who cannot see the arc': "src/components/button/button.ts (BTN-37, a missing word's effect)",
  'the more button is drawn and opens its menu, and has no accessible name': "src/components/app-bar/app-bar.ts (APB-33, a missing word's effect)",
  'the clear button has no accessible name; give it one': 'src/components/combobox/combobox.ts (CMB-20, a word recorded as lacking in every build)',
};

const bundle = async (mode) => {
  const { outputFiles } = await build({
    entryPoints: [path.join(root, 'dist/all.js')],
    absWorkingDir: root,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    minify: true,
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
  });
  return outputFiles[0].text;
};
const [production, development] = await Promise.all([bundle('production'), bundle('development')]);

test('a browser bundler takes the module whose constant it can replace', () => {
  assert.deepEqual(pkg.browser, { './dist/primitives/debug.js': './dist/primitives/debug.bundled.js' });
  for (const file of Object.values(pkg.browser)) assert.ok(fs.existsSync(path.join(root, file)), `${file} is built`);
  // The run-time reading of `process` is not in a browser bundle: the constant was replaced.
  assert.ok(!/\bprocess\./.test(production), 'the production bundle reads process');
  assert.ok(!/\bprocess\./.test(development), 'the development bundle reads process');
});

test('a development bundle carries every sampled report', () => {
  for (const [text, from] of Object.entries(SAMPLES)) assert.ok(development.includes(text), `${from}: "${text}" is not in the development bundle`);
});

test('a production bundle carries none of them', () => {
  for (const [text, from] of Object.entries(SAMPLES)) assert.ok(!production.includes(text), `${from}: "${text}" is in the production bundle`);
});

test('without a bundler the constant is read at run time: true without process, false under NODE_ENV "production"', () => {
  const source = fs.readFileSync(path.join(root, 'dist/primitives/debug.js'), 'utf8');
  assert.equal((source.match(/export const DEBUG\b/g) ?? []).length, 1);
  const script = source.replace(/export const DEBUG\b/, 'var DEBUG');
  const read = (context) => vm.runInNewContext(`${script}; DEBUG`, context);
  assert.equal(read({}), true);
  assert.equal(read({ process: { env: {} } }), true);
  assert.equal(read({ process: { env: { NODE_ENV: 'development' } } }), true);
  assert.equal(read({ process: { env: { NODE_ENV: 'production' } } }), false);
});
