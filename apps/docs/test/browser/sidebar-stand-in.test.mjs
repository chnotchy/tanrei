// The sidebar before its navigation drawer is defined (styles/frame.css) holds what the drawer will draw: the "All
// components" switch first in its list, and every row of the sidebar where the drawer's row will be — so that nothing
// in the sidebar moves when the drawer is defined. The drawer has no header (its menu button is the app bar's). In the
// six languages (the switch's label takes one line in some and two in others), at a desktop's width (the sidebar
// beside the content) and a medium window's (the column of the groups' glyphs, drawn only once the drawer is defined,
// which draws neither the switch nor a row before it is). At a phone's width the drawer presents itself over the
// content and nothing stands in for it.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// The page is loaded twice: once with every script refused (the elements are never defined: what a reader sees
// before they are), and once as it is, until the drawer and the switch are defined.
// It reads `dist/` and serves it on a free port the way the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { watchNetwork } from './network-quiet.mjs';
import { serveDist } from './host.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

/** A component page in each of the six languages. */
const PAGES = ['/components/switch/', '/es/components/button/', '/ja/components/button/', '/ar/components/chip/', '/hi/components/switch/', '/zh-cn/components/chip/'];
/** A desktop's width, and a medium window's. */
const WIDTHS = [1440, 1000];
/** How far apart, in CSS pixels, a stand-in's box and the drawn box may be: what rounding to the device pixel moves. */
const ROUNDING = 0.5;

let host;
let origin;
let browser;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await host?.close();
});

/** In the page: the box of the sidebar's switch and the tops of its first top-level rows that are drawn. */
function boxes() {
  const drawer = document.querySelector('tanrei-navigation-drawer.docs-sidebar');
  const box = (element) => {
    if (!element) return null;
    const { x, y, width, height } = element.getBoundingClientRect();
    return width || height ? { x, y, width, height } : null;
  };
  const rows = [...drawer.querySelectorAll(':scope > :is(tanrei-navigation-drawer-group, tanrei-navigation-drawer-item)')]
    .map((row) => row.getBoundingClientRect())
    .filter(({ height }) => height > 0)
    .slice(0, 6)
    .map(({ y }) => y);
  return {
    switch: box(drawer.querySelector(':scope > .docs-listing-row > .docs-listing')),
    rows,
  };
}

async function measure(width, url, scripts) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    if (!scripts) await page.route(/\.m?js(\?|$)/, (route) => route.abort());
    const network = await watchNetwork(page);
    await page.goto(origin + url, { waitUntil: 'load' });
    await network.quiet();
    if (scripts) await page.waitForFunction(() => ['tanrei-navigation-drawer', 'tanrei-switch'].every((name) => customElements.get(name)));
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (!scripts) assert.equal(await page.evaluate(() => !!customElements.get('tanrei-navigation-drawer')), false, 'the drawer is not defined while its script is refused');
    return await page.evaluate(boxes);
  } finally {
    await context.close();
  }
}

const near = (a, b) => Math.abs(a - b) <= ROUNDING;

for (const width of WIDTHS) {
  describe(`the sidebar before its drawer is defined, at ${width} px`, { concurrency: 2 }, () => {
    for (const url of PAGES) {
      test(`${url}: the switch and the rows are where the drawer draws them`, async () => {
        const standIn = await measure(width, url, false);
        const drawn = await measure(width, url, true);
        // In a medium window the column holds the groups' glyphs only once the drawer is defined: nothing stands in, and
        // the collapsed drawer draws no switch.
        if (width === 1000) {
          assert.equal(drawn.switch, null, 'a collapsed drawer draws no switch');
          assert.equal(standIn.switch, null);
          return assert.deepEqual(standIn.rows, []);
        }
        for (const part of ['switch']) {
          assert.ok(drawn[part], `the drawn ${part} has a box`);
          assert.ok(standIn[part], `the ${part} holds its room before the drawer is defined`);
          for (const side of ['x', 'y', 'width', 'height']) {
            assert.ok(near(standIn[part][side], drawn[part][side]), `${part} ${side}: ${standIn[part][side]} before the drawer is defined, ${drawn[part][side]} once it is`);
          }
        }
        assert.ok(standIn.rows.length > 0, 'rows stand in for the drawer\'s');
        standIn.rows.forEach((y, index) => assert.ok(near(y, drawn.rows[index]), `row ${index + 1}: top ${y} before the drawer is defined, ${drawn.rows[index]} once it is`));
      });
    }
  });
}
