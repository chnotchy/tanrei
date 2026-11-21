---
'@tanrei/web': patch
---

Dialog: where motion is reduced, a dialog centred in the window fades its scrim in and out with its container, over
`sys.motion.role.reduced` (DLG-13, MDL-7, MOT-6). The scrim kept the dialog's own enter and exit durations there, so it
went on fading for a while after the container had appeared or gone. The dialog's scrim is now drawn by the same rules
as the sheets' scrims. Nothing changes where motion is not reduced, or for a dialog shown as a sheet in a compact
window.
