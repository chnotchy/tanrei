---
'@tanrei/web': patch
---

The modules under `dist/` ship without source maps. Each map named its source under `src/`, which the package does
not ship, so it led a debugger, or a bundler that reads maps (Vite warns that the map points to missing source files),
to files that only the repository has. The 301 maps and the `//# sourceMappingURL=` comment in each module are gone:
the package is 3.7 MB and 301 files smaller unpacked. `dist/tanrei.bundle.js` keeps its map, which carries its
sources in itself.
