// The blog: posts the owner of the repository writes, each in the languages its author wrote it in. Nothing here is
// translated by a machine, and no language has a page for a post it does not have: a post is a file of
// `src/content/blog/` (the collection `blog`, src/content.config.ts), English at the folder's root and every other
// language under its own folder, as the documentation's pages are (`hello.md`, `ja/hello.md`). One name in several
// languages is one post in each of them.
//
//   /blog/, /<language>/blog/                 the list of a language's posts, newest first, in every language of the
//                                             site; an empty list says so, and names the languages that have posts
//                                             (components/blog/BlogList.astro);
//   /blog/<name>/, /<language>/blog/<name>/   a post, only in the languages it is written in
//                                             (components/blog/BlogPost.astro), its head naming those languages alone
//                                             (`hreflang`, `og:locale:alternate`; src/routeData.ts);
//   /blog/rss.xml, /<language>/blog/rss.xml   each language's feed, RSS 2.0 (`rssFeed`).
//
// A list shows only its own language's posts, as a multilingual site built with Hugo or Docusaurus lists each
// language's own: one language's list, its feed, its search index and its `hreflang` all name the same posts. The
// languages that have posts the list's does not are named under it, each linked to its own list, so that no post is
// hidden from a reader who reads more than one.
//
// Plain functions, so that Node can test them without the site (test/blog.test.mjs).
import { source, translations } from '../../i18n/locales.mjs';
import { strings } from './i18n';
import { author as ownerPerson, drawsLanguage } from './seo';
import { config } from './repo';

/** What a post says of itself, in its front matter (src/content.config.ts). */
export interface PostData {
  title: string;
  description: string;
  /** The day it was published. */
  date: Date;
  /** Who wrote it: the account that owns the repository unless the post names another. */
  author: string;
}

/** A post in one language: its language's folder (`''` for English), its name, and what it says of itself. */
export interface Post {
  dir: string;
  slug: string;
  data: PostData;
}

/** The languages of the site, the source first: their folder, tag and name in their own words. */
export const blogLanguages = [source, ...translations].map(({ dir, lang, label }) => ({ dir, lang, label }));

const languageOf = (dir: string) => {
  const language = blogLanguages.find((each) => each.dir === dir);
  if (!language) throw new Error(`blog: no language of the site has the folder "${dir}"`);
  return language;
};

/** The account that owns the repository: a post's author where it names none. */
export const owner = (config.repository.public as string).split('/')[0];

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A post's language and name, from its file's path under `src/content/blog/` (`hello.md`, `ja/hello.mdx`). The name
 * is the post's address, written as one: lowercase words joined by hyphens. Any other path stops the build.
 */
export function postOf(file: string): { dir: string; slug: string } {
  const parts = file.replace(/\.mdx?$/, '').split('/');
  const dir = parts.length === 2 ? parts[0] : '';
  const slug = parts.at(-1) ?? '';
  if (parts.length > 2 || (parts.length === 2 && !translations.some((language) => language.dir === dir)) || !NAME.test(slug) || !/\.mdx?$/.test(file)) {
    throw new Error(`blog: ${file} is no post: a post is <name>.md (English) or <language>/<name>.md, its name lowercase words joined by hyphens, its language one of ${translations.map((language) => language.dir).join(', ')}`);
  }
  return { dir, slug };
}

const base = (dir: string) => (dir ? `/${dir}` : '');
/** The address of a language's list of posts. */
export const blogHref = (dir: string) => `${base(dir)}/blog/`;
/** The address of a post in a language. */
export const postHref = (dir: string, slug: string) => `${base(dir)}/blog/${slug}/`;
/** The address of a language's feed. */
export const feedHref = (dir: string) => `${base(dir)}/blog/rss.xml`;

/** A page of the blog by its page id within its language (lib/seo.ts, `pageOf`): its list, or a post by its name. */
export function blogPageOf(page: string): { kind: 'list' } | { kind: 'post'; slug: string } | undefined {
  if (page === 'blog') return { kind: 'list' };
  const slug = /^blog\/([^/]+)$/.exec(page)?.[1];
  return slug ? { kind: 'post', slug } : undefined;
}

/** A language's posts, newest first; two of one day by their titles. */
export function postsIn(posts: readonly Post[], dir: string): Post[] {
  return posts.filter((post) => post.dir === dir).sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.title.localeCompare(b.data.title));
}

/** The languages a post is written in, in the site's order. */
export function languagesOf(posts: readonly Post[], slug: string): string[] {
  return blogLanguages.map((language) => language.dir).filter((dir) => posts.some((post) => post.slug === slug && post.dir === dir));
}

/** The other languages that have posts, in the site's order, each with its list's address. */
export function otherLanguages(posts: readonly Post[], dir: string): { dir: string; lang: string; label: string; href: string }[] {
  return blogLanguages.filter((language) => language.dir !== dir && posts.some((post) => post.dir === language.dir)).map((language) => ({ ...language, href: blogHref(language.dir) }));
}

/** The other languages a post is written in, each with the post's address in it. */
export function translationsOf(posts: readonly Post[], post: Pick<Post, 'dir' | 'slug'>): { dir: string; lang: string; label: string; href: string }[] {
  return languagesOf(posts, post.slug)
    .filter((dir) => dir !== post.dir)
    .map((dir) => ({ ...languageOf(dir), href: postHref(dir, post.slug) }));
}

/**
 * The address of a blog page in another language, for the header's menu of languages: the same post where it is
 * written in that language, else that language's list; a list is in every language.
 */
export function blogPageIn(posts: readonly Post[], page: { kind: 'list' } | { kind: 'post'; slug: string }, dir: string): string {
  return page.kind === 'post' && posts.some((post) => post.slug === page.slug && post.dir === dir) ? postHref(dir, page.slug) : blogHref(dir);
}

/**
 * The image of a shared link of a blog page (src/pages/og/[...slug].png.ts draws them): a list's in its language
 * where the build has a face for it, else the English list's; a post's in its language where the build has a face for
 * it, else the English post's where there is one, else the English list's.
 */
export function blogImagePath(posts: readonly Post[], dir: string, page: { kind: 'list' } | { kind: 'post'; slug: string }): string {
  if (page.kind === 'post') {
    if (drawsLanguage(dir)) return `/og/${dir ? `${dir}/` : ''}blog/${page.slug}.png`;
    if (posts.some((post) => post.slug === page.slug && post.dir === '')) return `/og/blog/${page.slug}.png`;
    return '/og/blog.png';
  }
  return dir && drawsLanguage(dir) ? `/og/${dir}/blog.png` : '/og/blog.png';
}

/** The pages of the blog that have an image of their own: each language's list and each post the build draws. */
export function blogImages(posts: readonly Post[]): { dir: string; page: string; title: string; description: string }[] {
  const lists = blogLanguages.filter((language) => drawsLanguage(language.dir)).map((language) => ({ dir: language.dir, page: 'blog', ...blogWords(language.lang) }));
  const own = posts.filter((post) => drawsLanguage(post.dir)).map((post) => ({ dir: post.dir, page: `blog/${post.slug}`, title: post.data.title, description: post.data.description }));
  return [...lists, ...own];
}

/** The day a post was published, as its page and its list say it: the day it names, written in the page's language. */
export function publishedParts(date: Date, lang: string): { datetime: string; text: string } {
  const datetime = date.toISOString().slice(0, 10);
  return { datetime, text: new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date) };
}

/** The blog's title and description in a language, with the system's name in place. */
export function blogWords(lang: string): { title: string; description: string; feedTitle: string } {
  const t = strings(lang).blog;
  const name = (text: string) => text.replaceAll('{name}', config.name);
  return { title: t.title, description: name(t.description), feedTitle: name(t.feedTitle) };
}

/** A post's author in the structured data: the repository's owner as every page names them, anyone else by name. */
export const authorPerson = (name: string) => (name === owner ? ownerPerson : { '@type': 'Person', name });

/**
 * A post as structured data (schema.org's `BlogPosting`), beside the page itself: its headline and description, its
 * language, the day it was published, when it last changed (the date the sitemap gives its page), its author.
 */
export function blogPosting(url: string, post: Post, lang: string, dateModified: string | undefined): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.data.title,
    description: post.data.description,
    url,
    mainEntityOfPage: url,
    inLanguage: lang,
    datePublished: post.data.date.toISOString().slice(0, 10),
    ...(dateModified ? { dateModified } : {}),
    author: authorPerson(post.data.author),
  };
}

// ── The feed ─────────────────────────────────────────────────────────────────────────────────────────────────────

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const xml = (text: string) => text.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);

/**
 * A language's feed, RSS 2.0 (https://www.rssboard.org/rss-specification): the channel — the blog's title and
 * description in that language, its list's address, its language, its own address (`atom:link`, as the RSS Advisory
 * Board recommends) — and an item for each of its posts, newest first, each with its title, address (its `guid`
 * too), day of publication (RFC 822, at midnight UTC), author (`dc:creator`: RSS's own `author` is an e-mail address)
 * and description. Nothing in it is the time of the build: the channel's `lastBuildDate` is its newest post's day, and
 * a feed with no posts has none.
 */
export function rssFeed(posts: readonly Post[], dir: string, site: URL | string): string {
  const language = languageOf(dir);
  const words = blogWords(language.lang);
  const at = (href: string) => new URL(href, site).href;
  const own = postsIn(posts, dir);
  const items = own.map((post) => {
    const link = at(postHref(dir, post.slug));
    return [
      '    <item>',
      `      <title>${xml(post.data.title)}</title>`,
      `      <link>${xml(link)}</link>`,
      `      <guid isPermaLink="true">${xml(link)}</guid>`,
      `      <pubDate>${post.data.date.toUTCString()}</pubDate>`,
      `      <dc:creator>${xml(post.data.author)}</dc:creator>`,
      `      <description>${xml(post.data.description)}</description>`,
      '    </item>',
    ].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${xml(words.feedTitle)}</title>`,
    `    <link>${xml(at(blogHref(dir)))}</link>`,
    `    <description>${xml(words.description)}</description>`,
    `    <language>${xml(language.lang.toLowerCase())}</language>`,
    `    <atom:link href="${xml(at(feedHref(dir)))}" rel="self" type="application/rss+xml"/>`,
    ...(own.length ? [`    <lastBuildDate>${own[0].data.date.toUTCString()}</lastBuildDate>`] : []),
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/** The head's link to a language's feed, on every page of its blog. */
export const feedLink = (dir: string) => ({ tag: 'link' as const, attrs: { rel: 'alternate', type: 'application/rss+xml', title: blogWords(languageOf(dir).lang).feedTitle, href: feedHref(dir) } });
