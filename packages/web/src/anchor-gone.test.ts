// An anchored surface whose anchor stops being drawn by the page's own style sheet, with no attribute changed anywhere:
// what an app shell does to its header's controls at a width change (a media query gives the one a window class does
// not show `display: none`), and what a container query does when its container is resized by the page. Each
// component's own test hides its anchor by an inline style — an attribute changed on an ancestor, which the follow
// loop hears as such (src/primitives/follow.ts) — so this is the reach those leave: the anchor goes because the window
// or a container changed size, and the surface hears of it only from that size.
//
//   menu              MNU-65: close, reason anchor-hidden
//   popover           POP-5, POP-21: close, reason anchor-hidden
//   date-time picker  DTM-51 (docked): close, reason anchor-hidden
//   select            SEL-24, SEL-27: the list closed, toggle with the reason anchor-hidden (the anchor is its container)
//   combobox          CMB-22: the same
//   tooltip           TIP-9: it closes (toggle false; a tooltip's toggle carries no reason)
import { type Page, expect, test } from '@playwright/test';
import { loadSpec, mountFixtures } from '../test/harness.js';

const OPTIONS = '<tanrei-option value="a">Alpha</tanrei-option><tanrei-option value="b">Beta</tanrei-option>';

/** Each component, its markup in a wrapper `#w`, the element its surface stands against, and what its close says. */
const SUBJECTS = [
  { name: 'menu', ids: 'MNU-65', anchor: '#a', heard: 'close:anchor-hidden', markup: `<div id="w"><button id="a" type="button">Edit</button></div><tanrei-menu id="s" anchor="a"><tanrei-menu-item label="Cut"></tanrei-menu-item></tanrei-menu>` },
  { name: 'popover', ids: 'POP-5, POP-21', anchor: '#a', heard: 'close:anchor-hidden', markup: `<div id="w"><button id="a" type="button">Storage</button></div><tanrei-popover id="s" anchor="a" label="Storage"><p>Used</p></tanrei-popover>` },
  { name: 'date-time-picker', ids: 'DTM-51', anchor: '#a', heard: 'close:anchor-hidden', markup: `<div id="w"><button id="a" type="button">Date</button></div><tanrei-date-time-picker id="s" presentation="docked" anchor="a" label="Date" value="2026-09-17"></tanrei-date-time-picker>` },
  { name: 'select', ids: 'SEL-24, SEL-27', anchor: '#s', heard: 'toggle:anchor-hidden', markup: `<div id="w"><tanrei-select id="s" label="Letter">${OPTIONS}</tanrei-select></div>` },
  { name: 'combobox', ids: 'CMB-22', anchor: '#s', heard: 'toggle:anchor-hidden', markup: `<div id="w"><tanrei-combobox id="s" label="Letter">${OPTIONS}</tanrei-combobox></div>` },
  { name: 'tooltip', ids: 'TIP-9', anchor: '#a', heard: 'toggle:false', markup: `<div id="w"><tanrei-tooltip id="s" text="Copy"><button id="a" type="button">Copy</button></tanrei-tooltip></div>` },
] as const;

type Overlay = HTMLElement & { open: boolean };

/** The markup on a page of its own, with what the component says logged; a `close` is granted, as a product does. */
async function mount(page: Page, markup: string) {
  await page.setViewportSize({ width: 800, height: 600 });
  await mountFixtures(page, loadSpec('popover'), { icons: true, fixtures: [], reducedMotion: true });
  await page.evaluate((html) => {
    const main = document.querySelector('main') as HTMLElement;
    main.style.display = 'block';
    main.innerHTML = `<div style="padding: 100px">${html}</div>`;
    const log: string[] = [];
    (window as unknown as { log: string[] }).log = log;
    const overlay = document.getElementById('s') as Overlay;
    for (const type of ['close', 'toggle']) {
      overlay.addEventListener(type, (event) => {
        const detail = ((event as CustomEvent).detail ?? {}) as { reason?: string; open?: boolean };
        log.push(`${type}:${detail.reason ?? detail.open}`);
        if (type === 'close') overlay.open = false;
      });
    }
  }, markup);
}

const log = (page: Page) => page.evaluate(() => (window as unknown as { log: string[] }).log);
const isOpen = (page: Page) => page.evaluate(() => (document.getElementById('s') as Overlay).open);
/** Whether a surface of the component stands in the top layer. */
const shown = (page: Page) => page.evaluate(() => [...document.getElementById('s')!.shadowRoot!.querySelectorAll('[popover]')].some((element) => element.matches(':popover-open')));

/** Opened by the product, placed beside its anchor, and nothing heard yet. */
async function openIt(page: Page) {
  await page.evaluate(() => ((document.getElementById('s') as Overlay).open = true));
  await expect.poll(() => shown(page)).toBe(true);
  expect(await log(page)).toEqual([]);
}

async function expectClosed(page: Page, heard: string) {
  await expect.poll(() => log(page)).toEqual([heard]);
  await expect.poll(() => isOpen(page)).toBe(false);
  await expect.poll(() => shown(page)).toBe(false);
  expect(await log(page), 'once').toEqual([heard]);
}

for (const subject of SUBJECTS) {
  test.describe(subject.name, () => {
    test(`${subject.ids}: an anchor that a media query gives display none at a width change — a style sheet's rule, no attribute changed — closes the open surface once`, async ({ page }) => {
      await mount(page, subject.markup);
      await page.addStyleTag({ content: `@media (width < 700px) { ${subject.anchor} { display: none; } }` });
      await openIt(page);
      await page.setViewportSize({ width: 600, height: 600 });
      await expectClosed(page, subject.heard);
    });

    test(`${subject.ids}: an anchor that a container query gives display none as the page resizes its container — no window resize, no attribute changed on an ancestor of the anchor — closes the open surface once`, async ({ page }) => {
      await mount(page, subject.markup);
      // The container is the wrapper, resized by a rule in a sheet added to the page: the anchor's ancestors keep every
      // attribute they had.
      await page.addStyleTag({ content: `#w { container-type: inline-size; } @container (width < 300px) { ${subject.anchor} { display: none; } }` });
      await openIt(page);
      await page.addStyleTag({ content: `#w { inline-size: 200px; }` });
      await expectClosed(page, subject.heard);
    });
  });
}
