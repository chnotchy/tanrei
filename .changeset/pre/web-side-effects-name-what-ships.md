---
'@tanrei/web': patch
---

The package's `sideEffects` names only files the package ships: the modules under `dist/` and the style sheets. The
nine `./src/…` patterns it also listed matched nothing in an installed package, since `src/` is not published. The
package's own bundle (`dist/tanrei.bundle.js`), which is made from the sources, reads the same list for them, so it is
byte for byte what it was. A bundler keeps exactly what it kept before.
