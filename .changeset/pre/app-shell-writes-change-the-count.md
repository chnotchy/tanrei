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

`setTokens()` now leaves alone a name that already holds the value it is given, and a call that changes nothing adds
none of its own names (it changed the number of the element's custom properties, and so restyled what it holds, all
the same). The app shell writes through the same code.

Each name `setTokens()` adds to change the number (`--tanrei-tokens-written-<n>`) is now one it has not written
before, on any element. It took `-0`, `-1`, … on every element it wrote, and the number WebKit compares is each
element's own — what it holds and what it inherits: a name added on the root that an element below already held of its
own (the app shell writes on the root, on itself and on its navigation region) left that element's number as it was,
and WebKit compared the token set value by value for it and for everything it holds. On a page of 17,000 elements with
`scroll="main"`, one header height in three took 6.9 s; each now takes 0.1 s.

The text of its stylesheet that an element drawn in the light DOM carries, to add to a root that does not load the
stylesheet (the app shell, the table, the description list and the others of that form), is now printed without the
whitespace that changes nothing, by esbuild's CSS printer: what each draws is unchanged, and their bundles are smaller
(the app shell's by 77 bytes gzipped).
