---
'@tanrei/web': patch
---

A surface closed at the end of a long task now plays its exit, and its scrim's fade, from the first frame drawn after
that task, in every engine. WebKit dated an exit begun in a task from the frame drawn before it, so where closing took
longer than the exit the surface and its scrim were gone in the first frame after it, without a frame of their motion.
`closeModal()` holds the dialog's exit and its `::backdrop` transitions at their start and plays them from the next
frame, as `openModal()` does for the entrance; `AppearController.exit()` does the same for the surface it moves. This
covers the dialog (centred and as a sheet), the modal layer, the modal side and bottom sheets, the image preview, the
popover's sheet, the modal date-time picker, and every other surface that `AppearController` moves (a popover, a
select's or a combobox's list, a tooltip).
