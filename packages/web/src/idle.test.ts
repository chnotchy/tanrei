// At rest a component costs nothing: once its fixtures are drawn and nothing moves, no script runs each frame and
// nothing is laid out. A component that keeps a `requestAnimationFrame` loop going, or animates a property that has to
// be laid out, costs a page a share of a core for as long as it is on it — and a gallery of them a whole one. What moves by design is moved by the compositor (an indeterminate
// indicator's transform), which this does not count.
//
// Chromium only: the layout count is read over the DevTools protocol.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, type Spec, fixtureHost, loadSpec, mountFixtures } from '../test/harness.js';
import { motionEnded } from '../test/motions.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(repo, 'specs/inventory.json'), 'utf8')) as { components: { name: string }[] };
/** Every component that has a spec and an element here (a spec accepted ahead of its implementation has no element to mount). */
const specs: Spec[] = inventory.components
  .filter((c) => fs.existsSync(path.join(repo, `specs/${c.name}.spec.json`)) && fs.existsSync(path.join(repo, `packages/web/src/components/${c.name}`)))
  .map((c) => loadSpec(c.name));

/** A fixture that moves by itself, by design: a carousel that autoplays advances and, with its progress drawn, fills a dot. */
const moves = (spec: Spec, fixture: Fixture) => spec.name === 'carousel' && fixture.props.autoplay === true;

/**
 * Frame callbacks asked for and layouts done over `ms`, once every motion the page began as it was drawn has ended and
 * the page has had `settle` ms more to draw itself (a fixed wait alone counted the frames of an entrance still running
 * where motion ran slower than the wait).
 */
async function atRest(page: Page, { settle = 1500, ms = 600 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number };
    w.__frames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => (w.__frames++, raf(callback));
  });
  await motionEnded(page);
  await page.waitForTimeout(settle);
  const read = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return { frames: await page.evaluate(() => (window as unknown as { __frames: number }).__frames), layouts: metrics.find((m) => m.name === 'LayoutCount')!.value };
  };
  const [before] = [await read(), await page.waitForTimeout(ms)];
  const after = await read();
  await cdp.detach();
  return { frames: after.frames - before.frames, layouts: after.layouts - before.layouts };
}

test.describe('at rest', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the layout count is read over the DevTools protocol');

  for (const spec of specs) {
    test(`${spec.name}: its fixtures, drawn and left alone, ask for no frame and lay nothing out`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((fixture) => !moves(spec, fixture)) });
      expect(await atRest(page)).toEqual({ frames: 0, layouts: 0 });
    });
  }

  // What stays on a page for as long as it is open or playing, and so must cost nothing while nothing moves. (What is
  // known to run every frame goes here as `test.fail` saying why: when its cause is removed it passes, which fails the
  // run until the mark is taken off.)
  test('tooltip: an open tooltip follows its anchor by events, and asks for no frame while nothing moves (TIP-9)', async ({ page }) => {
    const spec = loadSpec('tooltip');
    await page.setViewportSize({ width: 320, height: 200 });
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((fixture) => fixture.id === 'plain') });
    expect((await atRest(page)).frames).toBe(0);
  });

  // A table of contents that follows the reader (tracking: auto) on a page it can read: it listens to the view's
  // `scroll`, to `resize` and to the sizes of what holds its targets, and decides in one frame after such an event —
  // never in a frame of its own.
  test('table-of-contents: it follows the reader’s position by scroll and resize events, and asks for no frame and lays nothing out while the page is still (TOC-9, TOC-16)', async ({ page }) => {
    const spec = loadSpec('table-of-contents');
    const list = `<ul>${[1, 2, 3, 4, 5, 6].map((n) => `<li><a href="#s${n}">Section ${n}</a></li>`).join('')}</ul>`;
    await page.setViewportSize({ width: 1000, height: 800 });
    await mountFixtures(page, spec, { fixtures: [{ id: 'reading', props: { label: 'On this page' }, content: list }] });
    await page.evaluate(() => {
      const article = document.createElement('article');
      article.innerHTML = [1, 2, 3, 4, 5, 6].map((n) => `<section style="block-size: 600px"><h2 id="s${n}" style="margin: 0">Section ${n}</h2></section>`).join('');
      document.body.prepend(article);
      (document.querySelector('.stage') as HTMLElement).style.cssText = 'position: fixed; inset: 0 0 auto auto';
    });
    const host = fixtureHost(page, spec, 'reading');
    const current = () => host.evaluate((el) => (el as unknown as { current: string }).current);
    await expect.poll(current).toBe('#s1');
    expect(await atRest(page)).toEqual({ frames: 0, layouts: 0 });
    // …and it still follows: the page scrolled to the third heading makes the third item current.
    await page.evaluate(() => window.scrollTo(0, document.getElementById('s3')!.offsetTop));
    await expect.poll(current).toBe('#s3');
    // Chosen, and held (TOC-12): once the view has arrived, still nothing runs.
    await host.locator('a[href="#s5"]').click();
    await expect.poll(current).toBe('#s5');
    expect((await atRest(page)).frames).toBe(0);
  });

  // A trail that is folded (overflow: collapse): it hears of its width, of a line of its text and of its levels from
  // observers, and measures only then — never in a frame of its own, and never while nothing changes.
  test('breadcrumbs: a folded trail follows its width by a size observer, and asks for no frame and lays nothing out while nothing moves (BRC-9, BRC-12)', async ({ page }) => {
    const spec = loadSpec('breadcrumbs');
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((fixture) => fixture.id === 'long-trail') });
    const host = fixtureHost(page, spec, 'long-trail');
    const out = () => host.evaluate((el) => el.shadowRoot!.querySelectorAll('li.level.out').length);
    await expect.poll(out).toBeGreaterThan(0);
    const folded = await out();
    expect(await atRest(page)).toEqual({ frames: 0, layouts: 0 });
    // …and it still follows: a narrower trail folds more.
    await page.evaluate(() => ((document.querySelector('.stage') as HTMLElement).style.inlineSize = '300px'));
    await expect.poll(out).toBeGreaterThan(folded);
    expect((await atRest(page)).frames).toBe(0);
  });

  // An app shell of real components: it hears of the window's class from two media queries and of the heights it keeps
  // clear from the sizes of its header and its footer — never from a resize listener or a frame of its own.
  test('app-shell: a frame of an app bar, a responsive drawer, an aside and a footer follows the window’s class and measures its header by events, and asks for no frame and lays nothing out while nothing moves (APS-3, APS-17)', async ({ page }) => {
    const spec = loadSpec('app-shell');
    await page.setViewportSize({ width: 1280, height: 800 });
    const regions = `<a class="tanrei-link" data-standalone slot="skip-link" href="#main">Skip to content</a>
      <header slot="header"><tanrei-app-bar headline="Tanrei"><tanrei-button slot="navigation" data-app-shell-menu variant="text" label="Menu"><span slot="icon">menu</span></tanrei-button></tanrei-app-bar></header>
      <tanrei-navigation-drawer slot="navigation" responsive collapsible label="Documentation" value="start"><tanrei-button slot="header-button" variant="text" label="Collapse navigation"><span slot="icon">menu</span></tanrei-button><tanrei-navigation-drawer-item value="start" href="#s1" label="Getting started" icon="home"></tanrei-navigation-drawer-item></tanrei-navigation-drawer>
      <main id="main" tabindex="-1"><tanrei-page-header><h1>Typography</h1><p>Text styles are named by level.</p><div data-part="meta"><span>Foundations</span><span>4 min read</span></div></tanrei-page-header><div style="block-size: 2400px"></div></main>
      <aside slot="aside">On this page</aside>
      <footer slot="footer">Footer</footer>`;
    await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 'real', props: { asideLabel: 'On this page' }, content: regions }] });
    const shell = page.locator('tanrei-app-shell');
    await expect(shell).toHaveAttribute('data-window-class', 'expanded');
    expect(await atRest(page)).toEqual({ frames: 0, layouts: 0 });
    // …and it still follows: a narrower window is another class, and the header's height is still the root's offset.
    await page.setViewportSize({ width: 500, height: 800 });
    await expect(shell).toHaveAttribute('data-window-class', 'compact');
    await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--tanrei-app-shell-scroll-offset'))).toBe('64px');
    expect((await atRest(page)).frames).toBe(0);
    // The page scrolled under the sticky header: nothing of the frame runs each frame.
    await page.evaluate(() => window.scrollTo(0, 900));
    expect((await atRest(page, { settle: 600 })).frames).toBe(0);
  });

  // The other overlays placed against an anchor. Their spec fixtures are drawn in place (the `inline` test attribute), so
  // each is mounted here as the real overlay in the top layer — the fixture a test of its own would write — and left open.
  const fixtureOf = (name: string, id: string) => loadSpec(name).fixtures.find((fixture) => fixture.id === id)!;
  const overlays: { name: string; ids: string; fixture: () => Fixture; open?: boolean; shown: string }[] = [
    { name: 'menu', ids: 'MNU-2', fixture: () => ({ ...fixtureOf('menu', 'actions'), props: { anchor: 'a-menu' } }), open: true, shown: '.surface:popover-open' },
    {
      name: 'menu',
      ids: 'MNU-46',
      fixture: () => ({ ...fixtureOf('menu', 'submenu-open'), props: { anchor: 'a-menu' } }),
      open: true,
      shown: '.surface:popover-open',
    },
    { name: 'fab-menu', ids: 'FBM-13', fixture: () => ({ ...fixtureOf('fab-menu', 'filled-open'), props: { ...fixtureOf('fab-menu', 'filled-open').props, inline: false } }), shown: '.list:popover-open' },
    { name: 'search', ids: 'SRC-7', fixture: () => ({ ...fixtureOf('search', 'docked'), props: { ...fixtureOf('search', 'docked').props, inline: false } }), shown: '.view:popover-open' },
    {
      name: 'date-time-picker',
      ids: 'DTM-2',
      fixture: () => ({ ...fixtureOf('date-time-picker', 'docked-date'), props: { ...fixtureOf('date-time-picker', 'docked-date').props, open: false, anchor: 'a-picker', inline: false } }),
      open: true,
      shown: '.surface:popover-open',
    },
    {
      name: 'popover',
      ids: 'POP-5',
      fixture: () => ({ ...fixtureOf('popover', 'arrow-actions'), props: { ...fixtureOf('popover', 'arrow-actions').props, open: false, anchor: 'a-popover' } }),
      open: true,
      shown: '.surface:popover-open',
    },
    // A select's list: the anchored surface again, as wide as its trigger, with a chosen option scrolled into view.
    { name: 'select', ids: 'SEL-24', fixture: () => ({ ...fixtureOf('select', 'open-many'), props: { ...fixtureOf('select', 'open-many').props, open: false, inline: false } }), open: true, shown: '.surface:popover-open' },
    // A combobox's list: the same surface under an input that keeps focus, filtered rows and a status row's live regions.
    { name: 'combobox', ids: 'CMB-22', fixture: () => ({ ...fixtureOf('combobox', 'open-many'), props: { ...fixtureOf('combobox', 'open-many').props, open: false, inline: false } }), open: true, shown: '.surface:popover-open' },
  ];
  for (const overlay of overlays) {
    test(`${overlay.name}: open in the top layer (${overlay.fixture().id}), it follows its anchor by events and asks for no frame while nothing moves (${overlay.ids})`, async ({ page }) => {
      const spec = loadSpec(overlay.name);
      const fixture = overlay.fixture();
      // Room below the anchor for the overlay after the move too: it is to follow, not to change sides.
      await page.setViewportSize({ width: 1280, height: 1400 });
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture] });
      const host = fixtureHost(page, spec, fixture.id).first();
      if (overlay.open) await host.evaluate((el) => ((el as unknown as { open: boolean }).open = true));
      // It is the real overlay that is measured: shown, in the top layer.
      await expect.poll(() => host.evaluate((el, selector) => !!el.shadowRoot!.querySelector(selector), overlay.shown)).toBe(true);
      expect((await atRest(page)).frames).toBe(0);
      // …and it still follows: the anchor moved by the page, with no event of its own, takes the overlay with it.
      const top = () => host.evaluate((el, selector) => el.shadowRoot!.querySelector(selector)!.getBoundingClientRect().top, overlay.shown);
      const before = await top();
      await page.evaluate(() => document.body.insertAdjacentHTML('afterbegin', '<div data-moved style="block-size: 24px"></div>'));
      await expect.poll(async () => Math.round((await top()) - before)).toBe(24);
    });
  }

  test('carousel: autoplay’s progress is drawn by the browser, and asks for no frame while the interval passes (CRL-36)', async ({ page }) => {
    const spec = loadSpec('carousel');
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((fixture) => fixture.id === 'autoplay-progress') });
    // Out of the way: the pointer holds autoplay while it is over the carousel (CRL-33).
    await page.mouse.move(1200, 700);
    expect((await atRest(page)).frames).toBe(0);
  });
});
