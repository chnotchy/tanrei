---
'@tanrei/web': patch
---

The dialog, the modal layer, the bottom and side sheets, the date and time picker and the Button with menu do less
work per instance when many are built at once.

- **Shared motion work.** The hold that starts a motion from the next frame (`statesFromNextFrame`, a surface's
  entrance, a modal dialog's opening) lists its motions with every other host's reads of the turn, still in the task,
  and the frame that plays them on runs every request of that frame in one callback, all reads before any write.
- **Group items.** One resize watch serves every Button in a group, so the Button with menu forces no more style or
  layout passes at 100 than at 10 (was 180 more).
- **Dialog.** It reads its choices, the window and the keyboard with every other dialog's reads of the turn, opens in
  the write that follows, and lays out in steps that each read with the others. One resize watch serves every dialog.
  A closed dialog is not laid out; it is laid out as it opens. Its actions are given the dialog's variant in the same
  turn as they connect, before any frame. Building 100 open dialogs forces 450 more passes than 10 (was 2520); what
  is left is `showModal()`'s own work. Building 100 closed ones reads the layout or style 90 more times (was 1080).
- **Side sheet.** The same steps and one resize watch; a closed sheet is given its variants and is not measured.
  100 sheets force no more passes than 10 (was 270 more); 100 closed ones read 270 more times (was 1530).
- **Modal layer, bottom sheet, date and time picker.** The keyboard's cover, the heights and the actions' variant are
  read with every other host's reads of the turn. Each forces 270 more passes at 100 than at 10 (was 720, 900 and
  630): what is left is `showModal()`'s own work.

Focus still goes in as each surface opens, after it is placed; of several modal surfaces opened in the same task, the
topmost takes it. Nothing drawn, exposed or announced changes. The forced-pass budgets of the dialog, the modal layer,
the bottom sheet and the date and time picker are lowered to the new counts; the side sheet's and the Button with
menu's are removed. The read budgets of the closed dialog and side sheet are lowered.

Reading together is a module of its own (`read-together`), apart from the frame's read phase, so that what only reads
together does not bring the phase's resize observer into its bundle. The byte budgets of two bundles are raised to
what they measure now: the dialog's (31800 to 32400 bytes gzip; 32310 measured), for the steps its layout and its
opening are now made in, and the toolbar's (70000 to 70300; 70268 measured), which carries the motions' shared hold
and frame through its menu.
