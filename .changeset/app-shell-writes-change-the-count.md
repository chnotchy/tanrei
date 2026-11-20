---
'@tanrei/web': patch
---

An app shell no longer stands WebKit still for half a minute or more when the header changes height or the window
changes width. Every length the frame writes — the four it makes known on the root
(`--tanrei-app-shell-scroll-offset`, `-scroll-offset-end`, `--tanrei-app-shell-window-inset-top`, `-bottom`) and its
own — now changes the number of the element's custom properties with it, as `setTokens()` does: WebKit compared the
root's ten thousand tokens value by value for every element of the page when a write left their number as it was. On
the docs' Arabic button page in a two-core Linux container, a header of a frame with `scroll="main"` growing took
29.6 s and takes 1.1 s; the window's top inset written alone took 31 s, its bottom inset 112 s. The public properties
are where they were, on the root, in px.

The room the row leaves the navigation (the window's width as the page has it, and a side sheet's in the aside) is now
written on the navigation region, the one box that reads it, instead of on the frame, and the window's width only where
it differs from `100vw`: a window resized restyles the navigation and not the page (0.1 to 0.5 s where it was 0.8 to
1.4 s on the same page), and a page loaded in a window with no scrollbar that takes room is given no write at all.
What the frame draws is unchanged.
