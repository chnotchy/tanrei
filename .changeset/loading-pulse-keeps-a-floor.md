---
'@tanrei/web': patch
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Under reduced motion the loading indicator's pulse no longer fades to nothing. The whole circle still pulses once per
cycle, but its opacity eases from 1 down to a floor and back, and is never drawn below it: before, it eased to 0 and
the circle stood below 5 % opacity for about a fifth of every cycle, so a busy button was an empty container for about
200 ms at a time.

- New token `comp.loading-indicator.motion.pulse-floor-opacity` (0.7 in every shipped system). At 0.7 the circle
  still stands 3:1 or more from what it is drawn on in every contrast scheme of the default system — the bare
  indicator on the surface, the contained one on its container, and a busy button's circle on every variant's
  container, destructive included.
- `comp.button.motion.busy-pulse-floor-opacity` and `comp.button-with-menu.motion.busy-pulse-floor-opacity` alias it,
  so a busy Button's circle (BTN-36) and a busy button with menu's leading half (SPB-39) keep the same floor;
  `comp.progress-indicator.motion.pulse-floor-opacity` aliases it too, so the progress indicator's indeterminate
  reduced-motion pulse (PRG-7) never leaves a bare track.
- Specs: LDG-4, PRG-7, BTN-36 and SPB-39 say the pulse eases to the floor, not to 0.

Snapshot baselines are recorded at the start of a cycle, where the opacity is 1, so none change.
