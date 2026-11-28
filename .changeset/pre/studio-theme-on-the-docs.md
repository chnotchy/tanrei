---
'@tanrei/tokens-build': patch
'@tanrei/studio': patch
'@tanrei/docs': patch
---

Theme Studio can show the documentation in the theme you are making. Its bar has a **Share** menu: the link to the
Studio with your layer, and **Show the documentation in this theme**, off until you turn it on and kept in this browser
only. On, the whole documentation — header, navigation and every example — is drawn in the layer this browser keeps,
and follows it as you edit; the header's choice of design system lists it as **My theme** (in all six languages), and
choosing Tanrei there goes back in one step. Off, the documentation keeps nothing of it.

- `emitCss(model, { used })` (`@tanrei/tokens-build/emit/css`): an opt-in option that writes only the custom
  properties named and everything their values read. Without it the sheet is unchanged, byte for byte.
- `@tanrei/studio`: `core.pageSheet(view)`, a layer's sheet for a page whose root already holds the default system's
  (only what differs, declared again where the default sheet would otherwise show through), and
  `@tanrei/studio/page-sheet`, which computes it in a worker. `mountStudio` takes `docs` (`{ kept(), keep(layer) }`) for
  a host that is a documentation. A host that bundles the worker gives Vite's `worker.plugins` the Studio's plugin.
- The documentation keeps the stylesheet in IndexedDB under the build's key and the layer's hash; while it is not in, a
  page stays hidden for at most three seconds, and a page that could not wait for it is drawn in the default system.
