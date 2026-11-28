---
'@tanrei/web': patch
---

The cloak (`@tanrei/web/cloak.css`) holds a calendar at the box it draws: its navigation row, its weekday row and six
rows of days, each a cell (`comp.calendar.cell.size`, never less than the pointer target, or the touch target under a
coarse pointer), seven cells wide and never wider than its place. The year view takes the same room. Before this, a
calendar that was not yet defined took no room, so the page grew by its whole height (384 px in every shipped system)
when it was defined.
