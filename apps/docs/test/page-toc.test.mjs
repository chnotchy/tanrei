// The items of "On this page" (src/lib/page-toc.mjs): the framework's entry for the page's title becomes the item for
// the top of the page, and stands for the page's first heading too where that heading says the same word — so that no
// list begins with one word twice.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { tocItems } from '../src/lib/page-toc.mjs';

register('./vite-shim.mjs', import.meta.url);
const { strings } = await import('../src/lib/i18n.ts');
const { source, translations } = await import('../i18n/locales.mjs');

const item = (slug, text, children = []) => ({ depth: 2, slug, text, children });
const labels = (items) => items.map((each) => `${each.slug}:${each.text}`);

describe('the items of "On this page"', () => {
  test('the entry for the page’s title is the item for the top of the page, in the frame’s word', () => {
    const items = tocItems([item('_top', 'Color'), item('roles', 'Roles'), item('accent', 'One accent')], 'Overview');
    assert.deepEqual(labels(items), ['top:Overview', 'roles:Roles', 'accent:One accent']);
  });
  test('a first heading that says the frame’s word is not listed a second time: the top item stands for it and holds what it held', () => {
    const items = tocItems([item('_top', 'Button'), item('overview', 'Overview', [item('usage', 'Usage'), item('variants', 'Variants')]), item('specs', 'Specs'), item('guidelines', 'Guidelines')], 'Overview');
    assert.deepEqual(labels(items), ['top:Overview', 'specs:Specs', 'guidelines:Guidelines']);
    assert.deepEqual(labels(items[0].children), ['usage:Usage', 'variants:Variants']);
    assert.equal(items.filter((each) => each.text === 'Overview').length, 1);
  });
  test('the same word is the same word whatever its case and the space around it', () => {
    assert.deepEqual(labels(tocItems([item('_top', 'Button'), item('overview', ' overview '), item('specs', 'Specs')], 'Overview')), ['top:Overview', 'specs:Specs']);
  });
  test('only the first heading is the one the top item can stand for', () => {
    const items = tocItems([item('_top', 'Guide'), item('install', 'Install'), item('overview', 'Overview')], 'Overview');
    assert.deepEqual(labels(items), ['top:Overview', 'install:Install', 'overview:Overview']);
  });
  test('a page with no headings lists the top alone; a list without the title’s entry is left as it is', () => {
    assert.deepEqual(labels(tocItems([item('_top', 'Status')], 'Overview')), ['top:Overview']);
    assert.deepEqual(tocItems([], 'Overview'), []);
    const plain = [item('a', 'A'), item('overview', 'Overview')];
    assert.deepEqual(tocItems(plain, 'Overview'), plain);
  });
  test('every component page begins with the heading the frame’s word names, in each language: none lists it twice', () => {
    const docs = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
    for (const { lang, dir } of [{ lang: source.lang, dir: '' }, ...translations]) {
      const overview = strings(lang).frame.overview;
      const folder = `${docs}${dir ? `${dir}/` : ''}components/`;
      for (const file of fs.readdirSync(folder).filter((name) => name.endsWith('.mdx') && name !== 'index.mdx')) {
        const first = fs.readFileSync(folder + file, 'utf8').match(/^## (.+)$/m)?.[1];
        assert.equal(first, overview, `${dir}/components/${file}`);
        const items = tocItems([item('_top', 'Title'), item('first', first), item('specs', 'Specs')], overview);
        assert.equal(items.filter((each) => each.text === overview).length, 1, `${dir}/components/${file}`);
      }
    }
  });
  test('the frame builds its list with it', () => {
    const sidebar = fs.readFileSync(fileURLToPath(new URL('../src/components/frame/PageSidebar.astro', import.meta.url)), 'utf8');
    assert.match(sidebar, /tocItems\(toc\?\.items \?\? \[\], words\.overview\)/);
  });
});
