---
'@tanrei/web': patch
---

Snackbar: a notice raised while a modal surface is open can now be seen, pressed and heard. A modal `<dialog>` makes
everything outside it inert, so a snackbar shown from the host behind a dialog could not be reached until the dialog
closed — an Undo was out of reach when it mattered, and the message was not announced. Now, while a Tanrei modal surface
is open (a dialog, a modal layer, a modal side or bottom sheet, a modal navigation drawer, an image preview, a popover's
sheet, a search's dialog or full-screen view, a modal date-time picker), `<tanrei-snackbar-host>` shows its snackbar
inside the topmost one: drawn above the surface and its scrim at the same place, pressable, announced from live regions
inside the surface, and reached by Tab after the surface's own controls within its focus trap. A snackbar asked for
while a surface is open shows at once instead of waiting for it to close; one already showing moves inside the surface
as it opens and back as it closes, still open, not announced again, its timeout started again from its whole length.
Escape in the snackbar closes the snackbar and leaves the surface open, and a press on the snackbar is never a press on
the surface's scrim. What broke: a snackbar no longer waits for a modal dialog to close, nor pauses under one. While it
is shown inside a surface it is in that surface's shadow tree, so a page's own CSS rules for `tanrei-snackbar` (and its
parts) do not reach it there, and its `action`, `dismiss` and `expandedchange` events do not bubble out to the document:
style it through its tokens, and use what `show()` resolves with or listen on the snackbar itself.
