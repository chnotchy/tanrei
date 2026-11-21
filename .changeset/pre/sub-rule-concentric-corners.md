---
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
'@tanrei/mcp': patch
---

**The rule language has `sub`: a corner inside another.** `{ "fn": "sub", "of": "{outer}", "by": "{inset}" }` gives
max(0, of − by) in the unit of `of` — the radius of a corner that stands inside another at an inset, so that the two
curves keep one distance. A layer may write it on any dimension; an inset wider than the corner gives a square corner,
never a negative one. The web receives it as `max(0px, calc(var(<outer>) - var(<inset>)))`, so it follows an outer
corner or an inset a product sets at runtime; the native platforms receive the value.

`pnpm validate` holds an inner corner annotated `$extensions["dev.tanrei.concentric"]` (`{ "outer": "{id}", "inset":
"{id}" }`) to that rule in the default system. Nothing is annotated yet: no value and no picture changes.
