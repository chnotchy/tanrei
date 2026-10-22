// Theme Studio's stylesheet is on the Theme Studio pages only.
//
// A stylesheet a script imports is given by the bundler to every page the script's bundle reaches: imported by the
// Studio's entry, the Studio's sheet — with copies of four of the web package's — was linked from 755 of the 845 built
// pages (101 KB each). The Studio's page links it itself (components/StudioPage.astro).
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads the built pages in `dist/` and the stylesheets they link.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

/** Every built page, as [url, html]. */
const pages = [];
const walk = (dir, url) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== '_astro' && entry.name !== 'pagefind') walk(path.join(dir, entry.name), `${url}${entry.name}/`);
    else if (entry.name.endsWith('.html')) pages.push([entry.name === 'index.html' ? url : url + entry.name, fs.readFileSync(path.join(dir, entry.name), 'utf8')]);
  }
};
walk(dist, '/');

// The Studio's own sheet is the one that lays out its frame (packages/studio/src/studio.css).
const STUDIO_RULE = /\.ts-frame\b/;
const studioSheet = new Map();
const isStudioSheet = (href) => {
  if (!studioSheet.has(href)) studioSheet.set(href, STUDIO_RULE.test(fs.readFileSync(path.join(dist, href), 'utf8')));
  return studioSheet.get(href);
};
const linked = (html) => [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)].map(([tag]) => tag.match(/\bhref="([^"]+)"/)?.[1]).filter((href) => href?.startsWith('/'));

test('there are pages, and Theme Studio pages among them', () => {
  assert.ok(pages.length > 500, `${pages.length} pages`);
  assert.ok(pages.filter(([, html]) => html.includes('data-theme-studio')).length >= 6, 'a Theme Studio page in each language');
});

test("the Studio's stylesheet is linked by the pages that mount the Studio, and by no other", () => {
  const wrong = [];
  for (const [url, html] of pages) {
    const hosts = html.includes('data-theme-studio');
    const sheets = linked(html).filter(isStudioSheet);
    if (hosts && sheets.length !== 1) wrong.push(`${url}: hosts the Studio and links ${sheets.length} sheets of it`);
    if (!hosts && sheets.length) wrong.push(`${url}: links ${sheets.join(', ')}`);
  }
  assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} pages`);
});
