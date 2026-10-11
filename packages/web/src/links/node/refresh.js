// What a person runs to read what the lock file lacks, or to read everything again (REQUIREMENTS.md, LKD-24). A build
// never calls this: a build asks in `frozen`, the default.
import { beginRun, resolveLinkDataWith, resolveSiteIconsWith } from './links.js';
import { readLock, lockText } from './lock.js';
import { forgetWhatWasSaid, readOptions } from './options.js';

/** refreshLinkData(), with the fetcher's seam as an argument. */
export async function refreshLinkDataWith(request, internals) {
  if (request === null || typeof request !== 'object') throw new TypeError('links: refreshLinkData({ links, origins, options, mode }) takes an object');
  const { links = [], origins = [], mode = 'update' } = request;
  if (mode !== 'update' && mode !== 'refresh' && mode !== 'frozen') throw new TypeError('links: refreshLinkData() takes mode "update" (the default: read what has no entry), "refresh" (read everything again) or "frozen" (read nothing; say what is missing)');
  for (const [name, list] of [['links', links], ['origins', origins]]) if (!Array.isArray(list) || !list.every((entry) => typeof entry === 'string')) throw new TypeError(`links: refreshLinkData() takes ${name} as a list of addresses`);
  const options = { ...request.options, mode };
  const settings = readOptions(options);
  forgetWhatWasSaid(settings.report);
  beginRun(settings.lock);
  const before = lockText(readLock(settings.lock));
  const wanted = [...new Set(links)];
  const results = await Promise.all(wanted.map((href) => resolveLinkDataWith(href, options, internals)));
  const icons = await resolveSiteIconsWith(origins, options, internals);
  return {
    lock: settings.lock,
    changed: lockText(readLock(settings.lock)) !== before,
    links: results.filter((result) => result.ok).map((result) => result.data.href),
    failed: results.filter((result) => !result.ok).map((result) => ({ href: result.href, reason: result.reason })),
    icons: Object.keys(icons),
  };
}
