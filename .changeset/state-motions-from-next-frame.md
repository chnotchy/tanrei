---
'@tanrei/web': patch
---

In Safari, what opening or closing a surface changes inside it now moves over its motion however long that task takes.
WebKit dates a transition or an animation begun in a task from the frame drawn before that task, so where the task took
longer than the motion lasts, the end state was drawn at once with no frame of it. The changes now start in the first
frame drawn after the task. Each one was seen dropped in WebKit when the opening task was held past its motions:

- the menu: the first item's focused colors, as the menu opens and as a submenu opened by a key opens;
- the navigation drawer: the selected destination's focused colors as a modal drawer opens, and a collapsible drawer's
  rows widening from its column and narrowing back to it;
- the dialog, the side sheet, the bottom sheet and the modal layer: the focused colors of the element marked for
  initial focus;
- the image preview: its controls' states as it opens;
- the date-time picker: a docked picker's entrance and its exit, which were drawn whole or gone at once.

The FAB menu's toggle turn and its first item's colors use the same shared rule (`statesFromNextFrame`) as these. Nothing
changes where opening is quick, or in Chromium and Firefox, which already start these motions in the next frame.
