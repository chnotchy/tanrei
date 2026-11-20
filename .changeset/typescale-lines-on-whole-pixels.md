---
'@tanrei/web': minor
'@tanrei/tokens-build': patch
'@tanrei/docs': patch
---

**Every line of a type role is a whole pixel, and one override moves it everywhere.** A role's line height is a ratio
of its size, written to four places (16 / 12 is 1.3333), and it was drawn bare: a 12 px label sat on a 15.9996 px line,
which Chromium lays out 15.984 px tall, so every box below such a line sat between pixels. On the text input's fixture
page the stacked empty field started at y 1568.92, and its 72 px stage was cropped as 73 px; 84 of the page's 87 stages
started on a fraction of a pixel. Now none do, and the stage starts at 1569.

- `<role>-line-height` stays the ratio, the one entry a product overrides, on the root or on one element. Whatever
  draws it rounds it where it is: the text's line is `round(nearest, var(<role>-line-height) * 1em, 1px)` — a 12 px
  label on a 16 px line, at 200 % text a 24 px one on a 32 px line, at 110 % a 13.25 px one on an 18 px line — and a box
  that holds the role's lines is `round(nearest, var(<role>-line-height) * var(<role>-font-size), 1px)`. Every
  component, every stylesheet of the package (`text.css`, `prose.css`, `base.css` and the others) and the cloak read it
  so, so one override of `-line-height` moves the text, the boxes computed from it (a field's rows, a step's marker)
  and the heights the cloak holds, together, in every engine.
- **Breaking:** a product that composes a role's `font` itself writes the rounded line:
  `font: <weight> <size>/round(nearest, var(<role>-line-height) * 1em, 1px) <family>`. The bare
  `/var(<role>-line-height)` still works and still draws between pixels.
- The native platforms' line heights, the Figma sync plan's `lineHeightPx` (which said 15.9996) and the invariant that
  a control's height holds its label take the same rounding: the size times the ratio, rounded to a whole pixel. The
  native outputs do not change: their two-decimal rounding already landed on whole pixels.
- Web baselines whose text sat between pixels move by up to a pixel: the intended result of this change, recorded
  again for it.
