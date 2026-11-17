---
'@tanrei/web': patch
---

Date-time picker: where motion is reduced, a modal picker fades its scrim in and out with its container, over
`sys.motion.role.reduced` (DTM-35, MDL-7, MOT-6). The scrim kept the modal open and close motions there, so it went on
fading for a while after the container had appeared or gone. The modal picker's scrim is now drawn by the same rules as
the sheets' scrims. Nothing changes where motion is not reduced, or for a docked picker.
