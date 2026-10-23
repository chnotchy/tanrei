// What the built site's heads say to a search engine and to a shared link (src/routeData.ts), page by page: one image
// of a shared link that the site serves — a PNG of 1200 × 630 —, the language as Open Graph writes it, structured
// data that parses and has what its type asks for (the page itself, dated as the sitemap dates it), a title no other page of its language has, and no author but the
// account that owns the repository. Then, in a browser, that the image a few pages name is one it draws.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port, as previews.test.mjs does.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { source, translations } from '../../i18n/locales.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
const repo = path.join(docs, '../..');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const config = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8'));
const owner = config.repository.public.split('/')[0];

// ── The pages ────────────────────────────────────────────────────────────────────────────────────────────────────

const decode = (text) => text.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[name]);
const htmlFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? htmlFiles(path.join(dir, entry.name)) : entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []));

/** Every page the framework built (its generator tag), with what its head says. A fixture's own document is not one. */
const pages = htmlFiles(dist)
  .map((file) => ({ file: path.relative(dist, file), html: fs.readFileSync(file, 'utf8') }))
  .filter(({ html }) => /<meta name="generator" content="Starlight/.test(html))
  .map(({ file, html }) => {
    const head = html.slice(0, html.indexOf('</head>'));
    const metas = [...head.matchAll(/<meta (property|name)="([^"]+)" content="([^"]*)"\/?>/g)].map(([, , key, value]) => [key, decode(value)]);
    return {
      file,
      lang: html.match(/<html[^>]* lang="([^"]+)"/)?.[1],
      title: decode(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
      all: (key) => metas.filter(([name]) => name === key).map(([, value]) => value),
      noindex: /<meta name="robots" content="noindex"/.test(head),
      // The date under its title (components/frame/PageTitle.astro): its meta line's `<time>`.
      shown: /<div data-part="meta"[^>]*>\s*<time\b[^>]*\bdatetime="([^"]+)"/.exec(html)?.[1],
      jsonLd: [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, text]) => text),
    };
  });
/** The date the sitemaps give each address, by its path. */
const sitemapDates = new Map(
  [...fs.readFileSync(path.join(dist, 'sitemap-index.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].flatMap(([, loc]) =>
    [...fs.readFileSync(path.join(dist, new URL(loc).pathname), 'utf8').matchAll(/<url>(.*?)<\/url>/gs)].map(([, body]) => [new URL(/<loc>(.*?)<\/loc>/s.exec(body)[1]).pathname, /<lastmod>(.*?)<\/lastmod>/s.exec(body)?.[1]]),
  ),
);
const isHome = (file) => file === 'index.html' || translations.some(({ dir }) => file === `${dir}/index.html`);
const ogLocales = [source, ...translations].map((language) => language.ogLocale);

describe('every page’s head', () => {
  test('the site has its pages', () => {
    assert.ok(pages.length >= 6 * 100, `${pages.length} pages`);
  });

  test('names one image of a shared link, which the site serves as a PNG of 1200 × 630', async () => {
    const sizes = new Map();
    for (const page of pages) {
      const images = page.all('og:image');
      assert.equal(images.length, 1, `${page.file}: ${images.length} og:image`);
      assert.deepEqual(page.all('twitter:image'), images, page.file);
      assert.deepEqual([page.all('og:image:width')[0], page.all('og:image:height')[0]], ['1200', '630'], page.file);
      assert.ok(page.all('og:image:alt')[0], `${page.file}: og:image:alt`);
      const url = new URL(images[0]);
      assert.equal(url.origin, new URL(page.all('og:url')[0]).origin, `${page.file}: the image is on the site’s own address`);
      const file = path.join(dist, decodeURIComponent(url.pathname));
      assert.ok(fs.existsSync(file), `${page.file}: ${url.pathname} is not in the site`);
      if (!sizes.has(file)) {
        const meta = await sharp(file).metadata();
        sizes.set(file, `${meta.format} ${meta.width}×${meta.height}`);
      }
      assert.equal(sizes.get(file), 'png 1200×630', `${page.file}: ${url.pathname}`);
    }
    // Every image drawn is named by a page: none is drawn for nothing.
    const drawn = fs.readdirSync(path.join(dist, 'og'), { recursive: true }).map(String).filter((file) => file.endsWith('.png')).map((file) => path.join(dist, 'og', file));
    assert.deepEqual(drawn.filter((file) => !sizes.has(file)), []);
  });

  test('says its language as Open Graph writes it, and every other language of the site as an alternate', () => {
    for (const page of pages) {
      const [locale, ...more] = page.all('og:locale');
      assert.equal(more.length, 0, page.file);
      assert.match(locale, /^[a-z]{2}_[A-Z]{2}$/, page.file);
      assert.equal(locale.slice(0, 2), page.lang.slice(0, 2).toLowerCase(), page.file);
      assert.deepEqual([locale, ...page.all('og:locale:alternate')].sort(), [...ogLocales].sort(), page.file);
    }
  });

  test('has a title no other page of its language has; the first page’s is not «Tanrei | Tanrei»', () => {
    const seen = new Map();
    for (const page of pages.filter((p) => !p.noindex)) {
      const key = `${page.lang}\n${page.title}`;
      assert.ok(!seen.has(key), `${page.file} and ${seen.get(key)}: «${page.title}»`);
      seen.set(key, page.file);
    }
    for (const page of pages.filter((p) => isHome(p.file))) {
      assert.doesNotMatch(page.title, new RegExp(`${config.name}\\s*\\|\\s*${config.name}`), page.file);
      assert.equal(page.title.split(config.name).length - 1, 1, `${page.file}: «${page.title}»`);
      assert.deepEqual(page.all('og:type'), ['website'], page.file);
    }
    for (const page of pages.filter((p) => !isHome(p.file))) assert.deepEqual(page.all('og:type'), ['article'], page.file);
  });

  test('titles a component’s page «<Component> — accessible UI component | Tanrei design system»', () => {
    const button = pages.find((page) => page.file === 'components/button/index.html');
    assert.equal(button.title, `Button — accessible UI component | ${config.name} design system`);
    assert.deepEqual(button.all('og:title'), ['Button — accessible UI component']);
    const components = pages.filter((page) => /^(?:[a-z-]+\/)?components\/[a-z-]+\/index\.html$/.test(page.file) && fs.existsSync(path.join(repo, 'specs', `${page.file.split('/').at(-2)}.spec.json`)));
    assert.ok(components.length >= 6 * 80, `${components.length} component pages`);
    for (const page of components) assert.match(page.title, new RegExp(` — .+ \\| .*${config.name}`), page.file);
  });

  test('has structured data that parses, of the types its page asks for, with what each type needs', () => {
    for (const page of pages) {
      const data = page.jsonLd.map((text) => JSON.parse(text));
      const types = data.map((item) => item['@type']);
      if (page.noindex) {
        assert.deepEqual(types, [], `${page.file}: a page not offered to a crawler`);
        continue;
      }
      for (const item of data) assert.equal(item['@context'], 'https://schema.org', page.file);
      assert.equal(types.filter((type) => type === 'BreadcrumbList').length, 1, `${page.file}: one BreadcrumbList`);
      // The page itself, dated as its sitemap and its head date it: the same string.
      const own = data.filter((item) => item['@type'] === 'WebPage');
      assert.equal(own.length, 1, `${page.file}: one WebPage`);
      const pathname = `/${page.file.replace(/index\.html$/, '')}`;
      assert.deepEqual([new URL(own[0].url).pathname, own[0].inLanguage], [pathname, page.lang], page.file);
      assert.ok(own[0].name, `${page.file}: the WebPage's name`);
      const sitemap = sitemapDates.get(pathname);
      assert.ok(sitemap, `${page.file}: in the sitemap`);
      assert.equal(own[0].dateModified, sitemap, `${page.file}: dateModified`);
      // Each language's first page has a hero in place of its head, and prints no date.
      if (!isHome(page.file)) assert.equal(page.shown, sitemap, `${page.file}: the date under its title`);
      const trail = data.find((item) => item['@type'] === 'BreadcrumbList').itemListElement;
      assert.ok(trail.length >= 1, page.file);
      trail.forEach((item, at) => {
        assert.deepEqual([item['@type'], item.position], ['ListItem', at + 1], page.file);
        assert.ok(item.name && new URL(item.item).protocol === 'https:', `${page.file}: ${JSON.stringify(item)}`);
      });
      assert.equal(new URL(trail.at(-1).item).pathname, `/${page.file.replace(/index\.html$/, '')}`, `${page.file}: the trail ends at the page`);
      if (isHome(page.file)) {
        const site = data.find((item) => item['@type'] === 'WebSite');
        assert.ok(site && site.name === config.name && site.alternateName === '端麗' && site.url && site.inLanguage === page.lang, page.file);
        const code = data.find((item) => item['@type'] === 'SoftwareSourceCode');
        assert.ok(code, `${page.file}: SoftwareSourceCode`);
        assert.equal(code.codeRepository, `https://github.com/${config.repository.public}`);
        assert.equal(code.version, config.version);
        assert.ok(Array.isArray(code.programmingLanguage) && code.programmingLanguage.length >= 4, page.file);
      } else if (/^(?:[a-z-]+\/)?getting-started\/(web|react|swiftui|compose|flutter|react-native)\/index\.html$/.test(page.file)) {
        const code = data.find((item) => item['@type'] === 'SoftwareSourceCode');
        assert.ok(code && typeof code.programmingLanguage === 'string', `${page.file}: SoftwareSourceCode with its programmingLanguage`);
      } else {
        assert.deepEqual(types, ['WebPage', 'BreadcrumbList'], page.file);
      }
    }
  });

  test('names no author but the account that owns the repository', () => {
    for (const page of pages) {
      assert.deepEqual(page.all('author'), [], `${page.file}: <meta name="author">`);
      const people = [];
      const walk = (value) => {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') {
          for (const [key, inner] of Object.entries(value)) {
            if (['author', 'creator', 'publisher', 'contributor', 'maintainer', 'copyrightHolder'].includes(key)) people.push(inner);
            walk(inner);
          }
        }
      };
      page.jsonLd.forEach((text) => walk(JSON.parse(text)));
      for (const person of people) assert.deepEqual(person, { '@type': 'Person', name: owner, url: `https://github.com/${owner}` }, page.file);
    }
  });
});

// ── In a browser ─────────────────────────────────────────────────────────────────────────────────────────────────

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
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

describe('the image a page names, in a browser', () => {
  for (const address of ['/', '/components/button/', '/ja/components/button/', '/ar/', '/hi/components/button/', '/getting-started/swiftui/']) {
    test(address, async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.goto(`${origin}${address}`, { waitUntil: 'domcontentloaded' });
        const named = await page.evaluate(() => [...document.head.querySelectorAll('meta[property="og:image"]')].map((meta) => meta.getAttribute('content')));
        assert.equal(named.length, 1);
        // The site's own address, served here from dist/.
        const local = `${origin}${new URL(named[0]).pathname}`;
        const drawn = await page.evaluate(async (src) => {
          const response = await fetch(src);
          const image = new Image();
          image.src = src;
          await image.decode();
          return { status: response.status, type: response.headers.get('content-type'), width: image.naturalWidth, height: image.naturalHeight };
        }, local);
        assert.deepEqual(drawn, { status: 200, type: 'image/png', width: 1200, height: 630 });
        const ld = await page.evaluate(() => [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((script) => JSON.parse(script.textContent ?? '')['@type']));
        assert.ok(ld.includes('BreadcrumbList'), `${address}: ${ld.join(', ')}`);
      } finally {
        await context.close();
      }
    });
  }
});
