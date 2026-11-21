---
'@tanrei/web': patch
---

Tree view: a change of the layout direction around a shown tree is drawn at once. An open parent's start chevron,
mirrored in right-to-left, takes the other quarter turn there, and it turned half a turn over the disclosure's motion
when a `dir` above the tree changed, pointing up on its way. The element now hears a `dir` changed in the roots it is
in and draws the open chevrons' new turn without motion, before the frame that shows the new direction; a closed
chevron and every colour are drawn as before. The table's watch of the same attribute is now the shared
`DirAttributeWatch` primitive, with no change to what it does.
