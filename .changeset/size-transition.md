---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/docs': patch
---

Size transition, a new component: a box around content whose size changes — a reply that grows by a line, a summary
replaced by its full text, a status word that gets longer — that moves its own size to the content's new size as one
motion, so that what follows it moves instead of jumping, while the edge it is anchored to stays still.

- `axis`: `block` (the default), `inline` or `both`. `anchor`: `start` (the default: the first line never moves),
  `end` or `center`. `disabled` follows the content at once. `settle` arrives once per change, after its last frame,
  with the new width and height.
- The time grows with the distance: `comp.size-transition.motion.duration` (`sys.motion.role.resize.default`, 300 ms)
  up to `motion.distance-step` (`sys.space.space800`, 64 px), `motion.duration-step` (`sys.motion.duration.short1`,
  50 ms) for each further step begun, never more than `motion.duration-max` (`sys.motion.role.resize.large`, 400 ms),
  on `sys.motion.easing.spatial`. `duration` sets one place's tempo, in milliseconds.
- The first frame is drawn at rest; a change during a motion goes on from the size shown; a change of the window's
  size, the text size or the direction is made at once; a size transition whose content holds a moving one follows it;
  reduced motion makes every change at once. Nothing scrolls while it moves, and it exposes nothing to assistive
  technology.
- Web: `<tanrei-size-transition>` (`SizeTransition` in React), alpha, with its baselines; SwiftUI, Compose, Flutter
  and React Native are planned.
- Web, the size motion inside it (`AnimatedSize`): its duration may be a function of the distance the motion covers,
  and `fit()` may be told the size the last frame drew.
