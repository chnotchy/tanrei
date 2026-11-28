---
'@tanrei/web': patch
---

Page header: only a meta item that begins with a glyph or an Avatar (`.tanrei-icon`, `tanrei-avatar`, an `svg` or an
`img`) is laid out as a row with `meta.icon.gap` between the picture and its text. An item whose text holds another
element, such as `<span>Published <time>…</time></span>`, stays a run of text and keeps its space; it was given the
icon gap in place of the space.
