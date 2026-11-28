---
'@tanrei/web': patch
---

App shell: the navigation's room no longer counts a classic scrollbar as part of the window. The navigation was held
to `100vw` less the main region's least width and the aside. `100vw` counts a scrollbar that takes room in the window
(a classic one on Windows and most Linux desktops, or the gutter `scrollbar-gutter: stable` keeps) as room of the
row's, so the main region got that much less than its least width: 10 less under a 10-wide scrollbar.

The element now measures the root element's content width with the resize observer it already runs
(`--_aps-window`). The navigation is never wider than that width less the main region's least width and the aside
(APS-5). The cap is exact with or without a classic scrollbar, and follows the scrollbar coming and going in the frame
it is drawn. The root is measured rather than the frame itself. In a box as wide as its content, the frame's width
follows the room it gives the navigation, so a room taken from the frame would shrink it in every frame. Before the
element has measured the root, and without script, the room is still taken from `100vw`.
