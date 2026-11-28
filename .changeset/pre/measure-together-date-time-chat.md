---
'@tanrei/web': patch
---

Fewer forced style and layout passes when many chat composers, embedded text inputs or date and time pickers are built
at once. A multiline embedded text input measured the lines of its text in its own update — its line, its width, then
the height its text needs — and had the browser style and lay out the page three times for it, once per instance; the
chat composer then measured its line and its width the same way. Both now read after the renders of the task, together
with every other component's, and write after all of them: a text area's height is measured in two steps, every text
area of the task given no height at once while its box keeps the height it has, so nothing around it moves. A picker
decided its layout, its actions' row and the room they leave in a chain of reads and writes in its own update, and did
it again in the update that lets its dial handle move with motion a frame after it opened; it now takes each step with
every other picker's, and that update arranges nothing. One resize observer watches every instance of each of the
three, so a window resized under a hundred of them is read in one pass too. A hundred chat composers now cost the
passes ten do; a hundred pickers opened at once still pay, each, for being shown modally and for starting their
entrance. Nothing drawn changes.
