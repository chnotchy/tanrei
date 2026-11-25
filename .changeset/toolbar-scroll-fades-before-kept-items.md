---
'@tanrei/web': patch
---

Toolbar: while the items scroll with a run kept at the end (`overflow="scroll"` and `toolbar-overflow="never"` on the last items), the items that scroll fade out toward an edge they lie beyond, over `sys.scroll-edge.extent`, or less as they near the end of the scroll. A cut piece of an item no longer stands against the kept items, such as a half glyph beside Send; the first and the last item are drawn whole once scrolled to. The fade is a mask on the items, with no color of its own, so the toolbar's surface, or what lies behind an inline toolbar, shows through. An item that takes keyboard focus is scrolled clear of the fade.

The baseline `toolbar/inline-scroll-pinned` changes: the action before Send is faded toward Send.
