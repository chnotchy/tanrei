---
'@tanrei/web': minor
---

Select and Select field have `iconSpace` (`icon-space`: `auto`, `always`, `never`; default `auto`), with the menu's
values and default. The leading icon column is now decided section by section, as the menu decides it: a section is
an option group, or a run of options outside any group. While `auto` an option without a `leading-icon` keeps the
column, empty, where another option of its section has one, and a section where no option has an icon keeps none,
its labels starting at the row's content start. `always` keeps the column in every option, `never` only where an option
has an icon.

What changed for an existing page: a select whose groups differ in icons kept the column in every row of its list;
the group without icons now starts its labels at the row's start. Set `icon-space="always"` for the old look of such
a list. A list in which all or none of the options have icons draws as before.

Baselines: new fixtures `icon-space-auto`, `icon-space-always` and `icon-space-never`. The baselines of the open
right-to-left fixtures whose second group has no icon change as intended — `select/open-rtl`, `select-field/open-rtl`
and `field/select-open-rtl`: that group's labels now start at the row's start.
