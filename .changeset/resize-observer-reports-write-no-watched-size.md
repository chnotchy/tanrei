---
'@tanrei/web': patch
---

A snackbar, a chat composer, a popover and an embedded text input no longer have the browser report "ResizeObserver
loop completed with undelivered notifications" when their width changes in a box whose size does not change (and a
chat composer no longer does when it is first drawn too narrow for its inline layout). Each laid itself out inside its
own resize observer's callback, and the boxes it changed had already been reported in that frame:

- After a change of its width, a snackbar places its action (beside the text or on its own row) and draws or takes
  away its expand Button in the next frame's read phase: for one frame it still stands as before. A snackbar a host
  shows is now measured when it is shown, so the first frame of its entrance is already arranged.
- After a change of its width, a chat composer decides whether its capsule is stacked in the next frame's read phase:
  for one frame it keeps the layout it had. Its first frame is still drawn in its layout.
- After a change of its width, a popover places its actions (a row or a column) and its dividers in the next frame's
  read phase: for one frame they stay as they were.
- After a change of its width or of its text size, an embedded text input fits its height in the next frame's read
  phase: for one frame it keeps the lines of the width before. In a chat composer whose layout changes with that
  width, its height follows a frame after the layout.

What each of them draws when its own content changes (text, actions, `expanded`, the value) is unchanged, and drawn in
the frame of the change.
