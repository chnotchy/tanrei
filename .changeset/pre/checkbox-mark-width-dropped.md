---
'@tanrei/web': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Checkbox: **breaking** — `comp.checkbox.mark.width` is removed (`--tanrei-comp-checkbox-mark-width` on the web, and the
generated token on every platform). No behaviour of the checkbox reads it: the check and the dash are glyphs of the
icon set, sized by `mark.size` and weighted by `mark.weight`. It was kept only for implementations that still drew the
mark as paths; a 0.x prerelease keeps no token for an old implementation. A layer that set it drops the line. The
native platforms, which still draw the mark (and the menu's and the list's checks) as paths, owe the change with
the rest of their catch-up.
