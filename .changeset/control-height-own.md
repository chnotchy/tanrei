---
'@tanrei/tokens-build': minor
---

**A pressable height that keeps a size of its own is marked so.** `"dev.tanrei.aligned": "own"` marks a pressable
height that is no control on a row and keeps its size at every control height, its spec saying why; the build holds
every other pressable height of the core to a step of the control height ladder, and a height marked as its own to one
held at the minimum target that reads no step. The first is a primary tab with its icon above its label
(`comp.tabs.container.height-with-icon`, TAB-63), which holds two lines. No token value changes.
