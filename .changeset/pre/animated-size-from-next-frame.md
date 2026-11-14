---
'@tanrei/web': patch
---

A box whose size follows its content (the chat composer's strip, Field, Callout, File upload, Number ticker, Resizable
frame, Split view) starts its motion in the first frame drawn after the change, in every engine. WebKit dated it from
the frame drawn before the task that changed the content, so where that task took longer than the motion (a chat
composer adding a file on a loaded machine) the box jumped to its new size with no frame of the motion.
