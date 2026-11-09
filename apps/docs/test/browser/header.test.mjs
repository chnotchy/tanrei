// The site's header as it is drawn (components/frame/Header.astro), in each engine: the bar holds one menu button —
// the shell's in a compact window, the site's in a wider one, which collapses and expands the drawer beside the
// content and opens its column over it — the brand, the appearance's button in its context (not drawn in a compact
// window, where the drawer holds it), and four actions: the repository's link, which the bar hides where its row has no
// room for it (APB-26, APB-30), and the search, the mode's toggle and the language, which it never hides. What the
// appearance's panel does is test/browser/appearance.test.mjs's; the language's menu links the page in the six languages;
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
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the repository’s link, in
// Firefox, took 81 s in CI.
const LIMIT = { timeout: 240_000 };

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');
const config = JSON.parse(fs.readFileSync(new URL('../../../../tanrei.config.json', import.meta.url), 'utf8'));
/** The repository's address, as the site builds it from the configuration (lib/repository.ts). */
const REPOSITORY = `https://github.com/${config.repository.public}`;
const LANGUAGES = [['', 'en'], ['ja/', 'ja'], ['zh-cn/', 'zh-cn'], ['hi/', 'hi'], ['es/', 'es'], ['ar/', 'ar']];

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = engines('chromium,firefox,webkit');
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

/**
 * Settled: the elements defined, the fonts in, and a frame drawn after both. The search is defined on its first use
 * (components/frame/Search.astro): a pointer over its trigger defines it, as a reader's would.
 */
const settled = async (page) => {
  await page.hover('tanrei-search.docs-search');
  await page.evaluate(async () => {
    await Promise.all(['tanrei-app-shell', 'tanrei-app-bar', 'tanrei-menu', 'tanrei-button', 'tanrei-search', 'tanrei-navigation-drawer'].map((tag) => customElements.whenDefined(tag)));
    await document.querySelector('tanrei-search.docs-search').updateComplete;
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
};

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
      browser = await launch(engine);
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

    test('a wide window: the site’s menu button, the appearance beside the brand, and four actions', LIMIT, async () => {
      const { context, page } = await open(WIDE);
      const seen = await items(page);
      assert.equal(seen.windowClass, 'expanded');
      assert.deepEqual(seen.navigation, { held: ['docs-drawer-toggle'], drawn: ['docs-drawer-toggle'] });
      assert.deepEqual(seen.context, { held: ['docs-appearance'], drawn: ['docs-appearance'] });
      assert.deepEqual(seen.actions, { held: ['docs-repository', 'docs-search', 'docs-mode', 'docs-language'], drawn: ['docs-repository', 'docs-search', 'docs-mode', 'docs-language'] });
      // Beside the brand, on the row's centre line.
      const [brand, system] = await page.evaluate(() => [document.querySelector('tanrei-app-bar').shadowRoot.querySelector('.brand'), document.getElementById('docs-appearance')].map((element) => element.getBoundingClientRect().toJSON()));
      assert.ok(system.left > brand.right && system.left - brand.right < 16, `the appearance's button stands after the brand: ${JSON.stringify({ brand, system })}`);
      assert.ok(Math.abs(system.top + system.height / 2 - (brand.top + brand.height / 2)) < 1);
      await context.close();
    });

    test('a compact window: the shell’s menu button, the wordmark, the three actions that stay; the appearance is in the drawer; nothing scrolls sideways at 390 and 320', LIMIT, async () => {
      for (const viewport of [COMPACT, NARROWEST]) {
        const { context, page } = await open(viewport);
        const seen = await items(page);
        assert.equal(seen.windowClass, 'compact');
        assert.deepEqual(seen.navigation, { held: ['shell-menu'], drawn: ['shell-menu'] });
        assert.deepEqual(seen.context.drawn, [], 'the bar draws no appearance’s button');
        assert.deepEqual(seen.actions.drawn.filter((id) => id !== 'docs-repository'), ['docs-search', 'docs-mode', 'docs-language']);
        // At 320 there is no room for the repository's link: the bar hides it.
        if (viewport === NARROWEST) assert.deepEqual(seen.actions.drawn, ['docs-search', 'docs-mode', 'docs-language']);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width, `${viewport.width}: no sideways scroll`);
        const right = await page.evaluate(() => document.getElementById('docs-language').getBoundingClientRect().right);
        assert.ok(right <= viewport.width, `${viewport.width}: the last action ends at ${right}`);
        if (viewport === COMPACT) assert.ok(await page.locator('tanrei-app-bar .docs-brand').isVisible(), 'the wordmark at a phone’s width');
        await page.locator('tanrei-app-bar [data-app-shell-menu]').click();
        await page.locator('#docs-appearance-drawer').waitFor({ state: 'visible' });
        await context.close();
      }
    });

    test('a window that changes its class changes the menu button the bar holds, each way', LIMIT, async () => {
      const { context, page } = await open(WIDE);
      await page.setViewportSize(COMPACT);
      await windowClass(page, 'compact');
      assert.deepEqual((await items(page)).navigation.held, ['shell-menu']);
      await page.setViewportSize(WIDE);
      await windowClass(page, 'expanded');
      assert.deepEqual((await items(page)).navigation.held, ['docs-drawer-toggle']);
      await context.close();
    });

    test('the site’s menu button collapses and expands the drawer beside the content, and opens its column over it', LIMIT, async () => {
      const { context, page } = await open(WIDE);
      const toggle = page.locator('#docs-drawer-toggle');
      const drawer = page.locator('#docs-sidebar');
      // The state is said by the native button the toggle draws, which carries its role: the product's ARIA on the
      // host is moved there (aria-controls by element reflection, where the engine has it).
      const native = toggle.locator('button');
      const expanded = () => native.getAttribute('aria-expanded');
      assert.equal(await expanded(), 'true');
      assert.deepEqual(await native.evaluate((button) => ('ariaControlsElements' in button ? (button.ariaControlsElements ?? []).map((controlled) => controlled.id) : ['docs-sidebar'])), ['docs-sidebar']);
      await toggle.click();
      await page.waitForFunction(() => document.getElementById('docs-sidebar').hasAttribute('collapsed'));
      assert.equal(await expanded(), 'false');
      assert.equal(await drawer.locator('.docs-listing-row').isVisible(), false, 'a collapsed drawer draws no switch');
      await toggle.click();
      await page.waitForFunction(() => !document.getElementById('docs-sidebar').hasAttribute('collapsed'));
      assert.equal(await expanded(), 'true');
      assert.ok(await drawer.locator('.docs-listing').isVisible(), 'the switch stands first in the expanded drawer');

      await page.setViewportSize(MEDIUM);
      await windowClass(page, 'medium');
      await page.waitForFunction(() => document.getElementById('docs-sidebar').presentation === 'column');
      assert.equal(await expanded(), 'false');
      await toggle.click();
      await page.waitForFunction(() => document.getElementById('docs-sidebar').open === true);
      assert.equal(await expanded(), 'true');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.getElementById('docs-sidebar').open === false);
      assert.equal(await expanded(), 'false');
      await context.close();
    });

    test('the appearance’s panel links Theme Studio, from the bar and from the drawer', LIMIT, async () => {
      const { context, page } = await open(WIDE);
      for (const id of ['docs-appearance', 'docs-appearance-drawer']) {
        assert.equal(await page.locator(`tanrei-popover[anchor="${id}"] tanrei-button[slot="actions"][href="/foundations/theme-studio/"]`).count(), 1, id);
      }
      await context.close();
    });

    test('the language’s menu links this page in the six languages, the current one marked', LIMIT, async () => {
      const { context, page } = await open(WIDE, '/ja/foundations/accessibility/');
      const links = await page.locator('tanrei-menu[anchor="docs-language"] tanrei-menu-item').evaluateAll((all) => all.map((item) => ({ href: item.getAttribute('href'), current: item.hasAttribute('current') })));
      assert.equal(links.length, 6);
      assert.ok(links.every(({ href }) => href.endsWith('/foundations/accessibility/')));
      assert.deepEqual(links.filter(({ current }) => current).map(({ href }) => href), ['/ja/foundations/accessibility/']);
      await context.close();
    });

    test('the icon-only buttons and the appearance’s button are named in the page’s language', LIMIT, async () => {
      for (const [dir, lang] of LANGUAGES) {
        const { context, page } = await open(WIDE, `/${dir}foundations/accessibility/`);
        const words = strings(lang).frame;
        for (const [id, name] of [['docs-drawer-toggle', words.menu], ['docs-mode', words.darkMode], ['docs-language', words.language]]) {
          assert.equal(await page.locator(`#${id}`).getByRole('button', { name, exact: true }).count(), 1, `${lang}: #${id} is named «${name}»`);
        }
        assert.equal(await page.locator('#docs-appearance').getAttribute('label'), words.appearanceOf.replace('{look}', 'tanrei'), `${lang}: the appearance's button`);
        await context.close();
      }
    });

    test('the repository’s link: named in the page’s language, to the configured repository, said to leave the site; drawn where the row has room and hidden where it has none, at 390, 768, 1024 and 1440 in the six languages; nothing else moves or is cut for it', LIMIT, async () => {
      for (const [dir, lang] of LANGUAGES) {
        const words = strings(lang);
        for (const width of [390, 768, 1024, 1440]) {
          const at = `${lang} ${width}`;
          const { context, page } = await open({ width, height: 800 }, `/${dir}foundations/accessibility/`);
          const link = page.locator('#docs-repository').getByRole('link', { name: words.frame.repository, exact: true });
          // What the row holds, as the bar lays it out: the start items' far edge, the search's near one, the gaps.
          const read = () =>
            page.evaluate(() => {
              const bar = document.querySelector('tanrei-app-bar.docs-app-bar');
              const rtl = getComputedStyle(bar).direction === 'rtl';
              const row = bar.shadowRoot.querySelector('.row');
              const box = (element) => element.getBoundingClientRect();
              const drawn = (element) => !!element && element.getClientRects().length > 0 && box(element).width > 0;
              const lead = box(bar.shadowRoot.querySelector('.lead'));
              const repository = document.getElementById('docs-repository');
              const search = document.querySelector('tanrei-search.docs-search');
              const others = [...bar.querySelectorAll(':scope > [slot]'), bar.shadowRoot.querySelector('.brand')].filter((element) => element !== repository && drawn(element));
              return {
                rtl,
                leadEnd: rtl ? lead.left : lead.right,
                searchStart: rtl ? box(search).right : box(search).left,
                repository: drawn(repository) ? box(repository).toJSON() : null,
                cell: box(document.getElementById('docs-mode')).width,
                gap: Number.parseFloat(getComputedStyle(row).columnGap),
                actionsGap: Number.parseFloat(getComputedStyle(bar.shadowRoot.querySelector('.actions')).columnGap),
                places: others.map((element) => `${element.id || element.className}:${Math.round(box(element).left)}:${Math.round(box(element).width)}`),
                scrollWidth: document.documentElement.scrollWidth,
              };
            });
          const seen = await read();
          // The room between the start items and the search, less the row's two gaps around the empty title area.
          const free = Math.abs(seen.searchStart - seen.leadEnd) - 2 * seen.gap;
          if (seen.repository) {
            assert.equal(await link.count(), 1, `${at}: the link is drawn and named «${words.frame.repository}»`);
            assert.equal(await link.getAttribute('href'), REPOSITORY, `${at}: it leads to the configured repository`);
            assert.equal(await link.getAttribute('aria-description'), words.externalLink, `${at}: it says that it leaves the site`);
            assert.ok(free + 0.5 >= seen.repository.width + seen.actionsGap, `${at}: drawn only with room for it: ${JSON.stringify(seen)}`);
            const near = seen.rtl ? seen.repository.left : seen.repository.right;
            assert.ok(Math.abs(Math.abs(seen.searchStart - near) - seen.actionsGap) < 1, `${at}: actions.gap before the search`);
          } else {
            assert.equal(await link.count(), 0, `${at}: a link that is hidden is not exposed`);
            assert.ok(free < seen.cell + seen.actionsGap, `${at}: hidden only without room for it: ${JSON.stringify(seen)}`);
          }
          assert.equal(seen.scrollWidth, width, `${at}: nothing scrolls sideways`);
          // Nothing else stands anywhere else, or is cut, for it: without the link every other item is where it was, as wide.
          await page.evaluate(() => document.getElementById('docs-repository').remove());
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.deepEqual((await read()).places, seen.places, `${at}: the other items stand where they stood`);
          await context.close();
        }
      }
    });
  });
}
