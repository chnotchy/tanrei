---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Tag group — a member that is added or removed fades, and a reordered member keeps its focus.** The members that
change place still move there in one motion, on `tanrei.comp.tag-group.motion.move-duration` (the role
`sys.motion.role.selection.travel`) and `move-easing` (`sys.motion.easing.spatial`), along a line and onto another line.
Now a member the product adds fades in at its place over the same motion, and one it removes fades out where it was
drawn while the others make room; a change that comes mid-fade goes on from the opacity drawn. An element given anew in
place of a removed one that shows the same (same kind of member, same label) moves as that member, without a fade. A
member moved to another place in the order is named in TGR-10: it travels there, and on the web it now keeps focus in
Chromium too, which fires `focusout` while it removes the focused element. What the group exposes still changes at once.
Where motion is reduced the members are placed at once and the fades stay; the first frames, an empty group's first
member and its last one still come and go at once. Before, TGR-10 had an added member appear and a removed one leave at
once. Resting pictures are unchanged: no baseline was re-recorded.

**Breaking:** on the web, while a member fades out, the group puts the product's own element back where it stood, as
its child, for the length of the fade — `inert`, `aria-hidden="true"` and `data-leaving`, absolutely placed — then
removes it and gives back the `inert` and `aria-hidden` it had. A script that reads the group's children in that time
sees it: select `:not([data-leaving])`. A test that counted the group's children in the frame after a member was
removed now reads one more: filter, or wait for the motion to end.
