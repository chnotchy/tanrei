---
'@tanrei/web': patch
---

Avatar: a group drawn by `avatar.css` before its element is defined no longer jumps when the script runs on a page
with a reset such as `* { margin: 0; padding: 0 }` (Tailwind's preflight and most resets). The stylesheet overlapped
the members with a padding on the group and a negative margin on each member, inside the components' layer, and an
unlayered reset beats every layered rule: the members stood side by side, and the row shrank by the overlaps once
the element was defined. The stylesheet now lays the row out with grid tracks, as the element does, so each member
stands where the element draws it, in both directions and at every size, with or without a reset. A page without a
reset is drawn as before.
