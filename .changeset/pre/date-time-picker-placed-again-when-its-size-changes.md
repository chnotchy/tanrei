---
'@tanrei/web': patch
---

A docked date-time picker whose own size changes while it is open, with its anchor still and its body's scroll height
as it was — a heading or a footer that grows, the text size changed, less than a pixel — is placed again (DTM-2). It
was placed again only when its anchor, the window, the body's scroll height or the direction changed, so a picker
flipped above its anchor kept its old top: it grew over the offset and over its anchor, or left a gap, until something
else moved. What the picker follows now holds the surface's own size as laid out.
