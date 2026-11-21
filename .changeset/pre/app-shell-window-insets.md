---
'@tanrei/web': patch
'@tanrei/react': patch
---

`<tanrei-app-shell>` now writes how far its header and its navigation bar reach over the window as `--tanrei-app-shell-window-inset-top` and `--tanrei-app-shell-window-inset-bottom` on the document's root, whatever `scroll` is. A snackbar reads these, so with `scroll="main"` a snackbar at the top end no longer covers the header and one at the bottom no longer covers the navigation bar (APS-17, SNK-13, SNK-35). With `scroll="main"` the header never moves, so the top inset runs to the header's bottom edge and counts an announcement above it.

Breaking: the snackbar now reads `--tanrei-app-shell-window-inset-top` and `--tanrei-app-shell-window-inset-bottom` instead of `--tanrei-app-shell-scroll-offset` and `--tanrei-app-shell-scroll-offset-end`. A product whose own frame set the scroll offsets to keep snackbars clear of its bars should set the window insets instead. The scroll offsets keep their meaning: what stands over the scrolling view, used for the page's scroll padding and the product's sticky parts. With `scroll="main"` they are nothing, as before.
