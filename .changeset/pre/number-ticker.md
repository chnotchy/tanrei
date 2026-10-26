---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/docs': patch
---

Number ticker, a new component: a number that changes — a count, a price, a score, a dashboard's figure — shown by
moving each changed digit to its new value, so that a person sees that it changed, which way and roughly by how much,
while assistive technology is told only the value it settles on.

- Web: `<tanrei-number-ticker>` (`value`, `number-style`, `currency`, `unit`, `notation`, `fraction-digits`,
  `sign-display`, `locale`, `trend`, `animation`, `start-value`, `duration`, `live`, `label`; event `settle`); React:
  `NumberTicker` (`onSettle`). The number is written by `Intl.NumberFormat` in the locale (its digits, separators,
  symbols and short forms), in the text style of where it stands, in tabular figures. SwiftUI, Compose, Flutter and
  React Native are planned: their generated tokens carry `comp.number-ticker`, and no component yet.
- `trend`: `auto` by default — every changed digit moves the way the whole number moved, so 19 to 20 moves both digits
  up — or `digit`, `up`, `down`. `animation`: `slide` (the default system's), `blur`, `blur-slide`, `flip` or `none`;
  `auto` reads `comp.number-ticker.animation`.
- The width moves with the digits (the shared size transition); a change during another goes on from what is drawn;
  under reduced motion the new number is there at once. Not a live region by default; `live="polite"` tells the
  settled value once per change.
- Tokens: `comp.number-ticker` — `animation`, `motion.duration` (the large resize role), `motion.easing` (spatial),
  `motion.stagger`, `motion.reduced-duration` (the reduced role), `blur.radius`, `blur-slide.distance`. No new `sys`
  token.
- Glyph list: `flip` and `percent` join the names the components may draw, as values of the ticker's props.
- Baselines: new images for the ticker's 7 fixtures, and one per preset — new, not changed.
