---
'@tanrei/web': patch
'@tanrei/react': patch
---

Popover, Select and Combobox: where `sys.motion.appear.blur` is 0 — every shipped system — the surface that appears
has no filter, closed or open, and no transition of `filter` runs as it opens and closes (it went from `blur(0px)` to
`none`, which draws nothing). In WebKit on Linux a running transition of `filter` crashes or stalls the page. A blur a
layer sets is drawn and moves as before.
