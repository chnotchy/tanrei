// The site's search is defined when it is first used (components/frame/Search.astro): a page loads no module of it
// until a reader points at the trigger, focuses it, presses it or presses a chord, and then the view opens as it did
// when the element came with the page — by a press, by Enter on the focused trigger and by both chords, with what is
// typed right after a chord in its field. Each test prints how long the view took to open (`# … ms`): from the press,
// or the chord, to the field holding focus.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/search-on-use.test.mjs   # in each engine
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as playwright from '@playwright/test';
import { serveDist } from './host.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = (process.env.DOCS_ENGINES ?? 'chromium').split(',').map((name) => name.trim());
const SEARCH = 'tanrei-search.docs-search';
let host;

before(async () => {
  host = await serveDist(dist);
});

after(async () => {
  await host?.close();
});

// In the page from its start: when the first chord or press came, and when the view's field first held focus.
const timing = () => {
  const at = (name) => (window[name] ??= performance.now());
  addEventListener('keydown', (event) => (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && at('__askedAt'), true);
  addEventListener('pointerdown', () => at('__askedAt'), true);
  addEventListener('keydown', (event) => event.key === 'Enter' && at('__askedAt'), true);
  const poll = () => {
    const search = document.querySelector('tanrei-search.docs-search');
    if (search?.expanded && search.shadowRoot?.activeElement?.localName === 'input') at('__openAt');
    else requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
};

/** The view is open and its field has focus: what the field holds, and how long it took from the press. */
const opened = (page) =>
  page
    .waitForFunction(() => window.__openAt !== undefined, null, { timeout: 15_000 })
    .then(() => page.evaluate(() => ({ value: document.querySelector('tanrei-search.docs-search').shadowRoot.activeElement.value, ms: Math.round(window.__openAt - window.__askedAt) })));

for (const engine of ENGINES) {
  describe(`in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await playwright[engine].launch();
    });
    after(async () => {
      await browser?.close();
    });

    async function open(viewport = { width: 1440, height: 1000 }) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.addInitScript(timing);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      // The page has stopped asking for files: nothing in flight for 500 ms after its load, counted from Playwright's
      // request events, which every engine gives (network-quiet.mjs counts from Chromium's own protocol).
      const open = new Set();
      let last = Date.now();
      page.on('request', (request) => (open.add(request), (last = Date.now())));
      for (const ended of ['requestfinished', 'requestfailed']) page.on(ended, (request) => (open.delete(request), (last = Date.now())));
      await page.goto(`${host.origin}/`, { waitUntil: 'load' });
      const start = Date.now();
      while (open.size || Date.now() - last < 500) {
        if (Date.now() - start > 30_000) throw new Error(`the home page still asks for ${open.size} files after 30 s`);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      return { context, page, errors };
    }

    test('the page loads no module of the search, and the trigger it draws is a button with the search’s name', async () => {
      const { context, page, errors } = await open();
      try {
        const seen = await page.evaluate((selector) => {
          const search = document.querySelector(selector);
          return { defined: customElements.get('tanrei-search') !== undefined, role: search.getAttribute('role'), tabindex: search.getAttribute('tabindex'), name: search.getAttribute('aria-label'), label: search.getAttribute('label'), popup: search.getAttribute('aria-haspopup'), box: search.getBoundingClientRect().width };
        }, SEARCH);
        assert.equal(seen.defined, false, 'tanrei-search is defined with the page');
        assert.deepEqual([seen.role, seen.tabindex, seen.name, seen.popup], ['button', '0', seen.label, 'dialog']);
        assert.ok(seen.label && seen.box > 0, 'the trigger is drawn, with a name');
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    for (const chord of ['Control+k', 'Meta+k']) {
      test(`${chord} before anything defined it opens the view, and what is typed at once goes into its field`, async (t) => {
        const { context, page, errors } = await open();
        try {
          await page.keyboard.press(chord);
          await page.keyboard.type('button');
          const { value, ms } = await opened(page);
          t.diagnostic(`${engine} ${chord}, cold: the field had focus ${ms} ms after the chord`);
          assert.equal(value, 'button');
          // And it is asked: the index answers with pages.
          await page.waitForFunction((selector) => document.querySelector(selector).querySelector('tanrei-search-result-group') !== null, SEARCH, { timeout: 15_000 });
          // The stand-in's attributes went with it: the element's own trigger is the button now.
          assert.deepEqual(await page.evaluate((selector) => ['role', 'tabindex', 'aria-label'].map((name) => document.querySelector(selector).getAttribute(name)), SEARCH), [null, null, null]);
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      });
    }

    test('a pointer over the trigger defines it, and a press opens the view', async (t) => {
      const { context, page, errors } = await open();
      try {
        await page.hover(SEARCH);
        await page.waitForFunction(() => customElements.get('tanrei-search') !== undefined && !document.querySelector('tanrei-search.docs-search').hasAttribute('role'));
        await page.click(SEARCH);
        const { ms } = await opened(page);
        t.diagnostic(`${engine} pointer: the field had focus ${ms} ms after the press`);
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    test('a press on the trigger before it is defined opens the view', async (t) => {
      const { context, page, errors } = await open();
      try {
        // A click with no pointer moved there first (as a touch screen's tap may come): nothing defined it before.
        await page.evaluate((selector) => {
          window.__askedAt = performance.now();
          document.querySelector(selector).click();
        }, SEARCH);
        const { ms } = await opened(page);
        t.diagnostic(`${engine} press, cold: the field had focus ${ms} ms after the press`);
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    test('focus on the trigger defines it and stays on its button; Enter opens the view; the compact trigger too', async (t) => {
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const { context, page, errors } = await open(viewport);
        try {
          await page.focus(SEARCH);
          await page.waitForFunction(() => customElements.get('tanrei-search') !== undefined);
          await page.waitForFunction((selector) => document.activeElement === document.querySelector(selector) && !document.querySelector(selector).hasAttribute('tabindex'), SEARCH);
          await page.evaluate(() => (window.__askedAt = performance.now()));
          await page.keyboard.press('Enter');
          const { ms } = await opened(page);
          t.diagnostic(`${engine} ${viewport.width} px, Enter on the focused trigger: the field had focus ${ms} ms after it`);
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      }
    });
  });
}
