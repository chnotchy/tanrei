// Every page as Markdown (src/lib/page-markdown.mjs): where a page's file is, what the conversion of a built page
// keeps and how, the marks of the parts drawn from a spec, the front matter, and the build's step over a folder of
// pages — with the date it is given, which is the sitemap's. No build: the pages here are written as the site writes
// them. test/browser/page-markdown.test.mjs reads the built site.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../../../packages/tools/src/test-tmp.js';
import { translations } from '../i18n/locales.mjs';
import { decodeEntities, demoteHeadings, frontMatter, markdownMark, markdownPathOf, pageMarkdown, pageMarkdownFiles, readPage, specSection } from '../src/lib/page-markdown.mjs';

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const languages = translations.map(({ dir }) => dir);
const url = 'https://tanrei.example/guide/';

/** A built page as the site writes it: its head, the page header and a body the search reads. */
const page = (body, { title = 'Guide', description = 'What the guide is for.', lang = 'en', canonical = url } = {}) =>
  `<!DOCTYPE html><html lang="${lang}" dir="ltr"><head><meta charset="utf-8"/><title>${title} | Tanrei</title><link rel="canonical" href="${canonical}"/><meta name="description" content="${description}"/></head><body><main id="main" data-pagefind-body lang="${lang}"><div class="docs-panel"><tanrei-page-header class="docs-page-header"><tanrei-breadcrumbs label="Breadcrumbs" data-pagefind-ignore><a href="/">Home</a></tanrei-breadcrumbs><h1>${title}</h1><p>${description}</p></tanrei-page-header><tanrei-description-list class="docs-page-facts"><dl><div><dt>Level</dt><dd>Base</dd></div></dl></tanrei-description-list></div><div class="docs-panel"><div class="sl-markdown-content tanrei-prose">${body}</div></div></main><footer><p>Not this</p></footer></body></html>`;
/** The Markdown of a page's body alone: what follows the front matter, the title and the description. */
const bodyOf = (html, options = {}) => pageMarkdown(html, { url, ...options }).split('\n> What the guide is for.\n\n')[1];

describe("a page's Markdown is beside it", () => {
  test('`<path>.md` for the page at `<path>/`, in every language', () => {
    assert.equal(markdownPathOf('/foundations/color/', languages), '/foundations/color.md');
    assert.equal(markdownPathOf('/foundations/color', languages), '/foundations/color.md');
    assert.equal(markdownPathOf('/components/button/index.html', languages), '/components/button.md');
    assert.equal(markdownPathOf('/ja/components/button/', languages), '/ja/components/button.md');
    assert.equal(markdownPathOf('/getting-started/', languages), '/getting-started.md');
  });
  test('`index.md` for the home page of each language', () => {
    assert.equal(markdownPathOf('/', languages), '/index.md');
    for (const dir of languages) assert.equal(markdownPathOf(`/${dir}/`, languages), `/${dir}/index.md`, dir);
  });
  test("the head links every page the search reads to it, and no other (Head.astro)", () => {
    const head = fs.readFileSync(here('../src/components/frame/Head.astro'), 'utf8');
    assert.match(head, /route\.entry\.data\.pagefind === false \? undefined : markdownPathOf\(Astro\.url\.pathname, translations\.map/);
    assert.match(head, /<link rel="alternate" type="text\/markdown" href=\{markdown\} \/>/);
  });
});

describe('reading the built page', () => {
  test('a page the search does not read has no Markdown', () => {
    assert.equal(readPage('<html><body><main><h1>Not found</h1></main></body></html>'), undefined);
    assert.equal(pageMarkdown('<html><body><main><h1>Not found</h1></main></body></html>', { url }), undefined);
  });
  test('the title and the description are the page header’s; the address is the canonical link', () => {
    const read = readPage(page('<p>Text.</p>', { title: 'Couleur &amp; forme', canonical: 'https://tanrei.example/es/guide/' }));
    assert.equal(read?.title, 'Couleur & forme');
    assert.equal(read?.description, 'What the guide is for.');
    assert.equal(read?.url, 'https://tanrei.example/es/guide/');
    assert.equal(read?.lang, 'en');
  });
  test('the page header, the breadcrumbs, the page’s facts and anything outside the body are left out of it', () => {
    const body = bodyOf(page('<p>Only this.</p>'));
    assert.equal(body, 'Only this.\n');
  });
  test('character references are the characters they stand for', () => {
    assert.equal(decodeEntities('&lt;a&gt; &amp; &#x27;b&#39; &quot;c&quot; &nbsp;&unknown;'), "<a> & 'b' \"c\"  &unknown;");
  });
});

describe('the conversion', () => {
  test('headings, paragraphs and inline markup', () => {
    const body = bodyOf(
      page(
        '<div class="tanrei-prose-heading"><h2 id="a">First <code>part</code></h2><a class="tanrei-prose-anchor" href="#a" data-pagefind-ignore><span class="tanrei-icon" aria-hidden="true">link</span></a></div>' +
          '<p>Some <strong>strong</strong>, <em>soft</em> and <code class="tanrei-code">co`de</code> words, a <a href="/foundations/color/">link</a>,\n a <a href="#a">place</a> and <kbd>Tab</kbd>.</p>' +
          '<h3>Second</h3><p>1. Not a list, *not* bold, [not] a link, &lt;not&gt; a tag.</p>',
      ),
    );
    assert.equal(
      body,
      [
        '## First `part`',
        '',
        'Some **strong**, _soft_ and ``co`de`` words, a [link](https://tanrei.example/foundations/color/), a [place](https://tanrei.example/guide/#a) and `Tab`.',
        '',
        '### Second',
        '',
        '1\\. Not a list, \\*not\\* bold, \\[not\\] a link, \\<not> a tag.',
        '',
      ].join('\n'),
    );
  });
  test("Tanrei's code block is a fenced block with its language, a line to each line", () => {
    const body = bodyOf(
      page(
        '<tanrei-code-block language="html" label="Usage" copy-label="Copy"><pre><code data-syntax-of="html"><span data-line><span data-line-code><span>&lt;</span><span>tanrei-button</span>&gt;Go&lt;/tanrei-button&gt;\n</span></span><span data-line><span data-line-code>\n</span></span><span data-line><span data-line-code>```\n</span></span></code></pre></tanrei-code-block>',
      ),
    );
    assert.equal(body, '````html\n<tanrei-button>Go</tanrei-button>\n\n```\n````\n');
  });
  test('a table is a GFM table, its first row the head, a pipe in a cell escaped', () => {
    const body = bodyOf(page('<tanrei-table label="Widths"><table><thead><tr><th><code>width</code></th><th>Use</th></tr></thead><tbody><tr><td>a | b</td><td><p>One.</p><p>Two.</p></td></tr></tbody></table></tanrei-table>'));
    assert.equal(body, '| `width` | Use |\n| --- | --- |\n| a \\| b | One. Two. |\n');
  });
  test('lists: nested, ordered from their start, and two lists apart', () => {
    const body = bodyOf(page('<ul><li>One<ul><li>Inner</li></ul></li><li><p>Two</p></li></ul><ol start="3"><li>Three</li><li>Four</li></ol><dl><div><dt>Term</dt><dd>Says <code>this</code>.</dd></div></dl>'));
    assert.equal(body, '- One\n  - Inner\n- Two\n\n3. Three\n4. Four\n\n- **Term**: Says `this`.\n');
  });
  test("a callout is a quote: its status's alert mark, its title, its body", () => {
    const body = bodyOf(page('<tanrei-callout size="large" status="warning" status-label="Caution"><p slot="title">Prerelease</p><div class="tanrei-prose"><p>It may change.</p><p>Pin it.</p></div></tanrei-callout><tanrei-callout><span slot="icon" data-pagefind-ignore>lightbulb</span><p slot="title">Tip</p><div><p>Try it.</p></div></tanrei-callout>'));
    assert.equal(body, '> [!WARNING]\n> **Prerelease**\n>\n> It may change.\n>\n> Pin it.\n\n> **Tip**\n>\n> Try it.\n');
  });
  test('each panel of a set of tabs stands under its label', () => {
    const body = bodyOf(page('<tanrei-tab-view label="Platform"><tanrei-tab-panel value="web" label="Web"><tanrei-code-block language="html"><pre><code>&lt;a&gt;</code></pre></tanrei-code-block></tanrei-tab-panel><tanrei-tab-panel value="swiftui" label="SwiftUI"><p>Its own idiom.</p></tanrei-tab-panel></tanrei-tab-view>'));
    assert.equal(body, '**Web**\n\n```html\n<a>\n```\n\n**SwiftUI**\n\nIts own idiom.\n');
  });
  test('link cards are the items of one list', () => {
    const card = (href, title, description) => `<tanrei-link-card class="docs-card"><a href="${href}"><span data-part="body"><span data-part="title">${title}</span><span data-part="description">${description}</span></span></a></tanrei-link-card><script type="module" src="/x.js"></script>`;
    const body = bodyOf(page(`<div class="docs-card-grid">${card('/a/', 'A', 'The first.')}${card('/b/', 'B', 'The second.')}</div>`));
    assert.equal(body, '- [A](https://tanrei.example/a/): The first.\n- [B](https://tanrei.example/b/): The second.\n');
  });
  test('an example the page draws is left out, and what is ignored, hidden, no text or navigation with it; an image stays', () => {
    const body = bodyOf(
      page(
        '<tanrei-figure class="demo"><figure><div data-part="frame"><header><p data-part="title">Variants</p><div data-part="actions" data-pagefind-ignore>x</div></header><div data-part="stage" data-pagefind-ignore><tanrei-button>Go</tanrei-button></div></div><figcaption>Every cell is held.</figcaption></figure></tanrei-figure>' +
          '<figure><img src="/brand.svg" alt="The mark"><figcaption>The mark.</figcaption></figure>' +
          '<p><a href="https://example.org/"><img class="tanrei-link-site-icon" src="/link-pictures/a.png" alt="">Kept</a><span aria-hidden="true">hidden</span><span hidden>gone</span><script>no()</script><style>p{}</style><button>no</button>.</p><div data-pagefind-ignore><p>Ignored.</p></div><nav class="tanrei-previous-next-links" aria-label="Previous / Next"><a href="/x/" rel="prev">Previous</a></nav>',
      ),
    );
    assert.equal(body, '![The mark](https://tanrei.example/brand.svg)\n\n[Kept](https://example.org/).\n');
  });
  test('a tag is its label; a heading with nothing under it is left out', () => {
    const body = bodyOf(page('<h2>Empty</h2><h3>Also empty</h3><h2>States</h2><tanrei-tag-group label="States"><tanrei-tag label="enabled"></tanrei-tag>, <tanrei-tag label="hovered"></tanrei-tag></tanrei-tag-group>'));
    assert.equal(body, '## States\n\nenabled, hovered\n');
  });
});

describe("the parts drawn from a component's spec", () => {
  const spec = '# Button\n\n> Lets people act.\n\n- Category: Actions\n\n## Props\n\n| Prop |\n| --- |\n\n### Item\n\n```md\n# not a heading\n```\n';
  test("the spec's Markdown loses its title and summary, and its headings go one level down, code left as it is", () => {
    assert.equal(specSection(spec), '- Category: Actions\n\n### Props\n\n| Prop |\n| --- |\n\n#### Item\n\n```md\n# not a heading\n```');
    assert.equal(demoteHeadings('# A\n````\n```\n# b\n```\n````\n## C', 2), '### A\n````\n```\n# b\n```\n````\n#### C');
  });
  test('`spec <name>` stands for the spec; `skip` leaves its part out', () => {
    const html = page(
      `<h2>Overview</h2>${markdownMark.skip}<div class="not-content availability"><p>Web: tanrei-button</p></div>${markdownMark.end}<p>Use it.</p>` +
        `<h2>Specs</h2>${markdownMark.spec('button')}<h3>Anatomy</h3><p>Drawn.</p>${markdownMark.end}` +
        `<h2>Accessibility</h2>${markdownMark.skip}<p>Role: button</p>${markdownMark.end}<h3>What you need to do</h3><p>Name it.</p>`,
    );
    const asked = [];
    const body = bodyOf(html, { spec: (name) => (asked.push(name), spec) });
    assert.deepEqual(asked, ['button']);
    assert.equal(body, '## Overview\n\nUse it.\n\n## Specs\n\n' + specSection(spec) + '\n\n## Accessibility\n\n### What you need to do\n\nName it.\n');
  });
  test('a mark with no end, or a spec with nothing to write it from, stops the build', () => {
    assert.throws(() => pageMarkdown(page(`${markdownMark.skip}<p>x</p>`), { url }), /no end mark/);
    assert.throws(() => pageMarkdown(page(`${markdownMark.spec('button')}<p>x</p>${markdownMark.end}`), { url }), /no spec was given/);
  });
  test('the components drawn from a spec leave the marks', () => {
    const source = (name) => fs.readFileSync(here(`../src/components/${name}.astro`), 'utf8');
    assert.match(source('ComponentSpecs'), /<Fragment set:html=\{markdownMark\.spec\(spec\.name\)\} \/>[\s\S]*<Fragment set:html=\{markdownMark\.end\} \/>/);
    for (const name of ['ComponentAvailability', 'ComponentAccessibility']) assert.match(source(name), /<Fragment set:html=\{markdownMark\.skip\} \/>[\s\S]*<Fragment set:html=\{markdownMark\.end\} \/>/, name);
  });
});

describe('the front matter', () => {
  test('title, description, address and the date the page last changed, in that order; an empty field left out', () => {
    assert.equal(frontMatter({ title: 'A "quoted" title', description: undefined, url, last_updated: '2026-10-17T09:30:00+09:00' }), `---\ntitle: "A \\"quoted\\" title"\nurl: "${url}"\nlast_updated: 2026-10-17T09:30:00+09:00\n---`);
  });
  test('stands at the top, then the title and the description', () => {
    const markdown = pageMarkdown(page('<p>Body.</p>'), { url, lastmod: (address) => (address === url ? '2026-10-01T00:00:00Z' : undefined) });
    assert.equal(markdown, `---\ntitle: "Guide"\ndescription: "What the guide is for."\nurl: "${url}"\nlast_updated: 2026-10-01T00:00:00Z\n---\n\n# Guide\n\n> What the guide is for.\n\nBody.\n`);
  });
});

describe('the build', () => {
  /** A built site in a folder: two pages, a translation, a component's page with its spec, a page the search does not read. */
  function site() {
    const dir = tempDir('page-markdown');
    const write = (file, text) => (fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }), fs.writeFileSync(path.join(dir, file), text));
    write('index.html', page('<p>Home.</p>', { title: 'Home', canonical: 'https://tanrei.example/' }));
    write('ja/index.html', page('<p>ホーム。</p>', { title: 'ホーム', lang: 'ja', canonical: 'https://tanrei.example/ja/' }));
    write('components/button/index.html', page(`<h2>Specs</h2>${markdownMark.spec('button')}<p>Table.</p>${markdownMark.end}`, { title: 'Button', canonical: 'https://tanrei.example/components/button/' }));
    write('ja/components/button/index.html', page(`<p>使い方。</p><h2>仕様</h2>${markdownMark.spec('button')}<p>表。</p>${markdownMark.end}`, { title: 'ボタン', lang: 'ja', canonical: 'https://tanrei.example/ja/components/button/' }));
    write('components/button.md', '# Button\n\n> Lets people act.\n\n## Props\n\nNone.\n');
    write('404.html', '<html><body><main><h1>Not found</h1></main></body></html>');
    return dir;
  }
  async function build(dir, lastmod) {
    const integration = pageMarkdownFiles({ languages, lastmod });
    const messages = [];
    await integration.hooks['astro:config:done']({ config: { site: 'https://tanrei.example' } });
    await integration.hooks['astro:build:done']({ dir: new URL(`file://${dir}/`), logger: { info: (message) => messages.push(message) } });
    return messages;
  }

  test('writes every page the search reads beside it, dated by the function it is given', async () => {
    const dir = site();
    const asked = [];
    const dates = { 'https://tanrei.example/': '2026-10-01T00:00:00Z', 'https://tanrei.example/ja/components/button/': '2026-10-02T00:00:00+09:00' };
    const messages = await build(dir, (address) => (asked.push(address), dates[address]));
    assert.deepEqual(messages, ['4 pages as Markdown']);
    assert.deepEqual(asked.sort(), ['https://tanrei.example/', 'https://tanrei.example/components/button/', 'https://tanrei.example/ja/', 'https://tanrei.example/ja/components/button/']);
    const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');
    assert.match(read('index.md'), /^---\ntitle: "Home"\ndescription: "What the guide is for."\nurl: "https:\/\/tanrei.example\/"\nlast_updated: 2026-10-01T00:00:00Z\n---\n/);
    assert.doesNotMatch(read('ja/index.md'), /last_updated/, 'a page no commit dates has no date');
    assert.ok(!fs.existsSync(path.join(dir, '404.md')));
  });
  test("a component's page holds its spec, in every language, and its English page takes the spec's place", async () => {
    const dir = site();
    await build(dir, () => undefined);
    const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');
    assert.equal(read('components/button.md').split('\n> What the guide is for.\n\n')[1], '## Specs\n\n### Props\n\nNone.\n');
    assert.equal(read('ja/components/button.md').split('\n> What the guide is for.\n\n')[1], '使い方。\n\n## 仕様\n\n### Props\n\nNone.\n');
  });
  test('the site gives it the sitemap’s dates: the same function, read once (astro.config.mjs)', () => {
    const config = fs.readFileSync(here('../astro.config.mjs'), 'utf8');
    assert.match(config, /pageMarkdownFiles\(\{ languages: translations\.map\(\(\{ dir \}\) => dir\), lastmod: lastmod\.of \}\)/);
    assert.match(config, /const date = lastmod\.of\(item\.url\);/);
  });
});
