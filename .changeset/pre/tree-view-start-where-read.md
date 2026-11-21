---
'@tanrei/web': patch
---

Tree view: a change of any token restyles a page of trees for less in WebKit. Where a row begins, and what stands
before its text, are no longer said in a custom property on each list (`--_trv-at`, `--_trv-lead`): each row computes
them from its level's two counts in the properties that place it (its padding and grid columns, its container, its
focus glow and its ripple). WebKit compares every inherited custom property that holds a `var()` with the value it
had, token by token, on every element and pseudo-element that inherits it; said on a list, those two long lengths
were compared again on every item, row and part under it at each change of contrast, scheme or system. Nothing it
draws changes: every row's padding, grid columns, height and box, its container's, chevron's, icon's, trailing text's
and ripple's boxes and every guide are the same in Chromium, Firefox and WebKit over sizes, chevron placements, icon
spaces, highlights, product indents, both directions and a narrow width, and in forced colors in Chromium. A change of
contrast on a page of fifty trees takes WebKit about 20 ms less style recalculation where motion is reduced (133 to
113 ms) and 8 ms less where it is not (87 to 79); on the restyle page with ten trees, about 3 ms less.
