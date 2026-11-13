// Removes dist/, so the build writes it from nothing. Everything under dist/ is the build's own — the compiler's modules,
// then what scripts/build.js writes beside them — and neither step removes what an earlier build wrote: a module whose
// source is gone, a renamed stylesheet, a removed system's theme colors. Left there, such a file is read by the tests
// (test/bundle-budget.test.mjs lists dist/components/) and packed (`files`), so a checkout would disagree with a clean
// one. Nothing outside the build writes into dist/ (custom-elements.json, which `pnpm generate` writes, stands beside it).
//
// It runs twice over: as the first step of `pnpm build`, and as the package's `clean` task, which turbo.json runs,
// uncached, before every `build` task. On a cache hit turbo does not run the build script: it copies the cached dist/
// over the one on disk and removes nothing, so the `clean` task is what empties dist/ first.
import fs from 'node:fs';

fs.rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
