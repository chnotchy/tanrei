---
'@tanrei/web': patch
---

In Safari (WebKit), a popover, a menu, a select's list or a dialog now opens without restyling the whole page, and a
table of contents that ends a hold no longer restyles it either. Each opening added a `wheel` listener to the window
(for the acts that end a still pointer, MOT-3), and the next act took it off; a table of contents did the same between
the view's stop at a chosen item and the person's scrolling (TOC-12). WebKit keeps in every element's style whether the
page listens for the wheel, so each such add or removal had the next read restyle every element. Those listeners are
now added once — at the page's first opening, and by a table of contents while it is connected — and are never taken
off during an interaction. On a page of 3,000 rows and 200 buttons, from the second opening on, the opening's style read
in WebKit went from 40–47 ms to 2 ms or less, and a click to the first frame drawn from 68–85 ms to 31 ms; a press that
let a still pointer go, from its press to its click, went from 48 ms to 8–10 ms. Chromium and Firefox were unaffected.
What each act does is unchanged.
