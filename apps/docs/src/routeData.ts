// What every page's head says beyond the framework's own tags (Starlight's `routeMiddleware`, astro.config.mjs), from
// lib/seo.ts:
//
//   the image of a shared link   `og:image` and `twitter:image`: the page's own (src/pages/og/[...slug].png.ts), in its
//                                language where the build draws it, else the English page's;
//   the language                 `og:locale` as the protocol writes it (`ja_JP`), the other languages as
//                                `og:locale:alternate` (the framework writes the bare tag, `ja`);
//   the first page               a website (`og:type`), titled by what Tanrei is — not «Tanrei | Tanrei»;
//   a component's page           «Button — accessible UI component | Tanrei design system»;
//   structured data              JSON-LD: the page itself and its trail on every page — the page with `dateModified`,
//                                the date its head prints and the sitemap gives it (lib/lastmod.mjs) —, the site and
//                                its source code on the first page, the platform's source code on a platform's page
//                                of "Getting started", a post itself (`BlogPosting`) on a post of the blog;
//   a post of the blog           only the languages it is written in, as `hreflang` alternates and as
//                                `og:locale:alternate`; its trail through its language's list (lib/blog.ts).
//
// The page that was not found keeps its image (its language's first page's) and has no structured data: it is not
// offered to a crawler.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { homeHref, trail, type Entry } from './components/frame/frame';
import { strings } from './lib/i18n';
import { isNotFoundPage, specOfPage } from './lib/page-head';
import { SOCIAL } from './lib/brand.mjs';
import { blogImagePath, blogPageOf, blogPosting, blogWords, blogHref, languagesOf } from './lib/blog';
import { blogPosts } from './lib/blog-posts';
import { breadcrumbList, componentTitles, gettingStartedPlatform, homeTitle, jsonLd, languages, ogLocales, pageOf, socialImagePath, softwareSourceCode, webPage, webSite } from './lib/seo';
import { lastUpdated } from 'virtual:tanrei-docs/last-updated';

type HeadEntry = { tag: string; attrs?: Record<string, string | boolean | undefined>; content?: string };

export const onRequest = defineRouteMiddleware(async (context) => {
  const site = context.site;
  if (!site) throw new Error('routeData: the site has no address (`site` in astro.config.mjs); every head names absolute addresses');
  const route = context.locals.starlightRoute;
  const head = route.head as HeadEntry[];
  const { title, description } = route.entry.data;
  const notFound = isNotFoundPage(route.id);
  const { dir, page } = pageOf(route.id);
  const home = page === 'index';
  const spec = specOfPage(route.id);
  // A page of the blog: its list, or a post with the languages it is written in.
  const blogPage = notFound ? undefined : blogPageOf(page);
  const posts = blogPage ? await blogPosts() : [];
  const post = blogPage?.kind === 'post' ? posts.find((each) => each.dir === dir && each.slug === blogPage.slug) : undefined;
  if (blogPage?.kind === 'post' && !post) throw new Error(`routeData: ${route.id} is no post of the blog`);
  const postLanguages = post ? languagesOf(posts, post.slug).map((each) => languages.find((language) => language.dir === each)!.lang) : undefined;

  const meta = (key: 'name' | 'property', name: string) => head.find((entry) => entry.tag === 'meta' && entry.attrs?.[key] === name);
  const setMeta = (key: 'name' | 'property', name: string, content: string) => {
    const found = meta(key, name);
    if (found) found.attrs = { ...found.attrs, content };
    else head.push({ tag: 'meta', attrs: { [key]: name, content } });
  };
  const setTitle = (text: string) => {
    const found = head.find((entry) => entry.tag === 'title');
    // The framework writes a tag's content as HTML: the title is text.
    if (found) found.content = text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
  };

  // The titles.
  if (home && !notFound) {
    const text = homeTitle(route.lang);
    setTitle(text);
    setMeta('property', 'og:title', text);
    setMeta('property', 'og:type', 'website');
  } else if (spec) {
    const titles = componentTitles(title, route.lang);
    setTitle(titles.document);
    setMeta('property', 'og:title', titles.og);
  }

  // The language. A post names only the languages it is written in, and the default language's address only where it
  // is written in English (the framework names every language of the site).
  if (postLanguages) {
    for (let at = head.length - 1; at >= 0; at--) {
      const { tag, attrs } = head[at];
      if (tag !== 'link' || attrs?.rel !== 'alternate' || typeof attrs.hreflang !== 'string') continue;
      const kept = attrs.hreflang === 'x-default' ? postLanguages.includes(languages[0].lang) : postLanguages.includes(attrs.hreflang);
      if (!kept) head.splice(at, 1);
    }
  }
  const locales = ogLocales(route.lang, postLanguages);
  setMeta('property', 'og:locale', locales.locale);
  for (const alternate of locales.alternates) head.push({ tag: 'meta', attrs: { property: 'og:locale:alternate', content: alternate } });

  // The image: the page's own; the page that was not found shows its language's first page's.
  const image = new URL(blogPage ? blogImagePath(posts, dir, blogPage) : socialImagePath(notFound ? dir : route.id, notFound ? false : route.isFallback), site).href;
  const alt = meta('property', 'og:title')?.attrs?.content as string | undefined;
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:image:type', 'image/png');
  setMeta('property', 'og:image:width', String(SOCIAL.width));
  setMeta('property', 'og:image:height', String(SOCIAL.height));
  if (alt) setMeta('property', 'og:image:alt', alt);
  setMeta('name', 'twitter:image', image);
  if (alt) setMeta('name', 'twitter:image:alt', alt);

  if (notFound) return;

  // Structured data.
  const url = new URL(context.url.pathname, site).href;
  const levels = route.hasSidebar ? trail(route.sidebar as unknown as Entry[]) : [];
  // A post stands under its language's list, which no group of the sidebar holds.
  const above = blogPage?.kind === 'post' ? [{ name: blogWords(route.lang).title, href: blogHref(dir) }] : levels.map((level) => ({ name: level.label, href: level.href }));
  const crumbs = home
    ? [{ name: strings(route.lang).frame.home, href: homeHref(route) }]
    : [{ name: strings(route.lang).frame.home, href: homeHref(route) }, ...above, { name: title, href: context.url.pathname }];
  const data = [webPage(url, title, route.lang, description, lastUpdated(context.url.pathname)), breadcrumbList(crumbs, site)];
  if (post) data.push(blogPosting(url, post, route.lang, lastUpdated(context.url.pathname)));
  if (home) data.push(webSite(url, route.lang, description), softwareSourceCode(url, description));
  const platform = gettingStartedPlatform(page);
  if (platform) data.push(softwareSourceCode(new URL(homeHref(route), site).href, description, [platform]));
  for (const item of data) head.push({ tag: 'script', attrs: { type: 'application/ld+json' }, content: jsonLd(item) });
});
