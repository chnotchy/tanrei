---
'@tanrei/cli': patch
---

Theme Studio (served by `tanrei studio`, and on the documentation site): dragging a dial's slider — text size, type
contrast, spacing, size, shape, stroke, motion — no longer computes the whole layer while it moves. A dial reaches the
preview's stylesheet as one custom property that every token derived from it follows in CSS, so the slider's value is
set on the preview at the next frame, with the few text-style values the build writes as numbers (letter spacing in
`em`); the layer is computed when the press ends, or once the pointer has rested. The same final value gives the same
theme. While a value is dragged, the preview also no longer keeps a value from earlier in the drag once the value
returns to where the drag started.
