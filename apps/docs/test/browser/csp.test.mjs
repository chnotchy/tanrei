// The site's content security policy, enforced as the host sends it: the header of public/_headers on every page and the
// page's own policy the build writes into it (src/lib/csp.mjs). The pages a reader opens raise no violation — their
// inline scripts and the demos' event handlers run, the search loads its index (WebAssembly), Theme Studio rebuilds a
// system — and a script the page does not hold by its hash is refused.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/csp.test.mjs   # in each engine
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as playwright from '@playwright/test';
import { headerRules, headersFor, serveDist } from './host.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const EVERY_PAGE = headersFor(headerRules(fs.readFileSync(path.join(dist, '_headers'), 'utf8')), '/');
const ENGINES = (process.env.DOCS_ENGINES ?? 'chromium').split(',').map((name) => name.trim());
let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

test('every page holds its own policy, before any script', () => {
  const pages = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) pages.push(file);
    }
  };
  walk(dist);
  assert.ok(pages.length > 800, `${pages.length} pages`);
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const at = html.search(/<meta http-equiv="Content-Security-Policy" content="script-src /);
    assert.ok(at > 0, `${path.relative(dist, file)} holds its policy`);
    assert.ok(!/<script\b/i.test(html.slice(0, at)), `${path.relative(dist, file)}: no script before its policy`);
  }
});

test('the header is enforced, not only reported', () => {
  assert.ok(EVERY_PAGE['content-security-policy'], 'every page is sent Content-Security-Policy');
  assert.equal(EVERY_PAGE['content-security-policy-report-only'], undefined);
});

// What a page reports: the violations its document hears, and what the engine says of one in its console (an engine
// does not always dispatch the event for a refusal in a shadow tree).
const REFUSED = /Content[- ]Security[- ]Policy|Refused to (execute|load|apply|run|compile|create|connect)/i;

for (const engine of ENGINES) {
  describe(`in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await playwright[engine].launch();
    });
    after(async () => {
      await browser?.close();
    });

    /** Opens the page and gives back what it was refused, as it goes on. */
    async function open(address) {
      const page = await browser.newPage();
      const refused = [];
      page.on('console', (message) => {
        if (REFUSED.test(message.text())) refused.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => refused.push(`error: ${error.message}`));
      await page.exposeFunction('__refused', (text) => refused.push(text));
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => window.__refused(`${event.effectiveDirective}: ${event.blockedURI || 'inline'} (${event.sample})`), true);
      });
      const response = await page.goto(`${origin}${address}`, { waitUntil: 'load' });
      assert.ok(response.headers()['content-security-policy']);
      // Settled: what the page defines is defined, and two frames drawn after.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return { page, refused };
    }

    for (const address of ['/', '/ja/', '/ar/components/button/', '/components/table/', '/components/file-item/', '/fixtures/chat-composer/', '/404.html']) {
      test(`${address} raises no violation`, async () => {
        const { page, refused } = await open(address);
        try {
          await page.waitForTimeout(300);
          assert.deepEqual(refused, []);
        } finally {
          await page.close();
        }
      });
    }

    test('a demo’s event handler runs (it is held by its hash)', async () => {
      const { page, refused } = await open('/components/callout/');
      try {
        await page.evaluate(() => customElements.whenDefined('tanrei-callout'));
        const callout = page.locator('#callout-demo-closable');
        await callout.evaluate((element) => (element.open = false));
        await page.locator('tanrei-button[onclick*="callout-demo-closable"]').click();
        assert.equal(await callout.evaluate((element) => element.open), true);
        assert.deepEqual(refused, []);
      } finally {
        await page.close();
      }
    });

    test('the search loads its index and finds pages', async () => {
      const { page, refused } = await open('/');
      try {
        const found = await page.evaluate(async () => {
          const index = await import('/pagefind/pagefind.js');
          await index.init();
          return (await index.search('button')).results.length;
        });
        assert.ok(found > 0);
        assert.deepEqual(refused, []);
      } finally {
        await page.close();
      }
    });

    test('Theme Studio draws its system', async () => {
      const { page, refused } = await open('/studio/');
      try {
        await page.locator('[data-studio][data-level]').waitFor();
        await page.waitForTimeout(500);
        assert.deepEqual(refused, []);
      } finally {
        await page.close();
      }
    });

    test('an inline script the page does not hold by its hash is refused, and so is an event handler', async () => {
      const { page, refused } = await open('/');
      try {
        const ran = await page.evaluate(async () => {
          window.__ran = [];
          const script = document.createElement('script');
          script.textContent = 'window.__ran.push("script")';
          document.body.append(script);
          const button = document.createElement('button');
          button.setAttribute('onclick', 'window.__ran.push("handler")');
          document.body.append(button);
          button.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          return window.__ran;
        });
        assert.deepEqual(ran, []);
        assert.ok(refused.length > 0, 'the refusals are reported');
      } finally {
        await page.close();
      }
    });
  });
}
