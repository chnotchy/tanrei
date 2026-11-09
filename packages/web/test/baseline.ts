// A fixture's picture against its baseline. Every `snapshot: …` test compares with this, never with `toHaveScreenshot`
// alone (test/drawn-box.test.mjs looks).
//
// Two comparisons, both of which must pass:
// - Playwright's `toHaveScreenshot`, as playwright.config.ts sets it: fewer than 1 % of the pixels beyond its colour
//   threshold. It records too (`--update-snapshots`), and writes the actual picture and the diff when it fails.
// - where the picture is drawn (test/drawn-box.js): the box around everything that is not the surface, in the baseline
//   and in what the page draws now, the same within `BOX_TOLERANCE` device pixels. The pixel count alone let a pale
//   component grow on a pale surface — a white toolbar 28 device pixels larger on each side, a second popover drawn
//   below the first — with under 1 % of the pixels beyond the threshold.
//
// A recording run (`--update-snapshots=changed`) that `toHaveScreenshot` leaves alone, because the pixels are within
// its tolerance, writes the picture when its drawn box moved: such a baseline is stale.
import fs from 'node:fs';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { BOX_TOLERANCE, boxMove, describeBox, drawnBox } from './drawn-box.js';
import { decodePng } from './png.js';

/** The screenshot options `toHaveScreenshot` takes from playwright.config.ts, and its own defaults. */
const SHOT = { animations: 'disabled', scale: 'device', caret: 'hide' } as const;

/**
 * Compares `target` (a fixture's element, or the page for a fixture drawn on the whole window) with the baseline
 * `name` (`[spec name, '<fixture>.png']`, or a path under the snapshots folder as segments).
 */
export async function expectBaseline(target: Locator | Page, name: string | string[]): Promise<void> {
  if (isPage(target)) await expect(target).toHaveScreenshot(name);
  else await expect(target).toHaveScreenshot(name);

  const info = test.info();
  const mode = info.config.updateSnapshots;
  // `all` has just written this picture as the baseline: there is nothing else to compare it with.
  if (mode === 'all') return;
  // The config's one template (snapshots/{arg}{ext}) serves every kind of snapshot, so this is the file toHaveScreenshot read.
  const file = info.snapshotPath(...segments(name));
  const baseline = fs.readFileSync(file);
  // `toHaveScreenshot` has waited until two pictures in a row were the same, so this one is that picture again.
  const actual = await target.screenshot(SHOT);
  const [now, then] = [drawnBox(decodePng(actual)), drawnBox(decodePng(baseline))];
  const moved = boxMove(now, then);
  if (moved <= BOX_TOLERANCE) return;
  if (mode === 'changed') {
    fs.writeFileSync(file, actual);
    return;
  }
  await info.attach('drawn box: actual', { body: actual, contentType: 'image/png' });
  await info.attach('drawn box: expected', { body: baseline, contentType: 'image/png' });
  expect(
    moved,
    `${segments(name).join('/')}: the picture is drawn in ${describeBox(now)}, its baseline in ${describeBox(then)} — ` +
      `an edge moved ${moved} device px, more than ${BOX_TOLERANCE}. The pixel comparison passed, so the change is pale on a pale surface; ` +
      'if it is the intended result of a spec or token change, record the baseline again (CONTRIBUTING.md#recording-baselines)',
  ).toBeLessThanOrEqual(BOX_TOLERANCE);
}

const segments = (name: string | string[]) => (Array.isArray(name) ? name : [name]);
const isPage = (target: Locator | Page): target is Page => 'goto' in target;
