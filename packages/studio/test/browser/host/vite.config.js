// The documentation host of test/browser/share.test.js, built by test/browser/run.mjs into a directory of its own: the
// Studio and the page sheet's worker, bundled as a documentation bundles them (the Studio's plugin for the page and for
// the worker).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { tanreiStudio } from '../../../vite-plugin.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../../..');

export default defineConfig({
  root: here,
  base: './',
  plugins: [tanreiStudio()],
  worker: { format: 'es', plugins: () => [tanreiStudio()] },
  server: { fs: { allow: [repoRoot] } },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 4000 },
});
