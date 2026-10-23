---
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
'@tanrei/mcp': patch
---

**The rule language can write a height that follows a density, on a grid, never below a floor, and the padding of
its box.**

- `mul` takes three optional terms, each a token: `times` (a number token the product is multiplied by, such as a
  density), `round` (a step: the result is rounded to its nearest multiple, ties upward, as CSS `round(nearest, …)`
  rounds) and `min` (a floor applied after rounding, so a floor off the grid gives exactly the floor):
  `max(min, round(of × by^exp × times, round))`. A rule without them gives what it gave before.
- `pad`, `{ "fn": "pad", "of": "{padding}", "height": "{height}" }`, is the block padding of a box whose height moves:
  `max(0, of + (height − height₁) / 2)` on the 0.25px grid, where height₁ is the height as its rules give it with every
  `times` read as 1 and no `min`. It gives up half of what the box lost and takes half of what it gained, so the box
  stays two paddings and one line: a 32 box with 6 above and below its 20 line, held at a floor of 36, gets 8.
- The web receives both as the same arithmetic in CSS (`max()`, `round()`, with height₁ written out through the
  height's aliases), so a density, a floor or a size unit set on `:root` at runtime moves a height and its padding
  together; JSON, Swift, Kotlin, Dart and React Native receive the values. The engine exports `roundToStep` and
  `unscaledLookup`, and `evaluateNumeric` reads height₁ from `ctx.unscaled`.

No token uses the new forms yet: no value, no generated file and no picture changes.
