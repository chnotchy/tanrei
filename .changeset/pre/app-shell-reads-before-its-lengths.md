---
'@tanrei/web': patch
---

App shell: when a report from its resize observer arrives, the shell now reads the header's and the navigation bar's
boxes before it writes its own lengths (the window's width, the footer's height and a side sheet's width). It used to
write those lengths first. A frame whose main region scrolls, or that has no header, reads the layout to measure the
header or the menu button. A read after one of those writes made the browser style and lay out the whole page again
(0.34 s in WebKit and 0.14 s in Chromium, on a test page of 17 000 elements). That read now costs 11 ms in WebKit and
under 10 ms in Chromium. The lengths on the document's root are unchanged, and are still written only when their
value changes.
