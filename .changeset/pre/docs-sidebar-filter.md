---
'@tanrei/docs': patch
---

Documentation site: the sidebar filters itself, and "/" goes to its field.

- The sidebar is the navigation drawer with `filterable` on: a field above the list narrows it to the pages and groups
  whose name holds every word typed, opening for the time being the groups that hold them, and says how many match (or
  that none does). It marks nothing in a name, and keeps nothing: emptying the field puts the sidebar back as it was.
  Its name, hint, count, the words for no match and its clear button are in the six languages.
- "/" anywhere on the page, outside a field, moves focus to that field. In a medium window it expands the column of
  glyphs first; in a compact one it opens the drawer over the content. Command+K and Control+K stay the site's search,
  from the filter field as well; "/" typed in the search, or pressed on one of its results, stays the search's.
- Until the drawer is defined, the field's room is held, so the rows below it do not move when it is drawn; where no
  script runs there is no field.
