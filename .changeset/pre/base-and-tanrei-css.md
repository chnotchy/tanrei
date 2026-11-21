---
'@tanrei/web': minor
---

Two stylesheets for a page that wants Tanrei's look without writing its own base:

- `@tanrei/web/base.css`, in the cascade layer `tanrei.base`: the page's background is the surface color
  (`sys.color.surface`), its text is on-surface (`sys.color.on-surface`), the body is set in the body role's face, and
  the body has no margin. Before it, a product's own `<p>` was the browser's black Times on white with an 8px margin
  around the page, even in the dark scheme.
  - The face is on `<body>`, not on `<html>`, so `rem` keeps the browser's size: the system's sizes are written in
    `rem`.
  - `color-scheme` is left to the tokens, so a theme forced with `data-tanrei-theme` on `<html>` still wins.
  - Any rule of the product's own wins over the base.
- `@tanrei/web/tanrei.css`: the base, the default system's tokens and every other stylesheet the package exports
  (text styles, prose, link, table, accordion, code and the rest), in one file. A preset's tokens
  (`systems/<id>.css`) are not in it. The separate stylesheets stay.

No token was added and nothing a component draws changed.
