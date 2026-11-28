---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
---

**Breaking — the text input's resize grip and the bottom sheet's grip are Handles.** A size is changed with one mark
everywhere: a Handle's line, or its arc at a corner. A glyph of dots read as "move this", which is a reorder handle's
sign.

- Text input and text field: a field with `resize="manual"` places a `<tanrei-handle size="small">` in its bottom end
  corner, a line for `resize-axis="vertical"` and an arc for `both`, out of sight until a pointer is over the field or the
  field has focus. It is drawn, targeted, focused and pressed as every Handle is, and is drawn alike in every look and in
  error. The part `resize-grip` is renamed `resize-handle`. Page Up and Page Down (and Shift with an arrow) now move it by
  `minRows` lines, and while `maxRows` is 0 its separator's greatest value is the lines the text needs.
- New event `resizeend` on the text input and the text field (React `onResizeend`), fired once when the person has
  changed the size: at the end of a drag, or after a key or an activation that changed it. `detail` is `{ lines, width }`
  (`width` is null unless `resize-axis` is both), so a product can keep the size a person chose.
- Bottom sheet: the drag handle is a `<tanrei-handle>` given the sheet's own tokens; the parts `handle` and `grip` are
  its `container` and `line`. Its hit area and its vertical resize cursor are the Handle's, it grows its grip under a
  pointer, and a drag that starts on it keeps it pressed while the sheet follows. At rest it is drawn as before.
- Tokens removed: `comp.text-input.resize-grip.size`, `comp.text-input.resize-grip.inset`, every
  `comp.text-input.<look>[.<state>][.error].resize-grip.color` (26 in all), and `comp.bottom-sheet.handle.grip-shape` (a
  Handle's line always has round ends). `comp.bottom-sheet.handle.*`, `comp.bottom-sheet.drag-handle.*` and the sheet's
  state motion now alias `comp.handle.*`, and the sheet's hovered and pressed grip colors are the Handle's line colors.
- Baselines: the text input's manual-resize fixtures change (the glyph is gone; the handle is out of sight at rest).
