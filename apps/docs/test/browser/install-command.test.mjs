// The install command in each package manager (components/InstallCommand.astro) as the built site draws it, in each
// engine:
//
// - a row of tabs named for what it chooses, npm, pnpm, yarn and bun in that order, npm shown to a reader who never
//   chose;
// - a choice made on one page is the one every other install page shows, in every language, from its first frame;
// - the copy button of the panel shown copies that manager's command;
// - with storage that throws on every access, the page draws npm, every tab still works, the page takes the device's
//   scheme (components/frame/ThemeProvider.astro) and nothing is thrown.
//
// The clipboard is the page's own `navigator.clipboard`, replaced before the page's scripts run by one that keeps what
// it is given (a headless engine lets no page write the system's clipboard).
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/install-command.test.mjs
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
const { tabsKey } = await import('../../src/components/tabs/keys.mjs');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const scope = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8')).packages.npmScope;

const ENGINES = engines('chromium,firefox,webkit');
const WIDE = { width: 1440, height: 900 };
const t = strings('en');
const ROW = `tanrei-tab-view[group="package-manager"]`;

let host;
let origin;
before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});
after(async () => {
  await host?.close();
});

/** A clipboard that keeps what the page writes, in place of the system's, before any script of the page runs. */
const KEEPING_CLIPBOARD = () => {
  const kept = [];
  window.__copied = kept;
  const clipboard = {
    async write(items) {
      for (const item of items) kept.push(await (await item.getType('text/plain')).text());
    },
    async writeText(text) {
      kept.push(String(text));
    },
  };
  Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => clipboard });
};

/** A storage that throws on every access, as a browser that blocks the site's data has it. */
const BLOCKED_STORAGE = () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
};

/** The first set's tabs, which one is selected, and the command of the panel shown, once the Tab view is defined. */
const state = (page) =>
  page.evaluate(async (row) => {
    await customElements.whenDefined('tanrei-tab-view');
    await customElements.whenDefined('tanrei-code-block');
    const view = document.querySelector(row);
    await view.updateComplete;
    const tabs = [...view.querySelectorAll('tanrei-tab')];
    const shown = [...view.querySelectorAll('tanrei-tab-panel')].filter((panel) => getComputedStyle(panel).display !== 'none' && !panel.hidden);
    return {
      tabs: tabs.map((tab) => tab.label),
      selected: tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').map((tab) => tab.label),
      // The code as it is copied: the text of the block's lines, without the prompt drawn beside them.
      shown: shown.map((panel) => [...panel.querySelectorAll('tanrei-code-block [data-line-code]')].map((line) => line.textContent).join('\n')),
    };
  }, ROW);

for (const engine of ENGINES) {
  describe(`the install command in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const context = (init) => browser.newContext({ viewport: WIDE, reducedMotion: 'reduce', colorScheme: 'light' }).then(async (context) => {
      for (const script of init) await context.addInitScript(script);
      return context;
    });
    const open = async (context, url) => {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.goto(`${origin}${url}`);
      await page.waitForLoadState('load');
      return { page, errors };
    };

    test('a named row of npm, pnpm, yarn and bun; npm shown first; the choice kept across pages and languages; the copy copies it', async () => {
      const ctx = await context([KEEPING_CLIPBOARD]);
      try {
        const { page, errors } = await open(ctx, '/getting-started/web/');
        const first = await state(page);
        assert.deepEqual(first.tabs, ['npm', 'pnpm', 'yarn', 'bun']);
        assert.deepEqual(first.selected, ['npm']);
        assert.deepEqual(first.shown, [`npm install ${scope}/web`]);

        // The row is named for what it chooses (the tabs are the row's slotted children, so they are found from the set).
        assert.match(await page.locator(ROW).first().ariaSnapshot(), new RegExp(`^- tablist "${t.install.choice}":`));
        const row = page.locator(ROW).first();
        await row.getByRole('tab', { name: 'pnpm', exact: true }).click();
        await page.waitForFunction((row) => document.querySelector(row).querySelector('tanrei-tab[value="pnpm"]')?.getAttribute('aria-selected') === 'true', ROW);
        assert.deepEqual((await state(page)).shown, [`pnpm add ${scope}/web`]);
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), tabsKey('package-manager')), 'pnpm');

        const panel = page.locator(`${ROW} > tanrei-tab-panel[value="pnpm"]`);
        await panel.getByRole('button', { name: t.code.copy }).click();
        await page.waitForFunction(() => window.__copied.length > 0);
        assert.deepEqual(await page.evaluate(() => window.__copied), [`pnpm add ${scope}/web`]);
        assert.deepEqual(errors, []);
        await page.close();

        // Another page and another language: the choice made above, from the first frame (the head's script shows its
        // panel before the element is defined).
        for (const [url, expected] of [
          ['/getting-started/react/', `pnpm add ${scope}/react ${scope}/web`],
          ['/ja/getting-started/your-design-system/', `pnpm add --save-dev ${scope}/cli`],
        ]) {
          const next = await ctx.newPage();
          await next.route('**/*.js', async (route) => (route.request().url().includes('/_astro/') ? route.abort() : route.continue()));
          await next.goto(`${origin}${url}`);
          const before = await next.evaluate((row) => [...document.querySelector(row).querySelectorAll('tanrei-tab-panel')].filter((panel) => getComputedStyle(panel).display !== 'none').map((panel) => panel.getAttribute('value')), ROW);
          assert.deepEqual(before, ['pnpm'], `${url}: the panel the reader chose, before the element is defined`);
          await next.close();
          const { page: drawn, errors: thrown } = await open(ctx, url);
          const now = await state(drawn);
          assert.deepEqual(now.selected, ['pnpm'], url);
          assert.deepEqual(now.shown, [expected], url);
          assert.deepEqual(thrown, [], url);
          await drawn.close();
        }
      } finally {
        await ctx.close();
      }
    });

    test('with storage that throws, npm is shown, every tab works, the page takes the device’s scheme and nothing is thrown', async () => {
      // The page is built in the dark scheme and the device prefers the light one: the head's script must still run.
      const ctx = await context([BLOCKED_STORAGE]);
      try {
        const { page, errors } = await open(ctx, '/getting-started/react-native/');
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
        const first = await state(page);
        assert.deepEqual(first.selected, ['npm']);
        assert.deepEqual(first.shown, [`npm install ${scope}/react-native`]);
        const row = page.locator(ROW).first();
        for (const [manager, command] of [['yarn', 'yarn add'], ['bun', 'bun add'], ['npm', 'npm install']]) {
          await row.getByRole('tab', { name: manager, exact: true }).click();
          await page.waitForFunction(([row, manager]) => document.querySelector(row).querySelector(`tanrei-tab[value="${manager}"]`)?.getAttribute('aria-selected') === 'true', [ROW, manager]);
          assert.deepEqual((await state(page)).shown, [`${command} ${scope}/react-native`]);
        }
        assert.deepEqual(errors, []);
      } finally {
        await ctx.close();
      }
    });
  });
}
