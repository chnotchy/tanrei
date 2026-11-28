---
'@tanrei/web': patch
---

**`<tanrei-date-time-picker>`: the value on a wheel's middle row is checked for contrast.** The wheel's control — the
input that takes typed digits — lies over the middle row, and axe's `color-contrast` rule left the value there incomplete
("overlapped by another element"). The rows are now drawn above the control, which draws no fill and shows only typed
digits while the middle row hides, and let a press through to what lies under them, as before. Nothing a wheel draws or
answers changes.
