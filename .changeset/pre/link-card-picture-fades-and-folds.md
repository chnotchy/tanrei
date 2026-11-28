---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Link card — its picture fades in, and a picture that fails folds its box away.** When a link card's picture arrives
after the card has settled it fades in over the fill of its box, its opacity from transparent to whole on the new tokens
`tanrei.comp.link-card.motion.picture-duration` (the role `sys.motion.role.state.large`, 250 ms in the default system)
and `picture-easing` (`sys.motion.easing.state`); nothing changes place or size. When a picture cannot be loaded while
its box is drawn, the box folds away in one motion of its size on the new tokens `motion.resize-duration`
(`sys.motion.role.resize.large`, 400 ms) and `resize-easing` (`sys.motion.easing.spatial`): beside the text the box
narrows to nothing at the card's end edge while the text widens to the whole card, above the text its height goes to
nothing while the text rises with it, and the card's height and whatever follows the card move at every frame. A new
image given while the box folds opens it again from the size drawn. Before, both happened in one frame. A picture the
browser already holds when the card first draws it, one that loads or fails while the card draws its first frames, and
both motions under reduced motion are still drawn at once; the card's name and description do not change with either
motion. The resting card is drawn as before.

**Breaking:** on the web a test that read a link card's picture as whole the moment it loaded, or read a card whose
picture failed as already at its height without the picture, now reads it partway through the motion: wait for the
card's motions to finish. While the box folds, the element carries `data-tanrei-folding` and animates the anchor's
`padding-inline-end` or `padding-block-start` and its `block-size` (clipped); while a picture fades in it carries
`data-tanrei-arriving`. Both are taken off at rest.
