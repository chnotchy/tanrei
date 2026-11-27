---
'@tanrei/web': patch
---

A glyph that shows a direction mirrors in a right-to-left layout inside a shadow root too. A `.tanrei-icon` in an element drawn in the light DOM (an accordion's header, a tree view's row, and the same for a table, an app shell, a link card and the others) was marked only by the document's observer, which cannot see into a shadow root, so an `arrow_forward` in a product's own shadow root stayed pointing right in right-to-left. Such an element now tells when it is connected and disconnected, and `@tanrei/web` (or `@tanrei/web/icons`) observes the shadow root it is used in, as it observes the document, while it is there. Nothing changes in the document, and nothing is read from styles or layout while the page loads.

`observeIcons(root)` changed: each call returns its own function, and the root is observed until every caller has called it (it used to stop at the first call of any of them).
