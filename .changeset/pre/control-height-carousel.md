---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
---

**The carousel's playback control is drawn at the control height.** `comp.carousel.controls.button-size`, the playback
control's square and the height of the dots' container, now reads `sys.control.height.medium` held at
`sys.target.minimum` and is marked `"dev.tanrei.aligned": "control"`, where it was ten size units: the controls row
stands as tall as an icon-only Button of the default size whatever the control height. At the control height of 40 it
is 40, as it was, and no token value of any shipped system changes.

- New behaviour: CRL-44. `carousel.test.ts` draws the playback control and the dots' container at the control heights
  32, 36 and 40.
