---
'@tanrei/web': patch
---

Search: a debug build now reports what the trailing box lays out (SRC-27), from the box's own reading of it, so the
report no longer depends on what brought it there. Text that appears without a `slotchange` (white space among
forwarded Buttons becoming text, or text written into an element of `display: contents`) and text an element of
`display: contents` holds are now reported, as forwarded text already was. The "more than two elements" check now
counts the elements the box lays out: an element of `display: contents` holding two Buttons counts as two, not one, and
an element that is not laid out (`display: none`) is no longer counted.
