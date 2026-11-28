---
'@tanrei/web': patch
---

In Chrome and Edge, the marquee text's passes and the carousel's autoplay progress now always go on after a hold ends.
Two holds in a row could stop them for good. In the first, the motion starts or goes on and is held again in a later
task, before a frame is drawn. In the second, it is let go while a frame is drawn: the pointer leaving, which Chromium
sends then, or a product moving focus from a frame callback or a resize observer. Played with `play()` there, the
motion never got a start time from Chromium. The marquee's text stood still while its fade went on. The carousel's
current dot stopped filling where the clock had stopped and did not move again until the row moved on, if the clock
had counted no time between the start and the hold. Both are now played on from the frame being drawn, from where they
were held, which the shared `playFromThisFrame` does for every motion a component holds and plays on. Firefox and
Safari were not affected.
