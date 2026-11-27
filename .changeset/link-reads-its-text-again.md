---
'@tanrei/web': patch
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Web, Link: a label whose text is changed in place — the text node's `data`, as a framework updates text — is read
again, as a label whose nodes are replaced already was. A standalone link's direction (`dir`) follows the new label, and
with it the side of its glyph and its mark (LNK-26, LNK-14). Before, the link kept the direction of its first label.
No baseline changes.
