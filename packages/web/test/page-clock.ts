// The page's clock in the test's hands, for a behaviour that waits a delay (a hover delay, a timeout, a grace): "not
// yet at delay − 1, done at delay" is asked at exact page times. A real wait shorter than the delay followed by "not
// yet" is true only on a machine that answers in time — a round trip to the page can take longer than the delay.
//
// A test that reads a motion of a token's length must not run under the page clock, held or let run again: once the
// clock is installed, `requestAnimationFrame` is one of its timers, not the engine's frames, and after `releaseClock`
// those timers run at the machine's pace, not one to a painted frame. A step a component runs per frame can then run
// twice in one painted frame, while `document.timeline`, which moves only with the engine's frames, stands still: the
// second run reads the motion's progress where the first left it. A carousel's scroll did so — its second write moved
// the row nowhere, so the carousel no longer knew the scroll event of the first as its own, took it for a person's and
// moved the Tab stop. Read such a motion on a page whose clock was never installed (`sampleFrames`, test/frames.ts,
// needs no clock), and use this one only for timers.
import type { Page } from '@playwright/test';

const installed = new WeakSet<Page>();

/**
 * Holds the page's timers still (`setTimeout`, `setInterval`, `requestAnimationFrame`, `Date`, `performance.now()`, and
 * an event's `timeStamp`, which Playwright's clock reads from the same fake time) until the test moves them on with
 * `page.clock.runFor(ms)`, or lets them run again with `releaseClock`. So two inputs sent with no page time between them
 * are 0 ms apart for a component that compares their times (a double press), however long the driver took. CSS
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
