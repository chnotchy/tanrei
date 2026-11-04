// containWheel() (src/primitives/contained-wheel.ts): which wheel a scroller that keeps its scroll from the page
// cancels, asked with synthetic events in every engine. The real wheel, in Firefox, is each component's own test.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** The module as it is built: it imports nothing, so a page can load it alone. */
const MODULE = fs.readFileSync(path.join(pkg, 'dist/primitives/contained-wheel.js'), 'utf8');
const PAGE = 'http://contained-wheel.test/';

/** A vertical scroller (200 of range), a sideways one in each direction (600 of range), and the page around them. */
const BODY = `
  <style>
    body { margin: 0; min-block-size: 3000px; min-inline-size: 3000px; }
    .v { overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; inline-size: 200px; block-size: 100px; }
    .h { overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; inline-size: 200px; block-size: 60px; }
    .tall { block-size: 300px; }
    .wide { inline-size: 800px; block-size: 20px; }
  </style>
  <div id="v" class="v"><div class="tall" id="v-in"></div></div>
  <div id="h" class="h"><div class="wide" id="h-in"></div></div>
  <div id="rtl" class="h" dir="rtl"><div class="wide" id="rtl-in"></div></div>`;

async function open(page: Page) {
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>contained wheel</title></head><body>${BODY}</body></html>` }));
  await page.route(`${PAGE}contained-wheel.js`, (route) => route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: MODULE }));
  await page.goto(PAGE);
  await page.evaluate(async () => {
    const { containedWheel } = (await import('/contained-wheel.js' as string)) as { containedWheel: EventListenerObject & AddEventListenerOptions };
    for (const id of ['v', 'h', 'rtl']) document.getElementById(id)!.addEventListener('wheel', containedWheel, containedWheel);
  });
}

/** Whether a wheel event sent from `from`, with the scroller `id` at `at` (top, or left), is cancelled. */
const cancelled = (page: Page, id: string, at: number, init: WheelEventInit, from = `${id}-in`) =>
  page.evaluate(
    ([id, at, init, from]) => {
      const scroller = document.getElementById(id as string)!;
      if (id === 'v') scroller.scrollTop = at as number;
      else scroller.scrollLeft = at as number;
      const event = new WheelEvent('wheel', { bubbles: true, composed: true, cancelable: true, ...(init as WheelEventInit) });
      document.getElementById(from as string)!.dispatchEvent(event);
      return event.defaultPrevented;
    },
    [id, at, init, from] as const,
  );

test.describe('containWheel()', () => {
  test.beforeEach(async ({ page }) => open(page));

  test('up and down: a wheel toward the end the scroller stands at is cancelled, one it can still take is not, at either end', async ({ page }) => {
    expect([await cancelled(page, 'v', 200, { deltaY: 100 }), await cancelled(page, 'v', 200, { deltaY: -100 }), await cancelled(page, 'v', 0, { deltaY: -100 }), await cancelled(page, 'v', 0, { deltaY: 100 }), await cancelled(page, 'v', 100, { deltaY: 100 })]).toEqual([true, false, true, false, false]);
    // Lines and pages are the same direction as pixels.
    expect(await cancelled(page, 'v', 200, { deltaY: 3, deltaMode: 1 /* DOM_DELTA_LINE */ })).toBe(true);
  });

  test('not with Ctrl (zoom, a pinch), not one the page would not have taken anyway (not cancelable), not one already cancelled, not one with no part', async ({ page }) => {
    expect([await cancelled(page, 'v', 200, { deltaY: 100, ctrlKey: true }), await cancelled(page, 'v', 200, { deltaY: 100, cancelable: false }), await cancelled(page, 'v', 200, {})]).toEqual([false, false, false]);
  });

  test('the axis is the larger part, and sideways for Shift with a vertical wheel; a scroller is held only along an axis it scrolls and contains', async ({ page }) => {
    // A trackpad's swipe down with a little sideways is down; one mostly sideways is sideways, which the vertical
    // scroller does not scroll (no range, overflow hidden): it goes on.
    expect([await cancelled(page, 'v', 200, { deltaY: 100, deltaX: 4 }), await cancelled(page, 'v', 200, { deltaY: 4, deltaX: 100 }), await cancelled(page, 'v', 200, { deltaX: 100 }), await cancelled(page, 'v', 200, { deltaY: 100, shiftKey: true })]).toEqual([true, false, false, false]);
    // The sideways scroller contains only sideways: a wheel turned down over it is the page's, at either end.
    expect([await cancelled(page, 'h', 600, { deltaY: 100 }), await cancelled(page, 'h', 0, { deltaY: -100 })]).toEqual([false, false]);
    expect([await cancelled(page, 'h', 600, { deltaX: 100 }), await cancelled(page, 'h', 600, { deltaX: -100 }), await cancelled(page, 'h', 0, { deltaX: -100 }), await cancelled(page, 'h', 600, { deltaY: 100, shiftKey: true }), await cancelled(page, 'h', 300, { deltaX: 100 })]).toEqual([true, false, true, true, false]);
  });

  test('right is right in a right-to-left scroller: it stands at its start at 0 and at its end at minus its range', async ({ page }) => {
    expect([await cancelled(page, 'rtl', 0, { deltaX: 100 }), await cancelled(page, 'rtl', 0, { deltaX: -100 }), await cancelled(page, 'rtl', -600, { deltaX: -100 }), await cancelled(page, 'rtl', -600, { deltaX: 100 })]).toEqual([true, false, true, false]);
  });

  test('a scroller inside that can still take the wheel takes it; one that cannot, or that does not scroll, leaves it to the scroller', async ({ page }) => {
    await page.evaluate(() => document.getElementById('v-in')!.insertAdjacentHTML('beforeend', '<div id="inner" style="overflow-y: auto; block-size: 40px"><div id="inner-in" style="block-size: 200px"></div></div><div id="clipped" style="overflow-y: hidden; block-size: 40px"><div id="clipped-in" style="block-size: 200px"></div></div>'));
    expect(await cancelled(page, 'v', 200, { deltaY: 100 }, 'inner-in')).toBe(false);
    await page.evaluate(() => (document.getElementById('inner')!.scrollTop = 1000));
    expect([await cancelled(page, 'v', 200, { deltaY: 100 }, 'inner-in'), await cancelled(page, 'v', 200, { deltaY: 100 }, 'clipped-in')]).toEqual([true, true]);
  });

  test('a scroller that cannot scroll, contains nothing or scrolls nothing along the axis is left alone', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('v-in')!.style.blockSize = '50px'));
    expect([await cancelled(page, 'v', 0, { deltaY: 100 }), await cancelled(page, 'v', 0, { deltaY: -100 })]).toEqual([false, false]);
    await page.evaluate(() => {
      document.getElementById('v-in')!.style.blockSize = '';
      document.getElementById('v')!.style.overscrollBehavior = 'auto';
    });
    expect(await cancelled(page, 'v', 200, { deltaY: 100 })).toBe(false);
    await page.evaluate(() => {
      document.getElementById('v')!.style.overscrollBehavior = '';
      document.getElementById('v')!.style.overflowY = 'hidden';
    });
    expect(await cancelled(page, 'v', 200, { deltaY: 100 })).toBe(false);
  });
});
