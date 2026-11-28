---
'@tanrei/web': patch
---

Where the system's focus style is `glow`, the keyboard focus of a side sheet's or a bottom sheet's content that scrolls,
and of a dialog's scrolling part, is now drawn as the glow in a browser without style container queries too. The three
draw it from `data-focus-style` there, and now write it when focus arrives, as every other control does; before, they
showed the ring where the system asked for the halo.
