// What the page frame says of the site's own addresses (src/components/frame/frame.ts): the first page of the page's
// language is written as every other link of the site is, ending with a slash, in the six languages — and nothing of
// the docs writes the framework's own address of it, which has none in a translation.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { homeHref } = await import('../src/components/frame/frame.ts');
const { source, translations } = await import('../i18n/locales.mjs');

const src = fileURLToPath(new URL('../src/', import.meta.url));
const read = (file) => fs.readFileSync(src + file, 'utf8');
/** The address of a language's first page as the framework gives it to a page: the root, or the language's folder alone. */
const given = (dir, base = '') => (dir ? `${base}/${dir}` : `${base}/`);

describe('the first page of the page’s language', () => {
  test('ends with a slash in each of the six languages', () => {
    const languages = [source, ...translations];
    assert.equal(languages.length, 6);
    for (const { dir } of languages) {
      const href = homeHref({ siteTitleHref: given(dir) });
      assert.equal(href, dir ? `/${dir}/` : '/', dir || 'en');
      // It is the folder the site builds the language's first page into, `<dir>/index.html`, and nothing a host redirects.
      assert.match(href, /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?$/, dir || 'en');
    }
  });
  test('is left as given where it already ends with one, and gets one under a base path as well', () => {
    assert.equal(homeHref({ siteTitleHref: '/' }), '/');
    assert.equal(homeHref({ siteTitleHref: '/ja/' }), '/ja/');
    for (const { dir } of [source, ...translations]) assert.equal(homeHref({ siteTitleHref: given(dir, '/docs') }), dir ? `/docs/${dir}/` : '/docs/');
    assert.equal(homeHref({ siteTitleHref: homeHref({ siteTitleHref: '/ar' }) }), '/ar/');
  });
  test('is asked of the frame by the three places that link to it: the site’s title, the breadcrumbs’ first level, the not-found page’s action', () => {
    assert.match(read('components/frame/Header.astro'), /<tanrei-app-bar class="docs-app-bar" brand-href=\{homeHref\(route\)\}/);
    assert.match(read('components/frame/PageTitle.astro'), /<a href=\{homeHref\(route\)\} data-icon="home">/);
    const notFound = read('components/NotFound.astro');
    assert.match(notFound, /const home = homeHref\(route\);/);
    // The Button's destination and the plain link inside it, which is what is there before the element is defined.
    assert.equal(notFound.match(/href=\{home\}/g)?.length, 2);
  });
  test('is written nowhere as the framework gives it: no source of the docs reads `siteTitleHref` but the function', () => {
    const sources = fs
      .readdirSync(src, { recursive: true })
      .map((file) => String(file).replaceAll('\\', '/'))
      .filter((file) => /\.(astro|ts|mjs|mdx?)$/.test(file));
    assert.ok(sources.length > 100, `only ${sources.length} sources were found`);
    const readers = sources.filter((file) => read(file).includes('siteTitleHref'));
    assert.deepEqual(readers, ['components/frame/frame.ts']);
  });
});
