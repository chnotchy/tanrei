---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking — the input boxes take the size their container sets.** A text input, a number input, a color input, a
select and a combobox that set no `size` of their own are now drawn at the size of the nearest container that sets one —
a toolbar's `size` today — and at `medium` where none does, as a Button is. In `<tanrei-toolbar size="small">` a select,
a number input and a text input stand 36 high under the default system, as tall as the toolbar's small Buttons, where
they stayed at medium before. A box's own `size`, `medium` included, still wins. The number input's steppers and the
text and color inputs' picker button follow the size the box draws, and so do the options of a select's and a
combobox's list: a select that takes a small toolbar's size opens small rows. A slider in a toolbar still takes nothing: its size
is the weight of its track.

What changed on the elements:

- `size` is no longer written on a box that does not set it: an element without the attribute stays without it, and
  reading `size` there still gives `medium`. A style or a test that matched `tanrei-select[size='medium']` on a box
  that sets no size no longer matches.
- The React wrappers no longer write `size="medium"` by default (that would have made it the box's own).
- The Text field, Number field, Color field, Select field, Combobox field and Chip field declare `size` as their box
  does: unset, it is not written and reads `medium`, and the box inside them is given none and takes its container's
  size the same way; set, `medium` included, it is written and is the box's own.
- `TanreiTextInputSize`, `TanreiNumberInputSize`, `TanreiColorInputSize` and `TanreiComboboxSize` now include `small`,
  which their specs have always listed and their styles have always drawn.
