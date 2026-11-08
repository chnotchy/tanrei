---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**File upload — a row that is added or removed arrives and leaves in one motion, and a change of status moves a row's
height.** The rows are the items of the file upload's List, and now arrive and leave as the List's items do, whether or
not `reorderable` is set: in a column a row that is added opens its height from nothing while it fades in, and a row
that is removed fades out where it was drawn while it closes, on the List's resize motion
(`comp.list.motion.resize-duration`, the role `sys.motion.role.resize.large`; `resize-easing`, `sys.motion.easing.spatial`)
and its state motion for the fade. The rows below and what stands under the file upload follow at every frame, and the
room of `comp.file-upload.list.gap` above the list opens with the first row and closes with the last. In a strip of
tiles a tile fades in or out at its place, the tiles whose place changes move there, and the strip's height moves where
a line is added or taken away. When a row's status changes and that changes its height (an error text that appears, a
bar that goes), the height moves on the same resize motion, anchored at the row's top. What is exposed changes at once:
the list's count and positions, the form's value, the announcement and focus (FUP-30). Reduced motion and the first
frames still draw every change at once. Before, FUP-29 drew a row that was added, removed or changed at once. Resting
pictures are unchanged: no baseline was re-recorded.

**Breaking:** on the web, while `rows="given"`, a row the product takes away is drawn leaving from the product's own
`<tanrei-file-item>`: the file upload puts it back where it stood, as its child, for the length of the motion — `inert`,
`aria-hidden="true"` and `data-leaving` — then removes it and gives back what it had. A script that reads the file
upload's children in that time sees it: select `tanrei-file-item:not([data-leaving])`. A test that read a row's place or
height in the frame after a row was added or removed now reads it mid-motion: wait for the motion to end. The List gains
an internal channel (not a prop) that lets a component that arranges its own items in it show their arrivals and leaves
while it is not reorderable; a List the product writes is unchanged but for one fix: an item's arrival and leave, in a
reorderable List too, begin in the first frame drawn after the change. WebKit dated them from the frame before it, so a
change that took longer to render than the motion lasts drew the items whole at once.
