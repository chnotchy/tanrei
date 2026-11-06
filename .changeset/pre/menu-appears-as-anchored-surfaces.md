---
'@tanrei/web': minor
'@tanrei/react': minor
---

Menu: the menu's surface and every submenu's appear as every anchored surface does, and leave the way they came.
**Breaking** (a motion 0.1.0-next.0 shipped): the menu no longer unfolds from a height of 0 and no longer only fades as
it closes, and reduced motion is a fade instead of an appearance at once.

- The surface starts from `sys.motion.appear.*` — opacity 0 and scale 0.96 under the default system — grown from the
  middle of the edge that faces the anchor (a submenu's: the edge that faces its item; a context menu's: the edge that
  faces the point), from its centre where `sys.motion.appear.origin` is center, over `comp.menu.motion.open-duration`
  and `-easing`, and leaves the same way back over `comp.menu.motion.close-duration` and `-easing`. Told to close while
  it opens, or to open while it closes, it turns round from where it is.
- Under the `unfold` appearance (m3-like and m3-expressive-like) the menu unfolds from that edge at its full width, and
  a submenu from the edge that faces its item at its full height.
- Where motion is reduced each surface fades in and out over `sys.motion.role.reduced` (100 ms), with no scale,
  distance or blur.
- The surface is placed and measured as it rests: a submenu measured while it starts from its scale is still placed
  with its first row level with its item.
- The surface carries `data-side` (`top`, `bottom`, `left`, `right`) where it carried the `side-top` and `side-left`
  classes, and `open` while it is shown; the `entering` and `leaving` classes and the `menu-open`, `menu-close`,
  `submenu-open` and `submenu-close` keyframes are gone.

Specs: MNU-4, MNU-49, MNU-50 and MNU-61 say so. Baselines are unchanged: the fixtures are drawn in place, at rest.
