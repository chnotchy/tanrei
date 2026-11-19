// The gallery's windows draw on the site as the host serves it, in each engine: a component page writes each window's
// document into its frame (`srcdoc`), which is fetched from nowhere, so the host's headers — which let no document be
// framed (`X-Frame-Options: DENY`, `frame-ancestors 'none'`) and no page frame one (`frame-src 'none'`) — do not reach
// it, and the document keeps the page's policy. Inside every window the fixture is drawn, its elements defined by the
// one module the window runs; the browser refuses nothing, the page throws nothing, and every window is let go of
// `inert` once it has drawn. A window far from the view is emptied, and drawn again when the reader comes back to it.
//
// It was written first after every window of the site stood empty for days while the tests were green: the host sent
// `X-Frame-Options: DENY` with every document, which refuses a frame of the same site too, and the tests served `dist/`
// without the host's headers.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/fixture-windows.test.mjs
//
// It reads `dist/` and serves it on a free port as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the Arabic navigation
// drawer’s page, in WebKit, took 40 s in CI.
const LIMIT = { timeout: 150_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

// A page of fixtures that are not presented but are each a whole page's frame (each window grows to hold its
// document), and a page in the other direction whose drawers as wide as the window are drawn in windows. (A modal
// fixture is opened on the page from its stage, fixture-openers.test.mjs.)
const PAGES = ['/components/app-shell/', '/ar/components/navigation-drawer/'];
// The responsive drawers' windows: the narrowest presents its drawer modally there, as a 400 wide window does.
const DRAWERS = '/components/navigation-drawer/';

let host;
let origin;
const browsers = new Map();

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
  for (const engine of engines('chromium,firefox,webkit')) browsers.set(engine, await launch(engine));
});

after(async () => {
  for (const browser of browsers.values()) await browser.close();
  await host?.close();
});

/** Runs IN THE PAGE: what the window of `frame` draws once its document has loaded and its elements are defined. */
async function drawnIn(frame) {
  const doc = frame.contentDocument;
  const stage = doc?.querySelector('body > .stages > .stage');
  if (!stage) return { stage: false, address: doc?.URL ?? null };
  const view = doc.defaultView;
  const tags = new Set([...stage.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.includes('-')));
  await Promise.race([Promise.all([...tags].map((n) => view.customElements.whenDefined(n))), new Promise((r) => setTimeout(r, 10_000))]);
  return { stage: true, address: doc.URL, fixture: stage.dataset.fixture, tags: tags.size, undefined: [...tags].filter((n) => !view.customElements.get(n)), theme: doc.documentElement.dataset.tanreiTheme ?? null };
}

for (const engine of engines('chromium,firefox,webkit')) {
  describe(`the gallery’s windows draw their fixtures (${engine})`, () => {
    for (const pathname of PAGES) {
      test(pathname, LIMIT, async () => {
        const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          const problems = [];
          // What the browser says when it refuses a frame or a script, or when a script of the page throws.
          page.on('console', (message) => {
            if (/refused|x-frame-options|frame-ancestors|frame-src|content security policy|content-security-policy/i.test(message.text())) problems.push(`console ${message.type()}: ${message.text()}`);
          });
          page.on('pageerror', (error) => problems.push(`the page threw: ${error.message}`));
          page.on('requestfailed', (request) => {
            if (request.frame() !== page.mainFrame()) problems.push(`a window's request failed: ${request.url()} (${request.failure()?.errorText})`);
          });
          await page.exposeFunction('__refused', (text) => problems.push(`refused: ${text}`));
          await page.addInitScript(() => {
            document.addEventListener('securitypolicyviolation', (event) => window.__refused(`${event.effectiveDirective}: ${event.blockedURI || 'inline'}`), true);
          });
          await page.goto(`${origin}${pathname}`, { waitUntil: 'load' });

          const frames = page.locator('iframe.docs-window-frame');
          const count = await frames.count();
          assert.ok(count > 0, `${pathname} has no window`);
          // No window has a document before it comes near the view: a frame without an address holds the empty one.
          assert.equal(await page.locator('iframe.docs-window-frame[src]').count(), 0, 'a window is fetched from an address');
          for (let i = 0; i < count; i++) {
            const frame = frames.nth(i);
            const title = await frame.getAttribute('title');
            await frame.scrollIntoViewIfNeeded();
            const drawn = await page.waitForFunction(
              (element) => (element.contentDocument?.querySelector('body > .stages > .stage') && element.contentDocument.readyState === 'complete' ? true : null),
              await frame.elementHandle(),
              { timeout: 15_000 },
            ).then(() => frame.evaluate(drawnIn), () => ({ stage: false, address: 'nothing was written' }));
            if (!drawn.stage) problems.push(`${title}: no fixture is drawn in the window (${drawn.address})`);
            else if (drawn.address !== 'about:srcdoc') problems.push(`${title}: the window's document is ${drawn.address}, not the page's own`);
            else if (drawn.tags === 0) problems.push(`${title}: the window draws no element`);
            else if (drawn.undefined.length) problems.push(`${title}: ${drawn.undefined.join(', ')} not defined in the window`);
          }
          // Each window near the view is let go once what it draws has opened (lib/fixture-stages.ts).
          await frames.last().scrollIntoViewIfNeeded();
          await page.waitForFunction((element) => !element.hasAttribute('inert'), await frames.last().elementHandle(), { timeout: 10_000 }).catch(() => {});
          if (await frames.last().evaluate((element) => element.hasAttribute('inert'))) problems.push(`${await frames.last().getAttribute('title')}: the window is still inert`);
          // The first window is far from the view now (on a page of more than one): its document is emptied, and written
          // again when the reader comes back.
          if (count > 1 && (await page.evaluate(() => document.querySelector('iframe.docs-window-frame').getBoundingClientRect().bottom < -3 * innerHeight))) {
            const first = frames.first();
            await page.waitForFunction((element) => !element.hasAttribute('srcdoc') && !element.contentDocument?.querySelector('.stage'), await first.elementHandle(), { timeout: 10_000 }).catch(() => problems.push('a window far from the view is not emptied'));
            await first.scrollIntoViewIfNeeded();
            await page.waitForFunction((element) => element.contentDocument?.querySelector('body > .stages > .stage'), await first.elementHandle(), { timeout: 15_000 }).catch(() => problems.push('a window the reader came back to is not drawn again'));
          }
          assert.deepEqual(problems, [], `${pathname}:\n  ${problems.join('\n  ')}`);
        } finally {
          await context.close();
        }
      });
    }

    // A drawer presented modally opens as its window draws, and each engine would move the page's focus into the window
    // and scroll the page to it — WebKit at its next frame, whether the frame is `inert` or not: a page of windows drawn
    // as the reader scrolls past them was scrolled back to each one, and the next one drawn in turn.
    test('a window that draws a modal fixture neither scrolls the page nor takes its focus', LIMIT, async () => {
      const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}${DRAWERS}`, { waitUntil: 'load' });
        const moved = [];
        const count = Math.min(6, await page.locator('iframe.docs-window-frame').count());
        for (let i = 0; i < count; i++) {
          // Nothing of the page has the focus for the first windows (WebKit scrolled the page then); then the reader's
          // focus is on something of the page (a button of the test's own, which stays in view).
          if (i === count / 2)
            await page.evaluate(() => {
              const probe = Object.assign(document.createElement('button'), { id: 'probe', textContent: 'Probe' });
              probe.style.cssText = 'position: fixed; inset-block-start: 0; inset-inline-start: 0';
              document.body.append(probe);
              probe.focus();
            });
          // Just above the window: it is drawn, half a window away, out of view.
          const at = await page.evaluate((index) => {
            const frame = document.querySelectorAll('iframe.docs-window-frame')[index];
            scrollTo(0, frame.getBoundingClientRect().top + scrollY - innerHeight * 1.3);
            return scrollY;
          }, i);
          const frame = page.locator('iframe.docs-window-frame').nth(i);
          await page.waitForFunction((element) => element.contentDocument?.querySelector('body > .stages > .stage') && !element.hasAttribute('inert'), await frame.elementHandle(), { timeout: 15_000 });
          await settlePage(page, { fonts: false });
          const now = await page.evaluate(() => ({ y: scrollY, focus: document.activeElement?.id || document.activeElement?.localName }));
          if (Math.abs(now.y - at) > 1) moved.push(`${await frame.getAttribute('title')}: the page was scrolled from ${Math.round(at)} to ${Math.round(now.y)}`);
          if (i >= count / 2 && now.focus !== 'probe') moved.push(`${await frame.getAttribute('title')}: the focus moved to ${now.focus}`);
        }
        assert.deepEqual(moved, []);
      } finally {
        await context.close();
      }
    });

    test('a window is drawn in the page’s scheme, and follows the page’s look and the stage’s direction', LIMIT, async () => {
      const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/components/app-shell/`, { waitUntil: 'load' });
        const frame = page.locator('.docs-stage[data-fixture-id="compact"] iframe');
        await frame.scrollIntoViewIfNeeded();
        await page.waitForFunction((element) => element.contentDocument?.querySelector('body > .stages > .stage'), await frame.elementHandle(), { timeout: 15_000 });
        assert.equal(await frame.evaluate((element) => element.contentDocument.documentElement.dataset.tanreiTheme), 'dark', 'the window is written in the page’s scheme');
        // A gallery example chosen in the header's panel, and the stage turned right to left, as the frame's action does.
        await page.locator('#docs-appearance').click();
        await page.waitForFunction(() => document.querySelector('tanrei-popover[anchor="docs-appearance"]')?.open === true);
        await page.locator('tanrei-popover[anchor="docs-appearance"] tanrei-list-item[value="m3-like"]').click();
        await page.keyboard.press('Escape');
        await page.locator('.docs-stage[data-fixture-id="compact"] .docs-stage-box').evaluate((box) => box.setAttribute('dir', 'rtl'));
        const sheet = await page.waitForFunction(() => document.getElementById('docs-look-sheet')?.sheet && document.getElementById('docs-look-sheet').getAttribute('href'), null, { timeout: 15_000 }).then((handle) => handle.jsonValue());
        assert.match(sheet, /\/look-m3-like\.[0-9a-f]{8}\.css$/);
        await page.waitForFunction(({ element, sheet }) => element.contentDocument?.querySelector('link[data-docs-look]')?.getAttribute('href') === sheet, { element: await frame.elementHandle(), sheet }, { timeout: 5_000 });
        const root = await frame.evaluate((element) => ({ dir: element.contentDocument.documentElement.dir, scoped: element.contentDocument.documentElement.hasAttribute('data-tanrei-system'), primary: getComputedStyle(element.contentDocument.documentElement).getPropertyValue('--tanrei-sys-color-primary').trim() }));
        const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-color-primary').trim());
        assert.deepEqual(root, { dir: 'rtl', scoped: false, primary }, 'the window’s root takes the page’s look, with no system of its own');
      } finally {
        await context.close();
      }
    });
  });
}
