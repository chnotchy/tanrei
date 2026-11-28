---
'@tanrei/web': patch
---

The cloak (`@tanrei/web/cloak.css`), `menu.css` and `menubar.css` cost a page less to style: a rule written for several
elements at once is built as one selector for each element, so that a browser files it under each element's name and
no longer tries it on every element of the page at each restyle. On the documentation's Button page (10,135 elements),
the cloak's part of a WebKit restyle of the whole page fell from 264 ms to 46 ms. What the stylesheets hold, and where,
is unchanged.
