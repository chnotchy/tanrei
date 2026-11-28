---
'@tanrei/cli': patch
---

Theme Studio (served by `tanrei studio`, and on the documentation site): stepping a number with the keys — a palette's
hue or chroma, a dial, any number field or slider of the Studio, with Up and Down Arrow, Page Up and Page Down, or a
held key — no longer computes and saves the whole layer at every step. The steps made on one control are one change,
as a drag is: each step is shown as it is made (a palette's color and a dial are drawn without computing the layer),
the layer is computed once the keys rest, and the change is saved 300 ms after the last key is released, at Enter, or
when focus leaves the control. Twenty presses of Up Arrow on a palette's chroma computed the layer twenty times; they
now compute it once.
