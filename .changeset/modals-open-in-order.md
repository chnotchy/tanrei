---
'@tanrei/web': patch
---

Modal surfaces whose `open` is set in one task now stack in the order it was set, whatever their kinds: the one set
later is on top, takes focus, and gives focus back on closing to where the earlier one moves focus. This is how the
native `<dialog>` stacks with its `showModal()` calls. Before this, a bottom sheet, a side sheet, a modal date-time
picker, an image preview or a modal navigation drawer opened in its own update, while a dialog and a modal layer
opened later in the same task. So `dialog.open = true; sheet.open = true` put the dialog on top. Now every modal
surface opens at the same point of the task: the write that follows the reads every component makes together.
