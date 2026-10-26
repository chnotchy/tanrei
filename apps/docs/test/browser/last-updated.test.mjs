// The date under a page's title, as an engine draws it (components/frame/PageTitle.astro): the head's meta line holds one
// item, when the page last changed — a `<time>` whose `datetime` is the date the sitemap gives the page and whose text
// says that day in the page's language — drawn as the last part of the page header's text, below the title and the
// description, followed only by the page's actions (PGH-11: they come after the meta line, components/frame/PageActions.astro),
// from the head's start edge (the right one in Arabic), in the meta line's color, on one line in a wide window and
// inside the head in a narrow one (PGH-1, PGH-8). Those are asked in UTC, where the day shown is the build's.
//
// And the day is the reader's (src/lib/reader-day.mjs): the same `datetime` shows 23 October in Tokyo and 22 October in
// Los Angeles, written in place of the build's UTC day before the first frame, with no layout shift in the head; a
// reader without script sees the build's UTC day.
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
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');
const { dayText } = await import('../../src/lib/reader-day.mjs');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'sitemap-index.xml'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = engines();

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
 * That the text is the sentence of the page's dictionary around the day the date names in UTC, written in
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
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    /** The head's parts as drawn, once the elements are defined and the faces are in. */
    async function head(address, viewport) {
      const page = await browser.newPage({ viewport, timezoneId: 'UTC' });
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
      test(`${address}: the last part of the head's text is when the page last changed, the date its sitemap gives`, async () => {
        const seen = await head(address, WIDE);
        assert.deepEqual(seen.parts.slice(-2), ['meta', 'actions'], `parts: ${seen.parts.join(', ')}`);
        assert.deepEqual(seen.items, ['time']);
        assert.equal(seen.dates, 1);
        const sitemap = sitemapDates.get(address);
        assert.ok(sitemap, `${address} is in the sitemap`);
        assert.equal(seen.datetime, sitemap);
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

    const TIME = ':scope > [data-part="meta"] > time';
    const SENTENCE = strings('en').updated;

    /**
     * The date under the title of `address` as a reader in `timezoneId` sees it: its text at the first frame the page
     * draws and once it is drawn, and the layout shifts in the head. `datetime`, when given, is written into the page's
     * `<time>` as the host sends it, in place of the sitemap's: an instant that falls on two days in two zones, whatever
     * day the page last changed.
     */
    async function readerSees(address, { timezoneId, datetime, javaScriptEnabled = true }) {
      const context = await browser.newContext({ viewport: WIDE, timezoneId, javaScriptEnabled });
      try {
        const page = await context.newPage();
        if (datetime) {
          await page.route(`${origin}${address}`, async (route) => {
            const response = await route.fetch();
            const body = (await response.text()).replace(/(<div data-part="meta"[^>]*><time datetime=")[^"]+/, `$1${datetime}`);
            await route.fulfill({ response, body });
          });
        }
        // Before any of the page's scripts: what the head's date holds at the first frame, and every layout shift in the head.
        if (javaScriptEnabled) {
          await page.addInitScript((selector) => {
            window.__docsShifts = [];
            try {
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (entry.sources?.some(({ node }) => node?.parentElement?.closest('tanrei-page-header') || node?.closest?.('tanrei-page-header'))) window.__docsShifts.push(entry.value);
                }
              }).observe({ type: 'layout-shift', buffered: true });
            } catch {}
            requestAnimationFrame(() => {
              window.__docsFirstFrame = document.querySelector('tanrei-page-header.docs-page-header')?.querySelector(selector)?.textContent ?? null;
            });
          }, TIME);
        }
        // The date is written while the document is parsed: the pictures below the head are not waited for.
        await page.goto(`${origin}${address}`, { waitUntil: 'domcontentloaded' });
        const time = page.locator('tanrei-page-header.docs-page-header > [data-part="meta"] > time');
        const seen = { datetime: await time.getAttribute('datetime'), day: await time.getAttribute('data-day'), text: await time.textContent() };
        if (javaScriptEnabled) {
          Object.assign(
            seen,
            await page.evaluate(async () => {
              await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
              return { firstFrame: window.__docsFirstFrame, shifts: window.__docsShifts, observed: PerformanceObserver.supportedEntryTypes.includes('layout-shift') };
            }),
          );
        }
        return seen;
      } finally {
        await context.close();
      }
    }

    // Late on 22 October in UTC: 23 October in Tokyo, still the 22nd in Los Angeles. The other crosses a month, so that
    // the day the reader sees has fewer characters than the build's.
    const EVENING = '2026-10-22T20:00:00.000Z';
    const MONTH_END = '2026-09-30T20:00:00.000Z';
    const firstFrameHolds = (seen) => assert.ok(seen.firstFrame === null || seen.firstFrame === seen.text, `the first frame held “${seen.firstFrame}”, not “${seen.text}”`);

    test('one instant, two readers: Tokyo sees 23 October and Los Angeles 22 October, from the first frame', async () => {
      const tokyo = await readerSees('/components/button/', { timezoneId: 'Asia/Tokyo', datetime: EVENING });
      const losAngeles = await readerSees('/components/button/', { timezoneId: 'America/Los_Angeles', datetime: EVENING });
      assert.equal(tokyo.datetime, EVENING);
      assert.equal(losAngeles.datetime, EVENING);
      assert.equal(tokyo.text, SENTENCE.replace('{date}', 'October 23, 2026'));
      assert.equal(losAngeles.text, SENTENCE.replace('{date}', 'October 22, 2026'));
      firstFrameHolds(tokyo);
      firstFrameHolds(losAngeles);
    });

    test('the reader’s day in the page’s language and direction: Arabic, Japanese', async () => {
      for (const [address, lang] of [['/ar/components/button/', 'ar'], ['/ja/components/button/', 'ja']]) {
        const tokyo = await readerSees(address, { timezoneId: 'Asia/Tokyo', datetime: EVENING });
        const losAngeles = await readerSees(address, { timezoneId: 'America/Los_Angeles', datetime: EVENING });
        assert.notEqual(tokyo.text, losAngeles.text, `${lang}: two days`);
        // The engine's own words for the day, around which the sentence of the page's dictionary stands.
        const engineDay = (zone) => readerDayIn(zone, lang);
        assert.equal(tokyo.text, strings(lang).updated.replace('{date}', await engineDay('Asia/Tokyo')), `${lang}: “${tokyo.text}”`);
        assert.equal(losAngeles.text, strings(lang).updated.replace('{date}', await engineDay('America/Los_Angeles')), `${lang}: “${losAngeles.text}”`);
        firstFrameHolds(tokyo);
      }
    });

    /** How the engine writes `EVENING`'s day in `zone` for `lang`, with the options the page's script uses. */
    async function readerDayIn(zone, lang) {
      const page = await browser.newPage();
      try {
        return await page.evaluate(([iso, zone, lang]) => new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: zone }).format(Date.parse(iso)), [EVENING, zone, lang]);
      } finally {
        await page.close();
      }
    }

    test('a day of another month takes other room, and nothing in the head shifts', async () => {
      const seen = await readerSees('/components/button/', { timezoneId: 'Asia/Tokyo', datetime: MONTH_END });
      assert.equal(seen.text, SENTENCE.replace('{date}', 'October 1, 2026'));
      firstFrameHolds(seen);
      // Only Chromium reports layout shifts; in the other engines the first frame above is what is asked.
      if (seen.observed) assert.deepEqual(seen.shifts, [], `layout shifts in the head: ${seen.shifts.join(', ')}`);
    });

    // The page as built: its own date, in a zone where its day is not the UTC day.
    const ADDRESS = '/components/button/';
    const BUILT = sitemapDates.get(ADDRESS);
    const ZONE = new Date(BUILT).getUTCHours() >= 10 ? 'Pacific/Kiritimati' : 'Pacific/Pago_Pago';

    test(`${ADDRESS} as built, in ${ZONE}: the reader's day of the sitemap's date`, async () => {
      const seen = await readerSees(ADDRESS, { timezoneId: ZONE });
      assert.equal(seen.datetime, BUILT);
      assert.notEqual(dayText(BUILT, 'en', ZONE), dayText(BUILT, 'en', 'UTC'));
      assert.equal(seen.text, SENTENCE.replace('{date}', dayText(BUILT, 'en', ZONE)));
    });

    test(`${ADDRESS} without script, in ${ZONE}: the build's UTC day, the day the sitemap names`, async () => {
      const seen = await readerSees(ADDRESS, { timezoneId: ZONE, javaScriptEnabled: false });
      assert.equal(seen.datetime, BUILT);
      assert.equal(seen.day, dayText(BUILT, 'en', 'UTC'));
      assert.equal(seen.text, SENTENCE.replace('{date}', dayText(BUILT, 'en', 'UTC')));
    });
  });
}
