// The English posts' feed, RSS 2.0 (lib/blog.ts, `rssFeed`). Each other language has its own
// (pages/[locale]/blog/rss.xml.ts), empty or not.
import type { APIRoute } from 'astro';
import { blogPosts } from '../../lib/blog-posts';
import { rssFeed } from '../../lib/blog';
import { source } from '../../../i18n/locales.mjs';

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('blog: the feed names absolute addresses, and the site has none (`site` in astro.config.mjs)');
  return new Response(rssFeed(await blogPosts(), source.dir, site), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
