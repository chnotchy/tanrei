---
'@tanrei/web': patch
---

A modal surface no longer gives focus to its first control for a moment as it opens. Before this, `showModal()` gave
focus to the first control inside the dialog, and the component then moved it where it belongs: to the element marked
`autofocus`, the dialog itself, or the search's input. That control held focus for no frame, but it still started a
200 ms transition of its focused colors. The affected controls were the close button of a modal side sheet or bottom
sheet, the back button of a search's full-screen and dialog views (in every engine), and the first action of a dialog
or of a popover shown as a sheet (in Chromium). Now, while `showModal()` runs, everything inside the dialog is inert.
So focus goes to the dialog itself in one move, and from there to where the surface sends it. The opening shows only
the surface's own motion. Where focus ends, and whether it draws its focus indicator after a key or a pointer opened
the surface, are unchanged.

The byte budget of `@tanrei/web/all` goes from 668100 to 668200 bytes gzip: it measures 668108, 43 more than before.
The dialog's goes from 32400 to 32500: it measures 32434. Both grew by the few lines that make the dialog's content
inert around `showModal()`. Every modal surface shares those lines, and a shorter form measured larger.
