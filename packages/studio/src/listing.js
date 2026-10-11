// The Studio's list of components follows the specs' `listing`.
//
// The list is made from two things, and neither is kept by hand: the components the system's tokens declare (a token
// group with axes — what the Studio can edit), and the catalog — the generated status file's rows, written from
// the specs: each component's level, its listing and what it is built from. By default the list holds the components
// every list shows; when the person asks for everything, also the ones a spec marks to be shown on request. A
// component that has no panel of its own and is built from components that have one (a field around an input) is a
// row that opens its members' panels — whatever the members' listing: it is the way down to them.
//
// A set of tokens that is no component's and that several components read (the input box of a text input, a select,
// a combobox, a number input and a color input) is an item of its own, with a panel like a component's:
// that is where the box is edited, once. Each of its readers says it reads it (`reads`), and its panel opens the
// set's above its own; a field around a reader opens the set's panel beside its members'.
//
// No name of a level or of a listing is written here: the catalog says which name is which (`levels`, `listings`).

/**
 * @typedef {{ name: string, title?: string, level?: string, listing?: string, builtFrom?: string[] }} CatalogRow
 * @typedef {{ levels?: Record<string, string>, listings?: { listed: string, onRequest: string }, components?: CatalogRow[] }} Catalog
 * @typedef {{ name: string, own: boolean, members: string[], role?: string, onRequest: boolean, reads?: string[] }} ListedComponent
 *   `own`: it has a panel of its own; `members`: the panels it opens instead, where it has none; `role`: what its level
 *   is (`single`, `completes`, `coordinates`), the key of the word the Studio shows; `reads`: the shared sets it
 *   reads, where it reads any.
 */

/**
 * @param {string[]} declared  The components the system's tokens declare, in the tokens' order.
 * @param {Catalog | undefined} catalog
 * @param {{ everything?: boolean, shared?: Record<string, string[]> }} [options]  `shared`: each set of tokens that is no
 *   component's, with the components that read it (the model's `shared`).
 * @returns {ListedComponent[]}
 */
export function componentList(declared, catalog, { everything = false, shared = {} } = {}) {
  const rows = new Map((catalog?.components ?? []).map((row) => [row.name, row]));
  const has = new Set(declared);
  const role = (level) => Object.keys(catalog?.levels ?? {}).find((key) => catalog.levels[key] === level);
  const onRequest = (row) => !!row && !!catalog?.listings && row.listing === catalog.listings.onRequest;
  const reads = (name) => Object.keys(shared ?? {}).filter((set) => has.has(set) && shared[set].includes(name));
  const item = (name, own, members) => ({ name, own, members, role: role(rows.get(name)?.level), onRequest: onRequest(rows.get(name)), ...(reads(name).length ? { reads: reads(name) } : {}) });
  const list = [
    // A component the catalog does not know (a product's own, a group no spec documents) is listed: nothing says otherwise.
    ...declared.map((name) => item(name, true, [])),
    ...[...rows.values()]
      .filter((row) => !has.has(row.name))
      // A member that reads a shared set brings the set's panel before its own.
      .map((row) => item(row.name, false, [...new Set((row.builtFrom ?? []).filter((member) => has.has(member)).flatMap((member) => [...reads(member), member]))]))
      .filter((entry) => entry.members.length > 0),
  ];
  return everything ? list : list.filter((entry) => !entry.onRequest);
}

/** What the Studio keeps of the status file: which name is which, and each component's level, listing and members. */
export const catalogOf = (status) => ({
  levels: status.levels,
  listings: status.listings,
  components: status.components.map(({ name, title, level, listing, builtFrom }) => ({ name, title, level, listing, builtFrom })),
});
