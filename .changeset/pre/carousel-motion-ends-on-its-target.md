---
'@tanrei/web': patch
---

Carousel: a move by the keys, a dot, the previous and next controls, a settle or an advance now always ends on the
resting position itself. The last frame of the motion wrote the curve's value there, and WebKit can call a motion
finished while its progress is still a hair under 1 (0.9999999999999999). It also keeps whole scroll offsets, so the
row could come to rest a pixel short of its resting position (415 for 416) and stay there. It depended on the frame
times, so it showed now and then. The last frame now writes the resting position's offset.
