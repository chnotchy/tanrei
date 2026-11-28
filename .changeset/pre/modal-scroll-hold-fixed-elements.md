---
'@tanrei/web': patch
---

Modal surfaces (dialog, modal layer, modal side and bottom sheets, image preview, popover as a sheet, modal navigation
drawer, search as a dialog or full screen, modal date and time picker): where the browser cannot keep a classic scroll
bar's room for what is fixed to the window — Safari, and Chrome on macOS, under a scroll bar styled with
`::-webkit-scrollbar` — the window widens by the bar's width while the page's scroll is held, and an element fixed across
it moved. The hold now measures how much the window gained on each side and sets it on the document's root as
`--tanrei-scroll-hold-inset-left` and `--tanrei-scroll-hold-inset-right`, only while the scroll is held and only where
the window grew. A product's elements fixed to the window's edges add them to their insets, with `0px` as the fallback,
and stay where they were (the modal layer's page shows how). The snackbar does so itself, at the bottom and at the top
end. Nothing breaks.
