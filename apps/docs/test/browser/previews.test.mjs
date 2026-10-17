// Every live preview of the built site is drawn as the web package draws it (compare-previews.mjs says how that is
// asked). The docs' other tests read sources and HTML; none of them sees a page drawn, and a stylesheet loaded into a
// layer that Starlight's beat — or not loaded at all — changes nothing they read: the Tree view's page drew the
// chevron under the icon, and the Accordion's page lost the space between its items, with every test green.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` (the site) and `packages/web/dist/` (the package's stylesheets), and serves the site itself on a
// free port. Every page of the root language that holds a preview is opened at 1440 × 1000, in the light and the dark
// scheme. (The other languages draw the same previews; a right-to-left one is not asked here.)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { comparePreviews } from './compare-previews.mjs';
import { watchNetwork } from './network-quiet.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
const webDist = path.join(docs, '../../packages/web/dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

// Every stylesheet the package ships, as a product loads it (not the presets of systems/, which a page opts into).
const componentCss = fs
  .readdirSync(webDist)
  .filter((name) => name.endsWith('.css'))
  .sort()
  .map((name) => fs.readFileSync(path.join(webDist, name), 'utf8'))
  .join('\n');
// Nothing moves while it is measured.
const still = '*, *::before, *::after { transition: none !important; animation: none !important; }';

// The root language's pages: every built page but those under a language's directory (the content's own folders).
const content = path.join(docs, 'src/content/docs');
const languages = new Set(fs.readdirSync(content).filter((name) => fs.existsSync(path.join(content, name, 'components'))));
const pages = [];
const walk = (dir, url) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (url === '/' && languages.has(entry.name)) continue;
      walk(path.join(dir, entry.name), `${url}${entry.name}/`);
    } else if (entry.name === 'index.html' && /data-tanrei-demo|docs-file-tree/.test(fs.readFileSync(path.join(dir, entry.name), 'utf8'))) pages.push(url);
  }
};
walk(dist, '/');
pages.sort();

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
let server;
let origin;
let browser;

before(async () => {
  server = http.createServer((request, response) => {
    let file = path.join(dist, decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(dist)) return response.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

describe('every live preview is drawn as the web package draws it', { concurrency: 4 }, () => {
  test('there are pages with previews', () => assert.ok(pages.length > 50, `found ${pages.length} pages with previews`));
  for (const url of pages) {
    test(url, async () => {
      const found = [];
      for (const colorScheme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          // The load, then 500 ms with nothing in flight: a navigation that waits for Playwright's `networkidle` can
          // return while a long page is still loading (network-quiet.mjs).
          const network = await watchNetwork(page);
          await page.goto(origin + url, { waitUntil: 'load' });
          await network.quiet();
          const result = await page.evaluate(comparePreviews, { componentCss, still });
          if (result.error) found.push(`${colorScheme}: ${result.error}`);
          for (const { index, preview, notes } of result.differ ?? []) found.push(`${colorScheme}, preview ${index} (${preview}):\n      ${notes.join('\n      ')}`);
        } finally {
          await context.close();
        }
      }
      assert.deepEqual(found, [], `${url} draws previews otherwise than the package does:\n  ${found.join('\n  ')}`);
    });
  }
});
