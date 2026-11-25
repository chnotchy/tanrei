---
'@tanrei/web': minor
---

**Breaking: a tab's state layer is the part `state-layer`, no longer `container`.** In the Tabs spec and on the web,
the anatomy part that draws a tab's hover, focus and press — the box the active indicator has on that tab, a capsule
or a circle in the default system, in which a ripple grows and around which the focus ring is drawn — is named
`state-layer`: `tanrei-tab::part(state-layer)`. It was named `container`, which said it was the whole tab, as
`container` is in the other components, while it never is the tab's rectangle. A stylesheet that styles
`tanrei-tab::part(container)` styles nothing now; rename it to `::part(state-layer)`. There is no alias for the old
name.

The tokens keep their names: `comp.tabs.container.*` is the tab's, as `container` is elsewhere (its height,
padding-inline and gap), and the tab draws its state layer with `container.shape` and its looks' `container.color`.
Nothing a tab draws changes.
