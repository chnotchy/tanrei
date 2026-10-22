// The date under a page's title, as an engine draws it (components/frame/PageTitle.astro): the head's meta line holds one
// item, when the page last changed — a `<time>` whose `datetime` is the date the sitemap gives the page and whose text
// says that day in the page's language — drawn as the page header's last part, below the title and the description,
// from the head's start edge (the right one in Arabic), in the meta line's color, on one line in a wide window and
// inside the head in a narrow one (PGH-1, PGH-8).
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/last-updated.test.mjs   # in each engine
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as playwright from '@playwright/test';
import { serveDist } from './host.mjs';

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'sitemap-index.xml'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = (process.env.DOCS_ENGINES ?? 'chromium').split(',').map((name) => name.trim());

/** Each address of the sitemaps and the date they give it. */
const sitemapDates = new Map(
  [...fs.readFileSync(path.join(dist, 'sitemap-index.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].flatMap(([, loc]) =>
    [...fs.readFileSync(path.join(dist, new URL(loc).pathname), 'utf8').matchAll(/<url>(.*?)<\/url>/gs)].map(([, body]) => [new URL(/<loc>(.*?)<\/loc>/s.exec(body)[1]).pathname, /<lastmod>(.*?)<\/lastmod>/s.exec(body)?.[1]]),
  ),
);

// A component's page and a page of prose, in each language and each direction of the site.
const PAGES = [
  { address: '/components/button/', lang: 'en' },
  { address: '/foundations/accessibility/', lang: 'en' },
  { address: '/ja/components/button/', lang: 'ja' },
  { address: '/zh-cn/components/button/', lang: 'zh-CN' },
  { address: '/es/getting-started/web/', lang: 'es' },
  { address: '/hi/components/button/', lang: 'hi' },
  { address: '/ar/components/button/', lang: 'ar', rtl: true },
];
const WIDE = { width: 1440, height: 900 };
const COMPACT = { width: 390, height: 900 };

/**
 * That the text is the sentence of the page's dictionary around the day the date names in its own offset, written in
 * the language's own words: its year and day in digits, and not the date's machine form. (Not the exact month: the
 * names are the locale data of the Node that built the site, and two versions of it spell a Hindi month two ways.)
 */
function assertText(text, datetime, lang) {
  const [before, after] = strings(lang).updated.split('{date}');
  assert.ok(text.startsWith(before) && text.endsWith(after), `${lang}: “${text}” is “${strings(lang).updated}”`);
  const day = text.slice(before.length, text.length - after.length);
  const [year, , date] = datetime.slice(0, 10).split('-').map(Number);
  const digits = (n) => new Intl.NumberFormat(lang, { useGrouping: false }).format(n);
  assert.ok(day.includes(digits(year)) && new RegExp(`(^|\\D)${digits(date)}(\\D|$)`).test(day), `${lang}: “${day}” names ${datetime.slice(0, 10)}`);
  assert.doesNotMatch(day, /\d{4}-\d\d-\d\d/, `${lang}: “${day}” is not the machine's form`);
  assert.match(day, /\p{L}/u, `${lang}: “${day}” is written in words, not as numbers alone`);
}

let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

for (const engine of ENGINES) {
  describe(`in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await playwright[engine].launch();
    });
    after(async () => {
      await browser?.close();
    });

    /** The head's parts as drawn, once the elements are defined and the faces are in. */
    async function head(address, viewport) {
      const page = await browser.newPage({ viewport });
      // The head is drawn from the document and its stylesheets: the pictures and windows below it are not waited for.
      await page.goto(`${origin}${address}`, { waitUntil: 'domcontentloaded' });
      const seen = await page.evaluate(async () => {
        await customElements.whenDefined('tanrei-page-header');
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const header = document.querySelector('tanrei-page-header.docs-page-header');
        const box = (element) => {
          const { left, right, top, bottom } = element.getBoundingClientRect();
          return { left, right, top, bottom };
        };
        const meta = header.querySelector(':scope > [data-part="meta"]');
        const probe = document.createElement('span');
        probe.style.color = 'var(--tanrei-comp-page-header-meta-color)';
        header.append(probe);
        const metaColor = getComputedStyle(probe).color;
        probe.remove();
        const time = meta?.querySelector(':scope > time');
        return {
          parts: [...header.children].map((child) => child.getAttribute('data-part') ?? child.localName),
          items: meta ? [...meta.children].map((child) => child.localName) : [],
          datetime: time?.getAttribute('datetime'),
          text: time?.textContent,
          lineHeight: time && parseFloat(getComputedStyle(time).lineHeight),
          color: time && getComputedStyle(time).color,
          metaColor,
          dir: getComputedStyle(header).direction,
          header: box(header),
          title: box(header.querySelector(':scope > h1')),
          description: header.querySelector(':scope > p') && box(header.querySelector(':scope > p')),
          meta: meta && box(meta),
          time: time && box(time),
          ignored: meta?.hasAttribute('data-pagefind-ignore'),
          dates: header.querySelectorAll('time').length,
        };
      });
      await page.close();
      return seen;
    }

    for (const { address, lang, rtl } of PAGES) {
      test(`${address}: the head's last part is when the page last changed, the date its sitemap gives`, async () => {
        const seen = await head(address, WIDE);
        assert.equal(seen.parts.at(-1), 'meta', `parts: ${seen.parts.join(', ')}`);
        assert.deepEqual(seen.items, ['time']);
        assert.equal(seen.dates, 1);
        const sitemap = sitemapDates.get(address);
        assert.ok(sitemap, `${address} is in the sitemap`);
        assert.equal(Date.parse(seen.datetime), Date.parse(sitemap));
        assertText(seen.text, seen.datetime, lang);
        assert.equal(seen.ignored, true, 'the search does not index the date');
        assert.equal(seen.color, seen.metaColor);
      });

      for (const [name, viewport] of [['wide', WIDE], ['compact', COMPACT]]) {
        test(`${address}, a ${name} window: the date stands below the title and the description, from the head's start edge, inside the head`, async () => {
          const seen = await head(address, viewport);
          assert.equal(seen.dir, rtl ? 'rtl' : 'ltr');
          const above = Math.max(seen.title.bottom, seen.description?.bottom ?? -Infinity);
          assert.ok(seen.meta.top >= above - 0.5, `meta top ${seen.meta.top}, the part above ends at ${above}`);
          if (rtl) assert.ok(Math.abs(seen.time.right - seen.title.right) <= 1, `time right ${seen.time.right}, title right ${seen.title.right}`);
          else assert.ok(Math.abs(seen.time.left - seen.title.left) <= 1, `time left ${seen.time.left}, title left ${seen.title.left}`);
          assert.ok(seen.time.left >= seen.header.left - 0.5 && seen.time.right <= seen.header.right + 0.5, 'the date is inside the head');
          assert.ok(seen.meta.bottom <= seen.header.bottom + 0.5, 'the date is inside the head');
          // One line of text: the date is short enough for a row even in a narrow window.
          assert.ok(seen.time.bottom - seen.time.top <= seen.lineHeight * 1.5, `the date is ${seen.time.bottom - seen.time.top} high, a line ${seen.lineHeight}`);
        });
      }
    }
  });
}
