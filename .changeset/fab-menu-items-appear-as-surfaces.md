---
'@tanrei/web': minor
'@tanrei/react': minor
---

FAB menu: each item appears as every surface does, and leaves the way it came. **Breaking** (a motion
0.1.0-next.0 shipped): the items no longer only fade as they close, under reduced motion they fade instead of appearing
at once, and under an appearance other than m3-like's they start from that appearance's values.

- Under m3-like and m3-expressive-like an item enters as before: from opacity 0 and scale 0, grown from the middle of
  its end edge on both axes, over `comp.fab-menu.motion.open-duration` and `-easing`, the one nearest the toggle first
  and each next `comp.fab-menu.motion.stagger` later. Under a system that takes the FAB menu into another appearance
  (the default system's fade-scale: opacity 0 and scale 0.96) it starts from that appearance's values.
- Closing takes every item back together the same way, over `comp.fab-menu.motion.close-duration` and `-easing`, where
  it used to only fade. Told to close while it opens, or to open while it closes, each item turns round from where it
  is, with no stagger.
- Where motion is reduced the items fade in and out together over `sys.motion.role.reduced` (100 ms), with no scale,
  distance or blur; the toggle still changes at once.
- What moves is a new box inside each item's shadow root, around its `container` part, so the part keeps its own state
  opacity and transitions. The `entering` class on an item's container, the `leaving` class on the list and the
  `fab-menu-item-in` and `fab-menu-leave` keyframes are gone.
- `appearStyles()` takes `unfold: false` for a surface that grows beside what opened it: it scales on both axes under
  the `unfold` appearance too.

Specs: FBM-19 says so. Baselines are unchanged: the fixtures are drawn in place, at rest.
