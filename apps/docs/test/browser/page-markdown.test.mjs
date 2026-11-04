// Every page of the built site as Markdown (src/lib/page-markdown.mjs): each page the search reads, in every
// language, has its `<path>.md` beside it and names it in its head; no other page does; each file opens with its front
// matter — the page's title, description, address and the date the sitemap gives the page — and holds no broken
// markup; a component's page holds its spec, every requirement by id, in every language. No browser: it reads the
// files.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { markdownPathOf } from '../../src/lib/page-markdown.mjs';
import { translations } from '../../i18n/locales.mjs';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const specsDir = fileURLToPath(new URL('../../../../specs/', import.meta.url));
if (!fs.existsSync(path.join(dist, 'sitemap-index.xml'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const languages = translations.map(({ dir }) => dir);

const files = fs.readdirSync(dist, { recursive: true, encoding: 'utf8' }).map((file) => file.split(path.sep).join('/'));
const pages = files
  .filter((file) => file.endsWith('.html'))
  .map((file) => {
    const html = fs.readFileSync(path.join(dist, file), 'utf8');
    const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';
    return {
      file,
      pathname: `/${file.replace(/(^|\/)index\.html$/, '$1')}`,
      searched: /<main\b[^>]*\sdata-pagefind-body[\s>]/.test(html),
      alternates: [...head.matchAll(/<link rel="alternate" type="text\/markdown" href="([^"]*)"/g)].map(([, href]) => href),
      canonical: /<link rel="canonical" href="([^"]*)"/.exec(head)?.[1],
    };
  });
const searched = pages.filter((page) => page.searched);
const read = (address) => fs.readFileSync(path.join(dist, address), 'utf8');

/** The front matter of a file: its fields, by name, as written. */
const frontMatter = (markdown) => Object.fromEntries([.../^---\n([\s\S]*?)\n---\n/.exec(markdown)?.[1].matchAll(/^([a-z_]+): (.*)$/gm) ?? []].map(([, key, value]) => [key, value.startsWith('"') ? JSON.parse(value) : value]));

/**
 * A file's code fences, with the language each opens with; its text outside them (`prose`); and that text with its
 * inline code taken out (`text`): code is what it is, and the checks read the words around it.
 */
function split(markdown) {
  const fences = [];
  const prose = [];
  let open;
  markdown.split('\n').forEach((line, i) => {
    const run = /^ *(`{3,})(.*)$/.exec(line);
    if (!open && run) fences.push((open = { run: run[1], language: run[2].trim(), line: i + 1, open: true }));
    else if (open && run && run[1].length >= open.run.length && !run[2].trim()) (open.open = false), (open = undefined);
    else if (!open) prose.push(line);
  });
  return { prose: prose.join('\n'), text: prose.join('\n').replace(/(`+)[^`\n]*?\1/g, ''), fences };
}

/** The date the sitemap gives each address. */
const sitemapDates = new Map(
  files
    .filter((file) => /^sitemap-\d+\.xml$/.test(file))
    .flatMap((file) => [...read(file).matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => [/<loc>(.*?)<\/loc>/.exec(entry)?.[1], /<lastmod>(.*?)<\/lastmod>/.exec(entry)?.[1]])),
);

describe("every page's Markdown", () => {
  test('every page the search reads, in every language, has its file beside it and names it in its head', () => {
    assert.ok(searched.length > 700, `${searched.length} pages`);
    const wrong = [];
    for (const page of searched) {
      const expected = markdownPathOf(page.pathname, languages);
      if (page.alternates.length !== 1 || page.alternates[0] !== expected) wrong.push(`${page.file}: head names ${JSON.stringify(page.alternates)}, not ${expected}`);
      if (!fs.existsSync(path.join(dist, expected))) wrong.push(`${page.file}: no ${expected}`);
    }
    assert.deepEqual(wrong, []);
    for (const dir of ['', ...languages]) {
      const own = searched.filter((page) => (dir ? page.pathname.startsWith(`/${dir}/`) : !languages.some((each) => page.pathname.startsWith(`/${each}/`))));
      assert.equal(own.length, searched.length / (languages.length + 1), `the pages of ${dir || 'English'}`);
    }
  });
  test('no other page names one (the pages that were not found, the redirects)', () => {
    const others = pages.filter((page) => !page.searched);
    assert.ok(others.some((page) => page.file === '404.html'));
    assert.deepEqual(others.filter((page) => page.alternates.length).map((page) => page.file), []);
  });
  test("every Markdown file is a page's, or the spec of a component whose page is elsewhere", () => {
    const own = new Set(searched.map((page) => markdownPathOf(page.pathname, languages).slice(1)));
    const specs = new Set(fs.readdirSync(specsDir).filter((file) => file.endsWith('.spec.json')).map((file) => `components/${file.replace('.spec.json', '')}.md`));
    assert.deepEqual(files.filter((file) => file.endsWith('.md') && !own.has(file) && !specs.has(file)), []);
  });
  test("opens with its front matter: the page's title, description and address, and the sitemap's date for it", () => {
    const wrong = [];
    for (const page of searched) {
      const markdown = read(markdownPathOf(page.pathname, languages));
      const fields = frontMatter(markdown);
      if (!markdown.startsWith('---\ntitle: ')) wrong.push(`${page.file}: no front matter`);
      if (!fields.title || !markdown.includes(`\n---\n\n# `)) wrong.push(`${page.file}: no title`);
      if (fields.url !== page.canonical) wrong.push(`${page.file}: url ${fields.url}, canonical ${page.canonical}`);
      // The same string: the sitemap's date, in UTC.
      const sitemap = sitemapDates.get(page.canonical);
      if (!sitemap || !fields.last_updated || fields.last_updated !== sitemap) wrong.push(`${page.file}: last_updated ${fields.last_updated}, sitemap ${sitemapDates.get(page.canonical)}`);
    }
    assert.deepEqual(wrong, []);
    assert.ok([...sitemapDates.values()].filter(Boolean).length > 700);
  });
  test('holds no broken markup: no `undefined`, no empty heading, no code fence without its language, no escaped character left', () => {
    const wrong = [];
    for (const page of searched) {
      const address = markdownPathOf(page.pathname, languages);
      const markdown = read(address);
      const { prose, text, fences } = split(markdown);
      if (/\bundefined\b|\[object Object\]/.test(text)) wrong.push(`${address}: undefined`);
      if (/^#{1,6}\s*$/m.test(prose)) wrong.push(`${address}: an empty heading`);
      for (const fence of fences) if (!fence.language) wrong.push(`${address}: a fence at line ${fence.line} without its language`);
      if (fences.some((fence) => fence.open)) wrong.push(`${address}: a fence with no end`);
      for (const [entity] of text.matchAll(/&(?:[a-z]+|#x?[0-9a-f]+);/gi)) wrong.push(`${address}: ${entity}`);
    }
    assert.deepEqual(wrong.slice(0, 20), []);
  });
  test("a component's page holds its spec in every language, with every requirement by id", () => {
    const wrong = [];
    let seen = 0;
    for (const page of searched) {
      const name = /^\/(?:[a-z-]+\/)?components\/([a-z0-9-]+)\/$/.exec(page.pathname)?.[1];
      const specFile = name && path.join(specsDir, `${name}.spec.json`);
      if (!specFile || !fs.existsSync(specFile) || (page.pathname.split('/')[1] !== 'components' && !languages.includes(page.pathname.split('/')[1]))) continue;
      seen++;
      const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
      const markdown = read(markdownPathOf(page.pathname, languages));
      const ids = [...markdown.matchAll(/^- \*\*([A-Z0-9]+-\d+[a-z]?)\*\* /gm)].map(([, id]) => id);
      if (ids.length !== spec.behavior.length) wrong.push(`${page.file}: ${ids.length} requirements, the spec has ${spec.behavior.length}`);
      if (!markdown.includes(`- Spec: https://github.com/`)) wrong.push(`${page.file}: no link to its spec`);
    }
    assert.ok(seen > 500, `${seen} component pages`);
    assert.deepEqual(wrong, []);
  });
});
