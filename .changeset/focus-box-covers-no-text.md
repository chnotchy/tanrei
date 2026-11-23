---
'@tanrei/web': patch
---

**The text under a focus ring drawn by a box of its own is checked for contrast.** A dialog, a bottom sheet, a side
sheet, a popover, a snackbar, a code block, a scroll area and an image preview draw the focus ring of their scrolling
body (or caption) with a box laid over it, which painted nothing at rest but was still, to axe's `color-contrast` rule, an
element covering the text: the whole body was left incomplete ("overlapped by another element") instead of checked. The
box is now hidden but while the ring shows, by a new primitive, `overRing(box, on)`, which draws the `inside` ring as
`focusRing()` does; nothing any of these components draws changes, at rest or focused.
