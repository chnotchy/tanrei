// The site's header as it is drawn (components/frame/Header.astro), in each engine: the bar holds one menu button —
// the shell's in a compact window, the site's in a wider one, which collapses and expands the drawer beside the
// content and opens its column over it — the brand, the design system's button in its context (not drawn in a compact
// window, where the drawer holds it), and three actions: the search, the appearance and the language. The appearance's
// menu sets the color scheme and the contrast and keeps them; the language's menu links the page in the six languages;
// the icon-only buttons are named in the page's language; and at a phone's width nothing scrolls sideways.
// A production build reports nothing (APB-13 is a debug report), so what the report is about is asked of the bar.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/header.test.mjs   # in one engine (all three by default)
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
const NARROWEST = { width: 320, height: 800 };

/** The bar's items as the bar sees them: what each slot holds, and which of those are drawn. */
const items = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector('tanrei-app-bar.docs-app-bar');
    const name = (element) => element.id || (element.hasAttribute('data-app-shell-menu') ? 'shell-menu' : element.className);
    const slot = (slotName) => {
      const held = bar.shadowRoot.querySelector(`slot[name="${slotName}"]`).assignedElements();
      return { held: held.map(name), drawn: held.filter((element) => element.getBoundingClientRect().width > 0).map(name) };
    };
    return { windowClass: bar.closest('tanrei-app-shell').getAttribute('data-window-class'), navigation: slot('navigation'), context: slot('context'), actions: slot('actions') };
  });

/** Settled: the elements defined, the fonts in, and a frame drawn after both. */
const settled = (page) =>
  page.evaluate(async () => {
    await Promise.all(['tanrei-app-shell', 'tanrei-app-bar', 'tanrei-menu', 'tanrei-button', 'tanrei-search', 'tanrei-navigation-drawer'].map((tag) => customElements.whenDefined(tag)));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

/** The class the shell has decided, once it is the one asked for. */
const windowClass = (page, name) => page.waitForFunction((name) => document.querySelector('tanrei-app-shell')?.getAttribute('data-window-class') === name, name);

/** Opens the menu of the button `id` and chooses its item of `role` named `name`. */
async function choose(page, id, role, name) {
  await page.locator(`#${id}`).click();
  const menu = page.locator(`tanrei-menu[anchor="${id}"]`);
  await menu.getByRole(role, { name, exact: true }).click();
}

for (const engine of ENGINES) {
  describe(`the header in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await playwright[engine].launch();
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (viewport, url = PAGE) => {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`${origin}${url}`);
      await settled(page);
      return { context, page };
    };

    test('a wide window: the site’s menu button, the design system beside the brand, and three actions', async () => {
      const { context, page } = await open(WIDE);
      const seen = await items(page);
      assert.equal(seen.windowClass, 'expanded');
      assert.deepEqual(seen.navigation, { held: ['docs-drawer-toggle'], drawn: ['docs-drawer-toggle'] });
      assert.deepEqual(seen.context, { held: ['docs-system'], drawn: ['docs-system'] });
      assert.deepEqual(seen.actions, { held: ['docs-search', 'docs-appearance', 'docs-language'], drawn: ['docs-search', 'docs-appearance', 'docs-language'] });
      // Beside the brand, on the row's centre line.
      const [brand, system] = await page.evaluate(() => [document.querySelector('tanrei-app-bar').shadowRoot.querySelector('.brand'), document.getElementById('docs-system')].map((element) => element.getBoundingClientRect().toJSON()));
      assert.ok(system.left > brand.right && system.left - brand.right < 16, `the system's button stands after the brand: ${JSON.stringify({ brand, system })}`);
      assert.ok(Math.abs(system.top + system.height / 2 - (brand.top + brand.height / 2)) < 1);
      await context.close();
    });

    test('a compact window: the shell’s menu button, the wordmark, three actions; the design system is in the drawer; nothing scrolls sideways at 390 and 320', async () => {
      for (const viewport of [COMPACT, NARROWEST]) {
        const { context, page } = await open(viewport);
        const seen = await items(page);
        assert.equal(seen.windowClass, 'compact');
        assert.deepEqual(seen.navigation, { held: ['shell-menu'], drawn: ['shell-menu'] });
        assert.deepEqual(seen.context.drawn, [], 'the bar draws no design system’s button');
        assert.deepEqual(seen.actions.drawn, ['docs-search', 'docs-appearance', 'docs-language']);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width, `${viewport.width}: no sideways scroll`);
        const right = await page.evaluate(() => document.getElementById('docs-language').getBoundingClientRect().right);
        assert.ok(right <= viewport.width, `${viewport.width}: the last action ends at ${right}`);
        if (viewport === COMPACT) assert.ok(await page.locator('tanrei-app-bar .docs-brand').isVisible(), 'the wordmark at a phone’s width');
        await page.locator('tanrei-app-bar [data-app-shell-menu]').click();
        await page.locator('#docs-system-drawer').waitFor({ state: 'visible' });
        await context.close();
      }
    });

    test('a window that changes its class changes the menu button the bar holds, each way', async () => {
      const { context, page } = await open(WIDE);
      await page.setViewportSize(COMPACT);
      await windowClass(page, 'compact');
      assert.deepEqual((await items(page)).navigation.held, ['shell-menu']);
      await page.setViewportSize(WIDE);
      await windowClass(page, 'expanded');
      assert.deepEqual((await items(page)).navigation.held, ['docs-drawer-toggle']);
      await context.close();
    });

    test('the site’s menu button collapses and expands the drawer beside the content, and opens its column over it', async () => {
      const { context, page } = await open(WIDE);
      const toggle = page.locator('#docs-drawer-toggle');
      const drawer = page.locator('#docs-sidebar');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(await toggle.getAttribute('aria-controls'), 'docs-sidebar');
      await toggle.click();
      await page.waitForFunction(() => document.getElementById('docs-sidebar').hasAttribute('collapsed'));
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await drawer.locator('.docs-listing-row').isVisible(), false, 'a collapsed drawer draws no switch');
      await toggle.click();
      await page.waitForFunction(() => !document.getElementById('docs-sidebar').hasAttribute('collapsed'));
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.ok(await drawer.locator('.docs-listing').isVisible(), 'the switch stands first in the expanded drawer');

      await page.setViewportSize(MEDIUM);
      await windowClass(page, 'medium');
      await page.waitForFunction(() => document.getElementById('docs-sidebar').presentation === 'column');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await toggle.click();
      await page.waitForFunction(() => document.getElementById('docs-sidebar').open === true);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.getElementById('docs-sidebar').open === false);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await context.close();
    });

    test('the appearance’s menu sets the scheme and the contrast, keeps both, and links Theme Studio', async () => {
      const { context, page } = await open(WIDE);
      const t = strings('en');
      await choose(page, 'docs-appearance', 'menuitemradio', t.dark);
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      assert.equal(await page.evaluate(() => localStorage.getItem('starlight-theme')), 'dark');
      await choose(page, 'docs-appearance', 'menuitemradio', t.contrastHigh);
      await page.waitForFunction(() => document.documentElement.getAttribute('data-tanrei-contrast') === 'high');
      assert.equal(await page.evaluate(() => localStorage.getItem('tanrei-docs-contrast')), 'high');
      await page.reload();
      await settled(page);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-tanrei-contrast')), 'high');
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('tanrei-menu[anchor="docs-appearance"] tanrei-menu-group')].map((group) => group.value)), ['dark', 'high']);
      await choose(page, 'docs-appearance', 'menuitemradio', t.contrastStandard);
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-tanrei-contrast'));
      await choose(page, 'docs-appearance', 'menuitemradio', t.frame.themeAuto);
      assert.equal(await page.evaluate(() => localStorage.getItem('starlight-theme')), null);
      assert.equal(await page.locator('tanrei-menu[anchor="docs-appearance"] tanrei-menu-item').getAttribute('href'), '/foundations/theme-studio/');
      assert.equal(await page.locator('tanrei-menu[anchor="docs-system"] tanrei-menu-item').getAttribute('href'), '/foundations/theme-studio/');
      await context.close();
    });

    test('the contrast rows of a live example follow the menu, and the menu follows them', async () => {
      const { context, page } = await open(WIDE, '/components/button/');
      const row = page.locator('[data-docs-contrast]').first();
      await row.waitFor();
      await choose(page, 'docs-appearance', 'menuitemradio', strings('en').contrastMedium);
      await page.waitForFunction(() => document.querySelector('[data-docs-contrast]').value === 'medium');
      await row.getByRole('tab', { name: strings('en').contrastHigh }).click();
      await page.waitForFunction(() => document.querySelector('tanrei-menu-group.docs-contrast-group').value === 'high');
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-tanrei-contrast')), 'high');
      await context.close();
    });

    test('the language’s menu links this page in the six languages, the current one marked', async () => {
      const { context, page } = await open(WIDE, '/ja/foundations/accessibility/');
      const links = await page.locator('tanrei-menu[anchor="docs-language"] tanrei-menu-item').evaluateAll((all) => all.map((item) => ({ href: item.getAttribute('href'), current: item.hasAttribute('current') })));
      assert.equal(links.length, 6);
      assert.ok(links.every(({ href }) => href.endsWith('/foundations/accessibility/')));
      assert.deepEqual(links.filter(({ current }) => current).map(({ href }) => href), ['/ja/foundations/accessibility/']);
      await context.close();
    });

    test('the icon-only buttons and the design system’s button are named in the page’s language', async () => {
      for (const [dir, lang] of [['', 'en'], ['ja/', 'ja'], ['zh-cn/', 'zh-cn'], ['hi/', 'hi'], ['es/', 'es'], ['ar/', 'ar']]) {
        const { context, page } = await open(WIDE, `/${dir}foundations/accessibility/`);
        const words = strings(lang).frame;
        for (const [id, name] of [['docs-drawer-toggle', words.menu], ['docs-appearance', words.theme], ['docs-language', words.language]]) {
          assert.equal(await page.locator(`#${id}`).getByRole('button', { name, exact: true }).count(), 1, `${lang}: #${id} is named «${name}»`);
        }
        assert.equal(await page.locator('#docs-system').getAttribute('label'), words.system.replace('{system}', 'tanrei'), `${lang}: the design system's button`);
        await context.close();
      }
    });
  });
}
