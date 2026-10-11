// The standalone Theme Studio: a static site `tanrei studio` serves next to its HTTP API.
//   pnpm --filter @tanrei/studio build:app   →  packages/studio/dist-app/ (index.html + hashed assets, relative URLs)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { tanreiStudio } from '../vite-plugin.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

export default defineConfig({
  root: here,
  base: './',
  plugins: [tanreiStudio()],
  // The Studio bundles tokens/ and tanrei.config.json straight from the repository root.
  server: { fs: { allow: [repoRoot] }, proxy: process.env.TANREI_STUDIO_API ? { '/api': process.env.TANREI_STUDIO_API } : undefined },
  build: { outDir: path.resolve(here, '../dist-app'), emptyOutDir: true, target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1200 },
});
