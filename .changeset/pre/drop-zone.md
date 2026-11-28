---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

A new component, the drop zone (`<tanrei-drop-zone>`, React `DropZone`): it wraps any part of a screen — a list, a
table, an app's main region — so that files can be dropped anywhere on it, while everything it holds is used exactly as
before. It draws nothing at rest and adds no hover, no press, no focus stop and no role. While files (and only files)
are dragged over it, one overlay covers its box above all its content — a scrim, an edge and a panel with the upload
glyph and the product's message — without taking a press or a scroll; the panel stands in the part of the zone that is
in view. On the drop it judges the files by the File picker's rule (`accept`, `max-size`, `multiple`, `max-files`) and
emits the File picker's `select` and `reject`, so a product can hand them to a File upload's `add()` or to a list of its
own; the innermost zone, or a File picker's drop area inside it, takes a drop. One polite live region says how many files
were accepted and refused, in the product's words (`dropped-text`, `refused-text`, or `silent` where a File upload says
them). The spec requires every screen with a drop zone to also offer a File picker or a File upload, since dragging has
no keyboard equivalent, and a debug build reports a page that has none. New tokens `comp.drop-zone.*` (scrim, edge,
panel, glyph, message, refusing, motion), all aliases of system tokens, and four new keys of the product's words
(`dropZoneText`, `dropZoneRefusingText`, `filesDroppedText`, `filesRefusedText`). The File picker's judging moved to a
shared module that both use; its behaviour is unchanged. Web only; the native platforms are planned. New baselines are
the drop zone's six fixtures and its preset representative; no existing baseline changes.
