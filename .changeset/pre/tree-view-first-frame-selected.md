---
'@tanrei/web': patch
---

Tree view: a tree that appears on a page that is already drawn (a single-page product showing a view) is in its
selection from its first frame. Its selected rows no longer fade in from the unselected colors over the state motion
for their first 100 ms or so: the rows' `aria-selected` and `aria-expanded` are written when the tree is connected,
before anything styles them — the tree's own stylesheet check, or a product that reads the layout of what it has just
inserted — and again before its first update for a value set in between. A change of selection afterwards moves as
before.
