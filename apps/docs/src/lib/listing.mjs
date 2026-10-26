// What the site's lists of components show: every list is made here
// from the rows of the generated status file — which is written from the specs — and never from a list kept by hand.
// A component whose `listing` is the status file's `listings.onRequest` is shown only when the reader asks for
// everything; nothing here hides a page, and no name of a value is written here: the callers pass `listings`.
//
// A second axis is the design system: a list shows the components of the system the reader chose (the default system
// until they choose another), and a component that system does not have — one its components manifest lists among
// what it does not have, `omitted` — is not shown. The callers pass the manifests; no system's name is written here.
//
// Plain functions with no browser and no Vite in them: `astro.config.mjs` builds the sidebar with them, the site's
// components mark their rows with them, and Node tests them (test/listing.test.mjs).

/**
 * @typedef {{ name: string, title: string, category: string, level: string, listing: string, layer?: string, builtFrom?: string[], docs?: string | null }} Row  A row of the status file's `components`.
 * @typedef {{ listed: string, onRequest: string }} Listings  The status file's `listings`: which name is which.
 * @typedef {{ system: string, omitted: { name: string }[] }} Manifest  What a list reads of a system's components manifest.
 */

/**
 * The shipped systems that do not have a component: those whose components manifest lists it among what they do not
 * have, in the order of `manifests`. A component no manifest names (one with no spec yet) is in none of them.
 *
 * @param {string} name
 * @param {Manifest[]} manifests
 * @returns {string[]}
 */
export const absentFrom = (name, manifests) => manifests.filter((manifest) => manifest.omitted.some((entry) => entry.name === name)).map((manifest) => manifest.system);

/**
 * What a list shows under one system: the rows of the components it has.
 *
 * @template {Pick<Row, 'name'>} T
 * @param {T[]} rows
 * @param {Manifest[]} manifests
 * @param {string} system
 * @returns {T[]}
 */
export const shownUnder = (rows, manifests, system) => rows.filter((row) => !absentFrom(row.name, manifests).includes(system));

/** The systems every one of `lists` is absent from: a group none of whose rows a system has is not shown under it. */
const absentFromAll = (/** @type {string[][]} */ lists) => (lists.length ? lists.reduce((all, list) => all.filter((system) => list.includes(system))) : []);

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
 * @typedef {{ type: 'link', label: string, href: string, isCurrent: boolean, badge?: { text: string }, onRequest?: boolean, absentFrom?: string[] }} LinkEntry
 * @typedef {{ type: 'group', label: string, entries: Entry[], collapsed: boolean, badge?: { text: string }, absentFrom?: string[] }} GroupEntry
 * @typedef {LinkEntry | GroupEntry} Entry
 */

/**
 * The sidebar as it is drawn, from the sidebar the framework gives a page: in the group that holds the components'
 * pages, each component stands in a group of its category — named in the page's language by `categoryLabel` — and one
 * that is shown on request is marked (`onRequest`), and one that some systems do not have is marked with those systems
 * (`absentFrom`), unless it is the page being read: a reader who followed a link is never nowhere. A group whose every
 * component a system does not have is marked with that system too. A link that is no component's page (the index)
 * stays where it was, before the categories.
 *
 * @param {Entry[]} sidebar
 * @param {Row[]} rows
 * @param {Listings} listings
 * @param {string} base  The language's base (`''`, `/ja`).
 * @param {(category: string) => string} categoryLabel
 * @param {Manifest[]} [manifests]  The shipped systems' components manifests.
 * @returns {Entry[]}
 */
export function sidebarTree(sidebar, rows, listings, base, categoryLabel, manifests = []) {
  const byHref = new Map(componentPages(rows).map((row) => [`${base}${row.docs}`, row]));
  return sidebar.map((entry) => {
    if (entry.type !== 'group') return entry;
    const own = entry.entries.filter((child) => child.type === 'link' && byHref.has(child.href));
    if (own.length === 0) return { ...entry, entries: sidebarTree(entry.entries, rows, listings, base, categoryLabel, manifests) };
    const rowOf = (/** @type {Entry} */ child) => /** @type {Row} */ (byHref.get(/** @type {LinkEntry} */ (child).href));
    /** A component's link as it is drawn: marked with what hides it, unless it is the page being read. */
    const drawn = (/** @type {LinkEntry} */ child) => {
      if (child.isCurrent) return child;
      const absent = absentFrom(rowOf(child).name, manifests);
      return { ...child, ...(isOnRequest(rowOf(child), listings) ? { onRequest: true } : {}), ...(absent.length ? { absentFrom: absent } : {}) };
    };
    const groups = categoriesOf(own.map(rowOf)).map((category) => {
      const entries = own.filter((child) => groupOf(rowOf(child)) === category).map((child) => drawn(/** @type {LinkEntry} */ (child)));
      const absent = absentFromAll(entries.map((child) => child.absentFrom ?? []));
      return { type: /** @type {const} */ ('group'), label: categoryLabel(category), collapsed: false, entries, ...(absent.length ? { absentFrom: absent } : {}) };
    });
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

/** The attribute of `<html>` that names the system the lists show: the reader's look (lib/appearance.ts). */
export const SYSTEM_ATTR = 'data-docs-system';
/** The mark of a row, or a group, that some systems do not have: those systems' ids, separated by spaces. */
export const ABSENT_ATTR = 'data-docs-absent-from';
/** The mark of what is said under one system only (the index's line of what that system does not have): its id. */
export const SYSTEM_ONLY_ATTR = 'data-docs-system-only';
/** The `id` of the rule the head's script writes (lib/appearance.ts, `listRuleOf`), which the lists' script takes away once it holds the rows itself. */
export const SYSTEM_RULE_ID = 'docs-system-rule';

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
