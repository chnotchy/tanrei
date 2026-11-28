---
'@tanrei/web': patch
---

Modal surfaces (dialog, modal layer, modal side and bottom sheets, image preview, popover as a sheet, modal navigation
drawer, search as a dialog or full screen, modal date and time picker): the page's scroll hold now measures the scroll
bar's room again each time the window is resized while it is held. Before, it measured once, as the surface opened, so a
window made shorter or taller while it was open (a bar that would come back, or would not) kept the old padding and the
old `--tanrei-scroll-hold-inset-left` / `-right`, and the page shifted sideways by the bar's width when the surface closed.
A page whose root sets `scrollbar-gutter: stable` itself is now measured too: Safari, and Chrome on macOS, keep no gutter
for a scroll bar styled with `::-webkit-scrollbar` even when the page asks for one, so the page shifted by the bar's width
as the surface opened. Nothing breaks.
