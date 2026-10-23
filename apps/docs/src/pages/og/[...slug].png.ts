// The image a shared link of each page shows (1200 × 630), drawn where the site is built (lib/social-image.mjs): the
// wordmark, the page's title and description, and on a component's page each platform's status, on the light scheme's
// surface. One for every page of a language the build has a face for (i18n/locales.mjs, `imageFaces`); a page of
// another language names the English page's image (lib/seo.ts, `socialImagePath`), and the head names it
// (src/routeData.ts).
import path from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { inkBox } from '../../lib/brand-geometry.mjs';
import { marks } from '../../lib/brand-marks';
import { strings } from '../../lib/i18n';
import { specOfPage } from '../../lib/page-head';
import { config, statusOf } from '../../lib/repo';
import { drawsLanguage, languages, pageOf } from '../../lib/seo';
import { socialPng, typeRole } from '../../lib/social-image.mjs';
import { colorCss, contexts } from '../../lib/tokens';

// The build runs in apps/docs (package.json): the fonts' packages are read from there and from the repository's.
const repoRoot = path.resolve(process.cwd(), '../..');

export const getStaticPaths = (async () => {
  const entries = await getCollection('docs');
  return entries
    .map((entry) => ({ entry, ...pageOf(entry.id) }))
    .filter(({ dir }) => drawsLanguage(dir))
    .map(({ entry, dir, page }) => ({ params: { slug: dir ? `${dir}/${page}` : page }, props: { id: entry.id, dir, page, title: entry.data.title, description: entry.data.description } }));
}) satisfies GetStaticPaths;

/** The light scheme's colors, type and wordmark: one look for every image. The wordmark's ink is measured once. */
const sys = contexts.light[config.namespace].sys;
const look = (async () => ({
  wordmark: marks.wordmarkLight,
  markInk: await inkBox(marks.wordmark),
  colors: Object.fromEntries(Object.entries(sys.color as Record<string, { $value: unknown }>).map(([name, token]) => [name, colorCss(token.$value)])),
  // The page's roles, larger by one factor each: the title in the display role, the description in the large body
  // role, the host and the status band in the label role.
  type: { display: typeRole(sys.typescale.display.$value, 1.5), body: typeRole(sys.typescale['body-large'].$value, 1.875), label: typeRole(sys.typescale.label.$value, 1.75) },
}))();

export const GET: APIRoute = async ({ props, site }) => {
  const { id, dir, page, title, description } = props as { id: string; dir: string; page: string; title: string; description?: string };
  const language = languages.find((l) => l.dir === dir)!;
  const t = strings(language.lang);
  const spec = specOfPage(id);
  const status = spec && statusOf(spec.name);
  const png = await socialPng(
    {
      heading: page === 'index' ? undefined : title,
      description,
      lang: language.lang,
      dir: language.direction,
      faces: language.imageFaces ?? [],
      statuses: status ? (config.platforms as string[]).map((platform) => ({ label: t.platform[platform] ?? platform, status: status.platforms[platform], word: t.status[status.platforms[platform]] ?? status.platforms[platform] })) : undefined,
    },
    { ...(await look), host: site ? site.host : '' },
    repoRoot,
  );
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
