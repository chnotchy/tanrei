---
'@tanrei/web': patch
---

The text of `icons.css` no longer ships inside the components' scripts. It was a constant of the module every
component draws its glyphs with, built by calling functions, so a bundler kept it — its long header comment included —
in every bundle that imported that module, though only the build reads it. It is now a function the build calls, and
a product's bundle of one component is about 2.6 kB (gzip) smaller: the toolbar 70814 → 68208 B, the select
70358 → 67730 B, `@tanrei/web/all` 671974 → 669370 B. `icons.css` itself is unchanged, byte for byte.
