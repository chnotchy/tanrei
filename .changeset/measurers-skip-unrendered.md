---
'@tanrei/web': patch
---

Components that measure themselves now keep what they measured while they are hidden (the element or an ancestor
`display: none`: a closed tab, a hidden panel, a view not shown), so they are drawn correctly from the first frame
after they are shown again. A shown component pays nothing for this: whether it is hidden is told by what it
measures anyway (a box it reads, or the size its observer reports), and only a box that measures as nothing is asked
whether it is laid out. Hidden, every box reads as nothing, and these components took that as a real size:

- App bar: it took the hidden row as one with no room and no actions. It hid its actions, and when shown again it
  kept them hidden, because a hidden action measures as nothing too. A centred title's balance and a large bar's
  collapse were also worked out from nothing.
- Number input and number field: the steppers measured as nothing, so a floating label moved its end over a
  transition once the field was shown again.
- Select, combobox, color input, number input and text input: a floating label that wraps lost the room for its lines
  while hidden, and was drawn on one line in the frame it was shown again in. A text input also let go of the room
  for a slotted element wider than an icon, so its label and text moved back beside it once shown.
- Segmented button: the check of a selected segment was taken away while hidden, and grew back in once shown.
- Breadcrumbs: the width the trail needs was let go, so the trail was drawn at 300 px (an SVG's default width) in
  the frame it was shown in.
- Description list: a list stacked because of its width was drawn in two columns in the frame it was shown in.
- Navigation drawer: rows pinned with `sticky-parents` were unpinned while hidden, and drawn in the list for a frame
  once shown.
- Tree view: a change to the tree made while its scrolling box was hidden unpinned the rows pinned with
  `sticky-parents`, and nothing pinned them again once shown until the box was scrolled.
