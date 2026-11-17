---
'@tanrei/web': patch
---

The components' scripts carry less text that nothing reads. About 120 explanations written as CSS comments inside the
style strings of the shared primitives (the field frame, the option list, the item row, destinations, anchored
surfaces) and of the menubar, the search, the slider and the code block shipped in every bundle that imported them;
they are source comments now. The bare code block's rules for `prose.css` are a function the build calls, and a few
top-level values a component may not use (the calendar's first days by region, the keyboard's named keys, the
delegated ARIA setters, the settle rules) are marked so that a bundler drops them where they are unused. Nothing is
drawn differently. A product's bundle of one component is up to 4.3 kB (gzip) smaller — the select field
82858 → 78670 B, the combobox 80857 → 77856 B, the button 34355 → 33524 B, `@tanrei/web/all` 671986 → 662872 B —
and every stylesheet but `code.css` (and `tanrei.css`, which holds it) is unchanged byte for byte; those two lose only
the comments of the code block's rules.
