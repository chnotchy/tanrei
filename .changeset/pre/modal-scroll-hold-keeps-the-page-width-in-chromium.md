---
'@tanrei/web': patch
---

Modal surfaces (dialog, modal layer, modal side and bottom sheets, image preview, popover as a sheet, modal navigation
drawer, search as a dialog or full screen, modal date and time picker): in Chrome and Edge on Windows and Linux, where
the scroll bar takes room, the page behind no longer narrows by the scroll bar's width while the surface is open.
Holding the page's scroll keeps the bar's room as a stable gutter. Chromium reports that gutter as no room taken, so
padding as wide as the bar was added over it. The room the hold keeps is now read from the root's own box, and padding
is added only where the browser keeps no gutter: Safari, and Chrome on macOS under a bar styled with
`::-webkit-scrollbar`. There, an element in `position: fixed` across the window still moves by the bar's width, as
before. Nothing breaks.
