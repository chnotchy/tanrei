// The first step of `pnpm build`: dist/ is removed, so the build writes it from nothing. Everything under dist/ is the
// build's own — the compiler's modules, then what scripts/build.js writes beside them — and neither step removes what an
// earlier build wrote: a module whose source is gone, a renamed stylesheet, a removed system's theme colors. Left there,
// such a file is read by the tests (test/bundle-budget.test.mjs lists dist/components/) and packed (`files`), so a
// checkout would disagree with a clean one. Nothing outside the build writes into dist/ (custom-elements.json, which
// `pnpm generate` writes, stands beside it).
import fs from 'node:fs';

fs.rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
