---
'@tanrei/web': minor
'@tanrei/tokens-build': minor
'@tanrei/cli': minor
---

**A system that does not have a component of another layer is told what to use instead.** The layer that holds a
component's whole vocabulary now says what a system without it uses for its job, beside the declaration:
`"outside": { "reason": "…", "insteadUse": [ … ] }`. Every components manifest of a system without the component —
each shipped system's and the one `tanrei build` writes for a product — lists it under `omitted` with the layer it lives
in (`providedBy`), that `reason`, and the components of `insteadUse` the system ships. The FAB menu, which lives in the
m3-like layer, names the main action button and the bottom sheet: the default system's and cupertino's manifests name
them; a product that includes the FAB menu has no entry for it.

`pnpm validate` refuses a stand-in that is not a component of the inventory, or is the component itself, and a shipped
system without the component that does not ship one of its stand-ins (the manifest would drop it unseen). A product
that leaves a stand-in out is not refused: its manifest names the others.
