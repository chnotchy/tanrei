// Harsh mode's longer press-hold (test/harsh.ts, test/harsh/press-hold.ts), and its check that it takes effect.
// test/harsh-self.test.mjs says what each test must do with harsh mode off and on; a title that starts with "race:" is a
// test that is wrong on purpose.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { harsh, pressHoldAsRun } from '../../harsh.js';
import { checkHarsh } from '../playwright-test.js';
import { CLOCK } from '../../watched-press.js';
import { late } from './late.js';

/** The default system's token sheet, as the package generates it: press-hold is 100 ms in it. */
const TOKENS = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'src', 'generated', 'tokens.css'), 'utf8');

/**
 * A button that holds a press as the package's press controller does (src/primitives/press.ts): pressed on pointer
 * down, and on release kept pressed until press-hold — read from its carrier's `transition-delay`, which holds the
 * token — has passed since the press began. The page notes, in its own clock, when the pointer was pressed and when it
 * was released, how long the hold was, and when it ended.
 */
const BUTTON = `<style>${TOKENS}</style>
<button id="button" style="position: absolute; left: 10px; top: 10px; width: 100px; height: 40px"><span id="carrier" style="transition-property: none; transition-delay: var(--tanrei-sys-motion-duration-press-hold)">press</span></button>
<script>
{
  // In a block, and the notes cleared: a document written again into the same window (\`setContent()\`) keeps the
  // window's names, and a race that runs again must not read the last run's.
  window.pressedAt = window.releasedAt = window.heldUntil = window.hold = undefined;
  const button = document.getElementById('button');
  const carrier = document.getElementById('carrier');
  let pressedAt = 0;
  let timer;
  button.addEventListener('pointerdown', () => {
    clearTimeout(timer);
    pressedAt = window.pressedAt = performance.now();
    button.toggleAttribute('data-pressed', true);
  });
  button.addEventListener('pointerup', () => {
    window.releasedAt = performance.now();
    window.hold = Number.parseFloat(getComputedStyle(carrier).transitionDelay) * 1000;
    const wait = () => {
      const remaining = window.hold - (performance.now() - pressedAt);
      if (remaining > 0) timer = setTimeout(wait, remaining);
      else {
        window.heldUntil = performance.now();
        button.toggleAttribute('data-pressed', false);
      }
    };
    wait();
  });
}
</script>`;

/** How many times the race is run while its read comes after the hold has ended, which says nothing. */
const ATTEMPTS = 5;

/**
 * Clicks the button and reads once, as soon as the click returns, whether it is pressed, with what the page noted. A
 * read that came after the hold had ended (the gap after the click, or a loaded machine, made it that late) ends the
 * race the same way whatever else harsh mode does, and says nothing of it: the click is made again from a new page, up
 * to `ATTEMPTS` times, and the race says it was late when even the last read was (late.ts).
 */
const readOnceClicked = async (page: Page): Promise<{ pressed: string | null; when: string }> => {
  for (let attempt = 1; ; attempt += 1) {
    await page.setContent(BUTTON);
    await page.locator('#button').click();
    const { pressed, ended, since, hold } = await page.locator('#button').evaluate((button) => {
      const noted = window as unknown as { releasedAt?: number; heldUntil?: number; hold?: number };
      return { pressed: button.getAttribute('data-pressed'), ended: noted.heldUntil !== undefined, since: performance.now() - (noted.releasedAt ?? NaN), hold: noted.hold };
    });
    const when = `read ${Math.round(since)} ms after the release, ${ended ? 'after' : 'before'} the ${hold} ms hold ended`;
    if (!ended) return { pressed, when };
    if (attempt === ATTEMPTS) {
      late(`${when}, in the last of ${ATTEMPTS} runs that each read after it`);
      return { pressed, when };
    }
  }
};

test('race: the resting look read as soon as the click returns, before press-hold has ended', async ({ page }) => {
  // A fast machine loses this race too: the read comes within the hold. A loaded one wins it — the round trip outlasts
  // the hold — and with the hold at its own length (100 ms), so would harsh mode's gap after the click (300 ms).
  const { pressed, when } = await readOnceClicked(page);
  expect(pressed, when).toBeNull();
});

test('race: press-hold read as still held once the click returns', async ({ page }) => {
  // The opposite read: it takes the hold to last past the click's round trip. A fast machine wins it, a loaded one
  // loses it. Harsh mode's longer hold lets it win too; with the hold at its own length (TANREI_HARSH_PRESS_HOLD=0) the
  // gap after the click outlasts the hold, and it loses, reading late.
  const { pressed, when } = await readOnceClicked(page);
  expect(pressed, when).toBe('');
});

test('sound: the resting look waited for after the click', async ({ page }) => {
  await page.setContent(BUTTON);
  await page.locator('#button').click();
  await expect(page.locator('#button')).not.toHaveAttribute('data-pressed');
});

test('sound: a test reads press-hold as the run makes it', async ({ page }) => {
  await page.setContent(BUTTON);
  await page.locator('#button').click();
  await expect(page.locator('#button')).not.toHaveAttribute('data-pressed');
  const { hold, since } = await page.evaluate(() => {
    const noted = window as unknown as { pressedAt: number; heldUntil: number; hold: number };
    return { hold: noted.hold, since: noted.heldUntil - noted.pressedAt };
  });
  expect(hold).toBe(pressHoldAsRun(100));
  // Held for the hold from the press. Not from the release: how long a click's release comes after its press is the
  // machine's doing (in Firefox 9 ms on an idle page, 75 ms on one kept busy for 70 ms after the press).
  expect(since).toBeGreaterThanOrEqual(hold - CLOCK);
});

test('check: the self-check refuses a press-hold longer than the run makes it', async ({ browser }) => {
  test.skip(!harsh || harsh.pressHold === 0, 'harsh mode only, with press-hold made longer');
  await expect(checkHarsh(browser, { ...harsh!, pressHold: harsh!.pressHold + 500 })).rejects.toThrow(/press-hold at the root was \d+ ms longer than the token sheet declares it, not \d+ ms/);
});
