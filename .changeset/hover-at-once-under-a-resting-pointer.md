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
The rule that holds the hover is its own shadow stylesheet, `stillPointerStyles`, which an element that draws nothing
under a pointer leaves out: the avatar and its group, the swatch, the empty state and the code block carry no rule for
a hover at all.

Every component's bundle grows by 120 to about 330 bytes gzip for it (the shared settling code and its rule), and by 7 to
51 more for the rule's own stylesheet; the budgets of the thirteen bundles that went over theirs are raised to the next
100 bytes.
