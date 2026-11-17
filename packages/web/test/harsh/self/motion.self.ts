// Harsh mode's motion rate (Chromium's engine rate; in Firefox and WebKit on request, test/harsh/slow-motion.ts), and
// its check that the rate takes effect. test/harsh-self.test.mjs says what each test must do with harsh mode off and
// on, in each engine; a title that starts with "race:" is a test that is wrong on purpose.
import { expect, test, type Page } from '@playwright/test';
import { harsh, motionAtItsOwnSpeed } from '../../harsh.js';
import { checkHarsh } from '../playwright-test.js';
import { late } from './late.js';

/**
 * How long after its fade started a race reads the box: the fade's 400 ms and 200 ms more, for a frame's time, which a
 * motion's is, to lag the page's clock. At a fifth of its speed the fade still has 1.4 s to run.
 */
const AWHILE = 600;

/**
 * The read the races make, in the page: the box's click listener calls `readAWhileAfter(box)` in the click that starts
 * its fade. From there it waits for the first frame in which the fade has a start time, then `AWHILE` ms of the page's
 * clock, then two frames (the second begins after the wait), and reads the box's opacity once. A fixed wait on purpose:
 * this is the read that takes a motion to have ended because some time has passed. Counted from the fade's start, its
 * outcome with the motion at its own speed does not hang on how soon a loaded machine draws the frame that starts it;
 * started by the click in the page, its moment does not hang on how soon the click comes back to the test. It notes how
 * long after the click it read.
 */
const READ = `<script>
  window.readAWhileAfter = (box) => {
    const clicked = performance.now();
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    window.fadeRead = (async () => {
      do await frame();
      while (!box.getAnimations().some((animation) => animation.startTime !== null));
      await new Promise((resolve) => setTimeout(resolve, ${AWHILE}));
      await frame();
      await frame();
      return { opacity: getComputedStyle(box).opacity, after: performance.now() - clicked };
    })();
  };
</script>`;

/**
 * A box that fades out over 400 ms when it is clicked, read a while after (`READ`). Played at a fifth of its speed it
 * lasts 2 s, longer than the read waits; at its own speed it has ended by then.
 */
const FADE = `${READ}<div id="box" style="inline-size: 100px; block-size: 40px; background: gray; opacity: 1; transition: opacity 400ms linear"></div>
<script>document.getElementById('box').addEventListener('click', (event) => { event.currentTarget.style.opacity = '0'; readAWhileAfter(event.currentTarget); });</script>`;

/**
 * How soon after the click a read must come to tell a fade that harsh mode slows from one that has ended: sooner than
 * the slowed fade can end. At harsh mode's rate (a fifth) the fade lasts 2 s from its start, and it starts no sooner
 * than the frame before the click (a transition takes the time of the frame it is made in; frames are a quarter of a
 * second apart in Firefox with late frames, TANREI_HARSH_FRAME=250), so it runs until 1.75 s after the click at the
 * soonest. The read comes about 0.65 s after the click, and 1.1 to 1.35 s after it with late frames.
 */
const ON_TIME = 1600;

/** How many times a race is run while its read comes too late to tell. */
const ATTEMPTS = 5;

/**
 * Sets `content` in the page, clicks its box, and returns the opacity the page read a while after (`READ`). A read that
 * came `ON_TIME` or more after the click — a loaded machine ran the page's timer or drew its frames that late — sees
 * the fade ended whether harsh mode slowed it or not, and its pass would say nothing: the race runs again from a new
 * click, up to `ATTEMPTS` times, and says it was late when even the last read was (late.ts). Each run reads once.
 */
const readAWhileAfter = async (page: Page, content: string): Promise<string> => {
  for (let attempt = 1; ; attempt += 1) {
    await page.setContent(content);
    await page.locator('#box').click();
    const { opacity, after } = await page.evaluate(() => (window as unknown as { fadeRead: Promise<{ opacity: string; after: number }> }).fadeRead);
    if (after < ON_TIME) return opacity;
    if (attempt === ATTEMPTS) {
      late(`read ${Math.round(after)} ms after the click, in the last of ${ATTEMPTS} runs that each read ${ON_TIME} ms or more after it`);
      return opacity;
    }
  }
};

test('race: a fade read once, a while after the click that starts it', async ({ page }) => {
  expect(await readAWhileAfter(page, FADE)).toBe('0');
});

// The race above, in a test that asks for its pages' motion at its own speed: harsh mode leaves the fade alone (in
// Chromium no Animation domain, in Firefox and WebKit no rate set in the page), and the read a while after it lands
// after its end in every run. The gaps around the click stay.
test('check: a fade read once, a while after the click that starts it, in a test that asks for motion at its own speed', motionAtItsOwnSpeed('harsh mode’s own check of the annotation'), async ({ page }) => {
  expect(await readAWhileAfter(page, FADE)).toBe('0');
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

// A page's content is set again for each run of a race (`readAWhileAfter`), in the same window: its script declares
// nothing at the top level, which a second run would declare again.
test('race: a fade in a shadow root read once, a while after the click that starts it', async ({ page }) => {
  const content = `${READ}<div id="host"></div><script>{
    const root = document.getElementById('host').attachShadow({ mode: 'open' });
    root.innerHTML = '<div id="box" style="inline-size: 100px; block-size: 40px; background: gray; opacity: 1; transition: opacity 400ms linear"></div>';
    root.getElementById('box').addEventListener('click', (event) => { event.currentTarget.style.opacity = '0'; readAWhileAfter(event.currentTarget); });
  }</script>`;
  expect(await readAWhileAfter(page, content)).toBe('0');
});

test('race: a scripted fade read once, a while after the click that starts it', async ({ page }) => {
  const content = `${READ}<div id="box" style="inline-size: 100px; block-size: 40px; background: gray"></div><script>
    document.getElementById('box').addEventListener('click', ({ currentTarget: box }) => {
      box.style.opacity = '0';
      box.animate([{ opacity: 1 }, { opacity: 0 }], 400);
      readAWhileAfter(box);
    });
  </script>`;
  expect(await readAWhileAfter(page, content)).toBe('0');
});
