// <tanrei-app-shell> under a scrollbar that takes room in the window (specs/app-shell.spec.json, APS-5): the room the
// row leaves the navigation is taken from the window as the page has it — the root element's content width, which the
// element measures — never from `100vw`, which counts a scrollbar that takes room in the window (a classic one: Windows,
// most Linux desktops, or the gutter `scrollbar-gutter: stable` keeps) as room of the row's. Every length is read back
// from the tokens.
//
// A file of its own because the engines must draw their scrollbars for the whole file (`launchOptions` is a worker's
// option, which Playwright takes only at the top of a file):
// - Chromium: Playwright launches headless Chromium with `--hide-scrollbars`, which draws no bar at all; this file takes
//   that switch away. A bar styled with `::-webkit-scrollbar` then takes its width in every OS, as a classic one does.
// - WebKit: a styled bar takes its width in every OS too.
// - Firefox: headless Firefox under Playwright draws no scrollbar (its driver's sheet sets `scrollbar-width: none`) and
//   has no `::-webkit-scrollbar`. A root narrower than the window by a margin of its own takes the same path — the
//   root's content width is not `100vw` — and runs in every engine, Firefox included.
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveToken } from '../../../test/harness.js';
import { DRAWN_BARS, STYLED_BAR } from '../../../test/page-scroll-hold.js';

// A worker-scoped option: the whole file.
test.use({ launchOptions: DRAWN_BARS });

const spec = loadSpec('app-shell');
type P = Page;
const T = (name: string) => `--tanrei-comp-app-shell-${name}`;
const WINDOW = { width: 1280, height: 800 } as const;

const shell = (page: P) => page.locator('tanrei-app-shell').first();
const drawer = (page: P) => page.locator('tanrei-app-shell > tanrei-navigation-drawer').first();
const main = (page: P) => page.locator('tanrei-app-shell > main').first();
const aside = (page: P) => page.locator('tanrei-app-shell > [slot="aside"]').first();
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width };
  });
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
const frame = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

/** A frame whose navigation drawer asks for more than any room (its least width 1300), beside an aside. */
const ROW: Fixture = {
  id: 'room-of-the-page',
  props: { asideLabel: 'On this page' },
  content: `<tanrei-navigation-drawer slot="navigation" responsive collapsible min-width="1300" label="Documentation" value="start">
    <tanrei-navigation-drawer-item value="start" href="#main" label="Getting started" icon="home"></tanrei-navigation-drawer-item>
    <tanrei-navigation-drawer-item value="tokens" href="#main" label="Tokens" icon="palette"></tanrei-navigation-drawer-item>
  </tanrei-navigation-drawer>
  <main id="main" tabindex="-1"><p style="margin: 0">Content</p></main>
  <aside slot="aside"><a href="#main">Aside link</a></aside>`,
};

/**
 * APS-5: the room the row leaves the navigation in an expanded window whose page has `width` of it — that width less
 * the main region's least width (its start inset: the gutter, or the target of the drawer's resize handle where that is
 * wider; a touch target; its end inset, the gutter) and less the aside beside it — read from the tokens.
 */
async function navigationRoom(page: P, width: number) {
  const [gutter, reach, touch, asideWidth] = [await resolveToken(page, T('gutter-expanded')), await resolveToken(page, '--tanrei-sys-target-pointer'), await resolveToken(page, '--tanrei-sys-target-touch'), await resolveToken(page, T('aside-width'))];
  return width - asideWidth - (Math.max(gutter, reach) + touch + gutter);
}
/** WCAG 1.4.10, APS-5: the page is no wider than the window — nothing of the frame is pushed past it. */
async function expectNoSidewaysScroll(page: P, what: string) {
  const [wide, window] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(wide, `the document's width, ${what}`).toBeLessThanOrEqual(window);
}

/**
 * APS-5, WCAG 1.4.10: once `css` leaves the page less of the window than `100vw` — a scrollbar that takes room, or a
 * margin of the root's — the navigation is held to the root's content width less the main region's least width and the
 * aside, the main region keeps its least width, and the page is no wider than the window; with `css` taken away, the
 * room follows back to the window's whole width, in the frame it is drawn.
 */
async function expectRoomOfPage(page: P, css: string, { scrollbar }: { scrollbar: boolean }) {
  await page.setViewportSize(WINDOW);
  await mountFixtures(page, spec, { icons: true, fixtures: [ROW] });
  await frame(page);
  expect((await edges(drawer(page))).width, 'the page has the whole window').toBe(await navigationRoom(page, WINDOW.width));
  const style = await page.addStyleTag({ content: css });
  await frame(page);
  const [frameWidth, windowWidth, shown] = await page.evaluate(() => [document.querySelector('tanrei-app-shell')!.getBoundingClientRect().width, window.innerWidth, document.documentElement.clientWidth]);
  expect(frameWidth, 'the frame is narrower than the window').toBeLessThan(windowWidth);
  if (scrollbar) expect(frameWidth, 'the frame is the window less the scrollbar').toBe(shown);
  const room = await navigationRoom(page, frameWidth);
  const asideWidth = await resolveToken(page, T('aside-width'));
  const [nav, content, beside, frameBox] = [await edges(drawer(page)), await edges(main(page)), await edges(aside(page)), await edges(shell(page))];
  near(nav.width, room, 0.01);
  // The main region has its least width: `100vw` took the scrollbar's width, or the root's margin, from it.
  near(content.width, frameWidth - asideWidth - room, 0.01);
  near(content.left, nav.right);
  near(content.right, beside.left);
  near(beside.right, frameBox.right);
  await expectNoSidewaysScroll(page, 'the page with less than the window');
  await style.evaluate((sheet) => sheet.parentNode?.removeChild(sheet));
  await frame(page);
  expect((await edges(drawer(page))).width, 'the page has the whole window again').toBe(await navigationRoom(page, WINDOW.width));
  await expectNoSidewaysScroll(page, 'the page has the whole window again');
}

test('APS-5, WCAG 1.4.10: under a scrollbar that takes room in the window (a classic one) the navigation is held to the window less the scrollbar, less the main region’s least width and the aside — not to 100vw, which counts the scrollbar — so that the main region keeps its least width and the page never scrolls sideways; the room follows when the scrollbar goes', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'headless Firefox draws no scrollbar and has no ::-webkit-scrollbar (see the head of this file); the root with a margin covers the same path there');
  await expectRoomOfPage(page, `html { overflow-y: scroll } ${STYLED_BAR}`, { scrollbar: true });
});

test('APS-5, WCAG 1.4.10: where the root leaves the page less of the window than 100vw (a margin of its own) the navigation is held to the root’s content width less the main region’s least width and the aside, so that the main region keeps its least width and the page never scrolls sideways; the room follows when the margin goes', async ({ page }) => {
  // The same path as a scrollbar's, in every engine: the root's content width is not the window's.
  await expectRoomOfPage(page, 'html { margin-inline-end: 120px }', { scrollbar: false });
});
