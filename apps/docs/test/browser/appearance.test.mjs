// The reader's appearance as the site draws and keeps it (src/lib/appearance.ts, components/frame/Appearance.astro,
// Header.astro), in each engine: the header's panel chooses the color mode, the contrast and the look, and every
// choice is on `<html>` at once, kept under one key and there from the first paint of the next page; the bar's toggle
// switches light and dark; the device's scheme is followed while the mode is the device's; another tab follows a
// choice; a link that shares an appearance shows it on its page, keeps nothing until the reader keeps it, and is what
// the panel's "Copy link" copies; and in a compact window the drawer's button opens the same panel.
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/appearance.test.mjs
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

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');
const { APPEARANCE_KEY } = await import('../../src/lib/appearance.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const DEFAULT = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8')).namespace;
const SHOWCASE = 'cupertino';

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

const PAGE = '/components/button/';
const WIDE = { width: 1440, height: 900 };
const COMPACT = { width: 390, height: 800 };
const en = strings('en');

/** What `<html>` says, and what storage holds. */
const root = (page) =>
  page.evaluate((key) => {
    const html = document.documentElement;
    return { theme: html.dataset.theme, tanreiTheme: html.dataset.tanreiTheme, mode: html.dataset.docsMode, contrast: html.getAttribute('data-tanrei-contrast'), look: html.dataset.docsSystem, shared: html.hasAttribute('data-docs-appearance-shared'), stored: JSON.parse(localStorage.getItem(key) ?? 'null') };
  }, APPEARANCE_KEY);

/** The page's controls defined, its fonts in, and a frame drawn after both. */
const settled = (page) =>
  page.evaluate(async () => {
    await Promise.all(['tanrei-app-bar', 'tanrei-button'].map((tag) => customElements.whenDefined(tag)));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

/** Opens the panel of the button `id` (the bar's, or the drawer's) and waits for it. */
async function openPanel(page, id = 'docs-appearance') {
  await page.locator(`#${id}`).click();
  const panel = page.locator(`tanrei-popover[anchor="${id}"]`);
  await page.waitForFunction((anchor) => document.querySelector(`tanrei-popover[anchor="${anchor}"]`)?.open === true, id);
  return panel;
}

for (const engine of ENGINES) {
  describe(`the appearance in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (options = {}, url = PAGE) => {
      const context = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce', colorScheme: 'light', ...options });
      const page = await context.newPage();
      await page.goto(`${origin}${url}`);
      await settled(page);
      return { context, page };
    };

    test('a first visit: the device’s scheme, standard contrast, the default system, nothing stored', async () => {
      const { context, page } = await open();
      assert.deepEqual(await root(page), { theme: 'light', tanreiTheme: 'light', mode: 'system', contrast: null, look: DEFAULT, shared: false, stored: null });
      assert.equal(await page.locator('#docs-appearance').getAttribute('label'), en.frame.appearanceOf.replace('{look}', DEFAULT));
      assert.equal(await page.locator('#docs-mode').evaluate((toggle) => toggle.selected), false);
      // The device's scheme, while the mode is the device's.
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      assert.equal((await root(page)).mode, 'system');
      assert.equal(await page.locator('#docs-mode').evaluate((toggle) => toggle.selected), true, 'the toggle says the page is dark');
      await context.close();
    });

    test('the panel chooses the mode, the contrast and the look; each is on the root at once, kept, and there from the next page’s first paint', async () => {
      const { context, page } = await open();
      const panel = await openPanel(page);
      await panel.getByRole('radio', { name: en.dark, exact: true }).click();
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      await panel.getByRole('radio', { name: en.contrastHigh, exact: true }).click();
      await page.waitForFunction(() => document.documentElement.getAttribute('data-tanrei-contrast') === 'high');
      await panel.getByRole('option', { name: SHOWCASE, exact: true }).click();
      await page.waitForFunction((id) => document.documentElement.dataset.docsSystem === id, SHOWCASE);
      const chosen = { mode: 'dark', contrast: 'high', look: SHOWCASE };
      assert.deepEqual(await root(page), { theme: 'dark', tanreiTheme: 'dark', mode: 'dark', contrast: 'high', look: SHOWCASE, shared: false, stored: chosen });
      assert.equal(await page.locator('#docs-appearance .docs-look-name').textContent(), SHOWCASE);
      // Every frame of the page follows the look (lib/example.ts).
      await page.waitForFunction((id) => [...document.querySelectorAll('[data-example] [data-example-stage]')].some((stage) => stage.getAttribute('data-tanrei-system') === id), SHOWCASE);

      // The next page, from its first paint: the head's script wrote the root before anything was drawn.
      const next = await context.newPage();
      await next.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          window.firstSeen = { theme: document.documentElement.dataset.theme, look: document.documentElement.dataset.docsSystem, contrast: document.documentElement.getAttribute('data-tanrei-contrast') };
        });
      });
      await next.goto(`${origin}/foundations/accessibility/`);
      await settled(next);
      assert.deepEqual(await next.evaluate(() => window.firstSeen), { theme: 'dark', look: SHOWCASE, contrast: 'high' });
      const again = await openPanel(next);
      assert.deepEqual(await again.evaluate((popover) => [...popover.querySelectorAll('tanrei-tabs, tanrei-list')].map((control) => control.value)), ['dark', 'high', SHOWCASE], 'the panel says what is kept');
      await context.close();
    });

    test('the bar’s toggle shows the other scheme and keeps it as the mode', async () => {
      const { context, page } = await open();
      const toggle = page.locator('#docs-mode');
      assert.equal(await toggle.getByRole('button', { name: en.frame.darkMode, exact: true }).getAttribute('aria-pressed'), 'false');
      await toggle.click();
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      assert.equal((await root(page)).stored.mode, 'dark');
      assert.equal(await toggle.getByRole('button', { name: en.frame.darkMode, exact: true }).getAttribute('aria-pressed'), 'true');
      await toggle.click();
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
      assert.equal((await root(page)).stored.mode, 'light');
      await context.close();
    });

    test('another tab of the site follows a choice', async () => {
      const { context, page } = await open();
      const other = await context.newPage();
      await other.goto(`${origin}/foundations/accessibility/`);
      await settled(other);
      const panel = await openPanel(page);
      await panel.getByRole('option', { name: SHOWCASE, exact: true }).click();
      await other.waitForFunction((id) => document.documentElement.dataset.docsSystem === id, SHOWCASE);
      assert.equal(await other.locator('#docs-appearance .docs-look-name').textContent(), SHOWCASE);
      await context.close();
    });

    test('a shared link shows its appearance on its page, keeps nothing until the reader keeps it, and is what “Copy link” copies', async () => {
      const { context, page } = await open();
      await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ mode: 'light', contrast: 'standard', look: 'm3-like' })), APPEARANCE_KEY);
      await page.goto(`${origin}${PAGE}?look=${SHOWCASE}&mode=dark&contrast=medium`);
      await settled(page);
      const shown = await root(page);
      assert.deepEqual(shown, { theme: 'dark', tanreiTheme: 'dark', mode: 'dark', contrast: 'medium', look: SHOWCASE, shared: true, stored: { mode: 'light', contrast: 'standard', look: 'm3-like' } });
      // The snackbar offers to keep it.
      const keep = page.locator('tanrei-snackbar').getByRole('button', { name: en.frame.keepShared, exact: true });
      await keep.waitFor();
      await keep.click();
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-docs-appearance-shared'));
      assert.deepEqual((await root(page)).stored, { mode: 'dark', contrast: 'medium', look: SHOWCASE });
      assert.equal(new URL(page.url()).search, '', 'the address loses the shared names');

      // The copy: a link to this page as it looks now.
      await page.evaluate(() => {
        window.copied = [];
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => void window.copied.push(text) } });
      });
      const panel = await openPanel(page);
      await panel.getByRole('button', { name: en.frame.copyLink, exact: true }).click();
      await page.waitForFunction(() => window.copied.length === 1);
      assert.equal(await page.evaluate(() => window.copied[0]), `${origin}${PAGE}?look=${SHOWCASE}&mode=dark&contrast=medium`);
      await page.locator('tanrei-snackbar', { hasText: en.frame.linkCopied }).waitFor();
      await context.close();
    });

    test('a compact window: the drawer’s button opens the same panel, as a sheet, and the bar keeps its toggle', async () => {
      const { context, page } = await open({ viewport: COMPACT });
      assert.equal(await page.locator('#docs-appearance').isVisible(), false, 'the bar has no room for the look’s button');
      assert.ok(await page.locator('#docs-mode').isVisible());
      await page.locator('tanrei-app-bar [data-app-shell-menu]').click();
      await page.locator('#docs-appearance-drawer').waitFor({ state: 'visible' });
      const panel = await openPanel(page, 'docs-appearance-drawer');
      await panel.getByRole('option', { name: SHOWCASE, exact: true }).click();
      await page.waitForFunction((id) => document.documentElement.dataset.docsSystem === id, SHOWCASE);
      assert.equal(await page.locator('#docs-appearance-drawer .docs-look-name').textContent(), SHOWCASE);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), COMPACT.width, 'nothing scrolls sideways');
      await context.close();
    });

    test('the look’s button and the toggle are named in the page’s language', async () => {
      for (const [dir, lang] of [['', 'en'], ['ja/', 'ja'], ['zh-cn/', 'zh-cn'], ['hi/', 'hi'], ['es/', 'es'], ['ar/', 'ar']]) {
        const { context, page } = await open({}, `/${dir}foundations/accessibility/`);
        const words = strings(lang).frame;
        assert.equal(await page.locator('#docs-appearance').getAttribute('label'), words.appearanceOf.replace('{look}', DEFAULT), lang);
        assert.equal(await page.locator('#docs-mode').getByRole('button', { name: words.darkMode, exact: true }).count(), 1, lang);
        await context.close();
      }
    });
  });
}
