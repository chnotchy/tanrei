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
import { engines, launch } from './launch.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

// A page of modal fixtures (each a dialog, drawn in a window so that it opens there and not on the page), a page of
// fixtures that are not presented but are each a whole page's frame (each window grows to hold its document), and a
// page in the other direction whose drawers are drawn in windows (the modal ones, and those as wide as the window).
const PAGES = ['/components/dialog/', '/components/app-shell/', '/ar/components/navigation-drawer/'];

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
      test(pathname, async () => {
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

    // A modal fixture opens as its window draws, and each engine would move the page's focus into the window and scroll
    // the page to it — WebKit at its next frame, whether the frame is `inert` or not: a page of windows drawn as the
    // reader scrolls past them was scrolled back to each one, and the next one drawn in turn.
    test('a window that draws a modal fixture neither scrolls the page nor takes its focus', async () => {
      const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/components/dialog/`, { waitUntil: 'load' });
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
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const now = await page.evaluate(() => ({ y: scrollY, focus: document.activeElement?.id || document.activeElement?.localName }));
          if (Math.abs(now.y - at) > 1) moved.push(`${await frame.getAttribute('title')}: the page was scrolled from ${Math.round(at)} to ${Math.round(now.y)}`);
          if (i >= count / 2 && now.focus !== 'probe') moved.push(`${await frame.getAttribute('title')}: the focus moved to ${now.focus}`);
        }
        assert.deepEqual(moved, []);
      } finally {
        await context.close();
      }
    });

    // A fixture whose surface stands beside its anchor in the top layer is drawn closed in the page, and its stage's
    // action opens the real surface there and closes it again; the action shows whether it is open, however it closed.
    test('an opener’s stage draws its fixture closed, and its action opens and closes it on the page', async () => {
      const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        for (const [pathname, id, tag] of [['/components/tooltip/', 'plain', 'tanrei-tooltip'], ['/components/button-with-menu/', 'filled-open', 'tanrei-button-with-menu']]) {
          await page.goto(`${origin}${pathname}`, { waitUntil: 'load' });
          const stage = page.locator(`.docs-stage[data-fixture-id="${id}"]`);
          await stage.scrollIntoViewIfNeeded();
          assert.equal(await stage.getAttribute('data-stage'), 'opener', `${pathname}${id}`);
          const element = stage.locator(`[data-fixture-scope] > .stage ${tag}`);
          await element.waitFor();
          await page.waitForFunction((name) => customElements.get(name), tag);
          assert.equal(await element.evaluate((el) => el.hasAttribute('open')), false, `${id} is drawn closed`);
          const toggle = stage.locator('[data-stage-open]');
          await toggle.click();
          await page.waitForFunction((el) => el.hasAttribute('open'), await element.elementHandle(), { timeout: 5_000 });
          // Closed by the fixture itself: the action says so.
          await page.keyboard.press('Escape');
          await page.waitForFunction((el) => !el.hasAttribute('open'), await element.elementHandle(), { timeout: 5_000 }).catch(() => element.evaluate((el) => el.removeAttribute('open')));
          await page.waitForFunction((el) => !el.hasAttribute('selected'), await toggle.elementHandle(), { timeout: 5_000 });
          // Opened again, and closed by the action.
          await toggle.click();
          await page.waitForFunction((el) => el.hasAttribute('open'), await element.elementHandle(), { timeout: 5_000 });
          await toggle.click();
          await page.waitForFunction((el) => !el.hasAttribute('open'), await element.elementHandle(), { timeout: 5_000 });
        }
      } finally {
        await context.close();
      }
    });

    test('a window is drawn in the page’s scheme, and follows the stage’s system and direction', async () => {
      const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/components/dialog/`, { waitUntil: 'load' });
        const frame = page.locator('.docs-stage[data-fixture-id="basic"] iframe');
        await frame.scrollIntoViewIfNeeded();
        await page.waitForFunction((element) => element.contentDocument?.querySelector('body > .stages > .stage'), await frame.elementHandle(), { timeout: 15_000 });
        assert.equal(await frame.evaluate((element) => element.contentDocument.documentElement.dataset.tanreiTheme), 'dark', 'the window is written in the page’s scheme');
        // The stage drawn under a preset, and turned right to left, as the header's menu and the frame's action do.
        await page.locator('.docs-stage[data-fixture-id="basic"] .docs-stage-box').evaluate((box) => {
          box.setAttribute('data-tanrei-system', 'm3-like');
          box.setAttribute('dir', 'rtl');
        });
        await page.waitForFunction((element) => element.contentDocument?.documentElement.getAttribute('data-tanrei-system') === 'm3-like', await frame.elementHandle(), { timeout: 5_000 });
        const root = await frame.evaluate((element) => ({ dir: element.contentDocument.documentElement.dir, preset: !!element.contentDocument.querySelector('link[data-preset]') }));
        assert.deepEqual(root, { dir: 'rtl', preset: true });
      } finally {
        await context.close();
      }
    });
  });
}
