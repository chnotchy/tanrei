---
'@tanrei/web': patch
'@tanrei/react': patch
---

**Navigation drawer: a destination keeps an end chevron's room only after trailing content of its own.** With the
chevron at the end (and in a collapsible drawer, which draws a start chevron there), a destination's row kept the
chevron's room and a gap, empty, at its end whether it had anything there or not. It now keeps them only after its own
trailing content (a count, a glyph, the mark of a link that opens elsewhere), so that the trailing content of a level
still stands in one column; a row with nothing at its end gives that room to its label: 32 px in the default system (the
chevron's 20 and the gap's 12). In the documentation site's 240 px sidebar a component's label, two levels deep, had
88 px and now has 120. Fixtures in which a destination's label was cut show more of it.
