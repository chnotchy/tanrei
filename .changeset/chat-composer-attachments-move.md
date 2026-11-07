---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Chat composer — an attachment that is added or removed moves.** When a File item is added to the strip or removed
from it — by the person, by the product, or by the composer emptying itself after `send` — the capsule now changes its
height in one motion, on the new tokens `tanrei.comp.chat-composer.motion.resize-duration` (the role
`sys.motion.role.resize.large`, 400 ms in the default system) and `resize-easing` (`sys.motion.easing.spatial`). The
motion is anchored to the row of the typing area: that row, its actions and its send button keep their place against
the capsule's bottom edge, and the items that stay keep theirs against its top edge, so where the composer stands at the
foot of a conversation the row being written does not move at all. An item that is added fades in at its place, one
that is removed fades out where it was drawn, and one whose place in the strip changes moves there, over the same
motion. A change while it moves goes on from what is drawn. When the send and the stop button change places, the button
changes at once — its name, its action, whether it is enabled — and only the glyph of the Button the composer brings
cross-fades, over the new token `motion.glyph-fade-duration` (`sys.motion.role.state.compact`, 200 ms) with
`motion.state-easing`; the send button's colours between enabled and disabled move as the Button's own state does. What
assistive technology, focus and `sendable` get still changes at once: an item that is removed is out of the
accessibility tree, the focus order and the strip's count from the first frame. Reduced motion and the composer's first
frames still change at once. Before, CCM-35 made all of these take effect at once. Resting pictures are unchanged: no
baseline was re-recorded.

**Breaking:** on the web the strip now stands in a box of its own inside the composer's shadow root. While one of the
product's File items leaves (`attachments="given"`), the composer puts the product's own `<tanrei-file-item>` element
back where it stood, as its child, for the length of the motion — `inert`, `aria-hidden="true"` and `data-leaving` —
then removes it and gives back the `inert`, `aria-hidden` and `style` it had. A script that reads the composer's children
in that time sees it: select `tanrei-file-item:not([data-leaving])`. A test that read the capsule's height, an item's
place or the send button's glyph in the frame after an item was added or removed, or after `sending` changed, now reads
it partway through the motion: wait for the composer's motions to end. Every platform's tokens gain the three entries.
