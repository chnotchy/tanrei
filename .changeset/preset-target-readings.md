---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
---

The presets' target sizes now follow their originals. **cupertino** takes Apple's figures: `sys.target.touch` 44 (iOS's default control size, 44×44pt, was 48), `sys.target.pointer` 28 (macOS's, 28×28pt, was 44), and `sys.target.minimum` stays 28, iOS's least control size and the height of its small controls; its 34 and 44 controls are unchanged. **m3-like** keeps 48 / 44 / 32, now checked against Material 3: 48dp for touch, 44dp for a pointer (a mouse or stylus), and 32dp, its extra-small button and chips, as the least drawn height. `dial.density` stays 1 in both.

What breaks: under cupertino, what is taken from the touch or pointer target is smaller. Rows and items that are drawn as tall as the target are drawn at their own height under a fine pointer (radio buttons, radio groups and file items are shorter; app bar actions are 34 instead of 44), a floating toolbar's items move as far apart only as a 28 target needs, and the carousel's controls row is 44 instead of 48. The baselines under cupertino change for those fixtures; m3-like draws exactly as before.
