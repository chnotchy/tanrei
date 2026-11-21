---
'@tanrei/tokens-build': minor
'@tanrei/cli': minor
---

**New contrast check — Chip.** The build holds an input chip's remove glyph at 3:1 against its round container as it
is drawn (WCAG 1.4.11): the round container of the state over the chip's own container at rest, over every surface role
where that container is clear (the outlined chip), in both looks — the `remove.*` parts and the `destructive-remove.*`
parts, whose glyph takes the error color while it is hovered, focused or pressed — at rest, hovered, focused and pressed,
in every scheme. No pair of color roles held it before: the round container is a state layer over the chip.

The default system passes in every scheme (its lowest is the destructive glyph's 3.98:1, light, outlined, over
`surface-container-highest`, focused and pressed). A product layer that re-points the chip's remove colors, the error
role or a surface now gets a warning where the glyph falls under 3:1. The `cupertino` preset's outlined chip measures
2.77:1 (light) and 2.92:1 (dark) hovered, focused and pressed, listed in its `a11y-report.json` as measurements that do
not apply to an imitation preset. Each report's `componentPairs` grows by 16 per scheme.
