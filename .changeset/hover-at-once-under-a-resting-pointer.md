---
'@tanrei/web': patch
---

A control that appears under a resting pointer as its surface opens is now drawn hovered at once. Before, its hover
faded in over the control's state duration a few frames after the surface was drawn: a dialog's action, a modal side
sheet's close button, a full-screen search's back button and a menu item, in Chromium, Firefox and WebKit alike, with
the pointer resting or pressed and held there. Each engine hovers such a control late on its own clock (WebKit about
eight frames on, and after a sheet's slide), so every element inside a surface that opens now carries
`data-tanrei-still-pointer` until the person next moves the pointer, presses, turns a wheel or presses a key, and starts
no transition while it is hovered meanwhile. Any hover after that moves as before. `holdStillPointer()` and
`STILL_POINTER` are exported from the primitives; `openModal()` and `AppearController` call it as a surface opens.

Every component's bundle grows by up to about 320 bytes gzip for it (the shared settling code and its rule); the budgets
of the eleven bundles that went over theirs are raised to the next 100 bytes.
