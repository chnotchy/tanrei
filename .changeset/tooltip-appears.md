---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Tooltip: it appears as every surface does, and leaves the way it came. **Breaking** (a motion and two tokens
0.1.0-next.0 shipped).

- The tooltip starts from `sys.motion.appear.*` — opacity 0 and scale 0.96 under the default system — grown from the
  middle of the edge that faces its anchor (from its centre where `sys.motion.appear.origin` is center, or while it
  covers its anchor), and leaves the same way back on `comp.tooltip.motion.exit-easing` (standard-accelerate in the
  default system). It no longer grows from 0.95 about the point its arrow points at, and no longer travels 4 px toward
  the anchor: a system that sets `sys.motion.appear.distance` makes it travel.
- Under the `unfold` appearance (m3-like and m3-expressive-like) it unfolds from that edge along the axis that leaves
  the anchor, at its full width.
- Where motion is reduced it fades in and out over `sys.motion.role.reduced` (100 ms), with no scale, distance or blur.
- A tooltip written open in the page's markup appears in the first frame without its motion; one mounted open after
  the page was first painted plays its entrance.
- Removed tokens, with no alias: `comp.tooltip.motion.enter-scale` and `comp.tooltip.motion.enter-offset`. A layer that
  set them sets `sys.motion.appear.scale` and `sys.motion.appear.distance` instead (for every surface that appears).
- The arrow's elevation filter is set on the placed box, so that the moving part keeps `filter` for the appearance's
  blur.

SwiftUI, Compose, Flutter and React Native lag behind the current tooltip; their generated tokens no longer carry the
two removed values. Baselines are unchanged: the fixtures are drawn at rest.
