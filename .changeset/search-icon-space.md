---
'@tanrei/web': minor
---

Search has `iconSpace` (`icon-space`: `auto`, `always`, `never`; default `auto`), with the menu's values and default.
The view is decided as a whole, as before: `auto` keeps the leading icon column, empty, in every suggestion, result
and linked group heading while any of them has an icon, and none while none has — what the search always did.
`always` keeps the column in every row, whether or not any row has an icon; `never` keeps it only in a row that has
an icon of its own.

No existing baseline changes, since `auto` is the old behaviour; new fixtures `icon-space-auto`, `icon-space-always`
and `icon-space-never` have new baselines.
