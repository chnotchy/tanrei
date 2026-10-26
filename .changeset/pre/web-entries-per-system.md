---
'@tanrei/web': minor
'@tanrei/tokens-build': minor
'@tanrei/cli': minor
---

**Breaking — `@tanrei/web` registers the default system's components and no other.** A product on the default system
reaches only the components its system ships, so it cannot pick one the system does not have. What breaks:

- `import '@tanrei/web'` no longer registers the segmented button (`<tanrei-segmented-button>`, `<tanrei-segment>`),
  which the default system leaves out, and no longer exports `TanreiSegmentedButton`, `TanreiSegment` and their types.
- `@tanrei/web/m3-like` now registers everything the m3-like system ships, not the FAB menu alone.

**New — an entry per system, and one for everything.**

- `@tanrei/web/<id>` (`m3-like`, `m3-expressive-like`, `cupertino`; the default system's is `@tanrei/web` itself)
  registers what system `<id>` ships: everything `@tanrei/web` registers, and the components only that system ships
  (the segmented button on the three presets, the FAB menu on the two m3-like systems). It exports their classes and
  types. `@tanrei/react/<id>` is the same set in React.
- `@tanrei/web/all` registers every component of the package.
- A component's own module, `@tanrei/web/components/<name>`, registers it alone: a product on the default system that
  includes the segmented button in its layer (`"components": { "include": ["segmented-button"] }`) imports
  `@tanrei/web/components/segmented-button`, and draws it with its own tokens.

The components manifests name these entries: a system's components are registered by its entry (`@tanrei/web` for the
default system's), and in a product's manifest (`tanrei build`) a component no system it is built on ships — one it
brings back or includes from another layer — is registered by its own module.

**A lighter `custom-elements.json`, and one per system.** The elements' manifest lists the package's public surface:
the private and protected members of the classes and the text of the components' styles are no longer in it (4.6 MB →
2.2 MB). `@tanrei/web/custom-elements/<id>.json` is the manifest of the elements system `<id>` ships: the default
system's has neither the FAB menu nor the segmented button.
