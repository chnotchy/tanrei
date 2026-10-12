// The standalone Theme Studio: a static site `tanrei studio` serves next to its HTTP API.
//   pnpm --filter @tanrei/studio build:app   →  packages/studio/dist-app/ (index.html + hashed assets, relative URLs)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { tanreiStudio } from '../vite-plugin.js';
import { thirdPartyLicensesPlugin } from '../../tools/src/third-party.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const require = createRequire(import.meta.url);
// Fontsource ships the Material Symbols fonts under the SIL Open Font License, which is printed for them; Google also
// publishes them under the Apache License 2.0, whose text is the LICENSE of the package that carries this app.
const symbols = 'Google also publishes Material Symbols under the Apache License, Version 2.0 (https://github.com/google/material-design-icons); its text is LICENSE at the root of this package.';
const notes = { '@fontsource-variable/material-symbols-outlined': symbols, '@fontsource-variable/material-symbols-rounded': symbols };

export default defineConfig({
  root: here,
  base: './',
  // @tanrei/cli ships this app: the licences of the code and the fonts it bundles go with it, beside index.html.
  // The layer validator inlines a runtime helper of Ajv as text (vite-plugin.js), so Ajv is named here.
  plugins: [tanreiStudio(), thirdPartyLicensesPlugin({ what: 'The Theme Studio app (dist/studio/)', notes, files: [require.resolve('ajv/dist/runtime/ucs2length.js')] })],
  // The Studio bundles tokens/ and tanrei.config.json straight from the repository root.
  server: { fs: { allow: [repoRoot] }, proxy: process.env.TANREI_STUDIO_API ? { '/api': process.env.TANREI_STUDIO_API } : undefined },
  build: { outDir: path.resolve(here, '../dist-app'), emptyOutDir: true, target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1200 },
});
