---
'@tanrei/web': patch
---

Navigation drawer: an open group's start chevron points down in right-to-left under every icon set. It was turned the
other way in right-to-left whenever the layout was right-to-left, which is right only when the icon set mirrors
`chevron_right`; under a set that does not (a product layer's own icon set), the unmirrored chevron pointed up. The other
turn now follows the glyph's mirror mark, so an unmirrored chevron keeps the left-to-right turn, and a change of
direction under such a set turns nothing.
