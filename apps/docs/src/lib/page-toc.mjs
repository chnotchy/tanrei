// The items of "On this page" (components/frame/PageSidebar.astro), from the headings the framework gives a page.
//
// The framework's list begins with an entry for the page's own title. The frame makes it the item for the top of the
// page (TOC-10): a link to `#top`, named with the frame's word («Overview»), current from the start of the page until
// the first heading reaches the line — so that the part before the first heading has a name.
//
// A page whose first heading says that same word — every component page: Overview, Specs, Guidelines, Accessibility —
// would list it twice, one under the other, a few lines apart. There the top item stands for both: the heading's own
// item is left out and what it held (the headings under it) is the top item's. The top item is the one that stays
// because the list must have a current item from the first line of the page (the heading is not at the line until the
// page's head has scrolled away), and because the part it names — the head and the section that begins under it — is
// one place to a reader. A page whose first heading says anything else keeps both.

/**
 * @typedef {{ depth: number, slug: string, text: string, children: TocItem[] }} TocItem
 */

/** A heading's words as a reader compares them: without the space around them, in one case. */
const said = (text) => text.trim().toLocaleLowerCase();

/**
 * @param {TocItem[]} items The framework's entries for the page (`starlightRoute.toc.items`).
 * @param {string} overview The frame's word for the top of the page, in the page's language.
 * @returns {TocItem[]}
 */
export function tocItems(items, overview) {
  const [first, second, ...rest] = items;
  if (!first || first.slug !== '_top') return items;
  const top = { ...first, slug: 'top', text: overview };
  if (second && said(second.text) === said(overview)) return [{ ...top, children: [...top.children, ...second.children] }, ...rest];
  return [top, ...items.slice(1)];
}
