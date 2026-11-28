---
'@tanrei/web': patch
---

A number input, a text input, and the select, combobox and color input that float a label, no longer have the browser
report "ResizeObserver loop completed with undelivered notifications" when their width changes in a box whose size
does not change. Each wrote sizes inside its own resize observer's callback, and the boxes it wrote had already been
reported in that frame:

- An auto-resized multi-line text input whose lines wrap is now as tall as its lines by the browser's own layout
  (`field-sizing: content`, in every engine the tests run). A changed width or text size changes the height in the
  frame of the change, and the element only reads it. Empty, it is `minRows` lines whatever its placeholder holds. In
  a place that sizes the field to its content, the text it holds no longer gives the field a width. A browser without
  `field-sizing`, and a code field whose lines do not wrap, fit the height in the next frame's read phase, so the frame
  after a change of width still shows the height from before it.
- Whether a number input's steppers stand on a row of their own is now read and written in the next frame's read
  phase. The container still wraps in the frame of the change. In the frame after it, a row of the steppers alone
  still lacks its bottom inset (or a row that wraps no longer still keeps it), and a resting floating label still
  stands where it stood.
- The lines of a floating label, measured when its width changes, are now written in the next frame's read phase.
  The first frame drawn still gives a wrapped label its room.
