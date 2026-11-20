// A fixture's picture against its baseline. Every `snapshot: …` test compares with this, never with `toHaveScreenshot`
// alone (test/drawn-box.test.mjs looks).
//
// Three comparisons, all of which must pass:
// - Playwright's `toHaveScreenshot`, as playwright.config.ts sets it: fewer than 1 % of the pixels beyond its colour
//   threshold. It records too (`--update-snapshots`), and writes the actual picture and the diff when it fails.
// - where the picture is drawn (test/drawn-box.js): the box around everything that is not the surface, in the baseline
//   and in what the page draws now, the same within `BOX_TOLERANCE` device pixels. The pixel count alone let a pale
//   component grow on a pale surface — a white toolbar 28 device pixels larger on each side, a second popover drawn
//   below the first — with under 1 % of the pixels beyond the threshold.
// - where its edges are drawn (test/drawn-edges.js): no `EDGE_CHANGE` edge pixels together, in one picture, that the
//   other draws nowhere within `EDGE_REACH` device pixels. The two above let what moves inside a box that keeps its
//   size pass: a list that keeps its height and scrolls, whose rows moved from 48 to 40 CSS px apart; a close button
//   or a field that grew inside a larger picture.
//
// A recording run (`--update-snapshots=changed`) that `toHaveScreenshot` leaves alone, because the pixels are within
// its tolerance, writes the picture when its drawn box or its edges moved: such a baseline is stale.
import fs from 'node:fs';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { BOX_TOLERANCE, boxMove, describeBox, drawnBox } from './drawn-box.js';
import { EDGE_CHANGE, EDGE_REACH, describeEdgeMoves, edgeMoves } from './drawn-edges.js';
import { decodePng } from './png.js';

/** The screenshot options `toHaveScreenshot` takes from playwright.config.ts, and its own defaults. */
const SHOT = { animations: 'disabled', scale: 'device', caret: 'hide' } as const;

const RECORD = 'if it is the intended result of a spec or token change, record the baseline again (CONTRIBUTING.md#recording-baselines)';

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
  // The same bytes draw the same picture: nothing moved.
  if (actual.equals(baseline)) return;
  const [nowPicture, thenPicture] = [decodePng(actual), decodePng(baseline)];
  const [now, then] = [drawnBox(nowPicture), drawnBox(thenPicture)];
  const moved = boxMove(now, then);
  // `toHaveScreenshot` passed, so the two pictures have the same size.
  const edges = moved <= BOX_TOLERANCE ? edgeMoves(nowPicture, thenPicture).moved : [];
  if (moved <= BOX_TOLERANCE && edges.length === 0) return;
  if (mode === 'changed') {
    fs.writeFileSync(file, actual);
    return;
  }
  const where = segments(name).join('/');
  await info.attach(`${moved > BOX_TOLERANCE ? 'drawn box' : 'drawn edges'}: actual`, { body: actual, contentType: 'image/png' });
  await info.attach(`${moved > BOX_TOLERANCE ? 'drawn box' : 'drawn edges'}: expected`, { body: baseline, contentType: 'image/png' });
  expect(
    moved,
    `${where}: the picture is drawn in ${describeBox(now)}, its baseline in ${describeBox(then)} — ` +
      `an edge moved ${moved} device px, more than ${BOX_TOLERANCE}. The pixel comparison passed, so the change is pale on a pale surface; ${RECORD}`,
  ).toBeLessThanOrEqual(BOX_TOLERANCE);
  expect(
    edges.length,
    `${where}: the picture draws its edges elsewhere than its baseline inside the same box — ${describeEdgeMoves(edges)} ` +
      `(${EDGE_CHANGE} or more edge pixels together with no edge of the other picture within ${EDGE_REACH} device px). ` +
      `The pixel comparison and the drawn box passed, so something moved or changed size inside a box that kept its size; ${RECORD}`,
  ).toBe(0);
}

const segments = (name: string | string[]) => (Array.isArray(name) ? name : [name]);
const isPage = (target: Locator | Page): target is Page => 'goto' in target;
