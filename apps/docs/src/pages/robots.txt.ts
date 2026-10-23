// robots.txt: every page may be read, and the sitemap is at the site's address (`site` of tanrei.config.json, which
// astro.config.mjs gives the build).
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('robots.txt: the build has no `site`; astro.config.mjs reads it from tanrei.config.json.');
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
