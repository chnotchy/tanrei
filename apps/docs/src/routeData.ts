// What every page's head says beyond the framework's own tags (Starlight's `routeMiddleware`, astro.config.mjs), from
// lib/seo.ts:
//
//   the image of a shared link   `og:image` and `twitter:image`: the page's own (src/pages/og/[...slug].png.ts), in its
//                                language where the build draws it, else the English page's;
//   the language                 `og:locale` as the protocol writes it (`ja_JP`), the other languages as
//                                `og:locale:alternate` (the framework writes the bare tag, `ja`);
//   the first page               a website (`og:type`), titled by what Tanrei is — not «Tanrei | Tanrei»;
//   a component's page           «Button — accessible UI component | Tanrei design system»;
//   structured data              JSON-LD: the page's trail on every page, the site and its source code on the first
//                                page, the platform's source code on a platform's page of "Getting started".
//
// The page that was not found keeps its image (its language's first page's) and has no structured data: it is not
// offered to a crawler.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { homeHref, trail, type Entry } from './components/frame/frame';
import { strings } from './lib/i18n';
import { isNotFoundPage, specOfPage } from './lib/page-head';
import { SOCIAL } from './lib/brand.mjs';
import { breadcrumbList, componentTitles, gettingStartedPlatform, homeTitle, jsonLd, ogLocales, pageOf, socialImagePath, softwareSourceCode, webSite } from './lib/seo';

type HeadEntry = { tag: string; attrs?: Record<string, string | boolean | undefined>; content?: string };

export const onRequest = defineRouteMiddleware((context) => {
  const site = context.site;
  if (!site) throw new Error('routeData: the site has no address (`site` in astro.config.mjs); every head names absolute addresses');
  const route = context.locals.starlightRoute;
  const head = route.head as HeadEntry[];
  const { title, description } = route.entry.data;
  const notFound = isNotFoundPage(route.id);
  const { dir, page } = pageOf(route.id);
  const home = page === 'index';
  const spec = specOfPage(route.id);

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

  // The language.
  const locales = ogLocales(route.lang);
  setMeta('property', 'og:locale', locales.locale);
  for (const alternate of locales.alternates) head.push({ tag: 'meta', attrs: { property: 'og:locale:alternate', content: alternate } });

  // The image: the page's own; the page that was not found shows its language's first page's.
  const image = new URL(socialImagePath(notFound ? dir : route.id, notFound ? false : route.isFallback), site).href;
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
  const crumbs = home
    ? [{ name: strings(route.lang).frame.home, href: homeHref(route) }]
    : [{ name: strings(route.lang).frame.home, href: homeHref(route) }, ...levels.map((level) => ({ name: level.label, href: level.href })), { name: title, href: context.url.pathname }];
  const data = [breadcrumbList(crumbs, site)];
  if (home) data.push(webSite(url, route.lang, description), softwareSourceCode(url, description));
  const platform = gettingStartedPlatform(page);
  if (platform) data.push(softwareSourceCode(new URL(homeHref(route), site).href, description, [platform]));
  for (const item of data) head.push({ tag: 'script', attrs: { type: 'application/ld+json' }, content: jsonLd(item) });
});
