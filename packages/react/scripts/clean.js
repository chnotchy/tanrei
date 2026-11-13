// Removes dist/, so the compiler writes it from nothing. The compiler does not remove what an earlier build wrote — the
// wrapper of a component that is gone, an entry of a system that is gone — and such a file would be packed (`files`)
// and stand in a checkout that a clean one does not have. Nothing else writes into dist/.
//
// It runs as the first step of `pnpm build`, and as the package's `clean` task, which turbo.json runs, uncached, before
// every `build` task: on a cache hit turbo copies the cached dist/ over the one on disk and removes nothing.
import fs from 'node:fs';

fs.rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
