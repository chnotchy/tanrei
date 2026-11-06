// Harsh mode's gaps around an input action, and its check that they take effect. test/harsh-self.test.mjs says what
// each test must do with harsh mode off and on; a title that starts with "race:" is a test that is wrong on purpose.
import { expect, test } from '@playwright/test';
import { harsh } from '../../harsh.js';
import { checkHarsh } from '../playwright-test.js';
import { late } from './late.js';

/** How long the button stays pressed after the pointer is released: shorter than the gap after an action (300 ms). */
const HOLD = 250;

/** The page notes, in its own clock, when the pointer was released, and when the hold after it ended. */
const BUTTON = `<button id="button" style="position: absolute; left: 10px; top: 10px; width: 100px; height: 40px">press</button>
<script>
  const button = document.getElementById('button');
  let release;
  button.addEventListener('pointerdown', () => { clearTimeout(release); button.toggleAttribute('data-pressed', true); });
  button.addEventListener('pointerup', () => {
    window.releasedAt = performance.now();
    release = setTimeout(() => {
      window.heldUntil = performance.now();
      button.toggleAttribute('data-pressed', false);
    }, ${HOLD});
  });
</script>`;

test('race: a press-hold read after the click returns', async ({ page }) => {
  await page.setContent(BUTTON);
  await page.locator('#button').click();
  // Read once, as a test that takes the hold to last past the click's round trip does: it does, by a fast machine. With
  // harsh mode on, the gap after the click outlasts it; on a loaded machine the round trip alone may. The race says it
  // was late whenever its read came later than it takes for granted: after the hold ended, by their order in the page
  // (the page's clock counts whole milliseconds in Firefox and WebKit, and a timer may read a millisecond short of its
  // time there), or 250 ms or more after the release (a hold that ended late itself may then still have shown, and its
  // pass says nothing).
  const { pressed, ended, since } = await page.locator('#button').evaluate((button) => {
    const noted = window as unknown as { releasedAt?: number; heldUntil?: number };
    return { pressed: button.getAttribute('data-pressed'), ended: noted.heldUntil !== undefined, since: performance.now() - (noted.releasedAt ?? NaN) };
  });
  if (Number.isFinite(since) && (ended || since >= HOLD)) late(`read ${Math.round(since)} ms after the release, ${ended ? 'after' : 'before'} the ${HOLD} ms hold ended`);
  expect(pressed).toBe('');
});

test('sound: a press-hold read while the pointer holds it', async ({ page }) => {
  await page.setContent(BUTTON);
  await page.mouse.move(60, 30);
  await page.mouse.down();
  expect(await page.locator('#button').getAttribute('data-pressed')).toBe('');
  await page.mouse.up();
  await expect(page.locator('#button')).not.toHaveAttribute('data-pressed');
});

test('check: the self-check refuses gaps shorter than it was told to expect', async ({ browser }) => {
  test.skip(!harsh, 'harsh mode only: with it off, nothing is slowed and nothing checks');
  await expect(checkHarsh(browser, { ...harsh!, before: harsh!.before + 500, after: harsh!.after + 500 })).rejects.toThrow(
    /reached the page \d+ ms after it was asked for, not \d+ ms \(the gap before it\)[\s\S]*returned \d+ ms after its last event, not \d+ ms \(the gap after it\)/,
  );
});

test('check: the self-check passes the gaps the run gives', async ({ browser }) => {
  test.skip(!harsh, 'harsh mode only: with it off, nothing is slowed and nothing checks');
  await checkHarsh(browser, harsh!);
});
