---
'@tanrei/web': patch
'@tanrei/react': patch
---

Modal layer, Dialog, Bottom sheet, Side sheet, Navigation drawer, Date-time picker and Search: where the scrim blur
(`comp.modal-layer.scrim.blur` and the tokens that alias it) is 0 — every shipped system — the scrim has no backdrop
filter, instead of `blur(0px)`, which drew nothing. In WebKit on Linux a backdrop that holds a filter makes the page redraw
everything under it whenever anything changes: on a page of 27 open modal date-time pickers a 1-pixel change took about
2 s to draw, and 16–23 ms without the filter. A blur a layer sets is drawn as before.
