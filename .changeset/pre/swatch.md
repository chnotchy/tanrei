---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Swatch: a new component that shows a color as a sample with its name beside it (`specs/swatch.spec.json`,
`<tanrei-swatch>` on the web, `Swatch` in React). The sample is exactly the color it is given — the hexadecimal
notation every platform reads (`#0f766e`, `#0f766e80` with an alpha), and on the web any CSS color, a role's custom
property included — over a checkerboard that a translucent color lets through, edged by the divider's hairline so that
a color close to the surface still shows where it ends. Three sizes (16, 24, 32), a square or a circle. Because a color
is never told by its sample alone, the name is drawn beside the sample by default, with an optional supporting line
for the value; `labelHidden` draws the sample alone and makes the name its accessible name, and `decorative` hides a
swatch that stands beside the same name in text. It is not a control and not a picker. New component tokens:
`comp.swatch.*` (container size and shape, checkerboard, outline, gap, label and supporting text). Implemented on the
web; the native platforms are planned. New web baselines are recorded for every swatch fixture and for the translucent
fixture under each shipped preset.
