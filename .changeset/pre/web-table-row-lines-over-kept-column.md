---
'@tanrei/web': patch
---

Table: across a table whose first column is kept in view (`sticky-first-column`), the lines between rows now run
unbroken over the kept column, wherever the page places the table. A kept cell is a sticky box, and Chromium places one
on whole pixels by a rounding it does not redo when the table moves by a fraction of a pixel (content above it settling
after the first frame): a kept cell first drawn on a half pixel stayed a pixel from its row, and the line it drew broke
the row's line there. In such a table the line between two rows is now a box of the row under it — its `::before`,
absolutely positioned where the row stands, with the `<table>` positioned (`position: relative`) as its containing
block — placed as the cells that scroll are and drawn over the kept cells; the cells draw none, their padding taking
the line's room, and a stripe or a chosen row's fill stops short of it as it stopped short of the border. The kept
column's line along its inner edge (TBL-20) is the kept cell's own `::after`, which stops at the row's line instead of
crossing it. A table with a cell that spans rows, and a header row kept in view (`sticky-header`), keep the cells' own
lines. Stacking inside the table: a header row kept in view is at 3 and its kept first cell at 4, above the rows' lines
(2); without a header row kept in view the kept header cell stays at the kept column's level (1), under them.

What is left: a kept cell's own contents can still be drawn a pixel from the rest of its row in that case (Chromium's
rounding); only the lines are the rows'.

The `table/rtl-wide-sticky-column` baseline is recorded again: its rows' lines are unbroken over the kept column, and
the "more at the end" line along its left edge reaches the table's last row (device row 545), where the old image held
it a pixel short. `@tanrei/web/all`'s bundle budget rises by 400 bytes (668700 to 669100) and the table's by 100 bytes
(27000 to 27100) for these rules.
