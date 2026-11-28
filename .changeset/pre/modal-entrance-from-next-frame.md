---
'@tanrei/web': patch
---

A modal surface opened at the end of a long task now plays its entrance and its scrim's fade from the first frame drawn
after that task, in every engine. WebKit dated both from the frame drawn before the task, so where opening took longer
than the entrance (a modal date-time picker rendering its calendar on a busy machine) the scrim — and the modal layer's,
the side and bottom sheets' and the image preview's own fade or slide — was drawn whole at once. `openModal()` holds the
dialog's entrance and its `::backdrop` transitions at their start and plays them from the next frame, as
`AppearController` already did for an appearance; this covers the dialog, the modal layer, the modal side and bottom
sheets, the image preview, the popover's sheet and the modal date-time picker.
