---
'@tanrei/web': patch
---

Previous and next links: in a shadow root of the product's (observed with `observePreviousNextLinks(shadowRoot)`), the
arrows now take the icon set of the design system around the shadow root's host, as every other glyph does. They took
the default system's whatever the page's was, so under a product layer whose icon set does not mark `arrow_back` and
`arrow_forward` they were still mirrored right to left. A design system switched on the document's root while they are
shown is now followed there too. Nothing changes for links in the document itself.
