---
'@tanrei/web': patch
---

**`<tanrei-image-preview>`: the text under its focus boxes is checked for contrast.** The preview draws the stage's
focus ring with a box over the fit area and the caption's with a box over the caption, and a box that paints nothing is
still, to axe's `color-contrast` rule, an element covering the text under it: the error text and the caption were left
incomplete ("overlapped by another element") instead of checked. Both boxes are now drawn as no element, as the focus
boxes of the dialog, the sheets, the popover, the snackbar, the code block and the scroll area are: each holds the ring's
values and draws them by its `::before`. Nothing the preview draws changes, at rest or focused.
