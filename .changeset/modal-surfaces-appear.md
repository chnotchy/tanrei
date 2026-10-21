---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Dialog, Image preview and the modal Date-time picker: a modal surface appears as every surface does, and leaves the way
it came. **Breaking** (a motion and three tokens 0.1.0-next.0 shipped).

- The centred dialog's container, the modal picker's container and the image preview's image start from
  `sys.motion.appear.*` — opacity 0 and scale 0.96 under the default system (was 0.95) — grown about their centre (the
  image about the centre of its fit area) and risen into place by `sys.motion.appear.distance`, over their enter motion;
  they leave the same way back over their exit motion, where they only faded before. Under the `unfold` appearance
  (m3-like and m3-expressive-like) a centred surface, having no anchored edge, grows on both axes from its centre.
- A motion turned round goes on from what it shows: a dialog, a picker or a preview closed while it enters, or opened
  again while it leaves, does not start again from nothing.
- Where motion is reduced the container (the image) fades in and out over `sys.motion.role.reduced` (100 ms), with no
  scale, distance or blur.
- A dialog, a modal picker or an image preview written open in the page's markup appears in the first frame without its
  motion; one mounted open after the page was first painted plays its entrance.
- Removed tokens: `comp.dialog.motion.enter-scale`, `comp.image-preview.motion.enter-scale` and
  `comp.date-time-picker.modal.motion.enter-scale` — the scale is `sys.motion.appear.scale`, the one a system sets for
  every surface.

SwiftUI, Compose, Flutter and React Native (paused): their generated tokens no longer carry the three `enter-scale`
values, which their dialog code still reads, so it does not build until it catches up; their dialogs are lagging and take
the appearance then (their generated tokens do not carry `sys.motion.appear.*` yet). Baselines are unchanged: the fixtures are
drawn at rest.
