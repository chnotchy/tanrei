---
'@tanrei/web': patch
'@tanrei/react': patch
---

**Hit areas stop at the middle of the gap in every row.** Where a control's target is larger than what it draws (a
layer or a preset whose `sys.target.touch` or `sys.target.pointer` is above its controls' size, as m3-like's 48 is over
its 32-high small Buttons, or a narrow icon-only Button in any system), its hit area reaches past its visible bounds —
and in a row it used to reach over its neighbour, so that a press on one control went to the next. A button group, a
split button, a toolbar and pagination already stopped it at the middle of the gap; now every component that lays
controls out side by side does, on both axes: a snackbar's action, expand and close buttons; a text input's, a select's
and a combobox's own buttons (clear, reveal, picker) and a control placed in a text input's icon slot, toward each other
and toward the text — so the picker button of a date and time field no longer takes a press on the AM/PM segment, and
a tree view's filter no longer loses presses on its text to the clear button; a number input's steppers, a search's
clear button and a color input's picker toward the input; the calendar's previous and next buttons; an image
preview's controls; the actions of a dialog, a side sheet and a popover, in a row and stacked; a chat composer's
Buttons, along its line and between the line and the row beneath; a figure's actions. A Button reads the cap of
whatever lays it out, and a button group or a split button standing in such a row stops its outer ends there too.
Nothing moves in the default system for controls drawn at least as large as its 36 px target.

The bundle budgets of `dialog` (32,500 → 32,600 bytes gzip), `file-upload` (107,400 → 107,500) and `all` (669,200 →
669,900) are raised for these rules: the three stood within 70 bytes of their budgets before this change, and the caps
add about 700 bytes gzip across every component that lays out a row (Button itself is smaller than before).
