---
'@tanrei/web': patch
---

Select and combobox: `aria-controls` now always names a list box that assistive technology can reach. A closed
select named its list box, which sits in a closed popover and is not in the accessibility tree, so the browser dropped
the reference. It now sets `aria-controls` only while the list is open, as the combobox already did. A list that is
open with no option, showing only its empty text, loading row or status, used to hide its list box with
`display: none`. That list box now stays in the accessibility tree, empty and with no height, so the open field's
`aria-controls` resolves and `aria-busy` reaches assistive technology while options load. Nothing is drawn
differently, and a closed field still draws no rows. The select spec (SEL-23, SEL-48) and the combobox spec (CMB-48)
say so.
