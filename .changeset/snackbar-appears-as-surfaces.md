---
'@tanrei/web': minor
'@tanrei/react': minor
---

Snackbar: its bar appears as every surface does, and leaves the way it came. **Breaking** (a motion 0.1.0-next.0
shipped): it no longer rises in from below by its own height plus its margin (or comes down from above at the top end),
it no longer only fades as it closes, and under reduced motion it fades over `sys.motion.role.reduced` instead of over
its enter and exit durations.

- Shown by `<tanrei-snackbar-host>`, the bar starts from `sys.motion.appear.*` and grows from the middle of the window's
  edge it stands at: the bottom edge, or the top edge at `placement="top-end"`. Under the default system and cupertino
  (fade-scale) that is opacity 0 and scale 0.96. Under m3-like and m3-expressive-like (unfold) it unfolds from that
  edge at its full width, scaled from 0 along its height. Where an appearance gives a distance (fade-slide, blur-slide)
  it travels that far up into place at the bottom and down at the top end.
- The timing is the snackbar's own, as before: `comp.snackbar.motion.enter-duration` and `-easing` in,
  `comp.snackbar.motion.exit-duration` and `-easing` out (m3-like keeps its 250 / 150 ms and its accelerating exit).
- Closing takes the bar back the same way, and the next snackbar shows only once it has. Closed while it is still
  appearing, it turns round from where it is.
- Where motion is reduced it only fades in and out, over `sys.motion.role.reduced` (100 ms), with no scale, distance or
  blur. A snackbar shown before the document is first painted is there at once.
- Its layout is measured as laid out, not as drawn, so the action's own row (SNK-16), the expand button (SNK-23) and the
  expand motion (SNK-24) are the same while the bar appears as at rest.
- What moves is the bar (the `container` part), not the `<tanrei-snackbar>` element. The `entering` and `leaving` classes
  on the element and the `snackbar-in`, `snackbar-in-top`, `snackbar-out` and `snackbar-fade-in` keyframes are gone. A
  snackbar drawn in place (outside a host) is unchanged: it is at rest and takes no motion.
