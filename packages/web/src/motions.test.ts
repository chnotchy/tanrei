// test/motions.ts, tested on pages of its own: what `motionEnded()` and `settledCss()` wait for and what `motionCount()`
// counts, in a light tree and two shadow roots deep, for an animation that runs, one that never ends, one that is
// cancelled, one that is held (paused before or while it is waited for) and one paused only for the frame before it
// plays, as an entrance is — and for a pressed state kept for press-hold after the press is let go, and one still
// held down. No component is used there: the pages make their own motions with `Element.animate()` and their own
// pressed state with `data-pressed` and a timer, so the helpers are proved apart from what they are used on. The last
// group presses a Button, whose press-hold is the press primitive's own timer.
//
// A motion that must not be waited for runs ten minutes, longer than any test may: a helper that waited for it would
// fail the test by its timeout, not pass it late.
import { type Locator, type Page, expect, test } from '@playwright/test';
import { EVERY_PRESSED, OUT_OF_MOTION, motionCount, motionEnded, settledCss } from '../test/motions.js';
import { holdClock, releaseClock } from '../test/page-clock.js';
import { loadSpec, mountFixtures, rootTokens } from '../test/harness.js';

/** Ten minutes: past any test's timeout, harsh mode's (two minutes) included. */
const LONG = 600_000;
/** A motion that is waited for to its end. */
const SHORT = 300;

/**
 * A page of its own: `#light` in the document, `#outer` with a shadow root that holds `#middle`, whose own shadow root
 * holds `#inner` — the element two shadow roots deep.
 */
async function stage(page: Page) {
  await page.setContent('<!doctype html><html><body><div id="light"></div><div id="outer"></div></body></html>');
  await page.evaluate(() => {
    const outer = document.querySelector('#outer')!.attachShadow({ mode: 'open' });
    outer.innerHTML = '<div id="middle"></div>';
    outer.querySelector('#middle')!.attachShadow({ mode: 'open' }).innerHTML = '<div id="inner"></div>';
  });
}

type Motion = 'short' | 'long' | 'endless';

/**
 * Starts a motion of `kind` on the element two shadow roots deep (or on `#light`) and keeps it as `window.__motion`:
 * `short` runs `SHORT` ms, `long` ten minutes, `endless` repeats for ever.
 */
const animate = (page: Page, kind: Motion, where: 'inner' | 'light' = 'inner') =>
  page.evaluate(
    ([k, at, long, short]) => {
      const el = at === 'light' ? document.querySelector('#light')! : document.querySelector('#outer')!.shadowRoot!.querySelector('#middle')!.shadowRoot!.querySelector('#inner')!;
      const timing: KeyframeAnimationOptions = k === 'short' ? { duration: short } : k === 'long' ? { duration: long } : { duration: short, iterations: Number.POSITIVE_INFINITY };
      (window as unknown as { __motion: Animation }).__motion = el.animate([{ opacity: 0 }, { opacity: 1 }], timing);
    },
    [kind, where, LONG, SHORT] as const,
  );

/** The kept motion's play state. */
const state = (page: Page) => page.evaluate(() => (window as unknown as { __motion: Animation }).__motion.playState);

test.describe('motionEnded', () => {
  test('waits for a motion two shadow roots deep, given the page or the outermost host', async ({ page }) => {
    for (const target of [page, page.locator('#outer')]) {
      await stage(page);
      await animate(page, 'short');
      expect(await state(page)).toBe('running');
      await motionEnded(target);
      expect(await state(page)).toBe('finished');
    }
  });

  test('does not wait for an animation that never ends, nor for one that is cancelled', async ({ page }) => {
    await stage(page);
    await animate(page, 'endless');
    await motionEnded(page);
    expect(await state(page)).toBe('running');
    await animate(page, 'long', 'light');
    await page.evaluate(() => (window as unknown as { __motion: Animation }).__motion.cancel());
    await motionEnded(page);
    expect(await state(page)).toBe('idle');
  });

  test('does not wait for an animation that is paused when it is asked: it moves nothing, and stays paused', async ({ page }) => {
    for (const where of ['inner', 'light'] as const) {
      await stage(page);
      await animate(page, 'long', where);
      const at = await page.evaluate(async () => {
        const motion = (window as unknown as { __motion: Animation }).__motion;
        motion.pause();
        // Held once the pause is no longer pending: its time stands still from then on.
        await motion.ready;
        return motion.currentTime;
      });
      await motionEnded(page);
      expect(await page.evaluate(() => (window as unknown as { __motion: Animation }).__motion.currentTime), `${where}: where it was held`).toBe(at);
      expect(await state(page), where).toBe('paused');
    }
  });

  test('waits to its end for a motion held at its start only until the next frame, as an entrance is held', async ({ page }) => {
    for (const where of ['inner', 'light'] as const) {
      await stage(page);
      await animate(page, 'short', where);
      await page.evaluate(() => {
        const motion = (window as unknown as { __motion: Animation }).__motion;
        motion.pause();
        motion.currentTime = 0;
        requestAnimationFrame(() => motion.play());
      });
      await motionEnded(page);
      expect(await state(page), where).toBe('finished');
    }
  });

  test('takes a motion held for a frame callback that a held page clock never runs as held: the clock holds it, and no frame the wait counts', async ({ page }) => {
    await stage(page);
    await holdClock(page);
    await animate(page, 'short');
    await page.evaluate(() => {
      const motion = (window as unknown as { __motion: Animation }).__motion;
      motion.pause();
      motion.currentTime = 0;
      requestAnimationFrame(() => motion.play());
    });
    await motionEnded(page);
    expect(await state(page)).toBe('paused');
    expect(await page.evaluate(() => (window as unknown as { __motion: Animation }).__motion.currentTime)).toBe(0);
  });

  test('waits for the motions that play beside a paused one', async ({ page }) => {
    await stage(page);
    await animate(page, 'long', 'light');
    await page.evaluate(() => (window as unknown as { __motion: Animation }).__motion.pause());
    await animate(page, 'short');
    await motionEnded(page);
    expect(await state(page)).toBe('finished');
  });
});

/**
 * Press-hold on the pages of the press tests: longer than any round trip to the page, so that a wait which does not
 * wait for it returns while the pressed state is still shown, every time.
 */
const HOLD = 1000;
const REST = 'rgb(0, 0, 255)';
const PRESSED = 'rgb(255, 0, 0)';

/**
 * `stage()`, with press-hold `hold` ms for everything inside `#outer`, and the element two shadow roots deep painted as
 * a control is: `REST` at rest, `PRESSED` while it shows a pressed state — set without a motion, and left over a
 * `SHORT` transition.
 */
async function pressStage(page: Page, hold: number) {
  await stage(page);
  await page.evaluate(
    ([h, short]) => {
      const outer = document.querySelector<HTMLElement>('#outer')!;
      outer.style.setProperty('--tanrei-sys-motion-duration-press-hold', `${h}ms`);
      const style = document.createElement('style');
      style.textContent = `#inner { block-size: 10px; background-color: rgb(0, 0, 255); transition: background-color ${short}ms linear; }
        #inner[data-pressed]:not([data-pressed='none']) { background-color: rgb(255, 0, 0); transition: none; }`;
      outer.shadowRoot!.querySelector('#middle')!.shadowRoot!.prepend(style);
    },
    [hold, SHORT] as const,
  );
}

/**
 * Shows `feedback` as the pressed state of the element two shadow roots deep, as the press primitive does when a press
 * begins. Given `letGoAfter`, the press is let go: a timer of the page's takes the state away that many ms later, as
 * press-hold does. Without it, the press is still held down, and nothing takes the state away.
 */
const press = (page: Page, feedback: string, letGoAfter?: number) =>
  page.evaluate(
    ([f, after]) => {
      const inner = document.querySelector('#outer')!.shadowRoot!.querySelector('#middle')!.shadowRoot!.querySelector<HTMLElement>('#inner')!;
      inner.dataset.pressed = f;
      if (after !== null) setTimeout(() => delete inner.dataset.pressed, after);
    },
    [feedback, letGoAfter ?? null] as const,
  );

/** The pressed state the element two shadow roots deep shows (`null`: none). */
const pressedState = (page: Page) =>
  page.evaluate(() => document.querySelector('#outer')!.shadowRoot!.querySelector('#middle')!.shadowRoot!.querySelector('#inner')!.getAttribute('data-pressed'));

test.describe('motionEnded and a press', () => {
  test('waits for a pressed state two shadow roots deep until the press-hold of a press let go ends it, then for the motion back to rest its end starts — given the page or the outermost host', async ({ page }) => {
    for (const target of [page, page.locator('#outer')]) {
      await pressStage(page, HOLD);
      await press(page, 'overlay', HOLD);
      await motionEnded(target);
      expect(await pressedState(page), 'the pressed state has ended').toBeNull();
      expect(await motionCount(page.locator('#outer')), 'and its motion back to rest with it').toBe(0);
      expect(await page.locator('#inner').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(REST);
    }
  });

  test('does not wait for a press still held down — it returns once press-hold has passed, the state still shown — nor for data-pressed="none", which shows nothing', async ({ page }) => {
    // Press-hold ten minutes: a wait for "none" would fail the test by its timeout.
    await pressStage(page, LONG);
    await press(page, 'none');
    await motionEnded(page);
    expect(await pressedState(page)).toBe('none');
    await pressStage(page, SHORT);
    await press(page, 'overlay');
    await motionEnded(page);
    expect(await pressedState(page), 'held down: still shown').toBe('overlay');
    expect(await motionCount(page.locator('#outer'))).toBe(0);
  });

  test('takes a press let go on a held page clock as held: the clock holds press-hold, and the wait returns; once the clock runs past press-hold, it waits for the motion back to rest', async ({ page }) => {
    // Press-hold ten minutes: only the held clock can end the wait.
    await pressStage(page, LONG);
    await holdClock(page);
    try {
      await press(page, 'overlay', HOLD);
      await motionEnded(page);
      expect(await pressedState(page), 'held by the clock').toBe('overlay');
      await page.clock.runFor(HOLD);
      expect(await pressedState(page)).toBeNull();
      await motionEnded(page);
      expect(await motionCount(page.locator('#outer'))).toBe(0);
    } finally {
      await releaseClock(page);
    }
  });
});

test.describe('settledCss and a press', () => {
  test('reads the value at rest once the press-hold of a press let go has ended it and its motion back has played; a press still held down reads as it is', async ({ page }) => {
    const inner = page.locator('#inner');
    await pressStage(page, HOLD);
    await press(page, 'overlay', HOLD);
    expect(await settledCss(inner, 'background-color')).toBe(REST);
    await pressStage(page, SHORT);
    await press(page, 'overlay');
    expect(await settledCss(inner, 'background-color'), 'held down').toBe(PRESSED);
  });
});

test.describe('with a Button: the press primitive’s own press-hold', () => {
  const spec = loadSpec('button');
  /** The pressed states shown in the page. */
  const pressedInPage = (page: Page) => page.evaluate((every) => ((0, eval)(every) as (root: Document) => Element[])(document).map((el) => el.getAttribute('data-pressed')), EVERY_PRESSED);
  const mount = async (page: Page): Promise<Locator> => {
    await mountFixtures(page, spec, { fixtures: [spec.fixtures[0]] });
    await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': `${HOLD}ms` });
    return page.locator('tanrei-button').first();
  };

  test('after a click or a key, waits until press-hold has ended the pressed state and its motion back to rest has played', async ({ page }) => {
    const button = await mount(page);
    await button.click();
    await motionEnded(page);
    expect(await pressedInPage(page), 'the click').toEqual([]);
    expect(await motionCount(button)).toBe(0);
    await button.locator('button').focus();
    await page.keyboard.press('Enter');
    await motionEnded(button);
    expect(await pressedInPage(page), 'Enter').toEqual([]);
    expect(await motionCount(button)).toBe(0);
  });

  test('returns while the pointer is still down, the pressed state shown; waits for it once the pointer is let go', async ({ page }) => {
    const button = await mount(page);
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    try {
      await motionEnded(page);
      expect((await pressedInPage(page)).length, 'held down: shown').toBe(1);
    } finally {
      await page.mouse.up();
    }
    await motionEnded(page);
    expect(await pressedInPage(page)).toEqual([]);
    expect(await motionCount(button)).toBe(0);
  });
});

test.describe('settledCss', () => {
  test('reads a value once a motion held only until the next frame has played to its end, and at once the value a held one holds', async ({ page }) => {
    await stage(page);
    const light = page.locator('#light');
    await animate(page, 'short', 'light');
    await page.evaluate(() => {
      const motion = (window as unknown as { __motion: Animation }).__motion;
      motion.pause();
      motion.currentTime = 0;
      requestAnimationFrame(() => motion.play());
    });
    expect(await settledCss(light, 'opacity'), 'the end: the value it rests at').toBe('1');
    expect(await state(page)).toBe('finished');
    await animate(page, 'long', 'light');
    await page.evaluate(() => {
      const motion = (window as unknown as { __motion: Animation }).__motion;
      motion.pause();
      motion.currentTime = 0;
    });
    expect(await settledCss(light, 'opacity'), 'where it is held').toBe('0');
    expect(await state(page)).toBe('paused');
  });
});

test.describe('OUT_OF_MOTION', () => {
  test('ends the wait for an animation that is paused while it is waited for, and for one that finishes or is cancelled', async ({ page }) => {
    await stage(page);
    const seen = await page.evaluate(
      async ([source, long, brief]) => {
        const until = (0, eval)(source) as (animation: Animation) => Promise<void>;
        const el = document.querySelector('#light')!;
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        // Paused after two frames of waiting: the wait ends then, with the animation still held.
        const held = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: long });
        const waiting = until(held);
        await frame();
        await frame();
        held.pause();
        await waiting;
        // Cancelled while waited for.
        const cancelled = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: long });
        const dropped = until(cancelled);
        await frame();
        cancelled.cancel();
        await dropped;
        // One that runs to its end.
        const short = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: brief });
        await until(short);
        return [held.playState, cancelled.playState, short.playState];
      },
      [OUT_OF_MOTION, LONG, SHORT] as const,
    );
    expect(seen).toEqual(['paused', 'idle', 'finished']);
  });
});

test.describe('motionCount', () => {
  test('counts the motions two shadow roots deep — running, paused or endless — and 0 once nothing moves', async ({ page }) => {
    await stage(page);
    const outer = page.locator('#outer');
    expect(await motionCount(outer)).toBe(0);
    await animate(page, 'endless');
    expect(await motionCount(outer)).toBe(1);
    await animate(page, 'long');
    await page.evaluate(() => (window as unknown as { __motion: Animation }).__motion.pause());
    expect(await motionCount(outer)).toBe(2);
    // The light tree's motion is not the host's.
    await animate(page, 'long', 'light');
    expect(await motionCount(outer)).toBe(2);
    await page.evaluate(() => {
      const inner = document.querySelector('#outer')!.shadowRoot!.querySelector('#middle')!.shadowRoot!.querySelector('#inner')!;
      inner.remove();
    });
    expect(await motionCount(outer)).toBe(0);
  });
});
