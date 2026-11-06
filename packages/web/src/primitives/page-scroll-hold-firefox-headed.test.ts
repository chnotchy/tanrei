// holdPageScroll() (MDL-2) under Firefox's own classic scroll bar. Headless Firefox under Playwright draws no scroll bar
// (its driver registers `* { scrollbar-width: none !important }` in headless mode only), so this file runs Firefox
// headed, on an X server of its own (`Xvfb`, which CI's Playwright image has), with GTK's overlay scroll bars turned off
// (`widget.gtk.overlay-scrollbars.enabled`): it then draws its classic bar, which takes room (12 px), and the hold keeps
// it as a stable gutter, for the root's box and the window's alike. On Linux only, where Xvfb can be started; elsewhere,
// and in the other engines, the test is skipped (page-scroll-hold.test.ts runs them).
import { spawn } from 'node:child_process';
import { expect, test as base } from '@playwright/test';
import { NONE, WINDOW, expectNothingMoved, expectNothingMovesOnRelease, holdAndRelease, mount, resizeWhileHeld } from '../../test/page-scroll-hold.js';

/** Firefox headed on its own X display: `display` is that display, or undefined where none can be had. */
const test = base.extend<object, { display: string | undefined }>({
  display: [
    async ({ browserName }, use) => {
      if (browserName !== 'firefox' || process.platform !== 'linux') return use(undefined);
      // -displayfd: the server picks a free display and writes its number once it accepts clients.
      const server = spawn('Xvfb', ['-displayfd', '1', '-screen', '0', '1280x1024x24', '-nolisten', 'tcp'], { stdio: ['ignore', 'pipe', 'ignore'] });
      const display = await new Promise<string | undefined>((resolve) => {
        server.once('error', () => resolve(undefined));
        server.once('exit', () => resolve(undefined));
        server.stdout.once('data', (data) => resolve(`:${String(data).trim()}`));
      });
      await use(display);
      server.kill();
    },
    { scope: 'worker' },
  ],
  headless: [async ({ display }, use) => use(display === undefined), { scope: 'worker' }],
  launchOptions: [
    async ({ display }, use) =>
      use(display === undefined ? {} : { env: { ...process.env, DISPLAY: display }, firefoxUserPrefs: { 'widget.gtk.overlay-scrollbars.enabled': false } }),
    { scope: 'worker' },
  ],
});

test('MDL-2: holding the page’s scroll moves nothing behind sideways — under Firefox’s classic scroll bar, which takes room', async ({ page, display }) => {
  test.skip(display === undefined, 'Firefox on Linux with Xvfb only: elsewhere, headless Firefox draws no scroll bar (see the head of this file)');
  const host = await mount(page, '');
  const seen = await holdAndRelease(page, host);
  expect(seen.before.bar, 'Firefox’s classic bar takes room').toBeGreaterThan(0);
  expectNothingMoved(seen, NONE);
});

// A page 700 px tall draws a bar in a window 480 px tall and none in one 1000 px tall (see page-scroll-hold.test.ts).
const TALL = { width: WINDOW.width, height: 1000 };
const RESIZES = [
  { way: 'shorter, so that the bar comes back once released', from: TALL, to: WINDOW, bar: true },
  { way: 'taller, so that no bar comes back once released', from: WINDOW, to: TALL, bar: false },
];

for (const { way, from, to, bar } of RESIZES) {
  test(`MDL-2: the window made ${way}, while the scroll is held, under Firefox’s classic scroll bar: the hold measures the room again, and nothing behind moves as it lets go`, async ({ page, display }) => {
    test.skip(display === undefined, 'Firefox on Linux with Xvfb only: elsewhere, headless Firefox draws no scroll bar (see the head of this file)');
    const host = await mount(page, '', { height: 700, viewport: from });
    const seen = await resizeWhileHeld(page, host, to);
    expect(seen.after.bar > 0, `Firefox’s classic bar takes room in the resized window: ${bar} (it takes ${seen.after.bar} px)`).toBe(bar);
    expectNothingMovesOnRelease(seen, NONE);
  });
}
