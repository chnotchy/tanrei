---
'@tanrei/web': patch
---

Table: the element no longer adds style rules to the page. It used to insert a rule into a sheet of its own for each
column position and column count a table needed (a column's alignment and wrapping named on its header cell, and the
cells after the last column), and to add a sheet for each size a design system added. In WebKit each such rule or
sheet has the browser build every rule of the page again. On a test page of 26 500 elements with 30 tables (46 such
rules in two sheets), WebKit took 528 to 553 ms from the bundle's start to the tables' second frame, and now takes 420
to 450 ms (medians of five loads, in three rounds); Chromium is unchanged (282 and 289 ms).

The rules of the first 16 column positions and column counts are now part of `@tanrei/web/table.css` (and of the sheet
the element brings to a root without it), the last rules of its layer. They match the same attributes the element
writes on itself (`data-columns-center`, `-end`, `-nowrap`, `data-columns`), so a server that writes these attributes
has its columns aligned before any script runs. A table of more than 16 columns still adds, once for the page, the
rules of the positions beyond the 16th. A size a design system added is now written in the element's own style, as the
size's private custom properties (read from that size's tokens, each falling back to `medium`'s), and taken off when
the table draws a core size again. Nothing a table draws changes.
