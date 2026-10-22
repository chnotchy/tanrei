// The site's header as it is drawn (components/frame/Header.astro): the bar holds the actions of one arrangement, the
// one of the window's class, and never more than the three a bar holds (APB-13); and the actions of the wide
// arrangement stand on one line, the theme's select with its box's top and bottom where the search trigger has its.
// A production build reports nothing (APB-13 is a debug report), so what the report is about is asked of the bar.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { serveDist } from './host.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

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

const PAGE = '/foundations/accessibility/';
const WIDE = { width: 1440, height: 800 };
const COMPACT = { width: 390, height: 800 };

/** The bar's actions as the bar sees them: what its `actions` slot holds, and the arrangement items it does not. */
const actions = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector('tanrei-app-bar.docs-app-bar');
    const held = bar.shadowRoot.querySelector('slot[name="actions"]').assignedElements();
    const name = (element) => element.id || element.className;
    return {
      windowClass: bar.closest('tanrei-app-shell').getAttribute('data-window-class'),
      held: held.map(name),
      drawn: held.filter((element) => element.getBoundingClientRect().width > 0).map(name),
      left: [...bar.querySelectorAll(':scope > .docs-wide-only, :scope > .docs-compact-only')].filter((element) => !held.includes(element)).map(name),
    };
  });

/**
 * Settled: the elements defined, the fonts in, and a frame drawn after both. The search is defined on its first use
 * (components/frame/Search.astro): a pointer over its trigger defines it, as a reader's would.
 */
const settled = async (page) => {
  await page.hover('tanrei-search.docs-search');
  await page.evaluate(async () => {
    await Promise.all(['tanrei-app-shell', 'tanrei-app-bar', 'tanrei-select', 'tanrei-button', 'tanrei-search'].map((tag) => customElements.whenDefined(tag)));
    await document.querySelector('tanrei-search.docs-search').updateComplete;
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
};

/** The class the shell has decided, once it is the one asked for. */
const windowClass = (page, compact) => page.waitForFunction((compact) => (document.querySelector('tanrei-app-shell')?.getAttribute('data-window-class') === 'compact') === compact, compact);

describe('the header’s actions', () => {
  test('a wide window: the bar holds the search, the theme’s select and the language’s button, and not the compact button', async () => {
    const page = await browser.newPage({ viewport: WIDE });
    await page.goto(`${origin}${PAGE}`);
    await settled(page);
    const seen = await actions(page);
    assert.notEqual(seen.windowClass, 'compact');
    assert.deepEqual(seen.held, ['docs-search', 'docs-theme docs-wide-only', 'docs-language']);
    assert.deepEqual(seen.drawn, seen.held);
    assert.deepEqual(seen.left, ['docs-more']);
    await page.close();
  });

  test('a compact window: the bar holds the search and the one button of the theme and the language', async () => {
    const page = await browser.newPage({ viewport: COMPACT });
    await page.goto(`${origin}${PAGE}`);
    await settled(page);
    const seen = await actions(page);
    assert.equal(seen.windowClass, 'compact');
    assert.deepEqual(seen.held, ['docs-search', 'docs-more']);
    assert.deepEqual(seen.drawn, seen.held);
    assert.deepEqual(seen.left, ['docs-theme docs-wide-only', 'docs-language']);
    await page.close();
  });

  test('a window that changes its class changes the arrangement the bar holds, each way', async () => {
    const page = await browser.newPage({ viewport: WIDE });
    await page.goto(`${origin}${PAGE}`);
    await settled(page);
    await page.setViewportSize(COMPACT);
    await windowClass(page, true);
    assert.deepEqual((await actions(page)).held, ['docs-search', 'docs-more']);
    await page.setViewportSize(WIDE);
    await windowClass(page, false);
    assert.deepEqual((await actions(page)).held, ['docs-search', 'docs-theme docs-wide-only', 'docs-language']);
    await page.close();
  });

  test('the theme’s select stands where the search trigger stands: the same top and bottom', async () => {
    for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: WIDE, colorScheme });
      await page.goto(`${origin}${PAGE}`);
      await settled(page);
      const [trigger, select] = await page.evaluate(() =>
        ['tanrei-search.docs-search', 'tanrei-select.docs-theme'].map((selector) => {
          const box = document.querySelector(selector).shadowRoot.querySelector('[part~="container"]').getBoundingClientRect();
          return { top: box.top, bottom: box.bottom };
        }),
      );
      assert.ok(Math.abs(select.top - trigger.top) < 0.5 && Math.abs(select.bottom - trigger.bottom) < 0.5, `${colorScheme}: the select's box ${JSON.stringify(select)}, the trigger's ${JSON.stringify(trigger)}`);
      await page.close();
    }
  });
});
