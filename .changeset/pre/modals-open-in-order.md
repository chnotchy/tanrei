---
'@tanrei/web': patch
---

Modal surfaces whose `open` is set in one task now stack in the order it was set, whatever their kinds: the one set
later is on top, takes focus, and gives focus back on closing to where the earlier one moves focus. This is how the
native `<dialog>` stacks with its `showModal()` calls. Before this, a bottom sheet, a side sheet, a modal date-time
picker, an image preview or a modal navigation drawer opened in its own update, while a dialog and a modal layer
opened later in the same task. So `dialog.open = true; sheet.open = true` put the dialog on top. Now every modal
surface opens at the same point of the task: the write that follows the reads every component makes together.

A standard navigation drawer, bottom sheet or side sheet opened under a modal surface it is not inside, in the same
task or later, now gives focus back on closing to the element that had focus before that surface opened. Before this,
it gave focus back to an element inside the modal surface, which had closed by then, so focus was lost. NVD-28, BSH-3
and SSH-3 now say so.

The byte budget of `@tanrei/web/all` goes from 667400 to 668000 bytes gzip. It measures 667990, 639 more than before
this change. The five surfaces that now open in the write each wait for it, a collapsible modal navigation drawer makes
its whole opening update there, and the modal layer keeps where each surface returns focus. The function that answers
for the standard regions stands apart from the modal layer, so the dialog and the modal layer carry only the record of
openers: 26 and 18 bytes more. No component's own bundle goes over its budget. The image preview's budget of forced
passes goes down from 1132 to 661. It measures 630 now, against 720 before this change: a hundred previews that open
in one task now open in one write.
