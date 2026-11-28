---
'@tanrei/docs': patch
---

Documentation site: the Motion foundations page is rewritten, in all six languages, to say what the packages do today.

- Durations come by role (`tanrei.sys.motion.role.*`), with the four easing roles, how a layer or the motion dial
  re-times them, and how to use them in your own CSS. The earlier table of suggested durations, and the springs'
  "two kinds of movement", are gone from this page; the springs stay in the motion token reference.
- What the components do on their own: one appearance for every surface, a motion turned round going on from where it
  is, a box that changes size in its layout, motions that start at their first frame after a long task and resume
  from where they were held, a focus ring that is never animated, and the state layer as the default press feedback.
- Nothing moves as the page loads: a component's first frame is drawn at rest, and an overlay written open appears
  without its entrance.
- Reduced motion: the person's setting (`prefers-reduced-motion`) and the app's own (`data-tanrei-motion="reduce"` on
  `<html>`), with an example in HTML and in script, what changes under either, and how to follow both in your own CSS
  through `--tanrei-motion`.
