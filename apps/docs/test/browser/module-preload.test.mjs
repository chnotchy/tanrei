// The built site's pages ask for every module their scripts import, in their heads (src/lib/module-preload.mjs):
// a page's links are the static graph of its module scripts, read here from the emitted files themselves, and a
// browser that opens a page finds no module only by reading another — the whole graph is one level deep — and asks
// for none twice.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port the way a static host does.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

// ── The site's files ─────────────────────────────────────────────────────────────────────────────────────────────

/** Every built page, as [url, file]. */
const pages = [];
const walk = (dir, url) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== '_astro' && entry.name !== 'pagefind') walk(path.join(dir, entry.name), `${url}${entry.name}/`);
    else if (entry.name === 'index.html') pages.push([url, path.join(dir, entry.name)]);
  }
};
walk(dist, '/');

const scripts = (html) => [...html.matchAll(/<script type="module" src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]);
const preloads = (html) => [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]);

/** What an emitted module imports statically (`import"./a.js"`, `import{x}from"./a.js"`, `export{x}from"./a.js"`), not `import("./a.js")`. */
const imported = new Map();
const importsOf = (url) => {
  if (!imported.has(url)) {
    const code = fs.readFileSync(path.join(dist, url), 'utf8');
    imported.set(url, [...code.matchAll(/(?:\bimport|\bfrom)\s*"(\.\/[^"]+\.js)"/g)].map((m) => path.posix.join(path.posix.dirname(url), m[1])));
  }
  return imported.get(url);
};
const graph = (entries) => {
  const seen = new Set();
  const visit = (url) => {
    if (seen.has(url)) return;
    seen.add(url);
    importsOf(url).forEach(visit);
  };
  entries.forEach(visit);
  return seen;
};

describe('every built page', () => {
  test('there are pages', () => assert.ok(pages.length > 500, `${pages.length} pages`));

  test('names each module its scripts import statically, once, in its head, and no other', () => {
    const wrong = [];
    for (const [url, file] of pages) {
      const html = fs.readFileSync(file, 'utf8');
      const links = preloads(html);
      const expected = graph(scripts(html));
      const head = html.slice(0, html.indexOf('</head>'));
      if (links.length !== expected.size || links.some((href) => !expected.has(href)) || preloads(head).length !== links.length) wrong.push(`${url}: ${links.length} links for ${expected.size} modules`);
    }
    assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} pages`);
  });
});

// ── A browser opens the pages ────────────────────────────────────────────────────────────────────────────────────

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
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

describe('a browser that opens a page', () => {
  for (const url of ['/', '/components/button/', '/ja/components/button/', '/foundations/theme-studio/']) {
    test(`asks for each of the page's modules from its head, once, on ${url}`, async () => {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        // Each module the page asks for, and what found it: the document (`parser`) or another module (`script`).
        const asked = [];
        cdp.on('Network.requestWillBeSent', ({ request, initiator }) => {
          if (/\/_astro\/[^/]+\.js$/.test(request.url)) asked.push({ url: new URL(request.url).pathname, by: initiator.type });
        });
        await page.goto(origin + url, { waitUntil: 'load' });
        const html = fs.readFileSync(path.join(dist, url, 'index.html'), 'utf8');
        const modules = graph(scripts(html));
        assert.ok(modules.size > 10, `${url} has ${modules.size} modules`);
        const statics = asked.filter((request) => modules.has(request.url));
        assert.deepEqual(statics.filter((request) => request.by !== 'parser').map((request) => `${request.url} (found by ${request.by})`), [], 'modules found only by reading another');
        const once = new Set(statics.map((request) => request.url));
        assert.equal(statics.length, once.size, 'a module asked for twice');
        assert.equal(once.size, modules.size, 'every module of the page is asked for');
      } finally {
        await context.close();
      }
    });
  }
});
