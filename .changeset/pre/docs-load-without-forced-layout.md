---
'@tanrei/web': patch
'@tanrei/docs': patch
---

A page that is still loading is no longer styled or laid out again for a read of the elements' own: each read that had
the browser lay the whole page out before DOMContentLoaded — in WebKit, 0.13 to 0.8 s each on the docs' Arabic Button
page — is made where the layout is already done, from an observer's report, or after the first paint. What is drawn
does not change.

- Whether the browser answers style container queries: the probe is put in the page when the first element asks and
  read in the first frame's read phase, after its layout, with the frame's style; it is an element of no size, not one
  of no box (in WebKit, an element of no box put in the root element had the whole page laid out again).
- Table: a table in content the browser skips (`content-visibility`, a closed disclosure) or under no box is not
  measured; its observer reports it once it is drawn. A report that finds the table's boxes as its last measure read
  them reads nothing.
- Figure: whether a stage scrolls (FIG-6) is read in a frame's read phase, never in the observer's report; what that
  report asks for is measured in the next frame's phase.
- App bar: its first decision of the actions that fit reads its boxes with the read phase's reads and writes with its
  writes, and a report that finds its boxes as it last read them reads nothing.
- Description list: while the page has not been painted, the rule that stacks a list narrower than its widest term is
  added once the page has been painted, where the list has room to stay in two columns; a list narrower than that has
  it at once. A rule added to the page's sheets had WebKit build every rule of the page again (0.8 s).
- Table of contents: until the document has been painted, where the targets scroll, the rule and the row kept in view
  are read in the read phase, not in a frame callback or the update. The rule is read with the phase's reads where the
  root already draws the list, and after the phase's writes only where those writes add the list's stylesheet to its
  root: read in the writes everywhere, it came after other elements' writes (a glyph's style given back) and had the
  page styled again for it.
- Navigation drawer: the motions of its first frame are given back in the next frame's callbacks, not after a read of
  the layout; a report of its resize watch that finds it at the size it was read at reads nothing.
- Docs: the head's icon probes are decided by the resize observer's report, not by a read of the layout in the head
  and at DOMContentLoaded (0.8 s in WebKit); a stage's width handle reads its first value once the page has loaded.
  A browser test holds a loading docs page to no forced style or layout pass before DOMContentLoaded from these scripts.
- A production bundle leaves out more of what only a debug build runs: the message an element's availability report
  would make (every element), and the App shell's check of its values (APS-29). The probe is written in fewer bytes.
  The App shell's bundle stays within its budget with the changes above.
