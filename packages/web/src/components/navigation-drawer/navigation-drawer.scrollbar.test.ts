// <tanrei-navigation-drawer> over the content under a scroll bar that takes room in the window
// (specs/navigation-drawer.spec.json, NVD-97): the room over the content — the window from where the drawer starts, less
// sys.target.touch — is taken from the window as the page has it, less such a bar, never from `100vw`, which counts it.
// The panel is held to its containing block, the window exactly, so a room taken from `100vw` laid the rows out a bar's
// width wider than the panel, and their ends (a trailing text, the end of the active indicator) were cut there. Every
// length is read back from the tokens.
//
// A file of its own because the engines must draw their scroll bars for the whole file (`launchOptions` is a worker's
// option, which Playwright takes only at the top of a file); what each engine does with a bar while a modal surface holds
// the page's scroll is said at the head of src/primitives/page-scroll-hold.test.ts:
// - Chromium: Playwright launches headless Chromium with `--hide-scrollbars`; this file takes that switch away. A bar
//   styled with `::-webkit-scrollbar` then takes its width in every OS. On Linux (CI's container) Chromium keeps a gutter
//   of its width while the scroll is held, so the window stays that much narrower than `100vw` while the drawer is open;
//   on macOS it pads the root instead, and the window widens while the scroll is held and narrows again as the drawer
//   leaves, when the hold gives the bar back during its slide out.
// - WebKit: a styled bar takes its width; WebKit pads the root as Chromium on macOS does: the slide out is drawn with the
//   bar back.
// - Firefox: headless Firefox under Playwright draws no scroll bar (its driver's sheet sets `scrollbar-width: none`) and
//   has no `::-webkit-scrollbar`, so the window is never narrower than `100vw` there: skipped, with that reason.
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, loadSpec, mountFixtures, resolveToken } from '../../../test/harness.js';
import { sampleFrames } from '../../../test/frames.js';
import { motionEnded } from '../../../test/motions.js';
import { DRAWN_BARS, STYLED_BAR } from '../../../test/page-scroll-hold.js';

// A worker-scoped option: the whole file.
test.use({ launchOptions: DRAWN_BARS });

const spec = loadSpec('navigation-drawer');
type P = Page;
const T = (name: string) => `--tanrei-comp-navigation-drawer-${name}`;
const d = (value: string, label: string, icon: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'destination', props: { value, label, icon, ...props } });
const MAIL = [d('inbox', 'Inbox', 'inbox', { trailingText: '24' }), d('sent', 'Sent', 'send'), d('drafts', 'Drafts', 'draft'), d('trash', 'Trash', 'delete')];
const MODAL: Fixture = { id: 'm', props: { variant: 'modal', open: false, value: 'inbox', label: 'Mail' }, items: MAIL };
const drawer = (page: P) => page.locator('[data-fixture="m"] tanrei-navigation-drawer');
const setOpen = (page: P, open: boolean) =>
  drawer(page).evaluate(async (el, o) => {
    const host = el as unknown as { open: boolean; updateComplete: Promise<unknown> };
    host.open = o;
    await host.updateComplete;
  }, open);

/**
 * The dialog and its rows as one frame paints them, while the dialog is drawn (open, or sliding out in the top layer),
 * and the window's width as the page has it then: the window less a scroll bar that takes room in it.
 */
const look = (root: Element) => {
  const host = root.querySelector('tanrei-navigation-drawer')!;
  const dialog = host.shadowRoot!.querySelector('dialog');
  if (!dialog || !dialog.getClientRects().length) return {};
  const box = dialog.getBoundingClientRect();
  const tenth = (n: number) => Math.round(n * 10) / 10;
  const rows = [...host.querySelectorAll('tanrei-navigation-drawer-item')].map((item) => item.shadowRoot!.querySelector('.row > .container')!.getBoundingClientRect());
  return {
    window: document.documentElement.clientWidth,
    width: tenth(box.width),
    left: tenth(box.left),
    // Every row's width, and how far the widest reaches past the dialog's content box at either side.
    rows: rows.map((row) => tenth(row.width)).join(' '),
    rowLeft: tenth(Math.min(...rows.map((row) => row.left)) - box.left),
    rowRight: tenth(box.right - Math.max(...rows.map((row) => row.right))),
  };
};

for (const dir of ['ltr', 'rtl'] as const) {
  test(`NVD-97, NVD-19, NVD-22: under a scroll bar that takes room in the window (${dir}), a modal drawer in a window narrower than container.width, sys.target.touch and the bar together lays its rows out at its own width — open, and in every frame of its slide out, as the page’s scroll is given back and the bar with it — every row inside the drawer, never cut by the bar’s width, and the strip of scrim beside its end edge at least a touch target wide`, async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'headless Firefox draws no scroll bar and has no ::-webkit-scrollbar (see the head of this file)');
    // 270 less the bar (10) less the touch target (36) is 224, narrower than container.width (240); 270 less 36 is not.
    // Taller than the drawer's stage (560): the page has no scroll bar until the bar's style is in it (WebKit keeps the
    // overlay bar it drew before the style came).
    await page.setViewportSize({ width: 270, height: 640 });
    await mountFixtures(page, spec, { icons: true, fixtures: [MODAL], dir });
    await page.evaluate((bar) => {
      document.head.insertAdjacentHTML('beforeend', `<style>${bar}</style>`);
      document.body.insertAdjacentHTML('beforeend', '<div style="block-size: 3000px"></div>');
    }, STYLED_BAR);
    const [touch, full, pad] = [await resolveToken(page, '--tanrei-sys-target-touch'), await resolveToken(page, T('container-width')), await resolveToken(page, T('container-padding-inline'))];
    await expect.poll(() => page.evaluate(() => window.innerWidth - document.documentElement.clientWidth), 'the styled bar takes its width').toBe(10);
    expect(270 - 10 - touch).toBeLessThan(full);
    /**
     * What a frame must show: the drawer as wide as the room the window leaves (at the window's start edge, where it
     * rests), its rows its width less its paddings, every row inside it.
     */
    const expectRoom = (p: Record<string, unknown>, what: string, { resting }: { resting: boolean }) => {
      const room = Math.min(full, Number(p.window) - touch);
      expect(p.width, `${what}: as wide as the window less the touch target`).toBe(room);
      if (resting) expect(p.left, `${what}: at the window’s start edge`).toBe(dir === 'rtl' ? Number(p.window) - room : 0);
      expect(p.rows, `${what}: the rows laid out at its width`).toBe(Array.from({ length: MAIL.length }, () => room - 2 * pad).join(' '));
      expect([p.rowLeft, p.rowRight], `${what}: every row inside the drawer`).toEqual([pad, pad]);
    };
    await setOpen(page, true);
    await motionEnded(page);
    expectRoom(await page.locator('[data-fixture="m"]').evaluate(look), 'open', { resting: true });
    const closing = await sampleFrames(page.locator('[data-fixture="m"]'), () => setOpen(page, false), { probe: look, elements: false });
    expect(closing.complete).toBe(true);
    const drawn = closing.frames.filter((f) => f.probe.width !== undefined);
    expect(drawn.length, 'the slide out is drawn').toBeGreaterThan(2);
    // The width is the drawer's while it slides out, however much of it is still in the window.
    for (const f of drawn) expectRoom(f.probe, `frame ${f.index}`, { resting: false });
    // The page given back, the bar is back: the room is the window less the bar.
    expect(Number(drawn[drawn.length - 1].probe.window), 'the bar is back as it slides out').toBe(260);
  });
}
