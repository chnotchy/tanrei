---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Button group: the lines between buttons fade.** When a toggle in a connected group is switched, or an item's
`toggle` or `variant` changes, a line that a seam gains fades in, a line it loses fades out, and a line that changes
between `connected.divider.color` and `connected.divider.on-fill.color` fades from one to the other. Before, all of
this happened in one frame. The fade uses the new tokens `tanrei.comp.button-group.motion.state-duration` (the role
`sys.motion.role.state.default`, the pace at which a medium Button changes between its looks) and
`tanrei.comp.button-group.motion.state-easing` (`sys.motion.easing.state`). Only opacity changes. Which seams carry a
line is still decided at once. The item's `selected` and `aria-pressed` also change at once, not when the fade ends.
Lines are still drawn at once under reduced motion, in the frames in which the group is first drawn, and when the items
are placed again (an item that comes, goes or moves) or joined in the other form.

**Toolbar: what a toggle item's change of look follows is now in its spec.** A toggle item changes between its
selected and unselected looks over its own Button's state motion (`comp.button.motion.state-duration` of its size,
`sys.motion.role.state.default` at the medium size), and its `aria-pressed` changes at once. The look changes at once
under reduced motion and in the first frames. The toolbar adds no motion or token of its own. The web already drew it
this way, and the tests now check it.

**Breaking:** on the web a divider draws its line twice: `::part(divider)::before` in the divider color and
`::part(divider)::after` in the on-fill color. A seam shows one of them, or neither, by its opacity. Before, a seam with
no line hid `::before` with `display: none`, and the on-fill line recolored `::before`. A stylesheet that styled
`::part(divider)::before` alone now styles only the divider-color layer. A test that read a line in the frame after a
toggle was switched now sees it partway through the fade, so wait for the group's transitions to finish.
