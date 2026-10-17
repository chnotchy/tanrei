import type { Page } from '@playwright/test';
import { STOPPED_AFTER } from './stopped-release.js';

/**
 * Releases the mouse at rest, so the release is not a fling.
 *
 * The drags that choose on their release (the tabs' and the navigation bar's indicator, the sheets, the calendar, the tab
 * view, the image preview's pan) take a release within 40 ms of moves faster than 0.5 px per ms as a fling toward where
 * they went; a pointer that has held still for longer than that has stopped, and its release is no fling
 * (`POINTER_STOPPED_TIME` in src/primitives/sheet.ts). Playwright moves a real mouse a few milliseconds apart — 6 px in
 * 8 ms is 0.75 px per ms — so a release that follows the moves at once is a fling, and whether the checks a test makes
 * in between take longer than 40 ms is the machine's speed: a release over Settings after a short drag toward Activity
 * chose Activity on a fast runner. Waiting longer than the stillness is a lower bound and nothing else: a slower machine
 * only waits longer, and the release is at rest either way.
 */
export async function releaseAtRest(page: Page): Promise<void> {
  await page.waitForTimeout(STOPPED_AFTER * 2); // twice the stillness after which a pointer has stopped: not a fling
  await page.mouse.up();
}
