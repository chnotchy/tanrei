// holdPageScroll() (src/primitives/modal.ts, MDL-2: "keep the content behind it from scrolling without moving it — where
// a scroll bar takes room, that room stays while the scroll is held"), through the dialog: every modal surface holds the
// page with the same call. A page taller than its window draws a scroll bar; opening the dialog takes it away (the root's
// `overflow: hidden`), and where it took room, nothing behind may move sideways: the room stays as a stable gutter where
// the engine keeps one, or as padding as wide as the bar on its side where it does not.
//
// What is placed against the window (`position: fixed`, the top layer) is laid out in the window's own box, which the
// padding does not keep: where the engine keeps no gutter, the window widens by the bar's width while the scroll is held
// (WebKit under a styled bar; Chromium under one on an overlay-bar system — macOS by default). The hold then writes the
// room gained on each side on the root, `--tanrei-scroll-hold-inset-left` and `-right`, and an element that adds them to
// its insets stays where it was (MDL-2: "WHERE the platform cannot keep that room for what is placed against the
// window"). Each page here holds two bars fixed across the window (test/page-scroll-hold.ts): one at insets of 0, which
// moves by exactly what the hold wrote and no more, and one at the hold's insets, which never moves.
//
// The bars are the engines' own, so each file asks its engines to draw them as they would for a person:
// - Chromium: Playwright launches headless Chromium with `--hide-scrollbars`, which draws no bar at all; these files
//   take that switch away. Chromium then draws its classic bar on Linux, as on Windows (15 px; the gutter branch), and
//   an overlay bar on macOS (no room, nothing to keep). A bar styled with `::-webkit-scrollbar` takes room in every OS:
//   Chromium keeps a gutter of its width on Linux, and none on macOS (the padding branch, and the window widens).
//   page-scroll-hold-overlay-bars.test.ts asks Chromium for macOS's overlay bars in any OS, so that the branch where the
//   window widens runs on Linux too.
// - WebKit: Playwright's builds draw overlay bars on Linux and macOS; a styled bar takes room, and WebKit keeps no
//   gutter for it (the padding branch, and the window widens).
// - Firefox: headless Firefox under Playwright draws no scroll bar on any OS — its driver registers a user-agent sheet,
//   `* { scrollbar-width: none !important }`, in headless mode only — and it has no `::-webkit-scrollbar`. Headless, it
//   is held to "nothing written but the overflow" here; a bar that takes room in Firefox is tested by nothing.
import { expect, test } from '@playwright/test';
import { DRAWN_BARS, NONE, STYLED_BAR, expectNothingMoved, holdAndRelease, mount } from '../../test/page-scroll-hold.js';

// A worker-scoped option: the whole file.
test.use({ launchOptions: DRAWN_BARS });

test('MDL-2: holding the page’s scroll moves nothing behind sideways — under the engine’s own scroll bar, which takes room where it is a classic one', async ({ page, browserName }) => {
  const host = await mount(page, '');
  const seen = await holdAndRelease(page, host);
  // Chromium's own bar is a classic one off macOS: the hold must keep its room (by a stable gutter, which keeps the
  // window's own box too). Every other engine here draws an overlay bar or none.
  const classic = browserName === 'chromium' && process.platform !== 'darwin';
  expect(seen.before.bar > 0, `the engine’s bar takes room: ${classic} (it takes ${seen.before.bar} px)`).toBe(classic);
  expectNothingMoved(seen, NONE);
});

test('MDL-2: holding the page’s scroll moves nothing behind sideways — under a bar styled with ::-webkit-scrollbar, which takes its own width; what is fixed to the window stays where it reads the hold’s insets', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no ::-webkit-scrollbar, and draws no scroll bar headless (see the head of this file)');
  const host = await mount(page, STYLED_BAR);
  const seen = await holdAndRelease(page, host);
  expect(seen.before.bar, 'the styled bar takes its width').toBe(10);
  // Chromium keeps a gutter of the styled bar's width off macOS, for the root and the window alike; WebKit, and Chromium
  // on macOS, keep none: the root is padded, and the window gains the bar's room on its right.
  const gutter = browserName === 'chromium' && process.platform !== 'darwin';
  expectNothingMoved(seen, gutter ? NONE : { left: '', right: '10px' });
});
