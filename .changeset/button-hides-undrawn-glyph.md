---
'@tanrei/web': patch
---

Button, main action button, button with menu, chip, tag and dialog: a glyph the icon set cannot draw yet — its font is
still loading, failed to load, or the system switched to an icon set whose font is not there — is no longer drawn as
its name in a text face, clipped by the icon box (`ad` for `add`, `fav` for `favorite`, `op` for a link's
`open_in_new`). Nothing is drawn in its place until the font can draw it, and it then appears at once. The glyph's box
keeps its size, so nothing moves, and the component's name, label and state are unchanged meanwhile. This holds for the
glyph a product puts in the `icon` slot (and a button with menu's `chevron` slots) as for the glyphs the components draw
themselves: a Button's and a chip's new-tab mark, expand_more, a chip's check and remove glyph. Every component that
draws a Button with a glyph in it — a callout's or a sheet's close button, a field's clear button — gets the same.
