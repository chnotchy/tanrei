---
'@tanrei/web': patch
---

The rules that align a table's column by its header cell and keep it on one line (TBL-3, TBL-7), and that leave out the
cells past the last column (TBL-14), are now in `table.css` for the first twelve positions. A table that needs none past
them no longer adds a sheet to its page as it upgrades: a sheet added to the document had WebKit style every element of
the page again (about 0.7 s on a long documentation page). A table of more columns still adds one, for the positions past
the twelfth. The rules now come with `table.css` in whatever layer the page loads it into, last in it; the cell's own
`data-align` and `data-wrap` still win, and so does a class of the product's outside any layer. What a table draws is
unchanged.
