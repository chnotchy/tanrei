---
'@tanrei/web': minor
'@tanrei/react': minor
---

Menu: `iconSpace` (`auto` | `always` | `never`, default `auto`) decides the mark column and the leading icon column for
each section of a surface — a group, or a run of items outside any group — instead of for the whole surface.

- **`auto`**, the default: a row keeps a column's room while another item of its section draws in it (a checkbox or
  radio item its mark, an item its leading icon), so the labels within a section still start on one line, and a
  section with no mark or icon starts its labels where the row's content starts instead of after empty room. This is
  the default the navigation drawer and the tree view already have, with the same name and values.
- **`always`** keeps both columns on every row; **`never`** keeps a column only where the row draws in it.
- Each surface decides for itself and every submenu follows the menu's value; an unknown value is drawn as `auto` and
  reported in debug builds (MNU-59). The trailing icon column stays one per surface, so shortcuts and submenu
  indicators keep lining up.
- A menu whose sections all have, or all lack, marks and icons draws as before. A menu that mixes a section with icons
  or checkable items and a section without them now starts the labels of the second section further towards the start.
  The menubar's menus, the split button's and the menus inside the other components take the default. SwiftUI,
  Compose, Flutter and React Native do not have the prop yet and keep the columns for the whole surface.

Snapshot baselines: three new menu fixtures (`icon-space-auto`, `icon-space-always`, `icon-space-never`); no existing
fixture mixes such sections, so no existing baseline changes.
