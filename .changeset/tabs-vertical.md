---
'@tanrei/web': minor
---

Tabs run vertically. `<tanrei-tabs orientation="vertical">` stacks its tabs in a column at the start edge, beside the
panels it switches — the categories of a settings page or a dialog. Every tab is as wide as the widest (or as
`::part(tablist)` makes the column), with its icon before its label at the start edge, and at least the minimum target
tall. The indicator and the hover, focus and press container are the tab less the track's inset on every side, and the
track's corners are the indicator's plus that inset, so the two stay concentric at the ends — derived from the existing
tokens; no token is added. Down and Up Arrow move and select (Right and Left do nothing), the tab list has
`aria-orientation="vertical"`, the tabs scroll up and down inside the track when the row has a height, and only a mouse
or a pen drags the indicator (a touch scrolls). A design system's underline and divider lie on the column's end edge,
the left one in right-to-left. `fullWidth` does not apply to a column, and debug builds say so; an orientation the tabs
do not define is horizontal, and reported. Vertical tabs are not navigation between destinations: that is the
navigation drawer's.

Seven new fixtures (`vertical`, `vertical-small`, `vertical-scroll`, `vertical-rtl`, `vertical-disabled-tab`,
`vertical-secondary`, `vertical-no-track`) and the preset baselines of `vertical` add new baselines; no existing
baseline changes.
