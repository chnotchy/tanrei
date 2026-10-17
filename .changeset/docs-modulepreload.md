---
'@tanrei/docs': patch
---

Documentation site: each page asks for every module its scripts import, in its head.

- The build writes a `<link rel="modulepreload">` for every module a page's scripts import statically, read from the
  bundle's own import graph, last in the head after the stylesheets and the preloaded fonts. Before, the browser found
  a page's modules a level at a time, up to five round trips on a component page; now all of them are asked for at
  once.
- Cloudflare Pages sends these links ahead of the page as Early Hints.
- A module a page imports only on demand (Theme Studio's emitter, the search index) is still fetched when it is asked
  for.
