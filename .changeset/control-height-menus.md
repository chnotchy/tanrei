---
'@tanrei/compose': minor
'@tanrei/swiftui': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/tokens-build': minor
'@tanrei/web': minor
---

**Menus and the options of a list are drawn at the control height.** A menu's item — opened from an anchor, as a
context menu or from a menu bar —, a select's and a combobox's option, a search's suggestion and result, and the item of
a FAB menu that a product includes now read `sys.control.height.medium` in their default size, and are marked
`"dev.tanrei.aligned": "control"`. At a control height of 32 they are 32 tall; at 36, 36.

- **The default system changes, as intended:** at the default control height of 40 these rows go from **48 to 40**
  (`comp.menu.container.height.medium`, `comp.select.option.height.medium`, `comp.combobox.option.height.medium`, and
  `comp.search.suggestion.container.height.medium` through the combobox's), so a menu's rows stand as tall as the
  Buttons and fields beside them. Their block paddings stay 8 at 40, and give up half of what the row loses below it.
  The web baselines of these components are recorded again for this change.
- The small sizes are unchanged: they already read the small step.
- `comp.fab-menu.item.height` is a menu item's height in its own vocabulary: a product that includes the FAB menu draws
  its items at its own menu's height (40 under the default system, where it was 48).
- **The presets keep their originals' heights**, pinned with the reason: m3-like and m3-expressive-like keep Material
  3's 48 menu item and 56 FAB menu item; cupertino keeps its 44 menu, option and suggestion rows.
- New behaviour: MNU-70, SEL-74, CMB-84, SRC-58 and FBM-29 say a default row is as tall as the control height.
