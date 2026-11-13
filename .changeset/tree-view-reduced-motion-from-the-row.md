---
'@tanrei/web': patch
---

Tree view: a change of any token restyles a page of trees for less in WebKit and Chromium. Where motion is reduced, a
row's chevron box, its container and its supporting and trailing texts no longer have reduced rules of their own: the
row's reduced rule sets `--_trv-still: none`, and their transitions read it (`var(--_trv-still, <their own>)`). The
build writes every reduced rule of the sheet again under the root's `--tanrei-motion` style query, and such a rule
costs WebKit at every element it matches each time the tree is styled again, a pseudo-element about four times an
element; the row's chevron box and container are pseudo-elements. Nothing drawn or moved changes: every transition and
animation value of every element and pseudo-element of a tree is the same in Chromium, Firefox and WebKit, with no
preference, with the person's setting, with the product's attribute, with the product's `--tanrei-motion` on an
ancestor or on the tree, and inside a product's shadow root (the sheet adopted there); and every row's geometry, as
before, over sizes, chevron placements, icon spaces, highlights, indents, both directions and a narrow width. A change
of contrast on a page of fifty trees takes WebKit 8 ms less style recalculation with the usual reduced-motion reset on
the page (117 to 109 ms), 6 ms less where motion is reduced without it (65 to 59) and 4 ms less where it is not (70 to
66); Chromium 6, 2 and 1 ms less; Firefox the same.
