// `@tanrei/web/links/node` — the build-time helper (REQUIREMENTS.md beside this file). Node only: nothing a
// page loads imports this module (LKD-1). Every function here reads through one fetcher, held to LKD-3 to LKD-13, and
// that fetcher is given the machine as it is: these are the only functions the package's `exports` reach, and they
// take no argument that changes which addresses are refused, how a name is resolved or how a certificate is verified.
import { PRODUCTION } from './fetcher.js';
import { resolveLinkDataWith, resolveSiteIconsWith } from './links.js';
import { refreshLinkDataWith } from './refresh.js';

// The pure functions the element and the build step share (LKD-2): one rule, in a module without a Node dependency.
export * from '../index.js';
export { markExternalLinks } from './mark.js';

/** Reads what a page says of itself, or answers from the lock file (the default). Never rejects for what a network or a destination does. */
export function resolveLinkData(href, options) {
  return resolveLinkDataWith(href, options, PRODUCTION);
}

/** The icon of each origin, as a file among the site's own; an origin without one is absent from the answer. */
export function resolveSiteIcons(origins, options) {
  return resolveSiteIconsWith(origins, options, PRODUCTION);
}

/** What a person runs to write the lock file: reads what has no entry (`update`, the default) or everything again (`refresh`). */
export function refreshLinkData(request) {
  return refreshLinkDataWith(request, PRODUCTION);
}
