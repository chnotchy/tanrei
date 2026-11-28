---
'@tanrei/web': patch
---

**The cloak holds fields, groups and more before they are defined.** `@tanrei/web/cloak.css` now holds every element
whose height its tokens give, not only the controls with a container height of their own. A composed field (text,
number, color, select, combobox, chip, slider and one-time code field) and the Field around a product's control are
held at their control's box between the rows the field draws: the label's line and gap above it where the label is drawn
over a stacked control, and the supporting text's gap and line below it where there is a help, an error text or a
count. A field group, a checkbox group and a radio group are held as a column of their controls under the label and
description rows and above the error text, with a checkbox group's select-all checkbox first. A list row is held by its
number of lines; a stepper by its steps, horizontal, vertical or compact; a snackbar in place by its message and title;
a swatch by its sample and its text; an embedded text input at its line; a chat composer laid out inline; a carousel by
its row and its controls row; a toolbar along a line; vertical tabs by their tabs; a progress indicator and a meter by
their bar or ring; and a scroll area and a split view are laid out as the boxes the page sizes. A filled text input whose
label floats is no longer held at the height of a floating label while its label is hidden. A text is held at one line:
a label, a help or an error text that wraps moves what is below it by the lines it adds.
