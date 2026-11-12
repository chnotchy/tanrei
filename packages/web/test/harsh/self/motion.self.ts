// Harsh mode's motion rate (Chromium's engine rate; in Firefox and WebKit on request, test/harsh/slow-motion.ts), and
// its check that the rate takes effect. test/harsh-self.test.mjs says what each test must do with harsh mode off and
// on, in each engine; a title that starts with "race:" is a test that is wrong on purpose.
import { expect, test } from '@playwright/test';
import { harsh, motionAtItsOwnSpeed } from '../../harsh.js';
import { checkHarsh } from '../playwright-test.js';

/**
 * Notes, in the page's clock, when the box's fade has started — the first frame in which it has a start time — so a race
 * can wait from then and not from the click: the frame that starts a fade may come late on a loaded machine.
 */
const NOTE_START = `<script>
  window.noteFadeStart = (box) => {
    const poll = () => (box.getAnimations().some((animation) => animation.startTime !== null) ? (window.fadeStartedAt = performance.now()) : requestAnimationFrame(poll));
    requestAnimationFrame(poll);
  };
</script>`;

/**
 * A box that fades out over 400 ms when it is clicked. Played at a fifth of its speed it lasts 2 s, longer than the gap
 * after the click (300 ms) and the time the races below wait (`AWHILE`); at its own speed it has ended by then.
 */
const FADE = `${NOTE_START}<div id="box" style="inline-size: 100px; block-size: 40px; background: gray; opacity: 1; transition: opacity 400ms linear"></div>
<script>document.getElementById('box').addEventListener('click', (event) => { event.currentTarget.style.opacity = '0'; noteFadeStart(event.currentTarget); });</script>`;

/**
 * How long after its fade started a race reads the box: the fade's 400 ms and 200 ms more, for a frame's time, which a
 * motion's is, to lag the page's clock. At a fifth of its speed the fade still has 1.4 s to run.
 */
const AWHILE = 600;

/**
 * In the page: waits until `wait` ms of the page's clock have passed since the box's fade started, then two frames (the
 * second begins after the wait), and reads the box's opacity once. A fixed wait on purpose: this is the test that takes
 * a motion to have ended because some time has passed. Counted from the fade's start, its outcome with the motion at
 * its own speed does not hang on how soon a loaded machine draws the frame that starts it.
 */
const readAWhileAfter = async (box: Element, wait: number) => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const noted = window as unknown as { fadeStartedAt?: number };
  while (noted.fadeStartedAt === undefined) await frame();
  const left = noted.fadeStartedAt + wait - performance.now();
  if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
  await frame();
  await frame();
  return getComputedStyle(box).opacity;
};

test('race: a fade read once, a while after the click that starts it', async ({ page }) => {
  await page.setContent(FADE);
  await page.locator('#box').click();
  expect(await page.locator('#box').evaluate(readAWhileAfter, AWHILE)).toBe('0');
});

// The race above, in a test that asks for its pages' motion at its own speed: harsh mode leaves the fade alone (in
// Chromium no Animation domain, in Firefox and WebKit no rate set in the page), and the read a while after it lands
// after its end in every run. The gaps around the click stay.
test('check: a fade read once, a while after the click that starts it, in a test that asks for motion at its own speed', motionAtItsOwnSpeed('harsh mode’s own check of the annotation'), async ({ page }) => {
  await page.setContent(FADE);
  await page.locator('#box').click();
  expect(await page.locator('#box').evaluate(readAWhileAfter, AWHILE)).toBe('0');
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
  test.skip(browserName !== 'chromium' && !harsh!.pageMotion, 'Firefox and WebKit play motion at its own speed unless TANREI_HARSH_PAGE_MOTION=1');
  await expect(checkHarsh(browser, { ...harsh!, motion: harsh!.motion / 4 })).rejects.toThrow(/a transition moved [\d.]+ of the time that passed, not [\d.]+ \(the motion rate\)/);
});

test('sound: a page reads and sets its animations’ playback rates as it knows them', async ({ page }) => {
  await page.setContent('<div id="box" style="inline-size: 10px; block-size: 10px"></div>');
  const rates = await page.locator('#box').evaluate(async (box) => {
    const animation = box.animate([{ opacity: 1 }, { opacity: 0 }], 10_000);
    const made = animation.playbackRate;
    animation.playbackRate = 2;
    const set = animation.playbackRate;
    animation.updatePlaybackRate(3);
    await animation.ready;
    const updated = animation.playbackRate;
    animation.cancel();
    return [made, set, updated];
  });
  expect(rates).toEqual([1, 2, 3]);
});

test('race: a fade in a shadow root read once, a while after the click that starts it', async ({ page }) => {
  await page.setContent(`${NOTE_START}<div id="host"></div><script>
    const root = document.getElementById('host').attachShadow({ mode: 'open' });
    root.innerHTML = '<div id="box" style="inline-size: 100px; block-size: 40px; background: gray; opacity: 1; transition: opacity 400ms linear"></div>';
    root.getElementById('box').addEventListener('click', (event) => { event.currentTarget.style.opacity = '0'; noteFadeStart(event.currentTarget); });
  </script>`);
  await page.locator('#box').click();
  expect(await page.locator('#box').evaluate(readAWhileAfter, AWHILE)).toBe('0');
});

test('race: a scripted fade read once, a while after the click that starts it', async ({ page }) => {
  await page.setContent(`${NOTE_START}<div id="box" style="inline-size: 100px; block-size: 40px; background: gray"></div><script>
    document.getElementById('box').addEventListener('click', ({ currentTarget: box }) => {
      box.style.opacity = '0';
      box.animate([{ opacity: 1 }, { opacity: 0 }], 400);
      noteFadeStart(box);
    });
  </script>`);
  await page.locator('#box').click();
  expect(await page.locator('#box').evaluate(readAWhileAfter, AWHILE)).toBe('0');
});
