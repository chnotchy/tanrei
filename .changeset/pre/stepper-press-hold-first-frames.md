---
'@tanrei/web': patch
---

Stepper: a step pressed right after the stepper is drawn now shows its pressed state for the whole press-hold, as it
does at any other time. For the first two frames of a step, while its first condition is drawn without motion, a key
press or a tap ended the pressed state with the press itself, so it could not be seen; a quick keyboard user or an
automated test of the product could meet it on a page that had just shown the stepper. Nothing else about the step's
look or motion changes.
