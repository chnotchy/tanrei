// What a change costs, counted rather than timed: how many times the page's script functions were called while it ran,
// read from V8's own call counters over the DevTools protocol (`Profiler.takePreciseCoverage` with `callCount`), and
// what a debug build counted itself (`countWork()`, src/primitives/work-count.ts, on `globalThis.__tanreiCounts`).
//
// A count is not the machine's speed: the same page and the same change make the same count on a Mac and on a loaded
// CI runner — so a test can hold a container's cost to its items as a bound, where a time can only be reported. A
// container that re-reads all its items each time one of them changes (an O(n²) build) makes about N times the calls
// per item at N items; one that reads them once makes the same calls per item at 100 items and at 1,000.
//
// The call counters see each call of a callback in a loop over the items (`filter`, `some`, `forEach`). They do not see
// what the engine does without calling back into script — a spread, a `querySelectorAll` — which a debug counter bounds
// where it matters.
//
// Chromium only: the counters are the DevTools protocol's.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CDPSession, type Page, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** Two frames: what was asked to be drawn has been drawn, and what was queued for the frame after it has run. */
export const twoFrames = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

/**
 * A page with every stylesheet of the package and every element defined (the development bundle, whose debug counters
 * count), an empty `#pane` to build in, and the call counters started. Motion is reduced: no frame of a motion is work
 * the build made.
 */
export async function countingPage(page: Page, tags: string[]): Promise<CDPSession> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sheets = fs.readdirSync(path.join(pkg, 'dist')).filter((file) => file.endsWith('.css'));
  const head = `<meta charset="utf-8">${sheets.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}<style>body { margin: 0; }</style>`;
  await page.setContent(`<!doctype html><html lang="en"><head>${head}</head><body><div id="pane"></div><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction((all) => all.every((tag) => !!customElements.get(tag)), tags);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
  return cdp;
}

/** Every function call the page's script made since the counters were last taken (taking them resets them). */
async function calls(cdp: CDPSession): Promise<number> {
  const { result } = await cdp.send('Profiler.takePreciseCoverage');
  let sum = 0;
  // Each function's first range is the function itself; its count is how many times it was called.
  for (const script of result) for (const fn of script.functions) sum += fn.ranges[0]?.count ?? 0;
  return sum;
}

export interface Cost {
  /** The items the change concerned. */
  n: number;
  /** The function calls the page made, from the change to two frames after it. */
  calls: number;
  /** What the debug build counted (`countWork()`), by name. */
  counts: Record<string, number>;
  /** The time it took, reported and never held. */
  ms: number;
}

/**
 * What `act` (a change of a container of `n` items, made in one task) costs: the calls the page made from the change to
 * two frames after it — the work queued for a microtask, an observer or the next frame included — and the debug
 * counts. The calls the test itself makes in the page (the `evaluate` that runs `act`, the frames waited) are a few,
 * the same at every size.
 */
export async function costOf(page: Page, cdp: CDPSession, n: number, label: string, act: () => Promise<unknown>): Promise<Cost> {
  await twoFrames(page);
  await page.evaluate(() => {
    (globalThis as { __tanreiCounts?: Record<string, number> }).__tanreiCounts = {};
  });
  await calls(cdp);
  const started = Date.now();
  await act();
  await twoFrames(page);
  const ms = Date.now() - started;
  const made = await calls(cdp);
  const counts = await page.evaluate(() => ({ ...(globalThis as { __tanreiCounts?: Record<string, number> }).__tanreiCounts }));
  const counted = Object.entries(counts)
    .map(([name, count]) => `${name} ${count}`)
    .join(', ');
  const line = `${label}, ${n} items: ${made} calls (${(made / n).toFixed(1)} per item)${counted ? `, ${counted}` : ''}; ${ms} ms (${(ms / n).toFixed(2)} per item)`;
  console.log(`work-count ${line}`);
  test.info().annotations.push({ type: 'cost', description: line });
  return { n, calls: made, counts, ms };
}

/** What building `markup` (a container of `n` items) in the emptied `#pane` costs (`costOf`). */
export async function buildCost(page: Page, cdp: CDPSession, markup: string, n: number, label: string): Promise<Cost> {
  await page.evaluate(() => {
    document.querySelector('#pane')!.innerHTML = '';
  });
  return costOf(page, cdp, n, `${label}, built`, () =>
    page.evaluate((html) => {
      document.querySelector('#pane')!.innerHTML = html;
    }, markup),
  );
}

/** The calls per item of `large` against `small`: 1 is linear, N₁/N₀ is quadratic. The time's ratio is reported beside it. */
export function perItemRatio(label: string, small: Cost, large: Cost): number {
  const ratio = large.calls / large.n / (small.calls / small.n);
  const time = large.ms / large.n / (small.ms / small.n);
  const line = `${label}: calls per item at ${large.n} against ${small.n}: ${ratio.toFixed(2)} (time per item: ${time.toFixed(2)}, reported only)`;
  console.log(`work-count ${line}`);
  test.info().annotations.push({ type: 'cost', description: line });
  return ratio;
}
