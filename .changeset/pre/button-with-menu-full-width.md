---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Button with menu: `fullWidth` (the `full-width` attribute on the web), as Button's. The button with menu takes the
whole width its container gives it, at the height of its size. The leading half takes the extra width, with its icon
and label centred in it as a full-width Button's are, and the trailing half keeps the width `trailingWidth` gives it,
as the leading button of a split button takes the room its trailing button leaves. A label that does not fit wraps,
its lines centred, and both halves grow in height with it. A toolbar lays a button with menu out and gives it its
width, so `fullWidth` does nothing there, as on a Button. The native platforms map the prop and do not draw it yet;
their notes say so.

New baseline owed, the intended result of this change: button-with-menu `filled-full-width`. No existing baseline
changes.
