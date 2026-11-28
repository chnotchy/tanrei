---
'@tanrei/web': patch
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Web, icons.css: it says that it is loaded (`--tanrei-icons`) in a shadow root of the product's that loads it as its own
sheet, through `:host`, not on the document's root alone. A link in such a root, in a page whose document loads no
icons.css, kept no room for its glyph: a trailing glyph was drawn past the end of its line — past a dialog's body in
Chromium, over the label's last word in Firefox and WebKit (LNK-14). No baseline changes: every fixture is drawn in a
document that loads icons.css.
