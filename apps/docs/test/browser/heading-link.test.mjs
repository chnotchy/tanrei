// A heading's anchor in a built page, in each engine (lib/heading-links.ts, lib/markdown-content.mjs): where script
// runs it is named as what it does — it copies the address of its section, the heading's text in its name, in the
// page's language — and a press, by pointer or by Enter from the keyboard, puts the section's whole address on the
// clipboard, goes to the section as the link does, and has a Snackbar say so through its polite live region; a copy the
// browser refuses is said through the assertive one. Without script the anchor is the link to its heading, named by
// Starlight's words.
//
// The clipboard is the page's own `navigator.clipboard`, replaced before the page's scripts run by one that keeps what
// it is given (a headless engine lets no page write the system's clipboard), as test/browser/page-actions.test.mjs does.
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium node --test test/browser/heading-link.test.mjs
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

/** A clipboard that keeps what the page writes, in place of the system's, before any script of the page runs; `refuse` makes it refuse. */
const KEEPING_CLIPBOARD = (refuse) => {
  const kept = [];
  window.__copied = kept;
  const clipboard = {
    async writeText(text) {
      if (refuse) throw new DOMException('refused', 'NotAllowedError');
      kept.push(String(text));
    },
  };
  Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => clipboard });
};

/** The second heading's anchor of the page's content (the first is often the page's first section). */
const ANCHOR = '.sl-markdown-content .tanrei-prose-heading > a.tanrei-prose-anchor >> nth=1';

/** What the page's snackbars' live region of a kind holds, once it holds something. */
const announced = (page, role) =>
  page.waitForFunction((role) => document.querySelector('tanrei-snackbar-host.docs-snackbars')?.shadowRoot?.querySelector(`.announce[role="${role}"]`)?.textContent || false, role).then((handle) => handle.jsonValue());

for (const engine of ENGINES) {
  describe(`a heading's anchor in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (url, { refuse = false, javaScriptEnabled = true } = {}) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, reducedMotion: 'reduce', javaScriptEnabled });
      await context.addInitScript(KEEPING_CLIPBOARD, refuse);
      const page = await context.newPage();
      await page.goto(`${origin}${url}`);
      return { context, page };
    };

    for (const [url, lang] of [['/foundations/accessibility/', 'en'], ['/ja/foundations/accessibility/', 'ja']]) {
      test(`${url}: named as a copy, Enter copies the section's address, goes there, and the copy is announced`, async () => {
        const { context, page } = await open(url);
        const words = strings(lang).headingLink;
        const anchor = page.locator(ANCHOR);
        const { id, text } = await anchor.evaluate((a) => ({ id: a.getAttribute('href').slice(1), text: a.previousElementSibling.textContent.trim() }));
        const name = words.copy.replace('{heading}', text);
        await page.waitForFunction(([selector, name]) => document.querySelectorAll(selector)[1]?.getAttribute('aria-label') === name, ['.sl-markdown-content .tanrei-prose-heading > a.tanrei-prose-anchor', name]);
        assert.equal(await page.getByRole('link', { name, exact: true }).count(), 1, 'the anchor is a link named as what it does, with the heading’s text');
        // From the keyboard: focus reaches it, and Enter presses it.
        await anchor.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.__copied.length === 1);
        const address = new URL(`${url}#${id}`, origin).href;
        assert.equal(await page.evaluate(() => window.__copied[0]), address);
        await page.waitForFunction((id) => decodeURIComponent(location.hash) === `#${id}`, id);
        assert.equal(await announced(page, 'status'), words.copied);
        // A pointer's press copies too, and is announced anew.
        await anchor.hover();
        await anchor.click();
        await page.waitForFunction(() => window.__copied.length === 2);
        assert.equal(await page.evaluate(() => window.__copied[1]), address);
        await context.close();
      });
    }

    test('a copy the browser refuses is said through the assertive live region, and the link still goes to its section', async () => {
      const { context, page } = await open('/foundations/accessibility/', { refuse: true });
      const anchor = page.locator(ANCHOR);
      const id = (await anchor.getAttribute('href')).slice(1);
      await page.waitForFunction((selector) => document.querySelectorAll(selector)[1]?.hasAttribute('data-copy-label') && document.querySelectorAll(selector)[1].getAttribute('aria-label') === document.querySelectorAll(selector)[1].dataset.copyLabel, '.sl-markdown-content .tanrei-prose-heading > a.tanrei-prose-anchor');
      await anchor.focus();
      await page.keyboard.press('Enter');
      // The Snackbar reads its status's word before the message (SNK-10).
      const said = await announced(page, 'alert');
      assert.ok(said.endsWith(strings('en').headingLink.copyFailed), said);
      await page.waitForFunction((id) => decodeURIComponent(location.hash) === `#${id}`, id);
      await context.close();
    });

    test('without script the anchor is the link to its heading, named by Starlight’s words, and goes there', async () => {
      const { context, page } = await open('/foundations/accessibility/', { javaScriptEnabled: false });
      const anchor = page.locator(ANCHOR);
      const [href, label, text] = await anchor.evaluate((a) => [a.getAttribute('href'), a.getAttribute('aria-label'), a.previousElementSibling.textContent.trim()]);
      assert.ok(label.includes(text) && !label.startsWith(strings('en').headingLink.copy.split('{heading}')[0]), label);
      await anchor.click();
      await page.waitForURL(`**${href}`);
      await context.close();
    });
  });
}
