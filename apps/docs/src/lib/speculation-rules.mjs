// What a page asks the browser to load before the reader follows a link (Speculation Rules,
// https://developer.chrome.com/docs/web-platform/prerender-pages): the site's own pages, prerendered once the reader
// shows they are about to follow a link (`moderate`: a pointer resting on it, or pressing it), and fetched by an engine
// that prefetches but does not prerender. Head.astro writes it into every page of the frame as `<script type="speculationrules">`, and
// StudioPage.astro into Theme Studio's, which has a head of its own.
//
// Only the site's own documents. A pattern without an origin is read against the page's address, so `/*` names this
// site alone: a link to another site is never loaded. Left out are the search's files (`/pagefind/`), the built assets
// (`/_astro/`), every address of a file that is not a page — the pages' Markdown, the index for language models, the
// sitemap, the pictures — and a link that downloads its file.
//
// The host's policy allows the rules (`'inline-speculation-rules'`, public/_headers) and the page's own policy names
// their hash, as it names every inline script's (src/lib/csp.mjs).

/** Addresses of the site that are not pages to read. */
export const NOT_PAGES = ['/pagefind/*', '/_astro/*', '/*.md', '/*.txt', '/*.xml', '/*.json', '/*.png', '/*.svg', '/*.ico', '/*.woff2'];

/** How soon the browser acts: once a pointer rests on a link, or presses it. */
export const EAGERNESS = 'moderate';

const where = {
  and: [{ href_matches: '/*' }, ...NOT_PAGES.map((pattern) => ({ not: { href_matches: pattern } })), { not: { selector_matches: '[download]' } }],
};

/** The rules, as the page's `<script type="speculationrules">` holds them. */
export const speculationRules = {
  prerender: [{ source: 'document', where, eagerness: EAGERNESS }],
  prefetch: [{ source: 'document', where, eagerness: EAGERNESS }],
};

/** The script's text. */
export const speculationRulesText = JSON.stringify(speculationRules);
