---
'@tanrei/web': patch
---

The web reference and the docs state the default system's small size as it is drawn: an icon-only Button at its default width is `comp.button.container.height` of its size wide, 36 / 40 / 56 (they said 32 / 40 / 56, the height before the minimum target holds the small one at 36). The same correction reaches the button with menu's `size` and `trailingWidth` (its default trailing half is 40 / 44 / 60 with the outer padding, its narrow one 32 / 36 / 36 with it), the text field's heights, the pagination's item heights (36 / 40) and the segmented button's heights (36 / 36 / 40). No change to what is drawn.
