---
'@tanrei/web': patch
'@tanrei/react': patch
---

A snackbar at the bottom of the window no longer covers a bottom navigation bar: its bottom edge stands the container margin above the higher of the safe area's bottom inset and what the frame keeps over the bottom of the window (`--tanrei-app-shell-scroll-offset-end`, which `<tanrei-app-shell>` writes for its navigation bar and a product's own bar may set), and above the on-screen keyboard by that much again. It is centred between the safe area's side insets and stays the margin inside them, as the top-end placement already did. At either placement, an expanded snackbar is at most as tall as the window less what the frame keeps over its top and its bottom (SNK-13, SNK-25).
