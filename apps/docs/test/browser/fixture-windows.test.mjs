// The gallery's windows draw on the site as the host serves it: a component page frames each fixture's own document
// (/fixtures/<component>/?id=<fixture>), and the host's headers (public/_headers) let this site, and no other, frame it.
// Inside every window the fixture is drawn, its elements defined; the browser refuses no frame, the page throws
// nothing, and every window is let go of `inert` once it has drawn.
//
// It was written after every window of the site stood empty for days while the tests were green: the host sent
// `X-Frame-Options: DENY` with every document, which refuses a frame of the same site too, and the tests served `dist/`
// without the host's headers. A refused frame also made the page's script throw, so the window stayed `inert`.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { serveDist } from './host.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

// A page of presented fixtures (each a modal dialog, drawn in a window so that it opens there and not on the page) and
// a page of fixtures that are not presented (each window grows to hold its document).
const PAGES = ['/components/dialog/', '/components/scroll-area/'];

let host;
let origin;
let browser;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await host?.close();
});

describe('the gallery’s windows draw their fixtures', () => {
  for (const pathname of PAGES) {
    test(pathname, async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        const problems = [];
        // What the browser says when it refuses a frame, or when a script of the page reads a refused frame.
        page.on('console', (message) => {
          if (/refused|x-frame-options|frame-ancestors|frame-src/i.test(message.text())) problems.push(`console ${message.type()}: ${message.text()}`);
        });
        page.on('pageerror', (error) => problems.push(`the page threw: ${error.message}`));
        page.on('requestfailed', (request) => {
          if (request.frame() !== page.mainFrame()) problems.push(`a window's request failed: ${request.url()} (${request.failure()?.errorText})`);
        });
        await page.goto(`${origin}${pathname}`, { waitUntil: 'load' });

        const frames = page.locator('iframe.docs-window-frame');
        const count = await frames.count();
        assert.ok(count > 0, `${pathname} has no window`);
        // A window loads as the reader scrolls to it.
        for (let i = 0; i < count; i++) {
          const frame = frames.nth(i);
          await frame.scrollIntoViewIfNeeded();
          const inner = await (await frame.elementHandle()).contentFrame();
          assert.ok(inner, `window ${i} has no document`);
          await inner.waitForLoadState('load');
          const drawn = await inner.evaluate(async () => {
            const stage = document.querySelector('.stage');
            if (!stage) return { stage: false, location: location.href };
            const tags = new Set([...stage.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.includes('-')));
            await Promise.race([Promise.all([...tags].map((n) => customElements.whenDefined(n))), new Promise((r) => setTimeout(r, 5000))]);
            return { stage: true, fixture: stage.dataset.fixture, tags: tags.size, undefined: [...tags].filter((n) => !customElements.get(n)) };
          });
          const title = await frame.getAttribute('title');
          if (!drawn.stage) problems.push(`${title}: no fixture is drawn in the window (${drawn.location})`);
          else if (drawn.tags === 0) problems.push(`${title}: the window draws no element`);
          else if (drawn.undefined.length) problems.push(`${title}: ${drawn.undefined.join(', ')} not defined in the window`);
        }
        // Each window is let go once what it draws has opened (lib/fixture-stages.ts).
        await page.waitForFunction(() => !document.querySelector('iframe.docs-window-frame[inert]'), undefined, { timeout: 10_000 }).catch(() => {});
        const held = await page.locator('iframe.docs-window-frame[inert]').evaluateAll((list) => list.map((frame) => frame.title));
        for (const title of held) problems.push(`${title}: the window is still inert`);
        assert.deepEqual(problems, [], `${pathname}:\n  ${problems.join('\n  ')}`);
      } finally {
        await context.close();
      }
    });
  }
});
