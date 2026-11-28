---
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
'@tanrei/studio': patch
'@tanrei/mcp': patch
---

**The rule language can write a step a number of units from another value: `add`.**

- `{ "fn": "add", "of": "{height}", "by": "{unit}", "times": -2, "min"?: "{floor}" }` is `max(min, of + by × times)`
  on the 0.25px grid (1ms for a duration). `times` is a plain number, 1 when absent and below zero for a step down;
  `min` is a floor, left out where a `pad` measures the height it gave up. A ladder written with it from one height
  keeps its distances whatever that height is: −2, 0 and +4 units from 40 are 32, 40 and 56, and from 32 they are 24,
  32 and 48.
- The web receives it as the same arithmetic in CSS (`max(min, calc(of + by * times))`), so a height set on `:root` at
  runtime moves every step written from it; JSON, Swift, Kotlin, Dart and React Native receive the values. Theme
  Studio follows it live while a dial is dragged and shows it in a token's detail.
- The layer schema accepts it under `derive`.

No token uses it yet: no value, no generated file and no picture changes.
