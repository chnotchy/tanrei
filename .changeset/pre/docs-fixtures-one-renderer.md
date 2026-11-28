---
'@tanrei/docs': patch
---

Documentation site: every fixture is drawn from the web package's own document of it, in the page too.

- A fixture drawn in the page is now the stage the web package's tests draw it on and take its baseline from, with the
  component's staging scoped to it: what the Specs tab shows is what every platform's baseline is compared with. The
  site's second renderer of fixtures is gone.
- The Code block, Inline code, Link, Navigation drawer, Previous and next links, Scroll area, Steps and Timeline pages
  draw their fixtures that are not presented in the page, instead of each in a window of its own; a scroll area is
  scrolled to its middle there by the same step its document takes.
- A stage holds the room of its baseline before it is drawn, and that is the room it takes: nothing below it moves when
  it is drawn (179 stages of 2,390 grew at 1440 wide, 345 at 390).
- A fixture as wide as its layout has its width handle wherever its staging gives it that width, and is laid out at the
  column's width where the column is narrower.
- The words "Not drawn on this page yet; see the examples above." are gone in every language: every fixture of a
  component the web implements is drawn.
