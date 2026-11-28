---
'@tanrei/web': patch
'@tanrei/react': patch
---

Bottom sheet and side sheet: a modal sheet appears the way every sheet does, using the same pieces as the dialog
(`appearStyles()` with the sheet role, `AppearController`, `closeModal()`). The popover and the dialog shown as a bottom
sheet in a compact window move the same way.

- It slides in from its own size beyond its edge: the bottom edge for a bottom sheet, the end edge for a side sheet
  (the left edge in right-to-left). It is never faded or scaled, under every appearance, m3-like's `unfold` included.
  It leaves the same way, from wherever it is drawn (where a drag left it, too), over the exit motion on the
  accelerating curve. It stays drawn in the top layer until the slide has played, in every engine. A slide turned round
  goes on from where it has got to.
- The scrim fades in step with the slide, over the same duration and curve.
- Where motion is reduced, the sheet and its scrim only fade, in place, over `sys.motion.role.reduced` (100 ms in the
  default system). They used to fade over the sheet's own 400 and 350 ms. A standard bottom sheet's reduced fade takes
  the same 100 ms. The popover and the dialog shown as a bottom sheet fade over the same 100 ms.
- The sheet durations are unchanged (400 ms in, 350 ms out in the default system). So are the baselines: the fixtures
  are drawn at rest.
- `appearStyles()` takes `offset`: a translate the open surface stands at instead of none, where a gesture moves it
  (a sheet's drag). A surface with the sheet role is no longer given `scale: 1 1` while closed, which started a
  transition of `scale` that drew nothing. `sheetScrimStyles()` (new, in `scrim.ts`) draws a sliding sheet's scrim.
  `sheetLookStyles()` takes `motion`: the dialog's selector for its motion, where `sheet` names the dialog through the
  shadow host.

The shared motion costs about 2 kB gzip in each sheet's bundle: the bottom sheet's budget goes from 48,200 to 50,700
bytes (measured 48,222) and the side sheet's from 44,900 to 47,400 (measured 45,058), each the measured size and 5 %.

BSH-1 and SSH-2 now say how the sheet and its scrim move. The SwiftUI, Compose, Flutter and React Native platforms are
paused, and their sheets were not changed or checked against the new wording.
