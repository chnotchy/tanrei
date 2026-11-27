---
'@tanrei/docs': patch
---

The docs' tables keep their height while a page's elements are defined, so the page no longer moves under the reader as
it loads.

- **A table of measurements follows the look the reader chose from the first frame.** Its figure is drawn in that
  look, and the table now holds, before any script runs, each look's value for every length and the note of each
  length a component draws otherwise in that look. In Cupertino the Main action button's table at a phone's width grew
  from 323.78 to 341.77 px, the Segmented button's and the Keyboard shortcut's from 89.95 to 125.92 px and the
  Navigation bar's from 59.97 to 113.92 px; the Loading indicator's in m3-like from 59.97 to 107.92 px. The record of
  the lengths a component draws otherwise (`lengths-not-drawn.json`) now says them for each look (`systems`), and the
  test of every figure holds it in each look.
- **A figure measures the box a component lays out.** A motion that never ends is held at its start while the figure
  measures: the Loading indicator's square was measured part of the way through its turn (31.7 px across for 24). The
  figure draws the component at its own width, and its stage scrolls sideways where that is wider than the room it
  holds: Cupertino's Main action button had its label wrapped onto two lines at a phone's width.
- **An anatomy table's part keeps its number and its name on one line in every engine**, held by a no-break space:
  Firefox broke the line between them only once the page's elements were defined, and the App bar's table at 1440 px
  went from 646 to 624 px.
