---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Callout — it opens and closes in one motion.** When a callout's `open` changes — the person closes it with its close
button, or the product shows or hides it — its height and its opacity now change together in one motion, in the page's
layout, on the new tokens `tanrei.comp.callout.motion.disclosure-duration` (the role `sys.motion.role.disclosure`, 400 ms
in the default system) and `disclosure-easing` (`sys.motion.easing.spatial`). Its content stays fixed to its top edge,
what follows it moves with its bottom edge at every frame, and the space its container keeps beside it (a flex column's
gap, the margin prose puts before the next block) closes and opens with it, so nothing that follows steps at the end. A
change while it moves turns it round from what is drawn. What assistive technology and focus get still changes at once:
from the moment `open` is false the callout has no role, its content is out of the accessibility tree and the focus order
and focus has gone back where it came from; from the moment it is true it is exposed and, live, announced. Before, the
callout appeared and disappeared in one frame. Reduced motion and the callout's first frames still change at once.

**Breaking:** on the web the container now stands in a `.box` inside the callout's shadow root, and a closed callout
stays drawn until its motion has ended: a test that read it as gone (no box, `display: none`) or whole in the frame after
`open` changed now reads it partway through the motion — wait for the callout's motions to finish. While the space beside
it moves, the callout's own `margin-block-end` is animated; at rest it is the product's again.
