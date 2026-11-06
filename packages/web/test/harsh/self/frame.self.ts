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

/** How long after the click the race takes the next frame to have come, and reads the button. */
const WITHIN = 80;

/**
 * Clicks the button in a frame's callbacks, so that the frame callback the click asks for goes to the next frame, a
 * whole frame away (a click in a task after the frame, held up on a loaded machine, may come just before the next one),
 * then waits `then` (in the page), and returns what the button says; whether the frame the click asked for had come by
 * the read, by their order in the page (the page's clock counts whole milliseconds in Firefox and WebKit: a frame just
 * after the read may read the same time); and, once that frame has come (two frames on: it was asked for before them),
 * how long after the click the read and the frame came, in the page's clock.
 */
const clickAfterFrame = async (then: 'two frames' | number) => {
  const frames = (count: number) => new Promise<void>((resolve) => (count ? requestAnimationFrame(() => frames(count - 1).then(resolve)) : resolve()));
  const noted = window as unknown as { clickedAt?: number; frameAt?: number };
  const button = document.getElementById('button')!;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve(button.click())));
  if (then === 'two frames') await frames(2);
  else await new Promise((resolve) => setTimeout(resolve, then));
  const state = button.dataset.state ?? null;
  const framed = noted.frameAt !== undefined;
  const readAt = performance.now();
  await frames(2);
  const { clickedAt, frameAt } = noted;
  return { state, framed, read: clickedAt === undefined ? NaN : readAt - clickedAt, frame: clickedAt === undefined || frameAt === undefined ? NaN : frameAt - clickedAt };
};

test('race: a state written in the next frame, read 80 ms after the click', async ({ page }) => {
  await page.setContent(DEFERRED);
  // 80 ms: the next frame comes within it at 60 frames a second, and not at 4 (TANREI_HARSH_FRAME=250). A loaded machine
  // may draw no frame for longer than that too, and the race says it was late whenever the frame came later than it
  // takes for granted: after the read (it then loses), or more than 80 ms after the click (a read that came late itself
  // may then have seen it, and its pass says nothing).
  const { state, framed, read, frame } = await page.evaluate(clickAfterFrame, WITHIN);
  if (Number.isFinite(read) && (!framed || !(frame <= WITHIN))) late(`the next frame came ${Math.round(frame)} ms after the click, ${framed ? 'before' : 'after'} the read at ${Math.round(read)} ms`);
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
