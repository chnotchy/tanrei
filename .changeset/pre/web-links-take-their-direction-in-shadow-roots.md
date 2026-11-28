---
'@tanrei/web': patch
---

A `.tanrei-link` inside a shadow root is given what the Link's script adds, as in the document, when an element drawn in the light DOM is used there: an app shell, whose skip link is a `.tanrei-link`, a table, an accordion and the others. Before, only the document was observed, so in a product's own shadow root a standalone link took no `dir` from its label. A left-to-right label with a trailing glyph or the external arrow, in a right-to-left layout, then had its glyph at the wrong end and its closing punctuation moved to the front ("!Next page →" instead of "Next page! →"). The press feedback, `noopener`, the refusals and the external marks were missing there too. Now the element says when it is connected in a shadow root and when it leaves, and `@tanrei/web` (or `@tanrei/web/link`) observes that root while the element is there, as it already does for the glyphs that mirror. Nothing changes in the document, and nothing is read from styles or layout while the page loads.

`observeLinks(root)` changed: each call returns its own function, and the root is observed until every caller has called it (it used to stop at the first call of any of them).
