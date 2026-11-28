---
'@tanrei/web': patch
---

Two bundles of one component no longer carry a class they never use. The navigation drawer carried the navigation
bar's item class: it shared a module with the regions' controller, and a class whose static fields are written as a
`static { … }` block is kept by a bundler wherever its module is imported; the class has a module of its own now. The
option and the option group carried the option list, with Lit's `classMap` and `styleMap` directives, for the two tag
names they define themselves by (Lit's `directive()` is not marked pure, so a bundler keeps them whether used or not);
the tags have a module of their own now. Nothing is drawn or behaves differently, and no export changes. Measured as the bundle budget test measures (esbuild, minified, gzip -9): the navigation drawer
122297 → 120806 B, the option 8372 → 7303 B; every other bundle within a few bytes of what it was.
