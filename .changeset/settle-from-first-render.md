---
'@tanrei/web': patch
---

Every element: one connected where the page draws nothing — inside a hidden container, a tab panel not shown, a
closed `<details>` or a closed dialog, menu or drawer, or hidden itself — now draws its first frame at rest when it is
first shown. Its first frames (MOT-3) are counted again from the first frame it is drawn in, not only from its first
update, which it had while hidden: from that frame until two frames after it, it starts no transition, so what it
measures as it is first shown arrives without a motion — a number input's floating label no longer narrows over the
steppers' length, and a selected segment's check no longer grows in. What the showing itself began moves on: the first
time a dialog, a menu, a menubar's menu, an image preview or a modal drawer opens, the element it focuses moves to its
focused colors, and its controls to their states, as on every later opening (MBR-49). An element mounted where it is
drawn settles as before.
