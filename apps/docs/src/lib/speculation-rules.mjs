// What a page asks the browser to load before the reader follows a link (Speculation Rules,
// https://developer.chrome.com/docs/web-platform/prerender-pages): the site's own pages, prerendered once the reader
// shows they are about to follow a link (`moderate`: a pointer resting on it, or pressing it), and fetched by an engine
// that prefetches but does not prerender. PageFrame.astro writes it at the end of the body of every page of the frame,
// as a `<script type="speculationrules">` held in a template, after the page's links (it says why), and StudioPage.astro
// at the end of Theme Studio's, which is a page of its own; the inline script after the template gives the rules to the
// browser once the page has loaded (`speculateOnceLoadedText`, below).
//
// Only the site's own documents. A pattern without an origin is read against the page's address, so `/*` names this
// site alone: a link to another site is never loaded. Left out are the search's files (`/pagefind/`), the built assets
// (`/_astro/`), every address of a file that is not a page — the pages' Markdown, the index for language models, the
// sitemap, the pictures — and a link that downloads its file.
//
// One address pattern, and the links left out named by one selector, not by a pattern each. An engine weighs every
// link of the page against the rules again whenever the page changes, and a page's sidebar holds hundreds of links:
// with a pattern for each kind of file left out, WebKit drew a choice in the header's appearance menu over 200 ms after
// its press, past the 150 ms an interaction has; with one pattern and one selector it draws it within them. The selector reads the
// address as the link writes it: the site's links name its pages and files from its root, or relative to the page.
//
// The host's policy allows the rules as it allows every inline script (`'unsafe-inline'`, public/_headers) and the
// page's own policy names their hash, as it names every inline script's (src/lib/csp.mjs). Neither names the rules'
// own keyword (`'inline-speculation-rules'`): the hash is enough, and WebKit, which does not know the keyword, reports
// it as an invalid source on every page.

/** The site's addresses: a pattern with no origin, read against the page's. */
export const SITE = '/*';

/** The links that are not to pages: a link that downloads, the search's files, the built assets, and every file that is not a page. */
export const NOT_PAGES = [
  '[download]',
  '[href*="/pagefind/"]',
  '[href*="/_astro/"]',
  ...['.md', '.txt', '.xml', '.json', '.png', '.svg', '.ico', '.woff2'].map((extension) => `[href$="${extension}"]`),
];

/** How soon the browser acts: once a pointer rests on a link, or presses it. */
export const EAGERNESS = 'moderate';

const where = { and: [{ href_matches: SITE }, { not: { selector_matches: NOT_PAGES.join(', ') } }] };

/** The rules, as the page's `<script type="speculationrules">` holds them. */
export const speculationRules = {
  prerender: [{ source: 'document', where, eagerness: EAGERNESS }],
  prefetch: [{ source: 'document', where, eagerness: EAGERNESS }],
};

/** The script's text. */
export const speculationRulesText = JSON.stringify(speculationRules);

/** The template that holds the rules in the page, where the browser does not read them. */
export const SPECULATION_RULES = 'template[data-docs-speculation-rules]';

/**
 * The inline script written after the template: it adds the rules to the document once the page has loaded (at once if
 * it has). A rule that leaves links out by a selector has an engine weigh the links against it again whenever a link is
 * made or changed, and WebKit styles the page before it does: while the page loaded, the links the components drew in
 * their shadow roots (a button that is a link, the sidebar's rows) had WebKit style the whole page again and again —
 * 1.5 to 3 s of a component's page's load (Linux WebKit, two cores), against none without the rules. The rules act on a
 * pointer resting on a link or pressing it (`moderate`), which a reader does once the page has loaded; read then, the
 * links are weighed on a page already styled. The new script's text is the rules' own, so the page's policy names it by
 * the hash of the script inside the template, which the policy step reads as it reads every inline script (lib/csp.mjs).
 * Inline, not a module the frame's script imports: a module of its own was one more file the page's scripts waited for.
 */
export const speculateOnceLoadedText = `{
  const add = () => {
    const held = document.querySelector(${JSON.stringify(SPECULATION_RULES)})?.content.querySelector('script');
    if (!held) return;
    const rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = held.textContent;
    document.body.append(rules);
  };
  if (document.readyState === 'complete') add();
  else addEventListener('load', add, { once: true });
}`;
