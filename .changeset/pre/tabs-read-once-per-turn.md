---
'@tanrei/web': patch
---

A row of tabs costs the same for each tab at 1,000 tabs as at 100, and a key press reads the row's layout once. Each tab
and panel tells its row when a prop the row reads changes, and the row re-read every tab and panel each time — so
building a row of N tabs with their panels re-read it 2N times: about two minutes for 1,000 tabs in Chromium. The row
now re-reads its tabs once per turn, in a microtask before the next frame (and at once before it handles a key, a
press, a click or focus), and looks each value's tab and panel up once. A row of 1,000 tabs with panels builds in about
0.3 s; every frame draws the tabs as before.

A key press that selects another tab read every tab's boxes and computed style several times over — 318 box reads and
87 style reads for a row of 20 — as the indicator's slide, the scroll that brings the tab into view and the re-sizing
of every tab each read them again. It now reads them once (44 and 5): a new selection re-sizes no tab (the selected
label keeps the width it has at either weight), the slide and the scroll share one reading of the row, the layout
direction is read from the document instead of the cascade, and the label of a tab in a row that hugs is not measured
again for a selection.

Debug builds count each re-read on `globalThis.__tanreiCounts` (`tabs.sync`), for the performance tests; a production
build counts nothing. No baseline changes.
