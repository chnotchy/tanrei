// The page's clock in the test's hands, for a behaviour that waits a delay (a hover delay, a timeout, a grace): "not
// yet at delay − 1, done at delay" is asked at exact page times. A real wait shorter than the delay followed by "not
// yet" is true only on a machine that answers in time — a round trip to the page can take longer than the delay.
import type { Page } from '@playwright/test';

const installed = new WeakSet<Page>();

/**
 * Holds the page's timers still (`setTimeout`, `setInterval`, `requestAnimationFrame`, `Date`, `performance.now()`)
 * until the test moves them on with `page.clock.runFor(ms)`, or lets them run again with `releaseClock`. CSS
 * transitions and animations keep the document's own timeline. The page's time jumps one second ahead as it is held
 * (a held time may not lie in the past), so hold the clock before the delay under test starts, not during it.
 */
export async function holdClock(page: Page): Promise<void> {
  if (!installed.has(page)) {
    await page.clock.install();
    installed.add(page);
  }
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

/** Lets a held clock run again at the machine's pace: what follows needs frames and timers the test does not count. */
export const releaseClock = (page: Page): Promise<void> => page.clock.resume();
