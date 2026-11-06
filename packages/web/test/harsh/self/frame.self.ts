// Harsh mode's late frames (TANREI_HARSH_FRAME, Firefox only), and its check that they take effect.
// test/harsh-self.test.mjs says what each test must do with harsh mode off, on, and on with late frames.
import { expect, test } from '@playwright/test';
import { harsh } from '../../harsh.js';
import { checkHarsh } from '../playwright-test.js';

/** A button that, clicked, writes its state in the next frame, as a component that defers its work to a frame does. */
const DEFERRED = `<button id="button">defer</button>
<script>
  const button = document.getElementById('button');
  button.addEventListener('click', () => requestAnimationFrame(() => (button.dataset.state = 'done')));
</script>`;

/** Clicks the button just after a frame, then waits `then` (in the page), and returns what the button says. */
const clickAfterFrame = async (then: 'two frames' | number) => {
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  const button = document.getElementById('button')!;
  button.click();
  if (then === 'two frames') await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  else await new Promise((resolve) => setTimeout(resolve, then));
  return button.dataset.state ?? null;
};

test('race: a state written in the next frame, read 80 ms after the click', async ({ page }) => {
  await page.setContent(DEFERRED);
  // 80 ms: the next frame comes within it at 60 frames a second, and not at 4 (TANREI_HARSH_FRAME=250).
  expect(await page.evaluate(clickAfterFrame, 80)).toBe('done');
});

test('sound: a state written in the next frame, read two frames after the click', async ({ page }) => {
  await page.setContent(DEFERRED);
  expect(await page.evaluate(clickAfterFrame, 'two frames' as const)).toBe('done');
});

test('check: the self-check refuses frames that come sooner than it was told to expect', async ({ browser, browserName }) => {
  test.skip(!harsh?.frame || browserName !== 'firefox', 'harsh mode with late frames, in Firefox, only');
  await expect(checkHarsh(browser, { ...harsh!, frame: harsh!.frame * 4 })).rejects.toThrow(/frames came \d+ ms apart, not \d+ ms \(the frame interval\)/);
});
