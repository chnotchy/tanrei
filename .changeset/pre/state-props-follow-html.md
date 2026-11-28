---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Breaking — Switch, Radio button, Tabs, Tab view.** A state prop is named as HTML names it, in the specs and on the
web, so a person who knows a native control knows Tanrei's.

- Switch: `selected` is now `checked`, as on a native checkbox: `<tanrei-switch checked>`, `<Switch checked={on}>`.
  The attribute is still the default a form reset returns to. `selected-icon` / `selectedIcon` and `unselected-icon` /
  `unselectedIcon` are now `checked-icon` / `checkedIcon` and `unchecked-icon` / `uncheckedIcon`. `change` carries
  `detail.checked` instead of `detail.selected`. The old names are gone: there is no alias, and an old attribute or
  property does nothing.
- Radio button: the spec's `selected` is now `checked`, the name the web element already had. Nothing changes on the
  web.
- Tabs and Tab view: the spec's `selected` is now `value`, the name the web elements already had, as a `<select>`'s.
  Nothing changes on the web.

SwiftUI, Jetpack Compose, Flutter and React Native keep their own names for these props (`isOn`, `checked`, `value`,
`selection`, `selectedValue`, …); only the specs' names changed. The fixtures and the tokens keep the conditions they
draw (`selected`, `unselected`), so no baseline changes.
