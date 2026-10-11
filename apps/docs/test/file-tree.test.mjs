// A page's tree of files, said in the words of Tanrei's Tree view (src/lib/file-tree.mjs): what a Markdown list
// becomes, what is refused, and that the six pages that draw one say the same tree in every language — through the
// site's own Markdown pipeline (test/site-pipeline.mjs), so the list is the list the site renders. And what the search
// index reads of a row, asked of the index itself (test/index-reads.mjs): a name and its note are two words.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fileItems, fileTree } from '../src/lib/file-tree.mjs';
import { translations } from '../i18n/locales.mjs';
import { close, indexReads } from './index-reads.mjs';
import { configure, elements, mdxHtml, renderers, text } from './site-pipeline.mjs';

const site = await renderers(await configure());
/** A list between the component's tags, rendered by the site's pipeline and handed to the mapping as the component is. */
const drawn = async (list) => mdxHtml(await site.mdx(`<FileTree>\n\n${list}\n\n</FileTree>\n`), { FileTree: ({ children }) => ({ html: fileTree(children.html) }) });
const flat = (items) => items.flatMap((item) => [item, ...flat(item.items)]);
const docs = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
const pages = (folder = docs) => fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? pages(`${folder}${entry.name}/`) : entry.name.endsWith('.mdx') ? [`${folder}${entry.name}`] : []));
/** The pages that draw a tree, in every language, and the list each writes between the component's tags. */
const withTree = pages().filter((file) => /<FileTree[\s>]/.test(fs.readFileSync(file, 'utf8')));
const block = (file) => /<FileTree>\n([\s\S]*?)\n<\/FileTree>/.exec(fs.readFileSync(file, 'utf8'))?.[1] ?? assert.fail(`${file}: no <FileTree> block`);

describe('a Markdown list as a tree of files', () => {
  test('an item is its name and the note after it', async () => {
    const html = await drawn('- tokens/ source of truth, edited by hand\n- README.md');
    assert.equal(
      html,
      '<ul>' +
        '<li><span><span class="tanrei-icon" aria-hidden="true" data-pagefind-ignore>folder</span><span><bdi dir="ltr"><code>tokens/</code></bdi><br hidden><small data-supporting-text>source of truth, edited by hand</small></span></span></li>' +
        '<li><span><span class="tanrei-icon" aria-hidden="true" data-pagefind-ignore>draft</span><span><bdi dir="ltr"><code>README.md</code></bdi></span></span></li>' +
        '</ul>',
    );
  });
  test('a folder that holds a list is a parent, written open; one that holds none is a leaf', async () => {
    const html = await drawn('- tokens/\n  - ref/\n  - tanrei.resolver.json\n- design/tokens/');
    const items = elements(html, 'li');
    assert.deepEqual(items.map((item) => item.has('data-open')), [true, false, false, false]);
    assert.equal(html.match(/<ul>/g)?.length, 2);
    // The item's own list follows its row, inside the item (tree-view.css: the row is the item's first child element).
    assert.match(html, /^<ul><li data-open><span>.*?<\/span><ul><li><span>/);
    // A glyph's name is a ligature's text, not a word of the page: each carries the search index's ignore mark.
    assert.deepEqual([...html.matchAll(/aria-hidden="true" data-pagefind-ignore>([a-z_]+)</g)].map((glyph) => glyph[1]), ['folder', 'folder', 'draft', 'folder']);
  });
  test('an item that holds a list is a folder whatever its name ends with', () => {
    const [item] = fileItems('<ul><li>packages<ul><li>web</li></ul></li></ul>');
    assert.equal(item.folder, true);
    assert.equal(item.items[0].folder, false);
  });
  test('no item has a value, a selection or a control: the tree is read and opened', async () => {
    const html = await drawn('- tokens/ source of truth\n  - ref/\n- packages/\n  - web/src/generated/tokens.css');
    assert.doesNotMatch(html, /data-value|aria-selected|data-expandable|data-disabled|<a\b|<button\b/);
  });
  test('a name is left to right and in the code face, whatever the note is written in', async () => {
    const html = await drawn('- tokens/ مصدر الحقيقة، يُحرَّر باليد');
    assert.match(html, /<bdi dir="ltr"><code>tokens\/<\/code><\/bdi><br hidden><small data-supporting-text>مصدر الحقيقة، يُحرَّر باليد<\/small>/);
  });
  test('a note keeps the inline markup the author gave it; a name is text', async () => {
    const html = await drawn('- generated/ written by `pnpm generate`, **never** by hand\n- **bold.md**');
    // (The pipeline's own step gives inline code `dir="auto"`: the note is the page's Markdown, as the pipeline renders it.)
    assert.match(html, /<small data-supporting-text>written by <code dir="auto">pnpm generate<\/code>, <strong>never<\/strong> by hand<\/small>/);
    assert.match(html, /<bdi dir="ltr"><code>bold\.md<\/code><\/bdi>/);
  });
  test('a path with an ellipsis is one name, and a row that only says more follows has no glyph', async () => {
    const html = await drawn('- swiftui/…/Generated/TanreiTokens.swift\n- …');
    assert.match(html, /<code>swiftui\/…\/Generated\/TanreiTokens\.swift<\/code>/);
    assert.match(html, /<li><span><span>…<\/span><\/span><\/li>/);
  });
  test('a list whose items are set apart by blank lines is the same tree', async () => {
    assert.equal(await drawn('- a/ one\n\n- b.md two'), await drawn('- a/ one\n- b.md two'));
  });
  test('anything but one list of names is refused, with what was found', () => {
    assert.throws(() => fileTree('<ol><li>a</li></ol>'), /numbered/);
    assert.throws(() => fileTree('<ul><li>a</li></ul><ul><li>b</li></ul>'), /a second list/);
    assert.throws(() => fileTree('<p>A sentence.</p>'), /stands outside an item/);
    assert.throws(() => fileTree('<ul><li>a<ul><li>b</li></ul>and more</li></ul>'), /after an item's own list/);
    assert.throws(() => fileTree('<ul><li>a</li></ul><p>after</p>'), /stands outside an item|follows the list/);
    assert.throws(() => fileTree('<ul><li> </li></ul>'), /no name/);
    assert.throws(() => fileTree(''), /no item/);
  });
});

describe('a row of the tree, to the search index', () => {
  after(close);
  /** The words the index holds for a piece of markup. */
  const words = async (html, lang) => (await indexReads([html], lang))[0].split(/\s+/);

  test('a name and its note are parted by a line break that is hidden, and by nothing that is drawn', async () => {
    const html = await drawn('- tokens/ source of truth\n  - ref/\n  - tanrei.resolver.json one file that says how the sets combine\n- README.md\n- … and the rest');
    // One break for each row that has a note, directly between the name's element and the note's.
    assert.equal(html.match(/<br hidden>/g)?.length, 3);
    assert.equal(html.match(/<small data-supporting-text>/g)?.length, 3);
    assert.equal(html.match(/(?:<\/bdi>|…)<br hidden><small data-supporting-text>/g)?.length, 3);
    // No white space stands between two tags, or between a tag and the text beside it: a space there would be drawn
    // (the name and the note are inline boxes of one line), and the tree view sets the note apart by its own gap.
    assert.doesNotMatch(html, />\s+<|<br hidden>\s|\s<br hidden>|\s<\/(?:code|small)>|<(?:code|small)[^>]*>\s/);
    // A hidden element makes no box, and the break carries nothing else: no class, no attribute the tree view reads.
    assert.doesNotMatch(html, /<br(?! hidden>)/);
  });
  test('the index reads the name and the note as two words, in a page written left to right and in one written right to left', async () => {
    const english = await words(await drawn('- tokens/ source of truth, edited by hand\n  - ref/\n  - tanrei.resolver.json one file\n- README.md'));
    for (const word of ['tokens/', 'source', 'ref/', 'tanrei.resolver.json', 'one', 'README.md.']) assert.ok(english.includes(word), `${word}: ${english.join(' ')}`);
    assert.ok(!english.some((word) => /^tokens\/\S|json\S/.test(word)), english.join(' '));
    // No glyph's name is among them.
    assert.ok(!english.some((word) => /^(folder|draft)/.test(word)), english.join(' '));
    const arabic = await words(await drawn('- tokens/ مصدر الحقيقة، يُحرَّر باليد'), 'ar');
    assert.equal(arabic[0], 'tokens/', arabic.join(' '));
    assert.equal(arabic[1], 'مصدر', arabic.join(' '));
  });
  test('without the break the index would read them as one word: the break is what parts them', async () => {
    const html = await drawn('- tokens/ source of truth');
    const [joined] = await indexReads([html.replaceAll('<br hidden>', '')]);
    assert.match(joined, /^tokens\/source of truth/);
  });
  test('every tree a page draws reads so: no name is joined to the note after it', async () => {
    const trees = await Promise.all(withTree.map(async (file) => drawn(block(file))));
    const read = await indexReads(trees);
    for (const [at, file] of withTree.entries()) {
      const names = [...trees[at].matchAll(/<bdi dir="ltr"><code>([^<]*)<\/code><\/bdi>(<br hidden>)?/g)];
      assert.ok(names.length > 0, file);
      const held = read[at].split(/\s+/);
      for (const [, name, noted] of names) {
        // (A name the page's renderer escaped is read as the character it stands for.)
        const word = name.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
        assert.ok(held.some((one) => one === word || one === `${word}.`), `${file}: «${word}» is not a word of its own to the index${noted ? ' (a note follows it)' : ''}`);
      }
    }
  });
});

describe('the pages that draw a tree of files', () => {

  test("import the docs' component, and none the framework's", () => {
    assert.ok(withTree.length > 0);
    for (const file of pages()) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /import \{[^}]*\bFileTree\b[^}]*\} from '@astrojs\/starlight\/components'/, file);
    for (const file of withTree) assert.match(fs.readFileSync(file, 'utf8'), /^import FileTree from '(\.\.\/)+components\/FileTree\.astro';$/m, file);
  });
  test('say the same tree in every language: the names and the folders of the English page, a note wherever it has one', async () => {
    const english = withTree.filter((file) => !translations.some(({ dir }) => file.startsWith(`${docs}${dir}/`)));
    for (const source of english) {
      const path = source.slice(docs.length);
      const shape = (items) => flat(items).map(({ name, folder, note, items: held }) => [name, folder, Boolean(note), held.length]);
      const rendered = async (file) => fileItems(mdxHtml(await site.mdx(`<FileTree>\n\n${block(file)}\n\n</FileTree>\n`), { FileTree: ({ children }) => children }).trim());
      const expected = shape(await rendered(source));
      assert.ok(expected.length > 1, path);
      for (const { dir } of translations) {
        const translated = `${docs}${dir}/${path}`;
        if (!fs.existsSync(translated)) continue;
        assert.deepEqual(shape(await rendered(translated)), expected, `${dir}/${path}`);
      }
    }
  });
  test('draw every name once, as text a reader without script can read', async () => {
    for (const file of withTree) {
      const html = await drawn(block(file));
      const names = [...html.matchAll(/<bdi dir="ltr"><code>([^<]*)<\/code><\/bdi>/g)].map((name) => name[1]);
      assert.equal(names.length, elements(html, 'li').length, file);
      for (const name of names) assert.ok(text(html).includes(name), `${file}: ${name}`);
    }
  });
});
