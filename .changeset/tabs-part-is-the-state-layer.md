---
'@tanrei/web': minor
---

**Breaking: a tab's state layer is the part `state-layer`, no longer `container`.** In the Tabs spec and on the web,
the anatomy part that draws a tab's hover, focus and press — the box the active indicator has on that tab, a capsule
or a circle in the default system, in which a ripple grows and around which the focus ring is drawn — is named
`state-layer`: `tanrei-tab::part(state-layer)`. It was named `container`, which said it was the whole tab, as
`container` is in the other components, while it never is the tab's rectangle. There is no alias for the old name.

`container` is now the tab's own box, as it is in the other components: a new anatomy part, `tanrei-tab::part(container)`
on the web, the rectangle of the whole tab that answers the pointer and that the `comp.tabs.container.*` lengths size
(its height, padding-inline and gap). It draws nothing of its own. A stylesheet that styled
`tanrei-tab::part(container)` for the state layer now styles the whole tab instead; rename it to `::part(state-layer)`.

The tokens keep their names, and the tab draws its state layer with `container.shape` and its looks' `container.color`.
Nothing a tab draws changes. The docs' Tabs page has its measure figure again: the tab's height and inline padding,
drawn on the tab's own box.

A spec now says which tokens a part is drawn with where their path names another part than its id (`drawnWith` on an
anatomy part, held by `pnpm validate` to the end of a token of the component): the tab's `state-layer` is drawn with
`container.color`. The docs' color role figure reads it, so the Tabs page's row for the state layer is its
`container.color` (transparent at rest), not the `state-layer.color` that hover, focus and press mix in.
