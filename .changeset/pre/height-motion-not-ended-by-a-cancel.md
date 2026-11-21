---
'@tanrei/web': patch
---

Text field (multi-line, auto-resized), embedded text input and chat composer: a letter typed while the height still
moves after a line break no longer cuts the motion off. Until now the height jumped to its end in one frame whenever a
change arrived during the motion — which, at a normal typing speed, is almost every line break followed by a letter.
The change replaced the running motion with one from the height then shown, as it should, but the replaced motion's
cancellation is reported a frame later, and that report was taken for the end of the new motion. A report of a motion
that was replaced now ends nothing; the height goes on along its curve to the end height. Nothing else changes: no
baseline moves.
