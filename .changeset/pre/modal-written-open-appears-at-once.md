---
'@tanrei/web': patch
---

Image preview, modal layer and dialog: written open in the page's markup, a modal surface appears at once, with no
motion, as its spec and the motion principles say (MOT-4, IMP-33). The image preview's container, with the controls
and the caption in it, faded in over the enter motion all the same, and so did the modal layer's container and scrim
and the dialog's scrim: everything in the image preview and the layer was drawn translucent for the first third of a
second, its text and icons below their contrast. `openModal()` now draws the dialog and its scrim open at once before
the document's first paint (or when asked with `{ instant: true }`); a surface opened after that plays its entrance as
before.
