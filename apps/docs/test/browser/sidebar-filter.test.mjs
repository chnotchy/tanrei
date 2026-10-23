// The sidebar's filter (components/frame/Sidebar.astro), in each engine: "/" anywhere in the window, outside a field,
// moves focus to the navigation drawer's filter field — beside the content in a wide window, expanding the column of a
// medium one first, and opening the drawer over the content in a compact one — while Command+K and Control+K stay the
// site's search, from the page and from the filter field alike. What is typed narrows the sidebar to the rows whose
// label holds it and the drawer says how many, in the page's language; Escape empties the field, and a second Escape
// gives focus back to where it was. "/" typed in a field (the search's) is a character of that field.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/sidebar-filter.test.mjs   # in one engine (all three by default)
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as playwright from '@playwright/test';
import { serveDist } from './host.mjs';

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = (process.env.DOCS_ENGINES ?? 'chromium,firefox,webkit').split(',').map((name) => name.trim());
let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

const PAGE = '/foundations/accessibility/';
const WIDE = { width: 1440, height: 800 };
const MEDIUM = { width: 1000, height: 800 };
const COMPACT = { width: 390, height: 800 };
const DRAWER = 'tanrei-navigation-drawer.docs-sidebar';

// As header.test.mjs says: every page is sent with Cross-Origin-Opener-Policy, and Playwright's Firefox loses the first
// navigation of a new page into the browsing context group the policy asks for on a busy machine. Nothing here is
// about the policy; the other engines keep it.
const LAUNCH = { firefox: { firefoxUserPrefs: { 'browser.tabs.remote.useCrossOriginOpenerPolicy': false } } };

/** Where focus is, through every shadow root: `filter` when it is in the drawer's filter field. */
const focus = (page) =>
  page.evaluate(() => {
    let element = document.activeElement;
    while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
    const drawer = document.querySelector('tanrei-navigation-drawer.docs-sidebar');
    const field = drawer.shadowRoot?.querySelector('.filter');
    if (element && field && (field === element || field.shadowRoot?.contains(element))) return 'filter';
    const search = document.querySelector('tanrei-search.docs-search');
    if (element && search && (search === element || search.shadowRoot?.contains(element) || search.contains(element))) return 'search';
    return element?.localName ?? null;
  });

/** What the drawer shows of a filter: its text, the top-level rows drawn, the destinations drawn, its status line. */
const filtered = (page) =>
  page.evaluate(() => {
    const drawer = document.querySelector('tanrei-navigation-drawer.docs-sidebar');
    const drawn = (element) => element.getClientRects().length > 0 && !element.hasAttribute('data-filter-hidden');
    return {
      value: drawer.filterValue,
      items: [...drawer.querySelectorAll('tanrei-navigation-drawer-item')].filter(drawn).map((item) => item.getAttribute('label')),
      status: drawer.shadowRoot.querySelector('.filter-status')?.textContent.trim() ?? '',
    };
  });

/** The field's name, hint and keyboard shortcut, read from the input itself. */
const field = (page) =>
  page.evaluate(() => {
    const host = document.querySelector('tanrei-navigation-drawer.docs-sidebar').shadowRoot.querySelector('.filter');
    const input = host.shadowRoot.querySelector('input');
    return { type: input.type, name: input.getAttribute('aria-label') ?? host.getAttribute('label'), placeholder: input.placeholder, keys: input.getAttribute('aria-keyshortcuts') };
  });

for (const engine of ENGINES) {
  describe(`the sidebar's filter in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await playwright[engine].launch(LAUNCH[engine]);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (viewport, url = PAGE) => {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${origin}${url}`);
      await page.evaluate(async () => {
        await Promise.all(['tanrei-app-shell', 'tanrei-navigation-drawer', 'tanrei-text-input'].map((tag) => customElements.whenDefined(tag)));
        await document.querySelector('tanrei-navigation-drawer.docs-sidebar').updateComplete;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      return { context, page, errors };
    };

    test('a wide window: "/" focuses the field, what is typed narrows the sidebar, Escape empties it and then gives focus back', async () => {
      const { context, page, errors } = await open(WIDE);
      try {
        const words = strings('en').sidebarFilter;
        assert.deepEqual(await field(page), { type: 'search', name: words.label, placeholder: words.placeholder, keys: '/' });
        await page.locator('main h1').first().click();
        await page.keyboard.press('/');
        assert.equal(await focus(page), 'filter', '"/" moves focus to the filter field');
        await page.keyboard.type('navigation dr');
        await page.waitForFunction(() => document.querySelector('tanrei-navigation-drawer.docs-sidebar').filterValue === 'navigation dr');
        const seen = await filtered(page);
        assert.deepEqual(seen.items, ['Navigation drawer'], 'only the row whose label holds both words');
        assert.equal(seen.status, words.count.replace('{count}', '1'));
        await page.keyboard.type('zzz');
        assert.equal((await filtered(page)).status, words.none);
        await page.keyboard.press('Escape');
        assert.equal((await filtered(page)).value, '', 'Escape empties the field');
        assert.equal(await focus(page), 'filter', 'and focus stays in it');
        await page.keyboard.press('Escape');
        assert.notEqual(await focus(page), 'filter', 'a second Escape gives focus back');
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    for (const chord of ['Control+k', 'Meta+k']) {
      test(`${chord} stays the search, from the page and from the filter field; "/" in the search's view is the search's`, async () => {
        const { context, page, errors } = await open(WIDE);
        const expanded = (open) => page.waitForFunction((open) => document.querySelector('tanrei-search.docs-search')?.expanded === open, open, { timeout: 15_000 });
        const filterText = () => page.evaluate(() => document.querySelector('tanrei-navigation-drawer.docs-sidebar').filterValue ?? '');
        try {
          await page.keyboard.press(chord);
          await expanded(true);
          await page.waitForFunction(() => document.querySelector('tanrei-search.docs-search').shadowRoot?.activeElement?.localName === 'input');
          await page.keyboard.type('a/b');
          assert.equal(await page.evaluate(() => document.querySelector('tanrei-search.docs-search').shadowRoot.activeElement.value), 'a/b', '"/" is a character of the search');
          // On a result, "/" is the search's too: the drawer behind the view takes nothing.
          for (let typed = 0; typed < 3; typed += 1) await page.keyboard.press('Backspace');
          await page.keyboard.type('button');
          await page.waitForFunction(() => document.querySelector('tanrei-search.docs-search tanrei-search-result-group') !== null, null, { timeout: 15_000 });
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('/');
          assert.equal(await focus(page), 'search', 'focus stays in the search');
          assert.equal(await filterText(), '', 'the filter took nothing');
          await page.keyboard.press('Escape');
          await page.keyboard.press('Escape');
          await expanded(false);
          // From the filter field, the search's chord still opens the search, and leaves the filter's text as it was.
          await page.locator('main h1').first().click();
          await page.keyboard.press('/');
          assert.equal(await focus(page), 'filter');
          await page.keyboard.type('button');
          await page.keyboard.press(chord);
          await expanded(true);
          assert.equal(await filterText(), 'button');
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      });
    }

    test('a medium window: "/" expands the column and focuses the field', async () => {
      const { context, page, errors } = await open(MEDIUM);
      try {
        assert.equal(await page.evaluate(() => document.querySelector('tanrei-navigation-drawer.docs-sidebar').collapsed), true, 'the drawer is the column of glyphs');
        await page.locator('main h1').first().click();
        await page.keyboard.press('/');
        await page.waitForFunction(() => !document.querySelector('tanrei-navigation-drawer.docs-sidebar').collapsed);
        await page.waitForFunction(() => document.querySelector('tanrei-navigation-drawer.docs-sidebar').shadowRoot.querySelector('.filter')?.matches(':focus-within'));
        assert.equal(await focus(page), 'filter');
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    test('a compact window: "/" opens the drawer over the content and focuses the field, in the page\'s language', async () => {
      const { context, page, errors } = await open(COMPACT, '/ja/foundations/accessibility/');
      try {
        const words = strings('ja').sidebarFilter;
        assert.equal(await page.evaluate(() => document.querySelector('tanrei-app-shell').navigationOpen ?? false), false);
        await page.locator('main h1').first().click();
        await page.keyboard.press('/');
        await page.waitForFunction(() => document.querySelector('tanrei-app-shell').navigationOpen === true);
        await page.waitForFunction(() => document.querySelector('tanrei-navigation-drawer.docs-sidebar').shadowRoot.querySelector('.filter')?.matches(':focus-within'));
        assert.equal(await focus(page), 'filter');
        const { name, placeholder } = await field(page);
        assert.deepEqual({ name, placeholder }, { name: words.label, placeholder: words.placeholder });
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  });
}
