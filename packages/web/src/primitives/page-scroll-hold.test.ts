// holdPageScroll() (src/primitives/modal.ts, MDL-2: "keep the content behind it from scrolling without moving it — where
// a scroll bar takes room, that room stays while the scroll is held"), through the dialog: every modal surface holds the
// page with the same call. A page taller than its window draws a scroll bar; opening the dialog takes it away (the root's
// `overflow: hidden`), and where it took room, nothing behind may move sideways: the room stays as a stable gutter where
// the engine keeps one, or as padding as wide as the bar on its side where it does not. Only the gutter keeps the window's
// own width (what a `position: fixed` bar across the page is laid out in); padding keeps the page's content in place and
// not that, so a fixed element moves by the bar's width in an engine that keeps no gutter (WebKit, Chromium on macOS
// under a styled bar) — the one thing the hold cannot keep there, and not asked of it below.
//
// The bars are the engines' own, so this file asks each engine to draw them as it would for a person:
// - Chromium: Playwright launches headless Chromium with `--hide-scrollbars`, which draws no bar at all; this file
//   takes that switch away. Chromium then draws its classic bar on Linux, as on Windows (15 px; the gutter branch), and
//   an overlay bar on macOS (no room, nothing to keep). A bar styled with `::-webkit-scrollbar` takes room in every OS:
//   Chromium keeps a gutter of its width on Linux, and none on macOS (the padding branch).
// - WebKit: Playwright's builds draw overlay bars on Linux and macOS; a styled bar takes room, and WebKit keeps no
//   gutter for it (the padding branch).
// - Firefox: headless Firefox under Playwright draws no scroll bar on any OS — its driver registers a user-agent sheet,
//   `* { scrollbar-width: none !important }`, which no page or preference can undo — and it has no `::-webkit-scrollbar`.
//   It is held to "nothing written but the overflow" here; a bar that takes room in Firefox is tested by nothing.
import { type Locator, type Page, expect, test } from '@playwright/test';
import { fixtureHost, loadSpec, mountFixtures } from '../../test/harness.js';
import { motionEnded } from '../../test/motions.js';

// The engines' own scroll bars, not Playwright's headless Chromium without them (a worker-scoped option: the whole file).
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const SPEC = loadSpec('dialog');
const FIXTURE = 'basic';

type Dialog = HTMLElement & { open: boolean; updateComplete: Promise<unknown> };

/** The dialog, closed, on a page taller than its window, with a scroll bar styled as `bar` asks (or the engine's own). */
async function mount(page: Page, bar: string): Promise<Locator> {
  await page.setViewportSize({ width: 640, height: 480 });
  const fixture = SPEC.fixtures.find((f) => f.id === FIXTURE)!;
  await mountFixtures(page, SPEC, { icons: true, fixtures: [{ ...fixture, props: { ...fixture.props, open: false } }] });
  await page.evaluate((bar) => {
    if (bar) document.head.insertAdjacentHTML('beforeend', `<style>${bar}</style>`);
    document.body.insertAdjacentHTML('beforeend', '<div id="tall" style="block-size: 3000px"></div><div id="fixed" style="position: fixed; inset-inline: 0; inset-block-start: 0; block-size: 8px"></div>');
  }, bar);
  return fixtureHost(page, SPEC, FIXTURE);
}

/**
 * Where the page's content stands, where a fixed bar across the window stands, how much room the root's scroll bar
 * takes, and what the root's inline style says.
 */
const place = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const box = document.getElementById('tall')!.getBoundingClientRect();
    const fixed = document.getElementById('fixed')!.getBoundingClientRect();
    return { x: box.x, width: box.width, fixed: { x: fixed.x, width: fixed.width }, bar: window.innerWidth - root.clientWidth, style: root.style.cssText };
  });

const toggle = (host: Locator, open: boolean) =>
  host.evaluate(async (el: Dialog, open) => {
    el.open = open;
    await el.updateComplete;
  }, open);

/** Opens the dialog and closes it again; where the content stood before, while it was open, and after. */
async function holdAndRelease(page: Page, host: Locator) {
  const before = await place(page);
  await toggle(host, true);
  await expect.poll(() => host.evaluate((el) => !!el.shadowRoot!.querySelector('dialog')?.matches(':modal'))).toBe(true);
  await motionEnded(host);
  const held = await place(page);
  await toggle(host, false);
  await motionEnded(host);
  const after = await place(page);
  return { before, held, after };
}

/** Nothing moved; and where the engine keeps a gutter for the bar (`gutter`), the window's width did not change either. */
function expectNothingMoved({ before, held, after }: Awaited<ReturnType<typeof holdAndRelease>>, gutter: boolean) {
  expect(held.style, 'the root’s scroll is held').toContain('overflow: hidden');
  expect({ x: held.x, width: held.width }, `nothing behind moves sideways while the scroll is held (a bar ${before.bar} px wide before; the root: ${held.style})`).toEqual({ x: before.x, width: before.width });
  if (gutter) expect(held.fixed, `the window keeps its width: the bar’s room is a gutter (the root: ${held.style})`).toEqual(before.fixed);
  // Where no bar takes room, the hold writes nothing on the root but its overflow: a stable gutter there would make room
  // for a bar that is not drawn, and move the page.
  if (before.bar === 0) expect(held.style, 'no bar took room: nothing is written but the overflow').toBe('overflow: hidden;');
  expect(after, 'closed, the root is as it was').toEqual(before);
}

test('MDL-2: holding the page’s scroll moves nothing behind sideways — under the engine’s own scroll bar, which takes room where it is a classic one', async ({ page, browserName }) => {
  const host = await mount(page, '');
  const seen = await holdAndRelease(page, host);
  // Chromium's own bar is a classic one off macOS: the hold must keep its room (by a stable gutter). Every other engine
  // here draws an overlay bar or none.
  const classic = browserName === 'chromium' && process.platform !== 'darwin';
  expect(seen.before.bar > 0, `the engine’s bar takes room: ${classic} (it takes ${seen.before.bar} px)`).toBe(classic);
  expectNothingMoved(seen, classic);
});

test('MDL-2: holding the page’s scroll moves nothing behind sideways — under a bar styled with ::-webkit-scrollbar, which takes its own width', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no ::-webkit-scrollbar, and draws no scroll bar headless (see the head of this file)');
  // 10 px: not the 15 px of a classic bar, so that room kept at the engine's own width, not the bar's, shows.
  const host = await mount(page, '::-webkit-scrollbar { width: 10px; background: Canvas; } ::-webkit-scrollbar-thumb { background: CanvasText; }');
  const seen = await holdAndRelease(page, host);
  expect(seen.before.bar, 'the styled bar takes its width').toBe(10);
  // Chromium keeps a gutter of the styled bar's width off macOS; WebKit, and Chromium on macOS, keep none (padding).
  expectNothingMoved(seen, browserName === 'chromium' && process.platform !== 'darwin');
});
