// The first step of `pnpm build`: dist/ is removed, so the compiler writes it from nothing. The compiler does not remove
// what an earlier build wrote — the wrapper of a component that is gone, an entry of a system that is gone — and such a
// file would be packed (`files`) and stand in a checkout that a clean one does not have. Nothing else writes into dist/.
import fs from 'node:fs';

fs.rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
