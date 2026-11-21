---
'@tanrei/web': patch
'@tanrei/react': patch
---

Side sheet: a standard sheet no longer makes the page scroll sideways. Its panel slides out past the end of its width,
and only a `clip-path` hid that part, so the page stayed one panel wider than the window — closed, and in every frame
of the slide. Opening the sheet moved focus into a panel that was still partly past the window's edge, and the window
scrolled sideways by the panel's width (320 px in the default system) in Chromium, Firefox and WebKit, in an app
shell's aside and at the end of any page's row, left to right and right to left. The panel is now held by a box that
ends with the sheet's width and clips what passes it, so the page is never wider than the window; that box draws the
variant's elevation, which still shows toward the content. A modal sheet was not affected. Nothing drawn changes: the
side sheet's baselines are unchanged.

`@tanrei/web/all`'s bundle budget rises by 100 bytes, to 668200: the box and its rule add 42 bytes gzip to it
(668107), 7 over the budget it had; the side sheet's own bundle grows by 49 bytes, to 47364, within its budget.
