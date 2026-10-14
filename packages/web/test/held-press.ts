// The press a stylesheet holds where no script answers it (link.css, accordion.css, table-of-contents.css,
// breadcrumbs.css, table.css, previous-next-links.css): what is DRAWN while the control is held down and for press-hold after.
//
// Those stylesheets say the hold in one form. The pressed container is a layer of its own — an image of that one
// color, `background-image` — and the state's color under it is clipped away (`background-clip: …, text`): the pressed
// color stands in the state's place. Both follow two unregistered names that step back after press-hold, and the
// background's COLOR takes no part in it. A hold that goes through the color — mixed with the pressed one by a held
// number — fades toward the state under it as soon as the press ends, comes back, and jumps; reading that the number
// is held does not see it.
// So this reads, in every frame from the release on, the three properties the picture is made of.
import { type Locator, type Page, expect } from '@playwright/test';
import { rootTokens } from './harness.js';

/** A color as the browser serializes it — `rgb()`, `rgba()` or `color(srgb …)` — as four numbers. */
const rgba = (color: string): number[] => {
  const srgb = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/.exec(color.trim());
  if (srgb) return [...srgb.slice(1, 4).map((c) => Math.round(Number(c) * 255)), Math.round(Number(srgb[4] ?? 1) * 100) / 100];
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return [...parts.slice(0, 3).map(Math.round), Math.round((parts[3] ?? 1) * 100) / 100];
};

interface Frame {
  at: number;
  image: string;
  clip: string;
  color: string;
}

/** The color of the layer a held press draws: the first color of the image, or nothing where there is no image. */
const layer = (image: string) => /^linear-gradient\(((?:rgba?|color)\([^)]*\))/.exec(image)?.[1] ?? null;

export interface HeldPress {
  /** The pressed container's color, as `resolveColor()` gives it. */
  pressed: string;
  /** The box that draws the container, where it is not the control itself (a table's sort button: `::before`). */
  pseudo?: string;
  /** Where in the control the pointer is put down, from its top left corner. The middle where it is not said. */
  at?: { x: number; y: number };
}

/**
 * Presses `control` with the mouse on a page that holds no script of the package, lets go at once, and holds that the
 * pressed container is what is drawn — at once, in every frame of a press-hold of 1.5 s, and no longer.
 */
export async function expectPressHeld(page: Page, control: Locator, { pressed, pseudo, at }: HeldPress) {
  const HOLD = 1500;
  const WATCHED = 1300;
  await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': `${HOLD}ms` });
  const read = () =>
    control.evaluate((el, ps) => {
      const style = getComputedStyle(el, ps ?? undefined);
      return { image: style.backgroundImage, clip: style.backgroundClip, color: style.backgroundColor };
    }, pseudo ?? null);
  const box = (await control.boundingBox())!;
  await page.mouse.move(box.x + (at?.x ?? box.width / 2), box.y + (at?.y ?? box.height / 2));
  // The state under the press, once it has arrived: two reads a moment apart that say the same.
  let under = await read();
  await expect
    .poll(async () => {
      const before = under;
      await page.waitForTimeout(60);
      under = await read();
      return under.color === before.color && !/^(oklab|oklch|lab|lch)\(/.test(under.color);
    })
    .toBe(true);
  expect(under.image, 'at rest: no layer').toBe('none');
  expect(under.clip, 'at rest: the whole box').toBe('border-box');

  await page.mouse.down();
  expect(await control.getAttribute('data-pressed'), 'no script answers the press').toBeNull();
  const down = await read();
  expect(layer(down.image), `held down: the pressed layer (${down.image})`).not.toBeNull();
  expect(rgba(layer(down.image)!), 'held down: the pressed container, at once').toEqual(rgba(pressed));
  expect(down.clip.split(',').at(-1)!.trim(), 'held down: the state’s color is not drawn under it').toBe('text');

  // Every frame from the release on, in the page.
  await control.evaluate(
    (el, [ps, watched]) => {
      const seen: { at: number; image: string; clip: string; color: string }[] = ((window as unknown as { __held: unknown[] }).__held = []) as never;
      let up = Number.NaN;
      addEventListener('pointerup', () => (up = performance.now()), { once: true, capture: true });
      const frame = () => {
        if (!Number.isNaN(up)) {
          const style = getComputedStyle(el, (ps as string | null) ?? undefined);
          seen.push({ at: performance.now() - up, image: style.backgroundImage, clip: style.backgroundClip, color: style.backgroundColor });
        }
        if (Number.isNaN(up) || performance.now() - up < (watched as number)) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    [pseudo ?? null, WATCHED] as const,
  );
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __held: { at: number }[] }).__held.at(-1)?.at ?? 0), { timeout: 10_000 }).toBeGreaterThanOrEqual(WATCHED);
  const frames = await page.evaluate(() => (window as unknown as { __held: Frame[] }).__held);
  expect(frames.length, 'frames seen in the hold').toBeGreaterThan(5);
  for (const frame of frames) {
    const when = `${Math.round(frame.at)} ms after the release`;
    expect(layer(frame.image), `${when}: the pressed layer (${frame.image})`).not.toBeNull();
    expect(rgba(layer(frame.image)!), `${when}: the pressed container`).toEqual(rgba(pressed));
    expect(frame.clip.split(',').at(-1)!.trim(), `${when}: the state’s color is not drawn under it`).toBe('text');
    // The color under the layer is the state's, and is on its way nowhere: nothing fades while the press is held.
    expect(rgba(frame.color), `${when}: the state’s color did not move`).toEqual(rgba(under.color));
  }
  // The hold over: the state's container, and no layer.
  await expect.poll(async () => (await read()).image, { timeout: 10_000 }).toBe('none');
  const after = await read();
  expect(after.clip).toBe('border-box');
  expect(rgba(after.color)).toEqual(rgba(under.color));
  await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '' });
}

/**
 * The same proof as `expectPressHeld`, of every MOMENT of the hold instead of every frame a machine happens to draw:
 * the test takes hold of what the release sets moving on the control — the hold's two steps, and a color on its way if
 * there were one — in the answer after the release, and sets all of it to one moment after another of the
 * hold's own clock and reads what is drawn there. A runner that draws two frames a second (WebKit on Linux without a
 * GPU: 570 ms a frame) saw three frames of a hold of 1.5 s where six were asked for; a moment is read whatever the
 * frames are. What is left to the machine: the answer after the release comes within the hold's 4 s.
 */
export async function expectPressHeldAtEveryMoment(page: Page, control: Locator, { pressed, pseudo, at }: HeldPress) {
  const HOLD = 4000;
  await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': `${HOLD}ms` });
  const read = () =>
    control.evaluate((el, ps) => {
      const style = getComputedStyle(el, ps ?? undefined);
      return { image: style.backgroundImage, clip: style.backgroundClip, color: style.backgroundColor };
    }, pseudo ?? null);
  const box = (await control.boundingBox())!;
  await page.mouse.move(box.x + (at?.x ?? box.width / 2), box.y + (at?.y ?? box.height / 2));
  // The state under the press, once it has arrived: two reads a moment apart that say the same.
  let under = await read();
  await expect
    .poll(async () => {
      const before = under;
      await page.waitForTimeout(60);
      under = await read();
      return under.color === before.color && !/^(oklab|oklch|lab|lch)\(/.test(under.color);
    })
    .toBe(true);
  expect(under.image, 'at rest: no layer').toBe('none');
  expect(under.clip, 'at rest: the whole box').toBe('border-box');

  await page.mouse.down();
  expect(await control.getAttribute('data-pressed'), 'no script answers the press').toBeNull();
  const down = await read();
  expect(layer(down.image), `held down: the pressed layer (${down.image})`).not.toBeNull();
  expect(rgba(layer(down.image)!), 'held down: the pressed container, at once').toEqual(rgba(pressed));
  expect(down.clip.split(',').at(-1)!.trim(), 'held down: the state’s color is not drawn under it').toBe('text');

  // The release, and in the next answer every motion of the box that draws the container is held and set back to where
  // it began. (By a question, not by a listener in the page: the page may be one with scripting off — a table's.)
  await page.mouse.up();
  const hold = () =>
    control.evaluate((el) => {
      // (Of the control and of its pseudo-elements: the box that draws the container may be `::before`, drawing from
      // names that step on the control itself.)
      const own = () => el.getAnimations({ subtree: true }).filter((motion) => (motion.effect as KeyframeEffect | null)?.target === el);
      (window as unknown as { __heldOf?: () => Animation[] }).__heldOf = own;
      const motions = own();
      for (const motion of motions) {
        motion.pause();
        motion.currentTime = 0;
      }
      return motions.map((motion) => `${(motion as CSSTransition).transitionProperty} ${Number(motion.effect!.getTiming().delay)}+${Number(motion.effect!.getTiming().duration)}`);
    });
  const motions = await hold();
  // The hold is press-hold long and then a step: two names step back after it, and nothing of it is a fade.
  const steps = motions.filter((motion) => motion.startsWith('--') && motion.endsWith(` ${HOLD}+0`));
  expect(steps.length, `the hold's two steps, of ${motions.join(', ')}`).toBe(2);
  const moment = (time: number) =>
    page.evaluate((time) => {
      for (const motion of (window as unknown as { __heldOf: () => Animation[] }).__heldOf()) motion.currentTime = time;
    }, time);
  for (const time of [0, 1, 8, 16, 33, 50, 100, 150, 200, 300, HOLD / 4, HOLD / 2, (3 * HOLD) / 4, HOLD - 16, HOLD - 1]) {
    await moment(time);
    const frame = await read();
    const when = `${time} ms after the release`;
    expect(layer(frame.image), `${when}: the pressed layer (${frame.image})`).not.toBeNull();
    expect(rgba(layer(frame.image)!), `${when}: the pressed container`).toEqual(rgba(pressed));
    expect(frame.clip.split(',').at(-1)!.trim(), `${when}: the state’s color is not drawn under it`).toBe('text');
    // The color under the layer is the state's, and is on its way nowhere: nothing fades while the press is held.
    expect(rgba(frame.color), `${when}: the state’s color did not move`).toEqual(rgba(under.color));
  }
  // Let go a moment before its end, the hold ends by itself: the state's container, and no layer.
  await page.evaluate(() => (window as unknown as { __heldOf: () => Animation[] }).__heldOf().forEach((motion) => motion.play()));
  await expect.poll(async () => (await read()).image, { timeout: 10_000 }).toBe('none');
  const after = await read();
  expect(after.clip).toBe('border-box');
  expect(rgba(after.color)).toEqual(rgba(under.color));
  await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '' });
}
