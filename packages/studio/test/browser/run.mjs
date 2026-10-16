// `pnpm test:browser` — the page half of Theme Studio, in a real browser.
//
//   1. builds the standalone app exactly as `build:app` does, but into a temporary directory — `dist-app/` is what
//      the CLI packs, and a test run must not empty it under a build that is reading it;
//   2. runs test/browser/*.test.js (node:test + Playwright's Chromium); every test starts its own
//      test/mock-server.mjs on a free port, over its own layer file, and takes both down again;
//   3. removes the build. Nothing stays: no server, no port, no directory.
//
//   TANREI_STUDIO_APP=<dir>   use an app that is already built (e.g. dist-app) instead of building one
//   node test/browser/run.mjs typefaces        only the test files whose name contains "typefaces"
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { runNodeTests } from '../../../tools/src/run-node-tests.js';
import { sweepTempDirs, tempDir } from '../../../tools/src/test-tmp.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const started = performance.now();
const seconds = (since) => `${((performance.now() - since) / 1000).toFixed(1)} s`;

let appDir = process.env.TANREI_STUDIO_APP && path.resolve(process.env.TANREI_STUDIO_APP);
let status = 1;
try {
  if (!appDir) {
    appDir = tempDir('studio-app');
    // The two steps of `build:app` (package.json), with another outDir. (`--check-systems` stays with build:app: it
    // resolves every shipped system, and test/browser/fonts.test.js looks at what a preset really draws.)
    const steps = [
      [process.execPath, [path.resolve(pkg, '../tools/src/font-faces.js'), 'app/fonts.generated.css']],
      [process.execPath, [path.join(pkg, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'app/vite.config.js', '--outDir', appDir, '--emptyOutDir', '--logLevel', 'warn']],
    ];
    for (const [command, args] of steps) {
      const step = spawnSync(command, args, { cwd: pkg, stdio: 'inherit' });
      if (step.status !== 0) throw new Error(`building the app failed: ${path.basename(args[0])} exited with ${step.status}`);
    }
    console.log(`# app built in ${seconds(started)}`);
  }
  if (!fs.existsSync(path.join(appDir, 'index.html'))) throw new Error(`${appDir} holds no built app`);
  const only = process.argv.slice(2);
  const files = fs.readdirSync(here).filter((name) => name.endsWith('.test.js') && (!only.length || only.some((word) => name.includes(word)))).map((name) => path.join('test/browser', name));
  const testsStarted = performance.now();
  // Through runNodeTests: a suite that fails to load, or a hook that throws, fails the run on every Node version.
  status = runNodeTests(files, { cwd: pkg, env: { ...process.env, TANREI_STUDIO_APP: appDir } });
  console.log(`# browser tests ran in ${seconds(testsStarted)} (${seconds(started)} with the build)`);
} catch (error) {
  console.error(error.message);
} finally {
  const left = sweepTempDirs();
  if (left.length) {
    console.error(`left behind: ${left.join(', ')}`);
    status ||= 1;
  }
}
process.exit(status);
