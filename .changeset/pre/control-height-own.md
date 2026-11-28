---
'@tanrei/tokens-build': minor
---

**A pressable height that keeps a size of its own is marked so.** `"dev.tanrei.aligned": "own"` marks a pressable
height that is no control on a row and keeps its size at every control height, its spec saying why; the build holds
every other pressable height of the core to a step of the control height ladder, and a height marked as its own to one
held at the minimum target that reads no step. They are a primary tab with its icon above its label
(`comp.tabs.container.height-with-icon`, TAB-63), which holds two lines, the calendar's cell
(`comp.calendar.cell.size`, CAL-37) and a wheel's row (`comp.date-time-picker.wheel.row.height`, DTM-53), the pitch of
a grid and of a drum that hold a touch target for each of their days or values. With them every pressable height of the
core is on the ladder or marked: the build's list of heights not yet on it is gone. No token value changes.
