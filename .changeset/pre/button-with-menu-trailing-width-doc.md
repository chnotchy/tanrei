---
'@tanrei/web': patch
---

Button with menu: the `trailingWidth` description (and so `custom-elements.json`) no longer gives widths from an
earlier revision. It names the tokens that set each width: `trailing.padding-inline` (or `trailing.padding-inline-narrow`
for `narrow`) on each side of the chevron, and `container.outer-inset` at the rounded outer end.
