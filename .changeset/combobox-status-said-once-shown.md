---
'@tanrei/web': patch
---

Combobox: the status row's live regions hold nothing while the list is closed and are given the row's text one frame
after the list is shown, as the select's are. A status the product set before the list opened (an error, a status text,
the empty text) is now read when the list opens; before, the regions already held it, and a live region that appears
with its text in it is generally not announced. The row draws its text in a span hidden from assistive technology, and
the two regions beside it are read and not drawn. What the row looks like does not change. The spec's CMB-33 now reads
as the select's SEL-69.
