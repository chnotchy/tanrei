---
'@tanrei/web': patch
---

Table of contents: on a page that is still loading, the rule that decides the current item (TOC-9) is read in the
first frame once the list's stylesheet has been added to the element's root, not before it. In a root that did not
have the stylesheet yet (a shadow root of the product's own, the sections slotted after the list), the rule read where
the targets stood beside a bare list: an item whose target was past the line was drawn current for a frame, and the
product was told of it and then of the right one.
