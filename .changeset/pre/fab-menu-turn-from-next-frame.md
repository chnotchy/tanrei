---
'@tanrei/web': patch
---

The FAB menu's toggle now turns, and its first item takes its focused colors, over their motions in Safari however long
opening the menu takes. WebKit dates a transition begun in a task from the frame drawn before that task, so where opening
took longer than those motions last (the default system in right-to-left took about 200 ms on a four-CPU Linux machine,
against a state motion of 250 ms) the toggle was drawn turned and the first item focused at once, with no frame of
either. The motions the open and the closed state begin now start in the first frame drawn after that task, as the
items' own appearance already did. Nothing changes where opening is quick, or in Chromium and Firefox.
