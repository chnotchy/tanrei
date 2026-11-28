---
'@tanrei/web': patch
---

Tree view: a change of any token (a change of contrast, a scheme, a system) restyles a page of trees for less. Where
each level's rows begin is now said once for each list, from two counts that every item hands on (how many items hold
it, of each of the two steps an item may take) and two step lengths said once on the tree, instead of a length that
grew by every level's whole expression of the size tokens and was substituted again on every item and every row
(858 characters at the third level). Nothing it draws changes: every row's padding, grid columns and height, its
container's, chevron's, icon's and trailing text's boxes and every guide are the same in Chromium, Firefox and WebKit
over sizes, chevron placements, icon spaces, highlights, product indents, both directions and a width narrow enough
to hold the deepest level back from the middle. On the restyle page with ten trees (740 tree elements), a change of
contrast takes WebKit about 7 ms less style recalculation (59 to 52 ms, against 28 for the page without trees), and
Chromium about 2 ms less.

The byte budget of `@tanrei/web/all` goes from 667400 to 667500 bytes gzip (667406 measured, 52 more than before this
change): the two step lengths, the counts and the guides' own start are new declarations, which the arithmetic they
replace on every item does not quite pay for in bytes. The tree view's own bundle stays within its budget.
