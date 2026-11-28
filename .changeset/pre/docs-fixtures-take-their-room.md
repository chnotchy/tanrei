---
'@tanrei/docs': patch
---

**Docs — a fixture on a component page's Specs tab is drawn whole at any width.** A stage that cannot be laid out at
the column's width without being drawn otherwise than its baseline is now laid out at its baseline's width and scaled
down to the column, as a window already was: a stage that stands for an area of a window (a popover's 480 × 480 around
its anchor, a docked date and time picker, a side sheet beside its page, a search dialog) and a stage whose drawing would
reach past it (a calendar 336 wide, a menu's open submenus, a resizable frame). At 390 wide a calendar was cut at its
end, a menu's second submenu was out of sight, a popover covered its own anchor and a side sheet's page was 0 wide.
The fixtures gallery's browser test now asks that every element a stage holds has both its lengths, and that what a
fixture draws stands inside its stage's box; a fixture meant to draw nothing is listed with its reason.
