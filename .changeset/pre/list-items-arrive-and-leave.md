---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**List — an item that is added or taken away arrives and leaves in one motion.** In a reorderable list, an item the
product adds now grows along the list — its height in a column, its width in a line — from nothing to its own length,
the gap beside it opening with it, on the new tokens `tanrei.comp.list.motion.resize-duration` (the role
`sys.motion.role.resize.large`, 400 ms in the default system) and `resize-easing` (`sys.motion.easing.spatial`), and
fades in over the list's state motion (`comp.list.motion.state-duration`, `role.state.large`). An item the product takes
away fades out where it was drawn and closes the same way back. The items after it follow its edge at every frame, and
so does the list's own length. In a wrapping list the item fades in or out at its place while the items whose place
changes move there, as on a reorder. A divider that comes or goes with the first item fades with it. A change that
comes mid-motion (an item taken away while it arrives, or given back while it leaves) goes on from what is drawn. What
the list exposes changes at once: the count, the positions, focus (LST-46). The list's first frames, the moment it
becomes reorderable, a lift and reduced motion still add and take away at once. Before, LST-41 had a new or removed item
appear or leave at once. Resting pictures are unchanged: no baseline was re-recorded.

**Breaking:** on the web, while an item leaves, the list puts the product's own `<tanrei-list-item>` element back where
it stood, as its child, for the length of the motion — `inert`, `aria-hidden="true"` and `data-leaving` — then removes
it and gives back the `inert` and `aria-hidden` it had. A script that reads the list's children in that time sees it:
select `tanrei-list-item:not([data-leaving])`. A test that read an item's place or height in the frame after an item was
added or removed now reads it mid-motion: wait for the motion to end. Every platform's tokens gain the two entries.
