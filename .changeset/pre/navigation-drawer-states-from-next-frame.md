---
'@tanrei/web': patch
---

In Safari, the navigation drawer's motions now play however long the task that opens or closes it takes. WebKit dated
a motion begun in a task from the frame drawn before that task, and where the task took longer than the motion lasts it
was drawn over at once, with no frame of it. Each of these now starts in the first frame drawn after the task
(`statesFromNextFrame`, `startFromNextFrame`), as the modal drawer's slide and the colors inside it already did:

- the colors of the element focus goes back to when a modal drawer closes, where that element is outside the drawer
  (a menu button in the page);
- a standard drawer's slide as it opens or closes, and the colors of what focus leaves and goes to as it does;
- a drawer held below an app shell's header, opened over the content or closed: its slide, its scrim's fade, and the
  colors of the app shell's menu button that focus leaves and goes back to.

Nothing changes in Chromium and Firefox.
