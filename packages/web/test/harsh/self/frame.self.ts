// Harsh mode's late frames (TANREI_HARSH_FRAME, Firefox only), and its check that they take effect.
// test/harsh-self.test.mjs says what each test must do with harsh mode off, on, and on with late frames.
import { expect, test } from '@playwright/test';
import { harsh } from '../../harsh.js';
import { checkHarsh } from '../playwright-test.js';
import { late } from './late.js';

/**
 * A button that, clicked, writes its state in the next frame, as a component that defers its work to a frame does. The
 * page notes, in its own clock, when the click came and when that frame did.
 */
const DEFERRED = `<button id="button">defer</button>
<script>
  const button = document.getElementById('button');
  button.addEventListener('click', () => {
    window.clickedAt = performance.now();
    requestAnimationFrame(() => {
      window.frameAt = performance.now();
      button.dataset.state = 'done';
    });
  });
</script>`;

/**
 * Clicks the button just after a frame, then waits `then` (in the page), and returns what the button says — and, once
 * the frame the click asked for has come (two frames on: it was asked for before them), how long after the click the
 * read and that frame came, in the page's clock.
 */
const clickAfterFrame = async (then: 'two frames' | number) => {
  const frames = (count: number) => new Promise<void>((resolve) => (count ? requestAnimationFrame(() => frames(count - 1).then(resolve)) : resolve()));
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  const button = document.getElementById('button')!;
  button.click();
  if (then === 'two frames') await frames(2);
  else await new Promise((resolve) => setTimeout(resolve, then));
  const state = button.dataset.state ?? null;
  const readAt = performance.now();
  await frames(2);
  const { clickedAt, frameAt } = window as unknown as { clickedAt?: number; frameAt?: number };
  return { state, read: clickedAt === undefined ? NaN : readAt - clickedAt, frame: clickedAt === undefined || frameAt === undefined ? NaN : frameAt - clickedAt };
};

test('race: a state written in the next frame, read 80 ms after the click', async ({ page }) => {
  await page.setContent(DEFERRED);
  // 80 ms: the next frame comes within it at 60 frames a second, and not at 4 (TANREI_HARSH_FRAME=250). A loaded machine
  // may draw no frame for longer than that too: the race then loses with harsh mode off, and says it was late.
  const { state, read, frame } = await page.evaluate(clickAfterFrame, 80);
  if (frame > read) late(`the next frame came ${Math.round(frame)} ms after the click, after the read at ${Math.round(read)} ms`);
  expect(state).toBe('done');
});

test('sound: a state written in the next frame, read two frames after the click', async ({ page }) => {
  await page.setContent(DEFERRED);
  expect((await page.evaluate(clickAfterFrame, 'two frames' as const)).state).toBe('done');
});

test('check: the self-check refuses frames that come sooner than it was told to expect', async ({ browser, browserName }) => {
  test.skip(!harsh?.frame || browserName !== 'firefox', 'harsh mode with late frames, in Firefox, only');
  await expect(checkHarsh(browser, { ...harsh!, frame: harsh!.frame * 4 })).rejects.toThrow(/frames came \d+ ms apart, not \d+ ms \(the frame interval\)/);
});
