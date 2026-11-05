---
'@tanrei/web': patch
---

Navigation drawer: a collapsible modal drawer is no longer modal from the moment it closes (NVD-22, NVD-40, MDL-5). It
narrowed back to its column while it was still a modal dialog, so the page behind stayed inert, held from scrolling and
from the pointer, and focus went back only when the column took the dialog's place at the end of the motion. It now
closes with `closeModal()`: focus goes back at once — to its menu button, slotted in the narrowing panel, or to whatever
had focus when it opened — the page takes focus, the pointer and the wheel again, and the panel narrows and its scrim
fades in the top layer as before, the column then drawn as its last frame was. Where motion is reduced it is its column
again at once. Opened again while it narrows, it turns back from where it is. `closeModal()` takes two new options for
such a surface: `interactive` (it takes focus and the pointer while it leaves; only its scrim takes none) and `moves`
(what its exit moves besides what an appearance moves, held as shown where it changes hands); `openModal()` takes
`moves` too. A leaving dialog's scrim no longer takes the pointer (`modalExitStyles()`).
