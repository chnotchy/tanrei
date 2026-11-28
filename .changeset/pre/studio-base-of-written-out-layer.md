---
'@tanrei/studio': patch
---

**Theme Studio: the Base system panel shows the base of a layer with every value written out.** Such a layer extends
Tanrei's root layer, `core`, which is not offered as a base, so the panel showed no choice selected and no description.
The layer's own base is now always among the panel's choices, selected, with its description; the root is listed for
that layer only.
