---
'@tanrei/web': patch
---

Every element draws its first frames at rest. From each time it is connected until two frames after its first update,
an element carries `data-tanrei-settling` on its host, and nothing in it starts a transition: a state it writes after
its first render is drawn as it is instead of fading or sliding in from a state it never showed — the check of a chosen
option or a checked menu item once its glyph can be drawn, an open submenu's row, a label that floats over a field's
entries. A product that reads the layout of a view it has just inserted no longer starts those motions either. The
surface an overlay opens is left alone, so an overlay that plays its entrance today still plays it when it is inserted
open or opened right after it is inserted (a dialog, a modal picker, an image preview, a search view).

The light-DOM stylesheets (`@tanrei/web/tree-view.css`, `table.css`, `accordion.css`, `table-of-contents.css`,
`breadcrumbs.css`, `link-card.css`, `skeleton.css`, `app-shell.css`, `page-header.css`, `description-list.css`,
`figure.css`, and a system's own copies of them) carry the same rule at their end: a page that serves its own copy of
one should take the new one.
