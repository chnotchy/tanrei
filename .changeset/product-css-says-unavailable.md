---
'@tanrei/tokens-build': patch
'@tanrei/cli': patch
---

**Fixed — a product's stylesheet says what its system does not have.** The sheet `tanrei build` writes for the `web`
target now declares `--tanrei-unavailable` (the components and `variant` values the product's system leaves out) and
`--tanrei-unavailable-layer` (the components that live in a layer it does not extend) in the product's own scope, as a
shipped system's sheet does. Before, an element under a product's `data-tanrei-system` read the default system's lists
from `:root`: a product on m3-like was told in a debug build that its outlined text input and its FAB menu were not in
its system, and a product's own `components.omit` was never reported.
Theme Studio (`tanrei studio`) previews a layer with the same lists in its scope, so what it previews is still what
the build writes.
