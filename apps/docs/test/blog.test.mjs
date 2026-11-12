// The blog (src/lib/blog.ts): which file is a post and in which language, what each language's list holds and names,
// where the header's menu of languages leads from a post, which image of a shared link each page names and which the
// build draws, the post as structured data, the blog's words in the six languages, and each language's feed — RSS 2.0
// that an XML parser reads in its strict mode, with what the specification asks of a channel and of an item.
//
// The posts are the fixtures of `test/fixtures/blog/`, laid out as `src/content/blog/` is: the site builds none of
// them, and ships with no post. The built site's blog is read by test/browser/sitemap.test.mjs, seo.test.mjs and
// page-markdown.test.mjs with the rest of its pages.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import sax from 'sax';

register('./vite-shim.mjs', import.meta.url);
const blog = await import('../src/lib/blog.ts');
const { strings } = await import('../src/lib/i18n.ts');
const { config } = await import('../src/lib/repo.ts');
const { author: ownerPerson } = await import('../src/lib/seo.ts');
const { source, translations } = await import('../i18n/locales.mjs');

const docs = fileURLToPath(new URL('../', import.meta.url));
const fixtures = path.join(docs, 'test/fixtures/blog');
const site = new URL(config.site);
const languages = [source, ...translations];
const owner = config.repository.public.split('/')[0];

/** A fixture's front matter: `key: value` lines, a value in single quotes as written inside them. */
function frontMatter(text) {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '';
  return Object.fromEntries([...block.matchAll(/^([a-z]+): (.*)$/gm)].map(([, key, value]) => [key, value.startsWith("'") ? value.slice(1, -1).replaceAll("''", "'") : value]));
}

/** The fixtures as the site reads its posts (lib/blog-posts.ts): language and name from the path, the owner where no author is named. */
const posts = fs
  .readdirSync(fixtures, { recursive: true, encoding: 'utf8' })
  .map((file) => file.split(path.sep).join('/'))
  .filter((file) => /\.mdx?$/.test(file))
  .map((file) => {
    const data = frontMatter(fs.readFileSync(path.join(fixtures, file), 'utf8'));
    return { ...blog.postOf(file), data: { title: data.title, description: data.description, date: new Date(data.date), author: data.author ?? blog.owner } };
  });

describe('a post', () => {
  test('is a file named as its address, in English at the folder’s root or in a language’s folder', () => {
    assert.deepEqual(blog.postOf('hello.md'), { dir: '', slug: 'hello' });
    assert.deepEqual(blog.postOf('ja/hello.mdx'), { dir: 'ja', slug: 'hello' });
    assert.deepEqual(blog.postOf('zh-cn/two-words.md'), { dir: 'zh-cn', slug: 'two-words' });
    for (const file of ['Hello.md', 'hello world.md', 'fr/hello.md', 'ja/2026/hello.md', 'hello.txt', 'en/hello.md', '-hello.md']) assert.throws(() => blog.postOf(file), /is no post/, file);
  });

  test('the fixtures are posts of two languages and one of a language alone, by the owner', () => {
    assert.deepEqual(posts.map(({ dir, slug }) => `${dir}/${slug}`).sort(), ['/hello-tanrei', 'hi/only-in-hindi', 'ja/hello-tanrei']);
    for (const post of posts) {
      assert.ok(post.data.title && post.data.description && !Number.isNaN(post.data.date.getTime()), `${post.dir}/${post.slug}`);
      assert.equal(post.data.author, owner);
    }
  });

  test('is in the languages it is written in, and its page in another links to the post where it is written in it, else to that language’s list', () => {
    assert.deepEqual(blog.languagesOf(posts, 'hello-tanrei'), ['', 'ja']);
    assert.deepEqual(blog.languagesOf(posts, 'only-in-hindi'), ['hi']);
    assert.deepEqual(
      blog.translationsOf(posts, { dir: '', slug: 'hello-tanrei' }).map(({ lang, label, href }) => [lang, label, href]),
      [['ja', '日本語', '/ja/blog/hello-tanrei/']],
    );
    assert.deepEqual(blog.translationsOf(posts, { dir: 'hi', slug: 'only-in-hindi' }), []);
    const post = { kind: 'post', slug: 'hello-tanrei' };
    assert.deepEqual(
      languages.map(({ dir }) => blog.blogPageIn(posts, post, dir)),
      ['/blog/hello-tanrei/', '/ja/blog/hello-tanrei/', '/zh-cn/blog/', '/hi/blog/', '/es/blog/', '/ar/blog/'],
    );
    assert.deepEqual(
      languages.map(({ dir }) => blog.blogPageIn(posts, { kind: 'list' }, dir)),
      ['/blog/', '/ja/blog/', '/zh-cn/blog/', '/hi/blog/', '/es/blog/', '/ar/blog/'],
    );
  });

  test('is a blog page by its page id; nothing else is', () => {
    assert.deepEqual(blog.blogPageOf('blog'), { kind: 'list' });
    assert.deepEqual(blog.blogPageOf('blog/hello'), { kind: 'post', slug: 'hello' });
    for (const page of ['index', 'blogs', 'components/blog', 'blog/a/b', '404']) assert.equal(blog.blogPageOf(page), undefined, page);
  });

  test('is structured data of its own: a BlogPosting by the owner, as every page names the owner', () => {
    const [post] = blog.postsIn(posts, '');
    const data = blog.blogPosting('https://example.test/blog/hello-tanrei/', post, 'en', '2026-11-12T00:00:00.000Z');
    assert.deepEqual(data, {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.data.title,
      description: post.data.description,
      url: 'https://example.test/blog/hello-tanrei/',
      mainEntityOfPage: 'https://example.test/blog/hello-tanrei/',
      inLanguage: 'en',
      datePublished: '2026-11-10',
      dateModified: '2026-11-12T00:00:00.000Z',
      author: ownerPerson,
    });
    assert.deepEqual(blog.authorPerson('someone-else'), { '@type': 'Person', name: 'someone-else' });
  });

  test('says the day it was published as the day it names, in the page’s language', () => {
    const date = new Date('2026-11-10');
    assert.deepEqual(blog.publishedParts(date, 'en'), { datetime: '2026-11-10', text: 'November 10, 2026' });
    assert.deepEqual(blog.publishedParts(date, 'ja'), { datetime: '2026-11-10', text: '2026年11月10日' });
  });
});

describe('a language’s list', () => {
  test('holds its own posts only, newest first', () => {
    const more = [...posts, { dir: '', slug: 'later', data: { ...posts[0].data, title: 'Later', date: new Date('2026-12-01') } }];
    assert.deepEqual(blog.postsIn(more, '').map((post) => post.slug), ['later', 'hello-tanrei']);
    assert.deepEqual(blog.postsIn(more, 'ja').map((post) => post.slug), ['hello-tanrei']);
    assert.deepEqual(blog.postsIn(more, 'es'), []);
  });

  test('names the other languages that have posts, each by its own name, linked to its list', () => {
    assert.deepEqual(
      blog.otherLanguages(posts, '').map(({ lang, label, href }) => [lang, label, href]),
      [
        ['ja', '日本語', '/ja/blog/'],
        ['hi', 'हिन्दी', '/hi/blog/'],
      ],
    );
    assert.deepEqual(blog.otherLanguages(posts, 'es').map(({ dir }) => dir), ['', 'ja', 'hi']);
    assert.deepEqual(blog.otherLanguages([], ''), []);
  });
});

describe('the image of a shared link', () => {
  test('of each blog page is one the build draws, and the build draws none no page names', () => {
    const drawn = new Set(blog.blogImages(posts).map(({ dir, page }) => `/og/${dir ? `${dir}/` : ''}${page}.png`));
    const named = new Set();
    for (const { dir } of languages) named.add(blog.blogImagePath(posts, dir, { kind: 'list' }));
    for (const post of posts) named.add(blog.blogImagePath(posts, post.dir, { kind: 'post', slug: post.slug }));
    assert.deepEqual([...named].sort(), [...drawn].sort());
    // A language the build has no face for names the English page's: the post where it is written in English, else the list.
    assert.equal(blog.blogImagePath(posts, 'hi', { kind: 'post', slug: 'only-in-hindi' }), '/og/blog.png');
    assert.equal(blog.blogImagePath(posts, 'zh-cn', { kind: 'list' }), '/og/blog.png');
    assert.equal(blog.blogImagePath([...posts, { ...posts[0], dir: 'hi' }], 'hi', { kind: 'post', slug: 'hello-tanrei' }), '/og/blog/hello-tanrei.png');
    assert.equal(blog.blogImagePath(posts, 'ja', { kind: 'post', slug: 'hello-tanrei' }), '/og/ja/blog/hello-tanrei.png');
  });

  test('with no post, is each language’s list', () => {
    assert.deepEqual(blog.blogImages([]).map(({ dir, page }) => `${dir}/${page}`), languages.filter(({ imageFaces }) => imageFaces !== null).map(({ dir }) => `${dir}/blog`));
  });
});

describe('the words', () => {
  test('are in the six languages, each its own; the system’s name in place', () => {
    const keys = Object.keys(strings('en').blog);
    for (const { lang } of languages) {
      const t = strings(lang).blog;
      assert.deepEqual(Object.keys(t), keys, lang);
      for (const key of keys) assert.ok(t[key].trim(), `${lang}: ${key}`);
      const words = blog.blogWords(lang);
      assert.ok(words.description.includes(config.name) && !words.description.includes('{name}'), lang);
      assert.ok(words.feedTitle.includes(config.name) && !words.feedTitle.includes('{name}'), lang);
      if (lang !== 'en') for (const key of ['description', 'empty', 'otherLanguages', 'alsoIn']) assert.notEqual(t[key], strings('en').blog[key], `${lang}: ${key} is English`);
    }
  });
});

// ── The feed ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A feed read by sax in its strict mode (a document that is not well-formed XML throws), as a tree of elements. */
function parseXml(text) {
  const parser = sax.parser(true, { xmlns: false });
  const root = { name: '#document', attributes: {}, children: [], text: '' };
  const stack = [root];
  parser.onerror = (error) => {
    throw error;
  };
  parser.onopentag = (node) => {
    const element = { name: node.name, attributes: node.attributes, children: [], text: '' };
    stack.at(-1).children.push(element);
    stack.push(element);
  };
  parser.onclosetag = () => stack.pop();
  parser.ontext = (text) => (stack.at(-1).text += text);
  parser.oncdata = (text) => (stack.at(-1).text += text);
  parser.write(text).close();
  return root;
}
const child = (element, name) => element.children.find((each) => each.name === name);
const children = (element, name) => element.children.filter((each) => each.name === name);
/** RFC 822 as RSS writes it (with a four-digit year, RFC 1123): `Tue, 10 Nov 2026 00:00:00 GMT`. */
const RFC822 = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;

describe('each language’s feed', () => {
  for (const { dir, lang } of languages) {
    test(`${lang}: is RSS 2.0, its channel and its items as the specification asks`, () => {
      const text = blog.rssFeed(posts, dir, site);
      assert.ok(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));
      const document = parseXml(text);
      assert.equal(document.children.length, 1);
      const rss = document.children[0];
      assert.equal(rss.name, 'rss');
      assert.equal(rss.attributes.version, '2.0');
      assert.equal(rss.attributes['xmlns:atom'], 'http://www.w3.org/2005/Atom');
      assert.equal(rss.attributes['xmlns:dc'], 'http://purl.org/dc/elements/1.1/');
      const channels = children(rss, 'channel');
      assert.equal(channels.length, 1);
      const [channel] = channels;
      const words = blog.blogWords(lang);
      assert.equal(child(channel, 'title').text, words.feedTitle);
      assert.equal(child(channel, 'description').text, words.description);
      assert.equal(child(channel, 'link').text, new URL(blog.blogHref(dir), site).href);
      assert.equal(child(channel, 'language').text, lang.toLowerCase());
      const self = child(channel, 'atom:link');
      assert.deepEqual(self.attributes, { href: new URL(blog.feedHref(dir), site).href, rel: 'self', type: 'application/rss+xml' });
      const own = blog.postsIn(posts, dir);
      const items = children(channel, 'item');
      assert.equal(items.length, own.length);
      if (own.length) assert.equal(child(channel, 'lastBuildDate').text, own[0].data.date.toUTCString());
      else assert.equal(child(channel, 'lastBuildDate'), undefined);
      items.forEach((item, at) => {
        const post = own[at];
        const link = new URL(blog.postHref(dir, post.slug), site).href;
        assert.equal(child(item, 'title').text, post.data.title);
        assert.equal(child(item, 'link').text, link);
        assert.deepEqual([child(item, 'guid').text, child(item, 'guid').attributes.isPermaLink], [link, 'true']);
        assert.match(child(item, 'pubDate').text, RFC822);
        assert.equal(Date.parse(child(item, 'pubDate').text), post.data.date.getTime());
        assert.equal(child(item, 'dc:creator').text, post.data.author);
        assert.equal(child(item, 'description').text, post.data.description);
      });
    });
  }

  test('escapes what XML does not take as text (the English fixture’s title holds & and <)', () => {
    const text = blog.rssFeed(posts, '', site);
    assert.ok(text.includes('<title>Hello &amp; welcome: &lt;a fixture post&gt;</title>'));
  });

  test('with no post, is a channel with no item', () => {
    for (const { dir } of languages) {
      const channel = child(parseXml(blog.rssFeed([], dir, site)).children[0], 'channel');
      assert.deepEqual(children(channel, 'item'), []);
      assert.ok(child(channel, 'title') && child(channel, 'link') && child(channel, 'description'));
    }
  });

  test('a document that is not well-formed is refused by the parser the feeds are read with', () => {
    assert.throws(() => parseXml('<rss version="2.0"><channel><title>a & b</title></channel></rss>'));
    assert.throws(() => parseXml('<rss><channel></rss>'));
  });

  test('every page of the blog names its language’s feed in its head', () => {
    for (const { dir, lang } of languages) {
      assert.deepEqual(blog.feedLink(dir), { tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: blog.blogWords(lang).feedTitle, href: blog.feedHref(dir) } });
    }
  });
});
