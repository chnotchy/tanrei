// Harsh mode's motion rate, and its check that the rate takes effect. test/harsh-self.test.mjs says what each test must
// do with harsh mode off and on, in each engine; a title that starts with "race:" is a test that is wrong on purpose.
import { expect, test } from '@playwright/test';
import { harsh } from '../../harsh.js';
import { checkHarsh } from '../playwright-test.js';

/**
 * A box that fades out over 400 ms when it is clicked. Played at a fifth of its speed it lasts 2 s, longer than the gap
 * after the click (300 ms) and the 900 ms the race below waits; at its own speed it has ended by then.
 */
const FADE = `<div id="box" style="inline-size: 100px; block-size: 40px; background: gray; opacity: 1; transition: opacity 400ms linear"></div>
<script>document.getElementById('box').addEventListener('click', (event) => (event.currentTarget.style.opacity = '0'));</script>`;

test('race: a fade read once, a while after the click that starts it', async ({ page }) => {
  await page.setContent(FADE);
  await page.locator('#box').click();
  // A fixed wait on purpose: this is the test that takes a motion to have ended because some time has passed.
  await page.waitForTimeout(900);
  expect(await page.locator('#box').evaluate((box) => getComputedStyle(box).opacity)).toBe('0');
});

test('sound: a fade waited for until it ends', async ({ page }) => {
  await page.setContent(FADE);
  // The listener before its event: the fade may end before the click returns (in harsh mode, during the gap after it).
  await page.locator('#box').evaluate((box) => {
    (window as unknown as { faded: Promise<unknown> }).faded = new Promise((resolve) => box.addEventListener('transitionend', resolve, { once: true }));
  });
  await page.locator('#box').click();
  await page.evaluate(() => (window as unknown as { faded: Promise<unknown> }).faded);
  expect(await page.locator('#box').evaluate((box) => getComputedStyle(box).opacity)).toBe('0');
});

test('check: the self-check refuses a motion rate it was not given', async ({ browser, browserName }) => {
  test.skip(!harsh || harsh.motion === 1, 'harsh mode with a motion rate only');
  test.skip(browserName !== 'chromium', 'Chromium only: the other engines play motion at its own speed');
  await expect(checkHarsh(browser, { ...harsh!, motion: harsh!.motion / 4 })).rejects.toThrow(/a transition moved [\d.]+ of the time that passed, not [\d.]+ \(the motion rate\)/);
});
