// What the site's lists of components show: every list is made here
// from the rows of the generated status file — which is written from the specs — and never from a list kept by hand.
// A component whose `listing` is the status file's `listings.onRequest` is shown only when the reader asks for
// everything; nothing here hides a page, and no name of a value is written here: the callers pass `listings`.
//
// Plain functions with no browser and no Vite in them: `astro.config.mjs` builds the sidebar with them, the site's
// components mark their rows with them, and Node tests them (test/listing.test.mjs).

/**
 * @typedef {{ name: string, title: string, category: string, level: string, listing: string, layer?: string, builtFrom?: string[], docs?: string | null }} Row  A row of the status file's `components`.
 * @typedef {{ listed: string, onRequest: string }} Listings  The status file's `listings`: which name is which.
 */

/** The address of a page among the components' own pages (`/components/button/`): a component documented elsewhere (a foundation) has none. */
const OWN_PAGE = /^\/components\/[a-z0-9-]+\/$/;

/** The categories in the order the inventory first names them: the order of every list that groups by what a component is for. */
/**
 * The group a component is listed in: its category, or — for one that lives in a layer, which only the systems that
 * descend from that layer have — that layer's own group, `layer:<id>`.
 */
export const groupOf = (/** @type {Pick<Row, 'category' | 'layer'>} */ row) => (row.layer ? `layer:${row.layer}` : row.category);

/** The groups of the rows, the categories in the inventory's order and then the layers' groups. */
export const categoriesOf = (/** @type {Pick<Row, 'category' | 'layer'>[]} */ rows) => {
  const groups = [...new Set(rows.map(groupOf))];
  return [...groups.filter((group) => !group.startsWith('layer:')), ...groups.filter((group) => group.startsWith('layer:'))];
};

/**
 * The components that have a page of their own, category by category (each category's in the inventory's order): the
 * order of the sidebar and of the previous and next page.
 *
 * @param {Row[]} rows
 * @returns {Row[]}
 */
export function componentPages(rows) {
  const pages = rows.filter((row) => OWN_PAGE.test(row.docs ?? ''));
  return categoriesOf(pages).flatMap((category) => pages.filter((row) => groupOf(row) === category));
}

/**
 * The Components group of the sidebar as the framework's configuration takes it: the index, then the page of every
 * component that has one — listed by default or not, because a page's place in the site (its trail, its previous and
 * next page) does not depend on the reader's choice. Which of them are drawn is the sidebar's (`sidebarTree`).
 *
 * @param {Row[]} rows
 * @returns {string[]}
 */
export const sidebarSlugs = (rows) => ['components', ...componentPages(rows).map((row) => String(row.docs).slice(1, -1))];

/** Whether a component is shown only when the reader asks for everything. */
export const isOnRequest = (/** @type {Pick<Row, 'listing'>} */ row, /** @type {Listings} */ listings) => row.listing === listings.onRequest;

/**
 * What a list shows: by default the components that are listed, and everything when the reader asked for it.
 *
 * @template {Pick<Row, 'listing'>} T
 * @param {T[]} rows
 * @param {Listings} listings
 * @param {{ everything?: boolean }} [options]
 * @returns {T[]}
 */
export const shownIn = (rows, listings, { everything = false } = {}) => (everything ? rows : rows.filter((row) => !isOnRequest(row, listings)));

/**
 * The components a component is a part of: every one whose `builtFrom` names it, in the order given.
 *
 * @template {{ name: string, builtFrom?: string[] }} T
 * @param {T[]} all
 * @param {string} name
 * @returns {T[]}
 */
export const usedIn = (all, name) => all.filter((other) => (other.builtFrom ?? []).includes(name));

/**
 * @typedef {{ type: 'link', label: string, href: string, isCurrent: boolean, badge?: { text: string }, onRequest?: boolean }} LinkEntry
 * @typedef {{ type: 'group', label: string, entries: Entry[], collapsed: boolean, badge?: { text: string } }} GroupEntry
 * @typedef {LinkEntry | GroupEntry} Entry
 */

/**
 * The sidebar as it is drawn, from the sidebar the framework gives a page: in the group that holds the components'
 * pages, each component stands in a group of its category — named in the page's language by `categoryLabel` — and one
 * that is shown on request is marked (`onRequest`), unless it is the page being read: a reader who followed a link is
 * never nowhere. A link that is no component's page (the index) stays where it was, before the categories.
 *
 * @param {Entry[]} sidebar
 * @param {Row[]} rows
 * @param {Listings} listings
 * @param {string} base  The language's base (`''`, `/ja`).
 * @param {(category: string) => string} categoryLabel
 * @returns {Entry[]}
 */
export function sidebarTree(sidebar, rows, listings, base, categoryLabel) {
  const byHref = new Map(componentPages(rows).map((row) => [`${base}${row.docs}`, row]));
  return sidebar.map((entry) => {
    if (entry.type !== 'group') return entry;
    const own = entry.entries.filter((child) => child.type === 'link' && byHref.has(child.href));
    if (own.length === 0) return { ...entry, entries: sidebarTree(entry.entries, rows, listings, base, categoryLabel) };
    const rowOf = (/** @type {Entry} */ child) => /** @type {Row} */ (byHref.get(/** @type {LinkEntry} */ (child).href));
    const groups = categoriesOf(own.map(rowOf)).map((category) => ({
      type: /** @type {const} */ ('group'),
      label: categoryLabel(category),
      collapsed: false,
      entries: own
        .filter((child) => groupOf(rowOf(child)) === category)
        .map((child) => (isOnRequest(rowOf(child), listings) && !(/** @type {LinkEntry} */ (child).isCurrent) ? { ...child, onRequest: true } : child)),
    }));
    return { ...entry, entries: [...entry.entries.filter((child) => !own.includes(child)), ...groups] };
  });
}

/** Where the reader's choice is kept (the origin's localStorage), and what is kept when everything is asked for. */
export const LISTING_KEY = 'tanrei-docs-listing';
export const LISTING_EVERYTHING = 'everything';
/** The attribute of `<html>` that says only the listed components are shown, and the mark of a row shown on request. */
export const LISTING_ATTR = 'data-docs-listing';
export const ON_REQUEST_ATTR = 'data-docs-on-request';

/**
 * The script of the page's head: where script runs, a reader who has not asked for everything is shown the listed
 * components from the first paint (the attribute, which the theme's one rule reads). Where no script runs the
 * attribute is never written and everything is shown: the safe fallback. Storage that is blocked or throws is a
 * reader who has not asked.
 */
export const listingBootstrap = `try{if(localStorage.getItem(${JSON.stringify(LISTING_KEY)})!==${JSON.stringify(LISTING_EVERYTHING)})throw 0}catch(e){document.documentElement.setAttribute(${JSON.stringify(LISTING_ATTR)},'listed')}`;

/**
 * The pages of one answer of the search in the order they are drawn: among the components' pages of the answer, one
 * that is listed comes before one shown on request (a page says which it is in its own facts, `meta.onrequest`); every
 * other page keeps its place, and so does the order the index gave within each kind.
 *
 * @template {{ meta?: Record<string, string | undefined> }} T
 * @param {T[]} pages
 * @returns {T[]}
 */
export function listedFirst(pages) {
  const places = pages.flatMap((page, at) => (page.meta?.level ? [at] : []));
  const components = places.map((at) => pages[at]);
  const ordered = [...components.filter((page) => !page.meta?.onrequest), ...components.filter((page) => page.meta?.onrequest)];
  const out = [...pages];
  places.forEach((at, index) => (out[at] = ordered[index]));
  return out;
}
