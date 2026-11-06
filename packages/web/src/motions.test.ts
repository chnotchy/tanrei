// test/motions.ts, tested on pages of its own: what `motionEnded()` and `settledCss()` wait for and what `motionCount()`
// counts, in a light tree and two shadow roots deep, for an animation that runs, one that never ends, one that is
// cancelled, one that is held (paused before or while it is waited for) and one paused only for the frame before it
// plays, as an entrance is. No component and no token is used: the pages make their own motions with
// `Element.animate()`, so the helpers are proved apart from what they are used on.
//
// A motion that must not be waited for runs ten minutes, longer than any test may: a helper that waited for it would
// fail the test by its timeout, not pass it late.
import { type Page, expect, test } from '@playwright/test';
import { OUT_OF_MOTION, motionCount, motionEnded, settledCss } from '../test/motions.js';
import { holdClock } from '../test/page-clock.js';

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
