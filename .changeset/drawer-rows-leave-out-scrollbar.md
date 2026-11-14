---
'@tanrei/web': patch
---

Navigation drawer: under a scroll bar that takes room in the window, a modal drawer's rows now end where the drawer
does. This covers a classic scroll bar (Windows, most Linux desktops, a styled one) and the gutter kept while the page's
scroll is held. Over the content the drawer stays a touch target away from the window's end edge, and its rows were
laid out at a width taken from `100vw`. `100vw` counts such a scroll bar as part of the window, so in a window narrower
than `container.width`, a touch target and the bar together, the rows were up to a bar's width wider than the drawer,
and their ends were cut. This happened while the drawer was open, where the page keeps the scroll bar's gutter, or
through the slide out, where the page gets the scroll bar back as the drawer leaves. The drawer now measures the window
less its scroll bar while it is over the content, and follows it in the frame it changes. Before that first
measurement, and without script, it still uses `100vw`.

No baseline changes: no fixture draws a scroll bar.
