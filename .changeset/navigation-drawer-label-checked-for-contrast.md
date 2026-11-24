---
'@tanrei/web': patch
---

**`<tanrei-navigation-drawer>`: a destination's label and supporting text are checked for contrast.** The item container
lies behind them with a negative z-index, and axe's `color-contrast` rule takes a positioned box — whatever its z-index —
for one above text that is not positioned: every label was left incomplete ("overlapped by another element"). The text
is now positioned too, still above the container; nothing a drawer draws changes.
