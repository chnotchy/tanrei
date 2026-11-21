---
'@tanrei/web': patch
---

The components' shadow styles ship without their comments and indentation. The build takes them out of every Lit
`css` template, in `dist/tanrei.bundle.js` and in the modules under `dist/` that a bundler reads. Strings, `url()`, escapes, interpolations, custom property values (whose runs of whitespace
become one space) and the spaces that separate tokens stay. `dist/tanrei.bundle.js` is 15 % smaller (18 % with gzip),
and `@tanrei/web/all` bundled for production 15 % (18 % with gzip). The styles mean the same as before; only text
read back from a sheet, such as a value with `var()` in it, can show fewer spaces.
