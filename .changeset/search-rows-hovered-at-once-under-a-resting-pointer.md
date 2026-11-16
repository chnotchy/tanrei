---
'@tanrei/web': patch
---

A search's suggestion row, query row or result that comes to stand under a resting pointer is now drawn hovered at
once. Before, its hover faded in a few frames late in two cases: as the view opened (the search's own rows are not
elements of their own, so the hold every element of a surface that opens carries did not reach them: in Chromium,
Firefox and WebKit as the docked view grew in, in WebKit in the full-screen view), and as the rows changed after a key
(the product's answer to what the person typed; the key ended the hold, and the new rows were hovered late — the
search's own rows in every engine, a result in WebKit, after its two frames of settling). The view now carries
`data-tanrei-still-pointer` as it opens and again whenever the rows it lists change, until the person next moves the
pointer, presses, turns a wheel or presses a key, and a row of the search's own starts no transition while it is
hovered meanwhile. `holdStillPointer()` now marks the surface it is given as well as the elements inside it, so that a
component that draws rows in its own shadow root can hold them with a rule of its own. Any hover after that moves as
before.
