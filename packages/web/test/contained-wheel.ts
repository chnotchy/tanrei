import { type Locator, type Page, expect } from '@playwright/test';
import { atRest } from './at-rest.js';

/**
 * A real wheel, turned over `scroller` (a box that keeps its scroll from the page: `overscroll-behavior: contain` and
 * src/primitives/contained-wheel.ts) on to its end along `axis`, and again after a pause: the box stands at its end and
 * the page behind it never moves. Gecko keeps to `overscroll-behavior` only within one wheel transaction, which an
 * event that scrolls nothing does not begin or prolong, so without the primitive Firefox gives the second run to the
 * page (`mousewheel.transaction.timeout`, 1.5 s, measured 1200–2400 px); Chromium and WebKit keep the page still
 * either way. Run it in every engine: it asks the same of each.
 *
 * The page is made to scroll both ways by a box behind everything that hit testing passes through, so that nothing the
 * component lays out changes. The pointer goes to `at` (the middle of the box where not given).
 */
export async function expectWheelKeptFromPage(page: Page, scroller: Locator, axis: 'block' | 'inline', at?: { x: number; y: number }) {
  await page.evaluate(() => {
    const room = document.createElement('div');
    room.dataset.wheelRoom = '';
    room.style.cssText = 'position: absolute; inset-block-start: 0; inset-inline-start: 0; inline-size: 4000px; block-size: 4000px; z-index: -1; pointer-events: none';
    document.body.append(room);
    window.scrollTo(0, 0);
  });
  const place = () => scroller.evaluate((el) => ({ top: el.scrollTop, left: el.scrollLeft, height: el.scrollHeight - el.clientHeight, width: el.scrollWidth - el.clientWidth, rtl: getComputedStyle(el).direction === 'rtl' }));
  const start = await place();
  const range = axis === 'block' ? start.height : start.width;
  expect(range, 'the box scrolls along the axis').toBeGreaterThan(1);
  // Toward the end, physically: down, or right (left where the box is right-to-left, its end at minus its range).
  const sign = axis === 'inline' && start.rtl ? -1 : 1;
  const end = sign * range;
  // A little short of the end, so that the first run scrolls the box and so begins the transaction with it.
  await scroller.evaluate((el, [axis, to]) => (axis === 'block' ? (el.scrollTop = to as number) : (el.scrollLeft = to as number)), [axis, end - sign * Math.min(100, range / 2)] as const);
  const box = (await scroller.boundingBox())!;
  await page.mouse.move(at?.x ?? box.x + box.width / 2, at?.y ?? box.y + box.height / 2);
  const turn = async () => {
    for (let step = 0; step < 4; step++) await page.mouse.wheel(axis === 'inline' ? sign * 400 : 0, axis === 'block' ? 400 : 0);
    await atRest(scroller);
    await atRest(page);
  };
  const offset = async () => {
    const now = await place();
    return Math.round(axis === 'block' ? now.top : now.left);
  };
  const pageOffset = () => page.evaluate(() => [window.scrollX, window.scrollY]);
  await turn();
  expect(await offset(), 'the box stands at its end').toBe(Math.round(end));
  expect(await pageOffset(), 'the page did not move').toEqual([0, 0]);
  // Longer than Gecko keeps the transaction, on the browser's own clock, which no page clock holds: the next run is a
  // new one, which it would give to the page.
  await page.waitForTimeout(1600);
  await turn();
  expect(await pageOffset(), 'the page did not move after the pause').toEqual([0, 0]);
  expect(await offset(), 'the box is still at its end').toBe(Math.round(end));
  await page.evaluate(() => document.querySelector('[data-wheel-room]')?.remove());
}
