// The feed of each language but the root's, RSS 2.0 (lib/blog.ts, `rssFeed`), empty or not.
import type { APIRoute, GetStaticPaths } from 'astro';
import { blogPosts } from '../../../lib/blog-posts';
import { rssFeed } from '../../../lib/blog';
import { translations } from '../../../../i18n/locales.mjs';

export const getStaticPaths = (() => translations.map(({ dir }) => ({ params: { locale: dir } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  if (!site) throw new Error('blog: the feed names absolute addresses, and the site has none (`site` in astro.config.mjs)');
  return new Response(rssFeed(await blogPosts(), params.locale ?? '', site), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
