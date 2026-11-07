---
'@tanrei/web': patch
---

Chat composer: every instance shares one stylesheet. Each composer used to adopt a stylesheet of its own to draw the
capsule's corners and the groups' least height from the line height it measures, so a page with 100 composers held
99 more sheets than a page with one. The measured line is now written on the capsule as a private custom property
that the shared stylesheet reads. Nothing drawn changes.
