// The actions at the head of a page as they are drawn (components/frame/PageActions.astro), in each engine: Tanrei's
// Button with menu in the page header's actions part — beside the title while the head is wide, under its text while
// it is narrow, and nothing scrolls sideways — that holds its room before it is defined, in the six languages; whose
// main action copies the page's own Markdown and whose menu's items link to it, to a chat that reads it and to the
// editors' links that install the MCP server, and copy the Claude Code command; each copy said in a snackbar, a copy
// that fails said too; reached and used with the keyboard alone, every control named; and, where no script runs, a
// link to the page's Markdown in its place.
//
// The clipboard is the page's own `navigator.clipboard`, replaced before the page's scripts run by one that keeps what
// it is given (a headless engine lets no page write the system's clipboard): what is asked is what the page writes.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/page-actions.test.mjs   # in one engine (all three by default)
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
const { claudeCodeCommand, cursorInstallHref, vscodeInstallHref } = await import('../../src/lib/page-actions.ts');
const { source, translations } = await import('../../i18n/locales.mjs');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const config = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8'));

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

const PAGE = '/components/button/';
const MARKDOWN = '/components/button.md';
const WIDE = { width: 1440, height: 800 };
const COMPACT = { width: 390, height: 800 };
const LANGUAGES = [source, ...translations].map(({ dir, lang }) => ({ lang, page: dir ? `/${dir}${PAGE}` : PAGE }));
const en = strings('en').pageActions;

// Firefox is told to ignore Cross-Origin-Opener-Policy, as in header.test.mjs (which says why): on a busy machine its
// Playwright loses the first navigation of a new page into the policy's new browsing context group. Nothing here is
// about the policy: no page here opens another (a link item's new tab is asked of its anchor, not followed).
const LAUNCH = { firefox: { firefoxUserPrefs: { 'browser.tabs.remote.useCrossOriginOpenerPolicy': false } } };

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

/** The actions, the head and the title, as boxes. */
const boxes = (page) =>
  page.evaluate(() => {
    const box = (element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const head = document.querySelector('tanrei-page-header.docs-page-header');
    return { head: box(head), title: box(head.querySelector('h1')), actions: box(head.querySelector('.docs-page-actions')), scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
  });

for (const engine of ENGINES) {
  describe(`the page actions in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await playwright[engine].launch(LAUNCH[engine]);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async ({ viewport = WIDE, url = PAGE, scripts = true, javaScriptEnabled = true } = {}) => {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', javaScriptEnabled });
      await context.addInitScript(KEEPING_CLIPBOARD);
      const page = await context.newPage();
      if (!scripts) await page.route(/\.m?js(\?|$)/, (route) => route.abort());
      await page.goto(`${origin}${url}`);
      // (A page whose scripts are off is asked through locators only: an engine may not evaluate in it.)
      if (javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scripts && javaScriptEnabled) {
        await page.evaluate(async () => {
          await Promise.all(['tanrei-button-with-menu', 'tanrei-page-header', 'tanrei-menu-item'].map((tag) => customElements.whenDefined(tag)));
          await document.querySelector('.docs-page-actions').updateComplete;
          await document.fonts.ready;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
      }
      return { context, page };
    };

    test('stand beside the title in a wide head and under its text in a narrow one, and nothing scrolls sideways', async () => {
      for (const viewport of [WIDE, COMPACT]) {
        const { context, page } = await open({ viewport });
        try {
          const { head, title, actions, scrollWidth, clientWidth } = await boxes(page);
          assert.ok(scrollWidth <= clientWidth, `${viewport.width}: the page scrolls sideways (${scrollWidth} > ${clientWidth})`);
          assert.ok(actions.x >= head.x - 0.5 && actions.x + actions.width <= head.x + head.width + 0.5, `${viewport.width}: the actions stand outside the head`);
          if (viewport === WIDE) {
            assert.ok(actions.x >= title.x + title.width - 0.5, 'in a wide head the actions stand after the title');
            assert.ok(Math.abs(actions.x + actions.width - (head.x + head.width)) < 1, 'beside the title the actions end at the head’s end edge');
            assert.ok(actions.y < title.y + title.height && actions.y + actions.height > title.y, 'beside the title the actions stand on its first line');
          } else {
            assert.ok(actions.y >= title.y + title.height, 'in a narrow head the actions stand under the text');
            assert.ok(Math.abs(actions.x - head.x) < 1, 'under the text the actions start at the start edge');
          }
        } finally {
          await context.close();
        }
      }
    });

    test('hold their room before they are defined, in the six languages, at 1440 and 390', async () => {
      for (const { lang, page: url } of LANGUAGES) {
        for (const viewport of [WIDE, COMPACT]) {
          const held = await open({ viewport, url, scripts: false });
          const before = await boxes(held.page);
          await held.context.close();
          const drawn = await open({ viewport, url });
          const after = await boxes(drawn.page);
          await drawn.context.close();
          const where = `${lang} at ${viewport.width}`;
          for (const side of ['width', 'height']) assert.ok(Math.abs(before.actions[side] - after.actions[side]) < 1, `${where}: the ${side} held is ${before.actions[side]}, drawn ${after.actions[side]}`);
          for (const side of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(before.title[side] - after.title[side]) < 1, `${where}: the title’s ${side} moves from ${before.title[side]} to ${after.title[side]}`);
        }
      }
    });

    test('are named in the page’s language, and their menu holds the links and the command', async () => {
      for (const { lang, page: url } of LANGUAGES) {
        const { context, page } = await open({ url });
        try {
          const w = strings(lang).pageActions;
          await page.getByRole('button', { name: w.copy, exact: true }).waitFor();
          const trailing = page.getByRole('button', { name: w.more, exact: true });
          assert.equal(await trailing.getAttribute('aria-haspopup'), 'menu', lang);
          assert.equal(await trailing.getAttribute('aria-expanded'), 'false', lang);
          const items = await page.evaluate(() =>
            [...document.querySelectorAll('.docs-page-actions tanrei-menu-item')].map((item) => {
              const anchor = item.shadowRoot.querySelector('a');
              return { label: item.getAttribute('label'), href: anchor?.getAttribute('href') ?? null, target: anchor?.getAttribute('target') ?? null };
            }),
          );
          const markdown = await page.evaluate(() => document.querySelector('link[rel="alternate"][type="text/markdown"]').getAttribute('href'));
          const question = w.ask.replace('{url}', new URL(markdown, config.site).href);
          assert.deepEqual(items.map(({ label }) => label), [w.view, w.chatgpt, w.claude, w.cursor, w.vscode, w.claudeCode], lang);
          assert.deepEqual(items.map(({ href }) => href), [
            markdown,
            `https://chatgpt.com/?${new URLSearchParams({ hints: 'search', q: question })}`,
            `https://claude.ai/new?${new URLSearchParams({ q: question })}`,
            cursorInstallHref(),
            vscodeInstallHref(),
            null,
          ], lang);
          assert.deepEqual(items.map(({ target }) => target), ['_blank', '_blank', '_blank', null, null, null], lang);
          const response = await page.request.get(`${origin}${markdown}`);
          assert.equal(response.status(), 200, `${lang}: ${markdown}`);
        } finally {
          await context.close();
        }
      }
    });

    test('copy the page’s Markdown with the main action, and say so in a snackbar loaded on first use', async () => {
      const { context, page } = await open();
      try {
        const asked = [];
        page.on('request', (request) => asked.push(request.url()));
        assert.equal(await page.evaluate(() => !!customElements.get('tanrei-snackbar-host')), false, 'the snackbar is defined with the page');
        await page.getByRole('button', { name: en.copy, exact: true }).click();
        await page.waitForFunction(() => window.__copied.length === 1);
        const expected = await (await page.request.get(`${origin}${MARKDOWN}`)).text();
        assert.equal(await page.evaluate(() => window.__copied[0]), expected);
        assert.ok(asked.some((url) => url.endsWith(MARKDOWN)), 'the Markdown is fetched as the press is handled');
        const message = page.locator('tanrei-snackbar-host.docs-snackbars tanrei-snackbar');
        await message.waitFor();
        assert.equal(await message.evaluate((snackbar) => snackbar.message), en.copiedMessage);
        assert.equal(await page.locator('.docs-page-actions-icon').textContent(), 'check', 'the main action’s glyph is a check while the message shows');
      } finally {
        await context.close();
      }
    });

    test('say that a copy failed, and where to go instead', async () => {
      const { context, page } = await open();
      try {
        await page.route(`${origin}${MARKDOWN}`, (route) => route.fulfill({ status: 404, body: '' }));
        await page.getByRole('button', { name: en.copy, exact: true }).click();
        const message = page.locator('tanrei-snackbar-host.docs-snackbars tanrei-snackbar');
        await message.waitFor();
        assert.deepEqual(await message.evaluate((snackbar) => [snackbar.message, snackbar.status]), [en.copyFailed, 'error']);
        assert.equal(await page.evaluate(() => window.__copied.length), 0);
      } finally {
        await context.close();
      }
    });

    test('are used with the keyboard alone: the menu opens, its items are reached, the command is copied and focus comes back', async () => {
      const { context, page } = await open();
      try {
        const leading = page.getByRole('button', { name: en.copy, exact: true });
        await leading.focus();
        // WebKit on macOS moves Tab between text fields only, as Safari does by default; Option-Tab reaches every control.
        await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        const trailing = page.getByRole('button', { name: en.more, exact: true });
        assert.equal(await trailing.evaluate((button) => button.matches(':focus')), true, 'Tab moves from the main action to the menu button');
        await page.keyboard.press('Enter');
        // The menu's host holds no room (its surface is in the top layer): its first item is what is seen.
        const menu = page.getByRole('menuitem', { name: en.view });
        await menu.waitFor();
        assert.equal(await trailing.getAttribute('aria-expanded'), 'true');
        assert.equal(await page.getByRole('menuitem', { name: en.view }).evaluate((item) => item.matches(':focus')), true, 'the first item takes focus');
        // The group of the MCP server is named, and its last item is the command.
        assert.equal(await page.getByRole('group', { name: en.mcp }).count(), 1);
        await page.keyboard.press('End');
        assert.equal(await page.getByRole('menuitem', { name: en.claudeCode }).evaluate((item) => item.matches(':focus')), true, 'End reaches the last item');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.__copied.length === 1);
        assert.equal(await page.evaluate(() => window.__copied[0]), claudeCodeCommand);
        const message = page.locator('tanrei-snackbar-host.docs-snackbars tanrei-snackbar');
        await message.waitFor();
        assert.equal(await message.evaluate((snackbar) => snackbar.message), en.commandCopied);
        await page.waitForFunction(() => document.querySelector('.docs-page-actions').open === false);
        assert.equal(await trailing.evaluate((button) => button.matches(':focus')), true, 'focus returns to the menu button');
        // Escape closes a menu opened again, and focus comes back to the same button.
        await page.keyboard.press('Enter');
        await menu.waitFor();
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('.docs-page-actions').open === false);
        assert.equal(await trailing.evaluate((button) => button.matches(':focus')), true);
        assert.equal(await trailing.getAttribute('aria-expanded'), 'false');
      } finally {
        await context.close();
      }
    });

    test('where no script runs, are a link to the page’s Markdown', async () => {
      const { context, page } = await open({ javaScriptEnabled: false });
      try {
        assert.equal(await page.locator('.docs-page-actions').boundingBox(), null, 'the menu, which can do nothing without script, is not drawn');
        const link = page.locator('[data-part="actions"] a.docs-page-markdown');
        assert.equal(await link.isVisible(), true);
        assert.equal(await link.getAttribute('href'), MARKDOWN);
        assert.equal((await link.textContent()).trim(), en.view);
      } finally {
        await context.close();
      }
    });
  });
}
