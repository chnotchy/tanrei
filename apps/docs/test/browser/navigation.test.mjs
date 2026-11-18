// From one built page to the next, in Chromium: the page asks for the site's own pages before a link is followed
// (src/lib/speculation-rules.mjs, written by components/frame/Head.astro) — and the browser reads the rules, and their
// patterns name the pages and leave out the rest — and the next page is revealed with a view transition, the frame
// kept where it is, unless motion is reduced (styles/frame.css). How the rules are written is
// test/speculation-rules.test.mjs's.
//
//   pnpm --filter @tanrei/docs build && node --test test/browser/navigation.test.mjs
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs). Chromium alone: it is the engine that
// prerenders and has cross-document view transitions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { launch } from './launch.mjs';
import { NOT_PAGES, speculationRules } from '../../src/lib/speculation-rules.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 120_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const FROM = '/components/button/';
const TO = '/components/checkbox/';
// FROM's link to the page after it, at the foot of the content (previous/next links): one a pointer can rest on.
const NEXT = '/components/main-action-button/';

/** Kept by each new document: whether `pagereveal` came with a view transition. */
const KEEP_REVEAL = () => {
  addEventListener('pagereveal', (event) => {
    window.__docsReveal = { transition: event.viewTransition !== null };
  });
};

let host;
let origin;
let browser;
before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
  browser = await launch('chromium');
});
after(async () => {
  await browser?.close();
  await host?.close();
});

/** Opens FROM, follows a script's navigation to TO, and returns what TO's `pagereveal` said. */
async function reveal(options) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, ...options });
  try {
    await context.addInitScript(KEEP_REVEAL);
    const page = await context.newPage();
    await page.goto(`${origin}${FROM}`);
    await page.waitForFunction(() => window.__docsReveal !== undefined);
    await Promise.all([page.waitForURL(`${origin}${TO}`), page.evaluate((to) => (location.href = to), TO)]);
    await page.waitForFunction(() => window.__docsReveal !== undefined);
    const said = await page.evaluate(() => window.__docsReveal);
    const names = await page.evaluate(() =>
      Object.fromEntries(
        [
          ['header', "tanrei-app-shell > [slot='header']"],
          ['sidebar', 'tanrei-app-shell > tanrei-navigation-drawer.docs-sidebar'],
          ['main', 'main'],
        ].map(([name, selector]) => [name, getComputedStyle(document.querySelector(selector)).viewTransitionName]),
      ),
    );
    return { ...said, names };
  } finally {
    await context.close();
  }
}

describe('the next page, in Chromium', () => {
  test('is revealed with a view transition, the header and the sidebar named apart from the page', LIMIT, async () => {
    const { transition, names } = await reveal({ reducedMotion: 'no-preference' });
    assert.equal(transition, true, 'pagereveal’s viewTransition is not null');
    assert.deepEqual(names, { header: 'docs-header', sidebar: 'docs-sidebar', main: 'none' });
  });
  test('is revealed without one while motion is reduced', LIMIT, async () => {
    const { transition } = await reveal({ reducedMotion: 'reduce' });
    assert.equal(transition, false, 'pagereveal’s viewTransition is null');
  });
});

describe('the speculation rules, in Chromium', () => {
  test('are read, and name the site’s pages and none of its other files, nor another site', LIMIT, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}${FROM}`);
      const found = await page.evaluate(
        ({ patterns }) => {
          const base = location.href;
          const matches = (pattern, href) => new URLPattern(pattern, base).test(new URL(href, base));
          const named = (href) => matches('/*', href) && !patterns.some((pattern) => matches(pattern, href));
          return {
            supported: HTMLScriptElement.supports('speculationrules'),
            rules: [...document.querySelectorAll('script[type="speculationrules"]')].map((script) => JSON.parse(script.textContent)),
            named: Object.fromEntries(['/', '/components/checkbox/', '/ja/foundations/color/', '/pagefind/pagefind.js', '/_astro/x.js', '/components/button.md', '/llms.txt', '/sitemap-index.xml', '/og/components/button.png', '/favicon.svg', 'https://github.com/', `${location.protocol}//example.com/components/`].map((href) => [href, named(href)])),
          };
        },
        { patterns: NOT_PAGES },
      );
      assert.equal(found.supported, true);
      assert.deepEqual(found.rules, [speculationRules]);
      assert.deepEqual(found.named, {
        '/': true,
        '/components/checkbox/': true,
        '/ja/foundations/color/': true,
        '/pagefind/pagefind.js': false,
        '/_astro/x.js': false,
        '/components/button.md': false,
        '/llms.txt': false,
        '/sitemap-index.xml': false,
        '/og/components/button.png': false,
        '/favicon.svg': false,
        'https://github.com/': false,
        [`http://example.com/components/`]: false,
      });
    } finally {
      await context.close();
    }
  });
  test('are allowed by both policies — the page’s by their hash, the host’s with no keyword of their own — and acted on once a pointer rests on a link', LIMIT, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
    try {
      await context.addInitScript(() => {
        window.__docsRefused = [];
        addEventListener('securitypolicyviolation', (event) => window.__docsRefused.push(`${event.violatedDirective}: ${event.blockedURI}`));
      });
      const page = await context.newPage();
      const problems = [];
      page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
      const cdp = await context.newCDPSession(page);
      const ruleSets = [];
      const attempts = [];
      let attempted;
      const prerendered = new Promise((resolve) => (attempted = resolve));
      cdp.on('Preload.ruleSetUpdated', ({ ruleSet }) => ruleSets.push(ruleSet));
      cdp.on('Preload.prerenderStatusUpdated', ({ key, status }) => {
        attempts.push({ url: key.url, status });
        if (key.url === `${origin}${NEXT}`) attempted();
      });
      await cdp.send('Preload.enable');
      await page.goto(`${origin}${FROM}`);
      await page.locator(`a[rel="next"][href="${NEXT}"]`).hover();
      // The test's own limit is the backstop: a rule set the policy refused never prerenders anything.
      await prerendered;
      assert.deepEqual(await page.evaluate(() => window.__docsRefused), [], 'no refusal of either policy');
      assert.deepEqual(problems, [], 'no console errors');
      assert.equal(ruleSets.length, 1, 'one rule set');
      assert.equal(ruleSets[0].errorType, undefined, `the rule set is read without an error (${ruleSets[0].errorMessage})`);
      assert.ok(attempts.some(({ url }) => url === `${origin}${NEXT}`), `the hovered page is prerendered (${JSON.stringify(attempts)})`);
    } finally {
      await context.close();
    }
  });
});
