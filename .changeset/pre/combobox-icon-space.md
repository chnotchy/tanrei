---
'@tanrei/web': minor
---

Combobox and Combobox field have `iconSpace` (`icon-space`: `auto`, `always`, `never`; default `auto`), with the
menu's and the select's values and default. The leading icon column is decided section by section of what the list
shows: the shown options of a group, or a run of shown options outside any group. While `auto` a shown option
without a `leading-icon` keeps the column, empty, where another shown option of its section has one, and a section
without icons keeps none. An option the filter hides no longer counts: before, the column stayed in every row while
any option, shown or not, had an icon. `always` keeps the column in every option, `never` only where an option has an
icon.

What changed for an existing page: a combobox whose groups differ in icons, or whose filter hides every option with
an icon, starts the labels of a section without icons at the row's start; set `icon-space="always"` for the old look.
Baselines: new fixtures `icon-space-auto`, `icon-space-always` and `icon-space-never`; no existing fixture changes (the
open right-to-left fixture's filter shows only the group that has an icon).
