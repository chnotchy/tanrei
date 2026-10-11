// A press that a script answers (`PressController`: `data-pressed` on the pressed element), as a test watches it:
// shown without delay, and kept for at least press-hold when the press ends sooner (BTN-8 and every sentence after it).
//
// The press is measured from the INPUT EVENT, on the page's clock — never from the moment an observer hears of the
// attribute. An observer is told in a microtask, after the element's own listener has returned, and that listener does
// more than set the attribute: Enter on an option chooses it, tells the product and closes the list first. On a slow
// machine that is 10 ms and more (a select's option in WebKit on Linux, one worker: the observer heard 10 and 11 ms
// after the key, and the state went 301 ms after the key under a hold of 300), so a hold counted from the observer
// comes out short by what the element did in between, while the state was there all along.
//
//   down      when the event that pressed reached the window, before any listener of the element (capture).
//   feedback  what `data-pressed` held when that same event had passed the element's listeners (bubble): the state
//             was set in the turn of the event — without delay, whatever the machine's speed. Undefined where no
//             input event left the element pressed.
//   off       when the state was taken away (an observer: taking it away is a timer's doing, with nothing after it).
//   observed  what an observer saw of the state first, in an event's turn or out of one: a watch that saw nothing at
//             all has none of the four.
import { type Locator, type Page, expect } from '@playwright/test';

/** `performance.now()` is coarsened to a millisecond (and jittered in Firefox): two readings may differ from the time between them by this much. */
export const CLOCK = 1;

export interface WatchedPress {
  down?: number;
  feedback?: string;
  off?: number;
  observed?: string;
}

interface Watch {
  log: WatchedPress;
  stop: () => void;
}

/**
 * Watches the next press of `target` — the element that carries `data-pressed`. A watch begun before ends here, so a
 * test may watch press after press, on one element or on another. `data-pressed="none"` is no pressed state (the
 * system names no feedback, or a stylesheet's own answer stands down).
 */
export const watchPress = (target: Locator) =>
  target.evaluate((el: HTMLElement) => {
    const w = window as unknown as { __watchedPress?: Watch };
    w.__watchedPress?.stop();
    const log: WatchedPress = {};
    const pressed = () => (el.dataset.pressed !== undefined && el.dataset.pressed !== 'none' ? el.dataset.pressed : undefined);
    const ended = new AbortController();
    let arrived = 0;
    for (const type of ['pointerdown', 'keydown']) {
      window.addEventListener(type, () => (arrived = performance.now()), { capture: true, signal: ended.signal });
      window.addEventListener(
        type,
        () => {
          if (log.down !== undefined || pressed() === undefined) return;
          log.down = arrived;
          log.feedback = pressed();
        },
        { signal: ended.signal },
      );
    }
    const observer = new MutationObserver(() => {
      if (pressed() !== undefined) log.observed ??= pressed();
      else if (log.down !== undefined) log.off ??= performance.now();
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
    w.__watchedPress = {
      log,
      stop: () => {
        ended.abort();
        observer.disconnect();
      },
    };
  });

/** What the watch has seen so far. */
export const watchedPress = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __watchedPress: Watch }).__watchedPress.log }));

/**
 * The watched press, once it is over: it was shown in the turn of the event that pressed, and was there for at least
 * `hold` from that event on. Returns what was seen (`feedback` is what the press was answered with).
 */
export async function expectPressShownAndHeld(page: Page, hold: number, message = 'the press'): Promise<Required<WatchedPress>> {
  await expect.poll(async () => (await watchedPress(page)).off, { message: `${message}: the pressed state was shown and has ended` }).toBeDefined();
  const seen = (await watchedPress(page)) as Required<WatchedPress>;
  expect(seen.feedback, `${message}: shown in the turn of the event that pressed`).toBeDefined();
  expect(seen.off - seen.down, `${message}: held for press-hold from the event on`).toBeGreaterThanOrEqual(hold - CLOCK);
  return seen;
}
