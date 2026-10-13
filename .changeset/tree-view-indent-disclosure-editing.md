---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Tree view: the compact indent, folders that open by their glyph, and names edited in place.**

- `indent="compact"`: a leaf keeps no chevron's box, so the leaves under a folder have their icons under the folder's
  own icon. How far a level steps in is still the token `comp.tree-view.level.indent`, whose default is the chevron's
  box and one gap; set it to any amount in your design system's layer.
- `disclosure="icon"` and `data-open-icon` on a parent's `.tanrei-icon` (`folder_open` beside `folder`): no chevron is
  drawn, the glyph shows open and closed, and a press on it opens and closes the folder. A parent without an open
  glyph keeps its chevron. With the default `disclosure="chevron"` an open glyph is drawn beside the chevron.
- `editable`: a double-click on a row's label, or F2, opens a field on the name; Enter or leaving the field fires
  `rename` (`label`, `previous`) on the item, Escape gives it up. The tree changes no label: set it yourself. `edit(li)`
  opens the field from script.
- `create({ parent, icon })` adds a row beside the selected item with an empty field; a name fires `create` (`label`,
  `parent`, `within`, `after`) and the item you add in answer takes the focus. Escape leaves nothing behind.
- `edit-label` (or `setWords({ editLabel })`) names the field. React: `onRename` and `onCreate`.

Four new baselines: `indent-compact`, `indent-compact-dense`, `disclosure-icon`, `disclosure-icon-compact`.
