---
'@tanrei/web': patch
---

A navigation drawer that is connected now writes its state attributes before it first reads its widths from the
cascade. The read styles the page, and an app shell's stylesheet asks the drawer's `data-resize` what it hands the
whole page (the band its main content starts past, APS-8): read between the drawer's definition and its attributes,
the page was styled with the band taken away and styled again with it given back. In WebKit, on a long page, that was
two styles of the whole page (0.5 and 0.7 s on the docs' Arabic button page in a two-core Linux container) where one
of 0.2 s is left. What the drawer draws, and when, is unchanged.
