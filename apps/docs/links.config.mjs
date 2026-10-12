// What the site knows about the places its pages link to: the icon of each other site a page's Markdown links to,
// drawn before the Link's arrow (specs/link.spec.json, LNK-32). `@tanrei/web/links/node` reads them ONCE, when a
// person runs the command, into a lock file the site commits; a build reads that file and never the network.
//
//   pnpm --filter @tanrei/docs links         read the origins the lock file has no entry for (tanrei-links update)
//
// The pictures are the site's own files (public/link-pictures/), so the pages ask no other site for anything and the
// Content-Security-Policy keeps `img-src 'self'`. Every icon passes through the site's image step (sharp, which the
// site already uses), as the helper requires: decoded and encoded anew, a square PNG of the size it asks for.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isExternal } from '@tanrei/web/links';

const here = path.dirname(fileURLToPath(import.meta.url));
/** The site's own origin: `site` of astro.config.mjs. */
export const SITE = ['https://tanrei.chnotchy.com'];

/** The site's image step: an icon becomes a PNG of exactly the side asked for, on the ground asked for where there is one. */
async function transform(bytes, info) {
  const { default: sharp } = await import('sharp');
  let image = sharp(Buffer.from(bytes), { animated: false });
  if (info.role === 'siteIcon') {
    image = image.resize(info.size, info.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    if (info.ground) image = image.flatten({ background: info.ground });
    return new Uint8Array(await image.png().toBuffer());
  }
  return new Uint8Array(await image.rotate().png().toBuffer());
}

/** The options every function of the helper takes, for this site. */
export const linkOptions = {
  site: SITE,
  lock: path.join(here, 'link-data.lock.json'),
  pictureDirectory: path.join(here, 'public/link-pictures'),
  picturePath: (file) => `/link-pictures/${file}`,
  transform,
};

const MARKDOWN_LINK = /\]\(\s*<?(https?:\/\/[^\s)>]+)/g;
const AUTOLINK = /<(https?:\/\/[^\s>]+)>/g;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : /\.mdx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []));

/** The origins of the other sites the pages' Markdown links to, in every language, sorted. */
export function linkedOrigins(content = path.join(here, 'src/content/docs')) {
  const origins = new Set();
  for (const file of walk(content)) {
    // Code is never a link: a fence and a run of inline code are text.
    const text = fs.readFileSync(file, 'utf8').replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
    for (const [, href] of [...text.matchAll(MARKDOWN_LINK), ...text.matchAll(AUTOLINK)]) {
      if (!isExternal(href, { site: SITE })) continue;
      try {
        origins.add(new URL(href).origin);
      } catch {}
    }
  }
  return [...origins].sort();
}

export default { options: linkOptions, links: [], origins: () => linkedOrigins() };
