---
'@tanrei/web': patch
---

Tooltip, menu (and its submenus), FAB menu, slider value indicator, search docked view and docked date and time
picker: each frame's check of what the placement depends on now runs in the frame's read phase, after the frame's
own style and layout, as the popover's already does. Before, it ran in a frame callback, before the frame had styled
the page. In the frames after one of them opened, and in every frame while it followed a scroll, the browser styled
the whole page once more for each check; now it does not. Where something changed, the surface is still placed
again before that frame is painted.
