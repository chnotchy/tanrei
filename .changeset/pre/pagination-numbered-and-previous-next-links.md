---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

**Breaking — Pagination is now numbered page navigation, and the previous/next pair is Previous and next links.**

The component called Pagination was only the pair of titled links at the foot of an article — the page before and the
page after in a sequence of titled pages — and it was also what the docs put in a table's status line, where it does
not belong. It is now two components, as GOV.UK and Primer tell "pagination" from "previous and next page links":

- **Previous and next links** (`specs/previous-next-links.spec.json`) is the former Pagination, unchanged in behaviour
  and look under its own name. Rename in your markup and imports: `tanrei-pagination` → `tanrei-previous-next-links`
  (and `-item`, `-label`, `-title`), `@tanrei/web/pagination.css` → `@tanrei/web/previous-next-links.css`,
  `@tanrei/web/pagination` → `@tanrei/web/previous-next-links`, `observePagination` → `observePreviousNextLinks`, and
  `--tanrei-comp-pagination-*` / `comp.pagination.*` → `--tanrei-comp-previous-next-links-*` /
  `comp.previous-next-links.*` (in every platform's generated tokens). Its behaviour ids are `PNL-*`.
- **Pagination** (`<tanrei-pagination>`, React `Pagination`) is new, in the de facto standard form (MUI Pagination,
  Carbon PaginationNav, Ant, GOV.UK, USWDS, Primer): page numbers with the current one marked (`aria-current="page"`),
  the pages that do not fit behind an ellipsis by `siblings` and `boundaries` (the same number of places on every
  page), previous and next, first and last with `first-last`, links to `href` with `{page}` or buttons with a
  cancelable `change`, sizes `medium` and `small`, and a compact form (`variant="compact"`, and by itself where the
  numbered row does not fit) that says "Page 3 of 10" in the product's words — or "3 / 10" without them. Its tokens are
  a new `comp.pagination` group. The native platforms have it as planned.

**Table**: the status line holds a Pagination — compact and small — beside a Select for the rows per page where the
product offers one; the range of rows shown stays the table's status text, and Previous and next links are never put
there. The table's fixtures that fill the status line now say "Page 1 of 33" (an intended change of their baselines),
and the docs show the composition in all six languages. The docs site's page footer uses Previous and next links.
