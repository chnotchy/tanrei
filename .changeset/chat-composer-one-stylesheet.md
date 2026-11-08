---
'@tanrei/web': patch
---

Chat composer: composers share their stylesheets. Each composer used to adopt a stylesheet of its own to draw the
capsule's corners and the groups' least height from the line height it measures, so a page with 100 composers held
99 more sheets than a page with one. The rules for a measured line are now one stylesheet per line height, shared by
every composer that measured it; the composer still writes no custom property. Nothing drawn changes.
