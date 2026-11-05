---
'@tanrei/web': patch
---

Navigation drawer: as a collapsible modal drawer closes, the focused destination's color moves with its width (NVD-35,
NVD-40). Focus left the panel before the change of form's motion was in force, so in Chromium the selected destination's
focused color went back over the state motion, ahead of the width (half its way while the width had gone a quarter of
its own); it now takes the change of form's duration and easing, in step with the width, in every engine.
