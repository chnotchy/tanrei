// holdPageScroll() (MDL-2) in Chromium under overlay scroll bars, the default on macOS, asked for in any OS
// (`--enable-features=OverlayScrollbar`), so that CI's Linux runs the branch only macOS would take otherwise: a bar styled
// with `::-webkit-scrollbar` takes room, Chromium keeps no stable gutter for it, and the window itself widens by the bar's
// width while the scroll is held. The hold pads the root, so the page's content stays, and writes the room the window
// gained on the root (`--tanrei-scroll-hold-inset-right`), so that what is placed against the window and adds it to its
// insets stays too: a product's fixed bar, and a snackbar. See page-scroll-hold.test.ts for the other engines and bars.
import { expect, test } from '@playwright/test';
import { motionEnded } from '../../test/motions.js';
import { DRAWN_BARS, NONE, STYLED_BAR, WINDOW, expectNothingMoved, expectNothingMovesOnRelease, holdAndRelease, mount, resizeWhileHeld } from '../../test/page-scroll-hold.js';

// A worker-scoped option: the whole file. Only Chromium has the switch.
test.use({ launchOptions: { ...DRAWN_BARS, args: ['--enable-features=OverlayScrollbar'] } });
test.beforeEach(({ browserName }) => test.skip(browserName !== 'chromium', 'a switch of Chromium’s'));

const WIDENED = { left: '', right: '10px' };

test('MDL-2: a root that keeps a stable gutter of its own keeps none for a styled bar over overlay bars either — the hold pads it and writes the room the window gained, and what is fixed to the window and reads it stays', async ({ page }) => {
  const host = await mount(page, `:root { scrollbar-gutter: stable; } ${STYLED_BAR}`);
  const seen = await holdAndRelease(page, host);
  expect(seen.before.bar, 'the styled bar takes its width').toBe(10);
  expectNothingMoved(seen, WIDENED);
});

// A page 700 px tall draws a bar in a window 480 px tall and none in one 1000 px tall (see page-scroll-hold.test.ts).
const TALL = { width: WINDOW.width, height: 1000 };

test('MDL-2: the window made shorter while the scroll is held, so that a styled bar comes back once released over overlay bars: the hold measures the room again — the padding and the room the window gained — and nothing behind moves as it lets go', async ({ page }) => {
  const host = await mount(page, STYLED_BAR, { height: 700, viewport: TALL });
  const seen = await resizeWhileHeld(page, host, WINDOW);
  expect(seen.after.bar, 'the styled bar takes its width in the resized window').toBe(10);
  expectNothingMovesOnRelease(seen, WIDENED);
});

test('MDL-2: the window made taller while the scroll is held, so that no bar comes back once released over overlay bars: the hold takes back the padding and the room it wrote, and nothing behind moves as it lets go', async ({ page }) => {
  const host = await mount(page, STYLED_BAR, { height: 700, viewport: WINDOW });
  const seen = await resizeWhileHeld(page, host, TALL);
  expect(seen.after.bar, 'no bar is drawn in the resized window').toBe(0);
  expectNothingMovesOnRelease(seen, NONE);
});

test('MDL-2: where the window widens as the page’s scroll is held — no gutter is kept for a styled bar over overlay bars — the hold writes the room it gained, and what is fixed to the window and reads it stays', async ({ page }) => {
  const host = await mount(page, STYLED_BAR);
  const seen = await holdAndRelease(page, host);
  expect(seen.before.bar, 'the styled bar takes its width').toBe(10);
  expectNothingMoved(seen, WIDENED);
});

test('MDL-2: where the window widens as the page’s scroll is held, a snackbar shown when the dialog opens — moved inside it (SNK-38) — stays where it was, at the bottom and at the top end', async ({ page }) => {
  const host = await mount(page, STYLED_BAR);
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<tanrei-snackbar-host></tanrei-snackbar-host>');
    return customElements.whenDefined('tanrei-snackbar-host');
  });
  // Wherever it is shown: in the host, or inside the dialog while it is open (a locator looks into shadow roots).
  const snackbars = page.locator('tanrei-snackbar[popover]');
  for (const placement of ['bottom', 'top-end']) {
    await page.evaluate((placement) => {
      const snackbars = document.querySelector<HTMLElement & { show(options: object): Promise<unknown> }>('tanrei-snackbar-host')!;
      void snackbars.show({ message: placement, duration: 'indefinite', placement });
    }, placement);
    const snackbar = snackbars.filter({ hasText: placement });
    await expect.poll(() => snackbar.evaluate((el) => el.matches(':popover-open'))).toBe(true);
    await motionEnded(snackbar);
    const seen = await holdAndRelease(page, host, () =>
      snackbar.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return { x: box.x, width: box.width };
      }),
    );
    expect(seen.held.inset, 'the window gained the bar’s room on its right').toEqual(WIDENED);
    expect(seen.held.read, `the snackbar at the ${placement} does not move`).toEqual(seen.before.read);
    expect(seen.after.read, 'nor once the dialog has closed').toEqual(seen.before.read);
    await page.evaluate(() => document.querySelector<HTMLElement & { dismissCurrent(): void }>('tanrei-snackbar-host')!.dismissCurrent());
    await expect(snackbar).toHaveCount(0);
  }
});
