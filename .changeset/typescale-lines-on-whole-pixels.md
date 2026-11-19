---
'@tanrei/web': minor
'@tanrei/tokens-build': patch
'@tanrei/docs': patch
---

**Every line of a type role is a whole pixel.** A role's line height is a ratio of its size, written to four places
(16 / 12 is 1.3333), so `--tanrei-sys-typescale-label-small-line-height: 1.3333` drew a 12 px label on a 15.9996 px
line, which Chromium lays out 15.984 px tall: every box below such a line sat between pixels. On the text input's
fixture page the stacked empty field started at y 1568.92, and its 72 px stage was cropped as 73 px; 84 of the page's
87 stages started on a fraction of a pixel. Now none do, and the stage starts at 1569.

- **Breaking:** `<role>-line-height` (and every component token that aliases a role) is a length, no longer a number:
  `round(nearest, 1.3333em, 1px)`, the size times the ratio rounded to a whole pixel. It is taken in `em` where the
  text is drawn, so it still follows a size set on one element, the reader's text size and the type dial — a 12 px
  label is on a 16 px line, at 200 % text a 24 px one on a 32 px line, at 110 % a 13.25 px one on an 18 px line.
  `font: <weight> <size>/var(<role>-line-height) <family>` and `line-height: var(<role>-line-height)` work as before.
- New: `<role>-line-height-ratio`, the bare ratio, for arithmetic away from the text. A product that computed a line as
  `calc(var(<role>-line-height) * var(<role>-font-size))` — now a length times a length, which is invalid — writes
  `round(nearest, var(<role>-line-height-ratio) * var(<role>-font-size), 1px)`. Every box a component sizes from a
  role's line (a field's rows, the cloak's heights, a step's marker) does this, so it is the line the text draws.
- The native platforms' line heights, the Figma sync plan's `lineHeightPx` (which said 15.9996) and the invariant that
  a control's height holds its label all take the same rounding: the size times the ratio, rounded to a whole pixel.
  The native outputs do not change: their two-decimal rounding already landed on whole pixels.
- The docs site hands Starlight the ratios (`--sl-line-height`), which it multiplies by sizes of its own.
- Web baselines whose text sat between pixels move by up to a pixel: the intended result of this change, recorded
  again for it.
