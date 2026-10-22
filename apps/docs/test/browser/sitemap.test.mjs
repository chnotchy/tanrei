// The built sitemap (astro.config.mjs, src/lib/lastmod.mjs): every address in it says when its page last changed
// (`<lastmod>`), and that is the date git gives for the page's sources — asked one page at a time, never the time of
// the build — and each sitemap the index lists is dated by its newest page; and every page's head prints, as its one
// date, the date its sitemap gives it (components/frame/PageTitle.astro). No browser: it reads the files.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/`.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { pageSources } from '../../src/lib/lastmod.mjs';
import { translations } from '../../i18n/locales.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
if (!fs.existsSync(path.join(dist, 'sitemap-index.xml'))) throw new Error('apps/docs/dist holds no sitemap: run `pnpm --filter @tanrei/docs build` first');
const where = { repoRoot, contentDir: 'apps/docs/src/content/docs', languages: translations.map(({ dir }) => dir) };

/** The entries of a sitemap or of its index: each `<url>` or `<sitemap>`, its address and every `<lastmod>` it holds. */
const entries = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs'))].map(([, body]) => ({ loc: /<loc>(.*?)<\/loc>/s.exec(body)?.[1], lastmod: [...body.matchAll(/<lastmod>(.*?)<\/lastmod>/gs)].map(([, date]) => date) }));
const index = entries(fs.readFileSync(path.join(dist, 'sitemap-index.xml'), 'utf8'), 'sitemap');
const sitemaps = index.map(({ loc, lastmod }) => ({ lastmod, urls: entries(fs.readFileSync(path.join(dist, new URL(loc).pathname), 'utf8'), 'url') }));

const gitDate = async (files) => (await promisify(execFile)('git', ['log', '-1', '--first-parent', '--format=%cI', '--', ...files], { cwd: repoRoot })).stdout.trim();

describe('the sitemap', () => {
  test('dates every page by the newest commit of its sources', async () => {
    const urls = sitemaps.flatMap((sitemap) => sitemap.urls);
    assert.ok(urls.length > 100, `${urls.length} addresses`);
    const wrong = [];
    for (let i = 0; i < urls.length; i += 16) {
      await Promise.all(
        urls.slice(i, i + 16).map(async ({ loc, lastmod }) => {
          const sources = pageSources(loc, where);
          if (sources.length === 0) return wrong.push(`${loc}: no source`);
          if (lastmod.length !== 1) return wrong.push(`${loc}: ${lastmod.length} lastmod`);
          const expected = await gitDate(sources);
          if (!expected || Date.parse(lastmod[0]) !== Date.parse(expected)) wrong.push(`${loc}: ${lastmod[0]} (git: ${expected || 'no commit'} for ${sources.join(', ')})`);
        }),
      );
    }
    assert.deepEqual(wrong, []);
  });

  test('gives every page the date its head prints under its title, and that is the only date the head prints', () => {
    const urls = sitemaps.flatMap((sitemap) => sitemap.urls);
    const wrong = [];
    for (const { loc, lastmod } of urls) {
      const pathname = new URL(loc).pathname;
      const html = fs.readFileSync(path.join(dist, pathname, pathname.endsWith('/') ? 'index.html' : ''), 'utf8');
      const head = /<tanrei-page-header class="docs-page-header"[^>]*>([\s\S]*?)<\/tanrei-page-header>/.exec(html)?.[1];
      // Every page has a head but each language's first page, whose hero stands in its place and prints no date.
      if (!head) {
        if (!/^\/([a-z-]+\/)?$/.test(pathname) || /<time\b/.test(html)) wrong.push(`${loc}: no head`);
        continue;
      }
      const times = [...head.matchAll(/<time\b[^>]*\bdatetime="([^"]+)"/g)].map(([, datetime]) => datetime);
      const meta = /<div data-part="meta"[^>]*>([\s\S]*?)<\/div>/.exec(head)?.[1];
      if (times.length !== 1 || !meta?.includes(`datetime="${times[0]}"`)) wrong.push(`${loc}: ${times.length} dates in its head`);
      else if (Date.parse(times[0]) !== Date.parse(lastmod[0])) wrong.push(`${loc}: its head says ${times[0]}, its sitemap ${lastmod[0]}`);
    }
    assert.deepEqual(wrong, []);
  });

  test('dates each of its files, in the index, by the newest page it lists', () => {
    for (const { lastmod, urls } of sitemaps) {
      assert.equal(lastmod.length, 1);
      assert.equal(Date.parse(lastmod[0]), Math.max(...urls.map((url) => Date.parse(url.lastmod[0]))));
    }
  });
});
