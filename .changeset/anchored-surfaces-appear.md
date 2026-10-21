---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Popover, Select and Combobox: an anchored surface appears as every surface does, and leaves the way it came. **Breaking**
(a motion 0.1.0-next.0 shipped): the open and close motions of the three change in the default system, and reduced
motion is a fade instead of an appearance at once.

- The popover's container and the select's and the combobox's list start from `sys.motion.appear.*` — opacity 0 and
  scale 0.96 under the default system — grown from the middle of the edge that faces the anchor (from their centre
  where `sys.motion.appear.origin` is center, or while they cover their anchor), and leave the same way back. They no
  longer unfold from a height of 0, and no longer only fade as they close.
- Under the `unfold` appearance (m3-like) they unfold from that edge at their full width, and
  fold back the same way, on Material's durations and curves as before.
- Where motion is reduced they fade in and out over `sys.motion.role.reduced` (100 ms), with no scale, distance or blur.
- A popover written open in the page's markup appears in the first frame without its motion; one mounted open after
  the page was first painted plays its entrance.
- Changed tokens: `comp.popover.motion.open-duration`, `comp.select.motion.open-duration` and
  `comp.combobox.motion.open-duration` alias `sys.motion.role.appear.anchored.enter` (300 ms in the default system,
  was 200); the `close-duration` tokens alias `role.appear.anchored.exit` (250 ms, was 100); the `open-easing` tokens
  alias `sys.motion.easing.enter` (standard, was emphasized-decelerate) and the `close-easing` tokens
  `sys.motion.easing.exit` (standard-accelerate, was emphasized-accelerate). The menu's four open and close tokens alias
  the same role and curves (a select's list keeps the menu's values): the menu opens and closes as it did, on the
  anchored role's durations and curves. m3-like's roles give the values the four drew before.
- The popover's arrow elevation filter is set on its placed box, so that the moving part keeps `filter` for the
  appearance's blur. `anchoredSurfaceStyles()` takes `enter` and `exit` (was `open` and `close`).

SwiftUI, Compose, Flutter and React Native have no popover, select or combobox yet; their generated tokens carry the
new values. Baselines are unchanged: the fixtures are drawn at rest.
