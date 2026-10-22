// Debug builds only: how many times a piece of work ran, by name, on `globalThis.__tanreiCounts`. The performance tests
// read it (test/work-count.ts) to hold a cost that must not grow with a container's items — a menu built with 1,000
// items re-reads them as few times as one built with 10 — as a count, which no machine's speed changes. A production
// build counts nothing (`debugBuild()`, report.ts) and never writes the global.
import { debugBuild } from './report.js';

type Counted = typeof globalThis & { __tanreiCounts?: Record<string, number> };

/** Counts one run of the work `name` (`<component>.<work>`, e.g. `menu.sync`) in a debug build. */
export function countWork(name: string): void {
  if (!debugBuild()) return;
  const counts = ((globalThis as Counted).__tanreiCounts ??= {});
  counts[name] = (counts[name] ?? 0) + 1;
}
