---
'@tanrei/studio': minor
---

**Theme Studio: the Size row sets the minimum target, and shows the heights the density gives.**

- **Minimum target** is a control of its own in the Size row, a number and a slider over `sys.target.minimum`, a whole
  pixel from 24 (WCAG 2.5.8, the least the build holds) to 48. It is written as a dial is: the base's own value writes
  nothing, and a reason is asked once it is changed. A number past either end is brought within them, so the layer
  never holds a minimum the build refuses. On a system whose touch or pointer target is set apart from the minimum
  (m3-like and cupertino: 44), the control ends at that target, because the build refuses a minimum above either.
  The token editor that stood in a fold in its place is gone; Inspect still edits the token.
- **Density** shows the heights it gives, under its slider: the control ladder's small, medium and large, each read
  through the minimum target, as the token engine works them out, while the value is dragged too. A height the
  minimum holds up says so, with the ladder's own height: "small 36px (32px, raised to the minimum target)".
- **The size unit no longer takes the targets with it.** Its note says "control heights and icon sizes", and the
  row's help says that neither dial moves the minimum target. The rail's value of the row names the minimum
  (`density 1 · 4px · target 36px`), and the row's reset takes back all three values.
