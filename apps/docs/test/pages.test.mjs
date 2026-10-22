// What the pages themselves must keep, read from their sources (src/content/docs/, in every language) and from the
// docs' components that write generated blocks into them:
//
// - a generated block's headings take their level from the page that places the block (`headingLevel`), so that no
//   heading skips a level under the page's title;
// - a Markdown table's first header cell says what its column holds: an empty header cell names nothing, and no
//   page is excused;
// - the Skeleton page's "Load" demo holds its box: the content that arrives is as many lines as its placeholders say;
// - every page is in the sidebar: the sidebar lists the pages outside components/ by hand (astro.config.mjs), so a
//   page added without its line is reachable only by search.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { translations } from '../i18n/locales.mjs';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const read = (file) => fs.readFileSync(root + file, 'utf8');
const pages = fs
  .readdirSync(`${root}content/docs`, { recursive: true })
  .map((file) => String(file).replaceAll('\\', '/'))
  .filter((file) => /\.mdx?$/.test(file));
const folders = ['', ...translations.map(({ dir }) => `${dir}/`)];

describe('a generated block’s headings', () => {
  const blocks = ['StatusMatrix', 'ComponentIndex'];
  test('are written at the level the page gives, never at one the block chose', () => {
    for (const block of blocks) {
      const source = read(`components/${block}.astro`);
      assert.match(source, /headingLevel: 2 \| 3 \| 4;/, block);
      assert.match(source, /const Heading = `h\$\{Astro\.props\.headingLevel\}`/, block);
      const [, , template = ''] = source.split(/^---$/m);
      assert.doesNotMatch(template.split('<style')[0], /<h[1-6][\s>]/, `${block} writes a heading of a fixed level`);
    }
  });
  test('get their level from every page that places the block: 2 where it stands under the page’s title alone', () => {
    let placed = 0;
    for (const file of pages) {
      const text = read(`content/docs/${file}`);
      for (const block of blocks) {
        for (const [tag] of text.matchAll(new RegExp(`<${block}\\b[^>]*>`, 'g'))) {
          placed += 1;
          const level = Number(tag.match(/headingLevel=\{(\d)\}/)?.[1]);
          assert.ok(level >= 2, `${file}: ${tag} names no heading level`);
          // The deepest heading the page wrote before the block; the block's own is one below it.
          const above = [...text.slice(0, text.indexOf(tag)).matchAll(/^(#{2,5}) /gm)].at(-1)?.[1].length ?? 1;
          assert.equal(level, above + 1, `${file}: ${tag} stands under a heading of level ${above}`);
        }
      }
    }
    assert.equal(placed, blocks.length * folders.length);
  });
});

describe('a Markdown table of a page', () => {
  const headers = (file) => {
    const lines = read(`content/docs/${file}`).split('\n');
    return lines.filter((line, index) => /^\|\s*:?-{3,}/.test(lines[index + 1] ?? ''));
  };
  const first = (header) => header.split('|')[1].trim();
  /** The header row of the one table of a page that begins with `word`. */
  const begins = (file, word) => headers(file).filter((header) => first(header) === word);

  test('names its first column: no header row begins with an empty cell, on any page in any language', () => {
    let tables = 0;
    for (const file of pages) {
      tables += headers(file).length;
      assert.deepEqual(headers(file).filter((header) => first(header) === ''), [], file);
    }
    assert.ok(tables > 1000, `only ${tables} tables were found: the test no longer reads the pages`);
  });
  // What the word in a first header cell is chosen by: it says what the column holds, the same kind of table says it
  // with the same word, and at 390 wide it is not wider than the widest cell of its column — a longer word widens
  // the column, and a table that fitted the window then scrolls sideways (measured: «Component» over «Badge», «Chip»
  // and «Tag» made that table 24 px wider than the window; «Question» over «Holds» and «Chosen by», 2 px).
  test('the tables that compare components name their first column: the component, or the kind where its names are short', () => {
    // (Japanese says «種類», kind, on all of them: the language's word for a component is seven letters that a narrow
    // first column breaks in two. English and Spanish say the kind where every name in the column is one short word.)
    const component = { '': 'Component', 'ja/': '種類', 'zh-cn/': '组件', 'es/': 'Componente', 'hi/': 'कंपोनेंट', 'ar/': 'المكوّن' };
    const kind = { ...component, '': 'Kind', 'es/': 'Tipo' };
    for (const folder of folders) {
      for (const page of ['link', 'timeline', 'empty-state']) assert.equal(begins(`${folder}components/${page}.mdx`, component[folder]).length, 1, `${folder}components/${page}`);
      for (const page of ['badge', 'tag', 'steps', 'callout']) assert.equal(begins(`${folder}components/${page}.mdx`, kind[folder]).length, 1, `${folder}components/${page}`);
    }
  });
  test('a table that is turned — a component in each column, what is compared in each row — names its first column so', () => {
    const words = { '': 'Aspect', 'ja/': '観点', 'zh-cn/': '方面', 'es/': 'Aspecto', 'hi/': 'पहलू', 'ar/': 'الجانب' };
    for (const folder of folders) for (const page of ['color-field', 'number-field', 'combobox-field', 'select', 'popover', 'snackbar', 'navigation-bar', 'navigation-drawer']) assert.equal(begins(`${folder}components/${page}.mdx`, words[folder]).length, 1, `${folder}components/${page}`);
  });
  test('a table of one component’s own kinds names what its rows are: a form, a variant, a mark, a place', () => {
    // (Japanese heads the variants «種類» and the marked lines «行», the line, and Chinese the marked lines «行»: the
    // languages' words for a variant and a mark are broken in two by a column two letters wide.)
    const words = {
      'components/copy-button': { '': 'Form', 'ja/': '形', 'zh-cn/': '形式', 'es/': 'Forma', 'hi/': 'रूप', 'ar/': 'الهيئة' },
      'components/inline-code': { '': 'Variant', 'ja/': '種類', 'zh-cn/': '变体', 'es/': 'Variante', 'hi/': 'वेरिएंट', 'ar/': 'الطراز' },
      'components/code-block': { '': 'Mark', 'ja/': '行', 'zh-cn/': '行', 'es/': 'Marca', 'hi/': 'निशान', 'ar/': 'العلامة' },
      'foundations/words': { '': 'Place', 'ja/': '場所', 'zh-cn/': '地方', 'es/': 'Lugar', 'hi/': 'जगह', 'ar/': 'الموضع' },
    };
    for (const [page, word] of Object.entries(words)) for (const folder of folders) assert.ok(begins(`${folder}${page}.mdx`, word[folder]).length >= 1, `${folder}${page}`);
  });
});

describe('the Skeleton page’s "Load" demo', () => {
  test('holds its box in every language: a title of one line, and a text of exactly as many lines as its placeholder says', () => {
    for (const folder of folders) {
      const file = `content/docs/${folder}components/skeleton.mdx`;
      const text = read(file);
      const place = text.match(/<div data-skeleton-demo [^>]*>(.*)<\/div>/)?.[1];
      const [waiting, arrived] = [...text.slice(text.indexOf('data-skeleton-demo')).matchAll(/<template>(.*)<\/template>/g)].map((match) => match[1]);
      assert.ok(place && waiting && arrived, file);
      // What stands there at first is what arrives.
      assert.equal(place, arrived, file);
      const lines = Number(waiting.match(/<p [^>]*><span class="tanrei-skeleton-placeholder" data-lines="(\d+)">/)?.[1]);
      assert.ok(lines > 0, file);
      const paragraph = arrived.match(/<p style="([^"]*)">([^<]+)<\/p>/);
      assert.ok(paragraph, `${file}: the text is one paragraph of running text`);
      assert.match(paragraph[1], new RegExp(`min-block-size: ${lines}lh;`), file);
      assert.match(paragraph[1], new RegExp(`-webkit-line-clamp: ${lines};`), file);
      assert.match(paragraph[1], /display: -webkit-box; -webkit-box-orient: vertical;/, file);
      assert.match(paragraph[1], /overflow: hidden/, file);
      // The title is one line, as its placeholder is.
      assert.match(arrived, /<h3 style="[^"]*white-space: nowrap[^"]*">[^<]+<\/h3>/, file);
      assert.match(arrived.match(/<h3 style="([^"]*)">/)[1], /overflow: hidden; text-overflow: ellipsis/, file);
      assert.match(waiting, /<h3 [^>]*><span class="tanrei-skeleton-placeholder"[^>]*><\/span><\/h3>/, file);
    }
  });
});

describe('the sidebar', () => {
  test('lists every page written by hand: each English page outside components/, but the home page, has its line', () => {
    const config = fs.readFileSync(fileURLToPath(new URL('../astro.config.mjs', import.meta.url)), 'utf8');
    const english = pages.filter((file) => !folders.slice(1).some((folder) => file.startsWith(folder)) && !file.startsWith('components/'));
    const slugs = english.map((file) => file.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '')).filter(Boolean);
    assert.ok(slugs.includes('getting-started/ai-agents'));
    assert.deepEqual(slugs.filter((slug) => !config.includes(`'${slug}',`)), []);
  });
});
