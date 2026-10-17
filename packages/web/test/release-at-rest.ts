import type { Page } from '@playwright/test';

/**
 * How far back a drag's velocity looks at its release, in ms (`VELOCITY_WINDOW` in src/primitives/sheet.ts): a pointer
 * that last moved longer ago than this is released at rest.
 */
const VELOCITY_LOOKS_BACK = 80;

/**
 * Releases the mouse at rest, so the release is not a fling.
 *
 * The drags that choose on their release (the tabs' and the navigation bar's indicator, the sheets, the calendar, the tab
 * view) take a release within 80 ms of moves faster than 0.5 px per ms as a fling toward where they went. Playwright
 * moves a real mouse a few milliseconds apart — 6 px in 8 ms is 0.75 px per ms — so a release that follows the moves at
 * once is a fling, and whether the checks a test makes in between take longer than 80 ms is the machine's speed: a
 * release over Settings after a short drag toward Activity chose Activity on a fast runner. Waiting longer than the
 * window is a lower bound and nothing else: a slower machine only waits longer, and the release is at rest either way.
 */
export async function releaseAtRest(page: Page): Promise<void> {
  await page.waitForTimeout(VELOCITY_LOOKS_BACK * 2); // twice the velocity's window: the pointer has rested, not a fling
  await page.mouse.up();
}
