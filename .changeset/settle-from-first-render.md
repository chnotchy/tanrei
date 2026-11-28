---
'@tanrei/web': patch
---

Every element: one connected where the page draws nothing — inside a hidden container, a tab panel not shown, a
closed `<details>` or a closed dialog, menu or drawer, or hidden itself — now draws its first frame at rest when it is
first shown. Its first frames (MOT-3) are counted again from the first frame it is drawn in, not only from its first
update, which it had while hidden: from that frame until two frames after it, it starts no transition, so what it
measures as it is first shown arrives without a motion — a number input's floating label no longer narrows over the
steppers' length, and a selected segment's check no longer grows in. The first time a dialog, a menu or a modal
drawer opens, the element it focuses is drawn in its focused colors at once, as on a page that draws it at once;
later openings move them as before. An element mounted where it is drawn settles as before.
