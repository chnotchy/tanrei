---
'@tanrei/web': patch
---

Select and combobox: a pointer at rest no longer takes the active option from the keys. Safari sends a pointer move to
whatever comes under a mouse that has not moved once the page or the list scrolls under it, so a Down Arrow or a Page
Down that scrolled the list, or a field brought into view while the mouse rested over the place its list opened, made
the option under the mouse the active one a moment later, and the next key went on from there. A pointer move at the
place the same pointer last was is now no move; a pointer that moves onto an option still makes it the active one, as
before, in every browser.
